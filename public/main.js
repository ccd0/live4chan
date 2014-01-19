var auto_post = false;
var cool_down_timer = 0;
var cool_down_interval;
var admin_mode = false;

var window_focus = true;
var window_alert;
var blink;
var unread_chats = 0;

var socket = io.connect('/');

var path = window.location.pathname;
var chat_id = path.slice(path.lastIndexOf('/') + 1);

var html5 = false;
try {
    html5 = (window.localStorage !== undefined && window.localStorage !== null);
} catch (e) {
    html5 = false;
}

function scroll() {
    "use strict";
    var scr = $('.chats:first')[0].scrollHeight;
    scr += 10;
    $(".chats:first").animate({
        scrollTop: scr
    }, 200, 'swing', function () {

    });
}

function get_css(file) {
    "use strict";
    if ($('#css_new')) {
        $('#css_new').remove();
    }
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    link.id = 'css_new';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = file;
    link.media = 'all';
    head.appendChild(link);
    scroll();
}

if (html5) {
    if (false) {
        // set to true to reset local storage to defaults
        localStorage.my_ids = "[0]";
        localStorage.contribs = "[\"0\"]";
        localStorage.convo = "";
        localStorage.name = "";
        localStorage.theme = "/style.css";
    }
    my_ids = localStorage.my_ids;
    if (my_ids) {
        my_ids = JSON.parse(my_ids);
    } else {
        my_ids = [];
    }

    contribs = localStorage.contribs;
    if (contribs) {
        contribs = JSON.parse(contribs);
    } else {
        contribs = default_contribs;
    }

    if (localStorage.theme === "null") {
        localStorage.theme = "/style.css";
    }

    $(document).ready(function () {
        "use strict";
        $("#name").val(localStorage.name);
        $("#convo").val(localStorage.convo);
        $("#theme_select").val(localStorage.theme);
        if (!$("#theme_select").val().replace(/^\s+|\s+$/gm, '') || $("#theme_select").val() === "null") {
            $("#theme_select").val("/style.css");
        }
        get_css($("#theme_select").val());
    });
}

function captcha_div() {
    "use strict";
    return '<img src="/captcha.jpg#' + new Date().getTime() + '" alt="Lynx is best browser" /><form action="/login" method="post" target="miframe"><br /><input type="text" name="digits" /></form>';
}

function get_cookie(cname) {
    "use strict";
    var name = cname + "=";
    var ca = document.cookie.split(';');
    var i = 0;
    var c = null;
    for (i = 0; i < ca.length; i++) {
        c = ca[i].replace(/^\s+|\s+$/gm, '');
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function div_alert(message, add_button, div_id) {
    "use strict";
    if (add_button === undefined) {
        add_button = true;
    }
    if (div_id === undefined) {
        div_id = "";
    }
    var alert_div = document.createElement('aside');
    alert_div.setAttribute('class', 'alert_div');
    alert_div.setAttribute('id', 'alert_div_' + div_id);
    var button_html = "<button class='alert_button' onclick='$(\"#alert_div_" + div_id + "\").remove();'>Close</button>";
    if (!add_button) {
        button_html = "";
    }
    alert_div.innerHTML = "<article class='alert_message'>" + message.replace(/\r?\n/g, '<br />') + "</article>" + button_html;
    $(alert_div).css({
        position: 'fixed',
        background: 'white',
        width: '300px',
        bottom: '160px',
        left: document.width / 2 - 150,
        border: '1px black solid',
        zIndex: 1000
    });
    $('.chats:first').append(alert_div);
}

function clear_fields() {
    "use strict";
    $("#image").val('');
    $("#body").val('');
    $("#sum").val('');
}

function cool_down() {
    "use strict";
    if (cool_down_timer <= 0) {
        clearInterval(cool_down_interval);
        $("#cool_down").text("");
        $("#submit_button").prop("disabled", false);
        if (auto_post) {
            submit_chat();
        }
    } else {
        $("#cool_down").text(cool_down_timer);
        $("#submit_button").prop("disabled", true);
        cool_down_timer--;
    }
}

function submit_chat() {
    "use strict";
    if (get_cookie("password_livechan") === '') {
        div_alert(captcha_div(), false, "captcha");
        $("#submit_button").prop("disabled", true);
        $("#submit_button").prop("value", "Submit (Auto)");
        auto_post = true;
        return false;
        //div_alert("<iframe src='/login?page='+path></iframe>");
    }
    $("#submit_button").prop("value", "Submit");
    auto_post = false;
    if (html5) {
        localStorage.name = $("#name").val();
        localStorage.convo = $("#convo").val().replace(/^General$/, "");
        localStorage.theme = $("#theme_select").val();
    }

    if ($("#body").val() === '') {
        $("#body").val("  ");
    }
    var msg = $("#body").val();
    if (msg.indexOf('//') !== 0 && msg.indexOf('/') === 0) {
        var cmdend = msg.indexOf(' ');
        if (cmdend <= 0) {
            cmdend = msg.length;
        }
        var cmd = msg.substring(1, cmdend).replace("\n", '');
        var param = msg.substring(cmdend + 1, msg.length).replace("\n", '');
        $("#body").val('');
        switch (cmd) {
        case "addtryp":
            if (param) {
                contribs.push(param);
                if (html5) {
                    localStorage.contribs = JSON.stringify(contribs);
                }
            } else {
                div_alert("usage: /addtryp !tripcode");
            }
            break;
        case "remtryp":
            if (param) {
                var idx = $.inArray(param, contribs);
                if (idx > -1) {
                    contribs.splice(idx, 1);
                    if (html5) {
                        localStorage.contribs = JSON.stringify(contribs);
                    }
                }
            } else {
                div_alert("usage: /remtryp !tripcode");
            }
            break;
        case "join":
            if (param) {
                window.open('http://' + document.location.host + '/chat/' + param.replace('/', ''));
            } else {
                div_alert("usage: /join /channel");
            }
            break;
        case "help":
        default:
            div_alert(
                "/addtryp !tripcode: add emphasis to tripcode\n" +
                "/remtryp !tripcode: remove emphasis from tripcode\n" +
                "/join /channel: join channel\n" +
                "/help: display this text\n\n" +
                "CONVERSATIONS\n" +
                "==============\n" +
                "On this site threads are known as \"conversations\"\n" +
                "You can change your active conversation from the default \"General\" in the second text box\n" +
                "Setting a conversation allows you filter posts to it by using the dropdown box in the lower right\n\n" +
                "SESSIONS\n" +
                "==============\n" +
                "After logging in by entering a CAPTCHA your session will last for 15 minutes\n" +
                "Once your session expires posts won't show for other users until you re-login"
            );
        }
        return;
    }
    $("#comment-form").submit();

    if (!admin_mode) {
        $("#submit_button").prop("disabled", true);
        clear_fields();
        cool_down_timer = 6;
        clearInterval(cool_down_timer);
        cool_down();
        cool_down_interval = setInterval(cool_down, 1000);
    } else {
        clear_fields();
    }
    return false;
}

function quote(id) {
    "use strict";

    // insert quoted id at cursor
    var el = $("#body")[0];
    var text = ">>" + id + "\n";
    var val = el.value,
        endIndex, range;
    if (el.selectionStart !== undefined && el.selectionEnd !== undefined) {
        endIndex = el.selectionEnd;
        el.value = val.slice(0, el.selectionStart) + text + val.slice(endIndex);
        el.selectionStart = el.selectionEnd = endIndex + text.length;
    } else if (document.selection !== undefined && document.selection.createRange !== undefined) {
        el.focus();
        range = document.selection.createRange();
        range.collapse(false);
        range.text = text;
        range.select();
    }

    // set conversation
    if (get_convo() === "General" && chat[id].convo && chat[id].convo !== "General" && chat[id].convo !== '') {
        $("#convo").val(chat[id].convo);
        apply_filter();
    }
}

function notifications(post_convo) {
    "use strict";
    if (window_focus === false && ($('#convo_filter').val() !== 'filter' || post_convo === get_convo())) {
        unread_chats++;
        clearInterval(window_alert);
        window_alert = setInterval(function () {
            if (!blink) {
                window.document.title = '(' + unread_chats + ') unread chats';
            } else {
                window.document.title = 'LiveChan';
            }
            blink = !blink;

        }, 1500);
    }
}

function get_convo() {
    "use strict";
    var convo = $('#convo').val();
    return (convo === "") ? "General" : convo;
}

function apply_filter(posts) {
    "use strict";
    if (posts === undefined) {
        posts = $('.chat');
    }
    var convo = get_convo();
    var value = $('#convo_filter').val();
    posts.toggleClass('chat_dim', false);
    posts.toggleClass('chat_hidden', false);

    if (value === "highlight"){
        posts.toggleClass(function () {
            var id = parseInt(this.id.match(/\d+/)[0], 10);
            return (convo === chat[id].convo) ? '' : 'chat_dim';
        }, true);
    } else if (value === "filter"){
        posts.toggleClass(function () {
            var id = parseInt(this.id.match(/\d+/)[0], 10);
            return (convo === chat[id].convo) ? '' : 'chat_hidden';
        }, true);
    }
}

function show_images() {
    "use strict";
    return $("#autoimages").prop('checked');
}

function insert_post(post) {
    "use strict";
    $(".chats:first").append(post);
}

loaded_callbacks.push(function() {
    if ($("#autoscroll").prop('checked')) scroll();
});

window.onload = function () {
    "use strict";
    socket.on('request_location', function (data) {
        socket.emit('subscribe', chat_id);
    });
    var title = 'LiveChan';
    window.document.title = title;

    $(window).focus(function () {
        unread_chats = 0;
        window.document.title = title;
        clearInterval(window_alert);
        window_focus = true;
    })
        .blur(function () {
            window_focus = false;
        });

    $("#name").keydown(function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            return false;
        }
    });

    $("#convo").keydown(function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            return false;
        }
    });

    $("#body").keydown(function (e) {
        if (!e.shiftKey && e.keyCode === 13) {
            if ($("#autosubmit").prop('checked') && cool_down_timer <= 0 && !$("#submit_button").prop("disabled")) {
                submit_chat();
            } else {
                auto_post = true;
                $("#submit_button").prop("value", "Submit (Auto)");
            }
            return false;
        }
    });


    $.ajax({
        type: "GET",
        url: "/data/" + chat_id
    }).done(function (data) {
        draw_chat(data);
        socket.on('chat', function (data) {
            update_chat(data);
            if ($("#autoscroll").prop('checked')) {
                scroll();
            }
        });
    });

    if (get_cookie("password_livechan") === '') {
        div_alert(captcha_div(), false, "captcha");
        $("#submit_button").prop("disabled", true);
    }

    $('iframe#miframe').load(function () {
        var resp = JSON.parse($("#miframe").contents()[0].body.childNodes[0].innerHTML);
        if (resp.failure) {
            div_alert(resp.failure);
        } else if (resp.id) {
            my_ids.push(resp.id);
            if (html5) {
                localStorage.my_ids = JSON.stringify(my_ids);
            }
            var links = $([$("body")[0], future_ids[0]]).find(".quote_link, .back_link").filter("[data-dest='" + resp.id + "']");
            setup_quote_links(links);
        } else if (resp.success === "captcha") {
            $("#submit_button").prop("disabled", false);
            $("#alert_div_captcha").remove();
            if (auto_post) {
                submit_chat();
            }
        }
    });

    $('#convo, #convo_filter').change(function () {
        apply_filter();
    });

    $('#theme_select').change(function () {
        get_css($(this).val());
        localStorage.theme = $(this).val().replace("null", "/style.css");
    });

    $("#autoimages").change(function () {
        if (!$("#autoimages").prop('checked')) {
            $('.chat_img').hide('slow');
        } else {
            $('.chat_img').show('slow');
        }
    });

    var quote_hash = window.location.hash.match(/^#q(\d+)$/);
    if (quote_hash) {
        quote(parseInt(quote_hash[1], 10));
    }
};
