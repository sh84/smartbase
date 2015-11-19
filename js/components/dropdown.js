TVComponents.Dropdown = function(el, adjacent_buttons, parent, class_name) {
    TVComponent.call(this, el, adjacent_buttons, parent, class_name);
	this.val = null;
	this.button = null;
	this.slider = null;
};
TVComponents.Dropdown.default_title = 'Все';
TVComponents.Dropdown.prototype = Object.create(TVComponent.prototype);
 
TVComponents.Dropdown.prototype.onready = function() {
	var sides = ['up','down','left','right'];
	// создаем кнопку
	var el = TV.el('[data-type="dropdown_input"]', this.el);
	this.button = new TVButton(el, this.buttons, this);
	sides.forEach(function(side) {
		this.button[side] = 'out';
	}.bind(this));
	
	// создаем компонент слайдера
    el = TV.el('[data-type="dropdown_slider"]', this.el);
    var item_templ_name = 'item#' + (TV.app.curr_popup ? TV.app.curr_popup.name : TV.app.curr_page.name) + '.' + this.id;
    if (this.attributes.item_template && TV.app.ejs[this.attributes.item_template]) item_templ_name = this.attributes.item_template;    
	el.setAttribute('data-item_template', item_templ_name);
    this.slider = new TVComponents.Slider(el, this.buttons, this);
    this.slider.class_name = 'Slider';
    this.slider.data = this.data;
    for (var i=0; i < this.slider.data.length; i++) {
    	if (typeof(this.slider.data[i].id) == 'undefined') this.slider.data[i].id = i;
    }
    this.slider.init();
	
	// если элементов в слайдере меньше, чем указано в data-count, подгоняем высоту
	if (this.data.length <= this.slider.count) this.slider.el.style.height = TV.getSize(TV.el('.slider-item', this.slider.el)).height * this.slider.data.length + 'px';
    this.slider.disable();

	this.buttons._start_btn = this.button;
	this.enable();
	this.attachCallbacks();
	
	// выставляем стартовое значение
	this.data.forEach(function(el) {
		if (el.selected) {
			for (var id in this.slider.buttons) {	
				if (el.id == this.slider.buttons[id].attributes.key) this.slider.buttons[id].onmouseclick();
			}
		}
	}.bind(this));
};

TVComponents.Dropdown.prototype.attachCallbacks = function() {
	this.button.onclick = function() {
		this.button.disable();
		this.slider.buttons._act_btn && this.slider.buttons._act_btn.resetAct();
		this.buttons._hover_btn = this.buttons._start_btn = this.slider;
		this.slider.enable();
		this.slider.onmouseover();
	}.bind(this);
    
    this.slider.onclick = function(key) {
	    if (typeof(key) == 'object') {
		    TVComponent.prototype.onenter.call(this.slider);
		    return;
	    }
	    this.val = this.data.filter(function(el) { return el.id == key; })[0];
	    TV.el('input', this.button.el).value = this.val ? this.val.title : TVComponents.Dropdown.default_title;
	    if (this.onclick) this.onclick(key);
        this.slider.disable();
        this.buttons._act_btn && this.buttons._act_btn.resetAct();
	    this.buttons._hover_btn = this.buttons._start_btn = this.button;
        this.button.enable();
    }.bind(this);

	this.slider.onout = function() {
		this.buttons._hover_btn = this.buttons._start_btn = this.button;
		this.slider.disable();
		this.button.resetHover();
		this.button.resetAct();
		this.button.enable();
	}.bind(this);
};