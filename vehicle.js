class Vehicle {
  constructor(x, y, dna, mr = 0.05) {
    this.acceleration = createVector(0, 0);
    this.velocity = p5.Vector.mult(p5.Vector.random2D(), random(-2, 2)); // createVector(0, -2);
    this.position = createVector(x, y);
    this.r = 4;
    this.maxspeed = 5;
    this.maxforce = 0.5;
    this.debugging = false;

    this.health = 1;

    this.livingFrames = 0;
    this.maxFrames = 14000; // max age is 14000 frames (233 seconds)
    this.lastReproduced = null;

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
      // this.dna.addGene(new Gene(helpPerception, random(0, 100), 0, 100, mr));

      // controls how likely is it that vehicle gives away food and health to a less well off vehicle
      this.dna.addGene(new Gene(pityChance, random(0, 1), 0, 1, mr));

      // controls how strongly vehicles will prefer seeking another vehicle for reproduction over other things
      this.dna.addGene(new Gene(reproductionDesire, random(-2, 2), -2, 2, mr));

      // determines how many SECONDS after the beginning lifetime of the vehicle before it can reproduce
      this.dna.addGene(new Gene(ageOfMaturity, random(2 * 60, 6 * 60), 2 * 60, 6 * 60, mr));
    }
    else {
      this.dna = dna.clone();
    }
  }

  tick(food, poison, vehicles) {
    this.doMovementBehavior(food, poison, vehicles);
    this.attemptAltruism(vehicles);
    let newVehicle = this.attemptReproduction(vehicles);
    if (newVehicle != null) {
      vehicles.push(newVehicle);
    }

    this.update();
  }

  // Moves the vehicle and determines if it too old
  update() {
    this.health -= 0.01;
    this.livingFrames++;

    if (this.livingFrames > this.maxFrames) {
      this.health = -Infinity;
    }

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
  doMovementBehavior(good, bad, others) {
    let steerG = this.seekEnvironmentals(good, this.dna.getGene(foodPerception));
    let steerB = this.seekEnvironmentals(bad, this.dna.getGene(poisonPerception));
    let mateSteer = this.seekVehicles(others, this.dna.getGene(othersPerception), this.dna.getGene(reproductionDesire));
    let helpSteer = this.seekVehicles(others, this.dna.getGene(othersPerception), this.health > 0.5 ? 0 : 1);
    let altruismSteer = this.seekVehicles(others, this.dna.getGene(othersPerception), this.dna.getGene(pityChance));

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
  seekVehicles(vehicles, perceptionDistance, willingness) {
    let record = Infinity;
    let nearest = null;

    for (let other of vehicles) {
      if (other !== this) {
        let d = this.position.dist(other.position);
        if (d < record) {
          nearest = other;
          record = d;
        }
      }
    }

    if (record < perceptionDistance && random(1) < willingness) {
      return this.seek(nearest.position);
    }
    else {
      return createVector(0, 0);
    }
  }

  // Determines the steer forces applicable to particular elements of the environment
  // like food and poison
  seekEnvironmentals(list, perception) {
    let record = Infinity;
    let closest = null;
    for (let i = list.length - 1; i >= 0; i--) {
      let d = this.position.dist(list[i].position);

      if (d < this.maxspeed) {
        this.health += list[i].health_value;
        // eagerly splice so that the next vehicle in update does not attempt to eat this food also
        list.splice(i, 1);
      }
      else {
        if (d < record && d < perception) {
          record = d;
          closest = list[i];
        }
      }
    }

    // This is the moment of eating!

    if (closest != null) {
      return this.seek(closest.position);
    }

    return createVector(0, 0);
  }

  // performs the actual donation of food if a vehicle is close enough to do it and
  // based on probability of donation
  attemptAltruism(vehicles) {
    for (let vehicle of vehicles) {
      if (vehicle !== this) {
        let d = this.position.dist(vehicle.position);
        if (d < this.dna.getGene(othersPerception)) {
          if (random(1) < this.dna.getGene(donationChance)) {
            vehicle.health += 0.1; // half the food score
            this.health -= 0.1; // simulates sharing a piece of food by 1/2
          }
        }
      }
    }
  }

  // Performs the reproduction if two vehicles are close enough provided all other
  // factors are ok such as lastReproduced time, age of maturity, etc.
  attemptReproduction(vehicles) {
    let nearest = null;
    let record = Infinity;
    for (let i = 0; i < vehicles.length; i++) {
      if (this !== vehicles[i]) {
        let d = this.position.dist(vehicles[i].position);
        if (d < record) {
          record = d;
          nearest = vehicles[i];
        }
      }
    }

    // check for perceptionRadius,
    // then old enough to reproduce (contained in DNA)
    // then have not recently reproduced (variable 1-3 seconds but not in DNA)
    // then chance to reproduce
    if (
      record < this.dna.getGene(othersPerception) &&
      this.livingFrames > this.dna.getGene(ageOfMaturity) &&
      (this.livingFrames - this.lastReproduced) > (60 * random(1.5, 5)) &&
      random(1) < reproduceSlider.value()
    ) {
      console.log("~ Reproduction event ~");
      numReproduced++;
      let dna = this.dna.crossover(nearest.dna);
      this.lastReproduced = this.livingFrames;
      return new Vehicle(this.position.x, this.position.y, dna);
    }
    else {
      return null;
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
    return this.health < 0;
  }

  display() {
    // Draw a triangle rotated in the direction of velocity
    let angle = this.velocity.heading() + PI / 2;

    push();
    translate(this.position.x, this.position.y);
    rotate(angle);

    let cyan = color(0, 255, 255);
    let magenta = color(255, 0, 255);
    let col = lerpColor(cyan, magenta, this.health);
    let black = color(0, 0, 0);
    col = lerpColor(col, black, (this.livingFrames) / 14000);

    strokeWeight(2);
    if (this.dna.getGene(ageOfMaturity) < this.livingFrames) {
      stroke(255, 255, 255);
    }
    else {
      stroke(col);
    }

    if (this.livingFrames > 120) {
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
      this.debugging = dist(mouseX, mouseY, this.position.x, this.position.y) < 50;
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

    if (mouseIsPressed) {
      push();

      translate(this.position.x, this.position.y);
      stroke(255);
      fill(0);
      textSize(13);
      text(`${nf(this.health, 1, 3)}`, 0, -30);
      text(`${nf(this.maxFrames - this.livingFrames)}`, 0, -15);

      pop();
    }
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
