(function () {
  "use strict";

  let deferredInstallPrompt = null;

  document.documentElement.classList.add("has-js");
  initNavigation();
  initPwa();

  if (!document.getElementById("solar-form")) {
    return;
  }

  // constants
  const STORAGE_KEY = "isolawatt.project.v2";
  const SHARE_PREFIX = "iw=";
  const DEFAULT_PRESET = "camper-frigo";
  const DEFAULTS = {
    mode: "simple",
    useCase: "camper",
    systemVoltage: 12,
    autonomyDays: 2,
    peakSunHours: 4,
    batteryType: "lifepo4",
    maxDepthOfDischarge: 0.8,
    depthOfDischargeManual: false,
    inverterLoadW: 800,
    safetyMargin: 1.25,
    inverterEfficiency: 0.9,
    pvLossFactor: 1.25
  };
  const DOD_DEFAULTS = {
    lifepo4: 0.8,
    agm: 0.5
  };
  const BATTERY_LABELS = {
    lifepo4: "LiFePO4",
    agm: "AGM"
  };
  const USE_CASE_LABELS = {
    camper: "Camper",
    barca: "Barca",
    baita: "Baita",
    "casa-isolata": "Casa isolata"
  };
  const PRESET_ALIASES = {
    "casa-isolata": "casa-essenziale"
  };

  function initNavigation() {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.getElementById("primaryNav");

    if (!header || !toggle || !nav) {
      return;
    }

    function closeNav() {
      header.classList.remove("is-nav-open");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
      const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";
      header.classList.toggle("is-nav-open", shouldOpen);
      toggle.setAttribute("aria-expanded", String(shouldOpen));
    });

    nav.addEventListener("click", event => {
      if (event.target.closest("a")) {
        closeNav();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        closeNav();
      }
    });
  }

  function initPwa() {
    registerServiceWorker();
    initInstallPrompt();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      setPwaStatus("Questo browser non supporta la modalità offline installabile.");
      return;
    }

    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    if (window.location.protocol !== "https:" && !isLocalhost) {
      setPwaStatus("Apri IsolaWatt da HTTPS o localhost per abilitarla come app offline.");
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js")
        .then(() => {
          setPwaStatus("Pronta per l'uso offline dopo il primo caricamento.");
        })
        .catch(() => {
          setPwaStatus("App usabile online; offline non disponibile in questo browser.");
        });
    });
  }

  function initInstallPrompt() {
    const installButton = document.getElementById("installApp");

    if (!installButton) {
      return;
    }

    if (isStandaloneApp()) {
      installButton.hidden = true;
      setPwaStatus("App installata. I progetti salvati restano su questo dispositivo.");
      return;
    }

    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installButton.hidden = false;
      setPwaStatus("Puoi installarla come app: il calcolatore resta a portata di mano.");
    });

    installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        setPwaStatus("Se il browser supporta l'installazione, usa il menu del browser per aggiungere IsolaWatt alla schermata Home.");
        return;
      }

      installButton.disabled = true;
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.disabled = false;
      installButton.hidden = true;

      setPwaStatus(choice.outcome === "accepted"
        ? "Installazione avviata. I dati restano nel tuo browser."
        : "Installazione annullata. Puoi continuare a usare IsolaWatt dal browser.");
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      installButton.hidden = true;
      setPwaStatus("App installata. Funziona anche offline dopo il primo caricamento.");
    });
  }

  function isStandaloneApp() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function setPwaStatus(message) {
    const status = document.getElementById("pwaStatus");
    if (status) {
      status.textContent = message;
    }
  }

  const PRESETS = {
    "camper-weekend": {
      label: "Camper weekend",
      useCase: "camper",
      systemVoltage: 12,
      autonomyDays: 2,
      peakSunHours: 4,
      batteryType: "lifepo4",
      inverterLoadW: 600,
      loads: [
        load("Luci LED", 1, 20, 4, "DC", true),
        load("Smartphone", 2, 15, 2, "DC", true),
        load("Pompa acqua", 1, 45, 0.3, "DC", true),
        load("Ventola", 1, 18, 6, "DC", false),
        load("Laptop", 1, 60, 1.5, "AC", false)
      ]
    },
    "camper-frigo": {
      label: "Camper con frigo",
      useCase: "camper",
      systemVoltage: 12,
      autonomyDays: 2,
      peakSunHours: 4,
      batteryType: "lifepo4",
      inverterLoadW: 800,
      loads: [
        load("Frigo 12V", 1, 45, 12, "DC", true),
        load("Luci LED", 1, 20, 4, "DC", true),
        load("Smartphone", 2, 15, 2, "DC", false),
        load("Pompa acqua", 1, 45, 0.3, "DC", true),
        load("Laptop", 1, 60, 2, "AC", false)
      ]
    },
    "barca-rada": {
      label: "Barca in rada",
      useCase: "barca",
      systemVoltage: 12,
      autonomyDays: 2,
      peakSunHours: 4.5,
      batteryType: "lifepo4",
      inverterLoadW: 700,
      loads: [
        load("Frigo pozzetto", 1, 50, 12, "DC", true),
        load("Luci cabina", 1, 18, 5, "DC", true),
        load("Strumenti bordo", 1, 25, 8, "DC", true),
        load("Pompa sentina", 1, 60, 0.2, "DC", true),
        load("Laptop navigazione", 1, 65, 1.5, "AC", false)
      ]
    },
    "baita-weekend": {
      label: "Baita weekend",
      useCase: "baita",
      systemVoltage: 24,
      autonomyDays: 2,
      peakSunHours: 3.5,
      batteryType: "lifepo4",
      inverterLoadW: 1000,
      loads: [
        load("Luci LED", 1, 40, 5, "DC", true),
        load("Router", 1, 12, 24, "DC", false),
        load("Frigo piccolo", 1, 70, 10, "AC", true),
        load("Laptop", 1, 60, 3, "AC", false),
        load("Piccoli elettrodomestici", 1, 300, 0.5, "AC", false)
      ]
    },
    "casa-essenziale": {
      label: "Casa isolata essenziale",
      useCase: "casa-isolata",
      systemVoltage: 48,
      autonomyDays: 3,
      peakSunHours: 3.5,
      batteryType: "lifepo4",
      inverterLoadW: 1800,
      loads: [
        load("Frigo efficiente", 1, 85, 10, "AC", true),
        load("Luci LED casa", 1, 60, 5, "DC", true),
        load("Router e rete", 1, 18, 24, "DC", true),
        load("Pompa acqua", 1, 350, 0.5, "AC", true),
        load("Laptop e piccoli carichi", 1, 120, 4, "AC", false)
      ]
    },
    "solo-ricarica": {
      label: "Solo ricarica dispositivi",
      useCase: "camper",
      systemVoltage: 12,
      autonomyDays: 1,
      peakSunHours: 4,
      batteryType: "lifepo4",
      inverterLoadW: 300,
      loads: [
        load("Smartphone", 2, 15, 2, "DC", true),
        load("Tablet", 1, 25, 2, "DC", false),
        load("Powerbank", 1, 30, 2, "DC", false),
        load("Laptop", 1, 60, 2, "AC", false)
      ]
    }
  };

  // state
  let state = createDefaultState();
  let latestReportText = "";
  let latestResults = null;

  // DOM refs
  const form = document.getElementById("solar-form");
  if (!form) {
    return;
  }

  const fields = {
    useCase: document.getElementById("useCase"),
    systemVoltage: document.getElementById("systemVoltage"),
    dailyWh: document.getElementById("dailyWh"),
    autonomyDays: document.getElementById("autonomyDays"),
    peakSunHours: document.getElementById("peakSunHours"),
    batteryType: document.getElementById("batteryType"),
    maxDepthOfDischarge: document.getElementById("maxDepthOfDischarge"),
    safetyMargin: document.getElementById("safetyMargin"),
    inverterEfficiency: document.getElementById("inverterEfficiency"),
    pvLossFactor: document.getElementById("pvLossFactor"),
    inverterLoadW: document.getElementById("inverterLoadW")
  };

  const dom = {
    loadsBody: document.getElementById("loadsBody"),
    loadTotal: document.getElementById("loadTotal"),
    largestLoad: document.getElementById("largestLoad"),
    criticalLoads: document.getElementById("criticalLoads"),
    presetButtons: document.getElementById("presetButtons"),
    simpleMode: document.getElementById("simpleMode"),
    advancedMode: document.getElementById("advancedMode"),
    dailyModeLabel: document.getElementById("dailyModeLabel"),
    useLoadTotal: document.getElementById("useLoadTotal"),
    addLoad: document.getElementById("addLoad"),
    resetLoads: document.getElementById("resetLoads"),
    formFeedback: document.getElementById("formFeedback"),
    resultSummary: document.getElementById("resultSummary"),
    configurationResult: document.getElementById("configurationResult"),
    confidenceResult: document.getElementById("confidenceResult"),
    realDailyWh: document.getElementById("realDailyWh"),
    adjustedDailyWh: document.getElementById("adjustedDailyWh"),
    batteryResult: document.getElementById("batteryResult"),
    batteryDetail: document.getElementById("batteryDetail"),
    pvResult: document.getElementById("pvResult"),
    inverterResult: document.getElementById("inverterResult"),
    controllerResult: document.getElementById("controllerResult"),
    controllerDetail: document.getElementById("controllerDetail"),
    lifepo4Comparison: document.getElementById("lifepo4Comparison"),
    agmComparison: document.getElementById("agmComparison"),
    comparisonDifference: document.getElementById("comparisonDifference"),
    comparisonNote: document.getElementById("comparisonNote"),
    batteryExplanation: document.getElementById("batteryExplanation"),
    pvExplanation: document.getElementById("pvExplanation"),
    printReport: document.getElementById("printReport"),
    toggleReportPreview: document.getElementById("toggleReportPreview"),
    copyReport: document.getElementById("copyReport"),
    printResults: document.getElementById("printResults"),
    appSummaryBar: document.getElementById("appSummaryBar"),
    appSummaryText: document.getElementById("appSummaryText"),
    saveProject: document.getElementById("saveProject"),
    loadProject: document.getElementById("loadProject"),
    clearProject: document.getElementById("clearProject"),
    copyProjectLink: document.getElementById("copyProjectLink"),
    reportMeta: document.getElementById("reportMeta"),
    reportScenario: document.getElementById("reportScenario"),
    reportLoads: document.getElementById("reportLoads"),
    reportParameters: document.getElementById("reportParameters"),
    reportResults: document.getElementById("reportResults"),
    reportComparison: document.getElementById("reportComparison")
  };

  // calculations
  function load(name, quantity, watt, hours, type, critical) {
    return {
      id: createId(),
      name,
      quantity,
      watt,
      hours,
      type,
      critical
    };
  }

  function createDefaultState() {
    const preset = PRESETS[DEFAULT_PRESET];
    return {
      ...DEFAULTS,
      preset: DEFAULT_PRESET,
      useCase: preset.useCase,
      systemVoltage: preset.systemVoltage,
      autonomyDays: preset.autonomyDays,
      peakSunHours: preset.peakSunHours,
      batteryType: preset.batteryType,
      maxDepthOfDischarge: DOD_DEFAULTS[preset.batteryType],
      inverterLoadW: preset.inverterLoadW,
      dailyWhManual: false,
      manualDailyWh: 0,
      loads: cloneLoads(preset.loads)
    };
  }

  function cloneLoads(loads) {
    return loads.map(item => ({
      ...item,
      id: createId()
    }));
  }

  function createId() {
    return `load-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
  }

  function positiveNumber(value, fallback) {
    const parsed = Number.parseFloat(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function parseNumber(value) {
    return Number.parseFloat(String(value).replace(",", "."));
  }

  function ceilTo(value, step) {
    return Math.ceil(value / step) * step;
  }

  function roundBatteryWh(value) {
    return ceilTo(value, value < 1000 ? 10 : 100);
  }

  function formatNumber(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatDecimal(value, digits) {
    return new Intl.NumberFormat("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(value);
  }

  function formatWh(value) {
    return `${formatNumber(value)} Wh`;
  }

  function formatWp(value) {
    return `${formatNumber(value)} Wp`;
  }

  function getPresetLabel() {
    return PRESETS[state.preset] ? PRESETS[state.preset].label : "Scenario personalizzato";
  }

  function getSettings() {
    return {
      useCase: state.useCase,
      systemVoltage: positiveNumber(state.systemVoltage, DEFAULTS.systemVoltage),
      autonomyDays: parseNumber(state.autonomyDays),
      peakSunHours: parseNumber(state.peakSunHours),
      batteryType: state.batteryType,
      maxDepthOfDischarge: parseNumber(state.maxDepthOfDischarge),
      safetyMargin: parseNumber(state.safetyMargin),
      inverterEfficiency: parseNumber(state.inverterEfficiency),
      pvLossFactor: parseNumber(state.pvLossFactor),
      inverterLoadW: parseNumber(state.inverterLoadW)
    };
  }

  function getLoadContribution(item, inverterEfficiency) {
    const quantity = Math.max(0, positiveNumber(item.quantity, 0));
    const watt = Math.max(0, positiveNumber(item.watt, 0));
    const hours = Math.max(0, positiveNumber(item.hours, 0));
    const safeEfficiency = Number.isFinite(inverterEfficiency) && inverterEfficiency > 0
      ? inverterEfficiency
      : DEFAULTS.inverterEfficiency;
    const rawWh = quantity * watt * hours;
    const contributionWh = item.type === "AC" ? rawWh / safeEfficiency : rawWh;
    return {
      rawWh,
      contributionWh
    };
  }

  function getLoadWarnings(item) {
    const warnings = [];
    const watt = parseNumber(item.watt);
    const hours = parseNumber(item.hours);

    if (!Number.isFinite(watt) || watt <= 0) {
      warnings.push("watt non valido");
    }
    if (Number.isFinite(hours) && hours > 24) {
      warnings.push("ore/giorno oltre 24");
    }
    if (!Number.isFinite(hours) || hours < 0) {
      warnings.push("ore/giorno non valide");
    }

    return warnings;
  }

  function getLoadSummary(settings) {
    let totalWh = 0;
    let dcWh = 0;
    let acWh = 0;
    let largest = null;
    let criticalCount = 0;

    const rows = state.loads.map(item => {
      const contribution = getLoadContribution(item, settings.inverterEfficiency);
      totalWh += contribution.contributionWh;
      if (item.type === "AC") {
        acWh += contribution.contributionWh;
      } else {
        dcWh += contribution.contributionWh;
      }
      if (item.critical) {
        criticalCount += 1;
      }
      const row = {
        ...item,
        rawWh: contribution.rawWh,
        contributionWh: contribution.contributionWh,
        warnings: getLoadWarnings(item)
      };
      if (!largest || row.contributionWh > largest.contributionWh) {
        largest = row;
      }
      return row;
    });

    return {
      rows,
      totalWh,
      dcWh,
      acWh,
      largest,
      criticalCount
    };
  }

  function validate(settings, dailyWh) {
    if (!Number.isFinite(dailyWh) || dailyWh <= 0) {
      return "Inserisci almeno un carico valido o un consumo giornaliero manuale maggiore di 0 Wh.";
    }
    if (!Number.isFinite(settings.autonomyDays) || settings.autonomyDays <= 0) {
      return "Inserisci giorni di autonomia validi maggiori di 0.";
    }
    if (!Number.isFinite(settings.peakSunHours) || settings.peakSunHours <= 0) {
      return "Inserisci ore di sole equivalenti valide maggiori di 0.";
    }
    if (!Number.isFinite(settings.maxDepthOfDischarge) || settings.maxDepthOfDischarge <= 0 || settings.maxDepthOfDischarge > 1) {
      return "Inserisci una profondità di scarica tra 0,1 e 1.";
    }
    if (!Number.isFinite(settings.inverterEfficiency) || settings.inverterEfficiency <= 0 || settings.inverterEfficiency > 1) {
      return "Inserisci un'efficienza inverter tra 0,5 e 1.";
    }
    if (!Number.isFinite(settings.safetyMargin) || settings.safetyMargin < 1) {
      return "Inserisci un margine di sicurezza pari o superiore a 1.";
    }
    if (!Number.isFinite(settings.pvLossFactor) || settings.pvLossFactor < 1) {
      return "Inserisci un fattore perdite pannelli pari o superiore a 1.";
    }
    if (!Number.isFinite(settings.inverterLoadW) || settings.inverterLoadW <= 0) {
      return "Inserisci un carico massimo contemporaneo valido.";
    }
    return "";
  }

  function calculate() {
    const settings = getSettings();
    const loadSummary = getLoadSummary(settings);
    const dailyWh = state.dailyWhManual ? positiveNumber(state.manualDailyWh, 0) : loadSummary.totalWh;
    const error = validate(settings, dailyWh);

    if (error) {
      return {
        error,
        settings,
        loadSummary
      };
    }

    const adjustedDailyWh = dailyWh * settings.safetyMargin;
    const requiredBatteryWh = adjustedDailyWh * settings.autonomyDays / settings.maxDepthOfDischarge;
    const batteryWh = roundBatteryWh(requiredBatteryWh);
    const batteryAh = Math.ceil(requiredBatteryWh / settings.systemVoltage);
    const pvWp = ceilTo(adjustedDailyWh / settings.peakSunHours * settings.pvLossFactor, 10);
    const inverterW = ceilTo(settings.inverterLoadW * 1.25, 50);
    const controllerA = ceilTo(pvWp / settings.systemVoltage * 1.25, 5);
    const confidence = getConfidence(dailyWh, settings, loadSummary);
    const comparison = getBatteryComparison(adjustedDailyWh, settings);

    return {
      settings,
      loadSummary,
      dailyWh,
      adjustedDailyWh,
      batteryWh,
      batteryAh,
      pvWp,
      inverterW,
      controllerA,
      confidence,
      comparison,
      error: ""
    };
  }

  function getBatteryComparison(adjustedDailyWh, settings) {
    const lifepo4RawWh = adjustedDailyWh * settings.autonomyDays / DOD_DEFAULTS.lifepo4;
    const agmRawWh = adjustedDailyWh * settings.autonomyDays / DOD_DEFAULTS.agm;
    const lifepo4Wh = roundBatteryWh(lifepo4RawWh);
    const agmWh = roundBatteryWh(agmRawWh);
    const lifepo4Ah = Math.ceil(lifepo4RawWh / settings.systemVoltage);
    const agmAh = Math.ceil(agmRawWh / settings.systemVoltage);
    const difference = Math.round((agmWh - lifepo4Wh) / lifepo4Wh * 100);

    return {
      lifepo4Wh,
      agmWh,
      lifepo4Ah,
      agmAh,
      difference
    };
  }

  function getConfidence(dailyWh, settings, loadSummary) {
    if ((dailyWh > 5000 && settings.systemVoltage === 12) || settings.peakSunHours < 2) {
      return {
        level: "basso",
        className: "is-low",
        reason: "richiede una verifica tecnica più attenta."
      };
    }
    if (settings.safetyMargin < 1.2 || (loadSummary.acWh > 0 && settings.inverterEfficiency > 0.95)) {
      return {
        level: "medio",
        className: "is-medium",
        reason: settings.safetyMargin < 1.2
          ? "il margine di sicurezza è ridotto."
          : "sono presenti carichi AC con efficienza inverter molto ottimistica."
      };
    }
    return {
      level: "buono",
      className: "is-good",
      reason: "i valori sono in un range ragionevole per una stima preliminare."
    };
  }

  // rendering
  function render() {
    syncFields();
    renderMode();
    renderPresets();
    renderLoads();
    const result = calculate();
    latestResults = result;

    if (result.error) {
      renderInvalid(result);
      return;
    }

    renderResults(result);
    renderReport(result);
    renderFeedback("Risultati aggiornati in tempo reale.", false);
  }

  function syncFields() {
    fields.useCase.value = state.useCase;
    fields.systemVoltage.value = String(state.systemVoltage);
    fields.dailyWh.value = String(Math.round(state.dailyWhManual ? state.manualDailyWh : getLoadSummary(getSettings()).totalWh));
    fields.autonomyDays.value = String(state.autonomyDays);
    fields.peakSunHours.value = String(state.peakSunHours);
    fields.batteryType.value = state.batteryType;
    fields.maxDepthOfDischarge.value = String(state.maxDepthOfDischarge);
    fields.safetyMargin.value = String(state.safetyMargin);
    fields.inverterEfficiency.value = String(state.inverterEfficiency);
    fields.pvLossFactor.value = String(state.pvLossFactor);
    fields.inverterLoadW.value = String(state.inverterLoadW);
    dom.dailyModeLabel.textContent = state.dailyWhManual
      ? "Modalità rapida: stai usando il consumo giornaliero inserito manualmente."
      : "Uso il totale della lista carichi.";
  }

  function renderMode() {
    document.body.dataset.mode = state.mode;
    for (const button of [dom.simpleMode, dom.advancedMode]) {
      const isActive = button.dataset.mode === state.mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  }

  function renderPresets() {
    for (const button of dom.presetButtons.querySelectorAll("[data-preset]")) {
      button.classList.toggle("is-active", button.dataset.preset === state.preset);
    }
  }

  function renderLoads() {
    const summary = getLoadSummary(getSettings());
    dom.loadsBody.innerHTML = "";
    for (const row of summary.rows) {
      dom.loadsBody.appendChild(createLoadRow(row, summary.largest));
    }
    dom.loadTotal.textContent = `${formatWh(summary.totalWh)} / giorno`;
    dom.largestLoad.textContent = summary.largest
      ? `${summary.largest.name} (${formatWh(summary.largest.contributionWh)})`
      : "-";
    dom.criticalLoads.textContent = `${summary.criticalCount}`;
  }

  function createLoadRow(row, largest) {
    const tr = document.createElement("tr");
    tr.dataset.id = row.id;
    if (largest && row.id === largest.id && row.contributionWh > 0) {
      tr.classList.add("is-largest");
    }
    if (row.warnings.length > 0) {
      tr.classList.add("is-warning");
    }

    tr.appendChild(createInputCell("Nome carico", "name", "text", row.name, "load-name"));
    tr.appendChild(createInputCell("Qtà", "quantity", "number", row.quantity, "load-number", "0", "1"));
    tr.appendChild(createInputCell("Watt", "watt", "number", row.watt, "load-number", "0", "1"));
    tr.appendChild(createInputCell("Ore/giorno", "hours", "number", row.hours, "load-number", "0", "0.1"));

    const typeCell = document.createElement("td");
    typeCell.dataset.label = "Tipo";
    typeCell.className = "advanced-only";
    const typeLabel = document.createElement("label");
    typeLabel.className = "sr-only";
    typeLabel.textContent = `Tipo per ${row.name || "carico"}`;
    const typeSelect = document.createElement("select");
    typeSelect.dataset.field = "type";
    typeSelect.className = "load-type";
    for (const type of ["DC", "AC"]) {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      option.selected = row.type === type;
      typeSelect.appendChild(option);
    }
    typeCell.append(typeLabel, typeSelect);
    tr.appendChild(typeCell);

    const criticalCell = document.createElement("td");
    criticalCell.dataset.label = "Critico";
    const criticalLabel = document.createElement("label");
    criticalLabel.className = "check-field";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.field = "critical";
    checkbox.checked = Boolean(row.critical);
    const criticalText = document.createElement("span");
    criticalText.textContent = "Critico";
    criticalLabel.append(checkbox, criticalText);
    criticalCell.appendChild(criticalLabel);
    tr.appendChild(criticalCell);

    const whCell = document.createElement("td");
    whCell.dataset.label = "Wh/giorno";
    whCell.className = "load-wh";
    const whValue = document.createElement("strong");
    whValue.textContent = formatWh(row.contributionWh);
    whCell.appendChild(whValue);
    if (row.warnings.length > 0) {
      const warning = document.createElement("small");
      warning.className = "load-warning";
      warning.textContent = `Controlla: ${row.warnings.join(", ")}.`;
      whCell.appendChild(warning);
    }
    if (row.type === "AC") {
      whCell.title = "Include correzione per efficienza inverter.";
    }
    tr.appendChild(whCell);

    const removeCell = document.createElement("td");
    removeCell.dataset.label = "Rimuovi";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-load";
    removeButton.dataset.action = "remove-load";
    removeButton.setAttribute("aria-label", `Rimuovi ${row.name || "carico"}`);
    removeButton.textContent = "Rimuovi";
    removeCell.appendChild(removeButton);
    tr.appendChild(removeCell);

    return tr;
  }

  function createInputCell(label, field, type, value, className, min, step) {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    const hiddenLabel = document.createElement("label");
    hiddenLabel.className = "sr-only";
    hiddenLabel.textContent = label;
    const input = document.createElement("input");
    input.type = type;
    input.value = value;
    input.dataset.field = field;
    input.className = className;
    if (type === "number") {
      input.min = min;
      input.step = step;
      input.inputMode = "decimal";
    }
    hiddenLabel.appendChild(input);
    cell.appendChild(hiddenLabel);
    return cell;
  }

  function renderInvalid(result) {
    for (const element of [
      dom.realDailyWh,
      dom.adjustedDailyWh,
      dom.batteryResult,
      dom.pvResult,
      dom.inverterResult,
      dom.controllerResult
    ]) {
      element.textContent = "-";
    }
    dom.configurationResult.textContent = "-";
    dom.confidenceResult.textContent = "Livello confidenza: -";
    dom.batteryDetail.textContent = "Dato non disponibile.";
    dom.controllerDetail.textContent = "Dato non disponibile.";
    dom.resultSummary.textContent = "Correggi i dati per aggiornare il dimensionamento.";
    dom.lifepo4Comparison.textContent = "-";
    dom.agmComparison.textContent = "-";
    dom.comparisonDifference.textContent = "-";
    dom.reportScenario.textContent = result.error;
    dom.reportLoads.textContent = "";
    dom.reportParameters.textContent = "";
    dom.reportResults.textContent = "";
    dom.reportComparison.textContent = "";
    latestReportText = "";
    updateMiniSummary(null);
    renderFeedback(result.error, true);
  }

  function renderResults(result) {
    const settings = result.settings;
    const batteryLabel = BATTERY_LABELS[settings.batteryType];
    const presetLabel = getPresetLabel();
    const config = `${formatNumber(settings.systemVoltage)} V / ${batteryLabel} / circa ${formatWp(result.pvWp)} / MPPT ${formatNumber(result.controllerA)} A`;

    dom.resultSummary.textContent = `${presetLabel}: ${formatWh(result.dailyWh)} al giorno, ${formatDecimal(settings.autonomyDays, 1)} giorni di autonomia.`;
    dom.configurationResult.textContent = config;
    dom.confidenceResult.textContent = `Livello confidenza: ${result.confidence.level} - ${result.confidence.reason}`;
    dom.confidenceResult.className = `confidence ${result.confidence.className}`;
    dom.realDailyWh.textContent = `${formatWh(result.dailyWh)} / giorno`;
    dom.adjustedDailyWh.textContent = `${formatWh(result.adjustedDailyWh)} / giorno`;
    dom.batteryResult.textContent = `${formatWh(result.batteryWh)} / ${formatNumber(result.batteryAh)} Ah`;
    dom.batteryDetail.textContent = `${batteryLabel}, DoD ${formatDecimal(settings.maxDepthOfDischarge * 100, 0)}%, sistema ${formatNumber(settings.systemVoltage)} V.`;
    dom.pvResult.textContent = formatWp(result.pvWp);
    dom.inverterResult.textContent = `${formatNumber(result.inverterW)} W`;
    dom.controllerResult.textContent = `${formatNumber(result.controllerA)} A`;
    dom.controllerDetail.textContent = `Stima su sistema ${formatNumber(settings.systemVoltage)} V con 25% di margine corrente.`;
    dom.lifepo4Comparison.textContent = `${formatWh(result.comparison.lifepo4Wh)} / ${formatNumber(result.comparison.lifepo4Ah)} Ah`;
    dom.agmComparison.textContent = `${formatWh(result.comparison.agmWh)} / ${formatNumber(result.comparison.agmAh)} Ah`;
    dom.comparisonDifference.textContent = `AGM circa +${result.comparison.difference}%`;
    dom.comparisonNote.textContent = "A parità di consumi, AGM richiede più capacità nominale perché usa una profondità di scarica inferiore.";
    dom.batteryExplanation.textContent = `Uso ${formatWh(result.adjustedDailyWh)} al giorno per ${formatDecimal(settings.autonomyDays, 1)} giorni e DoD ${formatDecimal(settings.maxDepthOfDischarge * 100, 0)}%.`;
    dom.pvExplanation.textContent = `Divido il consumo con margine per ${formatDecimal(settings.peakSunHours, 1)} ore di sole e applico fattore perdite x${formatDecimal(settings.pvLossFactor, 2)}.`;
    updateMiniSummary(result);
    pulseResults();
  }

  function updateMiniSummary(result) {
    if (!dom.appSummaryBar || !dom.appSummaryText) {
      return;
    }

    if (!result || result.error) {
      dom.appSummaryBar.hidden = true;
      document.body.classList.remove("has-mini-summary");
      return;
    }

    dom.appSummaryText.textContent = `${formatWh(result.dailyWh)}/giorno · Batteria ${formatWh(result.batteryWh)} · FV ${formatWp(result.pvWp)} · MPPT ${formatNumber(result.controllerA)} A`;
    dom.appSummaryBar.hidden = false;
    document.body.classList.add("has-mini-summary");
  }

  function renderReport(result) {
    const settings = result.settings;
    const presetLabel = getPresetLabel();
    const generatedAt = new Date().toLocaleString("it-IT", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    dom.reportMeta.textContent = `Generato il ${generatedAt}. Stima preliminare, non certificazione tecnica.`;
    dom.reportScenario.textContent = `${presetLabel} - ${USE_CASE_LABELS[settings.useCase]} - ${formatNumber(settings.systemVoltage)} V - ${BATTERY_LABELS[settings.batteryType]}`;

    dom.reportLoads.innerHTML = buildReportLoadsTable(result);
    dom.reportParameters.innerHTML = buildReportParametersList(result);
    dom.reportResults.innerHTML = buildReportResultsList(result);
    dom.reportComparison.innerHTML = buildReportComparisonList(result);
    latestReportText = buildReportText(result, generatedAt);
  }

  function buildReportLoadsTable(result) {
    const rows = result.loadSummary.rows.map(row => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${formatDecimal(row.quantity, 1)}</td>
        <td>${formatNumber(row.watt)} W</td>
        <td>${formatDecimal(row.hours, 1)} h</td>
        <td>${row.type}${row.critical ? " / critico" : ""}</td>
        <td>${formatWh(row.contributionWh)}${row.warnings.length ? `<br><small>Controlla: ${escapeHtml(row.warnings.join(", "))}</small>` : ""}</td>
      </tr>
    `).join("");

    return `
      <table class="report-table">
        <thead>
          <tr>
            <th>Carico</th>
            <th>Qtà</th>
            <th>Watt</th>
            <th>Ore/giorno</th>
            <th>Tipo</th>
            <th>Wh/giorno</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><strong>Totale consumi:</strong> ${formatWh(result.dailyWh)} / giorno.</p>
    `;
  }

  function buildReportResultsList(result) {
    return `
      <ul>
        <li>Consumo reale stimato: ${formatWh(result.dailyWh)} / giorno.</li>
        <li>Consumo con margine: ${formatWh(result.adjustedDailyWh)} / giorno.</li>
        <li>Batteria consigliata: ${formatWh(result.batteryWh)} / ${formatNumber(result.batteryAh)} Ah.</li>
        <li>Pannelli consigliati: ${formatWp(result.pvWp)}.</li>
        <li>Inverter consigliato: ${formatNumber(result.inverterW)} W.</li>
        <li>Regolatore MPPT consigliato: ${formatNumber(result.controllerA)} A.</li>
        <li>Configurazione: ${escapeHtml(dom.configurationResult.textContent)}.</li>
        <li>Livello confidenza: ${result.confidence.level}.</li>
      </ul>
    `;
  }

  function buildReportParametersList(result) {
    const settings = result.settings;
    return `
      <ul>
        <li>Tensione sistema: ${formatNumber(settings.systemVoltage)} V.</li>
        <li>Batteria selezionata: ${BATTERY_LABELS[settings.batteryType]}.</li>
        <li>Autonomia: ${formatDecimal(settings.autonomyDays, 1)} giorni.</li>
        <li>Ore di sole equivalenti: ${formatDecimal(settings.peakSunHours, 1)} h/giorno.</li>
        <li>Profondità di scarica: ${formatDecimal(settings.maxDepthOfDischarge * 100, 0)}%.</li>
        <li>Margine sicurezza: x${formatDecimal(settings.safetyMargin, 2)}.</li>
        <li>Efficienza inverter: ${formatDecimal(settings.inverterEfficiency * 100, 0)}%.</li>
        <li>Fattore perdite FV: x${formatDecimal(settings.pvLossFactor, 2)}.</li>
        <li>Potenza contemporanea max: ${formatNumber(settings.inverterLoadW)} W.</li>
      </ul>
    `;
  }

  function buildReportComparisonList(result) {
    return `
      <ul>
        <li>LiFePO4 richiesta: ${formatWh(result.comparison.lifepo4Wh)} / ${formatNumber(result.comparison.lifepo4Ah)} Ah.</li>
        <li>AGM richiesta: ${formatWh(result.comparison.agmWh)} / ${formatNumber(result.comparison.agmAh)} Ah.</li>
        <li>Differenza: AGM circa +${result.comparison.difference}%.</li>
        <li>Nota pratica: la scelta dipende da peso, cicli, budget, corrente di scarica e condizioni di installazione.</li>
      </ul>
    `;
  }

  function buildReportText(result, generatedAt) {
    const settings = result.settings;
    const presetLabel = getPresetLabel();
    const loadLines = result.loadSummary.rows.map(row => {
      const critical = row.critical ? ", critico" : "";
      const warnings = row.warnings.length ? ` (controlla: ${row.warnings.join(", ")})` : "";
      return `- ${row.name}: ${formatDecimal(row.quantity, 1)} x ${formatNumber(row.watt)} W x ${formatDecimal(row.hours, 1)} h, ${row.type}${critical} = ${formatWh(row.contributionWh)}/giorno${warnings}`;
    });

    return [
      "Report IsolaWatt",
      `Data generazione: ${generatedAt}`,
      `Scenario: ${presetLabel}`,
      `Uso: ${USE_CASE_LABELS[settings.useCase]}`,
      `Sistema: ${formatNumber(settings.systemVoltage)} V / ${BATTERY_LABELS[settings.batteryType]}`,
      "",
      "Lista carichi:",
      ...loadLines,
      "",
      "Parametri usati:",
      `- Tensione sistema: ${formatNumber(settings.systemVoltage)} V`,
      `- Batteria: ${BATTERY_LABELS[settings.batteryType]}`,
      `- Autonomia: ${formatDecimal(settings.autonomyDays, 1)} giorni`,
      `- Ore sole equivalenti: ${formatDecimal(settings.peakSunHours, 1)} h/giorno`,
      `- DoD: ${formatDecimal(settings.maxDepthOfDischarge * 100, 0)}%`,
      `- Margine sicurezza: x${formatDecimal(settings.safetyMargin, 2)}`,
      `- Efficienza inverter: ${formatDecimal(settings.inverterEfficiency * 100, 0)}%`,
      `- Fattore perdite FV: x${formatDecimal(settings.pvLossFactor, 2)}`,
      `- Potenza contemporanea max: ${formatNumber(settings.inverterLoadW)} W`,
      "",
      `Totale consumi: ${formatWh(result.dailyWh)}/giorno`,
      `Consumo con margine: ${formatWh(result.adjustedDailyWh)}/giorno`,
      `Batteria consigliata: ${formatWh(result.batteryWh)} / ${formatNumber(result.batteryAh)} Ah`,
      `Pannelli consigliati: ${formatWp(result.pvWp)}`,
      `Inverter consigliato: ${formatNumber(result.inverterW)} W`,
      `Regolatore MPPT consigliato: ${formatNumber(result.controllerA)} A`,
      `Configurazione suggerita: ${dom.configurationResult.textContent}`,
      `Livello confidenza: ${result.confidence.level}`,
      "",
      "Confronto LiFePO4 vs AGM:",
      `- LiFePO4: ${formatWh(result.comparison.lifepo4Wh)} / ${formatNumber(result.comparison.lifepo4Ah)} Ah`,
      `- AGM: ${formatWh(result.comparison.agmWh)} / ${formatNumber(result.comparison.agmAh)} Ah`,
      `- Differenza: AGM circa +${result.comparison.difference}%`,
      "",
      "Formule principali:",
      "- Wh AC usati = Wh carico AC / efficienza inverter.",
      "- Consumo con margine = consumo giornaliero x margine di sicurezza.",
      "- Batteria Wh = consumo con margine x giorni autonomia / profondità di scarica.",
      "- Pannelli Wp = consumo con margine / ore sole x fattore perdite pannelli.",
      "- Corrente MPPT = pannelli Wp / tensione sistema x 1,25.",
      "",
      "Disclaimer: stima preliminare, non certificazione tecnica o progetto elettrico.",
      "isolawatt.com"
    ].join("\n");
  }

  function renderFeedback(message, isError) {
    dom.formFeedback.textContent = message;
    dom.formFeedback.classList.toggle("is-error", isError);
  }

  function pulseResults() {
    const panel = document.querySelector(".results-panel");
    if (!panel) {
      return;
    }
    panel.classList.remove("is-updating");
    void panel.offsetWidth;
    panel.classList.add("is-updating");
  }

  function showPresetArrival(presetKey) {
    const preset = PRESETS[presetKey];
    const calc = document.getElementById("calcolatore");
    const toast = document.getElementById("presetToast");

    if (!preset) {
      return;
    }

    renderFeedback(`Preset "${preset.label}" precaricato. Puoi modificare carichi e parametri.`, false);

    if (calc) {
      calc.classList.remove("is-arrival-highlight");
      void calc.offsetWidth;
      calc.classList.add("is-arrival-highlight");
    }

    if (!toast) {
      return;
    }

    toast.textContent = `Abbiamo precaricato i dati per "${preset.label}". Ora puoi adattarli al tuo caso reale.`;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-visible"));

    window.clearTimeout(showPresetArrival.timer);
    showPresetArrival.timer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => {
        toast.hidden = true;
      }, 220);
    }, 4200);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  // load table management
  function addLoad() {
    state.loads.push(load("Nuovo carico", 1, 20, 1, "DC", false));
    state.dailyWhManual = false;
    state.preset = "custom";
    render();
  }

  function resetLoads() {
    state.loads = cloneLoads(PRESETS[DEFAULT_PRESET].loads);
    state.dailyWhManual = false;
    state.preset = DEFAULT_PRESET;
    render();
  }

  function updateLoad(id, field, value) {
    const item = state.loads.find(row => row.id === id);
    if (!item) {
      return;
    }

    if (field === "critical") {
      item.critical = Boolean(value);
    } else if (["quantity", "watt", "hours"].includes(field)) {
      item[field] = positiveNumber(value, 0);
    } else if (field === "type") {
      item.type = value === "AC" ? "AC" : "DC";
    } else {
      item.name = String(value).slice(0, 80);
    }

    state.dailyWhManual = false;
    state.preset = "custom";
    render();
  }

  function removeLoad(id) {
    state.loads = state.loads.filter(row => row.id !== id);
    state.dailyWhManual = false;
    state.preset = "custom";
    render();
  }

  // presets
  function applyPreset(key) {
    const normalizedKey = normalizePresetKey(key);
    const preset = PRESETS[normalizedKey];
    if (!preset) {
      return;
    }

    state = {
      ...state,
      preset: normalizedKey,
      useCase: preset.useCase,
      systemVoltage: preset.systemVoltage,
      autonomyDays: preset.autonomyDays,
      peakSunHours: preset.peakSunHours,
      batteryType: preset.batteryType,
      maxDepthOfDischarge: DOD_DEFAULTS[preset.batteryType],
      depthOfDischargeManual: false,
      inverterEfficiency: DEFAULTS.inverterEfficiency,
      pvLossFactor: DEFAULTS.pvLossFactor,
      safetyMargin: DEFAULTS.safetyMargin,
      inverterLoadW: preset.inverterLoadW,
      dailyWhManual: false,
      manualDailyWh: 0,
      loads: cloneLoads(preset.loads)
    };
    render();
    renderFeedback(`Preset "${preset.label}" applicato. Puoi modificare carichi e parametri.`, false);
  }

  function normalizePresetKey(key) {
    if (PRESETS[key]) {
      return key;
    }

    return PRESET_ALIASES[key] || key;
  }

  // local storage
  function storageAvailable() {
    try {
      const testKey = "__isolawatt_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function getProjectSnapshot() {
    const timestamp = new Date().toISOString();

    return {
      version: 2,
      preset: state.preset,
      mode: state.mode,
      useCase: state.useCase,
      systemVoltage: state.systemVoltage,
      autonomyDays: state.autonomyDays,
      peakSunHours: state.peakSunHours,
      batteryType: state.batteryType,
      maxDepthOfDischarge: state.maxDepthOfDischarge,
      depthOfDischargeManual: state.depthOfDischargeManual,
      inverterLoadW: state.inverterLoadW,
      safetyMargin: state.safetyMargin,
      inverterEfficiency: state.inverterEfficiency,
      pvLossFactor: state.pvLossFactor,
      dailyWhManual: state.dailyWhManual,
      manualDailyWh: state.manualDailyWh,
      timestamp,
      savedAt: timestamp,
      loads: state.loads.map(({ name, quantity, watt, hours, type, critical }) => ({
        name,
        quantity,
        watt,
        hours,
        type,
        critical
      }))
    };
  }

  function applySnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.loads)) {
      renderFeedback("Progetto non valido.", true);
      return;
    }

    state = {
      ...state,
      ...DEFAULTS,
      ...snapshot,
      mode: snapshot.mode === "advanced" ? "advanced" : "simple",
      batteryType: snapshot.batteryType === "agm" ? "agm" : "lifepo4",
      loads: snapshot.loads.map(item => load(
        String(item.name || "Carico").slice(0, 80),
        positiveNumber(item.quantity, 1),
        positiveNumber(item.watt, 0),
        positiveNumber(item.hours, 0),
        item.type === "AC" ? "AC" : "DC",
        Boolean(item.critical)
      ))
    };
    render();
  }

  function saveProject() {
    if (!storageAvailable()) {
      renderFeedback("Salvataggio locale non disponibile in questo browser.", true);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getProjectSnapshot()));
    renderFeedback("Progetto salvato nel browser.", false);
  }

  function loadSavedProject() {
    if (!storageAvailable()) {
      renderFeedback("Salvataggio locale non disponibile in questo browser.", true);
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      renderFeedback("Nessun progetto locale salvato.", true);
      return;
    }
    try {
      applySnapshot(JSON.parse(raw));
      renderFeedback("Ultimo progetto caricato dal browser.", false);
    } catch (error) {
      renderFeedback("Impossibile leggere il progetto salvato.", true);
    }
  }

  function clearSavedProject() {
    if (!storageAvailable()) {
      renderFeedback("Salvataggio locale non disponibile in questo browser.", true);
      return;
    }
    window.localStorage.removeItem(STORAGE_KEY);
    renderFeedback("Dati locali cancellati dal browser.", false);
  }

  // share link
  function createShareHash() {
    const snapshot = getProjectSnapshot();
    const compact = {
      p: snapshot.preset,
      m: snapshot.mode,
      u: snapshot.useCase,
      v: snapshot.systemVoltage,
      a: snapshot.autonomyDays,
      s: snapshot.peakSunHours,
      b: snapshot.batteryType,
      d: snapshot.maxDepthOfDischarge,
      dmz: snapshot.depthOfDischargeManual ? 1 : 0,
      i: snapshot.inverterLoadW,
      sm: snapshot.safetyMargin,
      ie: snapshot.inverterEfficiency,
      pv: snapshot.pvLossFactor,
      dm: snapshot.dailyWhManual ? 1 : 0,
      dw: snapshot.manualDailyWh,
      l: snapshot.loads.map(item => [
        item.name,
        item.quantity,
        item.watt,
        item.hours,
        item.type,
        item.critical ? 1 : 0
      ])
    };
    return `${SHARE_PREFIX}${toBase64Url(JSON.stringify(compact))}`;
  }

  function parseShareHash() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.startsWith(SHARE_PREFIX)) {
      return null;
    }
    try {
      const compact = JSON.parse(fromBase64Url(hash.slice(SHARE_PREFIX.length)));
      return {
        version: 2,
        preset: compact.p || "custom",
        mode: compact.m || "simple",
        useCase: compact.u || "camper",
        systemVoltage: compact.v,
        autonomyDays: compact.a,
        peakSunHours: compact.s,
        batteryType: compact.b,
        maxDepthOfDischarge: compact.d,
        depthOfDischargeManual: compact.dmz === 1,
        inverterLoadW: compact.i,
        safetyMargin: compact.sm,
        inverterEfficiency: compact.ie,
        pvLossFactor: compact.pv,
        dailyWhManual: compact.dm === 1,
        manualDailyWh: compact.dw || 0,
        loads: Array.isArray(compact.l)
          ? compact.l.map(item => ({
              name: item[0],
              quantity: item[1],
              watt: item[2],
              hours: item[3],
              type: item[4],
              critical: item[5] === 1
            }))
          : []
      };
    } catch (error) {
      return null;
    }
  }

  function toBase64Url(value) {
    const encoded = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) => {
      return String.fromCharCode(Number.parseInt(hex, 16));
    });
    return btoa(encoded).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromBase64Url(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const decoded = atob(padded);
    return decodeURIComponent(Array.from(decoded).map(char => {
      return `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`;
    }).join(""));
  }

  async function copyProjectLink() {
    const hash = createShareHash();
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${hash}`);
    const url = window.location.href;
    await copyText(url, "Link progetto copiato negli appunti.");
  }

  async function copyReport() {
    if (!latestReportText && latestResults && !latestResults.error) {
      renderReport(latestResults);
    }
    if (!latestReportText) {
      renderFeedback("Non ci sono risultati validi da copiare.", true);
      return;
    }
    await copyText(latestReportText, "Report copiato negli appunti.");
  }

  function toggleReportPreview() {
    if (!dom.printReport || !dom.toggleReportPreview) {
      return;
    }

    const isOpen = dom.printReport.classList.toggle("is-open");
    dom.toggleReportPreview.setAttribute("aria-expanded", String(isOpen));
    dom.toggleReportPreview.textContent = isOpen ? "Nascondi anteprima" : "Anteprima report";

    if (isOpen) {
      dom.printReport.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function copyText(text, successMessage) {
    let copied = false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (error) {
      copied = false;
    }

    if (!copied) {
      const textarea = document.createElement("textarea");
      try {
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      } finally {
        textarea.remove();
      }
    }

    if (copied) {
      renderFeedback(successMessage, false);
      return;
    }

    renderFeedback("Copia non riuscita: seleziona il testo e copialo manualmente.", true);
  }

  // events
  function bindEvents() {
    form.addEventListener("submit", event => event.preventDefault());

    for (const [key, field] of Object.entries(fields)) {
      field.addEventListener("input", () => {
        if (key === "dailyWh") {
          state.dailyWhManual = true;
          state.manualDailyWh = positiveNumber(field.value, 0);
        } else if (key === "batteryType") {
          state.batteryType = field.value;
          if (!state.depthOfDischargeManual) {
            state.maxDepthOfDischarge = DOD_DEFAULTS[state.batteryType];
          }
        } else if (key === "maxDepthOfDischarge") {
          state.maxDepthOfDischarge = field.value;
          if (state.mode === "advanced") {
            state.depthOfDischargeManual = true;
          }
        } else {
          state[key] = field.value;
        }
        state.preset = key === "dailyWh" ? state.preset : "custom";
        render();
      });

      field.addEventListener("change", () => {
        if (key === "batteryType") {
          state.batteryType = field.value;
          if (!state.depthOfDischargeManual) {
            state.maxDepthOfDischarge = DOD_DEFAULTS[state.batteryType];
          }
        } else if (key === "maxDepthOfDischarge") {
          state.maxDepthOfDischarge = field.value;
          if (state.mode === "advanced") {
            state.depthOfDischargeManual = true;
          }
        } else if (key !== "dailyWh") {
          state[key] = field.value;
        }
        render();
      });
    }

    dom.simpleMode.addEventListener("click", () => {
      state.mode = "simple";
      render();
    });
    dom.advancedMode.addEventListener("click", () => {
      state.mode = "advanced";
      render();
    });
    dom.presetButtons.addEventListener("click", event => {
      const button = event.target.closest("[data-preset]");
      if (button) {
        applyPreset(button.dataset.preset);
      }
    });
    dom.loadsBody.addEventListener("change", event => {
      const row = event.target.closest("tr[data-id]");
      const field = event.target.dataset.field;
      if (!row || !field) {
        return;
      }
      const value = field === "critical" ? event.target.checked : event.target.value;
      updateLoad(row.dataset.id, field, value);
    });
    dom.loadsBody.addEventListener("click", event => {
      const button = event.target.closest("[data-action='remove-load']");
      if (button) {
        const row = button.closest("tr[data-id]");
        removeLoad(row.dataset.id);
      }
    });
    dom.addLoad.addEventListener("click", addLoad);
    dom.resetLoads.addEventListener("click", resetLoads);
    dom.useLoadTotal.addEventListener("click", () => {
      state.dailyWhManual = false;
      render();
    });
    dom.saveProject.addEventListener("click", saveProject);
    dom.loadProject.addEventListener("click", loadSavedProject);
    dom.clearProject.addEventListener("click", clearSavedProject);
    dom.copyProjectLink.addEventListener("click", copyProjectLink);
    dom.copyReport.addEventListener("click", copyReport);
    if (dom.toggleReportPreview) {
      dom.toggleReportPreview.addEventListener("click", toggleReportPreview);
    }
    dom.printResults.addEventListener("click", () => window.print());

    window.addEventListener("hashchange", () => {
      handleHashRoute(false);
    });
  }

  // init
  function init() {
    if (handleHashRoute(true)) {
      finishInit();
      return;
    }

    const sharedProject = parseShareHash();
    if (sharedProject) {
      applySnapshot(sharedProject);
      renderFeedback("Scenario caricato dal link condivisibile.", false);
    } else {
      render();
    }

    finishInit();
  }

  function handleHashRoute(shouldScroll) {
    const hash = window.location.hash.replace(/^#/, "");
    const presetKey = new URLSearchParams(hash).get("preset");
    const normalizedPresetKey = normalizePresetKey(presetKey);

    if (presetKey && PRESETS[normalizedPresetKey]) {
      applyPreset(normalizedPresetKey);
      if (shouldScroll) {
        focusCalculatorFromPreset(normalizedPresetKey);
      } else {
        showPresetArrival(normalizedPresetKey);
      }
      return true;
    }

    if (presetKey) {
      return false;
    }

    const sharedProject = parseShareHash();
    if (sharedProject) {
      applySnapshot(sharedProject);
      renderFeedback("Scenario caricato dal link condivisibile.", false);
      return true;
    }

    return false;
  }

  function focusCalculatorFromPreset(presetKey) {
    const calc = document.getElementById("calcolatore");
    if (!calc) {
      return;
    }

    calc.setAttribute("tabindex", "-1");
    setTimeout(() => {
      calc.scrollIntoView({ behavior: "smooth", block: "start" });
      calc.focus({ preventScroll: true });
      showPresetArrival(presetKey);
    }, 100);
  }

  function finishInit() {
    if (!storageAvailable()) {
      dom.saveProject.disabled = true;
      dom.loadProject.disabled = true;
      dom.clearProject.disabled = true;
      dom.saveProject.title = "LocalStorage non disponibile.";
      dom.loadProject.title = "LocalStorage non disponibile.";
      dom.clearProject.title = "LocalStorage non disponibile.";
    }
  }

  bindEvents();
  init();
})();
