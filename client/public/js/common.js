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
    filename = results.name;
    dataURL = results.dataURL;
    $data.text(dataURL);
    $size.val(results.file.size);
    $type.val(results.file.type);
    var img = results.img;
    var w = img.width;
    var h = img.height;
    $width.val(w);
    $height.val(h);
    var css = {
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

var $data, $size, $type, $width, $height;
$(function() {
    $data = $(".data");
    $size = $(".size");
    $type = $(".type");
    $width = $("#width");
    $height = $("#height");
   /* $("#inputfield").on("click", function() {
        var $this = $(this);
        var bi = $this.css("background-image");
        if (bi != "none") {
            $data.text(bi.substr(4, bi.length - 6));
        }

        $(".active").removeClass("active");
        $this.addClass("active");

        $this.toggleClass("contain");

        $width.val($this.data("width"));
        $height.val($this.data("height"));
        if ($this.hasClass("contain")) {
            $this.css({
                width: $this.data("width"),
                height: $this.data("height"),
                "z-index": "10"
            });
        } else {
            $this.css({ width: "", height: "", "z-index": "" });
        }
    });*/
});

function copy(text) {
    var t = document.getElementById("base64");
    t.select();
    try {
        var successful = document.execCommand("copy");
        var msg = successful ? "successfully" : "unsuccessfully";
        alert("Base64 data coppied " + msg + " to clipboard");
    } catch (err) {
        alert("Unable to copy text");
    }
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
                        img.src = _URL.createObjectURL(file);



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