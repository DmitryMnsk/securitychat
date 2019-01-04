$( document ).ready( () => {
    if (!location.pathname.substr(1)){
        return;
    }
    var room = location.pathname.substr(1),
        socket = io.connect(),
        code = null,
        userName = null,
        isActive = false,
        isActiveInterval = null,
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

    function deleteMsg (ids) {
        if (!ids || !ids.length) {
            return;
        }
        doDeleted(ids);

    }

    function doDeleted(ids) {
        ids.forEach(id => {
            let span = $(".chat-history span.clearTextArea").filterByData('id', id);
            if (span.length) {
                let par = span.parent('li');
                par.find('.message-data').remove();
                par.find('.message.my-message').html('removed by author');
                par.find('.clearTextArea').hide();
            }
        })
    }

    function socketConnected (msg) {
        socket.emit('join', room);

        if (Cookies.get('userNameVal')) {
            $("input[name='user']").val(Cookies.get('userNameVal') || '');
            applyUser();
        }

        if (Cookies.get('codeVal')) {
            $("input[name='code']").val(Cookies.get('codeVal'));
            if (Cookies.get('isActive')) {
                $('#isActive').addClass('active');
                isActive = true;
                setIsActiveInterval(true);
            }
            applyCode();
        } else {
            socket.emit('receiveHistory', room);
        }
    }

    function socketHistory (messages) {
        $('.chat-history li').remove();
        let i = messages.length;
        for (let message of messages) {
            addMessage(message,!--i, true);
        }
    }

    function addMessage(message, scroll, history) {
        let codeServer = getContent('code', message.code || '');
        let showTruth = !!code && (code === codeServer);
        message.date      = getContent('date', $.date(message.date), showTruth);
        message.username  = getContent(null, message.username, showTruth);
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
                            '</a><br/>' + div.prop('outerHTML'), showTruth);
                    } else {
                        message.content = '';
                    }
                    break;
                default:
                    message.content = getContent(message.type, encodeHTML(message.content), showTruth);
            }
        } else {
            message.content = getContent(message.type, encodeHTML(message.content), showTruth);
        }
        message.content = message.content && message.content.replace && message.content.replace(/\n/g,'<br/>') || message.content;
        let cleanCondition = showTruth && (message.sessionId === Cookies.get('sessionId'));
        var html = `
            <li>
                ${showTruth ? 
                ('<hr/>' +
                '<div class="message-data">' +
                    '<span class="message-data-name">' + message.username + '</span>' +
                    '<span class="message-data-time">' + message.date + '</span>' +
                '</div>' +
                    (cleanCondition ? '<span class="close small clearTextArea"></span>' : '')): ''} 
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
        if (deleteBtn.length) {
            deleteBtn.data({
                id: message._id
            });
            deleteBtn.on('click', function () {
                var el = $(this),
                    data = el.data();
                if (data.id) {
                    socket.emit('setDeleted', [data.id]);
                }
            })
        }
        html.appendTo('.chat-history ul');
        if (showTruth && message.isUserDeleted) {
            doDeleted([message._id]);
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
    $('button#submit').on('click', send);
    $('#inputfield').keydown(function (e) {
        if (e.keyCode === 13 && e.ctrlKey) {
            if (this.rows < 4) {
                this.rows++;
            }
            $(this).val(function(i,val){
                return val + "\n";
            });
        }
    }).keypress(function(e){
        $.changeFavicon('./assets/icons/clean.png');
        if (e.keyCode === 13 && !e.ctrlKey) {
            send(e);
            return false;
        }
    }).on('focus', (e) => {
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
        textarea.get(0).rows = data.defaultRows || 1;
            $(this).hide();
        });

    // Работа с кодом
    $('button.resetCode').on('click', resetCode);
    $("input[name='code']").on('keyup', (e) => {
        if (e.keyCode === 13) {
            applyCode(e);
        }
    }).on('blur', function (e) {
        applyCode(e);
    });

    // Работа с пользователем
    $("input[name='user']").on('keyup', (e) => {
        if (e.keyCode === 13) {
            applyUser(e);
        }
    }).on('blur', function (e) {
        applyUser(e);
    });

    // Работы с кнопкой активности
    $('#isActive').on('click', function (e) {
        if (!code) {
            return;
        }
        let btn = $(this),
            value = !btn.hasClass('active');
        btn[(value ? 'addClass': 'removeClass')]('active');
        isActive = value;
        if (value) {
            Cookies.set('isActive', true);
        } else {
            Cookies.remove('isActive');
        }
        setIsActiveInterval(value);
    });

    // Работа с кнопкой удалить все
    $('#removeAll').on('click', function (e) {
        let res = $.map($('.clearTextArea'), obj => $(obj).data('id'));
        socket.emit('setDeleted', res);
    });

    /*JQuery обработчики*/

    function setIsActiveInterval (bool) {
        if (!bool) {
            clearInterval(isActiveInterval);
        } else {
            isActiveInterval = setInterval(() => {
                emitSetRead();
            }, 30 * 1000);
            emitSetRead();
        }
    }

    function emitSetRead () {
        socket.emit('setRead', room, Cookies.get('sessionId'));
    }


    function applyUser () {
        let input = $("input[name='user']"),
            val = input.val().trim() || '';
        if (val === userName) {
            return;
        }
        userName = val;
        Cookies.set('userNameVal', userName);
        getClassForInput(input);
    }

    function applyCode () {
        $.changeFavicon('./assets/icons/clean.png');
        let input = $("input[name='code']"),
            val = input.val().trim() || '';
        if (val === code) {
            return;
        }
        code = input.val().trim() || '';
        if (!code) {
            $('#isActive').removeClass('active');
            isActive = false;
            Cookies.remove('isActive');
            setIsActiveInterval(false);
        }
        Cookies.set('codeVal', code);
        getClassForInput(input);
        $('.chat-history li').remove();
        socket.emit('receiveHistory', room);
    }

    function getClassForInput (input) {
        let value = input.val().trim() || '';
        input[(value ? 'removeClass': 'addClass')]('empty');
        input.focusout();
    }

    function resetCode (e) {
        code = null;
        userName = null;
        isActive = false;
        $("input[name='code']").val('');
        $("input[name='user']").val('');
        $('#isActive').removeClass('active');
        Cookies.remove('userNameVal');
        Cookies.remove('codeVal');
        Cookies.remove('isActive');
        $('#inputfield').val('');
        getClassForInput($("input[name='code']"));
        getClassForInput($("input[name='user']"));
        $('.chat-history li').remove();
        socket.emit('receiveHistory', room);
    }

    function send (e) {
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
            this.get(0).rows = data.defaultRows || 1;
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
                    if (selector.val().trim() === '') {
                        return;
                    }
                    content = applyCrypt(selector.val().trim());
            }
        } else {
            if (selector.val().trim() === '') {
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

    function getContent (type, defaultContent, showTruth) {
        switch (type) {
            case 'code':
                try {
                    return CryptoJS.AES.decrypt(defaultContent, code).toString(CryptoJS.enc.Utf8)
                } catch (e) {
                }
                break;
            case 'img':
            case 'date':
                if (!showTruth) {
                    return '___' + (Math.random() * 10000000).toFixed(2) + '___';
                }
                return defaultContent;
        }
        if (showTruth) {
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