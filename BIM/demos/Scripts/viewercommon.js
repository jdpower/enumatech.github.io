var HPI = Math.PI * 0.5;

$(document).ready(function () {

    // detect browser is in focus
    // see http://stackoverflow.com/questions/1060008/is-there-a-way-to-detect-if-a-browser-window-is-not-currently-active
    (function () {
        var hidden = "hidden";

        // Standards:
        if (hidden in document)
            document.addEventListener("visibilitychange", onchange);
        else if ((hidden = "mozHidden") in document)
            document.addEventListener("mozvisibilitychange", onchange);
        else if ((hidden = "webkitHidden") in document)
            document.addEventListener("webkitvisibilitychange", onchange);
        else if ((hidden = "msHidden") in document)
            document.addEventListener("msvisibilitychange", onchange);
            // IE 9 and lower:
        else if ("onfocusin" in document)
            document.onfocusin = document.onfocusout = onchange;
            // All others:
        else
            window.onpageshow = window.onpagehide
            = window.onfocus = window.onblur = onchange;

        function onchange(evt) {
            var v = "visible", h = "hidden",
                evtMap = {
                    focus: v, focusin: v, pageshow: v, blur: h, focusout: h, pagehide: h
                };

            evt = evt || window.event;
            if (evt.type in evtMap)
                document.body.className = evtMap[evt.type];
            else
                document.body.className = this[hidden] ? "hidden" : "visible";
        }

        // set the initial state (but only if browser supports the Page Visibility API)
        if (document[hidden] !== undefined)
            onchange({ type: document[hidden] ? "blur" : "focus" });
    })();
});

function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
}

function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

var EPSILON = 0.00001;
function feq(a, b) {
    return Math.abs(a - b) < EPSILON;
}

function feqz(a) {
    return Math.abs(a) < EPSILON;
}

function gte(a, b) {
    return a > b || feq(a, b);
}

function lte(a, b) {
    return a < b || feq(a, b);
}

jQuery.fn.exists = function () {
    return this.length !== 0;
};

function getTreeNodeByKey(tree, uuid) {
    if (!tree) {
        console.warn('[WARNING] tree defined');
        return null;
    }
    if (!uuid) {
        console.warn('[WARNING] tree node defined');
        return null;
    }
    var node = tree.getNodeByKey(uuid);
    if (!node) {
        console.warn('[WARNING] failed to find tree node with key ', uuid);
    }
    return node;
}

// url can be text or link
function addDocumentLink(url) {
    if (!url) return '';
    if (url.lastIndexOf('http') == -1) {
        return url;
    }
    if (url.lastIndexOf('/') == -1) {
        return url;
    }
    // possible url
    var filename = url.split('/').pop();
    if (filename == '') {
        return '<a href="' + url + '" target="_blank">Open</a>';
    }

    var extension = url.slice((Math.max(0, url.lastIndexOf(".")) || Infinity) + 1);

    switch (extension) {
        case 'doc':
        case 'docx':
            return '<div class="tmLink" onclick="showDocument(\'' + url + '\');">' + filename + '</div>';
        default:
            return '<a href="' + url + '" target="_blank">' + filename + '</a>';
    }
}

function showDocument(url, title) {
    //console.log('open doc', url);

    var filename = url.substr(url.lastIndexOf('/') + 1);

    $.jsPanel({
        contentSize: { width: 1000, height: 600 },
        theme: "grey",
        headerTitle: filename,
        content: '<embed style="width:100%;height:100%" src="' + encodeURI(url) + '"/>',
        // TODO: determine if google doc viewer can handle this file    
        xcontentIframe: {
            src: ('https://docs.google.com/gview?url=' + escape(url) + '&embedded=true'),
            style: { "display": "none", "border": "10px solid transparent" },
            width: '100%',
            height: '100%'
        },
        callback: function (panel) {
            $("iframe", panel).load(function (e) {
                $(e.target).fadeIn(500);
            });
        }
    });
}

function getRGB(color) {

    if (typeof (color) === 'object') { //THREE.Color
        return 'rgb(' + color.r * 255 + ', ' + color.g * 255 + ', ' + color.b * 255 + ')';
    }

    if (typeof (color) === 'string' && color.indexOf('rgb') == 0) {
        return color;
    }

    console.error('[ERROR] unsupported color', color);
    return color;
}

// get r,g,b components from a string like 'rgb(100, 255, 23)'
function getRGBValues(str) {
    if (typeof (str) === 'object') { //THREE.Color
        return [str.r * 255, str.g * 255, str.b * 255];
    }

    if (typeof (str) === 'string' && str.indexOf('rgb') == 0) {
        var vals = str.substring(str.indexOf('(') + 1, str.length - 1).split(', ');
        return [parseInt(vals[0]), parseInt(vals[1]), parseInt(vals[2])];
    }

    console.error('[ERROR] unsupported color', str);
    return [0, 0, 0];
}

// luminance factors per color component
var Lfactors = [0.2126, 0.7152, 0.0722];

// get suitable text color for given background color
function getForeColor(srgb) {
    var rgb = getRGBValues(srgb);
    // luminance
    var L = 0;
    for (var i = 0; i < 3; i++) {
        if (isNaN(rgb[i])) return '#000';
        var f = rgb[i] / 255;
        if (f <= 0.03928)
            L += Lfactors[i] * (f / 12.92);
        else
            L += Lfactors[i] * (Math.pow((f + 0.055) / 1.055, 2.4));
    }
    return L > 0.179 ? '#000' : '#fff';
}

var escapeAttributeValue = function (val) {
    return val.
        replace(/&/g, '&amp;amp;').
        replace(/\'/g, '&amp;apos;').
        replace(/"/g, '&amp;quot;');
}

var unescapeAttributeValue = function (val) {
    return val.
        replace(/&amp;quot;/g, '"').
        replace(/&amp;apos;/g, '\'').
        replace(/&amp;amp;/g, '&');
}

var unescapeJSONString = function (s) {
    // preserve newlines, etc - use valid JSON
    s = s.replace(/\\n/g, "\\n")
                   .replace(/\\'/g, "\\'")
                   .replace(/\\"/g, '\\"')
                   .replace(/\\&/g, "\\&")
                   .replace(/\\r/g, "\\r")
                   .replace(/\\t/g, "\\t")
                   .replace(/\\b/g, "\\b")
                   .replace(/\\f/g, "\\f");
    // remove non-printable and other non-valid JSON chars
    s = s.replace(/[\u0000-\u0019]+/g, "");
    return s;
}

// Read a page's GET URL variables and return them as an associative array.
function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    //console.log("[INFO] url args", hashes);
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        var key = decodeURIComponent(hash[0]);
        var val = decodeURIComponent(hash[1]);
        if (val !== '') {
            vars.push(key);
            vars[key] = val;
        }
    }
    //console.log("[INFO] url args", vars);
    return vars;
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = 'expires=' + d.toUTCString();
    document.cookie = cname + '=' + cvalue + '; ' + expires;
}

function getCookie(cname) {
    var name = cname + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return null;
}

function createElementFromFragment(htmlStr) {
    var frag = document.createDocumentFragment(),
        temp = document.createElement('div');
    temp.innerHTML = htmlStr;
    while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
    }
    return frag;
}

var v = function (x, y, z) {
    return new THREE.Vector3(x, y, z);
};

function isTouchDevice() {
    return (('ontouchstart' in window)
         || (navigator.MaxTouchPoints > 0)
         || (navigator.msMaxTouchPoints > 0));
}

function getMediaState() {

    var state = ((window.innerWidth / window.innerHeight) > 1.2) ? "landscape" : "portrait";
    console.log('[INFO] MEDIA STATE', state);
    return state;

    //// Create the state-indicator element
    //var stateDetector = $('.state-indicator');
    //if (stateDetector.length == 0) {
    //    stateDetector = $('body').append('<div class="state-indicator"></div>');
    //}

    //var state = eval(window.getComputedStyle(document.querySelector('.state-indicator'), ':before').getPropertyValue('content'));
    //console.log('[INFO] MEDIA STATE', state);

    //return state;
}

function isPortraitMode() {
    return getMediaState() === 'portrait';
}

// Create a method which returns device state
function getDeviceState() {
    

    return parseInt(window.getComputedStyle(indicator).getPropertyValue('z-index'), 10);
}


function replaceInPage(localeMapping) {
    for (var key in localeMapping) {
        $('body :not(script)').contents().filter(function () {
            return this.nodeType === 3;
        }).replaceWith(function () {
            return this.nodeValue.replace(key, localeMapping[key]);
        });
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement &&    // alternative standard method
        !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {  // current working methods
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

// load multiple local resources
var localDataUrls;
var onLastCallBack;
function getLocalDatas(urls, successOnLast) {
    localDataUrls = urls;
    onLastCallBack = successOnLast;
    getLocalData(localDataUrls[0], getNextLocalData);
}

var getNextLocalData = function (data, statusText) {
    localDataUrls.shift(); // next resource
    if (localDataUrls.length == 0) {
        onLastCallBack(data, statusText);
    }
    else {
        getLocalData(localDataUrls[0], getNextLocalData);
    }
}

// load css
jQuery.loadCSS = function (url) {
    if (!$('link[href="' + url + '"]').length)
        $('head').append('<link rel="stylesheet" type="text/css" href="' + url + '">');
}

// load single local resouce
function getLocalData(url, success, fail) {
    console.log('[INFO] loading local data from', url);

    var ext = url.substr(url.lastIndexOf('.') + 1).toLowerCase();

    if (ext === 'json' || ext === 'js') {
        $.getScript(url)
        .done(success === void 0 ? defLOCALGETSuccessFunc : success)
        .fail(fail === void 0 ? defLOCALGETFailFunc : fail)
    }
    else {
        $.get(url)
        .done(success === void 0 ? defLOCALGETSuccessFunc : success)
        .fail(fail === void 0 ? defLOCALGETFailFunc : fail)
    }
}

// default GET succes func
var defLOCALGETSuccessFunc = function (data, statusText) {
    console.log('[INFO] get local data finished');
}

// default GET fail func
var defLOCALGETFailFunc = function (jqxhr, settings, exception) {
    console.error('[ERROR] get local data failed', exception);
}

function getGZipData(url, success, progress, fail) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.overrideMimeType('text\/plain; charset=x-user-defined');
    xhr.onload = function (oEvent) {
        // Base64 encode
        var reader = new window.FileReader();
        reader.readAsDataURL(xhr.response);
        reader.onloadend = function () {
            var base64data = reader.result;
            var base64 = base64data.split(',')[1];
            // Decode base64 (convert ascii to binary)
            var strData = atob(base64);
            // Convert binary string to character-number array
            var charData = strData.split('').map(function (x) { return x.charCodeAt(0); });
            // Turn number array into byte-array
            var binData = new Uint8Array(charData);
            // Pako inflate
            var data = pako.inflate(binData, { to: 'string' });
            success(data);
        }
    };
    xhr.onprogress = progress;
    xhr.onerror = fail;
    xhr.send();
    return xhr;
}

// post data as model and put antiForgeryToken in header
// see https://nozzlegear.com/blog/send-and-validate-an-asp-net-antiforgerytoken-as-a-request-header
// see also http://www.asp.net/web-api/overview/security/preventing-cross-site-request-forgery-csrf-attacks

jQuery.postJSON = function (url, data, success, fail, antiForgeryToken, dataType) {
    if (dataType === void 0) { dataType = "json"; }
    if (typeof (data) === "object") { data = JSON.stringify(data); }
    var ajax = {
        url: url,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: dataType,
        data: data,
        success: success,
        error: fail,
        fail: fail
    };
    if (antiForgeryToken) {
        ajax.headers = {
            "__RequestVerificationToken": antiForgeryToken
        };
    };

    return jQuery.ajax(ajax);
};

// default POST succes func
var defPOSTSuccessFunc = function (data) {
    console.log('[INFO] update database finished', data);
}

// default POST fail func
var defPOSTFailFunc = function (error) {
    console.error('[ERROR] update database failed', error);
    //console.error('resonseText:', error.responseText); // very long html string
    console.error('statusText:', error.statusText);
    console.error('status code:', error.status);
}

// default GET succes func
var defGETSuccessFunc = function (data) {
    console.log('[INFO] get database data finished', data);
}

// default GET fail func
var defGETFailFunc = function (error) {
    console.error('[ERROR] get database data failed', error);
    //console.error('resonseText:', error.responseText); // very long html string
    console.error('statusText:', error.statusText);
    console.error('status code:', error.status);
}

// generic function to create, edit and remove db entries
function updateModel(url, params, success, fail) {
    if (PROJECT.canEdit)
        console.log('[INFO] updateModel to', url, 'with params', params);
    // params.Id is identifier, params.UUID could be ignored
    var antiForgeryToken = $("input[name=__RequestVerificationToken]").val();
    $.postJSON(url,
        params,
        success === void 0 ? defPOSTSuccessFunc : success,
        fail === void 0 ? defPOSTFailFunc : fail,
        antiForgeryToken,
        'json');
}

// generic function to get db data
function getData(url, params, success, fail) {

    if (!PROJECT.remotedataurlprefix) {
        console.warn('SKIPPED GETTING REMOTE DATA FROM', url);
        success();
        return;
    }

    url = PROJECT.remotedataurlprefix + url;

    if (PROJECT.canEdit)
        console.log('[INFO] getData from', url, 'with params', params);
    // params.Id is identifier, params.UUID could be ignored
    var antiForgeryToken = $("input[name=__RequestVerificationToken]").val();
    $.getJSON(url, params, function () { })
    .success(success === void 0 ? defGETSuccessFunc : success)
    .error(fail === void 0 ? defGETFailFunc : fail)
    .complete(function () { });
}

/**
 * detect IE
 * returns version of IE or false, if browser is not Internet Explorer
 */
function detectIE() {
    var ua = window.navigator.userAgent;

    var msie = ua.indexOf('MSIE ');
    if (msie > 0) {
        // IE 10 or older => return version number
        return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }

    var trident = ua.indexOf('Trident/');
    if (trident > 0) {
        // IE 11 => return version number
        var rv = ua.indexOf('rv:');
        return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }

    //var edge = ua.indexOf('Edge/');
    //if (edge > 0) {
    //    // Edge (IE 12+) => return version number
    //    return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
    //}

    // other browser
    return false;
}
