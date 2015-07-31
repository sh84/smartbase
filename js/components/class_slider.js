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
	this._setClasses();
	this._selectMiddle();
};

TVComponents.ClassSlider.prototype._movie = function(is_first) {
	TVComponents.Slider.prototype._movie.call(this, is_first);
	this._setClasses();
	this._selectMiddle();
	return true;
};

TVComponents.ClassSlider.prototype._setClasses = function() {
	var styles = '';
	var item_class = '';
	var els = this.container_el.children;
	var els_length = els.length;

	// прячем добавленный и вышедший элементы, чтобы избежать мелькания
	els[0].style.visibility = 'hidden';
	els[els_length-1].style.visibility = 'hidden';

	var middle_index = (els_length-1)/2;
	var middle_pos = this.is_horizontal ? TV.getSize(this.container_el).width/2 - TV.getSize(els[middle_index]).width/2 : 
		TV.getSize(this.container_el).height/2 - TV.getSize(els[middle_index]).height/2;
	var last_pos = middle_pos;

	// обходим элементы от среднего до начала, устанавливаем класс, для класса считаем позицию, 
	// каждый раз равную позиции последнего - distance - размер самого элемента 
	var prev_pos = middle_pos;
	for(var k = middle_index-1; k >= 0; k--) {
		item_class = TVComponents.ClassSlider.prev_class+(1 - k - this.start_for_dynamic);
		if (this.is_horizontal) {
			prev_pos -= TV.getSize(els[k]).width + this.distance;
			styles += '.'+item_class.replace(/ /g, '.')+' {left: '+prev_pos+'px; will-change: left, transform;} ';
		} else {
			prev_pos -= TV.getSize(els[k]).height + this.distance;
			styles += '.'+item_class.replace(/ /g, '.')+' {top: '+prev_pos+'px; will-change: top, transform;} ';
		}
		els[k].className = item_class;
	}

	// обходим элементы, начиная со среднего до конца, устанавливаем класс, для класса считаем позицию, 
	// каждый раз равную позиции последнего + его размеру + distance
	for(var j = middle_index; j < els_length; j++) {
		item_class = (last_pos == middle_pos) ? TVComponents.ClassSlider.middle_class : TVComponents.ClassSlider.next_class+(-1 + j + this.start_for_dynamic);

		if (this.is_horizontal) {
			styles += '.'+item_class.replace(/ /g, '.')+' {left: '+last_pos+'px; will-change: left, transform;} ';
			last_pos += TV.getSize(els[j]).width + this.distance;
		} else {
			styles += '.'+item_class.replace(/ /g, '.')+' {top: '+last_pos+'px; will-change: top, transform;} ';
			last_pos += TV.getSize(els[j]).height + this.distance;
		}
		els[j].className = item_class;
	}
	// если установлен атрибут positions=true, добавляем стили в документ
	// иначе считаем, что позиции для классов определены в css 
	if (this.set_positions) this._setStylesheet(styles);

	els[0].style.visibility = 'visible';
	els[els_length-1].style.visibility = 'visible';
};

TVComponents.ClassSlider.prototype._selectMiddle = function(styles) {
	for (var n in this.buttons) {
		if (this.buttons[n].el.className.indexOf(TVComponents.ClassSlider.middle_class) > -1) {
			this.buttons[n].el.onmouseover();
			break;
		}
	}
};

TVComponents.ClassSlider.prototype._setStylesheet = function(styles) {
	var style_el = document.getElementById("classSliderStyles"+this.id);
	if (!style_el) {
		style_el = document.createElement("style");
		style_el.setAttribute("id", "classSliderStyles"+this.id);
		style_el.setAttribute("title", "classSliderStyles"+this.id);
		var head = document.getElementsByTagName("head")[0];
		head.appendChild(style_el);
	} 
	
	// вставить стили
	if (typeof styles === "string") {
		// styles содержит текстовое определение таблицы стилей
			style_el.innerHTML = styles;
	} else {
		// styles - объект с правилами для вставки 
		// находим объект стилей с нужным нам id
		for(var i in document.styleSheets) {
        	if(document.styleSheets[i].title && document.styleSheets[i].title == "classSliderStyles"+this.id) {
            	styleSheet = document.styleSheets[i];
            	break;
        	}
    	}
		var j = 0;
		for(var selector in styles) {
			if (styleSheet.insertRule) {
				var rule = selector + " {" + styles[selector] + "}"; 
				styleSheet.insertRule(rule, j++);
			} else {
				styleSheet.addRule(selector, styles[selector], j++);
			}
		}
	}
};