TVComponents.Scroller = function(el, adjacent_buttons, parent, class_name) {
	TVComponent.call(this, el, adjacent_buttons, parent, class_name);
	this.direction = this.attributes['direction'];
	this.is_vertical = this.direction == 'vertical';
	this.is_horizontal = !this.is_vertical;
	this.step = this.attributes['step'] * 1;
	this.nav_buttons = this.attributes['nav_buttons'] ? true : false;
	this.count = 0;
	this.container = null;
	this.frame_el = null
};
TVComponents.Scroller.container_class = 'slider-items';
TVComponents.Scroller.prototype = Object.create(TVComponent.prototype);

TVComponents.Scroller.prototype.getScrollerText = function() {
	var name = (TV.app.curr_popup) ? TV.app.curr_popup.name : TV.app.curr_page.name;
	var ejs_path = 'text#' + name + '.' + this.id;
	if (!TV.app.ejs[ejs_path]) throw 'Not defined template ' + ejs_path + ' for component ' + this.id;
	return TV.app.ejs[ejs_path]();
};

TVComponents.Scroller.prototype._initScrollbarButtons = function() {
	var make_btn = function(selector, is_first) {
		var el = TV.el(selector, this.el);
		if (el) {
			el.setAttribute('data-type', 'button');
			new TVButton(el, this.buttons, this).onclick = function() {
				this._move(is_first, this.container);
				this.setScrollbar();
			}.bind(this);
		}
	}.bind(this);
	make_btn('[data-type="slider_nav_prev"]', true);
	make_btn('[data-type="slider_nav_next"]', false);
	make_btn('[data-type="slider_sc_prev"]', true);
	make_btn('[data-type="slider_sc_next"]', false);
};

TVComponents.Scroller.prototype.oncursor = function(side) {
	// перехватываем нажатия влево и вправо (горизонтальный слайдер), вверх и вниз (вертикальный слайдер)
	if (this.is_horizontal && (side == 'left' || side == 'right') || this.is_vertical && (side == 'up' || side == 'down')) {
		// двигаем
		if (side == 'left' || side == 'up') {
			this._move(true, this.container) && TVComponent.prototype.oncursor.call(this, side);
		} else {
			this._move(false, this.container) && TVComponent.prototype.oncursor.call(this, side);
		}
	}
	// перерисовываем скрол
	this.setScrollbar();
};

TVComponents.Scroller.prototype._move = function(is_move_in_first, container_el) {
	// сдвигаем контейнер
	if (this.is_horizontal) {
		var container_left = parseInt(container_el.style.left) || 0;
		container_left += (is_move_in_first) ? this.step : -this.step;
		if (this._checkEnding(container_el, -container_left)) {
			container_el.style.left = container_left + 'px';
			(is_move_in_first) ? this.count-- : this.count++;
		} else {
			return false;
		}
	} else {
		var container_top = parseInt(container_el.style.top) || 0;
		container_top += (is_move_in_first) ? this.step : -this.step;
		if (this._checkEnding(container_el, -container_top)) {
			(is_move_in_first) ? this.count-- : this.count++;
			container_el.style.top = container_top + 'px';
		} else {
			return false;
		}
	}
};

TVComponents.Scroller.prototype._checkEnding = function(el , k) {
	var boundary = {
		first: 0,
		last: (this.is_horizontal) ?  TV.getSize(el).width - TV.getSize(this.frame_el).width + this.step : TV.getSize(el).height - TV.getSize(this.frame_el).height + this.step
	};
	return (k >= Math.abs(boundary.first) && k <= Math.abs(boundary.last))
};

TVComponents.Scroller.prototype.onready = function() {
	this.enable();
	if (!this.step) this.step = 10;
	this.container = TV.el('.'+TVComponents.Scroller.container_class, this.el.children[0]) ;
	this.frame_el = TV.el(this.container.parentNode);
	// инициализируем скрол
	this._initScrollbarButtons();
	this.setScrollbar();
};

TVComponents.Scroller.prototype.setScrollbar = function() {
	var content_size = (this.is_vertical) ? TV.getSize(this.container).height : TV.getSize(this.container).width;
	var frame_size = (this.is_vertical) ? TV.getSize(this.frame_el).height : TV.getSize(this.frame_el).width;
	if (content_size < frame_size) {
		TV.hide('[data-type="slider-navigate"]', this.frame_el)
	} else {
		var size =  frame_size * 100 / content_size;
		if (size < 10) size = 10;
		TV.log(this.count);
		var pos = (100 - size) * this.count / parseInt((content_size - frame_size + this.step) / this.step) ;
		if (pos > 100 - size) pos = 100 - size;
		
		var scrollbar = TV.el('[data-type="slider-scrollbar"]', this.el);
		if (this.is_vertical) {
			scrollbar.style.height = size.toFixed(2)+'%';
			scrollbar.style.top = pos.toFixed(2)+'%';
		} else {
			scrollbar.style.width = size.toFixed(2)+'%';
			scrollbar.style.left = pos.toFixed(2)+'%';
		}	
	}

};

