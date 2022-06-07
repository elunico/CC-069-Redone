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
    EventUtil.dispatchSpawn(object, type, { x, y });
  }

  createFood(x, y) {
    const object = new Food(x, y);
    object.parentTarget = this;
    this.food.push(object);
    EventUtil.dispatchSpawn(object, Food, { x, y });
  }

  createPoison(x, y) {
    const object = new Poison(x, y);
    object.parentTarget = this;
    this.poison.push(object);
    EventUtil.dispatchSpawn(object, Poison, { x, y });
  }

  createVehicle(x, y, dna) {
    x = x || random(this.width);
    y = y || random(this.height);
    const object = new Vehicle(x, y, dna);
    object.parentTarget = this;
    EventUtil.dispatchSpawn(object, Vehicle, { x, y });
  }

  tickSpawnEnvironmentals() {
    if (random(1) < foodSpawnSlider.value()) {
      world.createFood();
    }

    if (random(1) < poisonSpawnSlider.value()) {
      world.createPoison();
    }

    if (random(1) < 0.005) {
      world.createEnvironmental(RadiationSource, random(width), random(height));
    }
  }

  tickClearDeadEnvironmentals() {
    this.food = this.food.filter(item => !item.dead);
    this.poison = this.poison.filter(item => !item.dead);
    this.environmentals = this.environmentals.filter(item => !item.dead);
  }

  tickBuildQuadtree(qtree) {
    this.food.forEach(item => qtree.insert(item));
    this.poison.forEach(item => qtree.insert(item));
    this.environmentals.forEach(item => qtree.insert(item));
    this.vehicles.forEach(vehicle => qtree.insert(vehicle));
  }

  tickUpdateAndDisplay(qtree) {
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
  }

  normalTick() {
    let qtree = new QuadTree(new Rectangle(0, 0, width, height), 4);

    this.tickClearDeadEnvironmentals();
    this.tickSpawnEnvironmentals();
    this.tickBuildQuadtree(qtree);

    this.tickUpdateAndDisplay(qtree);

    this.vehicles = this.vehicles.filter(i => !i.dead());

  }

  pausedTick() {
    this.environmentals.forEach(item => item.display());
    this.food.forEach(item => item.display());
    this.poison.forEach(item => item.display());
    this.vehicles.forEach(item => item.display());
  }

  tick() {
    if (!paused)
      this.normalTick();
    else
      this.pausedTick();
  }
}
