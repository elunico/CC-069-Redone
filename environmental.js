class Environmental {
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

  constructor(health_value, x, y) {
    x = x || random(width);
    y = y || random(height);
    this.position = createVector(x, y);
    this.health_value = health_value;
    this.color = health_value > 0 ? color(0, 255, 0) : color(255, 0, 0);
    this.existingFrames = 0;
    this.maxFrames = 3500;
    this.valid = true;
  }

  invalidate() {
    this.valid = false;
  }

  update() {
    this.existingFrames++;
  }

  get dead() {
    return this.existingFrames >= this.maxFrames || !this.valid;
  }

  display() {
    push();
    translate(this.position.x, this.position.y);
    if (mouseIsPressed) {
      textSize(14);
      fill(255);
      stroke(0);
      strokeWeight(1);
      text(`${this.health_value}`, 0, -10);
    }
    stroke(this.color);
    strokeWeight(4);
    point(0, 0);
    pop();
  }
}

class Food extends Environmental {
  constructor(x, y) {
    super(0.2, x, y);
  }
}

class Poison extends Environmental {
  constructor(x, y) {
    super(-1, x, y);
  }
}
