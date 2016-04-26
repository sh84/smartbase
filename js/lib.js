if (!Function.prototype.bind) {
	Function.prototype.bind = function (oThis) {
		if (typeof this !== 'function') {
			// ближайший аналог внутренней функции
			// IsCallable в ECMAScript 5
			throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
		}

		var aArgs = Array.prototype.slice.call(arguments, 1),
			fToBind = this,
			fNOP = function () {},
			fBound = function () {
				return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
					aArgs.concat(Array.prototype.slice.call(arguments)));
			};

		fNOP.prototype = this.prototype;
		fBound.prototype = new fNOP();

		return fBound;
	};
}

(function detectPlatform() {
	var p = 'browser';
	var em = false;

	if (navigator.userAgent.match(/smart-tv/i)) p = 'samsung';
	if (navigator.userAgent.match(/Tizen/i)) p = 'tizen';
	if (navigator.userAgent.match(/LG Browser/i)) p = 'lg';
	if (navigator.userAgent.match(/WebOS|Web0S/i)) p = 'webos';
	// Может лучше искать NETTV: NETTV/4.0.2? 
	if (navigator.userAgent.match(/Philips/i) || navigator.userAgent.match(/Streamium/i) || navigator.userAgent.match(/NETTV\/4/i)) p = 'philips';

	// занчение: [тип <string>, эмулятор <boolean>], например ['samsung', true]
	TV.platform = [p, em];
	TV.platform.isLG = p == 'lg';
	TV.platform.isSamsung = p == 'samsung';
	TV.platform.isTizen = p == 'tizen';
	TV.platform.isBrowser = p == 'browser';
	TV.platform.isWebOs = p == 'webos';
	TV.platform.isPhilips = p == 'philips';
	TV.platform.isEmulator = em;
})();

// ищет элемент по id или css выражению
TV.el = function(selector, parent) {
	var el;
	if (typeof(selector) == 'string') {
		el = document.getElementById(selector);
		if (!el) el = (parent || document).querySelector(selector);
	} else {
		el = selector;
	}
	return el;
};

TV.show = function(selector, parent) {
	var el = TV.el(selector, parent);
	if (!el) return;
	el.style.display = 'block';
};

TV.hide = function(selector, parent) {
	var el = TV.el(selector, parent);
	if (!el) return;
	el.style.display = 'none';
};

TV.hasClass = function(selector, cl, parent) {
	var el = TV.el(selector, parent);
	if (!el) return;
	var s = el.className;
	return s == cl || s.indexOf(' '+cl+' ') !== -1 || s.indexOf(cl+' ') == 0 || s.indexOf(' '+cl) != -1 && s.indexOf(' '+cl)+1+cl.length == s.length;
};

TV.addClass = function(selector, cl, parent) {
	var el = TV.el(selector, parent);
	if (!el) return;
	if (!TV.hasClass(el, cl, parent)) el.className = el.className + ' ' + cl;
};

TV.removeClass = function(selector, cl, parent) {
	try {
		var el = TV.el(selector, parent);
		var s = el.className;
		if (typeof(cl) == 'string') {
			s = s.replace(new RegExp('\\s+'+cl+'\\s+', 'g'), ' ').replace(new RegExp('^'+cl+'\\s+', 'g'), '').replace(new RegExp('\\s+'+cl+'$', 'g'), '').replace(new RegExp('^'+cl+'$', 'g'), '');
		} else {
			for(var i in cl) {
				s = s.replace(new RegExp('\\s+'+cl[i]+'\\s+', 'g'), ' ').replace(new RegExp('^'+cl[i]+'\\s+', 'g'), '').replace(new RegExp('\\s+'+cl[i]+'$', 'g'), '').replace(new RegExp('^'+cl[i]+'$', 'g'), '');
			}
		}
		el.className = s;
	}
	catch (e){
		return;
	}
};

TV.getRect = function(selector, parent) {
	var el = TV.el(selector, parent);
	var rect = el.getBoundingClientRect();
	var doc = document.documentElement;
	return {
		height: rect.height,
		width: rect.width,
		left: rect.left + window.pageXOffset - doc.clientLeft,
		top: rect.top + window.pageYOffset - doc.clientTop
	};
};

TV.getSize = function(selector, parent) {
	var el = TV.el(selector, parent);
	var styles = getComputedStyle(el);
	return {
		height: el.offsetHeight + parseInt(styles['marginTop']) + parseInt(styles['marginBottom']),
		width: el.offsetWidth + parseInt(styles['marginLeft']) + parseInt(styles['marginRight'])
	};
};

// проверяет видим ли полностью элемент на экране (может выступать за любую из сторон не более чем на delta px)
TV.isFullVisible = function(el, delta) {
	delta = delta || 0;
	var body_rect = TV.getRect(document.body);
	var el_rect = TV.getRect(el);
	return el_rect.left > body_rect.left - delta && 
		el_rect.left + el_rect.width < body_rect.left + body_rect.width + delta &&
		el_rect.top > body_rect.top - delta &&
		el_rect.top + el_rect.height < body_rect.top + body_rect.height + delta;
};

// находит элементы по селектору, для каждого элемента возвращает так же его data-* атрибуты в свойстве _attributes
TV.find = function(selector, parent, without_attributes) {
	var result = [];
	var els = (parent || document).querySelectorAll(selector);
	for (var i=0; i < els.length; i++) {
		var el = els[i];
		if (!without_attributes) TV.setElementAttributes(el);
		result.push(el);
	}
	return result;
};

// устанавливает свойство _attributes элемента
TV.setElementAttributes = function(el) {
	var attributes = {};
	for (var k=0; k < el.attributes.length; k++) {
		if (el.attributes[k].name && el.attributes[k].name.indexOf('data-') === 0) {
			attributes[el.attributes[k].name.replace('data-', '')] = el.attributes[k].value;
		}
	}
	el._attributes = attributes;
};

TV.setHTML = function(selector, html, parent) {
	if (TV.platform.isSamsung && TV.widget_api.putInnerHTML) {
		TV.widget_api.putInnerHTML(TV.el(selector, parent), html);
	} else {
		TV.el(selector, parent).innerHTML = html;
	}
};

// ренедрит теплейт template в элементе selector
TV.render = function(selector, template, params, ejs_key) {
	TV._time = new Date()/1;
	var el = TV.el(selector);
	
	var p = TV.app.curr_popup ? TV.app.curr_popup.name : (TV.app.curr_page ? TV.app.curr_page.name : '');
	if (TV._curr_p == p) {
		// находим все selected кнопки/компоненты, запоминаем их id
		var els = TV.find('.'+TVButton.act_class+'[data-id]', el);
		for (var i=0; i < els.length; i++) {
			if (els[i]._attributes.type && (els[i]._attributes.type == 'button' || els[i]._attributes.type == 'component')) TV._selected_btns[els[i]._attributes.id] = TV._time;
		}
		// находим все hover кнопки/компоненты, запоминаем их id
		var els = TV.find('.'+TVButton.hover_class+'[data-id]', el);
		for (var i=0; i < els.length; i++) {
			if (els[i]._attributes.type && (els[i]._attributes.type == 'button' || els[i]._attributes.type == 'component')) TV._hover_btns[els[i]._attributes.id] = TV._time;
		}
		// находим все pressed кнопки, запоминаем их id
		var els = TV.find('.'+TVButton.pressed_class+'[data-type]', el);
		for (var i=0; i < els.length; i++) {
			if (els[i]._attributes.id) TV._pressed_btns[els[i]._attributes.id] = TV._time;
		}
	} else {
		TV._selected_btns = {};
		TV._pressed_btns = {};
		TV._hover_btns = {};
		TV._curr_p = p;
	}
	
	var html = ejs_key ? TV.app.ejs[ejs_key][template](params) : TV.app.ejs[template](params);
	TV.setHTML(el, html);

	// все pressed выставляем заново
	for (var id in TV._pressed_btns) {
		if (TV._pressed_btns[id]+TV._render_ttl < TV._time) delete TV._pressed_btns[id];
		if (TV._pressed_btns[id]) {
			var el = TV.el('[data-id="'+id.replace(TV._curr_p, '')+'"]');
			if (el) TV.addClass(el, TVButton.pressed_class);
		}
	}
};
TV._selected_btns = {};
TV._pressed_btns = {};
TV._hover_btns = {};
TV._render_ttl = 100; // столько времени (мс) хранится информация о состоянии кнопок перед рендерингом

// создаем элемент по html-у, подразумевается что html сразу содержит элемент
TV.createElement = function(html) {
	var wrapper = document.createElement('div');
	wrapper.innerHTML = html;
	return wrapper.children[0];
};

TV.log = function() {
	var s = '';
	for (var i=0; i < arguments.length; i++) {
		s += TV.dump_props(arguments[i])+' ';
	}
	if (TV.platform.isSamsung && TV.platform.isEmulator) {
		alert(s);
	} else if (console && console.log) {
		console.log.apply(console, arguments);
	}
	if (TV.app.logging) TV._log(s.replace(/  /g, '&nbsp;&nbsp;').replace(/\n/g, '<br>'));
};

TV.dump_props = function(obj, n) {
	var n1 = (n || 0) + 1;
	var result = '';
	var space = '';
	for (var i=0; i < n1-1; i++) space += '  ';
	if (obj instanceof Array) {
		if (n1 < 4) {
			result += '[\n';
			for (var i in obj) {
				result += '  ' + space + TV.dump_props(obj[i], (n || 0) + 1) + ',\n';
			}
			result += space+']';
			result = result.replace(',\n'+space+']', '\n'+space+']');
		} else {
			result += 'array';
		}
	} else if (obj && obj.toString() == '[object Object]') {
		if (n1 < 4) {
			result += '{\n';
			for (var i in obj) {
				result += '  ' + space + i + ': ' + TV.dump_props(obj[i], (n || 0) + 1) + ',\n';
			}
			result += space+'}';
			result = result.replace(',\n'+space+'}', '\n'+space+'}');
		} else {
			result += 'object';
		}
	} else if (typeof(obj) == 'function') {
		result += 'function()';
	} else {
		result += obj;
	}
	return result;
};

//
// MD5
//
TV.MD5 = function(string) {
	function RotateLeft(lValue, iShiftBits) {
		return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
	}
	function AddUnsigned(lX, lY) {
		var lX4, lY4, lX8, lY8, lResult;
		lX8 = (lX & 0x80000000);
		lY8 = (lY & 0x80000000);
		lX4 = (lX & 0x40000000);
		lY4 = (lY & 0x40000000);
		lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
		if (lX4 & lY4) {
			return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
		}
		if (lX4 | lY4) {
			if (lResult & 0x40000000) {
				return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
			} else {
				return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
			}
		} else {
			return (lResult ^ lX8 ^ lY8);
		}
	}
	function F(x, y, z) {
		return (x & y) | ((~x) & z);
	}
	function G(x, y, z) {
		return (x & z) | (y & (~z));
	}
	function H(x, y, z) {
		return (x ^ y ^ z);
	}
	function I(x, y, z) {
		return (y ^ (x | (~z)));
	}
	function FF(a, b, c, d, x, s, ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};
	function GG(a, b, c, d, x, s, ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};

	function HH(a, b, c, d, x, s, ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};

	function II(a, b, c, d, x, s, ac) {
		a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
		return AddUnsigned(RotateLeft(a, s), b);
	};

	function ConvertToWordArray(string) {
		var lWordCount;
		var lMessageLength = string.length;
		var lNumberOfWords_temp1 = lMessageLength + 8;
		var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
		var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
		var lWordArray = Array(lNumberOfWords - 1);
		var lBytePosition = 0;
		var lByteCount = 0;
		while (lByteCount < lMessageLength) {
			lWordCount = (lByteCount - (lByteCount % 4)) / 4;
			lBytePosition = (lByteCount % 4) * 8;
			lWordArray[lWordCount] = (lWordArray[lWordCount] | (string
				.charCodeAt(lByteCount) << lBytePosition));
			lByteCount++;
		}
		lWordCount = (lByteCount - (lByteCount % 4)) / 4;
		lBytePosition = (lByteCount % 4) * 8;
		lWordArray[lWordCount] = lWordArray[lWordCount]
			| (0x80 << lBytePosition);
		lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
		lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
		return lWordArray;
	};

	function WordToHex(lValue) {
		var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
		for (lCount = 0; lCount <= 3; lCount++) {
			lByte = (lValue >>> (lCount * 8)) & 255;
			WordToHexValue_temp = "0" + lByte.toString(16);
			WordToHexValue = WordToHexValue
				+ WordToHexValue_temp.substr(
						WordToHexValue_temp.length - 2, 2);
		}
		return WordToHexValue;
	};

	function Utf8Encode(string) {
		string = string.replace(/\r\n/g, "\n");
		var utftext = "";
		for ( var n = 0; n < string.length; n++) {
			var c = string.charCodeAt(n);
			if (c < 128) {
				utftext += String.fromCharCode(c);
			} else if ((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			} else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}
		return utftext;
	};

	var x = Array();
	var k, AA, BB, CC, DD, a, b, c, d;
	var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
	var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
	var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
	var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

	string = Utf8Encode(string);
	x = ConvertToWordArray(string);
	a = 0x67452301;
	b = 0xEFCDAB89;
	c = 0x98BADCFE;
	d = 0x10325476;

	for (k = 0; k < x.length; k += 16) {
		AA = a;
		BB = b;
		CC = c;
		DD = d;
		a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
		d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
		c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
		b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
		a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
		d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
		c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
		b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
		a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
		d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
		c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
		b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
		a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
		d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
		c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
		b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
		a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
		d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
		c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
		b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
		a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
		d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
		c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
		b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
		a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
		d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
		c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
		b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
		a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
		d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
		c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
		b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
		a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
		d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
		c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
		b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
		a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
		d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
		c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
		b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
		a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
		d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
		c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
		b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
		a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
		d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
		c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
		b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
		a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
		d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
		c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
		b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
		a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
		d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
		c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
		b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
		a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
		d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
		c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
		b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
		a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
		d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
		c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
		b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
		a = AddUnsigned(a, AA);
		b = AddUnsigned(b, BB);
		c = AddUnsigned(c, CC);
		d = AddUnsigned(d, DD);
	}
	var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
	return temp.toLowerCase();
};

TV.setCookie = function(name, value, expires, path, domain, secure) {
	document.cookie = name + "=" + escape(value) +
		((expires) ? "; expires=" + expires : "") +
		((path) ? "; path=" + path : "") +
		((domain) ? "; domain=" + domain : "") +
		((secure) ? "; secure" : "");
};

TV.getCookie = function(name) {
	var cookie = " " + document.cookie;
	var search = " " + name + "=";
	var setStr = null;
	var offset = 0;
	var end = 0;
	if (cookie.length > 0) {
		offset = cookie.indexOf(search);
		if (offset != -1) {
			offset += search.length;
			end = cookie.indexOf(";", offset);
			if (end == -1) {
				end = cookie.length;
			}
			setStr = unescape(cookie.substring(offset, end));
		}
	}
	TV.log("getCookie: " + name + "=" + setStr);
	return(setStr);
};

window.addEventListener('load', function() {
	TV._log = function(s) {
		if (!TV._log.el) {
			TV._log.el = document.createElement('div');
			TV._log.el.style.position="absolute";
			TV._log.el.style.backgroundColor = "white";
			TV._log.el.style.color = "black";
			TV._log.el.style.left = '0px';
			TV._log.el.style.top = '0px';
			TV._log.el.style.zIndex=9999;
			TV._log.el.style.opacity = "0.6";
			TV._log.el.style.fontSize = "12px";
			TV._log.el.style.maxHeight = '650px';
			TV._log.el.style.width = '100%';
			TV._log.el.style.overflowY = 'scroll';
			document.body.appendChild(TV._log.el);
		}
		TV.setHTML(TV._log.el, TV._log.el.innerHTML + s + '<br>');
		TV._log.el.scrollTop = TV._log.el.scrollHeight;
	};
	window.addEventListener('error', function(e) {
		//e.error.message, "from", e.error.stack
		if (TV.app.log_errors) {
			h = {};
			for (var i in e) h[i] = e[i];
			var s = '<b>ERROR: '+e.message+ ' in '+e.filename+' '+e.lineno+':'+e.colno+'</b><br>';
			s += (e.error ? e.error.stack || '' : '').replace(/\n/g, '<br>');
			s += '<br>';
			TV._log(s);
		}
	}, false);
}, false);
