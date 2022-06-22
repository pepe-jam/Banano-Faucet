let popupTimer;

function delayedHide(popup, timeout) {
    popupTimer = setTimeout(function () {
        $(popup).popup('hide')
    }, timeout);
}

$(document).ready(function () {
    $(".loader-wrapper").delay(200).fadeOut("slow");


    $(".copy").click(function () {
        clearTimeout(popupTimer);
        let name = {
            0: "donate banano to faucet",
            1: "donate banano to me",
            2: "donate nano to prussia",
            3: "donate banano to prussia"
        };
        let data = {
            0: "ban_3jzi3modbcrfq7gds5nmudstw3kghndqb1k48twhqxds3ytyj4k7cf79q5ij",
            1: "ban_3banobotojqz8pkm1uectwb8baqjkfhq38e6fbwdrp51qjnwemepzc4ytowy",
            2: "nano_1o7ija3mdbmpzt8qfnck583tn99fiupgbyzxtbk5h4g6j57a7rawge6yzxqp",
            3: "ban_1o7ija3mdbmpzt8qfnck583tn99fiupgbyzxtbk5h4g6j57a7rawge6yzxqp"
        };
        let select = null
        if ($(this).hasClass("faucet")) {
            select = 0
        } else if ($(this).hasClass("ban")) {
            select = 1
        } else if ($(this).hasClass("prussia-nano")) {
            select = 2
        } else if ($(this).hasClass("prussia-ban")) {
            select = 3
        }

        navigator.clipboard.writeText(data[select]);
        $(this).popup({
            title: 'copied to clipboard!',
            content: 'head to your wallet to send it. thanks, it\'s appreciated! <3',
            on: 'manual',
            exclusive: true,
            transition: 'fade up'
        })
            .popup('show');
        delayedHide(this, 4500)
    });

    $(".discord").click(function () {
        clearTimeout(popupTimer);
        navigator.clipboard.writeText("monkaS#5399");
        $(this).popup({
            title: 'copied to clipboard!',
            content: 'write me if you have any questions!',
            on: 'manual',
            exclusive: true,
            transition: 'fade up'
        })
            .popup('show');
        delayedHide(this, 2500)
    });

    $(".discord").hover(function () {
        clearTimeout(popupTimer);
        $(this).popup({
            title: 'monkaS#5399',
            content: 'click to copy!',
            on: 'manual',
            exclusive: true,
            transition: 'fade up'
        })
            .popup('show');
        delayedHide(this, 2000)
    }, function () {
        clearTimeout(popupTimer)
        delayedHide(this, 1000)
    });
});

function onSubmit() {
    document.getElementById('giff-banano').submit();
}

let arrow_left = null
let arrow_right = null
let button = null

document.addEventListener("DOMContentLoaded", function (event) {
    arrow_left = document.getElementById('arrow_left');
    arrow_right = document.getElementById('arrow_right')
    button = document.getElementById('btn-container');
    button.addEventListener("mouseover", mouseOver, false);
    button.addEventListener("mouseout", mouseOut, false);
});

function toggle_expandable(id) {
    if (document.getElementById(id + "-drop").innerText == "+") {
        document.getElementById('what-is-banano-drop').innerText = "+";
        document.getElementById('banano-things-drop').innerText = "+";
        document.getElementById('support-creator-drop').innerText = "+";
        document.getElementById(id + '-drop').innerText = "-";
        document.getElementById('what-is-banano').style.display = "none";
        document.getElementById('banano-things').style.display = "none";
        document.getElementById('support-creator').style.display = "none";
        document.getElementById("what-is-banano-container").classList.remove("selected");
        document.getElementById("banano-things-container").classList.remove("selected");
        document.getElementById("support-creator-container").classList.remove("selected");
        document.getElementById(id).style.display = "block";
        document.getElementById(id + "-container").classList.add("selected");
        document.getElementById(id + "-a").href = '#' + id;
    } else {
        document.getElementById(id + "-drop").innerText = "+";
        document.getElementById(id).style.display = "none";
        document.getElementById(id + "-container").classList.remove("selected");
        document.getElementById(id + "-a").href = '#';
    }
}

function mouseOver() {
    var windowSize = window.innerWidth
    if (windowSize > 1279) {
        arrow_right.style.padding = "0 0 0 5rem"
        arrow_left.style.padding = "0 5rem 0 0"
    } else if (windowSize > 768) {
        arrow_right.style.padding = "0 0 0 2rem"
        arrow_left.style.padding = "0 2rem 0 0"
    }
}

function mouseOut() {
    var windowSize = window.innerWidth
    if (windowSize > 1279) {
        arrow_right.style.padding = "0 0 0 8rem"
        arrow_left.style.padding = "0 8rem 0 0"
    } else if (windowSize > 768) {
        arrow_right.style.padding = "0 0 0 4rem"
        arrow_left.style.padding = "0 4rem 0 0"
    }
}