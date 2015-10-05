function TVButton(el, adjacent_buttons, parent) {
	this.el = el;
	if (!el._attributes) TV.setElementAttributes(el);
	this.attributes = el._attributes;
	if (!this.attributes.id) {
		this.attributes.id = 'btn_'+TVButton._counter;
		TVButton._counter += 1;
		this.el.setAttribute('data-id', this.attributes.id);
	}
	this.id = this.attributes.id;
	this.adjacent_buttons = adjacent_buttons;
	this.parent = parent;
	this.disabled = false;
	this.onclick = null;               // вызывается при нажатии кнопки
	this.onhover = null;               // вызывается при активации кнопки (наведении)
	this.onout = null;                 // вызывается при деактивации
	this.up = this.attributes['btn-up'];
	this.right = this.attributes['btn-right'];
	this.down = this.attributes['btn-down'];
	this.left = this.attributes['btn-left'];
	this.not_handle_mouse = this.attributes['not_handle_mouse']; // не реагировать на движения мышкой
	this.not_hover_on_bound = this.attributes['not_hover_on_bound']; // не разрешать наводить на элементы выходящие за границу экрана на столько пикселей
	this.hover_on_bound = this.attributes['hover_on_bound']; // разрешать наводить на элементы выходящие за границу экрана
	if (this.attributes['btn']) {
		var s = this.attributes['btn'].split(',');
		if (s[0]) this.up = s[0].trim();
		if (s[1]) this.right = s[1].trim();
		if (s[2]) this.down = s[2].trim();
		if (s[3]) this.left = s[3].trim();
	}

	this.adjacent_buttons[this.id] = this;
	this.el.onmouseover = function(e) {
		if (this.not_handle_mouse) return;
		this.onmouseover(e);
	}.bind(this);
	this.el.onmouseout = function(e) {
		if (this.not_handle_mouse) return;
		this.onmouseout(e);
	}.bind(this);
	this.el.onclick = this.onmouseclick.bind(this);
}
TVButton._counter = 1;
TVButton.hover_class = 'act';          // класс наведенного элемента
TVButton.act_class = 'selected';       // класс активного(последнего нажатого) элемента
TVButton.disabled_class = 'disabled';  // класс заблокированного элемента
TVButton.pressed_class = 'pressed';    // класс нажатого элемента

TVButton.initAll = function(page, start_btn_id) {
	var start_btn_id_replaced = start_btn_id;
	TVButton.clearAll(page);
	TVButton._initButtons(page.buttons);

	// ищем кнопки
	var els = TV.find('[data-type="button"]', page instanceof TVPage ? null : page.el);
	for (var i=0; i < els.length; i++) {
		var el = els[i];
		if (!el._attributes.id) throw 'Not defined id for button '+(el.outerHTML||el.innerHTML);
	}

	// инициализируем все найденные компоненты
	var components = TV.find('[data-type="component"]', page instanceof TVPage ? null : page.el);
	components.map(function(el) {
		if (!el._attributes.id) throw 'Not defined id for component '+(el.outerHTML||el.innerHTML);
		var cl_name = el._attributes['class'];
		var cl = cl_name ? (TVComponents[cl_name] || window[cl_name]) : null;
		if (cl && typeof(cl) != 'function') throw 'Not defined TVComponents.'+cl_name+' or '+cl_name+' class for component '+el._attributes.id;
		return cl ? new cl(el, page.buttons, null, cl_name) : new TVComponent(el, page.buttons);
	}.bind(this)).map(function(comp) {
		// если start_btn_id в форме 'id1.id2, трактуем это как id1 компонента и id2 кнопки этого компонента
		var comp_start_btn_id = null;
		if (start_btn_id && start_btn_id.indexOf(el._attributes.id+'.') === 0) {
			comp_start_btn_id = start_btn_id.replace(el._attributes.id+'.', '');
			start_btn_id_replaced = start_btn_id.replace('.'+comp_start_btn_id, '');
		}
		comp.init(comp_start_btn_id);
		// из найденных кнопок исключаем кнопки компонентов
		for (var btn_id in comp.buttons) {
			for (var k in els) {
				if (comp.buttons[btn_id].el == els[k]) {
					els.splice(k, 1);
					break;
				}
			}
		}
	}.bind(this));

	// инициализируем все кнопки
	for (var i=0; i < els.length; i++) {
		new TVButton(els[i], page.buttons);
	}

	// проверяем что нет ссылок на несуществующие кнопки,
	// ищем стартовую и активную кнопку
	// блокируем выключенные кнопки
	var first_btn;
	for (var id in page.buttons) {
		var btn = page.buttons[id];
		if (btn.attributes.start && !btn.attributes.disabled && !btn.disabled) page.buttons._start_btn = btn;
		if (btn.attributes.selected && !btn.attributes.disabled && !btn.disabled) page.buttons._act_btn = btn;
		if (btn.up && !page.buttons[btn.up]) throw 'Not existent up for '+id;
		if (btn.right && !page.buttons[btn.right]) throw 'Not existent right for '+id;
		if (btn.down && !page.buttons[btn.down]) throw 'Not existent down for '+id;
		if (btn.left && !page.buttons[btn.left]) throw 'Not existent left for '+id;
		if (btn.attributes.disabled) btn.disable();
		if (!first_btn && !btn.disabled) first_btn = btn;
	}
	
	// если передан start_btn - стартуем с него
	if (start_btn_id_replaced) {
		page.buttons._start_btn = page.buttons[start_btn_id_replaced];
		if (!page.buttons._start_btn) throw 'Not existent start btn '+start_btn_id_replaced+' on page render';
		if (page.buttons._start_btn.attributes.disabled) page.buttons._start_btn = null;
	}
	
	// если перед рендеренгом уже были стартовая и активная кнопки - их и используем
	if (!page.buttons._start_btn) {
		for (var id in TV._hover_btns) {
			if (TV._hover_btns[id]+TV._render_ttl < TV._time) delete TV._hover_btns[id];
			if (TV._hover_btns[id] && page.buttons[id] && !page.buttons[id].disabled) page.buttons._start_btn = page.buttons[id];
		}
	}
	if (!page.buttons._act_btn) {
		for (var id in TV._selected_btns) {
			if (TV._selected_btns[id]+TV._render_ttl < TV._time) delete TV._selected_btns[id];
			if (TV._selected_btns[id] && page.buttons[id] && !page.buttons[id].disabled) page.buttons._act_btn = page.buttons[id];
		}
	}

	// если стартовой кнопки нет - считаем такой первую добавленную
	if (!page.buttons._start_btn && first_btn) page.buttons._start_btn = first_btn;

	// на активную кнопку добавляем класс
	if (page.buttons._act_btn) TV.addClass(page.buttons._act_btn.el, TVButton.act_class);
	// на стартовую кнопку устанавливаем курсор
	if (page.buttons._start_btn) page.buttons._start_btn.onmouseover();
};

TVButton._initButtons = function(buttons) {
	Object.defineProperty(buttons, '_hover_btn', {configurable: true, writable: true, enumerable: false});  // выделенная сейчас кнопка
	Object.defineProperty(buttons, '_act_btn', {configurable: true, writable: true, enumerable: false});    // последняя нажатая кнопка
	Object.defineProperty(buttons, '_start_btn', {configurable: true, writable: true, enumerable: false});  // стартовая кнопка
};

TVButton.clearAll = function(page) {
	for (var id in page.buttons) {
		var btn = page.buttons[id];
		if (btn.clearAll) btn.clearAll();
		btn.clear();
	}
	page.buttons = {};
};

TVButton.onCursorKey = function(page, side) {
	if (! side in ['up', 'right', 'down', 'left', 'enter']) throw 'Incorrect side ('+side+'), must be up, right, down, left or enter';
	var btn = page.buttons._hover_btn || page.buttons._start_btn;
	if (side == 'enter') {
		if (btn) btn.onenter();
	} else {
		if (btn) btn.oncursor(side);
	}
};

TVButton.prototype.clear = function() {
	if (this.el) this.el.onmouseover = null;
	if (this.el) this.el.onmouseout = null;
	if (this.el) this.el.onclick = null;
	this.el = null;
	this.onclick = null;
	this.onhover = null;
	this.onout = null;
};

TVButton.prototype.isMouseOnly = function() {
	var buttons_count = 0;
	for (var i in this.adjacent_buttons) {
		if (!this.adjacent_buttons[i].disabled) buttons_count += 1;
	}
	return (this.parent || !this.parent && buttons_count  > 1) && !this.left && !this.right && !this.up && !this.down;
};

TVButton.prototype.onmouseover = function(e) {
	if (this.disabled) return;
	// логика запрещения наведения (мышкой!) на частично/полностью скрытые кнопки 
	var not_hover_on_bound = false;
	if ((TV.app.not_hover_on_bound || TV.app.not_hover_on_bound === '0') && !this.hover_on_bound) not_hover_on_bound = TV.app.not_hover_on_bound * 1;
	if (this.not_hover_on_bound || this.not_hover_on_bound === '0') not_hover_on_bound = this.not_hover_on_bound * 1;
	if (not_hover_on_bound !== false && e && !TV.isFullVisible(this.el, not_hover_on_bound)) return;
	TV.addClass(this.el, TVButton.hover_class);
	var hover_btn = this.adjacent_buttons._hover_btn;
	if (hover_btn == this) return;
	if (hover_btn) hover_btn.onmouseout();
	if (!this.isMouseOnly()) {
		this.adjacent_buttons._hover_btn = this;
	} else {
		e && e.stopPropagation();
	}
	if (this.onhover) this.onhover(this);
};

TVButton.prototype.onmouseout = function() {
	if (this.disabled) return;
	TV.removeClass(this.el, TVButton.hover_class);
	if (this.onout) this.onout();
};

TVButton.prototype.onmouseclick = function() {
	if (this.disabled) return;
	if (!this.isMouseOnly()) {
		var act_btn = this.adjacent_buttons._act_btn;
		if (act_btn == this) return; // предотвращаем двойное нажатие
		for (var btn in this.adjacent_buttons) {
			if (this.adjacent_buttons[btn]) TV.removeClass(this.adjacent_buttons[btn].el, TVButton.act_class);
		};
		TV.addClass(this.el, TVButton.act_class);
		this.adjacent_buttons._act_btn = this;
	}
	TV.addClass(this.el, TVButton.pressed_class);
	var btn_id = this.id;
	setTimeout(function() {
		var el = TV.el('[data-type][data-id="'+btn_id+'"]', this.parent ? this.parent.el : null);
		TV.removeClass(el, TVButton.pressed_class);
	}.bind(this), 300);
	if (this.onclick) this.onclick(this);
};

TVButton.prototype.oncursor = function(side) {
	if (this[side]) {
		if (this[side] == 'out') {
			var parents= [];
			var parent = this.parent;
			parents.push(parent);
			while (parent && parent[side] == "out") {
				parent = parent.parent;
				parents.push(parent);
			}
			if (!parent || !parent.adjacent_buttons[parent[side]]) return;
			parents.forEach(function(p) {
				TV.removeClass(p.buttons._hover_btn.el, TVButton.hover_class);
				if (p.buttons._hover_btn.onout) p.buttons._hover_btn.onout(p.buttons._hover_btn);
				p.buttons._hover_btn = null;
			});
			parent.adjacent_buttons[parent[side]].onmouseover();
		} else {
			this.adjacent_buttons[this[side]].onmouseover();
		}
	}
};

TVButton.prototype.onenter = function() {
	this.onmouseclick();
};

TVButton.prototype.disable = function() {
	if (this.disabled) return;
	this.disabled = true;
	TV.addClass(this.el, TVButton.disabled_class);
	TV.removeClass(this.el, TVButton.hover_class);
	for (var id in this.adjacent_buttons) {
		var btn = this.adjacent_buttons[id];
		if (btn.left == this.id) {
			btn.left = this.left;
			btn._old_left = this.id;
		}
		if (btn.right == this.id) {
			btn.right = this.right;
			btn._old_right = this.id;
		}
		if (btn.up == this.id) {
			btn.up = this.up;
			btn._old_up = this.id;
		}
		if (btn.down == this.id) {
			btn.down = this.down;
			btn._old_down = this.id;
		}
	}
};

TVButton.prototype.enable = function(k) {
	if (!this.disabled) return;
	this.disabled = false;
	TV.removeClass(this.el, TVButton.disabled_class);
	for (var id in this.adjacent_buttons) {
		var btn = this.adjacent_buttons[id];
		if (btn._old_left == this.id) btn.left = this.id;
		if (btn._old_right == this.id) btn.right = this.id;
		if (btn._old_up == this.id) btn.up = this.id;
		if (btn._old_down == this.id) btn.down = this.id;
	}
};

TVButton.prototype.remove = function() {
	this.disable();
	TV.removeClass(this.el, TVButton.disabled_class);
	this.el.onmouseover = null;
	this.el.onclick = null;
	this.el = null;
	this.onclick = null;
	this.onhover = null;
	this.onout = null;
	delete this.adjacent_buttons[this.id];
};

// сбрасываем текущую наведенную кнопку
TVButton.prototype.resetHover = function() {
	if (this.adjacent_buttons._hover_btn == this) {
		TV.removeClass(this.el, TVButton.hover_class);
		this.adjacent_buttons._hover_btn = null;
	}
};

// сбрасываем текущую нажатую кнопку
TVButton.prototype.resetAct = function() {
	if (this.adjacent_buttons._act_btn == this) {
		TV.removeClass(this.el, TVButton.act_class);
		this.adjacent_buttons._act_btn = null;
	}
};

TVButton.prototype.findButtonByEl = function(el) {
	for (var i in this.buttons) {
		if (this.buttons[i].el == el) return this.buttons[i];
	}
};
