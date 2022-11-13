var handlersSale = [];
var handlersRefill = [];
var handlersWarning = [];
var MachinePubSub = /** @class */ (function () {
    function MachinePubSub() {
    }
    MachinePubSub.prototype.publish = function (event) {
        switch (event.type()) {
            case 'sale':
                handlersSale.map(function (handler) {
                    if (handler.machine.id == event.machineId())
                        handler.handle(event);
                });
                break;
            case 'refill':
                handlersRefill.map(function (handler) {
                    if (handler.machine.id == event.machineId())
                        handler.handle(event);
                });
                break;
        }
    };
    MachinePubSub.prototype.subscribe = function (type, handler) {
        switch (type) {
            case 'sale':
                handlersSale.push(handler);
                break;
            case 'refill':
                handlersRefill.push(handler);
                break;
            case 'warning':
                handlersWarning.push(handler);
                break;
        }
    };
    MachinePubSub.prototype.unsubscribe = function (type, handler) {
        console.log(type.toUpperCase(), "Unsubscribe Machine No.", handler.machine.id);
        switch (type) {
            case 'sale':
                handlersSale = handlersSale.filter(function (item) {
                    return handler.machine.id != item.machine.id;
                });
                break;
            case 'refill':
                handlersRefill = handlersRefill.filter(function (item) {
                    return handler.machine.id != item.machine.id;
                });
                break;
            case 'warning':
                handlersWarning = handlersWarning.filter(function (item) {
                    return handler.machine.id != item.machine.id;
                });
                break;
        }
    };
    return MachinePubSub;
}());
// implementations
var MachineSaleEvent = /** @class */ (function () {
    function MachineSaleEvent(_sold, _machineId) {
        this._sold = _sold;
        this._machineId = _machineId;
    }
    MachineSaleEvent.prototype.machineId = function () {
        return this._machineId;
    };
    MachineSaleEvent.prototype.getSoldQuantity = function () {
        return this._sold;
    };
    MachineSaleEvent.prototype.type = function () {
        return 'sale';
    };
    return MachineSaleEvent;
}());
var MachineRefillEvent = /** @class */ (function () {
    function MachineRefillEvent(_refill, _machineId) {
        this._refill = _refill;
        this._machineId = _machineId;
    }
    MachineRefillEvent.prototype.machineId = function () {
        return this._machineId;
    };
    MachineRefillEvent.prototype.type = function () {
        return 'refill';
    };
    MachineRefillEvent.prototype.getRefillQuantities = function () {
        return this._refill;
    };
    return MachineRefillEvent;
}());
var MachineLowStockWarningEvent = /** @class */ (function () {
    function MachineLowStockWarningEvent(_stockLevel, _machineId) {
        this._stockLevel = _stockLevel;
        this._machineId = _machineId;
    }
    MachineLowStockWarningEvent.prototype.machineId = function () {
        return this._machineId;
    };
    MachineLowStockWarningEvent.prototype.type = function () {
        return 'warning';
    };
    MachineLowStockWarningEvent.prototype.getStockLevel = function () {
        return this._stockLevel;
    };
    return MachineLowStockWarningEvent;
}());
var MachineSaleSubscriber = /** @class */ (function () {
    function MachineSaleSubscriber(machine) {
        this.machine = machine;
    }
    MachineSaleSubscriber.prototype.handle = function (event) {
        var _this = this;
        if (!!this.machine.isactive) {
            this.machine.stockLevel -= event.getSoldQuantity();
            console.log('Sale on Machine No.', event.machineId(), ', Sale amount: ', event.getSoldQuantity(), ', Remaining Stock:', this.machine.stockLevel);
        }
        if (this.machine.stockLevel < 3) {
            handlersWarning.map(function (handler) {
                if (handler.machine.id == event.machineId())
                    handler.handle(new MachineLowStockWarningEvent(_this.machine.stockLevel, event.machineId()));
            });
        }
    };
    return MachineSaleSubscriber;
}());
var MachineRefillSubscriber = /** @class */ (function () {
    function MachineRefillSubscriber(machine) {
        this.machine = machine;
    }
    MachineRefillSubscriber.prototype.handle = function (event) {
        this.machine.stockLevel += event.getRefillQuantities();
        console.log('Refill Machine No.', event.machineId(), ', Refill Amount: ', event.getRefillQuantities(), ', Remaining Stock:', this.machine.stockLevel);
        if (this.machine.stockLevel >= 3 && !this.machine.isactive) {
            this.machine.isactive = true;
            console.log('Activating Machine No.', this.machine.id);
        }
    };
    return MachineRefillSubscriber;
}());
var MachineLowStockWarningSubscriber = /** @class */ (function () {
    function MachineLowStockWarningSubscriber(machine) {
        this.machine = machine;
    }
    MachineLowStockWarningSubscriber.prototype.handle = function (event) {
        this.machine.isactive = false;
        console.warn('Stock is low!!', ' Machine No:', event.machineId(), ', Remaining Stock:', this.machine.stockLevel);
        console.log('Deactivating Machine No.', this.machine.id);
    };
    return MachineLowStockWarningSubscriber;
}());
// objects
var Machine = /** @class */ (function () {
    function Machine(id) {
        this.stockLevel = 10;
        this.id = id;
        this.isactive = true;
    }
    return Machine;
}());
// helpers
var randomMachine = function () {
    var random = Math.random() * 3;
    if (random < 1) {
        return '001';
    }
    else if (random < 2) {
        return '002';
    }
    return '003';
};
var eventGenerator = function () {
    var random = Math.random();
    if (random < 0.5) {
        var saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
        return new MachineSaleEvent(saleQty, randomMachine());
    }
    var refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
    return new MachineRefillEvent(refillQty, randomMachine());
};
// program
(function () {
    // create 3 machines with a quantity of 10 stock
    var machines = [new Machine('001'), new Machine('002'), new Machine('003')];
    // create the PubSub service
    var pubSubService = new MachinePubSub;
    // create a machine sale event subscriber. inject the machines (all subscribers should do this)
    machines.map(function (machine) {
        var warning = new MachineLowStockWarningSubscriber(machine);
        pubSubService.subscribe('sale', new MachineSaleSubscriber(machine));
        pubSubService.subscribe('refill', new MachineRefillSubscriber(machine));
        pubSubService.subscribe('warning', warning);
        // unsubscribe sample
        if (machine.id == '001') {
            pubSubService.unsubscribe('warning', warning);
        }
    });
    // create 5 random events
    var events = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) { return eventGenerator(); });
    // publish the events
    events.map(pubSubService.publish);
})();
