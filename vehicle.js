function vecDistSq(a, b) {
  return ((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
}

class Vehicle extends CustomEventTarget {

  get r() {
    return this.dna.getGene(adultSize);
  }

  get maxspeed() {
    return this.dna.getGene(maxSpeed);
  }

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


  constructor(x, y, dna, mr = 0.05) {
    super();
    this.acceleration = createVector(0, 0);
    this.velocity = p5.Vector.mult(p5.Vector.random2D(), random(-2, 2)); // createVector(0, -2);
    this.position = createVector(x, y);
    this.maxforce = 0.5;
    this.debugging = false;

    this.health = 1;

    this.livingFrames = 0;
    this.maxFrames = 14000; // max age is 14000 frames (233 seconds)
    this.lastReproduced = null;
    this.killed = false; // used for 'supernatural' killing by the user using this.kill()

    if (dna === undefined) {
      this.dna = new DNA();

      // weights steering force for seeking and eating food
      this.dna.addGene(new Gene(foodDesire, random(-2, 2), -2, 2, mr));

      // weights steering force for avoiding poison
      this.dna.addGene(new Gene(poisonDesire, random(-2, 2), -2, 2, mr));

      // determines how far away the food is before it can be considered for seeking
      this.dna.addGene(new Gene(foodPerception, random(0, 100), 0, 100, mr));

      // determines how far away the poison is before it can be considered for avoiding
      this.dna.addGene(new Gene(poisonPerception, random(0, 100), 0, 100, mr));

      // controls how far away the nearest vehicle is before it can be considered for seeking
      // used for both altruism and seeking help as well as reproduction
      // might be good to have separate perception radii for other vehicles for each of these
      this.dna.addGene(new Gene(othersPerception, random(0, 110), 0, 110, mr));

      // controls how likely is it that the vehicle will donate some food to a nearby vehicle
      // this happens completely independently of health and other factors - pure random chance
      this.dna.addGene(new Gene(donationChance, random(0, 1), 0, 1, mr));

      // controls how strongly vehicles will prefer seeking help to other things
      // also weighs how willing they are to steer towards someone in need. Presumably this could change
      this.dna.addGene(new Gene(helpDesire, random(-2, 2), -2, 2, mr));

      // controls how likely is it that vehicle gives away food and health to a less well off vehicle
      this.dna.addGene(new Gene(pityChance, random(0, 1), 0, 1, mr));

      // controls how strongly vehicles will prefer seeking another vehicle for reproduction over other things
      this.dna.addGene(new Gene(reproductionDesire, random(-2, 2), -2, 2, mr));

      // determines how many SECONDS after the beginning lifetime of the vehicle before it can reproduce
      this.dna.addGene(new Gene(ageOfMaturity, random(2 * 60, 6 * 60), 2 * 60, 6 * 60, mr));

      // adult size
      this.dna.addGene(new Gene(adultSize, random(3, 7), 3, 7, mr));

      // maximum speed
      this.dna.addGene(new Gene(maxSpeed, random(3, 8), 3, 8, mr));

      // malice chance - the chance that, when encountering another vehicle, this vehicle will kill it
      this.dna.addGene(new Gene(maliceChance, random(0, 0.05), 0, 0.05, mr));

      // litter size - number of offspring produced in reproduction
      this.dna.addGene(new Gene(litterSize, random(1, 3), 1, 20, mr));
    }
    else {
      this.dna = dna.clone();
    }
    this.dna.parentTarget = this;

    // needed for the quadtree. might be better to taylor but since the perceptions are similar, we just do this once
    this.maxPerception = this.findMaxPerception();
  }

  findMaxPerception() {
    return max([this.dna.getGene(foodPerception), this.dna.getGene(poisonPerception), this.dna.getGene(othersPerception)]);
  }

  kill() {
    this.killed = true;
  }

  tick(world) {
    // check if supernaturally killed first (Using the kill method)
    if (this.killed) {
      this.health = -Infinity;
      EventUtil.dispatchDie(this, 'killed by supernatural forces');
      return;
    }
    // vehicles have genes that cause them to seek food, avoid poison, and seek other vehicles
    this.doMovementBehavior(world);

    let neighborhood = world.query(Vehicle, new Circle(this.position.x, this.position.y, this.dna.getGene(othersPerception)));

    this.attemptAltruism(neighborhood);

    if (this.dead()) {
      EventUtil.dispatchDie(this, 'over aultruistic');
    }

    this.attemptReproduction(neighborhood);
    this.attemptMalice(neighborhood);

    // other things exist in the environment but are not effected by genes or desires and so we handle these
    // separately. The vehicles do not seek or flee from these but if they encounter them by chance, they
    // will/can be affected by them
    this.environmentAffects(world);

    if (this.dead()) {
      EventUtil.dispatchDie(this, 'over environment/poison');
    }

    this.update();

    if (this.dead()) {
      EventUtil.dispatchDie(this, 'hunger');
    }

    if (this.livingFrames > this.maxFrames) {
      this.health = -Infinity;
      EventUtil.dispatchDie(this, 'age');
    }

  }

  // Moves the vehicle and determines if it too old
  update() {
    this.health -= 0.01;
    this.livingFrames++;

    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
    this.boundaries();
  }

  // accumulate forces
  applyForce(force) {
    // We could add mass here if we want A = F / M
    this.acceleration.add(force);
  }

  // accumulates all the forces that move the vehicle based on environmental things
  // like food and poison as well as the other vehicles in the system
  // All are weighted by the DNA of the vehicles
  // Vehicles can be violent towards each other, but do not currently seek others FOR violence
  // this simulates the idea of normally seeking food, help, and mates and possibly having
  // a chance to kill each other presumably based on fights, competition, etc.
  doMovementBehavior(world) {
    let steerG = this.seekEnvironmentals(world, Food, this.dna.getGene(foodPerception));
    let steerB = this.seekEnvironmentals(world, Poison, this.dna.getGene(poisonPerception));

    let neighborhood = world.query(Vehicle, new Circle(this.position.x, this.position.y, this.dna.getGene(othersPerception)));

    let mateSteer = this.seekVehicles(neighborhood, this.dna.getGene(othersPerception), this.dna.getGene(reproductionDesire));
    let helpSteer = this.seekVehicles(neighborhood, this.dna.getGene(othersPerception), this.health > 0.5 ? 0 : 1);
    let altruismSteer = this.seekVehicles(neighborhood, this.dna.getGene(othersPerception), this.dna.getGene(pityChance));

    steerG.mult(this.dna.getGene(foodDesire));
    steerB.mult(this.dna.getGene(poisonDesire));
    helpSteer.mult(this.dna.getGene(helpDesire));
    mateSteer.mult(this.dna.getGene(reproductionDesire));
    altruismSteer.mult(this.dna.getGene(helpDesire));

    // seek help only when health is low (calculated in seekNearestVehicle)
    // and when food is far away.
    this.applyForce(steerG);
    this.applyForce(helpSteer);
    this.applyForce(mateSteer);
    this.applyForce(altruismSteer);
    this.applyForce(steerB);
  }

  // use perception and willingness (from DNA) to determine the force pushing
  // the vehicle towards other members of the population
  seekVehicles(neighborhood, perceptionDistance, willingness) {
    let record = Infinity;
    let nearest = null;

    for (let other of neighborhood) {
      if (other !== this) {
        let d = vecDistSq(this.position, other.position); // this.position.dist(other.position);
        if (d < record) {
          nearest = other;
          record = d;
        }
      }
    }

    if (record < (perceptionDistance * perceptionDistance) && random(1) < willingness) {
      return this.seek(nearest.position);
    }
    else {
      return createVector(0, 0);
    }
  }

  // Determines the steer forces applicable to particular elements of the environment
  // like food and poison
  seekEnvironmentals(world, type, perception) {
    let record = Infinity;
    let closest = null;
    for (let other of world.query(type, new Circle(this.position.x, this.position.y, perception))) {
      let d = vecDistSq(this.position, other.position); // this.position.dist(other.position);

      if (d < (this.maxspeed * this.maxspeed) && other.valid) {
        other.affect(this);
        // mark the food/poison as invalid so that the next vehicle in update does not attempt to eat this food also
        other.invalidate();
      }
      else {
        if (d < record && d < (perception * perception)) {
          record = d;
          closest = other;
        }
      }
    }

    // This is the moment of eating!
    if (closest != null) {
      return this.seek(closest.position);
    }

    return createVector(0, 0);
  }

  environmentAffects(world) {
    // environmental affects that happen independently of the other vehicles or this vehicle's desires or genes
    for (let other of world.query(PassiveEnvironmental, new Circle(this.position.x, this.position.y, 100))) {
      let d = vecDistSq(this.position, other.position); // this.position.dist(other.position);

      if (d < (this.maxspeed * this.maxspeed) && other.valid) {
        other.affect(this);
        // by default invalidating PassiveEnvironment objects does nothing but we still call this incase a subclass
        // overwrites this method
        other.invalidate();
      }
    }
  }

  // performs the actual donation of food if a vehicle is close enough to do it and
  // based on probability of donation
  attemptAltruism(neighborhood) {
    let perception = this.dna.getGene(othersPerception);
    for (let other of neighborhood) {
      if (other !== this) {
        let d = vecDistSq(this.position, other.position);
        if (d < (perception * perception)) {
          if (random(1) < this.dna.getGene(donationChance)) {
            other.health += 0.1; // half the food score
            this.health -= 0.1; // simulates sharing a piece of food by 1/2
          }
        }
      }
    }
  }

  // Performs the reproduction if two vehicles are close enough provided all other
  // factors are ok such as lastReproduced time, age of maturity, etc.
  attemptReproduction(neighborhood) {
    let nearest = null;
    let record = Infinity;
    for (let other of neighborhood) {
      if (this !== other) {
        let d = vecDistSq(this.position, other.position);
        if (d < record) {
          record = d;
          nearest = other;
        }
      }
    }

    // sqrt once is better than in the for loop
    record = sqrt(record);

    // check for perceptionRadius,
    // then old enough to reproduce (contained in DNA)
    // then have not recently reproduced (variable 1-3 seconds but not in DNA)
    // then chance to reproduce
    if (
      // TODO: maybe reproduction should be limited by the amount of health that the vehicle has
      record < this.dna.getGene(othersPerception) &&
      this.livingFrames > this.dna.getGene(ageOfMaturity) &&
      (this.livingFrames - this.lastReproduced) > (60 * random(1.5, 5)) &&
      random(1) < reproduceSlider.value()
    ) {
      let dna = this.dna.crossover(nearest.dna);
      this.lastReproduced = this.livingFrames;
      let offspringCount = floor(this.dna.getGene(litterSize));
      let children = [];
      for (let i = 0; i < offspringCount; i++) {
        let vehicle = new Vehicle(this.position.x, this.position.y, dna);
        vehicle.parentTarget = this.parentTarget;
        EventUtil.dispatchSpawn(vehicle, Vehicle, { x: vehicle.position.x, y: vehicle.position.y });
        children.push(vehicle);
      }
      EventUtil.dispatchReproduce(this, nearest, children, offspringCount);
      return children;
    }
    else {
      return null;
    }
  }

  attemptMalice(neighborhood) {
    let nearest = null;
    let record = Infinity;
    let vicinity = neighborhood;
    for (let other of vicinity) {
      if (this !== other) {
        let d = vecDistSq(this.position, other.position);
        if (d < record) {
          record = d;
          nearest = other;
        }
      }
    }

    // one sqrt better than in the for loop
    record = sqrt(record);

    if (
      record < this.dna.getGene(adultSize) * 2 &&
      vicinity.length < 3 &&
      random(1) < this.dna.getGene(maliceChance)
    ) {
      // this.dispatchEvent(new CustomEvent('malice', { detail: { self: this, target: nearest } }));
      this.health += nearest.health / 2;
      nearest.health = -Infinity; // dial m for murder
      EventUtil.dispatchMalice(this, nearest);
      // do not remove nearest from the array, if "nearest" gets the chance
      // it can also kill a vehicle or its assailant
      // kind of unrealistic but I'll allow it for now
    }

  }

  // A generic method that calculates a steering force towards any target
  // NO consideration is made towards the target, the distance, etc.
  // It simply returns a seek force towards the vector it is passed
  seek(target) {
    let desired = p5.Vector.sub(target, this.position); // A vector pointing from the location to the target

    // Scale to maximum speed
    desired.setMag(this.maxspeed);

    // Steering = Desired minus velocity
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxforce); // Limit to maximum steering force

    return steer;
  }

  dead() {
    return !this.immortal && this.health < 0;
  }

  display() {
    // Draw a triangle rotated in the direction of velocity
    let angle = this.velocity.heading() + PI / 2;

    push();
    translate(this.position.x, this.position.y);
    rotate(angle);

    let orange = color(255, 50, 0);
    let yellow = color(255, 255, 0);
    let col = lerpColor(orange, yellow, this.health);
    let black = color(0, 0, 0);
    col = lerpColor(col, black, (this.livingFrames) / 14000);

    strokeWeight(2);
    if (this.dna.getGene(ageOfMaturity) < this.livingFrames) {
      stroke(255, 255, 255);
    }
    else {
      stroke(col);
    }

    if (this.livingFrames > this.dna.getGene(ageOfMaturity)) {
      fill(col);
      beginShape();
      vertex(0, -this.r * 2);
      vertex(-this.r, this.r * 2);
      vertex(this.r, this.r * 2);
      endShape(CLOSE);
    }
    else {
      fill(col);
      beginShape();
      vertex(0, -this.r);
      vertex(-this.r, this.r);
      vertex(this.r, this.r);
      endShape(CLOSE);
    }

    if (debug.checked()) {
      this.debugging = ((mouseX - this.position.x) * (mouseX - this.position.x) + (mouseY - this.position.y) * (mouseY - this.position.y)) < (50 * 50);
    }
    else {
      this.debugging = false;
    }

    if (debug.checked() && this.debugging) {
      noFill();
      strokeWeight(6);
      stroke(0, 0, 255);
      line(0, 0, 0, this.dna.getGene(helpDesire) * 25);
      ellipse(0, 0, this.dna.getGene(othersPerception) * 2);
      strokeWeight(4);
      stroke(0, 255, 0);
      line(0, 0, 0, -this.dna.getGene(foodDesire) * 25);
      strokeWeight(2);
      ellipse(0, 0, this.dna.getGene(foodPerception) * 2);
      stroke(255, 0, 0);
      line(0, 0, 0, -this.dna.getGene(poisonDesire) * 25);
      ellipse(0, 0, this.dna.getGene(poisonPerception) * 2);
      fill(255);
      stroke(0);
      textSize(13);
      textAlign(CENTER, CENTER);
      text(`${nf(this.dna.getGene(donationChance), 1, 2)}`, 0, 0);
    }

    pop();
  }

  // applies a force that pushes vehicles who leave the window back into the window
  boundaries() {
    let d = 25;

    let desired = null;

    if (this.position.x < d) {
      desired = createVector(this.maxspeed, this.velocity.y);
    }
    else if (this.position.x > width - d) {
      desired = createVector(-this.maxspeed, this.velocity.y);
    }

    if (this.position.y < d) {
      desired = createVector(this.velocity.x, this.maxspeed);
    }
    else if (this.position.y > height - d) {
      desired = createVector(this.velocity.x, -this.maxspeed);
    }

    if (desired !== null) {
      let steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(this.maxforce);
      this.applyForce(steer);
    }
  }
}
