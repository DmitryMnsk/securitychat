function response (data) {
    let resp = data.responseText;
    try {
        if (data.message != void (0)) {
            resp = data.message;
        } else {
            resp = JSON.parse(data.responseText);
            resp = resp.message;
        }
    } catch (e) {}
    return resp;
}

$(".logout-btn").on('click', e => {
    e.preventDefault();
    $.ajax({
        url: '/logout',
        type: 'POST',
        data: {},
        success: (res) => {
            alert(response(res));
            location.reload();
        },
        error: (res) => {
            alert(response(res));
        }
    });
});

$( document ).ready( () => {
    if (!location.pathname.substr(1)){
        return;
    }
    var room = location.pathname.substr(1),
        socket = io.connect('http://localhost:7777'),
        code = null;

    socket.on('connected', function (msg) {
        socket.emit('join', room);
        socket.emit('receiveHistory', room);
    });
    socket.on('message', addMessage);

    socket.on('history', messages => {
        for (let message of messages) {
            addMessage(message);
        }
    });

    $('.chat-message button#submit').on('click', send);
    $('.chat-message button#applyCode').on('click', applyCode);
    $('.chat-message button#resetCode').on('click', resetCode);
    $('#inputfield').on('keyup', (e) => {
        if (e.keyCode == 13) {
            if (!e.ctrlKey) {
                send(e);
            }
        }
    });

    function applyCode (e) {
        e.preventDefault();
        code = $("input[name='code']").val().trim() || null;
        $('.chat-history li').remove();
        socket.emit('receiveHistory', room);
    }

    function resetCode (e) {
        e.preventDefault();
        code = null;
        $("input[name='code']").val('');
        $('.chat-history li').remove();
        socket.emit('receiveHistory', room);
    }

    function send (e) {
        e.preventDefault();
        if ($("#multifiles:visible").length) {
            $("#multifiles div").each(function(i, img) {
                sendMessage($(this), function () {
                    this.remove();
                });
            });
            $('#inputfield').show();
            $('#multifiles').hide();
            return;
        }

        sendMessage($("textarea[name='message']"), function () {
            this.val('');
            this.css({backgroundImage: 'none'});
        });
    }

    function applyCrypt (text) {
        let cryptoCode = $("input[name='code']").val().trim();
        code = cryptoCode || null;
        if (!cryptoCode) {
            cryptoCode = location.pathname.substr(1);
        }
        return CryptoJS.AES.encrypt(text, cryptoCode).toString();

        //CryptoJS.AES.decrypt(ciphertext.toString(), '44').toString(CryptoJS.enc.Utf8)
    }

    function sendMessage (selector, callback) {
        var content,
            type = 'text';

        if (selector.data() && selector.data().type) {
            var data = selector.data();
            type = data.type;
            switch (data.type) {
                case 'img':
                    content = {
                        width: data.width,
                        height: data.height,
                        filename: data.filename,
                        dataURL: data.dataURL
                    };
                    break;
                default:
                    content = applyCrypt(selector.val().trim());
            }
        } else {
            content = applyCrypt(selector.val().trim());
        }
        if(!!content) {
            console.log(content);
            socket.emit('msg', {
                type: type,
                content: content
            }, room);
            if (typeof callback == 'function') {
                callback.call(selector);
            }
            selector.data({});
        }
    }

    function encodeHTML (str){
        return $('<div />').text(str).html();
    }

    function getContent (type, defaultContent) {
        switch (type) {
            case 'img':
                if (!code) {
                    return '___' + (Math.random() * 10000000).toFixed(2) + '___';
                }
                return defaultContent;
        }
        if (code) {
            return CryptoJS.AES.decrypt(defaultContent, code).toString(CryptoJS.enc.Utf8)
        }
        return defaultContent

    }

    function addMessage(message) {
        console.log(message.content);
        message.date      = (new Date(message.date)).toLocaleString();
        message.username  = encodeHTML(message.username);
        if (message.type) {
            switch (message.type) {
                case 'img':
                    if (typeof message.content == 'object') {
                        var div = $("<div></div>").css({
                            backgroundImage: "url(" + message.content.dataURL + ")",
                            width: message.content.width,
                            height: message.content.height
                        });
                        message.content = getContent(message.type, '' +
                            '<a download="' + (message.filename || 'download')  + '" href="' + message.content.dataURL + '" target="_blank">' +
                            'Скачать картинку' +
                            '</a><br/>' + div.prop('outerHTML'));
                    } else {
                        message.content = '';
                    }
                    break;
                default:
                    message.content = getContent(message.type, encodeHTML(message.content));
            }
        } else {
            message.content = getContent(message.type, encodeHTML(message.content));
        }

        var html = `
            <li>
                <div class="message-data">
                    <span class="message-data-name">${message.username}</span>
                    <span class="message-data-time">${message.date}</span>
                </div>
                <div class="message my-message" dir="auto">${message.content}</div>
            </li>`;

        $(html).hide().appendTo('.chat-history ul').slideDown(200);

        $(".chat-history").animate({ scrollTop: $('.chat-history')[0].scrollHeight}, 1000);
    }
    $( window ).on('unload', function() {
        socket.emit('disconnect');
    });
});