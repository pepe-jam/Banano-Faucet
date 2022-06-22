const express = require('express');
const axios = require('axios');
const nunjucks = require('nunjucks');

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const banano = require('./banano.js');
const mongo = require('./database.js');

let db = mongo.getDb();
let collection;
db.then((db) => {
    collection = db.collection("collection");
});

nunjucks.configure('templates', {autoescape: true});

async function insert(addr, value) {
    await collection.insertOne({"address": addr, "value": value});
}

async function replace(addr, newvalue) {
    await collection.replaceOne({"address": addr}, {"address": addr, "value": newvalue});
}

async function find(addr) {
    return await collection.findOne({"address": addr});
}

async function count(query) {
    return await collection.count(query);
}

const app = express();

app.use(express.static('files'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(cookieParser());

// 1 claim per day
const claim_freq = 86400000;

let ip_cache = {};

function clearCache() {
    ip_cache = {};
}

setInterval(clearCache, claim_freq * 1.3);

//If I am on break this is true. Reduces faucet payouts to 0.02
const on_break = false;
//If this is true, logs info
const logging = false;
//If this is true, no unopened accounts can claim
const no_unopened = false;
const faucet_addr = "ban_3jzi3modbcrfq7gds5nmudstw3kghndqb1k48twhqxds3ytyj4k7cf79q5ij";
const blacklist = ["ban_3qyp5xjybqr1go8xb1847tr6e1ujjxdrc4fegt1rzhmcmbtntio385n35nju", "ban_1yozd3rq15fq9eazs91edxajz75yndyt5bpds1xspqfjoor9bdc1saqrph1w", "ban_1894qgm8jym5xohwkngsy5czixajk5apxsjowi83pz9g6zrfo1nxo4mmejm9", "ban_38jyaej59qs5x3zim7t4pw5dwixibkjw48tg1t3i9djyhtjf3au7c599bmg3", "ban_3a68aqticd6wup99zncicrbkuaonypzzkfmmn66bxexfmw1ckf3ewo3fmtm9", "ban_3f9j7bw9z71gwjo7bwgpfcmkg7k8w7y3whzc71881yrmpwz9e6c8g4gq4puj", "ban_3rdjcqpm3j88bunqa3ge69nzdzx5a6nqumzc4ei3t1uwg3ciczw75xqxb4ac", "ban_3w5uwibucuxh9psbpi9rp9qnikh9gywjc94cyp5rxirzsr5mtk5gbr5athoc", "ban_1pi3knekobemmas387mbq44f9iq9dzfmuodoyoxbs38eh5yqtjmy1imxop6m", "ban_1awbxp5y7r97hmc1oons5z5nirgyny7jenxcn33ehhzjmotf1pnuoopousur"]

app.get('/', async function (req, res) {
    let current_bal = await banano.check_bal(faucet_addr);
    let errors = false;
    let address = false;
    let given = false;
    let amount = 0;
    //render template
    return res.send(nunjucks.render('index.html', {
        current_bal: String(current_bal),
        errors: errors,
        address: address,
        given: given,
        amount: amount,
        faucet_addr: faucet_addr
    }));
})

app.post('/', async function (req, res) {
    let current_bal = await banano.check_bal(faucet_addr);
    let errors = false;
    let address = req.body['addr'];
    let given = false;
    let amount = 0.05;
    let valid = await banano.is_valid(address);
    if (!valid) {
        errors = "Invalid banano address was given, check again"
        return res.send(nunjucks.render("index.html", {
            current_bal: String(current_bal),
            errors: errors,
            address: address,
            given: given,
            amount: amount,
            on_break: on_break,
            faucet_addr: faucet_addr
        }));
    }
    if (Number(current_bal) > 100) {
        amount = 0.1;
    }
    if (on_break) {
        amount = 0.03;
    }
    if (await banano.is_unopened(address)) {
        amount = 0.019;
    }
    let today = new Date();
    today = String(today.getMonth() + 1) + "/" + String(today.getDate());
    let special_day = ['1/1', '4/1', '10/31', '12/24', '12/31'];
    if (special_day.includes(today)) {
        amount = amount * 2;
    }
    let token = req.body['h-captcha-response'];
    let params = new URLSearchParams();
    params.append('response', token);
    params.append('secret', process.env.secret);
    let captcha_resp = await axios.post('https://hcaptcha.com/siteverify', params)
    captcha_resp = captcha_resp.data;
    let dry = await banano.faucet_dry()

    let account_history = await banano.get_account_history(address);
    if (banano.address_related_to_blacklist(account_history, blacklist) || blacklist.includes(address)) {
        console.log(address)
        errors = "This address is blacklisted because it is cheating and farming faucets (or sent money to an address participating in cheating and farming). If you think this is a mistake, message monkaS#5399 on discord."
        return res.send(nunjucks.render("index.html", {
            errors: errors,
            address: address,
            given: given,
            amount: amount,
            current_bal: String(current_bal),
            on_break: on_break,
            faucet_addr: faucet_addr
        }));
    }

    if (await banano.is_unopened(address) && no_unopened) {
        errors = "Hello! Currently unopened accounts are not allowed to claim, because the faucet is under attack. We apologize to legitimate users."
        return res.send(nunjucks.render("index.html", {
            errors: errors,
            address: address,
            given: given,
            amount: amount,
            current_bal: String(current_bal),
            on_break: on_break,
            faucet_addr: faucet_addr
        }));
    }

    if (logging) {
        console.log(address)
        console.log("here :)")  /*TODO add stuff*/
        console.log(req.header('x-forwarded-for'))
    }

    if (dry) {
        errors = "The Faucet is dry right now. Try again later or if you can, donate some bananos"
        return res.send(nunjucks.render("index.html", {
            errors: errors,
            address: address,
            given: given,
            amount: amount,
            current_bal: String(current_bal),
            on_break: on_break,
            faucet_addr: faucet_addr
        }));
    }

    if (!captcha_resp['success']) {
        errors = "The Captcha failed, please try again"
        return res.send(nunjucks.render("index.html", {
            errors: errors,
            address: address,
            given: given,
            amount: amount,
            current_bal: String(current_bal),
            on_break: on_break,
            faucet_addr: faucet_addr
        }));
    }

    /*YOU PROBABLY WANT TO UNCOMMENT THIS (how) TODO*/
    /*    let ip = req.header('x-forwarded-for').slice(0, 14);
        if (ip_cache[ip]) {
            ip_cache[ip] = ip_cache[ip] + 1
            if (ip_cache[ip] > 3) {
                errors = "There have been too many claims from this IP"
                return res.send(nunjucks.render("index.html", {
                    errors: errors,
                    address: address,
                    given: given,
                    amount: amount,
                    current_bal: String(current_bal),
                    on_break: on_break,
                    faucet_addr: faucet_addr
                }));
            }
        } else {
            ip_cache[ip] = 1
        }*/


    if (req.cookies['ban_time']) {
        if (Number(req.cookies['ban_time']) + claim_freq > Date.now()) {
            errors = "Your last claim was too soon, you can claim once per day"
            return res.send(nunjucks.render("index.html", {
                errors: errors,
                address: address,
                given: given,
                amount: amount,
                current_bal: String(current_bal),
                on_break: on_break,
                faucet_addr: faucet_addr
            }));
        }
    }

    //let db_result = await db.get(address);
    let db_result = await find(address);
    if (db_result) {
        db_result = db_result['value'];
        if (Number(db_result) + claim_freq < Date.now()) {
            //all clear, send bananos!
            send = await banano.send_banano(address, amount);
            if (send == false) {
                errors = "The Send failed, please try again"
            } else {
                res.cookie('ban_time', String(Date.now()), {maxAge: 86400, sameSite: true});
                //await db.set(address,String(Date.now()));
                await replace(address, String(Date.now()));
                given = true;
            }
        } else {
            errors = "Your last claim was too soon, you can claim once per day"
        }
    } else {
        //all clear, send bananos!
        send = await banano.send_banano(address, amount);
        if (send == false) {
            errors = "Send failed"
        } else {
            res.cookie('ban_time', String(Date.now()), {maxAge: 86400, sameSite: true});
            //await db.set(address,String(Date.now()));
            await insert(address, String(Date.now()));
            given = true;
        }
    }
    return res.send(nunjucks.render("index.html", {
        errors: errors,
        address: address,
        given: given,
        amount: amount,
        current_bal: String(current_bal),
        on_break: on_break,
        faucet_addr: faucet_addr
    }));
})

app.listen(8081, async () => {
    await banano.receive_deposits();
    console.log(`Banoboto's Faucet started.`)
});