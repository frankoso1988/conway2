// engine.js — reglas B3/S23 + bucle de simulación
import { Grid } from './state.js';

export class Engine {
  constructor(cols, rows) {
    this.grid = new Grid(cols, rows);
    this.next = new Grid(cols, rows);
    this.generation = 0;
  }
  resize(cols, rows) {
    const old = this.grid;
    this.grid = new Grid(cols, rows);
    this.next = new Grid(cols, rows);
    // copiar contenido centrado
    const ox = Math.floor((cols - old.cols) / 2);
    const oy = Math.floor((rows - old.rows) / 2);
    old.forEachAlive((x, y) => {
      const nx = x + ox, ny = y + oy;
      if (this.grid.inBounds(nx, ny)) this.grid.set(nx, ny, 1);
    });
    this.generation = 0;
  }
  step() {
    const g = this.grid, n = this.next;
    n.clear(); // se va a recalcular todo (optimizable por diff más adelante)
    for (let y = 0; y < g.rows; y++) {
      for (let x = 0; x < g.cols; x++) {
        const alive = g.get(x, y);
        const cnt = g.neighbors(x, y);
        const willLive = (alive && (cnt === 2 || cnt === 3)) || (!alive && cnt === 3);
        if (willLive) n.set(x, y, 1);
      }
    }
    this.grid = n;
    this.next = g;
    this.generation++;
  }
}
