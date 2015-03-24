TVComponents.Menu = function(el, adjacent_buttons, parent, class_name) {
	TVComponent.call(this, el, adjacent_buttons, parent, class_name);
};
TVComponents.Menu.prototype = Object.create(TVComponent.prototype);

TVComponents.Menu.prototype.onButtonClick = function(btn) {
	TV.app.pages[btn.attributes.page_id].show();
};