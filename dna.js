/*
When adding a new gene, be sure to add a constant string for the name
Add a max in the maxForGene function, a min in the minForGene function and then add a name and corresponding number
to the end of the nameForGene and numberForGene functions. This makes old vehicles (that are loaded from save files
for instance) robust to the introduction of new genes.
 */

const foodDesire = "food-desire";
const poisonDesire = "poison-desire";
const foodPerception = "food-perception";
const poisonPerception = "poison-perception";
const othersPerception = "others-perception";
const donationChance = "donation-chance";
const helpDesire = "help-desire";
const pityChance = "pity-chance";
const reproductionDesire = "reproduction-desire";
const ageOfMaturity = "age-of-maturity";
const adultSize = "adult-size";
const maxSpeed = "max-speed";
const maliceChance = 'malice-chance';
const litterSize = 'litter-size';

// Used for loading old format of DNA of vehicles
function maxForGene(number) {
  return {
    0: 2, 1: 2, 2: 100, 3: 100, 4: 110, 5: 1, 6: 2, 7: 1, 8: 2, 9: 6 * 60, 10: 7, 11: 8, 12: 0.05, 13: 20
  }[number];
}

function minForGene(number) {
  return {
    0: -2, 1: -2, 2: 0, 3: 0, 4: 0, 5: 0, 6: -2, 7: 0, 8: -2, 9: 2 * 60, 10: 3, 11: 3, 12: 0, 13: 1
  }[number];
}

function nameForGene(number) {
  return {
    0: foodDesire,
    1: poisonDesire,
    2: foodPerception,
    3: poisonPerception,
    4: othersPerception,
    5: donationChance,
    6: helpDesire,
    7: pityChance,
    8: reproductionDesire,
    9: ageOfMaturity,
    10: adultSize,
    11: maxSpeed,
    12: maliceChance,
    13: litterSize,
  }[number];
}

function geneForName(name) {
  return {
    [foodDesire]: 0,
    [poisonDesire]: 1,
    [foodPerception]: 2,
    [poisonPerception]: 3,
    [othersPerception]: 4,
    [donationChance]: 5,
    [helpDesire]: 6,
    [pityChance]: 7,
    [reproductionDesire]: 8,
    [ageOfMaturity]: 9,
    [adultSize]: 10,
    [maxSpeed]: 11,
    [maliceChance]: 12,
    [litterSize]: 13,
  }[name];
}


class DNA extends CustomEventTarget {
  constructor(genes) {
    super();
    this.genes = genes || {};
  }

  addGene(gene) {
    if (!(gene instanceof Gene)) {
      throw new TypeError("gene must be a Gene object");
    }
    this.genes[gene.name] = gene.clone(true);
    this.genes[gene.name].parentTarget = this;
  }

  clone(perfectly = false) {
    let newGenes = {};
    for (let key of Object.keys(this.genes)) {
      newGenes[key] = this.genes[key].clone(perfectly);
    }
    return new DNA(newGenes);
  }

  getGene(name) {
    return this.getGeneObject(name).probability;
  }

  getGeneObject(name) {
    let gene = this.genes[name];
    if (!gene || !gene.probability || isNaN(gene.probability)) {
      let num = geneForName(name);
      let geneMin = minForGene(num);
      let geneMax = maxForGene(num);
      let value = ((geneMax - geneMin) / 2) + geneMin;
      this.genes[name] = new Gene(name, value, geneMin, geneMax);
    }
    return this.genes[name];
  }

  setGeneValue(name, value) {
    let gene = this.getGeneObject(name);
    gene.probability = value;
    this.genes[name] = gene;
  }

  crossover(other) {
    let dna = new DNA();

    let first = random(1) < 0.5 ? this : other;
    let second = first === this ? other : this;

    let geneNames = Object.keys(first.genes);
    let stop = floor(random(geneNames.length));

    for (let i = 0; i < stop; i++) {
      let name = geneNames[i];
      dna.addGene(first.getGeneObject(name).clone());
    }

    for (let i = stop; i < geneNames.length; i++) {
      let name = geneNames[i];
      dna.addGene(second.getGeneObject(name).clone());
    }
    return dna;
  }

  mutate() {
    for (let key of Object.keys(this.genes)) {
      this.genes[key].mutate();
    }
  }

  setAllMutationRates(rate) {
    for (let key of Object.keys(this.genes)) {
      this.genes[key].mutationRate = rate;
    }
  }
}
