import { Engine } from './engine.js';
import { Renderer } from './render.js';
import { $, $$, on, throttle } from './ui.js';
import { initCredentialPage } from './cd.js';

const canvas = $('#board');
const renderer = new Renderer(canvas, { cellSize: 18 });
const engine = new Engine(renderer.cols, renderer.rows);

const viewButtons = $$('.view-switcher .view-btn');
const pages = {
  sim: $('#simulationPage'),
  cd: $('#cdPage'),
};
let currentView = 'sim';

const state = {
  playing: false,
  speed: 12,
  targetStage: 1,
  painting: false,
  paintStage: 0,
  lastTick: 0,
};

const playPauseBtn = $('#playPause');
const stepBtn = $('#step');
const clearBtn = $('#clear');
const randomBtn = $('#randomize');
const randomEnvBtn = $('#randomEnv');
const statusText = $('#statusText');
const genEl = $('#gen');
const popEl = $('#pop');
const envEl = $('#env');
const speedSlider = $('#speed');
const speedLabel = $('#fpsLabel');
const zoomSlider = $('#zoom');
const zoomLabel = $('#zoomLabel');
const showGridChk = $('#showGrid');
const showEnvChk = $('#showEnvironment');

document.body.classList.add('view-sim');

function updateStats() {
  genEl.textContent = engine.generation.toString();
  popEl.textContent = engine.population.toString();
  envEl.textContent = averageEnvironment(engine.environment).toFixed(2);
}

function averageEnvironment(environment) {
  let sum = 0;
  const { data } = environment;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return data.length ? sum / data.length : 0;
}

function draw() {
  recalcPopulation();
  renderer.draw(engine.cells, engine.environment);
  updateStats();
}

function recalcPopulation() {
  let count = 0;
  engine.cells.forEachAlive(() => {
    count++;
  });
  engine.population = count;
}

function setPlaying(playing) {
  state.playing = playing;
  state.lastTick = 0;
  statusText.textContent = playing ? 'Reproduciendo' : 'Pausado';
  playPauseBtn.textContent = playing ? '⏸️ Pausar' : '▶️ Reproducir';
}

function setView(view, { silent = false } = {}) {
  if (!(view in pages) || view === currentView) return;
  currentView = view;
  Object.entries(pages).forEach(([key, el]) => {
    if (el) el.classList.toggle('active', key === view);
  });
  viewButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  document.body.classList.toggle('view-cd', view === 'cd');
  document.body.classList.toggle('view-sim', view !== 'cd');
  if (view === 'cd') {
    setPlaying(false);
  } else {
    renderer.resizeToContainer();
    engine.resize(renderer.cols, renderer.rows);
    draw();
  }
  if (!silent) {
    window.dispatchEvent(new CustomEvent('viewchange', { detail: { view } }));
  }
}

function stepSimulation() {
  engine.step();
  draw();
}

function loop(timestamp) {
  if (!state.lastTick) state.lastTick = timestamp;
  const delta = timestamp - state.lastTick;
  const interval = 1000 / state.speed;
  if (state.playing && delta >= interval) {
    state.lastTick = timestamp;
    stepSimulation();
  }
  requestAnimationFrame(loop);
}

function handlePointer(e) {
  const { x, y } = renderer.canvasToCell(e.clientX, e.clientY);
  if (!engine.cells.inBounds(x, y)) return;
  const stage = (e.button === 2 || e.ctrlKey) ? 0 : state.targetStage;
  engine.setCell(x, y, stage);
  draw();
}

function handlePointerMove(e) {
  if (!state.painting) return;
  const { x, y } = renderer.canvasToCell(e.clientX, e.clientY);
  if (!engine.cells.inBounds(x, y)) return;
  engine.setCell(x, y, state.paintStage);
  draw();
}

function initPointerEvents() {
  on(canvas, 'pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    state.painting = true;
    state.paintStage = (e.button === 2 || e.ctrlKey) ? 0 : state.targetStage;
    handlePointer(e);
  });
  on(canvas, 'pointermove', throttle(handlePointerMove, 16));
  on(canvas, 'pointerup', (e) => {
    state.painting = false;
    canvas.releasePointerCapture(e.pointerId);
  });
  on(canvas, 'pointercancel', () => {
    state.painting = false;
  });
  on(canvas, 'contextmenu', (e) => e.preventDefault());
}

function initStageSelector() {
  $$('#stageSelector input[name="stage"]').forEach((input) => {
    if (Number(input.value) === state.targetStage) input.checked = true;
    on(input, 'change', () => {
      state.targetStage = Number(input.value);
    });
  });
}

function initControls() {
  on(playPauseBtn, 'click', () => {
    setPlaying(!state.playing);
  });

  on(stepBtn, 'click', () => {
    if (!state.playing) {
      stepSimulation();
    }
  });

  on(clearBtn, 'click', () => {
    engine.clear();
    draw();
  });

  on(randomBtn, 'click', () => {
    engine.randomize();
    draw();
  });

  on(randomEnvBtn, 'click', () => {
    engine.environment.fillRandom();
    draw();
  });

  on(speedSlider, 'input', () => {
    state.speed = Number(speedSlider.value);
    speedLabel.textContent = state.speed.toString();
    state.lastTick = 0;
  });

  on(zoomSlider, 'input', () => {
    const value = Number(zoomSlider.value);
    renderer.setCellSize(value);
    renderer.resizeToContainer();
    engine.resize(renderer.cols, renderer.rows);
    zoomLabel.textContent = value.toString();
    draw();
  });

  on(showGridChk, 'change', () => {
    renderer.setShowGrid(showGridChk.checked);
    draw();
  });

  on(showEnvChk, 'change', () => {
    renderer.setShowEnvironment(showEnvChk.checked);
    draw();
  });

  window.addEventListener('resize', () => {
    renderer.resizeToContainer();
    engine.resize(renderer.cols, renderer.rows);
    draw();
  });

  viewButtons.forEach((btn) => {
    on(btn, 'click', () => {
      setView(btn.dataset.view);
    });
  });
}

function init() {
  initPointerEvents();
  initStageSelector();
  initControls();
  speedLabel.textContent = state.speed.toString();
  zoomLabel.textContent = renderer.cellSize.toString();
  draw();
  requestAnimationFrame(loop);
  setView('sim', { silent: true });
}

initCredentialPage();
init();
