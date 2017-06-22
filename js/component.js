/* global TV, TVButton */
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
		if (typeof fn == 'undefined')
			throw new Error('Non existent data-provider for component '+this.id);
		if (typeof fn == 'function') {
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
	return this.adjacent_buttons._hover_btn == this ||
		!this.parent && Object.keys(this.adjacent_buttons).length == 1;
};

TVComponent.prototype.render = function(start_btn_id) {
	if (this._data_fn) this.data = this._data_fn();

	// если для компонента есть шаблон - рендерим
	var cl;
	if (this.class_name && TV.app.ejs['component#'+this.class_name])
		cl = 'component#'+this.class_name;
	if (this.template && TV.app.ejs['component#'+this.template])
		cl = 'component#'+this.template;
	if (this.attributes.template && TV.app.ejs['component#'+this.attributes.template])
		cl = 'component#'+this.attributes.template;
	if (cl) {
		this.prerender();
		TV.render(this.el, cl, this);
	}

	this.clearAll();
	TVButton.initButtonsAndComponents(this, start_btn_id);

	// реализуем onclick и onhover для компонента
	for (var id in this.buttons) {
		this.buttons[id].onclick = this.onButtonClick.bind(this);
		this.buttons[id].onhover = this.onButtonHover.bind(this);
	}

	if (this.onready) this.onready();
};

TVComponent.prototype.onButtonClick = function(btn, event) {
	if (this.onclick) this.onclick(btn.id, btn, event);
};

TVComponent.prototype.onButtonHover = function(btn) {
	// перемещаем start
	this.buttons._start_btn = this.buttons._hover_btn;
	if (this.onhover) this.onhover(btn.id, btn);
};

TVComponent.prototype.onmouseover = function(event) {
	TVButton.prototype.onmouseover.call(this, event);
	if (!event && this.buttons._start_btn && !this.buttons._hover_btn)
		this.buttons._start_btn.onmouseover(event);
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
		this.buttons._hover_btn.onenter ?
			this.buttons._hover_btn.onenter() :
			this.buttons._hover_btn.onmouseclick();
	}
};
