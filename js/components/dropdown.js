TVComponents.Dropdown = function(el, adjacent_buttons, parent, class_name) {
    TVComponent.call(this, el, adjacent_buttons, parent, class_name);
	this.val = null;
};
TVComponents.Dropdown.default_title = 'Все';
TVComponents.Dropdown.prototype = Object.create(TVComponent.prototype);
 
TVComponents.Dropdown.prototype.onready = function() {
	var sides = ['up','down','left','right'];
	// создаем кнопку
	var el = TV.el('[data-type="dropdown_input"]', this.el);
	var button = new TVButton(el, this.buttons, this);
	sides.forEach(function(side){button[side] = 'out'}.bind(this));
	// создаем компонент слайдера
    el = TV.el('[data-type="dropdown_slider"]', this.el);
	var item_templ_name = (TV.app.curr_popup) ? TV.app.curr_popup.name : TV.app.curr_page.name;
	el.setAttribute('data-item_template', 'item#'+item_templ_name+'.'+this.id);
    var slider = new TVComponents.Slider(el, this.buttons, this);
    slider.class_name = 'Slider';
    slider.data = this.data;
    slider.init();
	// если элементов в слайдере меньше, чем указано в data-count, подгоняем высоту
	if (slider.data.length <= slider.count) slider.el.style.height = TV.getSize(TV.el('.slider-item', slider.el)).height * slider.data.length + 'px';
    slider.disable();

	this.buttons._start_btn = button;
	this.enable();

	button.onclick = function() {
		button.disable();
		slider.buttons._act_btn && slider.buttons._act_btn.resetAct();
		this.buttons._hover_btn = this.buttons._start_btn = slider;
		slider.enable();
		slider.onmouseover();
	}.bind(this);
    
    slider.onclick = function(id) {
	    if (typeof(id) == 'object') {
		    TVComponent.prototype.onenter.call(slider);
		    return;
	    }
	    this.val = this.data.filter(function(el) {
		    return el.id == id;
	    })[0];
	    TV.el('input',button.el).value = this.val ? this.val.title : TVComponents.Dropdown.default_title;
	    if (this.onclick) this.onclick(id);
        slider.disable();
        this.buttons._act_btn && this.buttons._act_btn.resetAct();
	    this.buttons._hover_btn = this.buttons._start_btn = button;
        button.enable();
    }.bind(this);

	slider.onout = function() {
		this.buttons._hover_btn = this.buttons._start_btn = button;
		slider.disable();
		button.resetHover();
		button.resetAct();
		button.enable();
	}.bind(this);
};