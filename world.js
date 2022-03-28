class World extends CustomEventTarget {
  constructor(width, height, food_count, poison_count, vehicle_count) {
    super();
    this.food = [];
    this.poison = [];
    this.vehicles = [];
    this.environmentals = [];

    this.width = width;
    this.height = height;
    this.food_count = food_count;
    this.poison_count = poison_count;
    this.vehicle_count = vehicle_count;
  }

  populate() {
    for (let i = 0; i < this.food_count; i++) {
      this.createFood();
    }

    for (let i = 0; i < this.poison_count; i++) {
      this.createPoison();
    }

    for (let i = 0; i < this.vehicle_count; i++) {
      this.createVehicle();
    }
  }

  createEnvironmental(type, x, y) {
    let object = new type(x, y);
    object.parentTarget = this;
    this.environmentals.push(object);
    this.dispatchEvent(new CustomEvent('spawn', { bubbles: true, detail: { type, object, position: { x, y } } }));
  }

  createFood(x, y) {
    const object = new Food(x, y);
    object.parentTarget = this;
    this.food.push(object);
    this.dispatchEvent(new CustomEvent('spawn', { bubbles: true, detail: { type: Food, object, position: this.position } }));
  }

  createPoison(x, y) {
    const object = new Poison(x, y);
    object.parentTarget = this;
    this.poison.push(object);
    this.dispatchEvent(new CustomEvent('spawn', { bubbles: true, detail: { type: Poison, object, position: this.position } }));
  }

  createVehicle(x, y, dna) {
    x = x || random(this.width);
    y = y || random(this.height);
    const object = new Vehicle(x, y, dna);
    object.parentTarget = this;
    this.vehicles.push(object);
    this.dispatchEvent(new CustomEvent('spawn', { bubbles: true, detail: { type: Vehicle, object, position: this.position } }));
  }


  tick() {
    if (!paused) {
      if (random(1) < foodSpawnSlider.value()) {
        world.createFood();
      }

      if (random(1) < poisonSpawnSlider.value()) {
        world.createPoison();
      }

      if (random(1) < 0.005) {
        world.createEnvironmental(RadiationSource, random(width), random(height));
      }

      this.food = this.food.filter(item => !item.dead);
      this.poison = this.poison.filter(item => !item.dead);
      this.environmentals = this.environmentals.filter(item => !item.dead);

      this.food.forEach(item => qtree.insert(item));
      this.poison.forEach(item => qtree.insert(item));
      this.environmentals.forEach(item => qtree.insert(item));
      this.vehicles.forEach(vehicle => qtree.insert(vehicle));

      this.food.forEach(item => {
        item.update();
        item.display();
      });

      this.poison.forEach(item => {
        item.update();
        item.display();
      });

      this.environmentals.forEach(item => {
        item.update();
        item.display();
      });

      this.vehicles.forEach((vehicle) => {

        vehicle.tick(qtree);
        vehicle.display();

      });
      this.vehicles = this.vehicles.filter(i => !i.dead());
    }
    else {
      for (let i = 0; i < this.environmentals.length; i++) {
        this.environmentals[i].display();
      }

      for (let i = 0; i < this.food.length; i++) {
        this.food[i].display();
      }

      for (let i = 0; i < this.poison.length; i++) {
        this.poison[i].display();
      }

      for (let i = this.vehicles.length - 1; i >= 0; i--) {
        this.vehicles[i].display();
      }
    }
  }
}
