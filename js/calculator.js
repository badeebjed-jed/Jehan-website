/* ============================================================
   JEHAN HOLDING GROUP — Concrete Calculator
   ============================================================ */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let shapeCount = 0;
let shapes = {};   /* { id: { type, volume } } */

/* ── SVG shape illustrations ──────────────────────────────── */
const shapeSVGs = {
  rect: `<svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="18" width="52" height="32" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M8 18 L20 8 L72 8 L72 40 L60 50" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M20 8 L20 18" stroke="currentColor" stroke-width="2"/>
    <path d="M72 8 L60 18" stroke="currentColor" stroke-width="2"/>
    <path d="M60 18 L60 50" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/>
  </svg>`,
  tri: `<svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 48 L8 12 L56 48 Z" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M8 12 L20 4 L68 40 L56 48" stroke="currentColor" stroke-width="2" fill="none"/>
    <path d="M8 12 L20 4" stroke="currentColor" stroke-width="2"/>
    <path d="M56 48 L68 40" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/>
    <path d="M8 48 L20 40 L20 4" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/>
    <rect x="8" y="40" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
  </svg>`,
  circle: `<svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 48 C40 48 12 34 12 22 A28 26 0 0 1 68 22 C68 34 40 48 40 48Z" fill="none" stroke="currentColor" stroke-width="2"/>
    <ellipse cx="40" cy="22" rx="28" ry="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/>
    <path d="M40 12 L40 48" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
    <path d="M40 22 L65 22" stroke="currentColor" stroke-width="1.5"/>
  </svg>`
};

/* ── Input templates per shape ────────────────────────────── */
function getInputsHTML(id, type) {
  const t = translations[currentLang];
  const lbl = (key) => `<label>${t[key]}</label>`;
  switch (type) {
    case 'rect':
      return `
        <div class="inputs-grid">
          <div class="field-group">${lbl('calc_width')}<input type="number" min="0" step="0.01" data-field="width" data-id="${id}" placeholder="0.00" oninput="recalcShape('${id}')"></div>
          <div class="field-group">${lbl('calc_length')}<input type="number" min="0" step="0.01" data-field="length" data-id="${id}" placeholder="0.00" oninput="recalcShape('${id}')"></div>
          <div class="field-group">${lbl('calc_depth')}<input type="number" min="0" step="0.01" data-field="depth" data-id="${id}" placeholder="0.00" oninput="recalcShape('${id}')"></div>
        </div>`;
    case 'tri':
      return `
        <div class="inputs-grid">
          <div class="field-group">${lbl('calc_base')}<input type="number" min="0" step="0.01" data-field="base" data-id="${id}" placeholder="0.00" oninput="recalcShape('${id}')"></div>
          <div class="field-group">${lbl('calc_height')}<input type="number" min="0" step="0.01" data-field="height" data-id="${id}" placeholder="0.00" oninput="recalcShape('${id}')"></div>
          <div class="field-group">${lbl('calc_depth')}<input type="number" min="0" step="0.01" data-field="depth" data-id="${id}" placeholder="0.00" oninput="recalcShape('${id}')"></div>
        </div>`;
    case 'circle':
      return `
        <div class="inputs-grid">
          <div class="field-group">${lbl('calc_radius')}<input type="number" min="0" step="0.01" data-field="radius" data-id="${id}" placeholder="0.00" oninput="recalcShape('${id}')"></div>
          <div class="field-group">${lbl('calc_angle')}<input type="number" min="0" max="360" step="1" data-field="angle" data-id="${id}" placeholder="360" oninput="recalcShape('${id}')"></div>
          <div class="field-group">${lbl('calc_depth')}<input type="number" min="0" step="0.01" data-field="depth" data-id="${id}" placeholder="0.00" oninput="recalcShape('${id}')"></div>
        </div>`;
  }
}

/* ── Volume calculation per shape ─────────────────────────── */
function calcVolume(id, type) {
  const get = (field) => {
    const el = document.querySelector(`input[data-field="${field}"][data-id="${id}"]`);
    return el ? parseFloat(el.value) || 0 : 0;
  };
  switch (type) {
    case 'rect': {
      return get('width') * get('length') * get('depth');
    }
    case 'tri': {
      return 0.5 * get('base') * get('height') * get('depth');
    }
    case 'circle': {
      const r = get('radius');
      const angle = get('angle') || 360;
      const d = get('depth');
      return Math.PI * r * r * (angle / 360) * d;
    }
    default: return 0;
  }
}

/* ── Add a new shape block ────────────────────────────────── */
function addShape() {
  const id = 'shape_' + Date.now();
  const letter = LETTERS[shapeCount % 26];
  shapeCount++;
  shapes[id] = { type: null, volume: 0, letter };

  const t = translations[currentLang];
  const block = document.createElement('div');
  block.className = 'shape-block';
  block.id = id;
  block.innerHTML = `
    <div class="shape-block__header">
      <span class="shape-label">
        <span class="shape-letter">${letter}</span>
        <span data-i18n="calc_shape">${t.calc_shape}</span>
      </span>
      <button class="shape-remove" onclick="removeShape('${id}')" title="Remove">−</button>
    </div>
    <div class="shape-block__body">
      <div class="shape-selector">
        <label data-i18n="calc_select">${t.calc_select}</label>
        <div class="shape-options">
          <div class="shape-option" onclick="selectShape('${id}','rect',this)">
            ${shapeSVGs.rect}
            <span data-i18n="calc_rect">${t.calc_rect}</span>
          </div>
          <div class="shape-option" onclick="selectShape('${id}','tri',this)">
            ${shapeSVGs.tri}
            <span data-i18n="calc_tri">${t.calc_tri}</span>
          </div>
          <div class="shape-option" onclick="selectShape('${id}','circle',this)">
            ${shapeSVGs.circle}
            <span data-i18n="calc_circle">${t.calc_circle}</span>
          </div>
        </div>
      </div>
      <div class="shape-inputs" id="inputs_${id}">
        <!-- inputs injected on shape selection -->
      </div>
      <div class="shape-result" id="result_${id}">
        <span data-i18n="calc_volume_lbl">${t.calc_volume_lbl}</span>: <strong id="vol_${id}">0</strong> m³
      </div>
    </div>
  `;

  document.getElementById('shapes-container').appendChild(block);
  updateVolumePanel();
}

/* ── Select a shape type ──────────────────────────────────── */
function selectShape(id, type, el) {
  /* Mark selected */
  el.closest('.shape-options').querySelectorAll('.shape-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');

  shapes[id].type = type;
  shapes[id].volume = 0;

  /* Inject inputs */
  const inputsContainer = document.getElementById('inputs_' + id);
  inputsContainer.innerHTML = getInputsHTML(id, type);
  inputsContainer.classList.add('visible');

  recalcShape(id);
}

/* ── Recalculate a single shape ───────────────────────────── */
function recalcShape(id) {
  const type = shapes[id] ? shapes[id].type : null;
  if (!type) return;

  const vol = calcVolume(id, type);
  shapes[id].volume = vol;

  const volEl = document.getElementById('vol_' + id);
  if (volEl) volEl.textContent = vol.toFixed(3);

  updateVolumePanel();
}

/* ── Remove a shape ───────────────────────────────────────── */
function removeShape(id) {
  delete shapes[id];
  const el = document.getElementById(id);
  if (el) el.remove();
  updateVolumePanel();
}

/* ── Update the right-hand summary panel ─────────────────── */
function updateVolumePanel() {
  const tbody = document.getElementById('volume-tbody');
  if (!tbody) return;

  const t = translations[currentLang];
  let total = 0;
  let rows = '';

  const entries = Object.entries(shapes);
  if (entries.length === 0) {
    rows = `<tr><td colspan="2" style="padding:12px 20px;color:var(--text-light);font-size:0.82rem;" data-i18n="calc_placeholder">${t.calc_placeholder}</td></tr>`;
  } else {
    entries.forEach(([id, s]) => {
      total += s.volume;
      rows += `
        <tr>
          <td>
            <div class="volume-row-label">
              <span class="vol-letter">${s.letter}</span>
              <span>${s.type ? t['calc_' + s.type] || s.type : (t.calc_placeholder)}</span>
            </div>
          </td>
          <td>${s.volume.toFixed(3)} m³</td>
        </tr>`;
    });
  }

  tbody.innerHTML = rows;
  const totalEl = document.getElementById('total-volume');
  if (totalEl) totalEl.textContent = total.toFixed(3) + ' m³';
}

/* ── Init on load ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('shapes-container')) {
    addShape(); /* Start with one shape block */
  }
});
