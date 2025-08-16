// Table Top Accessories — single-file JS
// Simple state w/ localStorage
const $ = (sel) => document.querySelector(sel);
const mm2px = (mm) => mm * 96 / 25.4; // 96 dpi
const px2mm = (px) => px * 25.4 / 96;

const STATE_KEY = "tta_state_v1";

const defaultState = {
  projectName: "My Project",
  pagePreset: "A4L",
  pageWmm: 297,
  pageHmm: 210,
  marginAll: 10,
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  gridType: "hex",
  gridColor: "#000000",
  hex: { sizeMm: 10, orient: "pointy", lineWidth: 0.8, alpha: 0.6 },
  square: { sizeMm: 10, lineWidth: 0.8, alpha: 0.6 },
  bg: { src: null, x: 0, y: 0, scale: 1.0, alpha: 0.8, rotation: 0, color: "#ffffff" },
};

let state = loadState();
state.hex = { ...defaultState.hex, ...state.hex };
state.square = { ...defaultState.square, ...state.square };
state.bg = { ...defaultState.bg, ...state.bg };

// UI refs
const board = $("#board");
const ctx = board.getContext("2d");
const pagePreset = $("#pagePreset");
const pageWmm = $("#pageWmm");
const pageHmm = $("#pageHmm");
const customSizeRow = $("#customSizeRow");

const marginAll = $("#marginAll");
const toggleMargins = $("#toggleMargins");
const marginAdvanced = $("#marginAdvanced");
const mTop = $("#mTop");
const mRight = $("#mRight");
const mBottom = $("#mBottom");
const mLeft = $("#mLeft");

const gridType = $("#gridType");
const hexControls = $("#hexControls");
const squareControls = $("#squareControls");
const hexSize = $("#hexSize");
const hexOrient = $("#hexOrient");
const lineWidth = $("#lineWidth");
const lineAlpha = $("#lineAlpha");
const sqSize = $("#sqSize");
const sqLineWidth = $("#sqLineWidth");
const sqLineAlpha = $("#sqLineAlpha");
const gridColor = $("#gridColor");

const bgFile = $("#bgFile");
const bgAlpha = $("#bgAlpha");
const bgScale = $("#bgScale");
const bgScaleRange = $("#bgScaleRange");
const bgRotateLeft = $("#bgRotateLeft");
const bgRotateRight = $("#bgRotateRight");
const bgReset = $("#bgReset");
const bgColor = $("#bgColor");

const projectName = $("#projectName");
const exportFormat = $("#exportFormat");
const btnExport = $("#btnExport");

const crumbs = $("#crumb");

// Panel navigation
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const panel = btn.getAttribute("data-panel");
    showPanel(panel);
  });
});

function showPanel(panel) {
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
  $("#panel-" + panel).classList.remove("hidden");
  crumbs.textContent = panel === "workflow" ? "Grid & Map Tool" : panel.charAt(0).toUpperCase() + panel.slice(1);
}

// Initialize UI from state
function initUI() {
  projectName.value = state.projectName;
  pagePreset.value = state.pagePreset;
  pageWmm.value = state.pageWmm;
  pageHmm.value = state.pageHmm;
  customSizeRow.hidden = state.pagePreset !== "Custom";

  marginAll.value = state.marginAll;
  [mTop.value, mRight.value, mBottom.value, mLeft.value] = [
    state.margins.top, state.margins.right, state.margins.bottom, state.margins.left
  ];

  gridType.value = state.gridType;
  hexControls.hidden = state.gridType !== "hex";
  squareControls.hidden = state.gridType !== "square";

  hexSize.value = state.hex.sizeMm;
  hexOrient.value = state.hex.orient;
  lineWidth.value = state.hex.lineWidth;
  lineAlpha.value = state.hex.alpha;
  sqSize.value = state.square.sizeMm;
  sqLineWidth.value = state.square.lineWidth;
  sqLineAlpha.value = state.square.alpha;
  gridColor.value = state.gridColor;

  bgAlpha.value = state.bg.alpha;
  bgScale.value = Math.round(state.bg.scale * 100);
  bgScaleRange.value = Math.round(state.bg.scale * 100);
  bgColor.value = state.bg.color;

  setCanvasSizeFromPage();
  redraw();
}

function setCanvasSizeFromPage() {
  const { wmm, hmm } = getPageSizeMM();
  const w = Math.round(mm2px(wmm));
  const h = Math.round(mm2px(hmm));
  board.width = w;
  board.height = h;
}

function getPageSizeMM() {
  switch (state.pagePreset) {
    case "A4L": return { wmm: 297, hmm: 210 };
    case "A4P": return { wmm: 210, hmm: 297 };
    case "LetterL": return { wmm: 279.4, hmm: 215.9 };
    case "LetterP": return { wmm: 215.9, hmm: 279.4 };
    case "Custom": default: return { wmm: state.pageWmm, hmm: state.pageHmm };
  }
}

// Drawing
function redraw() {
  const w = board.width, h = board.height;
  // Clear
  ctx.fillStyle = state.bg.color || "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Background image
  if (bgImage && state.bg.src) {
    ctx.save();
    ctx.globalAlpha = state.bg.alpha;
    const imgW = bgImage.width * state.bg.scale;
    const imgH = bgImage.height * state.bg.scale;
    ctx.translate(w/2 + state.bg.x, h/2 + state.bg.y);
    ctx.rotate(state.bg.rotation);
    ctx.drawImage(bgImage, -imgW/2, -imgH/2, imgW, imgH);
    ctx.restore();
  }

  // Margins guide
  const mt = mm2px(state.margins.top);
  const mr = mm2px(state.margins.right);
  const mb = mm2px(state.margins.bottom);
  const ml = mm2px(state.margins.left);
  const inner = { x: ml, y: mt, w: w - ml - mr, h: h - mt - mb };

  // Draw a light margin rectangle
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);
  ctx.restore();

  // Clip drawing to inner area so grid doesn't bleed into margins
  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.w, inner.h);
  ctx.clip();
  if (state.gridType === "hex") {
    drawHexGrid(inner);
  } else if (state.gridType === "square") {
    drawSquareGrid(inner);
  }
  ctx.restore();
}

function drawSquareGrid(inner) {
  const sizePx = mm2px(state.square.sizeMm);
  ctx.save();
  ctx.globalAlpha = state.square.alpha;
  ctx.strokeStyle = state.gridColor;
  ctx.lineWidth = state.square.lineWidth;
  // Vertical lines
  for (let x = inner.x; x <= inner.x + inner.w + 0.5; x += sizePx) {
    ctx.beginPath();
    ctx.moveTo(x, inner.y);
    ctx.lineTo(x, inner.y + inner.h);
    ctx.stroke();
  }
  // Horizontal lines
  for (let y = inner.y; y <= inner.y + inner.h + 0.5; y += sizePx) {
    ctx.beginPath();
    ctx.moveTo(inner.x, y);
    ctx.lineTo(inner.x + inner.w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHexGrid(inner) {
  const sizePx = mm2px(state.hex.sizeMm);
  const orient = state.hex.orient; // 'pointy' or 'flat'
  ctx.save();
  ctx.globalAlpha = state.hex.alpha;
  ctx.strokeStyle = state.gridColor;
  ctx.lineWidth = state.hex.lineWidth;

  const w = inner.w, h = inner.h, ox = inner.x, oy = inner.y;

  if (orient === "pointy") {
    const hexW = Math.sqrt(3) * sizePx;
    const hexH = 2 * sizePx;
    const stepX = hexW;
    const stepY = 3/4 * hexH;

    for (let y = oy; y <= oy + h + hexH; y += stepY) {
      const row = Math.round((y - oy) / stepY);
      for (let x = ox + ((row % 2) ? stepX / 2 : 0); x <= ox + w + hexW; x += stepX) {
        drawHex(x, y, sizePx, orient);
      }
    }
  } else {
    // flat top
    const hexW = 2 * sizePx;
    const hexH = Math.sqrt(3) * sizePx;
    const stepX = 3/4 * hexW;
    const stepY = hexH;

    for (let y = oy; y <= oy + h + hexH; y += stepY) {
      const colOffset = 0;
      for (let x = ox; x <= ox + w + hexW; x += stepX) {
        const col = Math.round((x - ox) / stepX);
        const yOffset = (col % 2) ? hexH / 2 : 0;
        drawHex(x, y + yOffset, sizePx, orient);
      }
    }
  }

  ctx.restore();
}

function drawHex(cx, cy, r, orient) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = orient === "pointy" ? (Math.PI / 180) * (60 * i - 30) : (Math.PI / 180) * (60 * i);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

// Background image handling
let bgImage = null;
if (state.bg.src) {
  bgImage = new Image();
  bgImage.src = state.bg.src;
  bgImage.onload = redraw;
}

bgFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.bg.src = reader.result;
    bgImage = new Image();
    bgImage.onload = () => {
      // place centered
      state.bg.x = 0; state.bg.y = 0;
      const v = parseInt(bgScale.value, 10) || 100;
      state.bg.scale = v / 100;
      bgScaleRange.value = v;
      saveState();
      redraw();
    };
    bgImage.src = state.bg.src;
  };
  reader.readAsDataURL(file);
});

bgAlpha.addEventListener("input", () => { state.bg.alpha = parseFloat(bgAlpha.value); saveState(); redraw(); });
bgScaleRange.addEventListener("input", () => {
  const v = clampNum(bgScaleRange.value, 10, 400);
  state.bg.scale = v / 100;
  bgScale.value = v;
  saveState(); redraw();
});
bgScale.addEventListener("input", () => {
  const v = clampNum(bgScale.value, 10, 400);
  state.bg.scale = v / 100;
  bgScaleRange.value = v;
  saveState(); redraw();
});
bgRotateLeft.addEventListener("click", () => { state.bg.rotation -= Math.PI / 2; saveState(); redraw(); });
bgRotateRight.addEventListener("click", () => { state.bg.rotation += Math.PI / 2; saveState(); redraw(); });
bgReset.addEventListener("click", () => { state.bg.x = 0; state.bg.y = 0; saveState(); redraw(); });
bgColor.addEventListener("input", () => { state.bg.color = bgColor.value; saveState(); redraw(); });

// Drag background with mouse
let dragging = false;
let last = null;
board.addEventListener("mousedown", (e) => {
  if (!bgImage || !state.bg.src) return;
  dragging = true;
  last = { x: e.offsetX, y: e.offsetY };
});
board.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dx = e.offsetX - last.x;
  const dy = e.offsetY - last.y;
  state.bg.x += dx;
  state.bg.y += dy;
  last = { x: e.offsetX, y: e.offsetY };
  saveState();
  redraw();
});
board.addEventListener("mouseup", () => dragging = false);
board.addEventListener("mouseleave", () => dragging = false);

board.addEventListener("wheel", (e) => {
  if (!bgImage || !state.bg.src) return;
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.05 : 0.95;
  state.bg.scale = Math.max(0.1, Math.min(4, state.bg.scale * factor));
  const v = Math.round(state.bg.scale * 100);
  bgScaleRange.value = v;
  bgScale.value = v;
  saveState(); redraw();
}, { passive: false });

// Controls bindings
pagePreset.addEventListener("change", () => {
  state.pagePreset = pagePreset.value;
  if (state.pagePreset !== "Custom") {
    const { wmm, hmm } = getPageSizeMM();
    state.pageWmm = wmm;
    state.pageHmm = hmm;
    pageWmm.value = wmm;
    pageHmm.value = hmm;
  }
  customSizeRow.hidden = state.pagePreset !== "Custom";
  setCanvasSizeFromPage();
  saveState(); redraw();
});
pageWmm.addEventListener("input", () => {
  state.pagePreset = "Custom";
  pagePreset.value = "Custom";
  customSizeRow.hidden = false;
  state.pageWmm = clampNum(pageWmm.value, 10, 2000);
  setCanvasSizeFromPage();
  saveState(); redraw();
});
pageHmm.addEventListener("input", () => {
  state.pagePreset = "Custom";
  pagePreset.value = "Custom";
  customSizeRow.hidden = false;
  state.pageHmm = clampNum(pageHmm.value, 10, 2000);
  setCanvasSizeFromPage();
  saveState(); redraw();
});

// Margin logic: single control mirrors into all; Advanced reveals per-side
toggleMargins.addEventListener("click", () => {
  const expanded = marginAdvanced.hidden;
  marginAdvanced.hidden = !expanded;
  toggleMargins.textContent = expanded ? "Advanced ▾" : "Advanced ▸";
  toggleMargins.setAttribute("aria-expanded", String(expanded));
});

marginAll.addEventListener("input", () => {
  const v = clampNum(marginAll.value, 0, 50);
  state.marginAll = v;
  state.margins.top = state.margins.right = state.margins.bottom = state.margins.left = v;
  mTop.value = mRight.value = mBottom.value = mLeft.value = v;
  saveState(); redraw();
});
[mTop, mRight, mBottom, mLeft].forEach((el, idx) => {
  el.addEventListener("input", () => {
    state.margins.top = clampNum(mTop.value, 0, 50);
    state.margins.right = clampNum(mRight.value, 0, 50);
    state.margins.bottom = clampNum(mBottom.value, 0, 50);
    state.margins.left = clampNum(mLeft.value, 0, 50);
    // If all equal, sync marginAll; otherwise leave it as-is
    const vals = [state.margins.top, state.margins.right, state.margins.bottom, state.margins.left];
    const allEqual = vals.every(x => x === vals[0]);
    if (allEqual) marginAll.value = vals[0];
    saveState(); redraw();
  });
});

gridType.addEventListener("change", () => {
  state.gridType = gridType.value;
  hexControls.hidden = state.gridType !== "hex";
  squareControls.hidden = state.gridType !== "square";
  saveState(); redraw();
});

hexSize.addEventListener("input", () => { state.hex.sizeMm = clampNum(hexSize.value, 2, 100); saveState(); redraw(); });
hexOrient.addEventListener("change", () => { state.hex.orient = hexOrient.value; saveState(); redraw(); });
lineWidth.addEventListener("input", () => { state.hex.lineWidth = Math.max(0.1, parseFloat(lineWidth.value)); saveState(); redraw(); });
lineAlpha.addEventListener("input", () => { state.hex.alpha = parseFloat(lineAlpha.value); saveState(); redraw(); });

sqSize.addEventListener("input", () => { state.square.sizeMm = clampNum(sqSize.value, 2, 100); saveState(); redraw(); });
sqLineWidth.addEventListener("input", () => { state.square.lineWidth = Math.max(0.1, parseFloat(sqLineWidth.value)); saveState(); redraw(); });
sqLineAlpha.addEventListener("input", () => { state.square.alpha = parseFloat(sqLineAlpha.value); saveState(); redraw(); });
gridColor.addEventListener("input", () => { state.gridColor = gridColor.value; saveState(); redraw(); });

// Project/session
projectName.addEventListener("input", () => { state.projectName = projectName.value; saveState(); });
btnExport.addEventListener("click", () => {
  redraw();
  const fmt = exportFormat.value;
  if (fmt === "png" || fmt === "jpeg") {
    const link = document.createElement("a");
    link.download = (state.projectName || "tabletop") + "." + fmt;
    link.href = board.toDataURL("image/" + fmt);
    link.click();
  } else if (fmt === "pdf" && window.jspdf) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: board.width > board.height ? "landscape" : "portrait",
      unit: "px",
      format: [board.width, board.height]
    });
    pdf.addImage(board.toDataURL("image/png"), "PNG", 0, 0, board.width, board.height);
    pdf.save((state.projectName || "tabletop") + ".pdf");
  }
});
$("#btnClear").addEventListener("click", () => {
  if (confirm("Clear all local data for this app?")) {
    localStorage.removeItem(STATE_KEY);
    state = structuredClone(defaultState);
    initUI();
  }
});

// Persistence helpers
function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {}
}
function loadState(force=false) {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw && !force) {
      return { ...structuredClone(defaultState), ...JSON.parse(raw) };
    } else if (raw && force) {
      return JSON.parse(raw);
    }
  } catch {}
  return structuredClone(defaultState);
}
function clampNum(v, min, max) {
  let n = parseFloat(v);
  if (isNaN(n)) n = min;
  return Math.max(min, Math.min(max, n));
}

// Boot
initUI();
showPanel("workflow");
