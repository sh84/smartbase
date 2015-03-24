TVComponents.Keyboard = function(el, adjacent_buttons, parent, class_name) {
	TVComponent.call(this, el, adjacent_buttons, parent, class_name);	
	this.lang = 'rus';
	this.keys_arr = {};
	this.keys_arr['rus']={
		main:[[0,1,2,3,4,5,6,7,8,9,'-'],['а','б','в','г','д','е','ё','ж','з','и','й'],
				['к','л','м','н','о','п','р','с','т','у','ф'],['х','ц','ч','ш','щ','ъ','ы','ь','э','ю','я']],
		bottom:['рус','пробел','стереть']
	}
	this.keys_arr['en']={
		main:[[0,1,2,3,4,5,6,7,8,9,'-'],['a','b','c','d','e','f','g','h','i','j','k'],
				['l','m','n','o','p','q','r','s','t','u','v'],['w','x','y','z']],
		bottom:['eng','space','delete']
	}
};
TVComponents.Keyboard.prototype = Object.create(TVComponent.prototype);

TVComponents.Keyboard.prototype.onButtonClick = function(btn) {
	// разрешаем повторное нажатие
	this.buttons._act_btn.resetAct();
	if (btn.id == 'change_lang') {
		(this.lang == 'rus' ) ? this.lang = 'en' : this.lang = 'rus';
		this.render('change_lang');
		return;
	}
	if (this.onclick) {
		if (btn.id == 'space') {
			this.onclick(' ');
		} else if (btn.id == 'del') {
			this.onclick('/d');
		} else {
			this.onclick(btn.el.innerHTML);	
		}
	}	
};