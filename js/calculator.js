/* ============================================================
   JEHAN HOLDING GROUP — Concrete Calculator
   ============================================================ */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let shapeCount = 0;
let shapes = {};   /* { id: { type, volume, qty } } */

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
  shapes[id] = { type: null, volume: 0, letter, qty: 1 };

  const t = translations[currentLang];
  const block = document.createElement('div');
  block.className = 'shape-block';
  block.id = id;
  block.innerHTML = `
    <div class="shape-block__header">
      <span class="shape-label">
        <span class="shape-letter">${letter}</span>
        <input type="text" class="shape-name-input" id="name_${id}" value="${t.calc_shape}" placeholder="${t.calc_shape}" oninput="updateVolumePanel()" onkeydown="if(event.key==='Enter')this.blur()">
        <span class="shape-name-edit-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z"/></svg>
        </span>
        <div class="shape-qty">
          <button class="qty-btn" onclick="setQty('${id}',-1)" type="button">−</button>
          <input class="qty-input" id="qty_${id}" type="number" value="1" min="1" max="99" oninput="onQtyInput('${id}')">
          <button class="qty-btn" onclick="setQty('${id}',1)" type="button">+</button>
        </div>
      </span>
      <button class="shape-remove" onclick="removeShape('${id}')" title="Remove">×</button>
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

/* ── Quantity stepper ─────────────────────────────────────── */
function setQty(id, delta) {
  const input = document.getElementById('qty_' + id);
  if (!input) return;
  const next = Math.max(1, Math.min(99, (parseInt(input.value) || 1) + delta));
  input.value = next;
  shapes[id].qty = next;
  recalcShape(id);
}

function onQtyInput(id) {
  const input = document.getElementById('qty_' + id);
  if (!input) return;
  const val = Math.max(1, Math.min(99, parseInt(input.value) || 1));
  input.value = val;
  shapes[id].qty = val;
  recalcShape(id);
}

/* ── Recalculate a single shape ───────────────────────────── */
function recalcShape(id) {
  const type = shapes[id] ? shapes[id].type : null;
  if (!type) return;

  const qty = shapes[id].qty || 1;
  const vol = calcVolume(id, type) * qty;
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
      const qtyLabel = (s.qty > 1) ? ` ×${s.qty}` : '';
      const nameEl = document.getElementById('name_' + id);
      const customName = nameEl && nameEl.value.trim() ? nameEl.value.trim() : (s.type ? t['calc_' + s.type] || s.type : t.calc_placeholder);
      rows += `
        <tr>
          <td>
            <div class="volume-row-label">
              <span class="vol-letter">${s.letter}</span>
              <span>${customName}${qtyLabel}</span>
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

/* ── Export calculation as printable PDF ─────────────────── */
function exportCalc() {
  const t = translations[currentLang];
  const entries = Object.entries(shapes);
  const total = entries.reduce((sum, [, s]) => sum + s.volume, 0);
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  let rows = '';
  entries.forEach(([id, s]) => {
    const nameEl = document.getElementById('name_' + id);
    const name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : (s.type ? t['calc_' + s.type] || s.type : '—');
    const type = s.type ? t['calc_' + s.type] || s.type : '—';
    const qty  = s.qty || 1;
    rows += `<tr>
      <td><span class="letter">${s.letter}</span></td>
      <td>${name}</td>
      <td>${type}</td>
      <td style="text-align:center;">${qty}</td>
      <td style="text-align:right;">${s.volume.toFixed(3)} m³</td>
    </tr>`;
  });

  const logoUrl = window.location.origin + '/assets/images/logo.png';
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Concrete Calculation — Jehan Holding Group</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Barlow',Arial,sans-serif;color:#1E1E1E;padding:40px 48px;max-width:720px;margin:auto}
    .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1E1E1E;padding-bottom:16px;margin-bottom:28px}
    .header h1{font-size:1.5rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
    .header p{font-size:0.8rem;color:#888;margin-top:4px}
    .logo img{height:52px;width:auto;display:block}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    th{background:#1E1E1E;color:#fff;font-size:0.72rem;text-transform:uppercase;letter-spacing:.06em;padding:9px 12px;text-align:left}
    th:last-child,th:nth-child(4){text-align:right;} th:nth-child(4){text-align:center}
    td{padding:10px 12px;border-bottom:1px solid #E8E7E4;font-size:0.875rem;vertical-align:middle}
    .letter{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:#1E1E1E;color:#fff;border-radius:50%;font-size:0.7rem;font-weight:700}
    .total-row{display:flex;justify-content:space-between;align-items:center;background:#F2F1EE;padding:14px 16px;border-radius:4px;margin-bottom:32px}
    .total-row .label{font-weight:700;font-size:0.8rem;text-transform:uppercase;letter-spacing:.05em}
    .total-row .value{font-size:1.25rem;font-weight:800}
    .footer{font-size:0.75rem;color:#aaa;border-top:1px solid #E8E7E4;padding-top:12px}
    @media print{body{padding:20px 24px}}
  </style></head><body>
  <div class="header">
    <div><h1>Concrete Calculation</h1><p>Generated: ${date}</p></div>
    <div class="logo"><img src="${logoUrl}" alt="Jehan Holding Group"></div>
  </div>
  <table>
    <thead><tr><th></th><th>Name</th><th>Shape Type</th><th style="text-align:center">Qty</th><th style="text-align:right">Volume</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="color:#aaa;padding:16px 12px">No shapes added.</td></tr>'}</tbody>
  </table>
  <div class="total-row">
    <span class="label">Total Volume</span>
    <span class="value">${total.toFixed(3)} m³</span>
  </div>
  <div class="footer">Jehan Holding Group &mdash; jehanholding.com &mdash; This estimate does not include overages.</div>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

/* ── Init on load ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('shapes-container')) {
    addShape(); /* Start with one shape block */
  }
});
