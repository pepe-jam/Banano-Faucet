const express = require('express');
const axios = require('axios');
const nunjucks = require('nunjucks');

//const Database = require("@replit/database");

//const db = new Database();

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const banano = require('./banano.js');
const nano = require('./nano.js');
const mongo = require('./database.js');

const xdai = require('./xdai.js');

let db = mongo.getDb();
let collection;
//collection.find({}).forEach(console.dir)
db.then((db) => {collection = db.collection("collection"); 
});

nunjucks.configure('templates', { autoescape: true });

async function insert(addr,value) {
  await collection.insertOne({"address":addr,"value":value});
}

async function replace(addr,newvalue) {
  await collection.replaceOne({"address":addr}, {"address":addr,"value":newvalue});
}

async function find(addr) {
  return await collection.findOne({"address":addr});
}

async function count(query) {
  return await collection.count(query);
}

const app = express();

app.use(express.static('files'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(cookieParser());

const claim_freq = 86400000;

let ip_cache = {};
function clearCache() {
  ip_cache = {};
}
setInterval(clearCache, claim_freq*1.3);

let nano_ip_cache = {};
function nanoclearCache() {
  nano_ip_cache = {};
}
setInterval(nanoclearCache, claim_freq*1.3);

//If I am on break this is true. Reduces faucet payouts to 0.02
const on_break = false;
//If this is true, logs info
const logging = false;
//If this is true, no unopened accounts can claim
const no_unopened = false;
const faucet_addr = "ban_3346kkobb11qqpo17imgiybmwrgibr7yi34mwn5j6uywyke8f7fnfp94uyps";
const faucet_addr_nano = "nano_3346kkobb11qqpo17imgiybmwrgibr7yi34mwn5j6uywyke8f7fnfp94uyps";
const faucet_addr_xdai = "0x6e49e60f7228b6cc9883c89811266d212092a8aa"

const blacklist = ["ban_3qyp5xjybqr1go8xb1847tr6e1ujjxdrc4fegt1rzhmcmbtntio385n35nju", "ban_1yozd3rq15fq9eazs91edxajz75yndyt5bpds1xspqfjoor9bdc1saqrph1w", "ban_1894qgm8jym5xohwkngsy5czixajk5apxsjowi83pz9g6zrfo1nxo4mmejm9", "ban_38jyaej59qs5x3zim7t4pw5dwixibkjw48tg1t3i9djyhtjf3au7c599bmg3", "ban_3a68aqticd6wup99zncicrbkuaonypzzkfmmn66bxexfmw1ckf3ewo3fmtm9", "ban_3f9j7bw9z71gwjo7bwgpfcmkg7k8w7y3whzc71881yrmpwz9e6c8g4gq4puj", "ban_3rdjcqpm3j88bunqa3ge69nzdzx5a6nqumzc4ei3t1uwg3ciczw75xqxb4ac", "ban_3w5uwibucuxh9psbpi9rp9qnikh9gywjc94cyp5rxirzsr5mtk5gbr5athoc", "ban_1pi3knekobemmas387mbq44f9iq9dzfmuodoyoxbs38eh5yqtjmy1imxop6m", "ban_1awbxp5y7r97hmc1oons5z5nirgyny7jenxcn33ehhzjmotf1pnuoopousur"]

const nano_blacklist = ["nano_1or7xscday8pm91zjfnh5bsmsgo9t1rnci9ekopiuyfcmk3noa9oueo8zoeb", "nano_17ka7phdc5za7be4xmawjhsyoubogmunkc5fkp91sztdiqbcpoiaps984xe1", "nano_1s6aa835kgr6g57zy1nhig9i7p4hkuije1r4k875qtstbari9gxyn3izs6kc", "nano_17qmowxc9h6fkj6bm94b4rqkwwws9knyh6kueadnf4dk7upm5etpogmd5dj8"]


app.get('/', async function (req, res) {
  let errors = false;
  let address = false;
  let given = false;
  let amount = 0;
  //render template 
  return res.send(nunjucks.render('index.html', {errors: errors, address: address, given: given, amount: amount, faucet_addr: faucet_addr}));
})

app.post('/', async function (req, res) {
  let errors = false;
  let address = req.body['addr'];
  let given = false;
  let current_bal = await banano.check_bal(faucet_addr);
  let amount = (Math.floor(Math.random()*7)/100)+0.01;
  let valid = await banano.is_valid(address);
  if (!valid) {
    errors = "Invalid address"
    return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break, faucet_addr: faucet_addr}));
  }
  if (Number(current_bal) > 100) {
    amount = (Math.floor(Math.random()*8)/100)+0.02;
  }
  if (on_break) {
    amount = 0.02;
  }
  if (await banano.is_unopened(address)) {
    amount = 0.01;
    if (no_unopened) {
      errors = "Hello! Currently unopened accounts are not allowed to claim, because the faucet is under attack. We apologize to legitimate users."
      return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break, faucet_addr: faucet_addr}));
    }
  }
  let token = req.body['h-captcha-response'];
  let params = new URLSearchParams();
  params.append('response', token);
  params.append('secret', process.env.secret);
  let captcha_resp = await axios.post('https://hcaptcha.com/siteverify', params)
  captcha_resp = captcha_resp.data;

  let account_history = await banano.get_account_history(address);
  if (banano.address_related_to_blacklist(account_history, blacklist) || blacklist.includes(address)) {
    console.log(address)
    errors = "This address is blacklisted because it is cheating and farming faucets (or sent money to an address participating in cheating and farming). If you think this is a mistake message me (u/prussia_dev) on reddit. If you are a legitimate user impacted by this, please use a different address or try again."
    return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break, faucet_addr: faucet_addr}));
  }

  if (logging) {
    console.log(address)
    console.log(req.header('x-forwarded-for'))
  }

  let dry = await banano.faucet_dry();
  if (dry) {
    errors = "Faucet dry"
    return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break, faucet_addr: faucet_addr}));
  }
  if (!captcha_resp['success']) {
    errors = "Captcha failed"
    return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break, faucet_addr: faucet_addr}));
  }
  /*YOU PROBABLY WANT TO UNCOMMENT THIS
  let ip = req.header('x-forwarded-for').slice(0,14);
  if (ip_cache[ip]) {
    ip_cache[ip] = ip_cache[ip]+1
    if (ip_cache[ip] > 3) {
      errors = "Too many claims from this IP"
      return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break, faucet_addr: faucet_addr}));
    }
  } else {
    ip_cache[ip] = 1
  }
  */

  if (req.cookies['last_claim']) {
    if (Number(req.cookies['last_claim'])+claim_freq > Date.now()) {
      errors = "Last claim too soon"
      return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break, faucet_addr: faucet_addr}));
    }
  }

  //let db_result = await db.get(address);
  let db_result = await find(address);
  if (db_result) {
    db_result = db_result['value'];
    if (Number(db_result)+claim_freq < Date.now()) {
      //all clear, send bananos!
      send = await banano.send_banano(address, amount);
      if (send == false) {
        errors = "Send failed"
      } else {
        res.cookie('last_claim', String(Date.now()));
        //await db.set(address,String(Date.now()));
        await replace(address,String(Date.now()));
        given = true;
      }
    } else {
      errors = "Last claim too soon"
    }
  } else {
    //all clear, send bananos!
    send = await banano.send_banano(address, amount);
    if (send == false) {
      errors = "Send failed"
    } else {
      res.cookie('last_claim', String(Date.now()));
      //await db.set(address,String(Date.now()));
      await insert(address,String(Date.now()));
      given = true;
    }
  }
  return res.send(nunjucks.render("index.html", {errors: errors, address: address, given: given, amount: amount, current_bal:String(current_bal), on_break: on_break, faucet_addr: faucet_addr}));
})

app.get('/nano', async function (req, res) {
  return res.send(nunjucks.render('nano.html', {}));
})

app.post('/nano', async function (req, res) {
  //return res.send(nunjucks.render('nano.html', {error: "Faucet currently under upgrade and maintenance, come back later", success: false}));
  let address = req.body['addr'];

  let current_bal = await nano.check_bal(faucet_addr_nano);
  let amount = 0.0002; 

  if (await nano.is_unopened(address)) {
    amount = 0.00005;
    if (no_unopened) {
      return res.send(nunjucks.render("nano.html", {error: "Faucet is under attack, unopened addresses cannot claim.", success: false}));
    }
  }

  /*YOU PROBABLY WANT TO ENABLE THIS
  let ip = req.header('x-forwarded-for').slice(0,14);
  if (nano_ip_cache[ip]) {
    nano_ip_cache[ip] = nano_ip_cache[ip]+1
    if (nano_ip_cache[ip] > 2) {
      return res.send(nunjucks.render('nano.html', {error: "Too many claims from this IP"}));
    }
  } else {
    nano_ip_cache[ip] = 1
  }
  */

  if (logging) {
    console.log(address)
    console.log(req.header('x-forwarded-for'))
  }

  if (req.cookies['nano_last_claim']) {
    if (Number(req.cookies['nano_last_claim'])+claim_freq > Date.now()) {
      return res.send(nunjucks.render("nano.html", {error: "Last claim too soon.", success: false}));
    }
  }

  let account_history = await nano.get_account_history(address);
  if (nano.address_related_to_blacklist(account_history, nano_blacklist) || nano_blacklist.includes(address)) {
    return res.send(nunjucks.render("nano.html", {error: "This address is blacklisted because it is cheating and farming faucets (or sent money to an address participating in cheating and farming).", success: false}));
  }

  let token = req.body['h-captcha-response'];
  let params = new URLSearchParams();
  params.append('response', token);
  params.append('secret', process.env.secret);
  let captcha_resp = await axios.post('https://hcaptcha.com/siteverify', params);
  captcha_resp = captcha_resp.data;

  if (!captcha_resp['success']) {
    return res.send(nunjucks.render('nano.html', {error: "Captcha failed", success: false}));
  }

  let valid = await nano.is_valid(address);

  if (!valid) {
    return res.send(nunjucks.render("nano.html", {error: "Invalid address.", success: false}));
  }

  let dry = await nano.faucet_dry();

  if (dry) {
    return res.send(nunjucks.render('nano.html', {error: "Faucet dry", success: false}));
  }

  let db_result = await find(address);
  if (db_result) {
    db_result = db_result['value'];
    if (Number(db_result)+claim_freq < Date.now()) {
      //send nanos
      send = await nano.send_nano(address, amount);
      if (send == false) {
        return res.send(nunjucks.render('nano.html', {error: "Send failed", success: false}));
      }
      res.cookie('nano_last_claim', String(Date.now()));
      await replace(address,String(Date.now()));
      return res.send(nunjucks.render('nano.html', {error: false, success: true}));
    } else {
      return res.send(nunjucks.render('nano.html', {error: "Last claim too soon", success: false}));
    }
  }

  send = await nano.send_nano(address, amount);
  if (send == false) {
    return res.send(nunjucks.render('nano.html', {error: "Send failed", success: false}));
  }
  res.cookie('nano_last_claim', String(Date.now()));
  await insert(address,String(Date.now()));
  return res.send(nunjucks.render('nano.html', {error: false, success: true}));
});

app.get('/xdai', async function (req, res) {
  let errors = false;
  let address = false;
  let given = false;
  //render template 
  return res.send(nunjucks.render('xdai.html', {error: false, address: false, given: false, faucet_addr: faucet_addr_xdai}));
})

app.post('/xdai', async function (req, res) {
  let address = req.body['addr'];

  let current_bal = await nano.check_bal(faucet_addr_nano);
  let amount = "0.001"; 

  if (req.cookies['xdai_last_claim']) {
    if (Number(req.cookies['xdai_last_claim'])+claim_freq > Date.now()) {
      return res.send(nunjucks.render("xdai.html", {error: "Last claim too soon", address: address, given: false, faucet_addr: faucet_addr_xdai}));
    }
  }

  let token = req.body['h-captcha-response'];
  let params = new URLSearchParams();
  params.append('response', token);
  params.append('secret', process.env.secret);
  let captcha_resp = await axios.post('https://hcaptcha.com/siteverify', params);
  captcha_resp = captcha_resp.data;

  if (!captcha_resp['success']) {
    return res.send(nunjucks.render('xdai.html', {error: "Failed captcha", address: address, given: false, faucet_addr: faucet_addr_xdai}));
  }

  let dry = await xdai.faucet_dry(faucet_addr_xdai);

  if (dry) {
    return res.send(nunjucks.render('xdai.html', {error: "Last claim too soon", address: address, given: false, faucet_addr: faucet_addr_xdai}));
  }

  let db_result = await find(address);
  if (db_result) {
    db_result = db_result['value'];
    if (Number(db_result)+claim_freq < Date.now()) {
      send = await xdai.send_xdai(address, amount);
      if (send == false) {
        return res.send(nunjucks.render('xdai.html', {error: "Send failed", address: address, given: false, faucet_addr: faucet_addr_xdai}));
      }
      res.cookie('xdai_last_claim', String(Date.now()));
      await replace(address,String(Date.now()));
      return res.send(nunjucks.render('xdai.html', {error: false, address: address, given: true, faucet_addr: faucet_addr_xdai}));
    } else {
      return res.send(nunjucks.render('xdai.html', {error: "Last claim too soon", address: address, given: false, faucet_addr: faucet_addr_xdai}));
    }
  }

  send = await xdai.send_xdai(address, amount);
  if (send == false) {
    return res.send(nunjucks.render('xdai.html', {error: "Send Failed", address: address, given: false, faucet_addr: faucet_addr_xdai}));
  }
  res.cookie('xdai_last_claim', String(Date.now()));
  await insert(address,String(Date.now()));
  return res.send(nunjucks.render('xdai.html', {error: false, address: address, given: true, faucet_addr: faucet_addr_xdai}));
})

app.listen(8081, async () => {
  await banano.receive_deposits();
  //await nano.receive_deposits();
  //current node does not let us receive deposits
  console.log(`App on`)
});