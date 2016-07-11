TV.keys = {};
if (TV.platform.isTizen) {
	TV.keys.left = 37;
	TV.keys.right = 39;
	TV.keys.up = 38;
	TV.keys.down = 40;
	TV.keys.enter = 13;
	TV.keys.exit = 10182;
	TV.keys.return = 10009;
	window.addEventListener('load', function() {
		var map_keys = {};
		tizen.tvinputdevice.getSupportedKeys().forEach(function(key) {
			map_keys[key.name] = key.code;
		});
		var register = [
			'ColorF0Red',
			'ColorF1Green',
			'ColorF2Yellow',
			'ColorF3Blue',
			'MediaPlay',
			'MediaPause',
			'MediaStop',
			'MediaRewind',
			'MediaFastForward',
			'Tools',
			'1',
			'2',
			'3',
			'4',
			'5',
			'6',
			'7',
			'8',
			'9',
			'0',
			'ChannelUp',
			'ChannelDown',
			'VolumeUp',
			'VolumeDown',
			'VolumeMute'
		];
		register.forEach(function(name) {
			tizen.tvinputdevice.registerKey(name);
		});
		TV.keys.green = map_keys['ColorF1Green'];
		TV.keys.red = map_keys['ColorF0Red'];
		TV.keys.yellow = map_keys['ColorF2Yellow'];
		TV.keys.blue = map_keys['ColorF3Blue'];
		TV.keys.play = map_keys['MediaPlay'];
		TV.keys.pause = map_keys['MediaPause'];
		TV.keys.stop = map_keys['MediaStop'];
		TV.keys.rw = map_keys['MediaRewind'];
		TV.keys.rw_ = map_keys['MediaRewind'];
		TV.keys.ff = map_keys['MediaFastForward'];
		TV.keys.ff_ = map_keys['MediaFastForward'];
		TV.keys.tools = map_keys['Tools'];
		TV.keys.num_1 = map_keys['1'];
		TV.keys.num_2 = map_keys['2'];
		TV.keys.num_3 = map_keys['3'];
		TV.keys.num_4 = map_keys['4'];
		TV.keys.num_5 = map_keys['5'];
		TV.keys.num_6 = map_keys['6'];
		TV.keys.num_7 = map_keys['7'];
		TV.keys.num_8 = map_keys['8'];
		TV.keys.num_9 = map_keys['9'];
		TV.keys.num_0 = map_keys['0'];
		TV.keys.ch_next = map_keys['ChannelUp'];
		TV.keys.ch_prev = map_keys['ChannelDown'];
		TV.keys.vol_up = map_keys['VolumeUp'];
		TV.keys.vol_down = map_keys['VolumeDown'];
		TV.keys.vol_mute = map_keys['VolumeMute'];
	}, 1000);
} else if (TV.platform.isSamsung) {
	if (!TV.key_api) TV.key_api = new Common.API.TVKeyValue();
	TV.keys.exit = TV.key_api.KEY_EXIT;
	TV.keys.left = TV.key_api.KEY_LEFT;
	TV.keys.right = TV.key_api.KEY_RIGHT;
	TV.keys.up = TV.key_api.KEY_UP;
	TV.keys.down = TV.key_api.KEY_DOWN;
	TV.keys.enter = TV.key_api.KEY_ENTER;
	TV.keys.green = TV.key_api.KEY_GREEN;
	TV.keys.red = TV.key_api.KEY_RED;
	TV.keys.yellow = TV.key_api.KEY_YELLOW;
	TV.keys.blue = TV.key_api.KEY_BLUE;
	TV.keys.play = TV.key_api.KEY_PLAY;
	TV.keys.pause = TV.key_api.KEY_PAUSE;
	TV.keys.stop = TV.key_api.KEY_STOP;
	TV.keys.rw = TV.key_api.KEY_RW;
	TV.keys.rw_ = TV.key_api.KEY_REWIND_;
	TV.keys.ff = TV.key_api.KEY_FF;
	TV.keys.ff_ = TV.key_api.KEY_FF_;
	TV.keys.return = TV.key_api.KEY_RETURN;
	TV.keys.tools = TV.key_api.KEY_TOOLS;
	TV.keys.num_1 = TV.key_api.KEY_1;
	TV.keys.num_2 = TV.key_api.KEY_2;
	TV.keys.num_3 = TV.key_api.KEY_3;
	TV.keys.num_4 = TV.key_api.KEY_4;
	TV.keys.num_5 = TV.key_api.KEY_5;
	TV.keys.num_6 = TV.key_api.KEY_6;
	TV.keys.num_7 = TV.key_api.KEY_7;
	TV.keys.num_8 = TV.key_api.KEY_8;
	TV.keys.num_9 = TV.key_api.KEY_9;
	TV.keys.num_0 = TV.key_api.KEY_0;
	TV.keys.ch_next = TV.key_api.KEY_CH_UP;
	TV.keys.ch_prev = TV.key_api.KEY_CH_DOWN;
	TV.keys.vol_up = TV.key_api.KEY_VOL_UP;
	TV.keys.vol_down = TV.key_api.KEY_VOL_DOWN;
	TV.keys.vol_mute = TV.key_api.KEY_MUTE;
} else if (TV.platform.isLG || TV.platform.isWebOs) {
	TV.keys.exit = -1;
	TV.keys.left = 37;
	TV.keys.right = 39;
	TV.keys.up = 38;
	TV.keys.down = 40;
	TV.keys.enter = 13;
	TV.keys.green = 404;
	TV.keys.red = 403;
	TV.keys.yellow = 405;
	TV.keys.blue = 406;
	TV.keys.play = 415;
	TV.keys.pause = 19;
	TV.keys.stop = 413;
	TV.keys.rw = 412;
	TV.keys.rw_ = 412;
	TV.keys.ff = 417;
	TV.keys.ff_ = 417;
	TV.keys.return = 461;
	TV.keys.tools = 457;
	TV.keys.num_1 = 49;
	TV.keys.num_2 = 50;
	TV.keys.num_3 = 51;
	TV.keys.num_4 = 52;
	TV.keys.num_5 = 53;
	TV.keys.num_6 = 54;
	TV.keys.num_7 = 55;
	TV.keys.num_8 = 56;
	TV.keys.num_9 = 57;
	TV.keys.num_0 = 48;
	if (TV.platform.isLG || /537/.test(navigator.appVersion)) {
		// webOS 1.* or NetCast
		TV.keys.ch_next = 33;
		TV.keys.ch_prev = 34;
	} else {
		// webOS 2.*
		TV.keys.ch_next = 70;
		TV.keys.ch_prev = 71;
	}
	TV.keys.vol_up = -1; 		// webOS и NetCast не дают работать с 
	TV.keys.vol_down = -1;	// кнопками громкости
	TV.keys.vol_mute = -1;
} else if (TV.platform.isPhilips) {
	TV.keys.exit = -1;
	TV.keys.left = VK_LEFT;
	TV.keys.right = VK_RIGHT;
	TV.keys.up = VK_UP;
	TV.keys.down = VK_DOWN;
	TV.keys.enter = VK_ENTER;
	TV.keys.green = VK_GREEN;
	TV.keys.red = VK_RED;
	TV.keys.yellow = VK_YELLOW;
	TV.keys.blue = VK_BLUE;
	TV.keys.play = VK_PLAY;
	TV.keys.pause = VK_PAUSE;
	TV.keys.stop = VK_STOP;
	TV.keys.rw = VK_REWIND;
	TV.keys.rw_ = VK_REWIND;
	TV.keys.ff = VK_FAST_FWD;
	TV.keys.ff_ = VK_FAST_FWD;
	TV.keys.return = VK_BACK;
	TV.keys.tools = 457;
	TV.keys.num_1 = VK_1;
	TV.keys.num_2 = VK_2;
	TV.keys.num_3 = VK_3;
	TV.keys.num_4 = VK_4;
	TV.keys.num_5 = VK_5;
	TV.keys.num_6 = VK_6;
	TV.keys.num_7 = VK_7;
	TV.keys.num_8 = VK_8;
	TV.keys.num_9 = VK_9;
	TV.keys.num_0 = VK_0;
	TV.keys.ch_next = VK_PAGE_UP;
	TV.keys.ch_prev = VK_PAGE_DOWN;
	TV.keys.vol_up = -1; 		// Филипс не даёт работать с
	TV.keys.vol_down = -1;	// кнопками громкости
	TV.keys.vol_mute = -1;
} else if (TV.platform.isBrowser) {
	TV.keys.exit = 27;   //esc
	TV.keys.left = 37;
	TV.keys.right = 39;
	TV.keys.up = 38;
	TV.keys.down = 40;
	TV.keys.enter = 13;
	TV.keys.green = 71;  //g
	TV.keys.red = 82;    //r
	TV.keys.yellow = 89; //y
	TV.keys.blue = 66;   //b
	TV.keys.play = 188;  //<
	TV.keys.pause = 190; //>
	TV.keys.stop = 191;  //?
	TV.keys.rf = 186;    //;
	TV.keys.rf_ = 186;    //;
	TV.keys.ff = 222;    //'
	TV.keys.ff_ = 222;    //'
	TV.keys.return = 8;
	TV.keys.tools = 84;  //t
	TV.keys.num_1 = 97;
	TV.keys.num_2 = 98;
	TV.keys.num_3 = 99;
	TV.keys.num_4 = 100;
	TV.keys.num_5 = 101;
	TV.keys.num_6 = 102;
	TV.keys.num_7 = 103;
	TV.keys.num_8 = 104;
	TV.keys.num_9 = 105;
	TV.keys.num_0 = 96;
	TV.keys.ch_next = 33;
	TV.keys.ch_prev = 34;
	TV.keys.vol_up = 107; // Num+
	TV.keys.vol_down = 109; // Num-
	TV.keys.vol_mute = 111; // Num/
};
