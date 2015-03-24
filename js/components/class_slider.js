TVComponents.ClassSlider = function(el, adjacent_buttons, parent, class_name) {
	TVComponents.Slider.call(this, el, adjacent_buttons, parent, class_name);
	if (this.count % 2 == 0) throw 'The data-count of ClassSlider must not be even.';
	this.dynamic = true;
	this.template = 'Slider';
	this.container_move = false;
	this.movie_on_all = true;
	this.start_for_dynamic = -Math.floor(this.count/2);
};
TVComponents.ClassSlider.prototype = Object.create(TVComponents.Slider.prototype);
TVComponents.ClassSlider.prev_class = 'slider-item slider-item_prev-';
TVComponents.ClassSlider.middle_class = 'slider-item slider-item_middle';
TVComponents.ClassSlider.next_class = 'slider-item slider-item_next-';

TVComponents.ClassSlider.prototype.onready = function() {
	TVComponents.Slider.prototype.onready.call(this);
	this._setClasses();
};

TVComponents.ClassSlider.prototype._movie = function(is_first) {
	TVComponents.Slider.prototype._movie.call(this, is_first);
	this._setClasses();
	return true;
};

TVComponents.ClassSlider.prototype._setClasses = function() {
	var els = this.container_el.children;
	for (var i=0; i < els.length; i++) {
		var cl = TVComponents.ClassSlider.middle_class;
		if (i < 1 - this.start_for_dynamic) cl = TVComponents.ClassSlider.prev_class+(1 - i - this.start_for_dynamic);
		if (i > 1 - this.start_for_dynamic) cl = TVComponents.ClassSlider.next_class+(-1 + i + this.start_for_dynamic);
		els[i].className = cl;
	}
	for (var n in this.buttons) {
		if (this.buttons[n].el.className.indexOf(TVComponents.ClassSlider.middle_class) > -1) {
			this.buttons[n].el.onmouseover();
			break;
		}
	}
};