// render.js — dibujo en canvas con cuadrícula y zoom
export class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = options.cellSize ?? 16;
    this.gridColor = options.gridColor ?? '#2a314d';
    this.cellColor = options.cellColor ?? '#9af5cb';
    this.bgColor = options.bgColor ?? '#0e1328';
    this.showGrid = true;
    this.cols = Math.floor(canvas.width / this.cellSize);
    this.rows = Math.floor(canvas.height / this.cellSize);
  }
  setCellSize(px) {
    this.cellSize = px;
    this.cols = Math.floor(this.canvas.width / this.cellSize);
    this.rows = Math.floor(this.canvas.height / this.cellSize);
  }
  resizeToContainer() {
    // mantener tamaño canvas según contenedor para nitidez
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = `${Math.floor(rect.width)}px`;
    this.canvas.style.height = `${Math.floor(rect.height)}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  draw(grid) {
    const { ctx, canvas } = this;
    const S = this.cellSize;
    const W = Math.floor(canvas.width / (window.devicePixelRatio || 1));
    const H = Math.floor(canvas.height / (window.devicePixelRatio || 1));
    const cols = Math.floor(W / S);
    const rows = Math.floor(H / S);

    // Fondo
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, W, H);

    // Células
    ctx.fillStyle = this.cellColor;
    grid.forEachAlive((x, y) => {
      if (x < cols && y < rows) {
        ctx.fillRect(x * S, y * S, S, S);
      }
    });

    // Cuadrícula
    if (this.showGrid) {
      ctx.strokeStyle = this.gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= cols; x++) {
        const X = x * S + 0.5;
        ctx.moveTo(X, 0); ctx.lineTo(X, rows * S);
      }
      for (let y = 0; y <= rows; y++) {
        const Y = y * S + 0.5;
        ctx.moveTo(0, Y); ctx.lineTo(cols * S, Y);
      }
      ctx.stroke();
    }
  }
  canvasToCell(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / this.cellSize);
    const y = Math.floor((clientY - rect.top) / this.cellSize);
    return { x, y };
  }
}
