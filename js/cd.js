import { $, on } from './ui.js';

const registry = new Map();

const cardEls = {
  name: $('#cdName'),
  cuil: $('#cdCuil'),
  dni: $('#cdDni'),
  affiliation: $('#cdAffiliation'),
  family: $('#cdFamily'),
  emission: $('#cdEmission'),
  category: $('#cdCategory'),
};

function normalizeDigits(value) {
  return (value ?? '').toString().replace(/\D+/g, '');
}

function formatCuil(value) {
  const digits = normalizeDigits(value);
  if (digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }
  return (value ?? '').toString().trim();
}

function formatDni(value) {
  const digits = normalizeDigits(value);
  if (!digits) return (value ?? '').toString().trim();
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function renderCredential(data) {
  const safe = data ?? {};
  cardEls.name.textContent = safe.name || '—';
  cardEls.cuil.textContent = safe.cuil || '—';
  cardEls.dni.textContent = safe.dni || '—';
  cardEls.affiliation.textContent = safe.affiliation || '—';
  cardEls.family.textContent = safe.family || '—';
  cardEls.emission.textContent = safe.emission || '—';
  cardEls.category.textContent = safe.category || '—';
}

function setFeedback(message, type) {
  const feedbackEl = $('#cdFeedback');
  if (!feedbackEl) return;
  feedbackEl.textContent = message;
  if (type) feedbackEl.dataset.status = type;
  else delete feedbackEl.dataset.status;
}

function ensureDefaultCredential() {
  if (registry.size > 0) return;
  const sample = {
    name: 'Laura Fernández',
    cuil: '27-23456789-1',
    dni: '23.456.789',
    affiliation: 'Plan Integral',
    family: 'Titular',
    emission: '2023-10-12',
    category: 'A1',
  };
  registry.set(normalizeDigits(sample.cuil), {
    ...sample,
    dniKey: normalizeDigits(sample.dni),
  });
  renderCredential(sample);
}

export function initCredentialPage() {
  const form = $('#cdForm');
  if (!form) return;

  ensureDefaultCredential();
  setFeedback('', null);
  const cuilInput = $('#cdInputCuil');

  on(form, 'submit', (event) => {
    event.preventDefault();
    const submitter = event.submitter;
    const action = submitter?.value || 'lookup';
    const formData = new FormData(form);
    const rawName = (formData.get('name') ?? '').toString().trim();
    const rawCuil = (formData.get('cuil') ?? '').toString();
    const rawDni = (formData.get('dni') ?? '').toString();
    const rawAffiliation = (formData.get('affiliation') ?? '').toString().trim();
    const rawFamily = (formData.get('family') ?? '').toString().trim();
    const rawEmission = (formData.get('emission') ?? '').toString();
    const rawCategory = (formData.get('category') ?? '').toString().trim();

    const normalizedCuil = normalizeDigits(rawCuil);
    const normalizedDni = normalizeDigits(rawDni);
    const displayCuil = formatCuil(rawCuil || normalizedCuil);
    const displayDni = formatDni(rawDni || normalizedDni);

    if (action === 'lookup') {
      if (!normalizedCuil || !normalizedDni) {
        setFeedback('Completa CUIL y DNI para consultar.', 'error');
        return;
      }
      const stored = registry.get(normalizedCuil);
      if (stored && stored.dniKey === normalizedDni) {
        renderCredential(stored);
        setFeedback('Credencial encontrada.', 'success');
      } else {
        setFeedback('No se encontró una credencial con esos datos.', 'error');
      }
      return;
    }

    if (!rawName || !normalizedCuil || !normalizedDni) {
      setFeedback('Para crear una credencial completa nombre, CUIL y DNI.', 'error');
      return;
    }

    const credential = {
      name: rawName,
      cuil: displayCuil,
      dni: displayDni,
      affiliation: rawAffiliation || 'Plan Base',
      family: rawFamily || 'Titular',
      emission: rawEmission || new Date().toISOString().slice(0, 10),
      category: rawCategory || 'A1',
      dniKey: normalizedDni,
    };

    registry.set(normalizedCuil, credential);
    renderCredential(credential);
    form.reset();
    setFeedback('Credencial creada y disponible para consulta.', 'success');
  });

  if (cuilInput) {
    window.addEventListener('viewchange', (event) => {
      if (event.detail?.view === 'cd') {
        requestAnimationFrame(() => cuilInput.focus());
      }
    });
  }
}
