$( document ).ready( () => {
    if (!location.pathname.substr(1)){
        return;
    }
    var room = location.pathname.substr(1),
        socket = io.connect(),
        code = null,
        userName = null,
        MAXHEIGHTCONST = 120;

    document.title = `${room}/Marketing target	Smartphones`;

    /*Работа с сокетами*/

    socket.on('connected', socketConnected);
    socket.on('connect_error', resetCode);
    // socket.on('disconnect', resetCode);
    socket.on('message', (message, my) => {
        if (!my) {
            $.changeFavicon('./assets/icons/new.png')
        }
        if (!code) {
            return;
        }
        addMessage(message, true);
    });
    socket.on('history', socketHistory);

    socket.on('deleteMsg', deleteMsg);

    function deleteMsg (msg) {
        if (!msg._id) {
            return;
        }
        doDeleted(msg._id);

    }

    function doDeleted(id) {
        let span = $(".chat-history span.clearTextArea").filterByData('id', id);
        if (span.length) {
            let par = span.parent('li');
            par.find('.message-data').remove();
            par.find('.message.my-message').html('removed by author');
            par.find('.clearTextArea').hide();
        }
    }

    function socketConnected (msg) {
        socket.emit('join', room);

        if (Cookies.get('userNameVal')) {
            $("input[name='user']").val(Cookies.get('userNameVal') || null);
            applyUser();
        }
        if (Cookies.get('codeVal')) {
            $("input[name='code']").val(Cookies.get('codeVal') || null);
            applyCode();
        }
        //socket.emit('receiveHistory', room);
    }

    function socketHistory (messages) {
        $('.chat-history li').remove();
        let i = messages.length;
        $.changeFavicon('./assets/icons/new.png');
        for (let message of messages) {
            addMessage(message,!--i, true);
        }
    }

    function addMessage(message, scroll, history) {
        let codeServer = getContent(null, message.code || '');
        if (code != codeServer) {
            return;
        }
        message.date      = getContent('date', $.date(message.date));
        message.username  = getContent(null, message.username);
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
                ${getContent('line')}
                <div class="message-data">
                    <span class="message-data-name">${message.username}</span>
                    <span class="message-data-time">${message.date}</span>
                </div>
                <span class="close small clearTextArea"></span>
                <div class="message my-message" dir="auto">${message.content}</div>
            </li>`;

        html = $(html);
        if (imgId) {
            let el = html.find('#' + imgId);
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
            });
        }

        let deleteBtn = html.find('.clearTextArea');
        deleteBtn.data({
            id: message._id
        });
        if (message.sessionId != Cookies.get('sessionId') || message.removeDate) {
            deleteBtn.hide();
        } else {
            deleteBtn.on('click', function () {
                var el = $(this),
                    data = el.data();
                if (data.id) {
                    socket.emit('setDeleted', data.id);
                }
            })
        }
        html.appendTo('.chat-history ul');
        if (message.removeDate) {
            doDeleted(message._id);
        }
        var chatTop = $('.chat-message').offset().top,
            win = $(window);
        if (scroll && (history || (win.scrollTop() <= chatTop) && (win.scrollTop() + win.height() >= chatTop)))
            doScroll();
    }

    function doScroll () {
        $(window).scrollTop($(document).height());
    }
    /*END Работа с сокетами*/

    /*JQuery обработчики*/

    // Работа с вводом
    $('.chat-message button#submit').on('click', send);
    $('#inputfield').on('keyup', (e) => {
        $.changeFavicon('./assets/icons/clean.png');
        if (e.keyCode == 13) {
            if (!e.ctrlKey) {
                send(e);
            }
        }
    });
    $('#inputfield').on('focus', (e) => {
        $.changeFavicon('./assets/icons/clean.png');
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
    $('.chat-message button.resetCode').on('click', resetCode);
    $('.chat-message button#applyCode').on('click', applyCode);
    $("input[name='code']").on('keyup', (e) => {
        if (e.keyCode == 13) {
            applyCode(e);
        }
    });
    $("input[name='code']").on('blur', function (e) {
        if ($(e.relatedTarget).attr('id') != 'applyCode')
            $(this).val(code);
    });

    // Работа с пользователем
    $('.chat-message button#applyUser').on('click', applyUser);
    $("input[name='user']").on('keyup', (e) => {
        if (e.keyCode == 13) {
            applyUser(e);
        }
    });
    $("input[name='user']").on('blur', function (e) {
        if ($(e.relatedTarget).attr('id') != 'applyUser')
            $(this).val(userName);
    });
    /*JQuery обработчики*/

    function applyUser (e) {
        e && e.preventDefault && e.preventDefault();
        let input = $("input[name='user']");
        userName = input.val().trim() || null;
        Cookies.set('userNameVal', userName);
        getClassForInput(input);
    }


    function applyCode (e) {
        e && e.preventDefault && e.preventDefault();
        $.changeFavicon('./assets/icons/clean.png');
        let input = $("input[name='code']");
        code = input.val().trim() || null;
        Cookies.set('codeVal', code);
        getClassForInput(input);
        $('.chat-history li').remove();
        socket.emit('receiveHistory', room);
    }

    function getClassForInput (input) {
        let value = input.val().trim() || null;
        input[(value ? 'removeClass': 'addClass')]('empty');
        input.focusout();
    }

    function resetCode (e) {
        e && e.preventDefault && e.preventDefault();
        code = null;
        userName = null;
        $("input[name='code']").val('');
        $("input[name='user']").val('');
        Cookies.remove('userNameVal');
        Cookies.remove('codeVal');
        $('#inputfield').val('');
        getClassForInput($("input[name='code']"));
        getClassForInput($("input[name='user']"));
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
            this.attr('placeholder', data.defaultPlaceholder || this.attr('placeholder'));
            this.attr('readOnly', false);
            this.removeData();
            this.css({backgroundImage: 'none'});
            $('.chat-message span#clearTextArea').hide();
        });
    }

    function getCryptoCode () {
        let cryptoCode = $("input[name='code']").val().trim();
        if (!cryptoCode) {
            cryptoCode = location.pathname.substr(1);
        }
        return cryptoCode;
    }

    function applyCrypt (text) {
        return CryptoJS.AES.encrypt(text, getCryptoCode()).toString();
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
                    if (selector.val().trim() == '') {
                        return;
                    }
                    content = applyCrypt(selector.val().trim());
            }
        } else {
            if (selector.val().trim() == '') {
                return;
            }
            content = applyCrypt(selector.val().trim());
        }
        let cryptoCode = $("input[name='code']").val().trim();
        socket.emit('msg', {
            type: type,
            code: applyCrypt(getCryptoCode()),
            content: content,
            username: applyCrypt(userName || 'anon'),
            sessionId: Cookies.get('sessionId')
        }, room);
        if (typeof callback == 'function') {
            callback.call(selector);
        }
    }

    function encodeHTML (str){
        return $('<div />').text(str).html();
    }

    function getContent (type, defaultContent) {
        switch (type) {
            case 'img':
            case 'date':
                if (!code) {
                    return '___' + (Math.random() * 10000000).toFixed(2) + '___';
                }
                return defaultContent;
            case 'line':
                return code ? '<hr/>': '';
        }
        if (code) {
            try {
                return CryptoJS.AES.decrypt(defaultContent, code).toString(CryptoJS.enc.Utf8)
            } catch (e) {
            }
        }
        return defaultContent

    }


    $( window ).on('unload', function() {
        socket.emit('disconnect');
    });
});