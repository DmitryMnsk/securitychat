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
    $.isObject = function (val) {
        return val.toString() === '[object Object]';
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
        let oldLink = document.getElementById('dynamic-favicon');
        let newIconName = src.substring(src.lastIndexOf('/') + 1),
            oldHref = oldLink.href,
            oldIconName = oldHref.substring(oldHref.lastIndexOf('/') + 1);
        if (newIconName === oldIconName) {
            return
        }
        let link = document.createElement('link');
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
        size: Number.isInteger(results.file.size) && Math.ceil(results.file.size/1024),
        defaultHeight: element.data('defaultHeight') || element.height(),
        defaultPlaceholder: element.data('defaultPlaceholder') || element.attr('placeholder'),
        defaultRows: element.data('defaultRows') || element.attr('rows'),
        };
    if (single) {
        element.val('');
        element.attr('readOnly', true);
        element.attr('placeholder', '');
        $('.chat-message #clearTextArea').show();
    } else {
        css.position = 'relative';
        var button = $('<span class="close fat-close"></span>');
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
        $('#multifiles').html('');
        $('#multifiles').hide();
        $('#inputfield').hide();
        $('#clearTextArea').hide();
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
            $('#inputfield').show();
            $('#clearTextArea').show();
        } else {
            for (let i = 0; i < fileField.files.length; i++) {
                file = files.item(i);
                var span = $("<div style='display: inline-block'></div>");
                function multiload (f, s, fn) {
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
                }
                multiload(file, span, insertImgInBlock);
            }
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

$( document ).ready( () => {
    $('input[type=file]').on('change', previewFile);
});