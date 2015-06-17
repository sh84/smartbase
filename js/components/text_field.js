TVComponents.TextField = function(el, adjacent_buttons, parent, class_name) {
	TVComponent.call(this, el, adjacent_buttons, parent, class_name);
    TV.log("TextField init");

    this._need_blur = true; // Действительно ли нужно убрать фокус?
    this.changeCallback = null;

    // На фокусе отключаем собственную обработку нажатий клавиш
    el.onfocus = function() {
        app.curr_page.onAnyKey = function(){return false};
    }.bind(this);

    el.onblur = function() {
        // Если мы почему-то потеряли фокус, хотя не должны были, возвращаемся
        if (! this._need_blur) el.focus();
    }.bind(this);

    el.onkeydown = function(event) {
        // По нажатию на стрелки - выходим
        if (event.keyCode == 37 ||
            event.keyCode == 38 ||
            event.keyCode == 39 ||
            event.keyCode == 40) {
            app.curr_page.onAnyKey = null;
            this._need_blur = true;
            el.blur();
            this.buttons._start_btn.onmouseover();
        // Синяя клавиша стирает символ
        } else if (event.keyCode == 8) {
            if (el != '') el.value = el.value.substr(0,el.value.length - 1);
            // Не забываем вызвать функцию при изменении строки (нипример, поиск в списке)
            if (this.changeCallback) this.changeCallback();
        // Печатаем символ
        } else {
            if (! app.curr_page.onAnyKey) app.curr_page.onAnyKey = function(){return false};
        }
    }.bind(this);

    // При изменении строки вызываем колбэк
    el.oninput = function() {
        if (this.changeCallback) this.changeCallback();
    }.bind(this);

};

TVComponents.TextField.prototype = Object.create(TVComponent.prototype);

// При наведении на компонент отдаем ему управление
TVComponents.TextField.prototype.onmouseover = function(event) {
    TVButton.prototype.onmouseover.call(this);
    this._need_blur = false;
    this.el.focus();
};

