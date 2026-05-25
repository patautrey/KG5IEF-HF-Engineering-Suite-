// ======================================================
// KG5IEF HF ENGINEERING SUITE - APP.JS (CHUNK 1 OF N)
// Constants, Utilities, Frequency Logic
// ======================================================

// Speed of light and unit conversions
const C_M_PER_S = 299792458;
const FT_PER_M = 3.28084;

// High-contrast engineering colors
const COLOR_BG = "#020617";
const COLOR_GRID = "#2d3748";        // medium gray
const COLOR_AZIMUTH = "#ffd400";     // yellow
const COLOR_ELEVATION = "#ff3b30";   // red
const COLOR_DONUT = "#00a2ff";       // electric blue
const COLOR_LABEL = "#e5e7eb";       // soft white

// HF band definitions
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

// ----------------------
// Utility functions
// ----------------------

function mhzToHz(mhz) { return mhz * 1e6; }
function metersToFeet(m) { return m * FT_PER_M; }
function feetToMeters(ft) { return ft / FT_PER_M; }
function dbToRatio(db) { return Math.pow(10, db / 10); }
function ratioToDb(r) { return 10 * Math.log10(r); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function wavelengthMeters(mhz) {
    return C_M_PER_S / mhzToHz(mhz);
}

// ----------------------
// Frequency selection logic
// ----------------------

function getFrequencyMHz() {
    const bandVal = document.getElementById("band_select").value;
    const custom = parseFloat(document.getElementById("custom_freq_mhz").value);

    // If user explicitly selected Custom
    if (bandVal === "custom") {
        if (!isNaN(custom) && custom > 0) return custom;
        return 14.0; // fallback
    }

    // If user typed a custom frequency while a band is selected
    if (!isNaN(custom) && custom > 0) {
        document.getElementById("band_select").value = "custom";
        return custom;
    }

    // Otherwise use band center
    return BANDS[bandVal] ? BANDS[bandVal].mhz : 14.0;
}
// ======================================================
// KG5IEF HF ENGINEERING SUITE - APP.JS (CHUNK 2 OF N)
// Coax Engine, Ladder Engine, Geometry Engine
// ======================================================

// ----------------------
// Coax loss interpolation
// ----------------------

function interpolateCoaxLossPer100ft(typeKey, mhz) {
    const cfg = COAX_TYPES[typeKey];
    if (!cfg) return 0;

    const f1 = 30, f2 = 50;
    const l1 = cfg.loss_30mhz_db_per_100ft;
    const l2 = cfg.loss_50mhz_db_per_100ft;

    if (mhz <= f1) return l1 * (mhz / f1);
    if (mhz >= f2) return l2 * (mhz / f2);

    const t = (mhz - f1) / (f2 - f1);
    return l1 + t * (l2 - l1);
}

function computeCoaxLossDb(mhz, lengthFt, typeKey) {
    const per100 = interpolateCoaxLossPer100ft(typeKey, mhz);
    return per100 * (lengthFt / 100);
}

function computeElectricalLengthDegrees(mhz, lengthFt, vf) {
    const lambda_ft = metersToFeet(wavelengthMeters(mhz));
    const electricalFt = lengthFt * vf;
    return (electricalFt / lambda_ft) * 360;
}

// ----------------------
// UI helpers for coax/ladder
// ----------------------

function getCoaxLengthFt() {
    const sel = document.getElementById("coax_length_ft").value;
    if (sel === "custom") {
        const c = parseFloat(document.getElementById("coax_length_custom_ft").value || "0");
        return c > 0 ? c : 75;
    }
    return parseFloat(sel);
}

function updateCoaxVF() {
    const type = document.getElementById("coax_type").value;
    if (type === "custom") return;
    const cfg = COAX_TYPES[type];
    if (cfg) document.getElementById("coax_vf").value = cfg.vf.toFixed(2);
}

function updateLadderVF() {
    const type = document.getElementById("ladder_type").value;
    if (type === "custom" || type === "none") return;
    const cfg = LADDER_TYPES[type];
    if (cfg) document.getElementById("ladder_vf").value = cfg.vf.toFixed(2);
}

function handleCoaxLengthSelectChange() {
    const sel = document.getElementById("coax_length_ft").value;
    document.getElementById("coax_length_custom_ft").style.display =
        sel === "custom" ? "block" : "none";
}

// ----------------------
// Geometry engine
// ----------------------

function computeResonantLengthFeet(mhz, vf, fraction) {
    return metersToFeet(wavelengthMeters(mhz)) * fraction * vf;
}

function geometryForAntenna(mhz, antennaType, radiatorVf) {
    const g = { lines: [], notes: [] };
    const add = (label, ft) => g.lines.push({ label, valueFt: ft });

    switch (antennaType) {
        case "quarter_vertical":
            add("Vertical radiator", computeResonantLengthFeet(mhz, radiatorVf, 0.25));
            g.notes.push("1/4-wave vertical over ground.");
            break;

        case "half_dipole": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            add("Total dipole length", total);
            add("Each leg", total / 2);
            g.notes.push("1/2-wave center-fed dipole.");
            break;
        }

        case "fan_dipole": {
            [3.5, 7.0, 14.0, 21.0].forEach(b => {
                const total = computeResonantLengthFeet(b, radiatorVf, 0.5);
                add(`Fan leg pair for ${b} MHz`, total);
            });
            g.notes.push("Multi-band fan dipole.");
            break;
        }

        case "doublet": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            add("Total doublet length", total);
            add("Each leg", total / 2);
            g.notes.push("Non-resonant doublet.");
            break;
        }

        case "efhw":
            add("EFHW wire length", computeResonantLengthFeet(mhz, radiatorVf, 0.5));
            g.notes.push("End-fed half-wave.");
            break;

        case "loop": {
            const circ = computeResonantLengthFeet(mhz, radiatorVf, 1.0);
            add("Loop circumference", circ);
            add("Approx side length", circ / 4);
            g.notes.push("Full-wave loop.");
            break;
        }

        case "moxon": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 0.5);
            add("Boom length (approx)", total * 0.6);
            add("Element tip-to-tip width", total);
            g.notes.push("Moxon rectangle.");
            break;
        }

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

        case "half_square":
            add("Vertical legs (each)", computeResonantLengthFeet(mhz, radiatorVf, 0.25));
            add("Top horizontal", computeResonantLengthFeet(mhz, radiatorVf, 0.5));
            g.notes.push("Half-square antenna.");
            break;

        case "bobtail":
            add("Vertical legs (each)", computeResonantLengthFeet(mhz, radiatorVf, 0.25));
            add("Top horizontal", computeResonantLengthFeet(mhz, radiatorVf, 0.75));
            g.notes.push("Bobtail curtain.");
            break;

        case "edz": {
            const total = computeResonantLengthFeet(mhz, radiatorVf, 1.25);
            add("Total EDZ length", total);
            add("Each leg", total / 2);
            g.notes.push("Extended Double Zepp.");
            break;
        }

        case "rybakov":
            add("Rybakov radiator", computeResonantLengthFeet(mhz, radiatorVf, 0.5));
            g.notes.push("Rybakov 9:1.");
            break;

        case "jpole_duct":
            add("Radiator (3/4λ)", computeResonantLengthFeet(mhz, radiatorVf, 0.75));
            add("Matching stub (1/4λ)", computeResonantLengthFeet(mhz, radiatorVf, 0.25));
            add("Spacing (inches)", 1.0);
            g.notes.push("Duct-tape roll-up J-pole.");
            break;

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
// ======================================================
// KG5IEF HF ENGINEERING SUITE - APP.JS (CHUNK 3 OF N)
// ERP Engine, Pattern Engines, Drawing Engines
// ======================================================

// ----------------------
// Environment gain
// ----------------------

function computeEnvironmentGainDb(opts) {
    let envDb = 0;

    if (opts.seaside) envDb += 3.0;
    if (opts.radials > 0) envDb += clamp(opts.radials * 0.1, 0, 3);
    if (opts.elevatedRadials > 0) envDb += clamp(opts.elevatedRadials * 0.2, 0, 3);

    if (opts.timeOfDay === "night") envDb += 0.5;
    if (opts.timeOfDay === "grayline") envDb += 1.0;

    return envDb;
}

// ----------------------
// Base antenna gain
// ----------------------

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

// ----------------------
// Band adjustment
// ----------------------

function computeBandGainAdjustmentDb(mhz, type) {
    const ref = 14.0;
    const delta = Math.abs(mhz - ref) / ref;
    let penalty = clamp(delta * 2.0, 0, 3);

    if (["doublet", "ocf_dipole", "efhw"].includes(type)) {
        penalty *= 0.5;
    }

    return -penalty;
}

// ----------------------
// ERP engine
// ----------------------

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

// ----------------------
// Azimuth pattern
// ----------------------

function computeAzimuthPattern(type, reflectors, directors) {
    const pattern = [];

    for (let deg = 0; deg <= 360; deg += 2) {
        const rad = deg * Math.PI / 180;
        let g = 1;

        if (type.startsWith("yagi") || type === "moxon" || type === "bobtail" || type === "half_square") {
            g += 2.5 * Math.cos(rad);
            g += 1.2 * Math.cos(2 * rad);
            g += directors * 0.4;
            g += reflectors * 0.6;
        }

        if (["quarter_vertical", "rybakov", "jpole_duct"].includes(type)) {
            g += 0.3 * Math.cos(rad);
        }

        if (type === "loop") {
            g = Math.abs(Math.cos(rad));
        }

        pattern.push(Math.max(g, 0));
    }

    return pattern;
}

// ----------------------
// Elevation pattern
// ----------------------

function computeElevationPattern(type, seaside, timeOfDay, heightFt, mhz) {
    const pattern = [];
    const lambda_ft = metersToFeet(wavelengthMeters(mhz));
    const h = heightFt / lambda_ft;

    for (let deg = 0; deg <= 90; deg += 2) {
        const rad = deg * Math.PI / 180;
        let g = Math.cos(rad);

        if (["quarter_vertical", "rybakov", "jpole_duct"].includes(type)) {
