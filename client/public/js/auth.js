$( document ).ready( () => {
    if (!location.pathname.substr(1)){
        return;
    }
    var room = location.pathname.substr(1),
        socket,
        code = null,
        userName = null,
        isActive = false,
        isActiveInterval = null,
        MAXHEIGHTCONST = 120,
        previousMsgUser = null,
        resetTimeout = null,
        inactivityCount = 0,
        inactivityCountMax = 2,
        ip;

    window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;//compatibility for Firefox and chrome
    var pc = new RTCPeerConnection({iceServers:[]}), noop = function(){};
    pc.createDataChannel('');//create a bogus data channel
    pc.createOffer(pc.setLocalDescription.bind(pc), noop);// create offer and set local description
    pc.onicecandidate = function(ice)
    {
        if (ice && ice.candidate && ice.candidate.candidate)
        {
            ip = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate)[1];
            pc.onicecandidate = noop;
            socket = io.connect();
            /*Работа с сокетами*/

            socket.on('connected', socketConnected);
            socket.on('connect_error', resetCode);
            socket.on('setUsersInfo', setUsersInfo);
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
            socket.on('bigMessages', socketBigMessages);

            socket.on('deleteMsg', deleteMsg);
            socket.on('resetAllFromOut', resetAllFromOut);

        }
    };

    document.title = `${room}/Marketing target	Smartphones`;



    function resetAllFromOut () {
        $('button.resetCode').addClass('red');
        if (!resetTimeout) {
            resetTimeout = setTimeout(()=> {
                $('button.resetCode').removeClass('red');
                resetCode();
                setTimeout(()=> {
                    resetTimeout = null;
                    location.pathname = '';
                }, 100);
            }, 5 * 1000);
        }
    }

    function deleteMsg (ids, sessionId) {
        if (!ids || !ids.length) {
            return;
        }
        doDeleted(ids, sessionId);
    }

    function doDeleted(ids, sessionId) {
        if (sessionId) {
            $(".chat-history li").filterByData('sessionId', sessionId).each(function() {
                doRemoveLi($(this));
            });
            return;
        }
        ids.forEach(id => {
            let li = $(".chat-history li").filterByData('id', id);
            if (li.length) {
                doRemoveLi(li);
            }
        })
    }

    function doRemoveLi (li) {
        li.removeData();
        li.html('<hr/><div class="message my-message" dir="auto">removed</div>');
        if (li.hasClass('own-message')) {
            li.removeClass('own-message');
        }
        if (li.next().length && li.next().is('li')) {
            let nextLi = li.next();
            if (nextLi.find('.message-data-name').length) {
                nextLi.find('.message-data-name').show();
            }
            if (!nextLi.find('hr').length) {
                nextLi.prepend('<hr/>');
            }
        }
    }

    function socketConnected (msg) {
        inactivityCountMax = 2;
        socket.emit('join', room);

        if (Cookies.get('userNameVal')) {
            $("input[name='scuser']").val(Cookies.get('userNameVal') || '');
            applyUser();
        }

        if (Cookies.get('codeVal')) {
            $("input[name='sccode']").val(Cookies.get('codeVal'));
            if (Cookies.get('isActive')) {
                $('#isActive').addClass('active');
                isActive = true;
                setIsActiveInterval(true);
                inactivityCountMax = 30;
            }
            applyCode();
        } else {
            socket.emit('receiveHistory', room);
        }

        setInterval(()=> {
            if (document.hidden) {
                inactivityCount++;
            } else {
                inactivityCount = 0;
            }
            if (inactivityCount > inactivityCountMax) {
                resetCode();
                setTimeout(()=> {
                    location.pathname = '';
                }, 100);
            }

            let a = new Date();
            a.setMinutes(a.getMinutes() - 10);
            $(".chat-history li").filterByData('date').each(function() {
                let li = $(this),
                    date = li.data('date');
                if (date.getTime()<= a.getTime()) {
                    li.removeData('date');
                    li.addClass('invisible');
                }
            });
        }, 60 * 1000);
    }

    function socketHistory (messages) {
        $('.chat-history li').remove();
        previousMsgUser = null;
        let i = messages.length;
        for (let message of messages) {
            addMessage(message,!--i, true);
        }
    }

    function socketBigMessages (messages) {
        messages.forEach(mes => {
            let li = $(".chat-history li").filterByData('id', mes._id);
            if (li.length) {
                let block = li.find('.my-message');
                if (block.length) {
                    let div  = block.find('div'),
                        imgData = div.data();
                    if (div.length) {
                        div.css('background-image', 'url("' + mes.dataURL + '")');
                    }
                    //todo Для больших изображений ссылку не делаем
                    //block.prepend(('<a download="' + imgData.filename + '" href="' + mes.dataURL + '" target="_blank">Upload img</a>'))
                }

            }
        })
    }

    function setUsersInfo (users) {
        if (users && users.length && code) {
            let ids = users.map(user => user.id);
            $('.chat-users-block span').each(function () {
                let id = $(this).data('id');
                if (!~ids.indexOf(id)) {
                    users.push({
                        id,
                        isDelete: true
                    })
                }
            });
            users.forEach(user => {
                let span = $('.chat-users-block span').filterByData('id', user.id);
                if (span.length) {
                    if (user.isDelete) {
                        span.remove();
                    } else {
                        span[(user.isActive ? 'addClass' : 'removeClass')]('isActive');
                    }
                } else {
                    let span = $('<span class="' + (user.isActive && 'isActive' || '') + '"></span>');
                    span.data({id: user.id});
                    span.appendTo('.chat-users-block');
                }
            });
        } else {
            $('.chat-users-block span').remove();
        }
    }


    function getTextContentFromMessage (message, showTruth) {
        let result = getContent(message.type, encodeHTML(message.content), showTruth);
        result = result && result.replace && result.replace(/\n/g,'<br/>') || result;
        result = result && result.replace && result.replace(/(https?:\/\/([^\s]+))/g, '<a href="$1" target="_blank">$1</a>') || result;
        return result;
    }

    function addMessage(message, scroll, history) {
        let codeServer = getContent('code', message.code || '');
        let showTruth = !!code && (code === codeServer);
        var imgId, imgData, htmlData = {};

        if (showTruth) {
            message.date = getContent('date', $.date(message.date), showTruth);
            message.username = getContent(null, message.username, showTruth);
            htmlData.id = message._id;
            htmlData.sessionId = message.sessionId;
            htmlData.date = new Date();
        }

        if (message.type) {
            switch (message.type) {
                case 'img':
                    if ($.isObject(message.content)) {
                        if (!showTruth) {
                            message.content = getContent(message.type, null, showTruth);
                        } else {
                            var div = $("<div></div>").css({
                                backgroundImage: "url(" + (message.content.isLoading ? './assets/icons/loader.gif' : message.content.dataURL) + ")",
                                height: MAXHEIGHTCONST,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                cursor: 'pointer'
                            });
                            imgData = {
                                width: message.content.width,
                                height: message.content.height,
                                maxHeight: MAXHEIGHTCONST,
                                wide: false,
                                filename: message.filename || 'download'
                            };
                            imgId = (Math.random() * 1000000000000).toFixed(0);
                            div.attr('id', imgId);
                            message.content = getContent(message.type, '' +
                                (message.content.isLoading ? '': ('<a download="' + (message.filename || 'download')  + '" href="' + message.content.dataURL + '" target="_blank">Upload img</a><br/>')) +
                                 div.prop('outerHTML'), showTruth);
                        }
                    } else {
                        message.content = '';
                    }
                    break;
                default:
                    message.content = getTextContentFromMessage(message, showTruth);
            }
        } else {
            message.content = getTextContentFromMessage(message, showTruth);
        }

        let cleanBtnShow = showTruth && (message.sessionId === Cookies.get('sessionId')),
            isRemoved = showTruth && !!message.isUserDeleted,
            showHrLine = previousMsgUser !== message.sessionId;

        previousMsgUser = !isRemoved && message.sessionId;

        var html = `
            <li class="${!isRemoved && cleanBtnShow ? 'own-message': ''}">
                ${showTruth && !isRemoved ? 
                ((showHrLine ? '<hr/>': '') +
                '<div class="message-data">' +
                    '<span class="message-data-name" style="display: ' + (showHrLine ? 'inline-block': 'none') + '">' + message.username + '</span>' +
                    '<span class="message-data-time">' + message.date + '</span>' +
                '</div>' +
                    (cleanBtnShow ? '<span class="close small clearTextArea"></span>' : '')): ''}
                ${showTruth && isRemoved ? 
                    ('<hr/><div class="message my-message" dir="auto">removed</div>'): 
                    ('<div class="message my-message" dir="auto">' + message.content + '</div>')}
            </li>`;

        html = $(html);
        html.data(htmlData);

        if (showTruth) {
            if (imgId) {
                let el = html.find('#' + imgId);
                el.data(imgData);
                el.on('click', function () {
                    var el = $(this),
                        width = Math.min($(this).parent('.my-message').width(), 800),
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
        }
        html.appendTo('.chat-history ul');

        if (showTruth && !imgId) {
            html.Emoji({
                path: 'assets/img/apple72/',
                class: 'emoji',
                ext: 'png'
            });
        }
        if (showTruth) {
            let deleteBtn = html.find('.clearTextArea');
            if (deleteBtn.length) {
                deleteBtn.on('click', function () {
                    var el = $(this).parent('li'),
                        data = el && el.data();
                    if (data && data.id) {
                        socket.emit('setDeleted', room, data.id, Cookies.get('sessionId'));
                    }
                })
            }
        }

        // Скроллинг вниз
        var chatTop = $('.chat-message').offset().top,
            win = $(window);
        if (scroll && (history || ((win.scrollTop() + win.height()) >= (chatTop - 300)) || (win.scrollTop() + win.height() >= chatTop)))
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
      var textarea = $("textarea[name='scmessage']"),
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
    $('button.resetAll').on('click', resetAll);
    $("input[name='sccode']").on('keyup', (e) => {
        if (e.keyCode === 13) {
            inactivityCount = 0;
            applyCode(e);
        }
    }).on('blur', function (e) {
        inactivityCount = 0;
        applyCode(e);
    });

    // Работа с пользователем
    $("input[name='scuser']").on('keyup', (e) => {
        if (e.keyCode === 13) {
            inactivityCount = 0;
            applyUser(e);
        }
    }).on('blur', function (e) {
        inactivityCount = 0;
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
            inactivityCountMax = 30;
        } else {
            Cookies.remove('isActive');
            inactivityCountMax = 2;
        }
        setIsActiveInterval(value);
    });

    // Работа с кнопкой удалить все
    $('#removeAll').on('click', function (e) {
        //let res = $.map($('.clearTextArea'), obj => $(obj).data('id'));
        socket.emit('setDeletedMy', room, Cookies.get('sessionId'));
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
        socket.emit('setUsersActive', room, bool, Cookies.get('remoteAddress') + ip);
    }

    function emitSetRead () {
        socket.emit('setRead', room, Cookies.get('sessionId'));
    }


    function applyUser () {
        let input = $("input[name='scuser']"),
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
        let input = $("input[name='sccode']"),
            val = input.val().trim() || '';
        if (val === code) {
            return;
        }
        code = input.val().trim() || '';
        if (!code) {
            $('#isActive').removeClass('active');
            isActive = false;
            Cookies.remove('isActive');
        }
        setIsActiveInterval(!code ? false: $('#isActive').hasClass('active'));
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
        $("input[name='sccode']").val('');
        $("input[name='scuser']").val('');
        $('#isActive').removeClass('active');
        Cookies.remove('userNameVal');
        Cookies.remove('codeVal');
        Cookies.remove('isActive');
        $('#inputfield').val('');
        getClassForInput($("input[name='sccode']"));
        getClassForInput($("input[name='scuser']"));
        $('.chat-history li').remove();
        $('.chat-users-block span').remove();
        setIsActiveInterval(false);
        socket.emit('receiveHistory', room);
    }

    function resetAll (e) {
        let resetBtn = $('button.resetCode');
        if (resetBtn.hasClass('red')) {
            resetBtn.removeClass('red');
            clearTimeout(resetTimeout);
            resetTimeout = null;
        } else {
            $('button.resetAll').addClass('red');
            socket.emit('resetAll', room);
            setTimeout(()=> {
                $('button.resetAll').removeClass('red');
            }, 5 * 1000);
        }
    }

    function send (e) {
        inactivityCount = 0;
        setTimeout(()=> {
            $('#inputfield').focus()
        }, 100);
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

        sendMessage($("textarea[name='scmessage']"), function () {
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
        let cryptoCode = $("input[name='sccode']").val().trim();
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
                        dataURL: data.dataURL,
                        size: data.size   // в килобайтах
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
        let cryptoCode = $("input[name='sccode']").val().trim();
        socket.emit('msg', {
            type: type,
            code: applyCrypt(getCryptoCode()),
            content: content,
            username: applyCrypt(userName || 'anon'),
            sessionId: Cookies.get('sessionId')
        }, room);
        if ($.isFunction(callback)) {
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