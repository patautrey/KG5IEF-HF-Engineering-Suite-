// ======================================================
// KG5IEF HF ENGINEERING SUITE - APP.JS (CHUNK 1 OF 4)
// Core Constants, Utilities, Frequency Logic
// Medium comments, 4-space indentation
// ======================================================

// ------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------

const C_M_PER_S = 299792458;      // speed of light
const FT_PER_M = 3.28084;         // meters → feet

// High-contrast engineering color palette
const COLOR_BG = "#020617";       // deep navy background
const COLOR_GRID = "#2d3748";     // medium gray grid lines
const COLOR_AZIMUTH = "#ffd400";  // yellow azimuth trace
const COLOR_ELEVATION = "#ff3b30";// red elevation trace
const COLOR_DONUT = "#00a2ff";    // electric blue donut projection
const COLOR_LABEL = "#e5e7eb";    // soft white labels

// HF band definitions (center frequencies)
const BANDS = {
    "3.5":     { name: "80 m", mhz: 3.5 },
    "5.3305":  { name: "60 m", mhz: 5.3305 },
    "7.0":     { name: "40 m", mhz: 7.0 },
    "10.1":    { name: "30 m", mhz: 10.1 },
    "14.0":    { name: "20 m", mhz: 14.0 },
    "18.1":    { name: "17 m", mhz: 18.1 },
    "21.0":    { name: "15 m", mhz: 21.0 },
    "24.9":    { name: "12 m", mhz: 24.9 },
    "28.0":    { name: "10 m", mhz: 28.0 },
    "50.0":    { name: "6 m", mhz: 50.0 }
};

// Coax types with approximate loss figures
const COAX_TYPES = {
    lmr400: { name: "LMR-400", vf: 0.85, loss_30mhz_db_per_100ft: 1.0, loss_50mhz_db_per_100ft: 1.5 },
    rg213:  { name: "RG-213",  vf: 0.66, loss_30mhz_db_per_100ft: 1.3, loss_50mhz_db_per_100ft: 2.0 },
    rg8x:   { name: "RG-8X",   vf: 0.78, loss_30mhz_db_per_100ft: 2.0, loss_50mhz_db_per_100ft: 3.0 },
    rg58:   { name: "RG-58",   vf: 0.66, loss_30mhz_db_per_100ft: 2.7, loss_50mhz_db_per_100ft: 4.5 }
};

// Ladder line types
const LADDER_TYPES = {
    "300": { name: "300 Ω", vf: 0.82 },
    "450": { name: "450 Ω", vf: 0.92 },
    "600": { name: "600 Ω", vf: 0.97 }
};

// ------------------------------------------------------
// UTILITY FUNCTIONS
// ------------------------------------------------------

function mhzToHz(mhz) {
    return mhz * 1e6;
}

function wavelengthMeters(mhz) {
    return C_M_PER_S / mhzToHz(mhz);
}

function metersToFeet(m) {
    return m * FT_PER_M;
}

function feetToMeters(ft) {
    return ft / FT_PER_M;
}

function dbToRatio(db) {
    return Math.pow(10, db / 10);
}

function ratioToDb(r) {
    return 10 * Math.log10(r);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

// ------------------------------------------------------
// FREQUENCY SELECTION LOGIC
// ------------------------------------------------------

// Returns the working frequency in MHz, honoring Custom mode
function getFrequencyMHz() {
    const bandVal = document.getElementById("band_select").value;
    const custom = parseFloat(document.getElementById("custom_freq_mhz").value);

    // Explicit Custom mode
    if (bandVal === "custom") {
        if (!isNaN(custom) && custom > 0) return custom;
        return 14.0; // fallback
    }

    // User typed a custom frequency while a standard band is selected
    if (!isNaN(custom) && custom > 0) {
        document.getElementById("band_select").value = "custom";
        return custom;
    }

    // Otherwise use band center
    return BANDS[bandVal] ? BANDS[bandVal].mhz : 14.0;
}

// ------------------------------------------------------
// COAX / LADDER UI HELPERS
// ------------------------------------------------------

// Returns coax length in feet, handling "custom" option
function getCoaxLengthFt() {
    const sel = document.getElementById("coax_length_ft").value;
    if (sel === "custom") {
        const c = parseFloat(document.getElementById("coax_length_custom_ft").value || "0");
        return c > 0 ? c : 75;
    }
    return parseFloat(sel);
}

// Update coax VF when a known coax type is selected
function updateCoaxVF() {
    const type = document.getElementById("coax_type").value;
    if (type === "custom") return;
    const cfg = COAX_TYPES[type];
    if (cfg) document.getElementById("coax_vf").value = cfg.vf.toFixed(2);
}

// Update ladder line VF when a known type is selected
function updateLadderVF() {
    const type = document.getElementById("ladder_type").value;
    if (type === "custom" || type === "none") return;
    const cfg = LADDER_TYPES[type];
    if (cfg) document.getElementById("ladder_vf").value = cfg.vf.toFixed(2);
}

// Show/hide custom coax length input
function handleCoaxLengthSelectChange() {
    const sel = document.getElementById("coax_length_ft").value;
    document.getElementById("coax_length_custom_ft").style.display =
        sel === "custom" ? "block" : "none";
}
// ======================================================
// KG5IEF HF ENGINEERING SUITE - APP.JS (CHUNK 2 OF 4)
// RF Math Engines: Coax Loss, Electrical Length,
// Geometry Engine, ERP Engine, Environment Gain
// Medium comments, 4-space indentation
// ======================================================

// ------------------------------------------------------
// COAX LOSS ENGINE
// ------------------------------------------------------

// Interpolates coax loss between 30 MHz and 50 MHz
function interpolateCoaxLossPer100ft(typeKey, mhz) {
    const cfg = COAX_TYPES[typeKey];
    if (!cfg) return 0;

    const f1 = 30;
    const f2 = 50;
    const l1 = cfg.loss_30mhz_db_per_100ft;
    const l2 = cfg.loss_50mhz_db_per_100ft;

    // Below 30 MHz: scale proportionally
    if (mhz <= f1) return l1 * (mhz / f1);

    // Above 50 MHz: scale proportionally
    if (mhz >= f2) return l2 * (mhz / f2);

    // Between 30 and 50 MHz: linear interpolation
    const t = (mhz - f1) / (f2 - f1);
    return l1 + t * (l2 - l1);
}

// Computes total coax loss for a given length
function computeCoaxLossDb(mhz, lengthFt, typeKey) {
    const per100 = interpolateCoaxLossPer100ft(typeKey, mhz);
    return per100 * (lengthFt / 100);
}

// ------------------------------------------------------
// ELECTRICAL LENGTH ENGINE
// ------------------------------------------------------

// Computes electrical length in degrees for a given coax/ladder line
function computeElectricalLengthDegrees(mhz, lengthFt, vf) {
    const lambda_ft = metersToFeet(wavelengthMeters(mhz));
    const electricalFt = lengthFt * vf;
    return (electricalFt / lambda_ft) * 360;
}

// ------------------------------------------------------
// GEOMETRY ENGINE (ALL ANTENNAS)
// ------------------------------------------------------

// Generic resonant length calculator
function computeResonantLengthFeet(mhz, vf, fraction) {
    return metersToFeet(wavelengthMeters(mhz)) * fraction * vf;
}

// Returns geometry summary for the selected antenna
function geometryForAntenna(mhz, antennaType, radiatorVf) {
    const g = { lines: [], notes: [] };
    const add = (label, ft) => g.lines.push({ label, valueFt: ft });

    switch (antennaType) {

        // ------------------------------
        // 1/4-wave vertical
        // ------------------------------
        case "quarter_vertical":
            add("Vertical radiator", computeResonantLengthFeet(mhz, radiatorVf, 0.25));
            g.notes.push("1/4-wave vertical over ground.");
            break;

        // ------------------------------
        // 1/2-wave dipole
        // ------------------------------
        case "half_dipole": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            add("Total dipole length", total);
            add("Each leg", total / 2);
            g.notes.push("1/2-wave center-fed dipole.");
            break;
        }

        // ------------------------------
        // Fan dipole (multi-band)
        // ------------------------------
        case "fan_dipole": {
            [3.5, 7.0, 14.0, 21.0].forEach(b => {
                const total = computeResonantLengthFeet(b, radiatorVf, 0.5);
                add(`Fan leg pair for ${b} MHz`, total);
            });
            g.notes.push("Multi-band fan dipole.");
            break;
        }

        // ------------------------------
        // Doublet (non-resonant)
        // ------------------------------
        case "doublet": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            add("Total doublet length", total);
            add("Each leg", total / 2);
            g.notes.push("Non-resonant doublet.");
            break;
        }

        // ------------------------------
        // EFHW
        // ------------------------------
        case "efhw":
            add("EFHW wire length", computeResonantLengthFeet(mhz, radiatorVf, 0.5));
            g.notes.push("End-fed half-wave.");
            break;

        // ------------------------------
        // Full-wave loop
        // ------------------------------
        case "loop": {
            const circ = computeResonantLengthFeet(mhz, radiatorVf, 1.0);
            add("Loop circumference", circ);
            add("Approx side length", circ / 4);
            g.notes.push("Full-wave loop.");
            break;
        }

        // ------------------------------
        // Moxon rectangle
        // ------------------------------
        case "moxon": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            add("Boom length (approx)", total * 0.6);
            add("Element tip-to-tip width", total);
            g.notes.push("Moxon rectangle.");
            break;
        }

        // ------------------------------
        // Yagis (2, 3, 4 element)
        // ------------------------------
        case "yagi_2":
        case "yagi_3":
        case "yagi_4": {
            const driven = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            add("Reflector", driven * 1.05);
            add("Driven", driven);
            add("Director", driven * 0.95);
            add("Element spacing", metersToFeet(wavelengthMeters(mhz) * 0.15));
            g.notes.push("Yagi element lengths approx.");
            break;
        }

        // ------------------------------
        // Half-square
        // ------------------------------
        case "half_square":
            add("Vertical legs (each)", computeResonantLengthFeet(mhz, radiatorVf, 0.25));
            add("Top horizontal", computeResonantLengthFeet(mhz, radiatorVf, 0.5));
            g.notes.push("Half-square antenna.");
            break;

        // ------------------------------
        // Bobtail curtain
        // ------------------------------
        case "bobtail":
            add("Vertical legs (each)", computeResonantLengthFeet(mhz, radiatorVf, 0.25));
            add("Top horizontal", computeResonantLengthFeet(mhz, radiatorVf, 0.75));
            g.notes.push("Bobtail curtain.");
            break;

        // ------------------------------
        // Extended Double Zepp (EDZ)
        // ------------------------------
        case "edz": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 1.25);
            add("Total EDZ length", total);
            add("Each leg", total / 2);
            g.notes.push("Extended Double Zepp.");
            break;
        }

        // ------------------------------
        // Rybakov 9:1
        // ------------------------------
        case "rybakov":
            add("Rybakov radiator", computeResonantLengthFeet(mhz, radiatorVf, 0.5));
            g.notes.push("Rybakov 9:1 vertical.");
            break;

        // ------------------------------
        // Duct-tape roll-up J-pole
        // ------------------------------
        case "jpole_duct":
            add("Radiator (3/4λ)", computeResonantLengthFeet(mhz, radiatorVf, 0.75));
            add("Matching stub (1/4λ)", computeResonantLengthFeet(mhz, radiatorVf, 0.25));
            add("Spacing (inches)", 1.0);
            g.notes.push("Duct-tape roll-up J-pole.");
            break;

        // ------------------------------
        // Off-center-fed dipole (OCF)
        // ------------------------------
        case "ocf_dipole": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            add("Total length", total);
            add("Long leg (~66%)", total * 0.66);
            add("Short leg (~34%)", total * 0.34);
            g.notes.push("OCF dipole.");
            break;
        }
    }

    return g;
}

// ------------------------------------------------------
// ENVIRONMENT GAIN ENGINE
// ------------------------------------------------------

function computeEnvironmentGainDb(opts) {
    let envDb = 0;

    if (opts.seaside) envDb += 3.0;
    if (opts.radials > 0) envDb += clamp(opts.radials * 0.1, 0, 3);
    if (opts.elevatedRadials > 0) envDb += clamp(opts.elevatedRadials * 0.2, 0, 3);

    if (opts.timeOfDay === "night") envDb += 0.5;
    if (opts.timeOfDay === "grayline") envDb += 1.0;

    return envDb;
}

// ------------------------------------------------------
// BASE ANTENNA GAIN ENGINE
// ------------------------------------------------------

function computeAntennaBaseGainDb(type) {
    switch (type) {
        case "quarter_vertical": return 0;
        case "half_dipole": return 2.1;
        case "fan_dipole": return 2.1;
        case "doublet": return 2.1;
        case "efhw": return 1.5;
        case "loop": return 2.5;
        case "moxon": return 5.0;
        case "yagi_2": return 5.0;
        case "yagi_3": return 7.0;
        case "yagi_4": return 8.0;
        case "half_square": return 4.0;
        case "bobtail": return 6.0;
        case "edz": return 3.0;
        case "rybakov": return -1.0;
        case "jpole_duct": return 1.8;
        case "ocf_dipole": return 2.1;
        default: return 0;
    }
}

// ------------------------------------------------------
// BAND PENALTY ENGINE
// ------------------------------------------------------

function computeBandGainAdjustmentDb(mhz, type) {
    const ref = 14.0; // reference band for penalty
    const delta = Math.abs(mhz - ref) / ref;
    let penalty = clamp(delta * 2.0, 0, 3);

    // Broadband antennas get reduced penalty
    if (["doublet", "ocf_dipole", "efhw"].includes(type)) {
        penalty *= 0.5;
    }

    return -penalty;
}

// ------------------------------------------------------
// ERP ENGINE
// ------------------------------------------------------

function computeERP(mhz, type, txPowerW, coaxType, coaxLengthFt, coaxVf, env, arr) {
    const base = computeAntennaBaseGainDb(type);
    const bandAdj = computeBandGainAdjustmentDb(mhz, type);
    const envDb = computeEnvironmentGainDb(env);

    let arrayDb = 0;
    if (arr.reflectors > 0) arrayDb += clamp(arr.reflectors * 0.8, 0, 4);
    if (arr.directors > 0) arrayDb += clamp(arr.directors * 0.6, 0, 4);

    let coaxLoss = 0;
    if (coaxType !== "custom") {
        coaxLoss = computeCoaxLossDb(mhz, coaxLengthFt, coaxType);
    }

    const total = base + bandAdj + envDb + arrayDb - coaxLoss;
    const erpW = txPowerW * dbToRatio(total);

    return {
        baseGainDb: base,
        bandAdjDb: bandAdj,
        envDb,
        arrayDb,
        coaxLossDb: coaxLoss,
        totalGainDb: total,
        erpW
    };
}
// ======================================================
// KG5IEF HF ENGINEERING SUITE - APP.JS (CHUNK 3 OF 4)
// Pattern Engines + Drawing Engines
// Medium comments, 4-space indentation
// ======================================================

// ------------------------------------------------------
// AZIMUTH PATTERN ENGINE (0–360°)
// ------------------------------------------------------

function computeAzimuthPattern(type, reflectors, directors) {
    const pattern = [];

    for (let deg = 0; deg <= 360; deg += 2) {
        const rad = deg * Math.PI / 180;
        let g = 1; // baseline omnidirectional

        // Directional antennas
        if (type.startsWith("yagi") || type === "moxon" || type === "bobtail" || type === "half_square") {
            g += 2.5 * Math.cos(rad);      // forward lobe
            g += 1.2 * Math.cos(2 * rad);  // narrower shaping
            g += directors * 0.4;
            g += reflectors * 0.6;
        }

        // Verticals: slight forward bias
        if (["quarter_vertical", "rybakov", "jpole_duct"].includes(type)) {
            g += 0.3 * Math.cos(rad);
        }

        // Loop: figure-8 pattern
        if (type === "loop") {
            g = Math.abs(Math.cos(rad));
        }

        pattern.push(Math.max(g, 0));
    }

    return pattern;
}

// ------------------------------------------------------
// ELEVATION PATTERN ENGINE (0–90°)
// ------------------------------------------------------

function computeElevationPattern(type, seaside, timeOfDay, heightFt, mhz) {
    const pattern = [];
    const lambda_ft = metersToFeet(wavelengthMeters(mhz));
    const h = heightFt / lambda_ft; // electrical height in wavelengths

    for (let deg = 0; deg <= 90; deg += 2) {
        const rad = deg * Math.PI / 180;
        let g = Math.cos(rad); // baseline low-angle bias

        // Verticals: strong low-angle
        if (["quarter_vertical", "rybakov", "jpole_duct"].includes(type)) {
            g = Math.pow(Math.cos(rad), 1.5);
        }

        // Horizontal wires: height-dependent lobes
        if (["half_dipole", "doublet", "fan_dipole", "ocf_dipole", "edz"].includes(type)) {
            const n = clamp(1 + (h - 0.25) * 2, 0.5, 3);
            g = Math.pow(Math.sin(rad), n);
        }

        // Half-square / Bobtail: very low-angle
        if (["half_square", "bobtail"].includes(type)) {
            g = Math.pow(Math.cos(rad), 1.8);
        }

        // Seaside: boost low angles
        if (seaside) {
            g += 0.4 * Math.cos(rad);
        }

        // Time-of-day shaping
        if (timeOfDay === "night") {
            g += 0.2 * Math.sin(rad);
        } else if (timeOfDay === "grayline") {
            g += 0.3 * Math.sin(rad) + 0.3 * Math.cos(rad);
        }

        pattern.push(Math.max(g, 0));
    }

    return pattern;
}

// ------------------------------------------------------
// DONUT PROJECTION ENGINE (2D projection of 3D pattern)
// ------------------------------------------------------

function computeDonutProjectionPattern(type) {
    const pattern = [];

    for (let i = 0; i < 180; i++) {
        const theta = i * Math.PI / 180;
        let r = Math.abs(Math.sin(theta)); // dipole-like torus

        // Verticals: donut flips orientation
        if (["quarter_vertical", "rybakov", "jpole_duct"].includes(type)) {
            r = Math.abs(Math.cos(theta));
        }

        // Loop: hybrid torus
        if (type === "loop") {
            r = Math.abs(Math.sin(theta)) * Math.abs(Math.cos(theta));
        }

        pattern.push(r);
    }

    return pattern;
}

// ------------------------------------------------------
// POLAR PLOT RENDERER (Azimuth + Elevation)
// ------------------------------------------------------

function drawPolarPattern(canvasId, pattern, label, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    // Reset and clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    // Move origin to center
    ctx.translate(w / 2, h / 2);
    const radius = Math.min(w, h) / 2 - 16;

    // Grid rings
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 1.2; // medium grid lines
    for (let r = radius; r > 0; r -= radius / 4) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Radial lines every 30°
    for (let a = 0; a < 360; a += 30) {
        const rad = a * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius * Math.cos(rad), radius * Math.sin(rad));
        ctx.stroke();
    }

    // Normalize pattern
    const maxGain = Math.max(...pattern, 1e-6);

    // Draw pattern
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < pattern.length; i++) {
        const deg = i * 2;
        const rad = deg * Math.PI / 180;
        const r = radius * (pattern[i] / maxGain);
        const x = r * Math.cos(rad);
        const y = r * Math.sin(rad);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.stroke();

    // Label
    ctx.fillStyle = COLOR_LABEL;
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, 0, radius + 10);

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// ------------------------------------------------------
// DONUT PROJECTION RENDERER
// ------------------------------------------------------

function drawDonutProjection(canvasId, pattern, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    // Reset and clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 16;
    const maxR = Math.max(...pattern, 1e-6);

    // Inner reference circle
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    // Donut outline
    ctx.strokeStyle = COLOR_DONUT;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < pattern.length; i++) {
        const theta = i * Math.PI / 180;
        const r = radius * 0.7 * (pattern[i] / maxR);
        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta) * 0.5; // vertical compression

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.stroke();

    // Label
    ctx.fillStyle = COLOR_LABEL;
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, cx, h - 4);
}
// ======================================================
// KG5IEF HF ENGINEERING SUITE - APP.JS (CHUNK 4 OF 4)
// UI Integration, Summary Rendering, calculate(), initApp()
// Medium comments, 4-space indentation
// ======================================================

// ------------------------------------------------------
// GEOMETRY SUMMARY RENDERING
// ------------------------------------------------------

function renderGeometrySummary(geom) {
    const el = document.getElementById("geometry_summary");
    const cutEl = document.getElementById("cutlength_summary");
    if (!el || !cutEl) return;

    let html = "";
    geom.lines.forEach(line => {
        html += `<div><strong>${line.label}:</strong> ${line.valueFt.toFixed(2)} ft</div>`;
    });

    if (geom.notes.length) {
        html += `<div style="margin-top:4px;font-size:0.85em;color:#9ca3af;">${geom.notes.join(" ")}</div>`;
    }

    el.innerHTML = html;
    cutEl.innerHTML = html;
}

// ------------------------------------------------------
// ERP SUMMARY RENDERING
// ------------------------------------------------------

function renderErpSummary(erp, mhz, antennaType) {
    const el = document.getElementById("erp_summary");
    if (!el) return;

    const erpDbw = ratioToDb(erp.erpW);

    const lines = [];
    lines.push(`<div><strong>Band:</strong> ${mhz.toFixed(4)} MHz</div>`);
    lines.push(`<div><strong>Antenna:</strong> ${antennaType}</div>`);
    lines.push(`<div><strong>Base Gain:</strong> ${erp.baseGainDb.toFixed(2)} dB</div>`);
    lines.push(`<div><strong>Band Adj:</strong> ${erp.bandAdjDb.toFixed(2)} dB</div>`);
    lines.push(`<div><strong>Env Gain:</strong> ${erp.envDb.toFixed(2)} dB</div>`);
    lines.push(`<div><strong>Array Gain:</strong> ${erp.arrayDb.toFixed(2)} dB</div>`);
    lines.push(`<div><strong>Coax Loss:</strong> ${erp.coaxLossDb.toFixed(2)} dB</div>`);
    lines.push(`<div><strong>Total Gain:</strong> ${erp.totalGainDb.toFixed(2)} dB</div>`);
    lines.push(`<div><strong>ERP:</strong> ${erp.erpW.toFixed(1)} W (${erpDbw.toFixed(2)} dBW)</div>`);

    el.innerHTML = lines.join("");
}

// ------------------------------------------------------
// FEEDLINE SUMMARY RENDERING
// ------------------------------------------------------

function renderFeedlineSummary(mhz, coaxType, coaxLengthFt, coaxVf, ladderType, ladderVf, ladderLengthFt) {
    const el = document.getElementById("feedline_summary");
    if (!el) return;

    let lossDb = 0;
    if (coaxType !== "custom") {
        lossDb = computeCoaxLossDb(mhz, coaxLengthFt, coaxType);
    }

    const electricalDeg = computeElectricalLengthDegrees(mhz, coaxLengthFt, coaxVf);

    const lines = [];
    lines.push(`<div><strong>Coax Type:</strong> ${coaxType}</div>`);
    lines.push(`<div><strong>Coax Length:</strong> ${coaxLengthFt.toFixed(1)} ft</div>`);
    lines.push(`<div><strong>Coax VF:</strong> ${coaxVf.toFixed(2)}</div>`);
    lines.push(`<div><strong>Coax Loss:</strong> ${lossDb.toFixed(2)} dB</div>`);
    lines.push(`<div><strong>Electrical Length:</strong> ${electricalDeg.toFixed(1)}°</div>`);

    if (ladderType !== "none") {
        const ladderElecDeg = computeElectricalLengthDegrees(mhz, ladderLengthFt, ladderVf);
        lines.push(`<div style="margin-top:4px;"><strong>Ladder Line:</strong> ${ladderLengthFt.toFixed(1)} ft @ VF ${ladderVf.toFixed(2)}</div>`);
        lines.push(`<div><strong>Ladder Electrical Length:</strong> ${ladderElecDeg.toFixed(1)}°</div>`);
    }

    el.innerHTML = lines.join("");
}

// ------------------------------------------------------
// PROFILE SAVE / LOAD
// ------------------------------------------------------

function buildProfileFromUI() {
    return {
        band_mhz: getFrequencyMHz(),
        antenna_type: document.getElementById("antenna_type").value,
        radiator_vf: parseFloat(document.getElementById("radiator_vf").value || "0.95"),
        height_ft: parseFloat(document.getElementById("height_ft").value || "35"),

        ladder_type: document.getElementById("ladder_type").value,
        ladder_vf: parseFloat(document.getElementById("ladder_vf").value || "0.92"),
        ladder_length_ft: parseFloat(document.getElementById("ladder_length_ft").value || "50"),

        coax_type: document.getElementById("coax_type").value,
        coax_vf: parseFloat(document.getElementById("coax_vf").value || "0.85"),
        coax_length_ft: getCoaxLengthFt(),

        tx_power_w: parseFloat(document.getElementById("tx_power_w").value || "100"),

        radial_count: parseInt(document.getElementById("radial_count").value || "0", 10),
        elevated_radials: parseInt(document.getElementById("elevated_radials").value || "0", 10),
        seaside_mode: document.getElementById("seaside_mode").checked,
        time_of_day: document.getElementById("time_of_day").value,

        reflectors: parseInt(document.getElementById("reflector_count").value || "0", 10),
        directors: parseInt(document.getElementById("director_count").value || "0", 10)
    };
}

function applyProfileToUI(profile) {
    if (!profile) return;

    const bandSelect = document.getElementById("band_select");
    const customFreqInput = document.getElementById("custom_freq_mhz");

    // Try to match profile frequency to a known band
    let bandKey = Object.keys(BANDS).find(
        k => Math.abs(BANDS[k].mhz - profile.band_mhz) < 0.0001
    );

    if (bandKey) {
        bandSelect.value = bandKey;
        customFreqInput.value = "";
    } else {
        bandSelect.value = "custom";
        customFreqInput.value = profile.band_mhz.toFixed(4);
    }

    document.getElementById("antenna_type").value = profile.antenna_type;
    document.getElementById("radiator_vf").value = profile.radiator_vf.toFixed(2);
    document.getElementById("height_ft").value = profile.height_ft;

    document.getElementById("ladder_type").value = profile.ladder_type;
    document.getElementById("ladder_vf").value = profile.ladder_vf.toFixed(2);
    document.getElementById("ladder_length_ft").value = profile.ladder_length_ft;

    document.getElementById("coax_type").value = profile.coax_type;
    document.getElementById("coax_vf").value = profile.coax_vf.toFixed(2);

    const coaxLen = profile.coax_length_ft;
    const coaxLenSel = document.getElementById("coax_length_ft");
    const options = Array.from(coaxLenSel.options).map(o => parseFloat(o.value));

    if (options.includes(coaxLen)) {
        coaxLenSel.value = String(coaxLen);
        document.getElementById("coax_length_custom_ft").style.display = "none";
    } else {
        coaxLenSel.value = "custom";
        document.getElementById("coax_length_custom_ft").style.display = "block";
        document.getElementById("coax_length_custom_ft").value = coaxLen;
    }

    document.getElementById("tx_power_w").value = profile.tx_power_w;
    document.getElementById("radial_count").value = profile.radial_count;
    document.getElementById("elevated_radials").value = profile.elevated_radials;
    document.getElementById("seaside_mode").checked = profile.seaside_mode;
    document.getElementById("time_of_day").value = profile.time_of_day;
    document.getElementById("reflector_count").value = profile.reflectors;
    document.getElementById("director_count").value = profile.directors;
}

function saveProfile() {
    const profile = buildProfileFromUI();
    const json = JSON.stringify(profile, null, 2);
    document.getElementById("profile_json").value = json;

    try {
        localStorage.setItem("kg5ief_hf_profile", json);
    } catch (e) {}
}

function loadProfile() {
    const textarea = document.getElementById("profile_json");
    let json = textarea.value.trim();

    if (!json) {
        try {
            json = localStorage.getItem("kg5ief_hf_profile") || "";
        } catch (e) {
            json = "";
        }
    }

    if (!json) return;

    try {
        const profile = JSON.parse(json);
        applyProfileToUI(profile);
        calculateAndRender();
    } catch (e) {
        alert("Invalid profile JSON.");
    }
}

// ------------------------------------------------------
// MAIN CALCULATION PIPELINE
// ------------------------------------------------------

function calculateAndRender() {
    const mhz = getFrequencyMHz();
    const antennaType = document.getElementById("antenna_type").value;
    const radiatorVf = parseFloat(document.getElementById("radiator_vf").value || "0.95");
    const heightFt = parseFloat(document.getElementById("height_ft").value || "35");

    const ladderType = document.getElementById("ladder_type").value;
    const ladderVf = parseFloat(document.getElementById("ladder_vf").value || "0.92");
    const ladderLengthFt = parseFloat(document.getElementById("ladder_length_ft").value || "50");

    const coaxType = document.getElementById("coax_type").value;
    const coaxVf = parseFloat(document.getElementById("coax_vf").value || "0.85");
    const coaxLengthFt = getCoaxLengthFt();

    const txPowerW = parseFloat(document.getElementById("tx_power_w").value || "100");
    const radials = parseInt(document.getElementById("radial_count").value || "0", 10);
    const elevatedRadials = parseInt(document.getElementById("elevated_radials").value || "0", 10);
    const seaside = document.getElementById("seaside_mode").checked;
    const timeOfDay = document.getElementById("time_of_day").value;
    const reflectors = parseInt(document.getElementById("reflector_count").value || "0", 10);
    const directors = parseInt(document.getElementById("director_count").value || "0", 10);

    const envOptions = { seaside, radials, elevatedRadials, timeOfDay };
    const arrayOptions = { reflectors, directors };

    // ERP + feedline
    const erp = computeERP(mhz, antennaType, txPowerW, coaxType, coaxLengthFt, coaxVf, envOptions, arrayOptions);
    renderErpSummary(erp, mhz, antennaType);
    renderFeedlineSummary(mhz, coaxType, coaxLengthFt, coaxVf, ladderType, ladderVf, ladderLengthFt);

    // Geometry
    const geom = geometryForAntenna(mhz, antennaType, radiatorVf);
    renderGeometrySummary(geom);

    // Patterns
    const az = computeAzimuthPattern(antennaType, reflectors, directors);
    const el = computeElevationPattern(antennaType, seaside, timeOfDay, heightFt, mhz);
    const donut = computeDonutProjectionPattern(antennaType);

    drawPolarPattern("azimuth_plot", az, "Azimuth", COLOR_AZIMUTH);
    drawPolarPattern("elevation_plot", el, "Elevation", COLOR_ELEVATION);
    drawDonutProjection("donut_plot", donut, "3D Donut Projection");
}

// ------------------------------------------------------
// INIT + EVENT WIRING
// ------------------------------------------------------

function initApp() {
    document.getElementById("coax_type").addEventListener("change", () => {
        updateCoaxVF();
        calculateAndRender();
    });

    document.getElementById("ladder_type").addEventListener("change", () => {
        updateLadderVF();
        calculateAndRender();
    });

    document.getElementById("coax_length_ft").addEventListener("change", () => {
        handleCoaxLengthSelectChange();
        calculateAndRender();
    });

    document.getElementById("calculate_btn").addEventListener("click", (e) => {
        e.preventDefault();
        calculateAndRender();
    });

    document.getElementById("save_profile_btn").addEventListener("click", (e) => {
        e.preventDefault();
        saveProfile();
    });

    document.getElementById("load_profile_btn").addEventListener("click", (e) => {
        e.preventDefault();
        loadProfile();
    });

    document.getElementById("band_select").addEventListener("change", () => {
        const bandVal = document.getElementById("band_select").value;
        if (bandVal !== "custom") {
            document.getElementById("custom_freq_mhz").value = "";
        }
        calculateAndRender();
    });

    document.getElementById("custom_freq_mhz").addEventListener("input", () => {
        const val = document.getElementById("custom_freq_mhz").value;
        if (val && !isNaN(parseFloat(val))) {
            document.getElementById("band_select").value = "custom";
        }
        calculateAndRender();
    });

    // Initial setup
    updateCoaxVF();
    updateLadderVF();
    handleCoaxLengthSelectChange();
    calculateAndRender();
}

// Bootstrap
document.addEventListener("DOMContentLoaded", initApp);
