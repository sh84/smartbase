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

	if (navigator.userAgent.match(/smarttv/i)) p = 'samsung';
	if (navigator.userAgent.match(/LG Browser/i)) p = 'lg';
	if (navigator.userAgent.match(/Web0S/i)) p = 'webos';

    // Может лучше искать NETTV: NETTV/4.0.2? 
    if (navigator.userAgent.match(/Philips/i)) p = 'philips';

	// занчение: [тип <string>, эмулятор <boolean>], например ['samsung', true]
	TV.platform = [p, em];
	TV.platform.isLG = p == 'lg';
	TV.platform.isSamsung = p == 'samsung';
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
