TVComponents.Player = function(el, adjacent_buttons, parent, class_name) {
	TVComponent.call(this, el, adjacent_buttons, parent, class_name);
	this.data = {
		url: null,		       // урл видео
		live: false,           // признак лайва (скрыт таймлайн)
		seek: null,            // сделать сик при старте
		duration: null,        // предопределенная длительность, секунд
		max_seek: null,        // крайняя позиция допустимого сика, секунд (null - использовать duration)
		base_time: null,       // базовое время текщей позиции, секунд 
		allow_seek: true,
		allow_pause: true
	};
	this.state = 'stop';	   // состояния: stop, play, pause
	this.curr_time = 0;		   // текущее время в секундах
	this.buffering = false;	   // признак буферизации
	this.duration = null;	   // длительность видео в секундах
	this.onstatechange = null; // колбэк изменения состояния проигрывания
	
	this.autostart = this.attributes['autostart'] && this.attributes['autostart'] != 'false';
	this.seek_show_time = this.attributes['seek_show_time'] ? this.attributes['seek_show_time']*1 : 1000;  // время отображения перемотки
	this.inactive_time = this.attributes['inactive_time'] ? this.attributes['inactive_time']*1 : 3000;     // время бездействия до скрытия панели
	this.inactive_without_action = this.attributes['inactive_without_action'] && this.attributes['inactive_without_action'] != "false"; // обрабатывать кнопки и при скрытой панели
	this.hide_panel = this.attributes['hide_panel'];
	
	this._stop_after_buffering = false;	// вызывать stop после буферизации
	this._play_after_buffering = false;	// вызывать play после буферизации
	this._show_seek = null;             // признак отображения перемотки (время начала показа)
	this._inactive_timer = null;        // таймер до скрытия панели
	this._hidden_panel = false;   		// признак скрытия панели
	this.onend = null;					// callback по завершении проигрывания
	this._where_to_seek = null;			// время для перемотки по клавишам лево-право
};
TVComponents.Player.prototype = Object.create(TVComponent.prototype);
TVComponents.Player.btn_play_class = 'pc-btn_play';
TVComponents.Player.btn_pause_class = 'pc-btn_pause';
TVComponents.Player.btn_stop_class = 'pc-btn_stop';
TVComponents.Player.hidden_panel_class = 'hidden';

TVComponents.Player.prototype.isLive = function() {
	return this.data.live;
};

TVComponents.Player.prototype.clearAll = function() {
	if (this.video) this.video.clear();
	if (this._inactive_timer) clearTimeout(this._inactive_timer);
	this._inactive_timer = null;
	if (this._seek_timer) clearTimeout(this._seek_timer);
	this._seek_timer = null;
	document.removeEventListener('mousemove', this._onmousemove);
};

TVComponents.Player.prototype.stateChange = function(new_state) {
	this.state = new_state;
	this.onstatechange && this._videoready && this.onstatechange(this.state);
};

TVComponents.Player.prototype.getNewUrl = function() {
	// redefine for live playing in philips
	return this.data.url;
};

TVComponents.Player.prototype.onready = function() {
	this.video = new TV.PlayerWrapper(TV.platform.isSamsung ? this.attributes.samsung_player_object : null);
	this.video.onready = this.onvideoready.bind(this);
	this.video.onprogress = this.onvideoprogress.bind(this);
	this.video.onbuffering = this.onvideobuffering.bind(this);
	this.video.onerror = this.onvideoerror.bind(this);
	
	// TODO переделать: act_btn, равный close остается с предыдущей страницы с плеером
	this.buttons._act_btn = null;
	
	// устанавливаем плеер на нужную позицию и размер
	var rect = TV.getRect(this.el),
		wrap = TV.getRect(TV.el('body'));
	this.video.setDisplayArea(rect.left - wrap.left, rect.top, rect.width, rect.height);
	
	// стартуем
	this.video.url = this.data.url;
	if (this.autostart && this.video.url) setTimeout(function() {
		this.play();
	}.bind(this), 0);
	
	this.buttons.play.onclick = function() {
		this.buttons._act_btn = null; // разрешаем повторное нажатие
		if (this.state == 'play') {
			this.pause();
		} else {
			this.play();
		}
	}.bind(this);

	if (!this.isLive()) {
		this.buttons.stop.onclick = function () {
			this.buttons._act_btn = null;
			this.stop();
		}.bind(this);

		this.buttons.timeline.onclick = function() {
			this.buttons._act_btn = null;
			if (this._where_to_seek !== null) {
				this.seek(this._where_to_seek);
				this.hideSeek(true);
				if (this.state != 'play') this.play();
			} else {
				if (this.state == 'play') this.pause();
				this.showSeek(this.curr_time);
				this._where_to_seek = this.curr_time;
			}
		}.bind(this);
		this.buttons.timeline.oncursor = function(side) {
			if (this._where_to_seek !== null) {
				if (side == 'left') this._where_to_seek -= 30;
				if (side == 'right') this._where_to_seek += 30;
				if (this._where_to_seek < 0) this._where_to_seek = 0;
				if (this._where_to_seek > (this.data.max_seek || this.duration)) this._where_to_seek = this.duration;
				this.showSeek(this._where_to_seek);
			} else {
				TVButton.prototype.oncursor.call(this.buttons.timeline, side);
			}
		}.bind(this);

		var strip_el = TV.el('[data-id="player_control_strip"]', this.buttons.timeline.el);
		strip_el.onclick = function(e) {
			var x = e.offsetX == undefined ? e.layerX : e.offsetX;
			this.seek(x / TV.getSize(strip_el).width * this.duration, true);
			if (this.state != 'play') this.play();
			e.stopPropagation();
		}.bind(this);
	} else {
		this.buttons.live_strip.onclick = function() {
			if (TV.platform.isPhilips) {
				this.stop();
				this.video.url = this.getNewUrl(this.video.url);
				this.play();
			} else {
				this.stop();
				this.play();
			}
		}.bind(this);
	}

	this.buttons.close.onclick = function() {
		this.buttons._act_btn = null;
		this.stop();
		setTimeout(function() {
			TV.app.onKeyBack();
		}, 200);
	}.bind(this);

	// ловим движении мышки
	this._onmousemove = function() {
		this.stopInactive();
	}.bind(this);

	document.addEventListener('mousemove', this._onmousemove, false);
};

// ловим кнопки
TVComponents.Player.prototype.onAnyKey = function(key_code) {
	//TV.log('onAnyKey', key_code,  this._hidden_panel)
	// если идет отсчет неактивности - начинаем его с начала
	if (this._inactive_timer && this.state == 'play' && !this._hidden_panel) this.startInactive();
	// если панель скрыта - запоминаем это и показываем
	var hidden_panel = this._hidden_panel;
	if (hidden_panel) this.stopInactive();
	if (key_code == TV.keys.play) {
		if (this.state != 'play') this.buttons.play.onmouseclick();
	} else if (key_code == TV.keys.pause) {
		if (this.state == 'play') this.buttons.play.onmouseclick();
	} else if (key_code == TV.keys.stop) {
		this.buttons.stop.onmouseclick();
	} else if (key_code == TV.keys.rw) {
		this.btnProcessSeek(-1);
	} else if (key_code == TV.keys.ff) {
		this.btnProcessSeek(1);
	} else if (key_code == TV.keys.return) {
		if (this.hide_panel) {
			return;
		} else {
			if (hidden_panel) return false;
			this.buttons.close.onmouseclick();
			return false;
		}
		
	}
	if (hidden_panel && !this.inactive_without_action) return false;
};

TVComponents.Player.prototype.btnProcessSeek = function(direction) {
	if (this._where_to_seek === null && this.state != 'play' || this.buffering) return;
	TV.show('[data-id="player_loader"]', this.el);
	if (this.state == 'play') this.pause();
	if (this._where_to_seek === null) this._where_to_seek = this.curr_time;
	if (this._seek_direction != direction) {
		this._seek_direction = direction;
		this._seek_step = 0;
	}
	// ускорение
	var step = 20;
	if (this._seek_step > 12) {
		step = 90;
	} else if (this._seek_step > 8) {
		step = 60;
	} else if (this._seek_step > 4) {
		step = 40;
	}
	
	this._where_to_seek += step * direction;
	if (this._where_to_seek >= (this.data.max_seek || this.duration)) {
		this._where_to_seek = this.data.max_seek || this.duration;
	} else if (this._where_to_seek <= 0) {
		this._where_to_seek = 0;
	} else {
		this._seek_step += 1;
	}
	TV.log('btnProcessSeek', direction, step, this._seek_step, this._where_to_seek);
	this.stopInactive();
	this.showSeek(this._where_to_seek);
	TV.setHTML('[data-id="player_control_time_cur"]', this.formatTime(this._where_to_seek), this.el);
	
	if (this._seek_timer) clearTimeout(this._seek_timer);
	this._seek_timer = setTimeout(function() {
		this.seek(this._where_to_seek);
		this.hideSeek(true);
		this.updateTimeline();
		if (this.state != 'play') this.play();
		this._where_to_seek = null;
		this._seek_direction = null;
		this._seek_step = null;
		this._seek_timer = null;
		TV.hide('[data-id="player_loader"]', this.el);
	}.bind(this), 700);
};

// видео объект получил метаданные
TVComponents.Player.prototype.onvideoready = function() {
	this.duration = this.data.duration ? this.data.duration : this.video.getDuration() / 1000;
	this._videoready = true;
	if (this.duration == -1) {
		
	}
	TV.log('onvideoready, set duration='+this.duration+', stream duration='+this.video.getDuration()/1000);

	if (!this.data.seek) {
        TV.log('on onvideoready stateChange to', this.state);
        this.stateChange(this.state);
    }
};

// буферизация началась(0), закончилась(100), продолжается (прогресс)
TVComponents.Player.prototype.onvideobuffering = function(val) {
	//TV.log('onvideobuffering', val);
	if (val == 100) {
		if (this.buffering) {
			this.buffering = false;
			TV.hide('[data-id="player_loader"]', this.el);
			TV.removeClass(this.el, 'player_buffering');
			if (this._play_after_buffering) {
				this._play_after_buffering = false;
				this.play();
			} else if (this._stop_after_buffering){
				this._stop_after_buffering = false;
				this.stop();
			}
		}
	} else {
		this.buffering = true;
		TV.show('[data-id="player_loader"]', this.el);
		TV.addClass(this.el, 'player_buffering');
	}
};

// прогресс проигрывания
TVComponents.Player.prototype.onvideoprogress = function(time) {
	TV.log('onvideoprogress', time);
	if (this.buffering) this.onvideobuffering(100);
	if (this._show_seek) this.hideSeek();
	if (this.state == 'stop') return;
	if (this.state == 'play' && time == 4294966) return;
	if (this.data.seek && !this._data_seek) {
		TV.log('Auto seek to', this.data.seek, ' the state is', this.state);
		this._data_seek = true;
		// pause-sleep-seek позволяет избежать зависания при автоперемотке с начала ролика
		setTimeout( function() {
			this.pause();
			setTimeout( function() {
				TV.log('Timeout on auto seek. Now the state is', this.state);
				this.seek(this.data.seek);
				this.play();
			}.bind(this), TV.platform.isPhilips ? 500 : 1000);
			this.stateChange(this.state);
			this.updateTimeline();
		}.bind(this), TV.platform.isPhilips ? 1000 : 0);
		return;
	}

	this.curr_time = (this.data.base_time || 0) + time / 1000;
	if (!this.isLive()) {
		this.updateTimeline();
		var end_time = (TV.platform.isLG || TV.platform.isWebOs) ? this.duration-0.99 : this.duration;
		if (this.curr_time > 0 && this.duration > 0 && this.curr_time >= end_time) {
			TV.log('force stop', this.state);
			this.stop();
			this.onend && this.onend();
		}
	}
	if (!this._inactive_timer && this.state == 'play' && !this._hidden_panel) this.startInactive();
};

// ошибка при проигрывании
TVComponents.Player.prototype.onvideoerror = function(error) {
	TV.log('onvideoerror', error);
	if (!TV.el('[data-id="player_error"]', this.el)) return;
	TV.show('[data-id="player_error"]', this.el);
	TV.setHTML('[data-id="player_error"]', error || 'Ошибка', this.el);
	TV.hide('[data-id="player_loader"]', this.el);
	TV.removeClass(this.el, 'player_buffering');
	if (this.state != 'stop') this.stop();
	this.stopInactive();
};

TVComponents.Player.prototype.play = function() {
	TV.log('play', this.state, this.data.url, this.data.base_time);
	if (this._where_to_seek !== null) this._where_to_seek = null;
	if (this.buffering) {
		this._play_after_buffering = true;
		return;
	}
	TV.removeClass(this.buttons.play.el, TVComponents.Player.btn_play_class);
	TV.addClass(this.buttons.play.el, TVComponents.Player.btn_pause_class);
	if (this.state == 'stop') {
		this.stateChange('play');
		this.data = this._data_fn();
		this.video.url = this.data.url;
		this.curr_time = this.data.base_time || 0;
		// обновляем таймлайн
		this.updateTimeline();
		// лоадер
		TV.show('[data-id="player_loader"]', this.el);
		TV.addClass(this.el, 'player_buffering');
		// запускаем
		this.buffering = true;
		this.video.play();
	} else if (this.state == 'pause') {
		this.stateChange('play');
		this.video.resume();
	}
	// выключаем скринсервер
	this.video.setScreenSaverOff();
};

TVComponents.Player.prototype.pause = function() {
	TV.log('pause', this.data.allow_pause);
	if (! this.data.allow_pause) return;
	if (this.buffering) return;
	this.stateChange('pause');
	this.video.pause();
	TV.addClass(this.buttons.play.el, TVComponents.Player.btn_play_class);
	TV.removeClass(this.buttons.play.el, TVComponents.Player.btn_pause_class);
	this.stopInactive();
	this.video.setScreenSaverON();
};

TVComponents.Player.prototype.stop = function() {
	TV.log('stop', this.state);
	TV.hide('[data-id="player_loader"]', this.el);
	if (this.state == 'stop') return;
	TV.addClass(this.buttons.play.el, TVComponents.Player.btn_play_class);
	TV.removeClass(this.buttons.play.el, TVComponents.Player.btn_pause_class);
	this._where_to_seek = null;
	this.hideSeek(true);
	this.stopInactive();
	if (this.buffering) {
		this._stop_after_buffering = true;
	} else {
		this.stateChange('stop');
		this.video.stop();
		this.curr_time = 0;
		this.updateTimeline();
		this.video.setScreenSaverON();
	}
};

TVComponents.Player.prototype.seek = function(seek_time, show) {
	TV.log('seek', 'allow_seek='+this.data.allow_seek, 'seek_time='+seek_time, 'max_seek='+(this.data.max_seek || this.duration));
	if (! this.data.allow_seek) return;
	if (seek_time < 0) seek_time = 0;
	var max_seek = this.data.max_seek || this.duration;
	if (max_seek && seek_time > max_seek) seek_time = max_seek;
	if (this.buffering || seek_time == this.curr_time) return;
	if (show) this.showSeek(seek_time);
	this.video.seek(seek_time*1000);
	this.curr_time = seek_time;
};

TVComponents.Player.prototype.showSeek = function(seek_time) {
	TV.show('[data-id="player_loader"]', this.el);
	this._show_seek = new Date()/1;
	var el_seek = TV.el('[data-id="player_control_strip_seek"]', this.el);
	var el_time = TV.el('[data-id="player_control_strip_time"]', this.el);
	if (seek_time > this.curr_time) {
		var seek_width = (seek_time - this.curr_time) * 100 / this.duration;
		var seek_left = this.curr_time*100 / this.duration;
		var time_left = seek_left + seek_width;
	} else {
		var seek_width = (this.curr_time - seek_time) * 100 / this.duration;
		var seek_left = seek_time*100 / this.duration;
		var time_left = seek_left;
	}
	TV.show(el_seek);
	TV.show(el_time);
	el_seek.style.left = seek_left.toFixed(2) + '%';
	el_seek.style.width = seek_width.toFixed(2) + '%';
	el_time.style.left = time_left.toFixed(2) + '%';
	TV.setHTML(el_time, this.formatTime(seek_time));
};

TVComponents.Player.prototype.hideSeek = function(force) {
	if (this._show_seek && new Date()/1 - this._show_seek > this.seek_show_time || force) {
		TV.hide('[data-id="player_control_strip_seek"]', this.el);
		TV.hide('[data-id="player_control_strip_time"]', this.el);
		TV.hide('[data-id="player_loader"]', this.el);
		this._show_seek = null;
	}
};

TVComponents.Player.prototype.updateTimeline = function() {
    //TV.log('updateTimeline', this.curr_time);
	if (this.isLive()) return;
	if (!TV.el('[data-id="player_control_time_cur"]', this.el)) return;
	TV.setHTML('[data-id="player_control_time_cur"]', this.formatTime(this.curr_time), this.el);
	TV.setHTML('[data-id="player_control_time_total"]', this.formatTime(this.duration), this.el);
	TV.el('[data-id="player_control_strip_fill"]', this.el).style.width = (this.curr_time*100 / this.duration).toFixed(2) + '%';
};

TVComponents.Player.prototype.formatTime = function(val) {
	var timeHour = Math.floor(val/3600);
	var timeMinute = Math.floor((val%3600)/60);
	var timeSecond = Math.floor(val%60);
	timeHour = timeHour < 10 ? "0" + timeHour : timeHour;
	timeMinute = timeMinute < 10 ? "0" + timeMinute : timeMinute;
	timeSecond = timeSecond < 10 ? "0" + timeSecond : timeSecond;
	return timeHour+':'+timeMinute+':'+timeSecond;
};

// начать отсчет времени неактивности до скрытия панели
TVComponents.Player.prototype.startInactive = function() {
	TV.log('startInactive');
	if (this._inactive_timer) clearTimeout(this._inactive_timer);
	this._inactive_timer = setTimeout(function() {
		this._inactive_timer = null;
		this._hidden_panel = true;
		TV.log('hide panel');
		TV.addClass('[data-id="player_panel"]', TVComponents.Player.hidden_panel_class, this.el);
	}.bind(this), this.inactive_time);
};

// выйти из состояния неактивности и показать панель
TVComponents.Player.prototype.stopInactive = function() {
	if (!this._hidden_panel) return;
	TV.log('stopInactive and show panel');
	TV.removeClass('[data-id="player_panel"]', TVComponents.Player.hidden_panel_class, this.el);
	this._hidden_panel = false;
};
