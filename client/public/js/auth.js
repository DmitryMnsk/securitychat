$( document ).ready( () => {
    if (!location.pathname.substr(1)){
        return;
    }
    var room = location.pathname.substr(1),
        socket = io.connect(),
        code = null,
        MAXHEIGHTCONST = 120;

    /*Работа с сокетами*/

    socket.on('connected', socketConnected);
    socket.on('connect_error', resetCode);
    socket.on('disconnect', resetCode);
    socket.on('message', (message, my) => {
        if (!code) {
            return;
        }
        addMessage(message, my)
    });
    socket.on('history', socketHistory);

    function socketConnected (msg) {
        socket.emit('join', room);
        socket.emit('receiveHistory', room);
    }

    function socketHistory (messages) {
        $('.chat-history li').remove();
        let i = messages.length;
        for (let message of messages) {
            addMessage(message,!--i, true);
        }
    }

    function addMessage(message, scroll, history) {
        message.date      = (new Date(message.date)).toLocaleString();
        message.username  = encodeHTML(message.username);
        var imgId, imgData;
        if (message.type) {
            switch (message.type) {
                case 'img':
                    if (typeof message.content == 'object') {
                        var div = $("<div></div>").css({
                            backgroundImage: "url(" + message.content.dataURL + ")",
                            height: MAXHEIGHTCONST,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            cursor: 'pointer'
                        });
                        imgData = {
                            width: message.content.width,
                            height: message.content.height,
                            maxHeight: MAXHEIGHTCONST,
                            wide: false
                        };
                        imgId = (Math.random() * 1000000000000).toFixed(0);
                        div.attr('id', imgId);
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

        html = $(html);
        if (imgId) {
            var el = html.find('#' + imgId);
            el.data(imgData);
            el.on('click', function () {
                var el = $(this),
                    width = $(this).parent('.my-message').width(),
                    data = el.data();
                if (!data.wide) {
                    el.width(width);
                    el.height(data.height * width / data.width);
                } else {
                    el.height(data.maxHeight);
                }
                el.data('wide', !data.wide);
            })
        }

        html.appendTo('.chat-history ul');
        if (scroll)
            doScroll();
    }

    function doScroll () {
        $(".chat-history").scrollTop($('.chat-history ul').outerHeight());
    }
    /*END Работа с сокетами*/

    /*JQuery обработчики*/

    // Работа с вводом
    $('.chat-message button#submit').on('click', send);
    $('#inputfield').on('keyup', (e) => {
        if (e.keyCode == 13) {
            if (!e.ctrlKey) {
                send(e);
            }
        }
    });

    // Крестик удаления картинки из textarean
    $('.chat-message span#clearTextArea').on('click', function (e) {
      var textarea = $("textarea[name='message']"),
          data = textarea.data();
        textarea.height(data.defaultHeight || 'auto');
        textarea.attr('placeholder', data.defaultPlaceholder || '');
        textarea.attr('readOnly', false);
        textarea.removeData();
        textarea.css({backgroundImage: 'none'});
            $(this).hide();
        });

    // Работа с кодом
    $('.chat-message button#resetCode').on('click', resetCode);
    $('.chat-message button#applyCode').on('click', applyCode);
    $("input[name='code']").on('keyup', (e) => {
        if (e.keyCode == 13) {
            applyCode(e);
        }
    });
    /*JQuery обработчики*/


    function applyCode (e) {
        e.preventDefault();
        code = $("input[name='code']").val().trim() || null;
        $('.chat-history li').remove();
        socket.emit('receiveHistory', room);
    }

    function resetCode (e) {
        e && e.preventDefault && e.preventDefault();
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
            var data = this.data();
            this.height(data.defaultHeight || 'auto');
            this.attr('placeholder', data.defaultPlaceholder || '');
            this.attr('readOnly', false);
            this.removeData();
            this.css({backgroundImage: 'none'});
            $('.chat-message span#clearTextArea').hide();
        });
    }

    function applyCrypt (text) {
        let cryptoCode = $("input[name='code']").val().trim();
        code = cryptoCode || null;
        if (!cryptoCode) {
            cryptoCode = location.pathname.substr(1);
        }
        return CryptoJS.AES.encrypt(text, cryptoCode).toString();
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
            socket.emit('msg', {
                type: type,
                content: content
            }, room);
            if (typeof callback == 'function') {
                callback.call(selector);
            }
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


    $( window ).on('unload', function() {
        socket.emit('disconnect');
    });
});