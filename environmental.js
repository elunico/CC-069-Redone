
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
    super(x, y, color(0, 255, 0), 5);
    this.living_frames = 0;
    this.max_frames = 2000;
  }

  affect(vehicle) {
    vehicle.health += 0.2;
    vehicle.dispatchEvent(new CustomEvent('eat', { bubbles: true, detail: { augment: 0.2, position: this.position } }));
    this.dispatchEvent(new CustomEvent('eaten', { bubbles: true, detail: { agent: vehicle, position: this.position } }));
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
    this.dispatchEvent(new CustomEvent('invalidate', { bubbles: true, detail: { type: 'food', position: this.position } }));
  }
}

class Poison extends Environmental {
  constructor(x, y) {
    super(x, y, color(255, 0, 0), 5);
    this.living_frames = 0;
    this.max_frames = 2000;
  }

  affect(vehicle) {
    vehicle.health -= 1;
    vehicle.dispatchEvent(new CustomEvent('eat', { bubbles: true, detail: { augment: -1, position: this.position } }));
    this.dispatchEvent(new CustomEvent('eaten', { bubbles: true, detail: { agent: vehicle, position: this.position } }));
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
    this.dispatchEvent(new CustomEvent('invalidate', { bubbles: true, detail: { type: 'poison', position: this.position } }));
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
    super(x, y, color(255, 255, 0), 5);
    this.living_frames = 0;
    this.max_frames = 10000;
    this.original_size = 5;
  }

  affect(vehicle) {
    vehicle.health -= 0.1;
    vehicle.dna.mutate();
    vehicle.dispatchEvent(new CustomEvent('eat', { bubbles: true, detail: { augment: -0.1, position: this.position } }));
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
