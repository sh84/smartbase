TVComponents.Slider = function(el, adjacent_buttons, parent, class_name) {
	TVComponent.call(this, el, adjacent_buttons, parent, class_name);
	this.count = this.attributes['count'] * 1;
	this.dynamic = this.attributes['dynamic'] ? true : false;
	this.direction = this.attributes['direction'];
	this.is_vertical = this.direction == 'vertical';
	this.is_horizontal = !this.is_vertical;
	this.nav_buttons = this.attributes['nav_buttons'] ? true : false;
    this.use_none = this.attributes['none'] ? true : false;
    this.movie_debounce = this.attributes['movie_debounce'] * 1; // движение не чаще чем раз в movie_debounce мс

	if (this.is_horizontal) {
		this.first_side = 'left';
		this.last_side = 'right';
	} else {
		this.first_side = 'up';
		this.last_side = 'down';
	}
	this.data = null;
	this.movie_on_all = false;
	this.start_position = 0;       // номер певого элемента отображаемого сейчас в слайдере
	this.first_btn_id = null;      // первая кнопка
	this.last_btn_id = null;       // последняя кнопка
	this.first_el_pos = null;      // граница первого элемента (левая граница для is_horizontal, верхняя для is_vertical)
	this.last_el_pos = null;       // граница последнего элемента (правая граница для is_horizontal, нижняя для is_vertical)
	this.container_el = null;      // элемент-контейнер для кнопок
	this.container_move = true;    // двигать контейнер при при листании
	this.start_for_dynamic = 0;    // номер элемента данных с котрого начинается динамический слайдер
	this.scrollbar = true;         // показывать ли скролбар
};
TVComponents.Slider._buttons_counter = 1;
TVComponents.Slider.prototype = Object.create(TVComponent.prototype);

TVComponents.Slider.prototype.onready = function() {
	if (!this.data) return;
	this.first_btn_id = this.last_btn_id = this.first_el_pos = this.last_el_pos = null;
	this.start_position = 0;
	this.container_el = TV.el('[data-type="slider_container"]', this.el);
	TV.setHTML(this.container_el, '');

    if (this.data.length == 0 && this.use_none) {
        this._addNone();
    }

	if (this.data.length == 0) return;

	// ренедрим элементы-кнопки
	var max_size = this.count + this.start_for_dynamic;
	if (!this.dynamic && this.data.length < max_size) max_size = this.data.length;
	var start = this.dynamic ? this.start_for_dynamic - 1 : 0;
	var finish = this.dynamic ? this.count + this.start_for_dynamic : this.data.length - 1;
	var start_btn = this.dynamic ? start+1 : start;
	var finish_btn = this.dynamic ? finish-1 : (this.data.length < this.count ? finish : this.count - 1);
	var curr = start;
	while (curr <= finish) {
		var item = this._getItem(curr);
		var el = this._addElement(item, false, curr >= start_btn && curr <= finish_btn);
		var btn = null;
		if (curr >= start_btn && curr <= finish_btn) btn = this._makeBtn(el); 
		if (curr == start_btn) {
			this.enable();
			this.buttons._start_btn = btn;
			// если hover-а у adjacent_buttons нет, но сладйер start="true", и parent-а нет, или он активный
			if (!this.isHover() && this.attributes.start && (!this.parent || this.parent.isHover())) {
				this.adjacent_buttons._start_btn = this;
				this.onmouseover();
			} 
			// еслик компонент активен - на стартовую кнопку устанавливаем курсор
			if (this.isHover()) this.buttons._start_btn.onmouseover();
		}
		curr += 1;
	}

	// отрисовываем скрол
	this._initScrollbarButtons();
	this.setScrollbar();
};

// добавить пустой html-элемент
TVComponents.Slider.prototype._addNone = function() {
    var item_templ_name = (TV.app.curr_popup) ? TV.app.curr_popup.name : TV.app.curr_page.name;
    var ejs_path = 'none#' + item_templ_name + '.' + this.id;
    if (this.attributes.item_template && TV.app.ejs[this.attributes.item_template]) ejs_path = this.attributes.item_template;

    if (!TV.app.ejs[ejs_path]) throw 'Not defined template ' + ejs_path + ' for component ' + this.id;
    var html = TV.app.ejs[ejs_path]();

    var el = TV.createElement(html);
    this.container_el.appendChild(el);
};

// добавить новый html-элемент
TVComponents.Slider.prototype._addElement = function(item, is_first) {
	var item_templ_name = (TV.app.curr_popup) ? TV.app.curr_popup.name : TV.app.curr_page.name;
	var ejs_path = 'item#' + item_templ_name + '.' + this.id;
	if (this.attributes.item_template && TV.app.ejs[this.attributes.item_template]) ejs_path = this.attributes.item_template;
	if (!TV.app.ejs[ejs_path]) throw 'Not defined template ' + ejs_path + ' for component ' + this.id;
	var html = TV.app.ejs['component#Slider#item']({
		btn_id: this.id + '_' + item._index,
		item: item,
		item_html: TV.app.ejs[ejs_path]({item : item})
	});
	var el = TV.createElement(html);
	is_first ? this.container_el.insertBefore(el, this.container_el.firstElementChild) : this.container_el.appendChild(el);

	// проставляем позицию
	if (this.dynamic && this.container_move) {
		var size = TV.getSize(el);
		if (this.first_el_pos === null || this.last_el_pos === null) {
			is_first = true;
			this.first_el_pos = this.last_el_pos = 0;
		}
		if (is_first) {
			this.first_el_pos = this.is_horizontal ? this.first_el_pos - size.width : this.first_el_pos - size.height;
			if (this.is_horizontal) {
				el.style.left = this.first_el_pos+'px';
			} else {
				el.style.top = this.first_el_pos+'px';
			}
		} else {
			if (this.is_horizontal) {
				el.style.left = this.last_el_pos+'px';
			} else {
				el.style.top = this.last_el_pos+'px';
			}
			this.last_el_pos = this.is_horizontal ? this.last_el_pos + size.width : this.last_el_pos + size.height;
		}
	}
	return el;
};

TVComponents.Slider.prototype._makeComponents = function(root_el, root_btn) {
	// инициализируем все найденные компоненты
	var components = TV.find('[data-type="component"]', root_el);
	for (var i=0; i < components.length; i++) {
		var el = components[i];
		if (!el._attributes.id) throw 'Not defined id for component '+(el.outerHTML||el.innerHTML);
		var cl_name = el._attributes['class'];
		var cl = cl_name ? (TVComponents[cl_name] || window[cl_name]) : null;
		if (cl && typeof(cl) != 'function') throw 'Not defined TVComponents.'+cl_name+' or '+cl_name+' class for component '+el._attributes.id;
		var comp = cl ? new cl(el, root_btn.buttons, this, cl_name) : new TVComponent(el, root_btn.buttons, this);
		comp.init();
	}
	
	var first_btn;
	for (var id in root_btn.buttons) {
		var btn = root_btn.buttons[id];
		btn.onclick = function(a, b) {
			if (this.onclick) this.onclick(a, b);
		}.bind(this);
		if (btn.attributes.start && !btn.attributes.disabled && !btn.disabled) root_btn.buttons._start_btn = btn;
		if (!first_btn && !btn.disabled) first_btn = btn;
	}
	if (!root_btn.buttons._start_btn && first_btn) root_btn.buttons._start_btn = first_btn;
	return !!first_btn;
};

// создать кнопку на существуещем html-элементе следующим за текущей последней кнопкой
TVComponents.Slider.prototype._makeBtn = function(el, is_first) {
	el.setAttribute('data-type', 'button');
	var btn = new TVComponent(el, this.buttons, this);
	var on_bound = false;
	if (!this.dynamic) {
		// выход за пределы слайдера на конечных кнопках
		if (is_first && this.start_position == 0) on_bound = true;
		if (!is_first && this.start_position + this.count >= this.data.length) on_bound = true;
	}
	if (this.is_horizontal) btn.up = btn.down = 'out';
	if (this.is_vertical) btn.left = btn.right = 'out';
	if (is_first) {
		btn[this.first_side] = on_bound ? 'out' : null;
		btn[this.last_side] = this.dynamic ? this.first_btn_id : this.first_btn_id || 'out';
		if (this.buttons[this.first_btn_id]) {
			this.buttons[this.first_btn_id][this.first_side] = btn.id;
		} else {
			if (this.buttons._hover_btn) this.buttons._hover_btn[this.first_side] = btn.id;
		}
		this.first_btn_id = btn.id;
		if (!this.last_btn_id) this.last_btn_id = btn.id;
	} else {
		btn[this.last_side] = on_bound ? 'out' : null;
		btn[this.first_side] = this.dynamic ? this.last_btn_id : this.last_btn_id || 'out';
		if (this.buttons[this.last_btn_id]) {
			this.buttons[this.last_btn_id][this.last_side] = btn.id;
		} else {
			if (this.buttons._hover_btn) this.buttons._hover_btn[this.last_side] = btn.id;
		}
		this.last_btn_id = btn.id;
		if (!this.first_btn_id) this.first_btn_id = btn.id;
	}
	this.btnAttachCallbacks(btn);
	
	// если внутри кнопки-компонента есть жругие компоненты - инициализируем их
	if (!this._makeComponents(el, btn)) {
		// если компонент нет - клик должен раьботать как у button-а
		btn.el.onclick = btn.onmouseclick.bind(btn);
		btn.onenter = btn.onmouseclick.bind(btn);
	}
	
	return btn;
};

// произвольного элемент псевдобесконечного массива, index может быть любым, от - бесконечности, до +
TVComponents.Slider.prototype._getItem = function(index) {
	var item = {};
	var k = index;
	if (this.dynamic) {
		if (k < 0) k = k + this.data.length * Math.ceil(-k / this.data.length);
		if (k >= this.data.length) k = k % this.data.length;
	}
	for (var i in this.data[k])	item[i] = this.data[k][i];
	item._index = TVComponents.Slider._buttons_counter;
	TVComponents.Slider._buttons_counter += 1;
	return item;
};

TVComponents.Slider.prototype.oncursor = function(side) {
	// перехватываем нажатия влево и вправо (горизонтальный слайдер), вверх и вниз (вертикальный слайдер)
	if (this.buttons._hover_btn && (!this.buttons._hover_btn[side] || this.movie_on_all)
			&& (this.is_horizontal && (side == 'left' || side == 'right') || this.is_vertical && (side == 'up' || side == 'down'))) {
		var is_first = this.is_horizontal && side == 'left' || this.is_vertical && side == 'up';
		if (this._movie(is_first) === false) return;
	}
	// перерисовываем скрол
	this.setScrollbar();

	TVComponent.prototype.oncursor.call(this, side);
};

TVComponents.Slider.prototype.moveTo = function(el) {
	var scrollbar = TV.el('[data-type="slider-scrollbar"]', this.el);
	// выключаем плавную прокрутку
	this.container_el.style.transition = "none";
	this.container_el.style.webkitTransition = "none";
	if (scrollbar) {
		scrollbar.style.transition = "none";
		scrollbar.style.webkitTransition = "none";
	}
	// листаем, пока el не станет первым
	for (var i = 0; i<=this.data.length-1; i++) {
		if (this.buttons[this.first_btn_id].el != el && this.start_position + this.count < this.data.length) this._movie(false);
		else break;
	}
	this.setScrollbar();
	// вызываем repaint у браузера перед тем, как включить transition
	this.container_el.offsetHeight;
	// включаем плавную прокрутку
	if (scrollbar) {
		scrollbar.style.transition = "all 0.3s ease-in-out";
		scrollbar.style.webkitTransition = "all 0.3s ease-in-out";
	}
	this.container_el.style.transition = "all 0.3s ease-in-out";
	this.container_el.style.webkitTransition = "all 0.3s ease-in-out";
};

TVComponents.Slider.prototype._movie = function(is_first) {
	// слишком частое нажатие 
	if (this.movie_debounce) {
		if (this._movie_time && this._movie_time + this.movie_debounce > Date.now()) return false;
		this._movie_time = Date.now();
	}
	if (!this.dynamic && is_first && this.start_position <= 0) return;
	if (!this.dynamic && !is_first && this.start_position + this.count >= this.data.length) return;
	this.start_position += is_first ? -1 : 1;

	// удаляем вышедшую за видимые границы кнопку
	var btn = is_first ? this.buttons[this.last_btn_id] : this.buttons[this.first_btn_id];
	var curr_el = btn.el;
	if (is_first) {
		this.last_btn_id = btn[this.first_side];
		if (this.buttons[this.last_btn_id]) this.buttons[this.last_btn_id][this.last_side] = null;
	} else {
		this.first_btn_id = btn[this.last_side];
		if (this.buttons[this.first_btn_id]) this.buttons[this.first_btn_id][this.first_side] = null;
	}
	if (!is_first && this.last_btn_id == btn.id || is_first && this.first_btn_id == btn.id) {
		// сработает когда в слайдере вообще 1 активный элемент (кнопка)
		this.first_btn_id = null;
		this.last_btn_id = null;
		btn.onmouseout();
	}
	btn.el.removeAttribute('data-type');
	btn.remove();
	
	// обновляем вошедший элемент до кнопки
	var elem = is_first ? this.buttons[this.first_btn_id] : this.buttons[this.last_btn_id];
	elem = elem ? elem.el : curr_el; // сработает когда в слайдере вообще 1 активный элемент (кнопка)
	elem = is_first ? elem.previousElementSibling : elem.nextElementSibling; 

	var size = TV.getSize(elem);
	this._makeBtn(elem, is_first);

	if (this.dynamic) {
		// удаляем крайний элемент
		var el = is_first ? this.container_el.lastElementChild : this.container_el.firstElementChild;
		if (is_first) {
			this.last_el_pos = parseInt(this.is_horizontal ? el.style.left: el.style.top);
		}
		this.container_el.removeChild(el);
		if (!is_first) {
			el = this.container_el.firstElementChild;
			this.first_el_pos = parseInt(this.is_horizontal ? el.style.left: el.style.top);
		}
		// добавляем новый элемент
		var item = this._getItem(is_first ? this.start_position - 1 + this.start_for_dynamic : this.start_position + this.count  + this.start_for_dynamic);
		this._addElement(item, is_first);
	}

	// сдвигаем контейнер
	if (this.container_move) {
		if (this.is_horizontal) {
			var container_left = parseInt(this.container_el.style.left) || 0;
			var shift_left =  Math.abs(Math.abs(container_left) -  Math.abs(elem.offsetLeft));
			container_left += is_first ? shift_left : -size.width;
			this.container_el.style.left = container_left + 'px';
		} else {
			var container_top = parseInt(this.container_el.style.top) || 0;
			var shift_top = Math.abs(Math.abs(container_top) -  Math.abs(elem.offsetTop));
			container_top += is_first ? shift_top : -size.height;
			this.container_el.style.top = container_top + 'px';
		}
	}
};

TVComponents.Slider.prototype._initScrollbarButtons = function() {
	var make_btn = function(selector, is_first) {
		var el = TV.el(selector, this.el);
		if (el) {
			el.setAttribute('data-type', 'button');
			new TVButton(el, this.buttons, this).onclick = function() {
				if (this._movie(is_first) === false) return;
				this.setScrollbar();
			}.bind(this);
		}
	}.bind(this);
	make_btn('[data-type="slider_nav_prev"]', true);
	make_btn('[data-type="slider_nav_next"]', false);
	make_btn('[data-type="slider_sc_prev"]', true);
	make_btn('[data-type="slider_sc_next"]', false);
};

TVComponents.Slider.prototype.setScrollbar = function() {
	if (this.dynamic || !this.data || this.data.length <= this.count || this.count < 2 || !this.scrollbar) {
		TV.hide('[data-type="slider-navigate"]', this.el);
	} else {
		TV.show('[data-type="slider-navigate"]', this.el);
		var size = this.count * 100 / this.data.length;
		if (size < 10) size = 10;
		var pos = this.start_position ? this.start_position * (100 - size) / (this.data.length - this.count) : 0;
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

TVComponents.Slider.prototype.btnAttachCallbacks = function(btn) {
	btn.onclick = this.onButtonClick.bind(this);
	btn.onhover = this.onButtonHover.bind(this);
};

TVComponents.Slider.prototype.onButtonClick = function(btn) {
	if (this.onclick) this.onclick(btn.attributes.key, btn);
};

TVComponents.Slider.prototype.onButtonHover = function(btn) {
	// перемещаем start
	this.buttons._start_btn = this.buttons._hover_btn;
	if (this.onhover) this.onhover(btn.attributes.key, btn);
};

TVComponents.Slider.prototype.getCurrItemID = function() {
	if (this.buttons._hover_btn) {
		return this.buttons._hover_btn.attributes.key;
	} else if (this.data.length > 0) {
		var item = this._getItem(this.start_position);
		return item ? item.id : null;
	} else {
		return null;
	}
};
