window.addEventListener("keypress", function(e){
    // Hack чтобы закрыть окно Smartpay: он отрабатывает закрытие на код 461 а не 8
    if(e.keyCode == 8 && SmartpayGateway && 
        ((typeof(SmartpayGateway._state) != 'undefined' && SmartpayGateway._state != '') ||
        (typeof(SmartpayGateway._activeState) != 'undefined' && SmartpayGateway._activeState != ''))) { // В это место попадает когда покупаем по пину

        SmartpayGateway.onBack();
        window.history.pushState({ "data": "some data" });
    }
}, true);

