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

  clone(perfectly = false) {
    let dup = new Gene(this.name, this.probability, this.min, this.max, this.mutationRate);
    if (!perfectly && Math.random() < this.mutationRate) {
      dup.mutate();
    }
    return dup;
  }

  mutate() {
    let old = this.probability;
    mutatedGenes[this.name] = (mutatedGenes[this.name] || 0) + 1;
    this.probability = Math.max(Math.min(this.probability + this.randomDelta(), this.max), this.min);
    console.log(`Gene ${this.name} just mutated from ${old} to ${this.probability} (mr=${this.mutationRate})`);
  }
}
