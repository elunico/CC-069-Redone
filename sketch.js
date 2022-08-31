const population = 200;

let world;
let dead = 0;

// keep track of the largest population and the last surviving vehicle of that population
let highScore = -Infinity;
let bestVehicle;

let currentFPS;

let debug;
let paused = false;

let numReproduced = 0;
let mutatedGenes = {};

let foodDiv;
let poisonDiv;
let reproduceDiv;
let eventsDiv;

let foodSpawnSlider;
let poisonSpawnSlider;
let reproduceSlider;
let saveBestVehicleButton;
let saveConfigurationButton;
let eventFilter;
let loadButton;
let pauseButton;
let addNewButton;
let resetButton;

let logEvents;
let mostRecentEvent;
let immortality = false; // if true, vehicles will not die
let nukeGrowing = false;
let mouseDown = false;
let nukeAug = 0;

let buckets = [];
let bucketsDiv;

function increment(obj, key) {
  let v = obj[key];
  if (v) obj[key]++;
  else obj[key] = 1;
}

function setup() {
  createCanvas(windowWidth / 1.5, windowHeight / 1.5);
  world = new World(width, height, 100, 10, population);
  world.addEventListener('spawn', vehicleSpawnHandler);
  world.populate();

  recentContainer = document.querySelector('#recent-container');

  recentContainer.addEventListener('mouseover', event => {
    logEvents = true;
  });

  recentContainer.addEventListener('mouseout', event => {
    logEvents = false;
  });

  const mostRecentEvent = document.querySelector('#most-recent-event');

  eventFilter = createSelect();
  const filterContainer = select('#filter-selection');
  eventFilter.parent(filterContainer);
  eventFilter.option('All');
  for (let eventName of eventNames) {
    eventFilter.option(eventName);
  }

  world.addEventListener('*', event => {
    if (logEvents) {
      const filterName = eventFilter.value();
      if (filterName === 'All' || filterName === event.type) {
        const child = document.createElement('li');
        child.style.color = eventColors[event.type];
        // child.textContent = event.type;
        child.textContent = stringifyEvent(event);
        mostRecentEvent.prepend(child);
        setTimeout(() => mostRecentEvent.removeChild(child), 2000);
      }
    }
  });

  debug = createCheckbox("Debug Visualization");

  pauseButton = createButton("Pause");
  pauseButton.mousePressed(() => {
    paused = !paused;
    pauseButton.html(paused ? "Resume" : "Pause");
  });

  resetButton = createButton("Reset to new random population");
  resetButton.mousePressed(() => {
    world.vehicles = [];
    dead = 0;
    for (let i = 0; i < population; i++) {
      let x = random(width);
      let y = random(height);
      world.createVehicle(x, y);
    }
  });


  addNewButton = createButton("Add 50 random vehicles");
  addNewButton.mousePressed(() => {
    for (let i = 0; i < 50; i++) {
      let x = random(width);
      let y = random(height);
      world.createVehicle(x, y);

    }
  });

  let foodAddButton = createButton("Add way too much food");
  foodAddButton.mousePressed(() => {
    for (let i = 0; i < 1000; i++) {
      world.createFood(random(width), random(height));
    }
  });

  createDiv("<h3>Controlling the Environment</h3>");

  foodDiv = createDiv("");
  foodSpawnSlider = createSlider(0, 1, 0.75, 0.005);
  foodSpawnSlider.style("width", "50%");

  poisonDiv = createDiv("");
  poisonSpawnSlider = createSlider(0, 1, 0.055, 0.005);
  poisonSpawnSlider.style("width", "50%");

  reproduceDiv = createDiv("");
  reproduceSlider = createSlider(0, 1, 0.85, 0.0025);
  reproduceSlider.style("width", "50%");

  createDiv("<h3>Reproduction &amp; Mutation events</h3>");

  createDiv("<h4>Breakdown of Gene Values</h4>");

  bucketsDiv = createDiv("");
  bucketsDiv.attribute('id', 'bucket-div');



  eventsDiv = createDiv("");

  createP("");

  createDiv("<h3>Saving and Loading Popualtions</h3>");
  // createDiv("<h3> Saving and Loading is Currently Broken and will be fixed soon</h3>");

  saveBestVehicleButton = createButton("Save Best Vehicle");
  saveBestVehicleButton.mousePressed(() => {
    saveBestVehicle();
  });
  saveConfigurationButton = createButton("Save Entire Configuration");
  saveConfigurationButton.mousePressed(() => {
    saveConfiguration();
  });

  createP("");
  createDiv("Load Configuration from File");

  createFileInput(loadConfigurationFromFile);
  saveBestVehicleButton.attribute("disabled", true);

  createP("");
  let loadOptimalButton = createButton("Load a Population with High Clustering");
  loadOptimalButton.mousePressed(loadOptimalCluster);
  let loadOptimal2Button = createButton("Load a Population with Low Clustering");
  loadOptimal2Button.mousePressed(loadOptimalNoCluster);
}

function vehicleSpawnHandler(event) {
  let vehicle = event.detail.object;

  if (vehicle instanceof Vehicle) {
    world.vehicles.push(vehicle);
    vehicle.addEventListener('mutate', mutationHandler);
    vehicle.addEventListener('reproduce', reproductionHandler);
    vehicle.addEventListener('die', deadHandler);
  }
}

function mutationHandler(event) {
  mutatedGenes[event.detail.name] = (mutatedGenes[event.detail.name] || 0) + 1;
}

function reproductionHandler(event) {
  numReproduced++;
}

function deadHandler(event) {
  let vehicle = event.detail.self; // the vehicle that died

  dead++;
  let x = vehicle.position.x;
  let y = vehicle.position.y;
  if (event.detail.cause != 'killed by supernatural forces') {
    for (let i = 0; i < random(1, 6); i++) {
      world.createFood(x + random(-5, 5), y + random(-5, 5));
    }
  } else {
    for (let i = 0; i < random(0, 3); i++) {
      world.createPoison(x + random(-5, 5), y + random(-5, 5));
    }
  }
  if (world.vehicles.length === 1) {
    bestVehicle = vehicle;
    saveBestVehicleButton.removeAttribute("disabled");
  }
}

let konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
let kCheck = [];

function keyPressed() {
  kCheck.push(keyCode);
  if (kCheck.length > konamiCode.length) {
    kCheck.shift();
  }
  if (kCheck.toString() === konamiCode.toString()) {
    immortality = !immortality;
    kCheck = [];
  }

  if (key === " ") {
    noLoop();
  }
  else if (key === "r") {
    loop();
  }
  if (key == 's') {
    nukeAug = -3;
    nukeGrowing = true;
  }
  if (key == 'w') {
    nukeAug = 3;
    nukeGrowing = true;
  }
  if (key == 'q') {
    nukeAug = 0;
    nukeGrowing = false;
    world.setNukeRadius(-1);
  }

}

function keyReleased() {
  if (key == 's' || key == 'w') {
    nukeAug = 0;
    nukeGrowing = false;
  }
}


function mousePressed() {
  if (mouseX > width || mouseY > height || mouseX < 0 || mouseY < 0) {
    return;
  }

  mouseDown = true;
  nukeGrowing = true;
  world.setNukeLocation(mouseX, mouseY);
}

function mouseDragged() {
  if (world.nukeRadius > 0) {
    world.setNukeLocation(mouseX, mouseY);
  }
}

function mouseReleased() {
  mouseDown = false;
  nukeGrowing = false;
  if (world.nukeRadius > 0) {
    world.armNuke();
  }
}


function loadOptimalCluster() {
  fetch("./optimal-population-configurations/config-1-clusters.json").then(r => r.json()).then(json => {
    loadConfigurationFromJSON(
      json);
  });
}

function loadOptimalNoCluster() {
  fetch("./optimal-population-configurations/config-2-less-clusters.json").then(r => r.json()).then(json => {
    loadConfigurationFromJSON(
      json);
  });
}

function loadConfigurationFromFile(file) {
  loadConfigurationFromJSON(file.data);
}

function loadConfigurationFromJSON(json) {
  foodSpawnSlider.value(json.foodSpawnChance);
  poisonSpawnSlider.value(json.poisonSpawnChance);
  reproduceSlider.value(json.reproduceChance);
  let dnas = json.dnas;
  for (let i = 0; i < dnas.length; i++) {
    if (!Array.isArray(dnas[i])) {
      // new style loading
      let dna = new DNA();
      let keys = Object.keys(dnas[i].genes);
      for (let j = 0; j < keys.length; j++) {
        let gene = new Gene(
          dnas[i].genes[keys[j]].name,
          dnas[i].genes[keys[j]].probability,
          dnas[i].genes[keys[j]].min,
          dnas[i].genes[keys[j]].max,
          dnas[i].genes[keys[j]].mutationRate || 0.05
        );
        dna.addGene(gene);
      }
      world.createVehicle(random(width), random(height), dna);
    }
    else if (Array.isArray(dnas[i])) {
      // old style loading
      let dna = new DNA();
      for (let j = 0; j < dnas[i].length; j++) {
        let gene = new Gene(nameForGene(j), dnas[i][j], minForGene(j), maxForGene(j), 0.05);
        dna.addGene(gene);
      }
      world.createVehicle(random(width), random(height), dna);
    }
    else {
      // console.log(dnas[i]);
    }
  }
}

function saveBestVehicle() {
  saveFile([JSON.stringify({
    vehicle: {
      acceleration: [bestVehicle.acceleration.x, bestVehicle.acceleration.y, bestVehicle.acceleration.z],
      velocity: [bestVehicle.velocity.x, bestVehicle.velocity.y, bestVehicle.velocity.z],
      position: [bestVehicle.position.x, bestVehicle.position.y, bestVehicle.position.z],
      r: bestVehicle.r,
      maxspeed: bestVehicle.maxspeed,
      maxforce: bestVehicle.maxforce,

      health: bestVehicle.health,

      firstFrame: bestVehicle.firstFrame,
      lastFrame: bestVehicle.lastFrame,
      lastReproduced: bestVehicle.lastReproduced,

      dna: bestVehicle.dna
    }, environment: {
      foodSpawnChance: foodSpawnSlider.value(),
      poisonSpawnChance: poisonSpawnSlider.value(),
      reproduceChance: reproduceSlider.value(),
    }
  }, function (key, value) {
    if (key == '_parentTarget')
      return undefined;
    return value;
  }, 2)], "best-vehicle.json");
}


function saveConfiguration() {
  saveFile([JSON.stringify({
    foodSpawnChance: foodSpawnSlider.value(),
    poisonSpawnChance: poisonSpawnSlider.value(),
    reproduceChance: reproduceSlider.value(),
    dnas: world.vehicles.map(v => v.dna)
  }, function (key, value) {
    if (key == '_parentTarget')
      return undefined;
    return value;
  }, 2)], 'configuration.json');
  // saveJSON({
  //   foodSpawnChance: foodSpawnSlider.value(),
  //   poisonSpawnChance: poisonSpawnSlider.value(),
  //   reproduceChance: reproduceSlider.value(),
  //   dnas: world.vehicles.map(i => i.dna)
  // }, "configuration.json");
}


function draw() {
  background(51);

  if (frameCount % 90 == 0) {
    let intermediateDiv = createDiv('');
    intermediateDiv.attribute('hidden', true);
    intermediateDiv.attribute('id', 'hidden-bucket-div');
    console.log("Updating buckets");
    for (let vehicle of world.vehicles) {
      for (let i = 0; i < Object.values(vehicle.dna.genes).length; i++) {
        let gene = Object.values(vehicle.dna.genes)[i];
        let value = buckets[i];
        if (value) {
          buckets[i].value += gene.probability;
        } else {
          buckets[i] = { name: gene.name, value: gene.probability };
        }

      }
    }

    // console.log(buckets);

    for (let obj of buckets) {
      let avg = obj.value / world.vehicles.length;
      let sgn = avg < 0 ? '-' : '&nbsp';
      let leftSide = createDiv(`Average value of ${obj.name}`);
      leftSide.elt.classList.add('left-bucket');
      let rightSide = createDiv(`${sgn}${nf(abs(avg), 4, 11)}`);
      rightSide.elt.classList.add('right-bucket');
      intermediateDiv.child(leftSide);
      intermediateDiv.child(rightSide);
      // intermediateDiv.html(bucketsDiv.html() + `<div style='padding: 0 1em'>Average value of ${obj.name} </div><div> ${sgn}${abs(avg)}</div>`);
    }

    bucketsDiv.html(`<br>${intermediateDiv.html()}<br>`);
    intermediateDiv.remove();


  }

  if (nukeGrowing && mouseDown) {
    let newR = world.nukeRadius + nukeAug;
    if (newR >= 0)
      world.setNukeRadius(world.nukeRadius + nukeAug);
    else
      world.setNukeRadius(-1);
  }

  foodDiv.html(`Chance of food spawn: ${foodSpawnSlider.value()}`);
  poisonDiv.html(`Chance of poison spawn: ${poisonSpawnSlider.value()}`);
  reproduceDiv.html(`If conditions are optimal 2 vehicles have a  (${100 * reproduceSlider.value()}% chance of reproducing)`);
  eventsDiv.html(`${numReproduced} pairs of vehicles have reproduced.<p> There have been ${Object.values(mutatedGenes)
    .reduce((a, b) => a + b, 0)} mutations<br>The most mutated gene is <code>${Object.keys(
      mutatedGenes).reduce((a, b) => mutatedGenes[a] > mutatedGenes[b] ? a : b, "")}</code></p>`);

  world.vehicles.forEach(v => v.immortal = immortality);
  world.tick();

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(18);
  fill(240);
  text(`${currentFPS || 0} fps`, width - 40, 15);
  if (frameCount % 10 === 0) {
    currentFPS = floor(frameRate());
  }

  text(`High Score: ${(world.vehicles.length + dead) || 0}`, width - 80, 40);

  textAlign(CENTER, CENTER);
  textSize(18);
  fill(240);
  text(`Pop: ${world.vehicles.length}`, 40, 15);

  textAlign(CENTER, CENTER);
  textSize(18);
  fill(240);
  text(`Dead: ${dead}`, 48, 40);

  textAlign(CENTER, CENTER);
  textSize(18);
  fill(240);
  text(`Frame: ${frameCount}`, 54, height - 20);

  if (world.nukeRadius > 0) {
    stroke(255, 0, 0);
    strokeWeight(4);
    fill(255, 0, 0, 50);
    circle(world._nuke.x, world._nuke.y, world._nuke.r * 2);
  }
}
