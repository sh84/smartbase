function TVComponent(el, adjacent_buttons, parent, class_name) {
	TVButton.call(this, el, adjacent_buttons, parent);
	this.el.onclick = null;
	this.class_name = class_name;
	this.buttons = {};
	TVButton._initButtons(this.buttons);
	this.data = null;
}
TVComponent.prototype = Object.create(TVButton.prototype);
var TVComponents = {};

TVComponent.prototype.clearAll = function() {
	for (var id in this.buttons) {
		var btn = this.buttons[id];
		if (btn.clearAll) btn.clearAll();
		btn.clear();
	}
	this.buttons = {};
};

TVComponent.prototype.init = function(start_btn_id) {
	// если для компонента есть data-provider - связываем c this._data_fn
	if (this.attributes.provider) {
		var fn = eval(this.attributes.provider);
		if (typeof(fn) == 'undefined') throw 'Non existent data-provider for component '+this.id;
		if (typeof(fn) == 'function') {
			// вычленяем часть до последней точки - считаем её за this при вызове
			var fn_this = this.attributes.provider.replace(/(.*)\..*/, '$1');
			fn_this = fn_this == this.attributes.provider ? window : eval(fn_this);
			this._data_fn = fn.bind(fn_this, this);
		} else {
			this._data_fn = function() {
				return eval(this.attributes.provider);
			}.bind(this);
		}
	}

	this.render(start_btn_id);
};

TVComponent.prototype.prerender = function() {
	// вызывается перед render
};

TVComponent.prototype.isHover = function() {
	return this.adjacent_buttons._hover_btn == this || !this.parent && Object.keys(this.adjacent_buttons).length == 1;
};

TVComponent.prototype.render = function(start_btn_id) {
	var is_hover = this.isHover();
	if (this._data_fn) this.data = this._data_fn();
	
	// если для компонента есть шаблон - рендерим
	var cl;
	if (this.class_name && TV.app.ejs['component#'+this.class_name]) cl = 'component#'+this.class_name;
	if (this.template && TV.app.ejs['component#'+this.template]) cl = 'component#'+this.template;
	if (this.attributes.template && TV.app.ejs['component#'+this.attributes.template]) cl = 'component#'+this.attributes.template;
	if (cl) {
		this.prerender();
		TV.render(this.el, cl, this);
	}

	this.clearAll();
	TVButton._initButtons(this.buttons);
	
	// инициализируем все найденные кнопки внутри компонента
	var els = TV.find('[data-type="button"]', this.el);
	for (var i=0; i < els.length; i++) {
		var el = els[i];
		if (!el._attributes.id) throw 'Not defined id for button '+(el.outerHTML||el.innerHTML);
		new TVButton(el, this.buttons, this);
	}

	// проверяем что нет ссылок на несуществующие кнопки,
	// ищем стартовую и активную кнопку
	// блокируем выключенные кнопки
	var first_btn;
	for (var id in this.buttons) {
		var btn = this.buttons[id];
		if (!first_btn && !btn.attributes.disabled) first_btn = btn;
		if (btn.attributes.start && !btn.attributes.disabled) this.buttons._start_btn = btn;
		if (btn.attributes.selected && !btn.attributes.disabled) this.buttons._act_btn = btn;
		if (btn.up && !this.buttons[btn.up] && btn.up != 'out') throw 'Not existent up for '+id;
		if (btn.right && !this.buttons[btn.right] && btn.right != 'out') throw 'Not existent right for '+id;
		if (btn.down && !this.buttons[btn.down] && btn.down != 'out') throw 'Not existent down for '+id;
		if (btn.left && !this.buttons[btn.left] && btn.left != 'out') throw 'Not existent left for '+id;
		if (btn.attributes.disabled) btn.disable();
	}
	if (first_btn) {
		this.enable();
	} else {
		// если кнопок нет - выключаем компонент
		this.disable();
		// и переводим с него курсор, если он был активен
		if (is_hover) {
			if (this.adjacent_buttons._start_btn) this.adjacent_buttons._start_btn.onmouseover();
			is_hover = false;
		}
	}

	// если передан start_btn - стартуем с него
	if (first_btn && start_btn_id) {
		this.buttons._start_btn = this.buttons[start_btn_id];
		if (!this.buttons._start_btn) throw 'Not existent start btn '+start_btn_id+' on component '+this.id+' render';
		if (this.buttons._start_btn.attributes.disabled) this.buttons._start_btn = null;
	}

	// если компонент с data-selected и у его кнопок нет _act_btn, то наводим _act_btn на первую кнопку
	if (this.attributes.selected && !this.buttons._act_btn) this.buttons._act_btn = first_btn;

	// если перед рендеренгом уже были стартовая и активная кнопки - их и используем
	if (!this.buttons._start_btn) {
		for (var id in TV._hover_btns) {
			if (TV._hover_btns[id]+TV._render_ttl < TV._time) delete TV._hover_btns[id];
			if (TV._hover_btns[id] && this.buttons[id] && !this.buttons[id].disabled) this.buttons._start_btn = this.buttons[id];
		}
	}
	if (!this.buttons._act_btn) {
		for (var id in TV._selected_btns) {
			if (TV._selected_btns[id]+TV._render_ttl < TV._time) delete TV._selected_btns[id];
			if (TV._selected_btns[id] && this.buttons[id] && !this.buttons[id].disabled) this.buttons._act_btn = this.buttons[id];
		}
	}

	// если стартовой кнопки нет - считаем такой первую добавленную
	if (!this.buttons._start_btn && first_btn) this.buttons._start_btn = first_btn;

	// на активную кнопку добавляем класс
	if (this.buttons._act_btn) TV.addClass(this.buttons._act_btn.el, TVButton.act_class);
	// еслик компонент активен - на стартовую кнопку устанавливаем курсор
	if (first_btn && is_hover) this.buttons._start_btn.onmouseover();

	// реализуем onclick для компонента
	for (var id in this.buttons) {
		this.buttons[id].onclick = this.onButtonClick.bind(this);
		this.buttons[id].onhover = this.onButtonHover.bind(this);
	}
	
	// реализуем onhover для компонента
	for (var id in this.buttons) {
		this.buttons[id].onhover = this.onButtonHover.bind(this);
	}

	if (this.onready) this.onready();
};

TVComponent.prototype.onButtonClick = function(btn) {
	if (this.onclick) this.onclick(btn.id, btn);
};

TVComponent.prototype.onButtonHover = function(btn) {
	// перемещаем start
	this.buttons._start_btn = this.buttons._hover_btn;
	if (this.onhover) this.onhover(btn.id, btn);
};

TVComponent.prototype.onmouseover = function(event) {
	TVButton.prototype.onmouseover.call(this, event);
	if (!event && this.buttons._start_btn && !this.buttons._hover_btn) this.buttons._start_btn.onmouseover(event);
};

TVComponent.prototype.onmouseout = function(event) {
	// предотвращаем срабатывание внутри самого компонента
	if (event) {
		var p = event.relatedTarget;
		while (p) {
			if (p == this.el) return;
			p = p.parentElement;
		}
	}
	TVButton.prototype.onmouseout.call(this);
	if (!event && this.buttons._hover_btn) {
		this.buttons._hover_btn.onmouseout();
		this.buttons._hover_btn = null;
	}
};

TVComponent.prototype.oncursor = function(side) {
	if (this.buttons._hover_btn) {
		this.buttons._hover_btn.oncursor(side);
	} else if (this.buttons._start_btn) {
		this.buttons._start_btn.onmouseover();
	} else {
		TVButton.prototype.oncursor.call(this, side);
	}
};

TVComponent.prototype.onenter = function() {
	if (this.buttons._hover_btn) {
		this.buttons._hover_btn.onenter ? this.buttons._hover_btn.onenter() : this.buttons._hover_btn.onmouseclick();
	}
};
