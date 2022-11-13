// interfaces
interface IEvent {
  type(): string;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish (event: IEvent): void;
  subscribe (type: string, handler: any): void;
  unsubscribe (type: string, handler: ISubscriber): void;
}

let handlersSale:  MachineSaleSubscriber[] = [];
let handlersRefill: MachineRefillSubscriber[] = [];
let handlersWarning: MachineLowStockWarningSubscriber[] = [];
class MachinePubSub implements IPublishSubscribeService {
  publish(event: any): void {
    switch(event.type()) {
      case 'sale':
        handlersSale.map(handler => {
          if(handler.machine.id == event.machineId())
            handler.handle(event)
        });
        break;
      case 'refill':
        handlersRefill.map(handler => {
          if(handler.machine.id == event.machineId())
            handler.handle(event)
        })
        break;
    }
  }

  subscribe(type: string, handler: any): void {
    switch(type) {
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
    
  }

  unsubscribe(type: string, handler: any): void {
    console.log(type.toUpperCase() ,"Unsubscribe Machine No.", handler.machine.id);
    
    switch(type) {
      case 'sale':
        handlersSale = handlersSale.filter(item => {
          return handler.machine.id != item.machine.id
        })
        break;
      case 'refill':
        handlersRefill = handlersRefill.filter(item => {
          return handler.machine.id != item.machine.id
        })
        break;
      case 'warning':
        handlersWarning = handlersWarning.filter(item => {
          return handler.machine.id != item.machine.id
        })
        break;
    }
  }
}
// implementations
class MachineSaleEvent implements IEvent {
  constructor(private readonly _sold: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold
  }

  type(): string {
    return 'sale';
  }
}

class MachineRefillEvent implements IEvent {
  constructor(private readonly _refill: number, private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'refill'
  }

  getRefillQuantities(): number{
    return this._refill;
  }
}

class MachineLowStockWarningEvent implements IEvent {
  constructor(private readonly _stockLevel: number,private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): string {
    return 'warning'
  }

  getStockLevel(): number{
    return this._stockLevel;
  }
}

class MachineSaleSubscriber implements ISubscriber {
  public machine: Machine;

  constructor (machine: Machine) {
    this.machine = machine; 
  }

  handle(event: MachineSaleEvent): void {
    if(!!this.machine.isactive){
      this.machine.stockLevel -= event.getSoldQuantity();
      console.log('Sale on Machine No.',event.machineId(),', Sale amount: ',event.getSoldQuantity(),', Remaining Stock:', this.machine.stockLevel);
    }
    if(this.machine.stockLevel < 3){
      handlersWarning.map(handler => {
        if(handler.machine.id == event.machineId())
          handler.handle(new MachineLowStockWarningEvent(this.machine.stockLevel,event.machineId()))
      })
    }
      
  }
}

class MachineRefillSubscriber implements ISubscriber {
  public machine: Machine;

  constructor (machine: Machine) {
    this.machine = machine; 
  }

  handle(event: MachineRefillEvent): void {
    this.machine.stockLevel += event.getRefillQuantities();
    console.log('Refill Machine No.', event.machineId(),', Refill Amount: ',event.getRefillQuantities(),', Remaining Stock:', this.machine.stockLevel);
    if(this.machine.stockLevel >= 3 && !this.machine.isactive){
      this.machine.isactive = true;
      console.log('Activating Machine No.',this.machine.id);
    }
  }
}

class MachineLowStockWarningSubscriber implements ISubscriber {
  public machine: Machine;

  constructor (machine: Machine) {
    this.machine = machine; 
  }

  handle(event: MachineLowStockWarningEvent): void {
    this.machine.isactive = false;
    console.warn('Stock is low!!',' Machine No:',event.machineId(),', Remaining Stock:', this.machine.stockLevel)
    console.log('Deactivating Machine No.',this.machine.id);
  }
}


// objects
class Machine {
  public stockLevel = 10;
  public isactive: boolean;
  public id: string;

  constructor (id: string) {
    this.id = id;
    this.isactive = true;
  }
}


// helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return '001';
  } else if (random < 2) {
    return '002';
  }
  return '003';

}

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  } 
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
}


// program
(() => {  
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [ new Machine('001'), new Machine('002'), new Machine('003') ];

  // create the PubSub service
  const pubSubService: MachinePubSub = new MachinePubSub;

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  machines.map((machine) => {
    const warning = new MachineLowStockWarningSubscriber(machine)
    pubSubService.subscribe('sale', new MachineSaleSubscriber(machine))
    pubSubService.subscribe('refill', new MachineRefillSubscriber(machine))
    pubSubService.subscribe('warning', warning)
    
    // unsubscribe sample
    if (machine.id == '001'){
      pubSubService.unsubscribe('warning', warning)
    }
  })
  
  // create 5 random events
  const events = [1,2,3,4,5,6,7,8,9,10].map(i => eventGenerator());

  // publish the events
  events.map(pubSubService.publish);  
})();
