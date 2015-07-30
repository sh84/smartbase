TVComponents.ClassSlider = function(el, adjacent_buttons, parent, class_name) {
	TVComponents.Slider.call(this, el, adjacent_buttons, parent, class_name);
	if (this.count % 2 == 0) throw 'The data-count of ClassSlider must not be even.';
	this.dynamic = true;
	this.template = 'Slider';
	this.container_move = false;
	this.movie_on_all = true;
	this.start_for_dynamic = -Math.floor(this.count/2);
	this.set_positions = this.attributes['positions'] ? true : false; // расчитывать позиции автоматически
	this.distance = this.attributes['distance'] ?  this.attributes['distance']/1 : 40; // расстояние между элементами
};
TVComponents.ClassSlider.prototype = Object.create(TVComponents.Slider.prototype);
TVComponents.ClassSlider.prev_class = 'slider-item slider-item_prev-';
TVComponents.ClassSlider.middle_class = 'slider-item slider-item_middle';
TVComponents.ClassSlider.next_class = 'slider-item slider-item_next-';

TVComponents.ClassSlider.prototype.onready = function() {
	TVComponents.Slider.prototype.onready.call(this);
	if (this.set_positions) this._setPositions();
	this._setClasses();
};

TVComponents.ClassSlider.prototype._movie = function(is_first) {
	TVComponents.Slider.prototype._movie.call(this, is_first);
	if (this.set_positions) this._setPositions();
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

TVComponents.ClassSlider.prototype._setPositions = function() {
	var els = this.container_el.children;
	var middle_index = (els.length-1)/2;
	var middle_pos = this.is_horizontal ? TV.getSize(this.container_el).width/2 - TV.getSize(els[middle_index]).width/2 : 
		TV.getSize(this.container_el).height/2 - TV.getSize(els[middle_index]).height/2;
	// ставим позицию после, каждый раз равную позиции последнего + его размеру + distance
	var last_pos = middle_pos;
	for(var j = middle_index; j < els.length; j++) {
		if (this.is_horizontal) {
			els[j].style.left = last_pos + 'px';
			last_pos += TV.getSize(els[j]).width + this.distance;
		} else {
			els[j].style.top = last_pos + 'px';
			last_pos += TV.getSize(els[j]).height + this.distance;
		}
	}
	// ставим позицию до, равную позиции последнего -distance - размер самого элемента 
	var prev_pos = middle_pos;
	for(var k = middle_index-1; k >= 0; k--) {
		if (this.is_horizontal) {
			prev_pos -= TV.getSize(els[k]).width + this.distance;
			els[k].style.left = prev_pos + 'px';
		} else {
			prev_pos -= TV.getSize(els[k]).height + this.distance;
			els[k].style.left = prev_pos + 'px';
		}
	}
};