class Gene {
  constructor(name, probability, min, max, mutationRate) {
    this.name = name;
    // TODO: should this be true or no?
    this.probability = Math.max(Math.min(probability, max), min);
    this.min = min;
    this.max = max;
    this.mutationRate = mutationRate;
  }

  randomDelta() {
    return Math.random() < 0.5 ? random(this.min * 0.1, this.max * 0.1) : -random(this.min * 0.1, this.max * 0.1);
  }

  clone() {
    if (Math.random() < this.mutationRate) {
      let newProb = this.probability + this.randomDelta();
      mutatedGenes[this.name] = (mutatedGenes[this.name] || 0) + 1;
      console.log(`Gene ${this.name} just mutated from ${this.probability} to ${newProb} (mr=${this.mutationRate})`);
      return new Gene(this.name, newProb, this.min, this.max);
    } else {
      return new Gene(this.name, this.probability, this.min, this.max);
    }
  }
}
