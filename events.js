class CustomEventTarget extends EventTarget {
  constructor() {
    super();
    this._parentTarget = null;

    this.universal = [];
  }

  addEventListener(type, listener, options) {
    if (type == '*') {
      this.universal.push(listener);
    } else {
      super.addEventListener(type, listener, options);
    }
  }

  get parentTarget() {
    return this._parentTarget;
  }

  set parentTarget(target) {
    if (!(target instanceof EventTarget)) {
      throw new TypeError("Parent target must be an instance of EventTarget");
    }
    this._parentTarget = target;
  }

  dispatchEvent(event) {
    this.universal.forEach(listener => listener(event));
    let continues = super.dispatchEvent(event);
    if (continues && this.parentTarget && event.bubbles) {
      // bubble
      this.parentTarget.dispatchEvent(event);
    }
  }
}

class EventDispatch {
  static dispatchDie(vehicle, cause) {
    vehicle.dispatchEvent(new CustomEvent('die', {
      bubbles: true,
      detail: {
        self: vehicle,
        cause,
      }
    }));
  }

  static dispatchEat(vehicle, food) {
    vehicle.dispatchEvent(new CustomEvent('eat', {
      bubbles: true,
      detail: {
        position: food.position,
        augment: food.nutrition
      }
    }));
  }

  static dispatchEaten(vehicle, food) {
    food.dispatchEvent(new CustomEvent('eaten', {
      bubbles: true,
      detail: {
        position: food.position,
        agent: vehicle
      }
    }));
  }

  static dispatchInvalidate(object, type) {
    object.dispatchEvent(new CustomEvent('invalidate', {
      bubbles: true,
      detail: {
        type: type,
        position: object.position
      }
    }));
  }

  static dispatchMalice(vehicle, target) {
    vehicle.dispatchEvent(new CustomEvent('malice', {
      bubbles: true,
      detail: {
        target: target,
        self: vehicle
      }
    }));
  }

  static dispatchReproduce(vehicle, partner, child, childCount) {
    vehicle.dispatchEvent(new CustomEvent('reproduce', {
      bubbles: true,
      detail: {
        self: vehicle,
        partner: partner,
        child: child,
        childCount,
      }
    }));
  }

  static dispatchSpawn(object, type, position) {
    object.dispatchEvent(new CustomEvent('spawn', {
      bubbles: true,
      detail: {
        object: object,
        type: type,
        position: position
      }
    }));
  }

  static dispatchMutate(object, name, old, current, owner) {
    object.dispatchEvent(new CustomEvent('mutate', { bubbles: true, detail: { name: name, old: old, current: current, parent: owner } }));

  }
}
