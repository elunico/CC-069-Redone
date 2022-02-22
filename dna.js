const foodDesire = 'food-desire';
const poisonDesire = 'poison-desire';
const foodPerception = 'food-perception';
const poisonPerception = 'poison-perception';
const othersPerception = 'others-perception';
const donationChance = 'donation-chance';
const helpDesire = 'help-desire';
const pityChance = 'pity-chance';
const reproductionDesire = 'reproduction-desire';
const ageOfMaturity = 'age-of-maturity';

const helpPerception = 'help-perception';

// Used for loading old format of DNA of vehicles
function maxForGene(number) {
  return {
    0: 2,
    1: 2,
    2: 100,
    3: 100,
    4: 110,
    5: 1,
    6: 2,
    7: 1,
    8: 2,
    9: 6 * 60,
  }[number];
}

function minForGene(number) {
  return {
    0: -2,
    1: -2,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: -2,
    7: 0,
    8: -2,
    9: 2 * 60,
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
  }[number];
}


class DNA {
  constructor(genes) {
    this.genes = genes || {};
  }

  addGene(gene) {
    this.genes[gene.name] = gene;
  }

  clone() {
    let newGenes = {};
    for (let key of Object.keys(this.genes)) {
      newGenes[key] = this.genes[key].clone();
    }
    return new DNA(newGenes);
  }

  getGene(name) {
    return this.genes[name].probability;
  }

  crossover(other) {
    let dna = new DNA();

    let first = random(1) < 0.5 ? this : other;
    let second = first === this ? other : this;

    let geneNames = Object.keys(first.genes);
    let stop = floor(random(geneNames.length));

    for (let i = 0; i < stop; i++) {
      let name = geneNames[i];
      dna.addGene(first.genes[name].clone());
    }

    for (let i = stop; i < geneNames.length; i++) {
      let name = geneNames[i];
      dna.addGene(second.genes[name].clone());
    }
    return dna;
  }
}
