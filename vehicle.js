class Vehicle {
  constructor(x, y, dna, mr = 0.05) {
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(0, -2);
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

      // controls how likely is it that the vehicle will seek help from a nearby vehicle
      this.dna.addGene(new Gene(helpDesire, random(-2, 2), -2, 2, mr));
      // this.dna.addGene(new Gene(helpPerception, random(0, 100), 0, 100, mr));

      // controls how likely is it that vehicle gives away food and health to a less well off vehicle
      this.dna.addGene(new Gene(pityChance, random(0, 1), 0, 1, mr));

      // weighs steering force for desire to seek another vehicle for reproduction
      this.dna.addGene(new Gene(reproductionDesire, random(-2, 2), -2, 2, mr));

      // determines how many SECONDS after the beginning lifetime of the vehicle before it can reproduce
      this.dna.addGene(new Gene(ageOfMaturity, random(2 * 60, 6 * 60), 2 * 60, 6 * 60, mr));
    } else {
      this.dna = dna.clone();
    }
  }

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
  }

  applyForce(force) {
    // We could add mass here if we want A = F / M
    this.acceleration.add(force);
  }

  behaviors(good, bad, potentialMates) {
    if (potentialMates) throw 'Passing mates';
    let steerG = this.eat(good, 0.2, this.dna.getGene(foodPerception));
    let steerB = this.eat(bad, -1, this.dna.getGene(poisonPerception));
    let mateSteer = this.seekNearestVehicle(this.dna.getGene(othersPerception), this.dna.getGene(pityChance));
    let helpSteer = this.seekNearestVehicle(this.dna.getGene(othersPerception), this.dna.getGene(donationChance));

    steerG.mult(this.dna.getGene(foodDesire));
    steerB.mult(this.dna.getGene(poisonDesire));
    helpSteer.mult(this.dna.getGene(helpDesire));
    mateSteer.mult(this.dna.getGene(reproductionDesire));

    // seek help only when health is low (calculated in seekNearestVehicle)
    // and when food is far away.
    this.applyForce(steerG);
    this.applyForce(helpSteer);
    this.applyForce(steerB);
  }

  seekNearestVehicle(perceptionDistance, willingness) {
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

    // if the vehicle's health is low there is a chance they will seek
    // another vehicle as well as food or avoiding poison. This
    // is dependent on how altruistic they are themselves. More
    // altruistic vehicles seek vehicles more often, but could be burned
    // if they seek someone that is not altruistic themselves.
    if (
      this.health < 0.5 &&
      record < perceptionDistance &&
      random(1) < willingness
    ) {
      return this.seek(nearest.position);
    } else {
      return createVector(0, 0);
    }
  }

  // seeking (above) is dependent on DNA, but the actual chance of reproducing
  // must still be checked as must altruism because two vehicles can at any time
  // encounter each other without having sought each other.
  // seeking depends on dna and the actual altruism and reproduction chance
  // depends as well separately.

  altruism(others) {
    /*
      alternative idea. if you are sharing food, you cannot eat it.
      in a more complicated scenario eating food counts some of the timeout
      (according to this.dna[5]) and you can keep the other half in reserve
      eating only if necessary but sharing if excess. You can also be hurt
      if you come upon someone (this.dna[4]) and cannot share any food if you
      hit the chance
    */
    for (let vehicle of others) {
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

  reproduce(population) {
    let nearest = null;
    let record = Infinity;
    for (let i = 0; i < population.length; i++) {
      if (this !== population[i]) {
        let d = this.position.dist(population[i].position);
        if (d < record) {
          record = d;
          nearest = population[i];
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
      this.livingFrames - this.lastReproduced > 60 * random(0, 2) &&
      random(1) < reproduceSlider.value()
    ) {
      console.log("2 vehicles have reproduced");
      console.log(this);
      console.log(nearest);
      numReproduced++;
      let dna = this.dna.crossover(nearest.dna);
      this.lastReproduced = this.livingFrames;
      return new Vehicle(this.position.x, this.position.y, dna);
    } else {
      return null;
    }
  }

  eat(list, nutrition, perception) {
    let record = Infinity;
    let closest = null;
    for (let i = list.length - 1; i >= 0; i--) {
      let d = this.position.dist(list[i]);

      if (d < this.maxspeed) {
        list.splice(i, 1);
        this.health += nutrition;
      } else {
        if (d < record && d < perception) {
          record = d;
          closest = list[i];
        }
      }
    }

    // This is the moment of eating!

    if (closest != null) {
      return this.seek(closest);
    }

    return createVector(0, 0);
  }

  // A method that calculates a steering force towards a target
  // STEER = DESIRED MINUS VELOCITY
  seek(target) {
    let desired = p5.Vector.sub(target, this.position); // A vector pointing from the location to the target

    // Scale to maximum speed
    desired.setMag(this.maxspeed);

    // Steering = Desired minus velocity
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxforce); // Limit to maximum steering force

    return steer;
    //this.applyForce(steer);
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
    } else {
      stroke(col);
    }

    if (this.livingFrames > 120) {
      fill(col);
      beginShape();
      vertex(0, -this.r * 2);
      vertex(-this.r, this.r * 2);
      vertex(this.r, this.r * 2);
      endShape(CLOSE);
    } else {
      fill(col);
      beginShape();
      vertex(0, -this.r);
      vertex(-this.r, this.r);
      vertex(this.r, this.r);
      endShape(CLOSE);
    }

    if (debug.checked()) {
      if (dist(mouseX, mouseY, this.position.x, this.position.y) < 50) {
        this.debugging = true;
      } else {
        this.debugging = false;
      }
    } else {
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

  boundaries() {
    let d = 25;

    let desired = null;

    if (this.position.x < d) {
      desired = createVector(this.maxspeed, this.velocity.y);
    } else if (this.position.x > width - d) {
      desired = createVector(-this.maxspeed, this.velocity.y);
    }

    if (this.position.y < d) {
      desired = createVector(this.velocity.x, this.maxspeed);
    } else if (this.position.y > height - d) {
      desired = createVector(this.velocity.x, -this.maxspeed);
    }

    if (desired !== null) {
      desired.normalize();
      desired.mult(this.maxspeed);
      let steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(this.maxforce);
      this.applyForce(steer);
    }
  }
}
