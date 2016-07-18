function TV(options) {
	if (TV.app) throw 'Only one TV instance can be created';
	this.log_errors = false;	        // перехватить и показать ошибки на экране
	this.logging = false;		        // показать лог на экране
	this.history_in_menu = false;       // учитывать в истории страницы меню
	this.not_hover_on_bound = 10;		// не разрешать наводить на элементы выходящие за границу экрана на столько пикселей, false - разрешать
	this.ejs = {};				        // все шаблоны
	this.pages = {};			        // все страницы
	this.curr_page = null;		        // текущая страница
	this.history = [];      	        // переходы по страницам, начиная от любой страницы из меню
	this.popups = {};			        // все попапы
	this.curr_popup = null;		        // текущий попап
	this.load_data_callback = null;     // колбэк для загрузки данных
	this.key_back_ignore = false;       // ничего не делать при нажатии кнопки назад
	this.clear_history_on_index_page = false;	// сбрасывать историю на главной
	this.index_page_name = null;		// имя главной страницы
	this.device_id = '';
	this.model_id = '';
	this.support_uhd = false;
	this.id_prefix = 'TV_';
	if (options) {
		for (var i in options) {
			if (this.hasOwnProperty(i)) this[i] = options[i];
		}
	}

	TV.app = this;
	if (TV.platform.isSamsung) {
		window.onShow = TV.app.onSamsungShow;
		TV.widget_api = new Common.API.Widget();
		TV.plugin_api = new Common.API.Plugin();
	}
	window.addEventListener('load', function() {
		TV.app.onLoad();
	}, false);
}

TV.prototype.preinit = function() {
	// вызывается после загрузки данных
};

TV.prototype.prerender = function() {
	// вызывается перед render
};

TV.prototype.generateSerialNumber = function(platform) {
    var t = new Date();
    var ms = t.getTime();
    var serialNumber = TV.MD5(ms + platform + Math.floor(Math.random()*1000000));
    TV.setCookie('serialNumber', serialNumber, 'Tue, 01 Jan 2030 00:00:00 GMT', '/');
    return serialNumber;
};

TV.prototype.generateToken = function() {
    var t = new Date();
    var ms = t.getTime();
    var token = TV.MD5(ms + 'token' + Math.floor(Math.random()*1000000));
    return token;
};

TV.prototype.onLoad = function() {
	this.findDeviceID();	
	
	// свой css-класс для NetCast (не поддерживает box-shadow)
	if (TV.platform.isLG) TV.addClass(document.body, 'netcast');
	
	// компилируем все найденные шаблоны
	var templates = TV.find('script[type="text/template"]');
	for (var i=0; i < templates.length; i++) {
		var el = templates[i];
		if (!el._attributes['target']) throw 'Not defined data-target for template';
		var ejs_fn = ejs.compile(el.innerHTML, {open: '{%', close: '%}'});
		ejs_fn.attributes = el._attributes;
		if (el._attributes['name']) {
			if (!this.ejs[el._attributes['target']]) this.ejs[el._attributes['target']] = {};
			this.ejs[el._attributes['target']][el._attributes['name']] = ejs_fn;
		} else {
			this.ejs[el._attributes['target']] = ejs_fn;
		}
	}

	// все шаблоны popup инициализируем как попапы
	for (var name in  this.ejs.popup) {
		var cl = this.ejs.popup[name].attributes['class'] || 'TVPopup';
		if (typeof(window[cl]) != 'function') throw 'Not defined '+cl+' class for popup '+name;
		new window[cl](this, name);
	}

	// все шаблоны page инициализируем как страницы
	if (!this.ejs.page) throw 'Not defined page templates';
	for (var name in  this.ejs.page) {
		var cl = this.ejs.page[name].attributes['class'] || 'TVPage';
		if (typeof(window[cl]) != 'function') throw 'Not defined '+cl+' class for page '+name;
		new window[cl](this, name);
	}

	this.show();
	document.addEventListener('keydown', this.onKey.bind(this), false);
	// unavaliable because of "trustLevel":"netcast" in appinfo.json
	// if (TV.platform.isWebOs) {
	// 	window.addEventListener("popstate", this.onPopState);
	// }
	if (TV.platform.isSamsung) TV.widget_api.sendReadyEvent();
};

TV.prototype.findDeviceID = function() {
	if (TV.platform.isSamsung) {
		if (TV.el('pluginObjectNNavi') && TV.el('pluginNetwork')) this.device_id = TV.el('pluginObjectNNavi').GetDUID(TV.el('pluginNetwork').GetHWaddr());
		if (typeof webapis === "undefined") {
			this.model_id += 'undef';
		} else {
			if (webapis.tv.info.getModel) {
				this.model_id += webapis.tv.info.getModel();
			} else {
				this.model_id += 'error';
			};
			this.support_uhd = (webapis.tv.info.supportUDPanel && webapis.tv.info.supportUDPanel()) ? true : false;
		}
	} else if (TV.platform.isLG || TV.platform.isWebOs) {
		var el = TV.el('[type="application/x-netcast-info"]');
		if (!el) {
			el = document.createElement('object');
			el.setAttribute('type', 'application/x-netcast-info');
			document.body.insertBefore(el, document.body.firstChild);
		}
		this.device_id = el.serialNumber;
	} else if (TV.platform.isPhilips) {
        try {
            this.device_id = TV.getCookie('serialNumber') || this.generateSerialNumber('Philips');
        }catch(e) {
            this.device_id = 'default_device_id_philips';
        }
    } else {
		this.device_id = TV.getCookie('serialNumber') || this.generateSerialNumber('Default');
	}
	TV.log('Device id: '+this.device_id);
};


TV.prototype.onPopState = function(e) {
	e.preventDefault();
	var key_back = {};
	key_back.keyCode = 461;
	this.onKey(key_back);
	if (this.history.length > 0) window.history.pushState({ "data": "some data" });
};


TV.prototype.show = function() {
	// ищем 1-ю страницу из страниц меню
	for (var name in this.pages) {
		if (!this.curr_page && this.pages[name].isMenuPage()) {
			this.curr_page = this.pages[name];
			if (!this.index_page_name) this.index_page_name = name;
			break;
		}
	}
	
	// если страниц меню нет - ищем страницу с data-start=true
	if (!this.curr_page) {
		for (var name in this.pages) {
			if (!this.curr_page && this.pages[name].attributes.start) {
				this.curr_page = this.pages[name];
				if (!this.index_page_name) this.index_page_name = name;
				break;
			}
		}
	}
	
	// если и страниц с data-start=true нет - берем 1ю страницу
	if (!this.curr_page) {
		for (var name in this.pages) {
			this.curr_page = this.pages[name];
			if (!this.index_page_name) this.index_page_name = name;
			break;
		}
	}

	if (this.load_data_callback) {
		// отрисуем главный экран без данных
		this.render(null, true);
		// надо дождаться данных
		this.load_data_callback(function() {
			this.load_data_callback = null; // вызываем только один раз
			this.preinit();
			this.render();
		}.bind(this));
	} else {
		this.preinit();
		this.render();
	}
};

TV.prototype.render = function(start_btn, without_page) {
	if (!this.ejs.main) throw 'Not defined main template';
	if (!without_page) this.prerender();

	var id = this.id_prefix+'main';
	var el = document.getElementById(id);
	if (!el) {
		el = document.createElement('div');
		el.setAttribute('id', this.id_prefix+'main');
		document.body.appendChild(el);
	}
	TV.render(el, 'main', this);

	this.header_el = document.querySelector('#'+id+' [data-type="header"]');
	this.footer_el = document.querySelector('#'+id+' [data-type="footer"]');
	this.page_el = document.querySelector('#'+id+' [data-type="page"]');
	this.popup_el = document.querySelector('#'+id+' [data-type="popup"]');
	this.popup_overlay_el = document.querySelector('#'+id+' [data-type="popup_overlay"]');
	this._footer_btns = {};

	if (!without_page) {
		if (Object.keys(this.pages).length == 0) throw 'No pages to show';
		if (!this.curr_page) throw 'Not defined curr page';
		this.curr_page.show();
		if (this.onready) this.onready();
	} else {
		this.renderHeader();
	}
};

TV.prototype.renderHeader = function() {
	if (!this.header_el) return;
	if (!this.ejs.header) throw 'Not defined header template';
	TV.render(this.header_el, 'header', this);
};

TV.prototype.renderFooter = function() {
	if (!this.footer_el) return;
	if (!this.ejs.footer) throw 'Not defined footer template';
	TV.render(this.footer_el, 'footer', this);
	for (var i in this._footer_btns) {
		var btn = this._footer_btns[i];
		btn && btn.clear();
	}
	this._footer_btns = {};
	['red', 'yellow', 'green', 'blue', 'return'].forEach(function(key) {
		var el = TV.el('[data-type="footer-'+key+'"]', this.el),
			allow_on_popup = this.curr_page['key_'+key+'_on_popup'] && this.curr_page['key_'+key+'_on_popup'] !== 'false' ? true : false;
		
		if (el && (!this.curr_popup || allow_on_popup || key == 'return')) {
			//el.setAttribute('data-type', 'button');
			var btn = new TVButton(el, this._footer_btns);
			btn.onclick = function(curr_btn) {
				curr_btn.resetAct();
				this.onKey({keyCode: TV.keys[key]});
			}.bind(this);
			this.curr_popup && this.curr_popup.buttons.close && key == 'return' ? TV.hide(el) : TV.show(el);
		} else {
			TV.hide(el);
		}
	}.bind(this));
};

TV.prototype.onKeyBack = function() {
	if (this.key_back_ignore) return;
	if (this.curr_popup) {
		this.curr_popup.hide();
	} else if (this.history.length > 0) {
		this.curr_page.hide();
	} else if (TV.platform.isSamsung) {
		TV.widget_api.sendReturnEvent();
	} else {
		this.exit();
	}
};

TV.prototype.exit = function() {
	if (TV.platform.isSamsung) {
		TV.widget_api.sendExitEvent();
	} else if (TV.platform.isLG || TV.platform.isWebOs) {
		window.NetCastBack();
	} else if (TV.platform.isPhilips) {
		history.go(-999);
	}
};

TV.prototype.onKey = function(event) {
	// пока идет загрузка - не обрабатываем
	var key_code = event.keyCode;
	if (key_code == TV.keys.exit || this.load_data_callback && key_code == TV.keys.return) {
		event.preventDefault && event.preventDefault();
		this.exit();
		return;
	}
	if (this.load_data_callback) return;
	// глобальный обработчик приложения
	if (this.onAnyKey) {
		if (this.onAnyKey(key_code) === false) {
		    if (key_code == TV.keys.return && event.preventDefault) event.preventDefault();
		    return;
		}
	}
    // глобальный обработчик страницы
	var page_or_popup = this.curr_popup || this.curr_page;
	if (page_or_popup.onAnyKey) {
		if (page_or_popup.onAnyKey(key_code) === false) {
		    if (key_code == TV.keys.return && event.preventDefault) event.preventDefault();
		    return;
		}
	}
    // глобальный обработчик компонента
	for (var i in page_or_popup.buttons) {
		var btn = page_or_popup.buttons[i];
		if (btn.onAnyKey) {
			if (btn.onAnyKey(key_code) === false) {
			    if (key_code == TV.keys.return && event.preventDefault) event.preventDefault();
			    return;
			}
		}
	}

	// нажатие не перехвачено - обрабатываем в общем порядке
	event.preventDefault && event.preventDefault();
	var cpp = this.curr_popup || this.curr_page;
	var cpp_on_key = function(fn_name, p) {
		if (cpp[fn_name]) cpp[fn_name].call(cpp, p);
	};
	var actions = {
		'exit':   this.exit.bind(this),
		'left':   TVButton.onCursorKey.bind(TVButton, cpp, 'left'),
		'right':  TVButton.onCursorKey.bind(TVButton, cpp, 'right'),
		'up':     TVButton.onCursorKey.bind(TVButton, cpp, 'up'),
		'down':   TVButton.onCursorKey.bind(TVButton, cpp, 'down'),
		'enter':  TVButton.onCursorKey.bind(TVButton, cpp, 'enter'),
		'red':    cpp_on_key.bind(this, 'onKeyRed'),
		'green':  cpp_on_key.bind(this, 'onKeyGreen'),
		'blue':   cpp_on_key.bind(this, 'onKeyBlue'),
		'yellow': cpp_on_key.bind(this, 'onKeyYellow'),
		'play':   cpp_on_key.bind(this, 'onKeyPlay'),
		'pause':  cpp_on_key.bind(this, 'onKeyPause'),
		'stop':   cpp_on_key.bind(this, 'onKeyStop'),
		'rw':     cpp_on_key.bind(this, 'onKeyRewind'),
		'ff':     cpp_on_key.bind(this, 'onKeyForward'),
		'return': function() {
			if (cpp.onKeyBack) {
				var r = cpp.onKeyBack();
				if (r !== false) this.onKeyBack();
			} else {
				this.onKeyBack();
			}
		}.bind(this)
	};
	for (var i=0; i<=9; i++) {
		actions['num_'+i] = cpp_on_key.bind(this, 'onKeyDigit', i);
	}
	for (var k in actions) {
		if (TV.keys[k] == key_code) {
			actions[k]();
			break;
		}
	}
};

TV.prototype.onSamsungShow = function() {
	// включаем звук для Samsung
	var el = TV.el('pluginObjectNNavi');
	if (el) {
		TV.el('pluginObjectNNavi').SetBannerState(1); // Set Overwapped Volume OSD
		TV.plugin_api.unregistKey(7); // Unregistering VOL_UP
		TV.plugin_api.unregistKey(11); // Unregistering VOL_DOWN
		TV.plugin_api.unregistKey(27); // Unregistering VOL_MUTE
	}
};


// Volume actions
TV.prototype.isSupportVolumeActions = function() {
	//samsung
	var el = TV.el('pluginAudio');
	if (el && el.SetVolumeWithKey) return true;
	
	//tizen
	if (TV.platform.isTizen) return true;

	//webos
	if (typeof (webOS) != "undefined" && webOS.service)	return true;
	
	return false;
};

TV.prototype.setVolumeUp = function() {
	//samsung
	var el = TV.el('pluginAudio');
	if (el) {
		el.SetVolumeWithKey(0);
		return;
	};

	//tizen
	if (TV.platform.isTizen) {
		tizen.tvaudiocontrol.setVolumeUp();
		return;
	}

	//webos
	if (typeof (webOS) != "undefined") {
		webOS.service.request("luna://com.webos.audio", {
			method : "volumeUp",
			onComplete : function(response) {
				if (response.returnValue) {
					return;
				} else {
					console.log("Failed to increase volume by 1.");
					return;
				}
			}
		});
	};
};

TV.prototype.setVolumeDown = function() {
	//samsung
	var el = TV.el('pluginAudio');
	if (el) {
		el.SetVolumeWithKey(1);
		return;
	};

	//tizen
	if (TV.platform.isTizen) {
		tizen.tvaudiocontrol.setVolumeDown();
		return;
	}
	
	//webos
	if (typeof (webOS) != "undefined") {
		webOS.service.request("luna://com.webos.audio", {
			method : "volumeDown",
			onComplete : function(response) {
				if (response.returnValue) {
					return;
				} else {
					console.log("Failed to decrease volume by 1.");
					return;
				}
			}
		});
	};
};

TV.prototype.getVolume = function() {
	//samsung
	var el = TV.el('pluginAudio');
	if (el) {
		return el.GetVolume();
	}
	
	//tizen
	if (TV.platform.isTizen) {
		return tizen.tvaudiocontrol.getVolume();
	}
	
	return undefined;
};

TV.prototype.setMute = function() {
	//samsung
	var el = TV.el('pluginAudio');
	if (el) {
		if (el.GetSystemMute()) {
			return el.SetSystemMute(0);
		} else {
			return el.SetSystemMute(1);
		}
	}

	//tizen
	if (TV.platform.isTizen) {
		if (tizen.tvaudiocontrol.isMute()) {
			return tizen.tvaudiocontrol.setMute(false);
		} else {
			return tizen.tvaudiocontrol.setMute(true);
		}
	}
};
