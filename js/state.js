export class CellGrid {
  static MAX_STAGE = 3;

  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.data = new Uint8Array(cols * rows);
  }

  clone() {
    const clone = new CellGrid(this.cols, this.rows);
    clone.data.set(this.data);
    return clone;
  }

  clear() {
    this.data.fill(0);
  }

  index(x, y) {
    return y * this.cols + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return 0;
    return this.data[this.index(x, y)];
  }

  set(x, y, stage) {
    if (!this.inBounds(x, y)) return;
    this.data[this.index(x, y)] = stage;
  }

  cycle(x, y) {
    const current = this.get(x, y);
    const next = (current + 1) % (CellGrid.MAX_STAGE + 1);
    this.set(x, y, next);
    return next;
  }

  forEachAlive(fn) {
    const { cols, rows, data } = this;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const stage = data[this.index(x, y)];
        if (stage > 0) fn(x, y, stage);
      }
    }
  }

  neighborStats(x, y) {
    const counts = [0, 0, 0, 0];
    let total = 0;
    let stageSum = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const sx = x + dx;
        const sy = y + dy;
        if (!this.inBounds(sx, sy)) continue;
        const stage = this.get(sx, sy);
        if (stage > 0) {
          counts[stage]++;
          total++;
          stageSum += stage;
        }
      }
    }
    let majorityStage = 0;
    let majorityCount = 0;
    for (let stage = 1; stage <= CellGrid.MAX_STAGE; stage++) {
      if (counts[stage] > majorityCount) {
        majorityCount = counts[stage];
        majorityStage = stage;
      }
    }
    const averageStage = total === 0 ? 0 : stageSum / total;
    return { total, counts, majorityStage, averageStage };
  }
}

export class EnvironmentGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.data = new Float32Array(cols * rows);
  }

  index(x, y) {
    return y * this.cols + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return 0;
    return this.data[this.index(x, y)];
  }

  set(x, y, value) {
    if (!this.inBounds(x, y)) return;
    this.data[this.index(x, y)] = value;
  }

  fillRandom(min = 0.2, max = 1) {
    const { data } = this;
    for (let i = 0; i < data.length; i++) {
      data[i] = min + Math.random() * (max - min);
    }
  }

  clear(value = 0) {
    this.data.fill(value);
  }

  regenerate(rate = 0.01, cap = 1) {
    const { data } = this;
    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      data[i] = Math.min(cap, value + rate * (cap - value));
    }
  }

  consume(x, y, amount) {
    if (!this.inBounds(x, y)) return 0;
    const idx = this.index(x, y);
    const value = this.data[idx];
    const consumed = Math.min(value, amount);
    this.data[idx] = value - consumed;
    return consumed;
  }

  enrich(x, y, amount, cap = 1) {
    if (!this.inBounds(x, y)) return;
    const idx = this.index(x, y);
    this.data[idx] = Math.min(cap, this.data[idx] + amount);
  }

  diffuse(strength = 0.1) {
    const { cols, rows } = this;
    const copy = new Float32Array(this.data);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = this.index(x, y);
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (!this.inBounds(nx, ny)) continue;
            sum += copy[this.index(nx, ny)];
            count++;
          }
        }
        if (count === 0) continue;
        const neighborAverage = sum / count;
        this.data[idx] = copy[idx] + strength * (neighborAverage - copy[idx]);
      }
    }
  }
}
