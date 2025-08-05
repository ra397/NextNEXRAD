if (!String.prototype.format) {
    String.prototype.format = function() {
        const args = arguments;
        let _ret;
        return this.replace(
            /{(\d+)}/g,
            function(match, number) {
                _ret  = typeof args[number] != 'undefined' ? args[number] : match;
                return _ret != null ? _ret : '';
            }
        )
    }
}
function decodeGeoJson(obj){
    let _use;
    for (var k in obj) {
        //console.log(k)
        if (typeof obj[k] == "object" && obj[k] !== null && k != 'coordinates') {
            decodeGeoJson(obj[k]);
        } else if (k == 'coordinates') {
            if (obj[k].length > 0){
                for (i=0; i < obj[k].length; i++) {
                    obj[k][i] = google.maps.geometry.encoding.decodePath(obj[k][i]).map(
                        (latLng) => {
                            return [latLng.lat(),latLng.lng()];
                        }
                    );
                }
            } else {
                obj[k] = google.maps.geometry.encoding.decodePath(obj[k]).map(
                    (latLng) => {
                        return [latLng.lat(),latLng.lng()];
                    }
                );
            }
        }
    }
}

if (!String.prototype.allReplace) {
    String.prototype.allReplace = function(obj) {
        var retStr = this;
        for (var x in obj) {
            retStr = retStr.replace(new RegExp(x, 'g'), obj[x]);
        }
        return retStr;
    };
}

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(target, replacement) {
        return this.split(target).join(replacement);
    };
}

if (!String.prototype.toTitleCase) {
    String.prototype.toTitleCase = function () {
        _temp = this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
        _temp.allReplace({" At ": " at ", "Near": "near"});
        return _temp;
    }
};

if (!Number.prototype.toRad) {
    Number.prototype.toRad = function() {
        return this * Math.PI / 180;
    }
}

if (!Number.prototype.toDeg) {
    Number.prototype.toDeg = function() {
        return this * 180 / Math.PI;
    }
}

const dtStrUxt = (dt_str) => {
    dt = new Date(dt_str);
    return dt.getTime() / 1000
}
const _isNull = (v) => typeof v === "object" && !v;
const _isNumeric = (s) =>  typeof s != "string" ? false : !isNaN(str) && !isNaN(parseFloat(str));

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

async function getStream (_url){
    const source = await fetch(_url);
    return await source.text();
}

async function getArrayBuffer (_url){
    const source = await fetch(_url);
    return await source.arrayBuffer();
}


async function getJson(_url){
    const source = await fetch(_url);
    return await source.json();
}

const getJSON = getJson;

function zeroPadded (num){
    return ('' + num).padStart(2, '0');
}


function project(latLng, tile_size=256) {
    let sinY = Math.sin((latLng.lat()* Math.PI) / 180);
    sinY = Math.min(Math.max(sinY, -0.9999), 0.9999);

    return new google.maps.Point(
        tile_size * (0.5 + latLng.lng() / 360),
        tile_size * (0.5 - Math.log((1 + sinY) / (1 - sinY)) / (4 * Math.PI))
    );
}

function extend(fn,code){
    return function(){
        fn.apply(fn,arguments)
        code.apply(fn,argumnets)
    }
}

var getAbsoluteUrl = (function() {
    let a;
    return function(url) {
        if(!a) a = document.createElement('a');
        a.href = url;
        return a.href;
    };
})();

function ifExist(_url) {
    const _head = 'HEAD';
    let _http;
    if (window.XMLHttpRequest) {
        _http = new XMLHttpRequest();
    } else {
        _http = new ActiveXObject("Microsoft.XMLHTTP");
    }
    _http.open(_head, _url, true);
    try {
        _http.send();
    } catch (e) {
        return 0;
    }
    return parseInt(_http.status) !== 404;
}

function getDatetimeStringFromEpoch(epoch, all_numeric = 0){
    //console.log("all numeric: ", all_numeric)
    let p = parseInt(epoch)  * 1000;
    let d = new Date(p);
    let m = (d.getUTCMonth() + 1);
    m < 10 ? m = "0" + m : m = "" + m;    // make m a string always
    let h = d.getUTCHours();
    h < 10 ? h = "0" + h : h = "" + h;
    let min = d.getUTCMinutes();
    min < 10 ? min = "0" + min : min = "" + min;
    let dat = d.getUTCDate();
    if (d.getUTCDate() < 10) dat = "0" + dat;
    let date = d.getUTCFullYear() + "-" + m + "-" +  dat.toString() + " " +h+":"+min; // + ":00:00";
    if (all_numeric == 1) {
        date = d.getUTCFullYear() + "" + m + "" +  dat.toString() + "" +h;
    }
    return(date);

}