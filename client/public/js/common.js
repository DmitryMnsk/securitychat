// Created by STRd6
// MIT License
// jquery.paste_image_reader.js
(function($) {
    var defaults;
    $.event.fix = (function(originalFix) {
        return function(event) {
            event = originalFix.apply(this, arguments);
            if (event.type.indexOf("copy") === 0 || event.type.indexOf("paste") === 0) {
                event.clipboardData = event.originalEvent.clipboardData;
            }
            return event;
        };
    })($.event.fix);
    defaults = {
        callback: $.noop,
        matchType: /image.*/
    };
    $.fn.filterByData = function( type, value ) {
        return this.filter( function() {
            var $this = $( this );

            return value != null ?
                $this.data( type ) === value :
                $this.data( type ) != null;
        });
    };
    $.date = function(dateObject) {
        var d = new Date(dateObject);
        var day = less10(d.getDate());
        var month = less10(d.getMonth() + 1);
        var year = d.getFullYear().toString().substring(2, 4);

        var hours = less10(d.getHours());
        var mins = less10(d.getMinutes());
        var secs = less10(d.getSeconds());

        return `${hours}:${mins}:${secs} ${day}.${month}.${year}`;
    };
    document.head || (document.head = document.getElementsByTagName('head')[0]);
    $.changeFavicon = function (src){
        var link = document.createElement('link');
        var oldLink = document.getElementById('dynamic-favicon');
        link.id = 'dynamic-favicon';
        link.rel = 'shortcut icon';
        link.href = src;
        if (oldLink){
            document.head.removeChild(oldLink);
        }
        document.head.appendChild(link);
    };
    function less10 (val) {
        if (val < 10) {
            return '0' + val;
        }
        return val;
    }
    return ($.fn.pasteImageReader = function(options) {
        if (typeof options === "function") {
            options = {
                callback: options
            };
        }
        options = $.extend({}, defaults, options);
        return $(this).bind("paste", function(event) {
            var clipboardData, found, element;
            found = false;
            element = this;
            clipboardData = event.clipboardData;
            return Array.prototype.forEach.call(clipboardData.types, function(type, i) {
                var file, reader;
                if (found) {
                    return;
                }
                if (
                    type.match(options.matchType) ||
                    clipboardData.items[i].type.match(options.matchType)
                ) {
                    file = clipboardData.items[i].getAsFile();

                    var img = new Image();
                    img.onload = function () {
                        reader = new FileReader();
                        reader.onload = function(evt) {
                            return options.callback.call(element, {
                                dataURL: evt.target.result,
                                img: img,
                                event: evt,
                                file: file,
                                name: file.name
                            }, true);
                        };
                        reader.readAsDataURL(file);
                    };
                    img.src = _URL.createObjectURL(file);
                    return (found = true);
                }
            });
        });
    });
})(jQuery);

var dataURL, filename,
    _URL = window.URL || window.webkitURL;
$("#inputfield").pasteImageReader(insertImgInBlock.bind(this, $("#inputfield")));

function insertImgInBlock (element, results, single) {
    $.changeFavicon('./assets/icons/clean.png');
    filename = results.name;
    dataURL = results.dataURL;
    var img = results.img,
        w = img.width,
        h = img.height,
        css = {
        backgroundImage: "url(" + dataURL + ")",
        width: single ? '100%': 120*w/h,
        height: 120,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat'
    }, data = {
        width: w,
        height: h,
        dataURL: dataURL,
        filename: filename,
        type: 'img',
        defaultHeight: element.data('defaultHeight') || element.height(),
        defaultPlaceholder: element.data('defaultPlaceholder') || element.attr('placeholder')
    };
    if (single) {
        element.val('');
        element.attr('readOnly', true);
        element.attr('placeholder', '');
        $('.chat-message #clearTextArea').show();
    } else {
        css.position = 'relative';
        var button = $('<span class="close"></span>');
        button.on('click', function () {
           element.remove();
        });
        element.append(button);
    }
    return element
        .css(css)
        .data(data);
}

function previewFile () {
    var fileField = $('input[type=file]').get(0);
    if (fileField.files.length) {
        var files = fileField.files,
            file;
        if (fileField.files.length == 1) {
            file = files[0];
            loadOneFile(file, function(evt) {
                var img = new Image();
                img.onload = function () {
                    insertImgInBlock( $("#inputfield"), {
                        dataURL: evt.target.result,
                        event: evt,
                        img: img,
                        file: file,
                        name: file.name
                    }, true);
                };
                img.src = _URL.createObjectURL(file);
            });
        } else {
            for (let i = 0; i < fileField.files.length; i++) {
                file = files.item(i);
                var span = $("<div style='display: inline-block'></div>");
                var as = function (f, s, fn) {
                    loadOneFile(f, function (evt) {
                        var img = new Image();
                        img.onload = function () {
                            $('#multifiles').append(fn(s, {
                                dataURL: evt.target.result,
                                event: evt,
                                img: img,
                                file: f,
                                name: f.name
                            }));
                        };
                        img.src = _URL.createObjectURL(f);
                    });
                }(file, span, insertImgInBlock);
            }
            $('#inputfield').hide();
            $('#multifiles').show();
        }
        fileField.value = '';
    }
}

function loadOneFile (file, onloadFunc) {
    var reader  = new FileReader();
    reader.onload = onloadFunc || function () {};
    reader.readAsDataURL(file);
}