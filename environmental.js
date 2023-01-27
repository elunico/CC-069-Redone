
const SIN_LOOKUP = [];

for (let i = 0; i < 63; i++) {
  SIN_LOOKUP[i] = Math.sin(i * 2 * Math.PI / 63);
}

class Environmental extends CustomEventTarget {
  /* FOR QUADTREE */
  get x() {
    return this.position.x;
  }

  set x(value) {
    this.position.x = value;
  }

  get y() {
    return this.position.y;
  }

  set y(value) {
    this.position.y = value;
  }
  /* END FOR QUADTREE */

  get dead() {
    return !this.valid;
  }

  display() {
    push();
    translate(this.position.x, this.position.y);
    stroke(this.color);
    strokeWeight(this.size);
    point(0, 0);
    pop();
  }

  constructor(x, y, color, size) {
    super();
    x = x || random(width);
    y = y || random(height);
    this.position = createVector(x, y);
    this.color = color;
    this.size = size;

    this.valid = true;
  }


  // IMPLEMENT THESE METHODS
  affect(vehicle) { throw new Error("Not implemented"); }

  invalidate() { throw new Error("Not implemented"); }

  update() { throw new Error("Not implemented"); }
}

class Food extends Environmental {
  constructor(x, y) {
    super(x, y, color(0, 200, 255), 5);
    this.living_frames = 0;
    this.max_frames = 2000;
    this.nutrition = 0.2;
  }

  affect(vehicle) {
    vehicle.health += 0.2;
    EventUtil.dispatchEat(vehicle, this);
    EventUtil.dispatchEaten(vehicle, this);
  }

  update() {
    if (this.living_frames >= this.max_frames) {
      this.valid = false;
    } else {
      this.living_frames++;
    }
  }

  invalidate() {
    this.valid = false;
    EventUtil.dispatchInvalidate(this, Food);
  }
}

class Poison extends Environmental {
  constructor(x, y) {
    super(x, y, color(255, 0, 0), 5);
    this.living_frames = 0;
    this.max_frames = 2000;
    this.nutrition = -1;
  }

  affect(vehicle) {
    vehicle.health -= 1;
    EventUtil.dispatchEat(vehicle, this);
    EventUtil.dispatchEaten(vehicle, this);
  }

  update() {
    if (this.living_frames >= this.max_frames) {
      this.valid = false;
    } else {
      this.living_frames++;
    }
  }

  invalidate() {
    this.valid = false;
    EventUtil.dispatchInvalidate(this, Poison);
  }
}

// base class used for all environmental objects that are not food or poison
// aka all objects the vehicle does not actively care about but can still be affected by
class PassiveEnvironmental extends Environmental {
  invalidate() {
    // do nothing; vehicles do not affect PassiveEnvironmentals
  }
}

class RadiationSource extends PassiveEnvironmental {
  constructor(x, y) {
    super(x, y, color(0, 255, 0), 5);
    this.living_frames = 0;
    this.max_frames = 10000;
    this.original_size = 5;
  }

  affect(vehicle) {
    vehicle.health -= 0.1;
    vehicle.dna.mutate();
    EventUtil.dispatchEat(vehicle, this);
    // does not dispatch eaten event because it is a passive environmental
  }

  update() {
    if (this.living_frames >= this.max_frames) {
      this.valid = false;
    } else {
      this.living_frames++;
    }
  }

  display() {
    this.size = lerp(this.original_size, this.original_size * 1.5, 1 + SIN_LOOKUP[this.living_frames % 63]);
    super.display();
  }
}
