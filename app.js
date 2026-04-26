(function () {
  "use strict";

  const defaults = {
    useCase: "camper",
    systemVoltage: 12,
    dailyWh: 1200,
    autonomyDays: 2,
    peakSunHours: 4,
    batteryType: "lifepo4",
    maxDepthOfDischarge: 0.8,
    inverterLoadW: 800,
    safetyMargin: 1.25
  };

  const batteryDepthDefaults = {
    lifepo4: 0.8,
    agm: 0.5
  };

  const useCaseLabels = {
    camper: "camper",
    barca: "barca",
    baita: "baita",
    "casa isolata": "casa isolata"
  };

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
    inverterLoadW: document.getElementById("inverterLoadW"),
    safetyMargin: document.getElementById("safetyMargin")
  };

  const output = {
    feedback: document.getElementById("formFeedback"),
    summary: document.getElementById("resultSummary"),
    adjustedDailyWh: document.getElementById("adjustedDailyWh"),
    batteryResult: document.getElementById("batteryResult"),
    batteryDetail: document.getElementById("batteryDetail"),
    pvResult: document.getElementById("pvResult"),
    inverterResult: document.getElementById("inverterResult"),
    controllerResult: document.getElementById("controllerResult"),
    controllerDetail: document.getElementById("controllerDetail"),
    marginResult: document.getElementById("marginResult"),
    reportText: document.getElementById("reportText"),
    practicalNotes: document.getElementById("practicalNotes"),
    disclaimer: document.getElementById("technicalDisclaimer"),
    copyButton: document.getElementById("copyResults"),
    printButton: document.getElementById("printResults"),
    resetButton: document.getElementById("resetExample")
  };

  let latestReport = "";

  function toNumber(field) {
    return Number.parseFloat(String(field.value).replace(",", "."));
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

  function formatDecimal(value) {
    return new Intl.NumberFormat("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  function getInputs() {
    return {
      useCase: fields.useCase.value,
      systemVoltage: toNumber(fields.systemVoltage),
      dailyWh: toNumber(fields.dailyWh),
      autonomyDays: toNumber(fields.autonomyDays),
      peakSunHours: toNumber(fields.peakSunHours),
      batteryType: fields.batteryType.value,
      maxDepthOfDischarge: toNumber(fields.maxDepthOfDischarge),
      inverterLoadW: toNumber(fields.inverterLoadW),
      safetyMargin: toNumber(fields.safetyMargin)
    };
  }

  function validate(inputs) {
    const requiredPositiveFields = [
      ["dailyWh", "Inserisci un consumo giornaliero valido maggiore di 0 Wh."],
      ["autonomyDays", "Inserisci giorni di autonomia validi maggiori di 0."],
      ["peakSunHours", "Inserisci ore di sole equivalenti valide maggiori di 0."]
    ];

    for (const [key, message] of requiredPositiveFields) {
      if (!Number.isFinite(inputs[key]) || inputs[key] <= 0) {
        return message;
      }
    }

    if (!Number.isFinite(inputs.systemVoltage) || inputs.systemVoltage <= 0) {
      return "Seleziona una tensione sistema valida.";
    }

    if (!Number.isFinite(inputs.maxDepthOfDischarge) || inputs.maxDepthOfDischarge <= 0 || inputs.maxDepthOfDischarge > 1) {
      return "Inserisci una profondità di scarica tra 0,1 e 1.";
    }

    if (!Number.isFinite(inputs.inverterLoadW) || inputs.inverterLoadW <= 0) {
      return "Inserisci una potenza massima contemporanea valida.";
    }

    if (!Number.isFinite(inputs.safetyMargin) || inputs.safetyMargin < 1) {
      return "Inserisci un margine di sicurezza pari o superiore a 1.";
    }

    return "";
  }

  function calculate(inputs) {
    const adjustedDailyWh = inputs.dailyWh * inputs.safetyMargin;
    const requiredBatteryWh = adjustedDailyWh * inputs.autonomyDays / inputs.maxDepthOfDischarge;
    const batteryWh = roundBatteryWh(requiredBatteryWh);
    const batteryAh = Math.ceil(requiredBatteryWh / inputs.systemVoltage);
    const pvWp = ceilTo(adjustedDailyWh / inputs.peakSunHours * 1.25, 10);
    const inverterW = ceilTo(inputs.inverterLoadW * 1.25, 50);
    const controllerA = ceilTo(pvWp / inputs.systemVoltage * 1.25, 5);

    return {
      adjustedDailyWh: Math.round(adjustedDailyWh),
      batteryWh,
      batteryAh,
      pvWp,
      inverterW,
      controllerA
    };
  }

  function buildReport(inputs, results) {
    const batteryName = inputs.batteryType === "lifepo4" ? "LiFePO4" : "AGM";
    const useCase = useCaseLabels[inputs.useCase] || inputs.useCase;

    return [
      "Report IsolaWatt - stima fotovoltaico off-grid",
      "",
      `Uso: ${useCase}`,
      `Tensione sistema: ${formatNumber(inputs.systemVoltage)} V`,
      `Consumo giornaliero: ${formatNumber(inputs.dailyWh)} Wh/giorno`,
      `Margine di sicurezza: x${formatDecimal(inputs.safetyMargin)}`,
      `Consumo con margine: ${formatNumber(results.adjustedDailyWh)} Wh/giorno`,
      `Autonomia richiesta: ${formatDecimal(inputs.autonomyDays)} giorni`,
      `Ore di sole equivalenti: ${formatDecimal(inputs.peakSunHours)} h/giorno`,
      `Batteria: ${batteryName}, DoD max ${formatDecimal(inputs.maxDepthOfDischarge * 100)}%`,
      "",
      `Batteria consigliata: ${formatNumber(results.batteryWh)} Wh (${formatNumber(results.batteryAh)} Ah a ${formatNumber(inputs.systemVoltage)} V)`,
      `Pannelli consigliati: ${formatNumber(results.pvWp)} Wp`,
      `Inverter minimo consigliato: ${formatNumber(results.inverterW)} W`,
      `Regolatore MPPT consigliato: ${formatNumber(results.controllerA)} A a ${formatNumber(inputs.systemVoltage)} V`,
      "",
      "Note pratiche: verifica compatibilità elettrica, cavi, fusibili, protezioni, temperatura e schede tecniche dei componenti.",
      "Disclaimer: stima preliminare, non certificazione tecnica o progetto elettrico."
    ].join("\n");
  }

  function setInvalid(message) {
    output.feedback.textContent = message;
    output.feedback.classList.add("is-error");
    output.summary.textContent = "Correggi i dati evidenziati per aggiornare il report.";

    for (const element of [
      output.adjustedDailyWh,
      output.batteryResult,
      output.pvResult,
      output.inverterResult,
      output.controllerResult,
      output.marginResult
    ]) {
      element.textContent = "-";
    }

    output.batteryDetail.textContent = "Dato non disponibile.";
    output.controllerDetail.textContent = "Dato non disponibile.";
    output.reportText.textContent = message;
    latestReport = "";
  }

  function updateResults() {
    const inputs = getInputs();
    const error = validate(inputs);

    if (error) {
      setInvalid(error);
      return;
    }

    const results = calculate(inputs);
    const batteryName = inputs.batteryType === "lifepo4" ? "LiFePO4" : "AGM";
    const useCase = useCaseLabels[inputs.useCase] || inputs.useCase;
    latestReport = buildReport(inputs, results);

    output.feedback.textContent = "Risultati aggiornati in tempo reale.";
    output.feedback.classList.remove("is-error");
    output.summary.textContent = `Stima per ${useCase}, sistema ${formatNumber(inputs.systemVoltage)} V, batteria ${batteryName}.`;
    output.adjustedDailyWh.textContent = `${formatNumber(results.adjustedDailyWh)} Wh/giorno`;
    output.batteryResult.textContent = `${formatNumber(results.batteryWh)} Wh`;
    output.batteryDetail.textContent = `${formatNumber(results.batteryAh)} Ah a ${formatNumber(inputs.systemVoltage)} V, ${batteryName}.`;
    output.pvResult.textContent = `${formatNumber(results.pvWp)} Wp`;
    output.inverterResult.textContent = `${formatNumber(results.inverterW)} W`;
    output.controllerResult.textContent = `${formatNumber(results.controllerA)} A`;
    output.controllerDetail.textContent = `Regolatore stimato per sistema ${formatNumber(inputs.systemVoltage)} V.`;
    output.marginResult.textContent = `x${formatDecimal(inputs.safetyMargin)}`;
    output.reportText.textContent = latestReport;
    output.practicalNotes.textContent = "Verifica sempre tensioni massime dei pannelli, corrente del regolatore, sezioni dei cavi, fusibili, ventilazione, temperatura e compatibilità con BMS o batterie.";
    output.disclaimer.textContent = "Disclaimer tecnico: questa è una stima preliminare e non sostituisce un progetto elettrico, una certificazione tecnica o una verifica normativa.";
  }

  async function copyResults() {
    if (!latestReport) {
      updateResults();
    }

    if (!latestReport) {
      output.feedback.textContent = "Non ci sono risultati validi da copiare.";
      output.feedback.classList.add("is-error");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(latestReport);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = latestReport;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      output.feedback.textContent = "Risultati copiati negli appunti.";
      output.feedback.classList.remove("is-error");
    } catch (error) {
      output.feedback.textContent = "Copia non riuscita: seleziona il mini report e copialo manualmente.";
      output.feedback.classList.add("is-error");
    }
  }

  function resetExample() {
    fields.useCase.value = defaults.useCase;
    fields.systemVoltage.value = String(defaults.systemVoltage);
    fields.dailyWh.value = String(defaults.dailyWh);
    fields.autonomyDays.value = String(defaults.autonomyDays);
    fields.peakSunHours.value = String(defaults.peakSunHours);
    fields.batteryType.value = defaults.batteryType;
    fields.maxDepthOfDischarge.value = String(defaults.maxDepthOfDischarge);
    fields.inverterLoadW.value = String(defaults.inverterLoadW);
    fields.safetyMargin.value = String(defaults.safetyMargin);
    updateResults();
  }

  fields.batteryType.addEventListener("change", () => {
    fields.maxDepthOfDischarge.value = String(batteryDepthDefaults[fields.batteryType.value]);
    updateResults();
  });

  for (const field of Object.values(fields)) {
    field.addEventListener("input", updateResults);
    field.addEventListener("change", updateResults);
  }

  output.copyButton.addEventListener("click", copyResults);
  output.printButton.addEventListener("click", () => window.print());
  output.resetButton.addEventListener("click", resetExample);

  updateResults();
})();
