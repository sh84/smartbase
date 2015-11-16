TVComponents.Slider = function(el, adjacent_buttons, parent, class_name) {
	TVComponent.call(this, el, adjacent_buttons, parent, class_name);
	this.count = this.attributes['count'] * 1;                                     // количество отображаемых элементов
	this.not_use_positions = this.attributes['not_use_positions'] ? true : false;  // не использовать позиционирование для элементов
	this.start_offset = this.attributes['start_offset'] * 1 || 0;                  // на столько смещать вправо первый элемент данных
	this.direction = this.attributes['direction'];                                 // направление слайдера, по-умолчанию горизонтальное
	this.dynamic = this.attributes['dynamic'] ? true : false;                      // рендерить только видимые элементы, создавая остальные при движении по слайдеру
	this.loop = this.attributes['loop'] ? true : false;                            // зациклить слайдер, автоматом ставится и dynamic = true
	this.loop_start_count = this.attributes['loop_start_count'] * 1 || 0;          // количество элементов, при которых зацикливать слайдер
	this.move_to_center = this.attributes['move_to_center'] ? true : false;  	   // сдвинуть к центральному элементу данных
	this.nav_buttons = this.attributes['nav_buttons'] ? true : false;              // показывать ли кнопки для управления мышкой
	this.scrollbar = this.attributes['no_scrollbar'] ? false : true;               // показывать ли скролбар
    this.use_none = this.attributes['none'] ? true : false;
    this.movie_debounce = this.attributes['movie_debounce'] * 1 || null;           // движение не чаще чем раз в movie_debounce мс
    
    this.is_vertical = this.direction == 'vertical';
	this.is_horizontal = !this.is_vertical;
	if (this.is_horizontal) {
		this.first_side = 'left';
		this.last_side = 'right';
	} else {
		this.first_side = 'up';
		this.last_side = 'down';
	}
	this.data = null;
	this.movie_on_all = false;
	this.start_position = 0;                        // номер певого элемента отображаемого сейчас в слайдере
	this.first_btn_id = null;                       // первая кнопка
	this.last_btn_id = null;                        // последняя кнопка
	this.first_el_pos = null;                       // граница первого элемента (левая граница для is_horizontal, верхняя для is_vertical)
	this.last_el_pos = null;                        // граница последнего элемента (правая граница для is_horizontal, нижняя для is_vertical)
	this.container_el = null;                       // элемент-контейнер для кнопок
	this.container_move = true;                     // двигать контейнер при при листании
};
TVComponents.Slider._buttons_counter = 1;
TVComponents.Slider.prototype = Object.create(TVComponent.prototype);

TVComponents.Slider.prototype.onready = function() {
	if (!this.data) return;
	this.container_el = TV.el('[data-type="slider_container"]', this.el);
	TV.setHTML(this.container_el, '');
	if (this.data.length == 0) {
		if (this.use_none) this._addNone();
		return;
	}
	
	this.first_btn_id = this.last_btn_id = this.first_el_pos = this.last_el_pos = null;
	this.start_position = 0;
	
	if (this.attributes['loop'] && this.data.length >= this.loop_start_count) {
		this.loop = true;
		this.dynamic = true;
		this.scrollbar = false;
	} else {
		this.loop = false;
	}

	// ренедрим элементы-кнопки
	var start = this.dynamic ? -this.start_offset - 1 : 0;
	var finish = this.dynamic ? this.count - this.start_offset : this.data.length - 1;
	var start_btn = this.dynamic ? start+1 : start;
	var finish_btn = this.dynamic ? finish-1 : (this.data.length < this.count ? finish : this.count - 1);
	var curr = start;
	var flag_first = false;
	while (curr <= finish) {
		var item = this._getItem(curr);
		var el = this._addElement(item, false, curr >= start_btn && curr <= finish_btn);
		var btn = null;
		if (curr >= start_btn && curr <= finish_btn && item) btn = this._makeBtn(el); 
		if (curr >= start_btn && item && !flag_first) {
			this.enable();
			this.buttons._start_btn = btn;
			// если hover-а у adjacent_buttons нет, но сладйер start="true", и parent-а нет, или он активный
			if (!this.isHover() && this.attributes.start && (!this.parent || this.parent.isHover())) {
				this.adjacent_buttons._start_btn = this;
				this.onmouseover();
			} 
			// еслик компонент активен - на стартовую кнопку устанавливаем курсор
			if (this.isHover()) this.buttons._start_btn.onmouseover();
			flag_first = true;
		}
		curr += 1;
	}

	// отрисовываем скрол
	this._initScrollbarButtons();
	this.setScrollbar();
	this.updateNavButtons();
	
	// прокручиваем к центральному элементу, если передан move_to_center = true
	if (!this.loop && this.move_to_center) {
		this.moveToCenter();
	}
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
		btn_id: this.id + '_' + (item ? item._index : 'none'),
		item: item ? item : {id: 'none'},
		item_html: item ? TV.app.ejs[ejs_path]({item : item}) : ''
	});
	var el = TV.createElement(html);
	is_first ? this.container_el.insertBefore(el, this.container_el.firstElementChild) : this.container_el.appendChild(el);

	// проставляем позицию
	if (!this.not_use_positions && this.container_move) {
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
	// инициализируем все найденные кнопки
	var buttons = TV.find('[data-type="button"]', root_el);
	for (var i=0; i < buttons.length; i++) {
		var el = buttons[i];
		if (!el._attributes.id) throw 'Not defined id for button '+(el.outerHTML||el.innerHTML);
		new TVButton(el, root_btn.buttons, root_btn);
	}
	
	// инициализируем все найденные компоненты
	var components = TV.find('[data-type="component"]', root_el);
	components.map(function(el) {
		if (!el._attributes.id) throw 'Not defined id for component '+(el.outerHTML||el.innerHTML);
		var cl_name = el._attributes['class'];
		var cl = cl_name ? (TVComponents[cl_name] || window[cl_name]) : null;
		if (cl && typeof(cl) != 'function') throw 'Not defined TVComponents.'+cl_name+' or '+cl_name+' class for component '+el._attributes.id;
		return cl ? new cl(el, root_btn.buttons, root_btn, cl_name) : new TVComponent(el, root_btn.buttons, root_btn);
	}.bind(this)).map(function(comp) {
		comp.init();
	});
	
	var first_btn;
	for (var id in root_btn.buttons) {
		var btn = root_btn.buttons[id];
		btn.onclick = function(a, b) {
			if (this.onclick) this.onclick(a, b);
		}.bind(this);
		if (btn.attributes.disabled) btn.disable();
		if (btn.attributes.start && !btn.attributes.disabled && !btn.disabled) root_btn.buttons._start_btn = btn;
		if (!first_btn && !btn.disabled) first_btn = btn;
	}
	if (!root_btn.buttons._start_btn && first_btn) root_btn.buttons._start_btn = first_btn;
	return !!first_btn;
};

// создать кнопку на существуещем html-элементе следующим за текущей последней кнопкой
TVComponents.Slider.prototype._makeBtn = function(el, is_first) {
	el.setAttribute('data-type', 'component');
	var btn = new TVComponent(el, this.buttons, this);
	btn._is_slider_item = true;
	var on_bound = false;
	if (!this.loop) {
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
	
	// если внутри кнопки-компонента есть другие компоненты - инициализируем их
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
	if (this.loop) {
		if (k < 0) k = k + this.data.length * Math.ceil(-k / this.data.length);
		if (k >= this.data.length) k = k % this.data.length;
	}
	if (!this.data[k]) return null;
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
		if (this.buttons[this.first_btn_id].el != el) this._movie(false);
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

TVComponents.Slider.prototype.moveToCenter = function() {
	if (this.data.length < 2) return;
	var center_ind = Math.floor(this.data.length/2) - 1,
		curr_ind = 0;
		
	for (var btn in this.buttons) {
		if (curr_ind == center_ind) {
			this.moveTo(btn.el);
			break;
		}
		curr_ind++;
	}
};

// is_first - движение влево/вверх
TVComponents.Slider.prototype._movie = function(is_first) {
	// слишком частое нажатие
	if (this.movie_debounce) {
		if (this._movie_time && this._movie_time + this.movie_debounce > Date.now()) return false;
		this._movie_time = Date.now();
	}
	if (!this.loop && is_first && this.start_position <= 0) return;
	if (!this.loop && !is_first && this.start_position + this.count >= this.data.length + this.start_offset * 2) return; // хак, this.start_offset используется только в ClassSlider-е и в нем он равен количеству элементов от середины до конца 
	this.start_position += is_first ? -1 : 1;
	
	// количество кнопок
	var buttons_count = 0;
	for (var i in this.buttons) {
		if (this.buttons[i]._is_slider_item) buttons_count += 1;
	}
	
	// крайняя от направления движения кнопка
	var btn = is_first ? this.buttons[this.last_btn_id] : this.buttons[this.first_btn_id];
	var curr_el = btn.el;
	
	// удаляем вышедшую за видимые границы кнопку (только если в слайдере столько же кнопок солько элементов)
	if (buttons_count == this.count || is_first && buttons_count == this.count - 1) {
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
	}
	
	// обновляем вошедший элемент до кнопки
	var elem = is_first ? this.buttons[this.first_btn_id] : this.buttons[this.last_btn_id];
	elem = elem ? elem.el : curr_el; // сработает когда в слайдере вообще 1 активный элемент (кнопка)
	elem = is_first ? elem.previousElementSibling : elem.nextElementSibling;
	var size = TV.getSize(elem);
	if (elem.innerHTML.replace(/\s+/, '')) this._makeBtn(elem, is_first); // только если в html-е не пустой блок
	

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
		// если елемент связан с кнопкой - удаляем кнопку
		btn = this.findButtonByEl(el);
		if (btn) {
			if (this.last_btn_id == btn.id) {
				this.last_btn_id = btn[this.first_side];
			}
			if (this.first_btn_id == btn.id) {
				this.first_btn_id = btn[this.last_side];
			}
			btn.remove();
		}
		// добавляем новый элемент
		var item = this._getItem(is_first ? this.start_position - 1 - this.start_offset : this.start_position + this.count - this.start_offset);
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
	
	this.updateNavButtons();
};

TVComponents.Slider.prototype._initScrollbarButtons = function() {
	var make_btn = function(selector, is_first) {
		var el = TV.el(selector, this.el);
		if (el) {
			el.setAttribute('data-type', 'button');
			el.setAttribute('data-id', this.id+'_'+selector.replace(/.*"slider_(.*?)".*/, '$1'));
			new TVButton(el, this.buttons, this).onclick = function() {
				if (this._movie(is_first) === false) return;
				this.setScrollbar();
				var side;
				if (is_first) {
					side = this.is_horizontal ? 'left' : 'up';
				} else {
					side = this.is_horizontal ? 'right' : 'down';
				}
				TVComponent.prototype.oncursor.call(this, side);
				this.buttons._hover_btn && TV.removeClass(this.buttons._hover_btn.el, TVButton.hover_class);
			}.bind(this);
		}
	}.bind(this);
	make_btn('[data-type="slider_nav_prev"]', true);
	make_btn('[data-type="slider_nav_next"]', false);
	make_btn('[data-type="slider_sc_prev"]', true);
	make_btn('[data-type="slider_sc_next"]', false);
};

TVComponents.Slider.prototype.setScrollbar = function() {
	if (!this.scrollbar || !this.data || this.data.length <= this.count || this.count < 2 || !this.scrollbar) {
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

// обновляем состояние кнопок листания
TVComponents.Slider.prototype.updateNavButtons = function() {
	if (!this.loop) {
		// достигнут левый край
		if (this.start_position <= 0) {
			this.buttons[this.id+'_nav_prev'] && this.buttons[this.id+'_nav_prev'].disable();
			this.buttons[this.id+'_sc_prev'] && this.buttons[this.id+'_sc_prev'].disable();
		} else {
			this.buttons[this.id+'_nav_prev'] && this.buttons[this.id+'_nav_prev'].enable();
			this.buttons[this.id+'_sc_prev'] && this.buttons[this.id+'_sc_prev'].enable();
		}
		// достигнут правый край
		if (this.start_position + this.count >= this.data.length + this.start_offset * 2) {
			this.buttons[this.id+'_nav_next'] && this.buttons[this.id+'_nav_next'].disable();
			this.buttons[this.id+'_sc_next'] && this.buttons[this.id+'_sc_next'].disable();
		} else {
			this.buttons[this.id+'_nav_next'] && this.buttons[this.id+'_nav_next'].enable();
			this.buttons[this.id+'_sc_next'] && this.buttons[this.id+'_sc_next'].enable();
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
