import { CellGrid, EnvironmentGrid } from './state.js';

const BASE_BIRTH_COST = 0.18;
const SURVIVAL_COST = 0.12;
const EVOLUTION_COST = 0.08;

export class Engine {
  constructor(cols, rows) {
    this.cells = new CellGrid(cols, rows);
    this.nextCells = new CellGrid(cols, rows);
    this.environment = new EnvironmentGrid(cols, rows);
    this.environment.fillRandom();
    this.generation = 0;
    this.population = 0;
  }

  resize(cols, rows) {
    const oldCells = this.cells;
    const oldEnv = this.environment;

    if (cols === oldCells.cols && rows === oldCells.rows) {
      return;
    }

    this.cells = new CellGrid(cols, rows);
    this.nextCells = new CellGrid(cols, rows);
    this.environment = new EnvironmentGrid(cols, rows);
    this.environment.fillRandom();

    const offsetX = Math.floor((cols - oldCells.cols) / 2);
    const offsetY = Math.floor((rows - oldCells.rows) / 2);

    oldCells.forEachAlive((x, y, stage) => {
      const nx = x + offsetX;
      const ny = y + offsetY;
      if (this.cells.inBounds(nx, ny)) {
        this.cells.set(nx, ny, stage);
        const envValue = oldEnv.get(x, y);
        this.environment.set(nx, ny, envValue);
      }
    });

    this.generation = 0;
    this.population = 0;
  }

  clear() {
    this.cells.clear();
    this.environment.fillRandom();
    this.generation = 0;
    this.population = 0;
  }

  randomize(probability = 0.35) {
    this.cells.clear();
    for (let y = 0; y < this.cells.rows; y++) {
      for (let x = 0; x < this.cells.cols; x++) {
        if (Math.random() < probability) {
          const stage = 1 + Math.floor(Math.random() * CellGrid.MAX_STAGE);
          this.cells.set(x, y, stage);
        }
      }
    }
    this.environment.fillRandom();
    this.generation = 0;
  }

  cycleCell(x, y) {
    const stage = this.cells.cycle(x, y);
    if (stage > 0) {
      this.environment.enrich(x, y, 0.4);
    }
    return stage;
  }

  setCell(x, y, stage) {
    this.cells.set(x, y, stage);
    if (stage > 0) {
      this.environment.enrich(x, y, 0.4);
    }
  }

  step() {
    const { cells, nextCells, environment } = this;
    nextCells.clear();
    environment.diffuse(0.08);
    environment.regenerate(0.015, 1.1);

    let population = 0;

    for (let y = 0; y < cells.rows; y++) {
      for (let x = 0; x < cells.cols; x++) {
        const stage = cells.get(x, y);
        const stats = cells.neighborStats(x, y);
        const envValue = environment.get(x, y);
        let nextStage = 0;

        if (stage > 0) {
          const survives = stats.total === 2 || stats.total === 3;
          if (survives && envValue > SURVIVAL_COST) {
            nextStage = stage;
            environment.consume(x, y, SURVIVAL_COST * (0.8 + 0.4 * stage / CellGrid.MAX_STAGE));

            const canEvolve = stage < CellGrid.MAX_STAGE && envValue > 0.6;
            const neighborPressure = stats.averageStage > stage;
            if (canEvolve && neighborPressure && Math.random() < 0.25) {
              if (environment.consume(x, y, EVOLUTION_COST)) {
                nextStage = Math.min(CellGrid.MAX_STAGE, stage + 1);
              }
            }

            if (envValue < 0.18 && nextStage > 1) {
              nextStage -= 1;
            }
          } else {
            environment.enrich(x, y, 0.05);
          }
        } else {
          if (stats.total === 3 && envValue > BASE_BIRTH_COST) {
            environment.consume(x, y, BASE_BIRTH_COST);
            let newStage = Math.max(1, stats.majorityStage);
            if (envValue > 0.7 && Math.random() < 0.35) {
              newStage = Math.min(CellGrid.MAX_STAGE, newStage + 1);
            }
            if (envValue < 0.25 && newStage > 1) {
              newStage -= 1;
            }
            nextStage = newStage;
          }
        }

        if (nextStage > 0) {
          nextCells.set(x, y, nextStage);
          population++;
        }
      }
    }

    // Influencia de células avanzadas
    for (let y = 0; y < nextCells.rows; y++) {
      for (let x = 0; x < nextCells.cols; x++) {
        const stage = nextCells.get(x, y);
        if (stage === CellGrid.MAX_STAGE) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (!nextCells.inBounds(nx, ny)) continue;
              const neighborStage = nextCells.get(nx, ny);
              if (neighborStage > 0 && neighborStage < CellGrid.MAX_STAGE) {
                if (Math.random() < 0.15) {
                  nextCells.set(nx, ny, neighborStage + 1);
                  environment.consume(nx, ny, 0.04);
                }
              }
            }
          }
        }
      }
    }

    // swap buffers
    const old = this.cells;
    this.cells = this.nextCells;
    this.nextCells = old;

    this.population = population;
    this.generation++;
  }
}
