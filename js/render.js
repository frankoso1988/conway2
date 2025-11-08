export class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = options.cellSize ?? 18;
    this.gridColor = options.gridColor ?? 'rgba(255,255,255,0.08)';
    this.bgColor = options.bgColor ?? '#040612';
    this.stagePalette = options.stagePalette ?? {
      1: '#72f2d6',
      2: '#9f7aea',
      3: '#f6c177'
    };
    this.environmentPalette = options.environmentPalette ?? ['#0f172a', '#1e3a8a', '#0ea5e9', '#facc15'];
    this.showGrid = true;
    this.showEnvironment = true;
    this.cols = 0;
    this.rows = 0;
    this.resizeToContainer();
  }

  setCellSize(px) {
    this.cellSize = px;
    this.updateDimensions();
  }

  updateDimensions() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = `${Math.floor(rect.width)}px`;
    this.canvas.style.height = `${Math.floor(rect.height)}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cols = Math.floor((this.canvas.width / dpr) / this.cellSize);
    this.rows = Math.floor((this.canvas.height / dpr) / this.cellSize);
  }

  resizeToContainer() {
    this.updateDimensions();
  }

  setShowGrid(show) {
    this.showGrid = show;
  }

  setShowEnvironment(show) {
    this.showEnvironment = show;
  }

  draw(cells, environment) {
    const { ctx, canvas, cellSize: S } = this;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.floor(canvas.width / dpr);
    const height = Math.floor(canvas.height / dpr);
    const cols = Math.floor(width / S);
    const rows = Math.floor(height / S);

    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, width, height);

    if (this.showEnvironment && environment) {
      this.drawEnvironment(environment, cols, rows, S);
    }

    cells.forEachAlive((x, y, stage) => {
      if (x >= cols || y >= rows) return;
      const color = this.stagePalette[stage] || '#ffffff';
      ctx.fillStyle = color;
      ctx.fillRect(x * S, y * S, S, S);
    });

    if (this.showGrid) {
      this.drawGrid(cols, rows, S, width, height);
    }
  }

  drawGrid(cols, rows, size, width, height) {
    const { ctx } = this;
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= cols; x++) {
      const X = x * size + 0.5;
      ctx.moveTo(X, 0);
      ctx.lineTo(X, rows * size);
    }
    for (let y = 0; y <= rows; y++) {
      const Y = y * size + 0.5;
      ctx.moveTo(0, Y);
      ctx.lineTo(cols * size, Y);
    }
    ctx.stroke();
  }

  drawEnvironment(environment, cols, rows, size) {
    const { ctx } = this;
    const palette = this.environmentPalette;
    const steps = palette.length - 1;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const value = environment.get(x, y);
        const normalized = Math.max(0, Math.min(1, value));
        const scaled = normalized * steps;
        const idx = Math.floor(scaled);
        const t = scaled - idx;
        const color = this.mixColors(palette[idx], palette[Math.min(idx + 1, steps)], t);
        ctx.fillStyle = color;
        ctx.fillRect(x * size, y * size, size, size);
      }
    }
  }

  mixColors(a, b, t) {
    const ca = this.parseColor(a);
    const cb = this.parseColor(b);
    const mix = ca.map((val, i) => Math.round(val + (cb[i] - val) * t));
    return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
  }

  parseColor(color) {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const size = hex.length === 3 ? 1 : 2;
      const values = [];
      for (let i = 0; i < hex.length; i += size) {
        const chunk = hex.substr(i, size);
        const value = parseInt(chunk.length === 1 ? chunk.repeat(2) : chunk, 16);
        values.push(value);
      }
      while (values.length < 3) values.push(0);
      return values;
    }
    if (color.startsWith('rgb')) {
      return color.replace(/rgba?\(([^)]+)\)/, '$1')
        .split(',')
        .map(v => parseInt(v.trim(), 10))
        .slice(0, 3);
    }
    return [255, 255, 255];
  }

  canvasToCell(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / this.cellSize);
    const y = Math.floor((clientY - rect.top) / this.cellSize);
    return { x, y };
  }
}
