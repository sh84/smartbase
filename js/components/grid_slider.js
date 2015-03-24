TVComponents.GridSlider = function(el, adjacent_buttons, parent, class_name) {
	TVComponents.Slider.call(this, el, adjacent_buttons, parent, class_name);
	var r = (this.attributes['box'] || '').match(/(\d+)x(\d+)/);
	if (!r) throw 'The data-bax of GridSlider must be like 2x5.';
	this.box_x = r[1]*1;
	this.box_y = r[2]*1;
	this.box = [];

	this.count = this.box_x * this.box_y;
	this.direction = 'vertical';
	this.first_side = 'up';
	this.last_side = 'down';
	this.is_vertical = true;
	this.is_horizontal = false;
	this.dynamic = false;
	this.container_move = false;
	this.template = 'Slider';
	this.scrollbar = this.attributes['scrollbar'] ? true : false;
};
TVComponents.GridSlider.prototype = Object.create(TVComponents.Slider.prototype);

TVComponents.GridSlider.prototype.onready = function() {
	TVComponents.Slider.prototype.onready.call(this);
	if (!this.data || this.data.length == 0) return;
	this._setButtons();
	this.setScrollbar();
};

TVComponents.GridSlider.prototype._movie = function(is_first) {
	if (is_first && this.start_position <= 0) return;
	if (!is_first && this.start_position + this.count >= this.data.length) return;
	this.buttons._hover_btn && this.buttons._hover_btn.onmouseout();
	var max_height = 0, curr_x = null;
	for (var x=0; x < this.box_x; x++) {
		var el = is_first ? this.buttons[this.first_btn_id].el.previousElementSibling : this.buttons[this.last_btn_id].el.nextElementSibling;
		// ищем x текущей кнопки
		var btn = this.buttons[this.box[is_first ? 0 : this.box_y-1][x]];
		if (btn && this.buttons._hover_btn && this.buttons._hover_btn.id == btn.id) curr_x = x;
		// удаляем вышедшую за видимые границы линию
		btn = this.buttons[this.box[is_first ? this.box_y-1: 0][x]];
		if (btn) {
			btn.el.removeAttribute('data-type');
			btn.remove();
		}
		// обновляем вошедшию линию до кнопок
		if (el) {
			var size = TV.getSize(el);
			this._makeBtn(el, is_first);
			if (max_height < size.height) max_height = size.height;
		}
	}
	this.start_position += is_first ? -this.box_x : this.box_x;
	this._setButtons();

	// сдвигаем контейнер
	var container_top = parseInt(this.container_el.style.top) || 0;
	container_top += is_first ? max_height : -max_height;
	this.container_el.style.top = container_top + 'px';

	// фиксируем переход
	if (curr_x != null) {
		var y = is_first ? 0 : this.box_y-1;
		var x = curr_x;
		do {
			var btn = this.buttons[this.box[y][x]];
			x -= 1;
		} while (!btn);

		this.buttons._hover_btn[is_first ? 'up' : 'down'] = btn.id;
	}
};

TVComponents.GridSlider.prototype._setButtons = function() {
	var els = TV.find('[data-type="button"]', this.container_el);
	if (els.length == 0) return;
	var x = 0, y = 0;
	for (var i=0; i < els.length; i++) {
		if (x == 0) this.box[y] = [];
		this.box[y][x] = els[i]._attributes.id;
		x += 1;
		if (x == this.box_x) {
			x = 0;
			y += 1;
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
			if (btn.up == 'out' && this.start_position > 0) btn.up = '';
			if (btn.down == 'out' && this.start_position + this.count < this.data.length) btn.down = '';
		}
	}
};