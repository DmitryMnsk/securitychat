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
        socket = io.connect('http://localhost:7777');

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

    $('.chat-message button').on('click', send);
    $('#inputfield').on('keyup', (e) => {
        if (e.keyCode == 13) {
            if (!e.ctrlKey) {
                send(e);
            }
        }
    });

    function send (e) {
        e.preventDefault();
        if (!$("#multifiles").get(0).hidden) {
            $("#multifiles div").each(function(i, img) {
                sendMessage($(this), function () {
                    this.remove();
                });
            });
            $('#inputfield').show();
            $('#multifiles').hide();
        }

        sendMessage($("textarea[name='message']"), function () {
            this.val('');
            this.css({backgroundImage: 'none'});
        });
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
                    content = selector.val().trim();
            }
        } else {
            content = selector.val().trim();
        }
        if(!!content) {
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

    function addMessage(message) {
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
                        message.content = '' +
                            '<a download="' + (message.filename || 'download')  + '" href="' + message.content.dataURL + '" target="_blank">' +
                            'Скачать картинку' +
                            '</a><br/>' + div.prop('outerHTML');
                    } else {
                        message.content = '';
                    }
                    break;
                default:
                    message.content = encodeHTML(message.content);
            }
        } else {
            message.content = encodeHTML(message.content);
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
    $( window ).unload(function() {
        socket.emit('disconnect');
    });
});