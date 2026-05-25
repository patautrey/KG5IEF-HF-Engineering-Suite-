// KG5IEF HF ENGINEERING SUITE - UNIFIED APP.JS
// Medium comments, 4-space indentation, high-contrast engineering colors

// ------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------

const C_M_PER_S = 299792458;
const FT_PER_M = 3.28084;

// High-contrast engineering colors
const COLOR_BG = "#020617";
const COLOR_GRID = "#2d3748";        // medium gray grid
const COLOR_AZIMUTH = "#ffd400";     // yellow
const COLOR_ELEVATION = "#ff3b30";   // red
const COLOR_DONUT = "#00a2ff";       // electric blue
const COLOR_LABEL = "#e5e7eb";       // soft white

// Band definitions (center frequencies)
const BANDS = {
    "3.5": { name: "80 m", mhz: 3.5 },
    "5.3305": { name: "60 m", mhz: 5.3305 },
    "7.0": { name: "40 m", mhz: 7.0 },
    "10.1": { name: "30 m", mhz: 10.1 },
    "14.0": { name: "20 m", mhz: 14.0 },
    "18.1": { name: "17 m", mhz: 18.1 },
    "21.0": { name: "15 m", mhz: 21.0 },
    "24.9": { name: "12 m", mhz: 24.9 },
    "28.0": { name: "10 m", mhz: 28.0 },
    "50.0": { name: "6 m", mhz: 50.0 }
};

// Coax types with approximate loss figures
const COAX_TYPES = {
    lmr400: {
        name: "LMR-400",
        vf: 0.85,
        loss_30mhz_db_per_100ft: 1.0,
        loss_50mhz_db_per_100ft: 1.5
    },
    rg213: {
        name: "RG-213",
        vf: 0.66,
        loss_30mhz_db_per_100ft: 1.3,
        loss_50mhz_db_per_100ft: 2.0
    },
    rg8x: {
        name: "RG-8X",
        vf: 0.78,
        loss_30mhz_db_per_100ft: 2.0,
        loss_50mhz_db_per_100ft: 3.0
    },
    rg58: {
        name: "RG-58",
        vf: 0.66,
        loss_30mhz_db_per_100ft: 2.7,
        loss_50mhz_db_per_100ft: 4.5
    }
};

// Ladder line types with typical VF
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
// FREQUENCY & INPUT HANDLING
// ------------------------------------------------------

// Get the working frequency in MHz, honoring Custom mode
function getFrequencyMHz() {
    const bandVal = document.getElementById("band_select").value;
    const custom = parseFloat(document.getElementById("custom_freq_mhz").value);

    // Explicit Custom mode: band dropdown set to "custom"
    if (bandVal === "custom") {
        if (!isNaN(custom) && custom > 0) return custom;
        // Fallback if custom is empty or invalid
        return 14.0;
    }

    // If user typed a custom frequency while a standard band is selected,
    // auto-switch to Custom mode and use that frequency.
    if (!isNaN(custom) && custom > 0) {
        document.getElementById("band_select").value = "custom";
        return custom;
    }

    // Otherwise, use the band center frequency
    return BANDS[bandVal] ? BANDS[bandVal].mhz : 14.0;
}

// Get coax length in feet, handling the "custom" option
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
    const vfInput = document.getElementById("coax_vf");
    if (type === "custom") return;
    const cfg = COAX_TYPES[type];
    if (cfg) vfInput.value = cfg.vf.toFixed(2);
}

// Update ladder line VF when a known ladder type is selected
function updateLadderVF() {
    const type = document.getElementById("ladder_type").value;
    const vfInput = document.getElementById("ladder_vf");
    if (type === "custom" || type === "none") return;
    const cfg = LADDER_TYPES[type];
    if (cfg) vfInput.value = cfg.vf.toFixed(2);
}

// Show/hide custom coax length input
function handleCoaxLengthSelectChange() {
    const sel = document.getElementById("coax_length_ft").value;
    const customInput = document.getElementById("coax_length_custom_ft");
    customInput.style.display = sel === "custom" ? "block" : "none";
}

// ------------------------------------------------------
// COAX LOSS & ELECTRICAL LENGTH
// ------------------------------------------------------

// Interpolate coax loss per 100 ft between 30 and 50 MHz
function interpolateCoaxLossPer100ft(typeKey, mhz) {
    const cfg = COAX_TYPES[typeKey];
    if (!cfg) return 0;
    const f1 = 30;
    const f2 = 50;
    const l1 = cfg.loss_30mhz_db_per_100ft;
    const l2 = cfg.loss_50mhz_db_per_100ft;

    if (mhz <= f1) return l1 * (mhz / f1);
    if (mhz >= f2) return l2 * (mhz / f2);

    const t = (mhz - f1) / (f2 - f1);
    return l1 + t * (l2 - l1);
}

// Compute total coax loss in dB for a given length and frequency
function computeCoaxLossDb(mhz, lengthFt, typeKey) {
    const per100 = interpolateCoaxLossPer100ft(typeKey, mhz);
    return per100 * (lengthFt / 100);
}

// Compute electrical length in degrees for a given physical length and VF
function computeElectricalLengthDegrees(mhz, lengthFt, vf) {
    const lambda_m = wavelengthMeters(mhz);
    const lambda_ft = metersToFeet(lambda_m);
    const electricalFt = lengthFt * vf;
    const wavelengths = electricalFt / lambda_ft;
    return wavelengths * 360;
}

// ------------------------------------------------------
// RADIATOR GEOMETRY & CUT LENGTHS
// ------------------------------------------------------

// Generic resonant length calculator (fraction of wavelength, VF-aware)
function computeResonantLengthFeet(mhz, vf, fraction) {
    const lambda_m = wavelengthMeters(mhz);
    const lambda_ft = metersToFeet(lambda_m);
    return lambda_ft * fraction * vf;
}

// Compute geometry for each antenna type
function geometryForAntenna(mhz, antennaType, radiatorVf) {
    const g = { lines: [], notes: [] };

    function addLine(label, valueFt) {
        g.lines.push({ label, valueFt });
    }

    switch (antennaType) {
        case "quarter_vertical": {
            const l = computeResonantLengthFeet(mhz, radiatorVf, 0.25);
            addLine("Vertical radiator", l);
            g.notes.push("1/4-wave vertical over ground.");
            break;
        }
        case "half_dipole": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            addLine("Total dipole length", total);
            addLine("Each leg", total / 2);
            g.notes.push("1/2-wave center-fed dipole.");
            break;
        }
        case "fan_dipole": {
            const bands = [3.5, 7.0, 14.0, 21.0];
            bands.forEach(b => {
                const total = computeResonantLengthFeet(b, radiatorVf, 0.5);
                addLine(`Fan leg pair for ${b.toFixed(1)} MHz (total)`, total);
            });
            g.notes.push("Multi-band fan dipole legs.");
            break;
        }
        case "doublet": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            addLine("Total doublet length", total);
            addLine("Each leg", total / 2);
            g.notes.push("Non-resonant doublet, tuned via ladder line + tuner.");
            break;
        }
        case "efhw": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            addLine("EFHW wire length", total);
            g.notes.push("End-fed half-wave with matching transformer.");
            break;
        }
        case "loop": {
            const circ = computeResonantLengthFeet(mhz, radiatorVf, 1.0);
            addLine("Loop circumference", circ);
            addLine("Approx side length (square)", circ / 4);
            g.notes.push("Full-wave loop, horizontal or vertical.");
            break;
        }
        case "moxon": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            addLine("Boom length (approx)", total * 0.6);
            addLine("Element tip-to-tip width", total);
            g.notes.push("Moxon rectangle dimensions approximate.");
            break;
        }
        case "yagi_2":
        case "yagi_3":
        case "yagi_4": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            const driven = total;
            const refl = driven * 1.05;
            const dir = driven * 0.95;
            addLine("Reflector length", refl);
            addLine("Driven element length", driven);
            addLine("Director length", dir);
            addLine("Element spacing (ft)", metersToFeet(wavelengthMeters(mhz) * 0.15));
            g.notes.push("Yagi element lengths and spacing approximate.");
            break;
        }
        case "half_square": {
            const quarter = computeResonantLengthFeet(mhz, radiatorVf, 0.25);
            const half = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            addLine("Vertical leg length (each)", quarter);
            addLine("Top horizontal wire", half);
            g.notes.push("Half-square: two 1/4-wave verticals with 1/2-wave top.");
            break;
        }
        case "bobtail": {
            const quarter = computeResonantLengthFeet(mhz, radiatorVf, 0.25);
            const threeQuarter = computeResonantLengthFeet(mhz, radiatorVf, 0.75);
            addLine("Vertical leg length (each of 3)", quarter);
            addLine("Top horizontal wire", threeQuarter);
            g.notes.push("Bobtail curtain: three 1/4-wave verticals with 3/4-wave top.");
            break;
        }
        case "edz": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 1.25);
            addLine("Total EDZ length (~1.25λ)", total);
            addLine("Each leg", total / 2);
            g.notes.push("Extended Double Zepp: ~1.25λ total length.");
            break;
        }
        case "rybakov": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            addLine("Rybakov radiator length (starting point)", total);
            g.notes.push("Rybakov 9:1: non-resonant vertical, length adjustable.");
            break;
        }
        case "jpole_duct": {
            const threeQuarter = computeResonantLengthFeet(mhz, radiatorVf, 0.75);
            const quarter = computeResonantLengthFeet(mhz, radiatorVf, 0.25);
            addLine("Radiator length (3/4λ)", threeQuarter);
            addLine("Matching stub length (1/4λ)", quarter);
            addLine("Spacing between radiator and stub (approx in)", 1.0);
            g.notes.push("Duct-tape roll-up J-pole: copper tape on duct tape.");
            break;
        }
        case "ocf_dipole": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            addLine("Total OCF dipole length", total);
            addLine("Long leg (~66%)", total * 0.66);
            addLine("Short leg (~34%)", total * 0.34);
            g.notes.push("OCF dipole: off-center feed for multi-band use.");
            break;
        }
        default: {
            g.notes.push("Unknown antenna type.");
            break;
        }
    }

    return g;
}

// ------------------------------------------------------
// ENVIRONMENT & PROPAGATION GAINS
// ------------------------------------------------------

// Compute environment-related gain (radials, seaside, time of day)
function computeEnvironmentGainDb(options) {
    const { seaside, radials, elevatedRadials, timeOfDay } = options;
    let envDb = 0;

    if (seaside) envDb += 3.0;

    if (radials > 0) {
        envDb += clamp(radials * 0.1, 0, 3);
    }

    if (elevatedRadials > 0) {
        envDb += clamp(elevatedRadials * 0.2, 0, 3);
    }

    if (timeOfDay === "night") envDb += 0.5;
    if (timeOfDay === "grayline") envDb += 1.0;

    return envDb;
}

// Base antenna gain (approximate, in dB)
function computeAntennaBaseGainDb(antennaType) {
    switch (antennaType) {
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

// Band adjustment: penalty for operating far from "design" band
function computeBandGainAdjustmentDb(mhz, antennaType) {
    const ref = 14.0;
    const delta = Math.abs(mhz - ref) / ref;
    let penalty = clamp(delta * 2.0, 0, 3);

    // Some antennas are more broadband-friendly
    if (antennaType === "doublet" || antennaType === "ocf_dipole" || antennaType === "efhw") {
        penalty *= 0.5;
    }

    return -penalty;
}

// ------------------------------------------------------
// ERP ENGINE
// ------------------------------------------------------

// Compute ERP and all contributing gain/loss terms
function computeERP(mhz, antennaType, txPowerW, coaxType, coaxLengthFt, coaxVf, envOptions, arrayOptions) {
    const baseGainDb = computeAntennaBaseGainDb(antennaType);
    const bandAdjDb = computeBandGainAdjustmentDb(mhz, antennaType);
    const envDb = computeEnvironmentGainDb(envOptions);

    let arrayDb = 0;
    if (arrayOptions.reflectors > 0) arrayDb += clamp(arrayOptions.reflectors * 0.8, 0, 4);
    if (arrayOptions.directors > 0) arrayDb += clamp(arrayOptions.directors * 0.6, 0, 4);

    let coaxLossDb = 0;
    if (coaxType !== "custom") {
        coaxLossDb = computeCoaxLossDb(mhz, coaxLengthFt, coaxType);
    }

    const totalGainDb = baseGainDb + bandAdjDb + envDb + arrayDb - coaxLossDb;
    const erpW = txPowerW * dbToRatio(totalGainDb);

    return {
        baseGainDb,
        bandAdjDb,
        envDb,
        arrayDb,
        coaxLossDb,
        totalGainDb,
        erpW
    };
}

// ------------------------------------------------------
// PATTERN ENGINES
// ------------------------------------------------------

// Azimuth pattern (0–360°, step 2°)
function computeAzimuthPattern(antennaType, reflectors, directors) {
    const pattern = [];
    for (let deg = 0; deg <= 360; deg += 2) {
        const rad = deg * Math.PI / 180;
        let gain = 1;

        // Directional antennas: Yagis, Moxon, Bobtail, Half-square
        if (antennaType.startsWith("yagi") ||
            antennaType === "moxon" ||
            antennaType === "bobtail" ||
            antennaType === "half_square") {

            const fwd = Math.cos(rad);
            const fwd2 = Math.cos(2 * rad);
            gain += 2.5 * fwd;
            gain += 1.2 * fwd2;
            gain += directors * 0.4;
            gain += reflectors * 0.6;

            if (antennaType === "bobtail") gain += 1.0 * fwd2;
            if (antennaType === "half_square") gain += 0.5 * fwd;
        }

        // Verticals: mild azimuth shaping
        if (antennaType === "quarter_vertical" ||
            antennaType === "rybakov" ||
            antennaType === "jpole_duct") {
            gain += 0.3 * Math.cos(rad);
        }

        // Loop: more "figure-8" style
        if (antennaType === "loop") {
            gain = Math.abs(Math.cos(rad));
        }

        if (gain < 0) gain = 0;
        pattern.push(gain);
    }
    return pattern;
}

// Elevation pattern (0–90°, step 2°)
function computeElevationPattern(antennaType, seaside, timeOfDay, heightFt, mhz) {
    const pattern = [];
    const lambda_m = wavelengthMeters(mhz);
    const lambda_ft = metersToFeet(lambda_m);
    const electricalHeight = heightFt / lambda_ft;

    for (let deg = 0; deg <= 90; deg += 2) {
        const rad = deg * Math.PI / 180;
        let gain = Math.cos(rad);

        // Verticals: low-angle emphasis
        if (antennaType === "quarter_vertical" ||
            antennaType === "rybakov" ||
            antennaType === "jpole_duct") {
            gain = Math.pow(Math.cos(rad), 1.5);
        }

        // Horizontal wires: height-dependent lobes
        if (antennaType === "half_dipole" ||
            antennaType === "doublet" ||
            antennaType === "fan_dipole" ||
            antennaType === "ocf_dipole" ||
            antennaType === "edz") {
            const n = clamp(1 + (electricalHeight - 0.25) * 2, 0.5, 3);
            gain = Math.pow(Math.sin(rad), n);
        }

        // Half-square / Bobtail: strong low-angle
        if (antennaType === "half_square" || antennaType === "bobtail") {
            gain = Math.pow(Math.cos(rad), 1.8);
        }

        // Seaside: slight low-angle enhancement
        if (seaside) {
            gain += 0.4 * Math.cos(rad);
        }

        // Time-of-day shaping
        if (timeOfDay === "night") {
            gain += 0.2 * Math.sin(rad);
        } else if (timeOfDay === "grayline") {
            gain += 0.3 * Math.sin(rad) + 0.3 * Math.cos(rad);
        }

        if (gain < 0) gain = 0;
        pattern.push(gain);
    }
    return pattern;
}

// 3D donut projection (simple 2D projection of torus-like pattern)
function computeDonutProjectionPattern(antennaType) {
    const pattern = [];
    for (let i = 0; i < 180; i++) {
        const theta = i * Math.PI / 180;
        let r = Math.abs(Math.sin(theta));

        if (antennaType === "quarter_vertical" ||
            antennaType === "rybakov" ||
            antennaType === "jpole_duct") {
            r = Math.abs(Math.cos(theta));
        }

        if (antennaType === "loop") {
            r = Math.abs(Math.sin(theta)) * Math.abs(Math.cos(theta));
        }

        pattern.push(r);
    }
    return pattern;
}

// ------------------------------------------------------
// DRAWING FUNCTIONS
// ------------------------------------------------------

// Generic polar plot renderer (0–360°) for azimuth/elevation
function drawPolarPattern(canvasId, pattern, label, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    // Reset transform and clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    // Move origin to center
    ctx.translate(w / 2, h / 2);
    const radius = Math.min(w, h) / 2 - 16;

    // Concentric circles (range rings)
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

// Donut projection renderer
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

// ------------------------------------------------------
// SUMMARY RENDERING
// ------------------------------------------------------

// Render antenna geometry and cut lengths
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

// Render ERP summary block
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

// Render feedline summary (coax + ladder line info)
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

    // Ladder line info if present
    if (ladderType !== "none") {
        const ladderElecDeg = computeElectricalLengthDegrees(mhz, ladderLengthFt, ladderVf);
        lines.push(`<div style="margin-top:4px;"><strong>Ladder Line
