function TVPopup(app, name) {
	var ejs_fn = app.ejs.popup[name];
	if (!ejs_fn) throw 'Not defined popup '+name+' template';
	app.popups[name] = this;
	
	this.app = app;
	this.el = null;
	this.buttons = {};          // хеш кнопок страницы
	this.props = [
		'name',					// название
		'container_class'		// класс для контейнера
	];
	for (var i in this.props) {
		this[this.props[i]] = ejs_fn.attributes[this.props[i]] || '';
	}
}

TVPopup.prototype.prerender = function() {
	// вызывается перед render
};

TVPopup.prototype.render = function(start_btn_id) {
	this.prerender();
	TV.render(this.el, this.name, this, 'popup');
	this.el.className = this.container_class;

	TVButton.initAll(this, start_btn_id);
	if (this.onready) this.onready();
};

TVPopup.prototype.show = function() {
	if (this.app.curr_popup) TVButton.clearAll(this.app.curr_popup);
	this.app.curr_popup = this;
	this.el = this.app.popup_el;
	TV.show(this.app.popup_overlay_el);
	TV.show(this.el);
	this.render();
	this.app.renderFooter();
};

TVPopup.prototype.hide = function() {
	if (this.app.curr_popup != this) throw 'Can not hide non current popup';
	this.beforehide();
	TVButton.clearAll(this.app.curr_popup);
	this.app.curr_popup = null;
	TV.setHTML(this.el, '');
	this.app.renderFooter();
	TV.hide(this.app.popup_overlay_el);
	TV.hide(this.el);
	this.afterhide();
};

TVPopup.prototype.beforehide = function() {
	// вызывается перед hide
};

TVPopup.prototype.afterhide = function() {
	// вызывается послe hide
};