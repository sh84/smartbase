TVComponents.GridSlider = function(el, adjacent_buttons, parent, class_name) {
	TVComponents.Slider.call(this, el, adjacent_buttons, parent, class_name);
	var r = (this.attributes['box'] || '').match(/(\d+)x(\d+)/);
	if (!r) throw 'The data-bax of GridSlider must be like 2x5.';
	this.box_x = r[1]*1;
	this.box_y = r[2]*1;
	this.box = [];

	this.count = this.box_x * this.box_y;
	this.dynamic = false;
	this.loop = false;
	this.container_move = false;
	this.template = 'Slider';
};
TVComponents.GridSlider.prototype = Object.create(TVComponents.Slider.prototype);

TVComponents.GridSlider.prototype.onready = function() {
	TVComponents.Slider.prototype.onready.call(this);
	if (!this.data || this.data.length == 0) return;
	this._setPositions();
	this._setButtons();
	this.setScrollbar();
};

TVComponents.GridSlider.prototype._movie = function(is_first) {
	if (is_first && this.start_position <= 0) return;
	if (!is_first && this.start_position + this.count >= this.data.length) return;
	this.buttons._hover_btn && this.buttons._hover_btn.onmouseout();
	
	var max = 0, curr = null;
	for (var i=0; i < (this.is_vertical ? this.box_x : this.box_y); i++) {
		var el = is_first ? this.buttons[this.first_btn_id].el.previousElementSibling : this.buttons[this.last_btn_id].el.nextElementSibling;
		// ищем позицию текущей кнопки
		var btn = this.is_vertical ? this.buttons[this.box[is_first ? 0 : this.box_y-1][i]] : this.buttons[this.box[i][is_first ? 0 : this.box_x-1]];
		if (btn && this.buttons._hover_btn && this.buttons._hover_btn.id == btn.id) curr = i;
		// удаляем вышедшую за видимые границы линию
		btn = this.is_vertical ? this.buttons[this.box[is_first ? this.box_y-1: 0][i]] : this.buttons[this.box[i][is_first ? this.box_x-1: 0]];
		if (btn) {
			btn.el.removeAttribute('data-type');
			btn.remove();
		}
		// обновляем вошедшию линию до кнопок
		if (el) {
			var size = TV.getSize(el);
			this._makeBtn(el, is_first);
			if (this.is_vertical && max < size.height) max = size.height;
			if (this.is_horizontal && max < size.width) max = size.width;
		}
	}
	if (this.is_vertical) {
		this.start_position += is_first ? -this.box_x : this.box_x;	
	} else {
		this.start_position += is_first ? -this.box_y : this.box_y;
	}
	this._setButtons();

	// сдвигаем контейнер
	var pos = parseInt(this.is_vertical ? this.container_el.style.top : this.container_el.style.left) || 0;
	pos += is_first ? max : -max;
	if (this.is_vertical) {
		this.container_el.style.top = pos + 'px';
	} else {
		this.container_el.style.left = pos + 'px';
	}

	// фиксируем переход
	/*if (curr != null) {
		if (this.is_vertical) {
			var x = curr;
			var y = is_first ? 0 : this.box_y-1;
			do {
				var btn = this.buttons[this.box[y][x]];
				x -= 1;
			} while (!btn);
			this.buttons._hover_btn[is_first ? 'up' : 'down'] = btn.id;
		} else {
			var x = is_first ? 0 : this.box_x-1;
			var y = curr;
			do {
				var btn = this.buttons[this.box[y][x]];
				y -= 1;
			} while (!btn);
			this.buttons._hover_btn[is_first ? 'left' : 'right'] = btn.id;
		}
	}*/
	
	this.updateNavButtons();
};

TVComponents.GridSlider.prototype._setPositions = function() {
	if (this.not_use_positions) return;
	// проставляем позицию
	var els = TV.find('* > .slider-item', this.container_el);
	if (els.length == 0) return;
	for (var i=0; i < els.length; i++) {
		var prev_el_x, prev_el_y;
		if (this.is_vertical) {
			prev_el_x = i % this.box_x == 0 ? null : els[i-1];
			prev_el_y = i < this.box_x ? null : els[i-this.box_x];
		} else {
			prev_el_x = i < this.box_y ? null : els[i-this.box_y];
			prev_el_y = i % this.box_y == 0 ? null : els[i-1];
		}
		var left = prev_el_x ? (parseInt(prev_el_x.style.left) || 0) + TV.getSize(prev_el_x).width : 0;
		var top = prev_el_y ? (parseInt(prev_el_y.style.top) || 0) + TV.getSize(prev_el_y).height : 0;
		els[i].style.left = left+'px';
		els[i].style.top = top+'px';
	}
};

TVComponents.GridSlider.prototype._setButtons = function() {
	this.box = [];
	var els = TV.find('* > [data-type="component"]', this.container_el);
	if (els.length == 0) return;
	var x = 0, y = 0;
	for (var i=0; i < els.length; i++) {
		if (!this.box[y]) this.box[y] = [];
		this.box[y][x] = els[i]._attributes.id;
		if (this.is_vertical) {
			x += 1;
		} else {
			y += 1;
		}
		if (this.is_vertical && x == this.box_x) {
			x = 0;
			y += 1;
		} else if (this.is_horizontal && y == this.box_y) {
			x += 1;
			y = 0;
		}
	}
	this.first_btn_id = els[0]._attributes.id;
	this.last_btn_id = els[els.length-1]._attributes.id;
	for (y = 0; y < this.box_y; y++) {
		for (x = 0; x < this.box_x; x++) {
			var btn = this.buttons[this.box[y][x]];
			if (!btn) continue;
			btn.up = y > 0 && this.box[y-1][x] ? this.box[y-1][x] : 'out';
			btn.down = y < this.box_y-1 && this.box[y+1][x] ? this.box[y+1][x] : 'out';
			btn.left = x > 0 && this.box[y][x-1] ? this.box[y][x-1] : 'out';
			btn.right = x < this.box_x-1 && this.box[y][x+1] ? this.box[y][x+1] : 'out';
			if (this.is_vertical) {
				if (y < this.box_y-1 && btn.down == 'out') btn.down = this.last_btn_id;
			} else {
				if (x < this.box_x-1 && btn.right == 'out') btn.right = this.last_btn_id;
			}
			if (btn[this.first_side] == 'out' && this.start_position > 0) btn[this.first_side] = '';
			if (btn[this.last_side] == 'out' && this.start_position + this.count < this.data.length) btn[this.last_side] = '';
		}
	}
};