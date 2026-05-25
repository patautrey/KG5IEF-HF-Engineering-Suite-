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
