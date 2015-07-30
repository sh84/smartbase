TV.PlayerWrapper = function(el) {
	this.url = null;          // урл
	this.onready = null;      // видео готово и доступны его атрибуты
	this.onprogress = null;   // прогресс проигрывания, time в мс
	this.onbuffering = null;  // начало, окончание и прогресс буферизации
	this.onerror = null;      // ошибка воспроизведения

	this.el = TV.el(el);
	if (this.el) TV.PlayerWrapper.video_el = this.el;
	if (TV.platform.isSamsung) {
		if (!this.el) throw 'Not defined video element for player';
		this._body_background = document.body.style.background;
		document.body.style.background = 'none';
	} else if ((TV.platform.isLG || TV.platform.isWebOs) && !this.el) {
		if (!TV.PlayerWrapper.video_el) {
			TV.PlayerWrapper.video_el = document.createElement('object');
			TV.PlayerWrapper.video_el.setAttribute('type', 'application/x-netcast-av');
			document.body.insertBefore(TV.PlayerWrapper.video_el, document.body.firstChild);
		}
		this.el = TV.PlayerWrapper.video_el;
    } else if (TV.platform.isPhilips && !this.el) {
        if (!TV.PlayerWrapper.video_el) {
            TV.PlayerWrapper.video_el = document.createElement('object');
            TV.PlayerWrapper.video_el.setAttribute('type', 'application/vnd.apple.mpegurl');
            document.body.insertBefore(TV.PlayerWrapper.video_el, document.body.firstChild);
        }
        this.el = TV.PlayerWrapper.video_el;
	} else if (!this.el) {
		//'http://c-2-2.videomore.ru/v-12-2/5c/65/5c659bfdd78aa5f9a2d01467648f9f03/5c659bfdd78aa5f9a2d01467648f9f03-q5.mp4?s=Evzmr0UdEXm2KzM9PKccDA&e=1390835341';
		this.el = document.createElement('video');
		document.body.insertBefore(this.el, document.body.firstChild);
	}
	this.attachCallbacks();

    // Двойной seek. Возможно, стоит вынести в отдельный объект
    this._trick_seek_inprogress = false;    // Двойной seek уже начался
    this._trick_seek_position = 0;          // Куда на самом деле нужно перейти
    this._trick_seek_from = 0;              // Откуда переходим
    this._trick_seek_threshold = 5000;      // Допустимая ошибка перехода
};

TV.PlayerWrapper.prototype.attachCallbacks = function() {
	if (TV.platform.isSamsung) {
		this.el.OnStreamInfoReady = function() {
			this.onready && this.onready();
		}.bind(this);
		this.el.OnCurrentPlayTime = function(time) {
			this._curr_time = time;
			this.onprogress && this.onprogress(time);
		}.bind(this);
		var fn_buff = function(val) {
			this.onbuffering && this.onbuffering(val);
		};
		this.el.OnBufferingStart = fn_buff.bind(this, 0);
		this.el.OnBufferingProgress = fn_buff.bind(this);
		this.el.OnBufferingComplete = fn_buff.bind(this, 100);
		var fn_err = function(error) {
			this.onerror && this.onerror(error);
		};
		this.el.OnConnectionFailed = fn_err.bind(this, 'Connection Failed');
		this.el.OnRenderError = fn_err.bind(this, 'Render Error');
		this.el.OnNetworkDisconnected = fn_err.bind(this, 'Network Disconnected');
		this.el.OnStreamNotFound = fn_err.bind(this, 'Stream Not Found');
		this.el.OnServerError = fn_err.bind(this, 'Server Error');
    } else if (TV.platform.isPhilips) {
        var info_ready = false;

        this.el.onPlayStateChange = function() {
            TV.log('onPlayStateChange', this.el.playState, this.el.playTime)
            switch (this.el.playState) {
                case 5: // finished
                    break;
                case 0: // stopped
                    break;
                case 6: // error
                    break;
                case 1: // playing
                    if (this.el.playTime && !info_ready) {
                        TV.log('ready to play', this.el.playTime);
                        if (this.el.playTime < ('1e9' - 1)) {
                            info_ready = true;
                            this.onready && this.onready();
                        } else {
                            this.play();
                        }
                    }
                    break;
                case 2: // paused
                    break;
                case 3: // connecting
                    break;
                case 4: // buffering
                    this.onbuffering && this.onbuffering(0);
                    break;
                default:// do nothing
                    break;
            }
        }.bind(this);
        
        //TV.log(Object.getOwnPropertyNames(this.el).length);

        // Прогресс проигрывания/буфферинга
        this._timer = setInterval(function() {
        
            // Недавно был seek, нужно проверить, правильно ли мы перешли
            if (this._trick_seek_inprogress) {
                this.seek(0); // 0 - чтобы показать, что нужно проверить старый seek, а не делать новый
            }

            // Playing
            if (this.el.playState == 1) {
                //TV.log('_timer this.el.playState == 1', this.el.playState, this.el.playPosition);
                this._curr_time = this.el.playPosition*1;
                this.onprogress && this.onprogress(this.el.playPosition*1);
            }

            // Buffering
            // У филипса нет bufferingProgress. Так и оставлять 50?
            if (this.el.playState == 4) {
                //TV.log('_timer this.el.playState == 4', this.el.playState, this.el.bufferingProgress);
                this.onbuffering && this.onbuffering(this.el.bufferingProgress || 50);
            }
        }.bind(this), 500);

	} else if (TV.platform.isLG || TV.platform.isWebOs || TV.platform.isPhilips) {
		var info_ready = false;
		this.el.onPlayStateChange = function() {
			//TV.log('onPlayStateChange', this.el.playState, this.el.playTime)
			// Playing || Buffering
			if (this.el.playState == 1 && this.el.playTime && !info_ready) {
				info_ready = true;
				this.onready && this.onready();
			}
		}.bind(this);
		this.el.onBuffering = function(isStarted) {
			this.onbuffering && isStarted && this.onbuffering(0);
			this.onbuffering && !isStarted && this.onbuffering(100);
		}.bind(this);
		var errors = {
			0: 'A/V format not supported',
			1: 'Cannot connect to server or connection lost',
			2: 'Unidentified error',
			1000: 'File is not found',
			1001: 'Invalid protocol',
			1002: 'DRM failure',
			1003: 'Play list is empty',
			1004: 'Unrecognized play list',
			1005: 'Invalid ASX format',
			1006: 'Error in downloading play list',
			1007: 'Out of memory',
			1008: 'Invalid URL list format',
			1009: 'Not playable in play list',
			1100: 'Unidentified WM-DRM error',
			1101: 'Incorrect license in local license store',
			1102: 'Fail in receiving correct license from server',
			1103: 'Stored license is expired'
		};
		this.el.onError = function() {
			var error = errors[this.el.error] || this.el.error;
			this.onerror && this.onerror(error);
		}.bind(this);
		this._timer = setInterval(function() {
			// Playing
			if (this.el.playState == 1) {
				//TV.log('_timer', this.el.playState, this.el.playPosition);
				this._curr_time = this.el.playPosition*1;
				this.onprogress && this.onprogress(this.el.playPosition*1);
			}
			// Buffering
			if (this.el.playState == 4) {
				//TV.log('_timer', this.el.playState, this.el.bufferingProgress);
				this.onbuffering && this.onbuffering(this.el.bufferingProgress || 50);
			}
		}.bind(this), 500);
	} else if (TV.platform.isBrowser) {
		this.el.addEventListener('canplay', function() {
			this.onready && this.onready();
			this.onbuffering && this.onbuffering(100);
		}.bind(this));
		this.el.addEventListener('error', function(e) {
			var error = "";
			switch (e.target.error.code) {
				case e.target.error.MEDIA_ERR_ABORTED:
					error = 'You aborted the video playback.';
					break;
				case e.target.error.MEDIA_ERR_NETWORK:
					error = 'A network error caused the video download to fail part-way.';
					break;
				case e.target.error.MEDIA_ERR_DECODE:
					error = 'The video playback was aborted due to a corruption problem or because the video used features your browser did not support.';
					break;
				case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
					error = 'The video could not be loaded, either because the server or network failed or because the format is not supported.';
					break;
				default:
					error = 'An unknown error occurred.';
					break;
			}
			this.onerror && this.onerror(error);
		}.bind(this));

		this.el.addEventListener('timeupdate', function() {
			//TV.log('timeupdate', this.el.currentTime);
			// Playing
			if (this.el.readyState == 4) {
				this._curr_time = this.el.currentTime*1000;
				this.onprogress && this.onprogress(this.el.currentTime*1000);
			}
		}.bind(this));

		this.el.addEventListener('waiting', function() {
			// Buffering
			this.onbuffering && this.onbuffering();
		}.bind(this));

	}
};

TV.PlayerWrapper.prototype._getUrl = function() {
	if (TV.platform.isSamsung) {
		var url = this.url;
		if (~url.indexOf('.m3u8')) {
			if (!~url.indexOf('?')) url += '?hack_param_for_samsung=1';
			url += '|COMPONENT=HLS';
		}
		return url;
	//} else if (TV.platform.isBrowser || TV.platform.isWebOs || TV.platform.isPhilips) {
	//	return 'http://c-2-2.videomore.ru/v-12-2/5c/65/5c659bfdd78aa5f9a2d01467648f9f03/5c659bfdd78aa5f9a2d01467648f9f03-q5.mp4?s=Evzmr0UdEXm2KzM9PKccDA&e=1390835341';
	} else {
		return this.url;
	}
};

TV.PlayerWrapper.prototype.setDisplayArea = function(left, top, width, height) {
	if (TV.platform.isSamsung) {
		this.el.SetDisplayArea(left, top, width, height);
	} else {
		TV.show(this.el);
		this.el.style.left = left+'px';
		this.el.style.top = top+'px';
		this.el.style.width = width+'px';
		this.el.style.height = height+'px';
		TV.log('setDisplayArea', this.el.style.left, this.el.style.top, this.el.style.width, this.el.style.height);
	}
};

TV.PlayerWrapper.prototype.getDuration = function() {
	if (TV.platform.isSamsung) {
		return this.el.GetDuration();
	} else if (TV.platform.isLG || TV.platform.isWebOs || TV.platform.isPhilips) {
        TV.log('this.el.playTime', this.el.playTime);
		return this.el.playTime;
	} else if (TV.platform.isBrowser) {
		return this.el.duration*1000;
	}
};

TV.PlayerWrapper.prototype.play = function() {
    //TV.log('TV.PlayerWrapper.prototype.play');
	if (TV.platform.isSamsung) {
        //TV.log('isSamsung play', this._getUrl());
		this.el.Play(this._getUrl());
	} else if (TV.platform.isLG || TV.platform.isWebOs) {
		this.el.data = this._getUrl();
		this.el.play(1);
    } else if (TV.platform.isPhilips) {
        this.el.stop();
        this.el.data = this._getUrl();
        TV.log('got data this.el.playTime', this.el.playTime);
        this.el.play(1);
        TV.log('this.el.playTime after start', this.el.playTime);
	} else if (TV.platform.isBrowser) {
		this.el.src = this._getUrl();
		this.el.load();
		this.el.play();
	}
};

TV.PlayerWrapper.prototype.pause = function() {
	if (TV.platform.isSamsung) {
		this.el.Pause();
	} else if (TV.platform.isLG || TV.platform.isWebOs || TV.platform.isPhilips) {
		this.el.play(0);
	} else if (TV.platform.isBrowser) {
		this.el.pause();
	}
};

TV.PlayerWrapper.prototype.resume = function() {
	if (TV.platform.isSamsung) {
		this.el.Resume();
	} else if (TV.platform.isLG || TV.platform.isWebOs || TV.platform.isPhilips) {
		this.el.play(1);
	} else if (TV.platform.isBrowser) {
		this.el.play();
	}
};

TV.PlayerWrapper.prototype.stop = function() {
	if (TV.platform.isSamsung) {
		this.el.Stop();
	} else if (TV.platform.isLG || TV.platform.isWebOs || TV.platform.isPhilips) {
		this.el.stop();
	} else if (TV.platform.isBrowser) {
		this.el.pause();
		this.el.currentTime = 0;
	}
};

TV.PlayerWrapper.prototype.seek = function(seek_time) {
	if (TV.platform.isSamsung) {
		var val = seek_time - this._curr_time;
		if (val > 0) {
			this.el.JumpForward(val/1000);
		} else {
			this.el.JumpBackward(Math.abs(val/1000));
		}
	} else if (TV.platform.isLG || TV.platform.isWebOs) {
		this.el.seek(seek_time);
    } else if (TV.platform.isPhilips) {
        if (seek_time > 0 && seek_time < this.el.playTime){
            TV.log('Philips seek to', seek_time);
            this.el.seek(seek_time);
                
            // Выставляем параметры двойного seek-а
            this._trick_seek_inprogress = true;
            this._trick_seek_position = seek_time;
            this._trick_seek_from = this.el.playPosition;
            return;
            
        } else if (this._trick_seek_inprogress && this.el.playPosition > 0){
            // Сейчас находимся в процессе двойного seek-а
            // Второй раз seek делаем, только если не установлен seek_time

            // Seek еще не произошел
            if (Math.abs(this._trick_seek_from - this.el.playPosition) < this._trick_seek_threshold) {
                return;
            }

            var trick_seek_diff = this.el.playPosition - this._trick_seek_position;
            var correct_seek_position = Math.floor(this._trick_seek_position * this._trick_seek_position / this.el.playPosition)
            if (Math.abs(trick_seek_diff) > this._trick_seek_threshold) {
                TV.log('Philips trick seek to ' + correct_seek_position + ' now pos is ' + this.el.playPosition + ' have to be ' + this._trick_seek_position);
                this.el.seek(correct_seek_position);
            }
        }
        
        // В любом случае выходим из двойного seek-а
        this._trick_seek_inprogress = false;        

	} else if (TV.platform.isBrowser ) {
		if (seek_time/1000 < 0 || seek_time/1000 > this.el.duration ) return;
		this.el.currentTime = seek_time/1000;
	}
};

TV.PlayerWrapper.prototype.setScreenSaverON = function() {
	if (TV.platform.isSamsung) {
		TV.plugin_api.setOnScreenSaver();
	} else if (TV.platform.isLG || TV.platform.isWebOs || TV.platform.isPhilips) {
		window.NetCastSetScreenSaver && window.NetCastSetScreenSaver('enabled');
	}
};

TV.PlayerWrapper.prototype.setScreenSaverOff = function() {
	if (TV.platform.isSamsung) {
		TV.plugin_api.setOffScreenSaver();
	} else if (TV.platform.isLG || TV.platform.isWebOs || TV.platform.isPhilips) {
		window.NetCastSetScreenSaver && window.NetCastSetScreenSaver('disabled');
	}
};

// остановка и очистка
TV.PlayerWrapper.prototype.clear = function() {
	if (this._timer) clearInterval(this._timer);
	this.stop();
	var listeners;
	if (TV.platform.isSamsung) {
		document.body.style.background = this._body_background;
		listeners = ['OnCurrentPlayTime','OnStreamInfoReady','OnBufferingProgress','OnBufferingStart','OnBufferingComplete','OnConnectionFailed','OnRenderError','OnNetworkDisconnected','OnStreamNotFound','OnServerError'];
	} else if (TV.platform.isLG || TV.platform.isWebOs) {
		TV.hide(this.el);
		listeners = ['OnCurrentPlayTime','OnStreamInfoReady','OnBufferingProgress','OnBufferingStart','OnBufferingComplete','OnConnectionFailed','OnRenderError','OnNetworkDisconnected','OnStreamNotFound','OnServerError'];
    } else if (TV.platform.isPhilips) {
        TV.hide(this.el);
        listeners = ['onPlayStateChange', '_timer'];
	} else {
		TV.hide(this.el);
		listeners = [];
	}
	listeners.forEach(function(el) { this.el[el] = null; }.bind(this));
};