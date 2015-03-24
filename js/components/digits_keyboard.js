TVComponents.DigitsKeyboard = function(el, adjacent_buttons, parent, class_name) {
	TVComponent.call(this, el, adjacent_buttons, parent, class_name);
};
TVComponents.DigitsKeyboard.prototype = Object.create(TVComponent.prototype);

TVComponents.DigitsKeyboard.prototype.onButtonClick = function(btn) {
	// разрешаем повторное нажатие
	this.buttons._act_btn.resetAct();
	if (this.onclick) {
		if (btn.id == 'del') {
			this.onclick('/d');
		} else {
			this.onclick(btn.el.innerHTML);	
		}
	}	
};