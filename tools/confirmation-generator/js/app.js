/**
 * Balance Confirmation Studio Controller
 * 100% Client-Side: Excel parsing, PDF/DOCX rendering, and ZIP bundling stay strictly inside browser memory.
 */

const ConfirmationStudio = {
  SENDER_STORAGE_KEY: "caashish_conf_sender_v1",
  settings: null,
  parties: [],
  activeTab: "draft",
  previewMode: "sample", // "sample" | "placeholder"
  searchQuery: "",
  statusFilter: "all",
  isBusy: false,

  init() {
    this.settings = this.loadSavedSettings();
    this.bindSettingsToInputs();
    this.loadSampleData(false, false);
    this.bindEvents();
    this.renderLetterheadSummary();
    this.renderDraftPreview();
    this.renderQueue();
    this.switchTab("draft");
    PdfBuilder.ensureFonts();
  },

  loadSavedSettings() {
    const base = { ...LetterTemplates.DEFAULT_SETTINGS };
    try {
      const raw = localStorage.getItem(this.SENDER_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...base, ...saved, rememberSender: true };
      }
    } catch (_) {}
    return { ...base, rememberSender: false };
  },

  resetSettings() {
    this.settings = { ...LetterTemplates.DEFAULT_SETTINGS, rememberSender: false };
    try {
      localStorage.removeItem(this.SENDER_STORAGE_KEY);
    } catch (_) {}
    this.bindSettingsToInputs();
    this.renderLetterheadSummary();
    this.renderDraftPreview();
    this.showToast("Letterhead settings reset to default.");
  },

  persistSenderIfEnabled() {
    const chk = document.getElementById("rememberSenderToggle");
    if (chk && chk.checked) {
      const toSave = { ...this.settings };
      delete toSave.rememberSender;
      try {
        localStorage.setItem(this.SENDER_STORAGE_KEY, JSON.stringify(toSave));
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem(this.SENDER_STORAGE_KEY);
      } catch (_) {}
    }
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll(".ws-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    ["draft", "output"].forEach((name) => {
      document.getElementById(`view-${name}`)?.classList.toggle("active", name === tabName);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  openModal(modalId) {
    document.getElementById(modalId)?.classList.remove("hidden");
  },

  renderLetterheadSummary() {
    const s = this.settings;
    const badge = document.getElementById("summaryCoBadge");
    if (badge) {
      if (s.logoDataUrl) {
        badge.innerHTML = `<img src="${s.logoDataUrl}" alt="Logo">`;
      } else {
        badge.textContent = (s.companyName || "CO").slice(0, 2).toUpperCase();
      }
    }
    const nameEl = document.getElementById("summaryCoName");
    if (nameEl) nameEl.textContent = s.companyName || "Your Company Name";
    const subEl = document.getElementById("summaryCoDeptEmail");
    if (subEl) subEl.textContent = [s.companyDept, s.companyEmail].filter(Boolean).join(" · ");
    const refEl = document.getElementById("summaryRefPrefix");
    if (refEl) refEl.textContent = s.refPrefix || "AR/CONF";
    const sigEl = document.getElementById("summarySignatory");
    if (sigEl) sigEl.textContent = s.signatoryName || "Authorized Signatory";

    const audLine = document.getElementById("summaryAuditorLine");
    const audName = document.getElementById("summaryAuditor");
    if (audLine && audName) {
      audLine.classList.toggle("hidden", s.templateMode !== "sa505");
      audName.textContent = s.auditorName || "Statutory Auditors";
    }
  },

  bindSettingsToInputs() {
    const keys = [
      "templateMode",
      "companyName",
      "companyDept",
      "companyAddress",
      "companyTaxId",
      "companyEmail",
      "auditorName",
      "auditorEmail",
      "refPrefix",
      "letterDate",
      "responseDays",
      "signatoryName",
      "signatoryTitle",
      "defaultBalanceType"
    ];

    keys.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = this.settings[id] || "";
    });

    const tear = document.getElementById("includeTearOff");
    if (tear) tear.checked = Boolean(this.settings.includeTearOff);

    const rem = document.getElementById("rememberSenderToggle");
    if (rem) rem.checked = Boolean(this.settings.rememberSender);

    this.toggleAuditorFields();
    this.updateLogoStatus();
  },

  toggleAuditorFields() {
    const audWrap = document.getElementById("auditorFieldsWrap");
    if (audWrap) {
      audWrap.classList.toggle("hidden", this.settings.templateMode !== "sa505");
    }
  },

  updateLogoStatus() {
    const badge = document.getElementById("logoStatusBadge");
    const clearBtn = document.getElementById("clearLogoBtn");
    if (!badge || !clearBtn) return;
    if (this.settings.logoDataUrl) {
      badge.textContent = "Logo attached";
      clearBtn.classList.remove("hidden");
    } else {
      badge.textContent = "Optional PNG / JPG";
      clearBtn.classList.add("hidden");
    }
  },

  bindEvents() {
    const inputMap = [
      "templateMode",
      "companyName",
      "companyDept",
      "companyAddress",
      "companyTaxId",
      "companyEmail",
      "auditorName",
      "auditorEmail",
      "refPrefix",
      "letterDate",
      "responseDays",
      "signatoryName",
      "signatoryTitle",
      "defaultBalanceType"
    ];

    inputMap.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const sync = () => {
        this.settings[id] = el.value;
        if (id === "templateMode") this.toggleAuditorFields();
        this.persistSenderIfEnabled();
        this.renderLetterheadSummary();
        this.renderDraftPreview();
        this.renderQueue();
      };
      el.addEventListener("input", sync);
      el.addEventListener("change", sync);
    });

    document.getElementById("includeTearOff")?.addEventListener("change", (e) => {
      this.settings.includeTearOff = e.target.checked;
      this.persistSenderIfEnabled();
      this.renderDraftPreview();
    });

    document.getElementById("rememberSenderToggle")?.addEventListener("change", () => {
      this.persistSenderIfEnabled();
    });

    document.getElementById("logoUploadInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        alert("Please select a logo image smaller than 1 MB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.settings.logoDataUrl = ev.target.result;
        this.updateLogoStatus();
        this.persistSenderIfEnabled();
        this.renderLetterheadSummary();
        this.renderDraftPreview();
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("clearLogoBtn")?.addEventListener("click", () => {
      this.settings.logoDataUrl = "";
      const inp = document.getElementById("logoUploadInput");
      if (inp) inp.value = "";
      this.updateLogoStatus();
      this.persistSenderIfEnabled();
      this.renderLetterheadSummary();
      this.renderDraftPreview();
    });

    const dropzone = document.getElementById("excelDropzone");
    const fileInput = document.getElementById("excelFileInput");

    if (dropzone && fileInput) {
      dropzone.addEventListener("click", () => fileInput.click());
      dropzone.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInput.click();
        }
      });

      ["dragenter", "dragover"].forEach((evt) => {
        dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropzone.classList.add("is-dragover");
        });
      });

      ["dragleave", "drop"].forEach((evt) => {
        dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropzone.classList.remove("is-dragover");
        });
      });

      dropzone.addEventListener("drop", (e) => {
        const f = e.dataTransfer?.files?.[0];
        if (f) this.handleSpreadsheetUpload(f);
      });

      fileInput.addEventListener("change", (e) => {
        const f = e.target.files?.[0];
        if (f) this.handleSpreadsheetUpload(f);
        e.target.value = "";
      });
    }

    document.getElementById("queueSearchInput")?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderQueue();
    });

    document.getElementById("queueFilterSelect")?.addEventListener("change", (e) => {
      this.statusFilter = e.target.value;
      this.renderQueue();
    });

    ["previewModal", "partyModal", "uploadModal", "letterheadModal"].forEach((modalId) => {
      document.getElementById(modalId)?.addEventListener("click", (e) => {
        if (e.target.id === modalId) this.closeModal(modalId);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ["previewModal", "partyModal", "uploadModal", "letterheadModal"].forEach((m) => this.closeModal(m));
      }
    });
  },

  setPreviewMode(mode) {
    this.previewMode = mode;
    document.getElementById("btnPreviewSample")?.classList.toggle("active", mode === "sample");
    document.getElementById("btnPreviewPlaceholder")?.classList.toggle("active", mode === "placeholder");
    this.renderDraftPreview();
  },

  getDraftPreviewParty() {
    if (this.previewMode === "placeholder") {
      return LetterTemplates.PLACEHOLDER_PARTY;
    }
    const firstValid = this.parties.find((p) => p.valid);
    return firstValid || {
      clientId: "CUST-1002",
      clientName: "Bluecrest Engineering Solutions Pvt. Ltd.",
      address: "Hinjewadi Phase 1, Pune, Maharashtra - 411057",
      amount: 1278500,
      asOnDate: "2026-10-31",
      balanceType: this.settings.defaultBalanceType || "Receivable",
      email: "finance@bluecrest.example",
      gstin: "27AAACB5678G1Z9"
    };
  },

  renderDraftPreview() {
    const container = document.getElementById("draftPreviewSheet");
    if (!container) return;
    container.innerHTML = LetterTemplates.renderLetterHtml(this.getDraftPreviewParty(), this.settings);
  },

  loadSampleData(notify = true, openOutputTab = false) {
    this.parties = LetterTemplates.SAMPLE_24.map((row, idx) => ({
      uid: `sample_${idx + 1}`,
      rowNumber: idx + 2,
      ...row,
      balanceType: this.settings.defaultBalanceType || row.balanceType,
      valid: true,
      errors: [],
      warning: ""
    }));
    this.setDatasetLabel("24 Sample Clients loaded locally · Ready for PDF, Word (.docx), ZIP & Excel export");
    this.updateUploadBanner("Loaded 24 Sample Clients locally (zero server communication).", true);
    this.renderDraftPreview();
    this.renderQueue();
    if (notify) {
      this.showToast("Loaded 24 sample clients locally in your browser.");
    }
    if (openOutputTab) {
      this.closeModal("uploadModal");
      this.switchTab("output");
    }
  },

  setDatasetLabel(text) {
    const el = document.getElementById("datasetSourceLabel");
    if (el) el.textContent = text;
  },

  async handleSpreadsheetUpload(file) {
    try {
      const result = await ExcelIO.parseUploadedFile(file, this.settings.defaultBalanceType || "Receivable");
      this.parties = result.rows;
      const summaryText = `Loaded "${result.fileName}" (Sheet: ${result.sheetName}) — ${result.validCount} ready, ${result.errorCount} need attention`;
      this.updateUploadBanner(summaryText, result.errorCount === 0);
      this.setDatasetLabel(`${summaryText} · Processed 100% locally`);
      this.renderDraftPreview();
      this.renderQueue();
      this.showToast(`Parsed ${result.rows.length} rows locally. Data never left your device.`);
      this.closeModal("uploadModal");
      this.switchTab("output");
    } catch (err) {
      this.updateUploadBanner(err.message, false);
      alert(err.message);
    }
  },

  updateUploadBanner(msg, ok = true) {
    const banner = document.getElementById("uploadStatusBanner");
    if (!banner) return;
    banner.classList.remove("hidden", "status-ok", "status-warn");
    banner.classList.add(ok ? "status-ok" : "status-warn");
    banner.textContent = msg;
  },

  openPartyModal(uid) {
    const modal = document.getElementById("partyModal");
    const title = document.getElementById("partyModalTitle");
    const existing = uid ? this.parties.find((p) => p.uid === uid) : null;

    document.getElementById("editPartyUid").value = existing ? existing.uid : "";
    title.textContent = existing ? `Edit Party — ${existing.clientId}` : "Add New Party";

    document.getElementById("pmClientId").value = existing ? existing.clientId : `CUST-${1001 + this.parties.length}`;
    document.getElementById("pmAsOnDate").value = existing ? existing.asOnDate : (this.settings.letterDate || "2026-10-31");
    document.getElementById("pmClientName").value = existing ? existing.clientName : "";
    document.getElementById("pmAddress").value = existing ? existing.address : "";
    document.getElementById("pmAmount").value = existing ? existing.amount : "";
    document.getElementById("pmBalanceType").value = existing ? (existing.balanceType || "Receivable") : (this.settings.defaultBalanceType || "Receivable");
    document.getElementById("pmEmail").value = existing ? (existing.email || "") : "";
    document.getElementById("pmGstin").value = existing ? (existing.gstin || "") : "";

    modal.classList.remove("hidden");
  },

  savePartyModal(e) {
    e.preventDefault();
    const uid = document.getElementById("editPartyUid").value;
    const clientId = document.getElementById("pmClientId").value.trim();
    const asOnDate = document.getElementById("pmAsOnDate").value;
    const clientName = document.getElementById("pmClientName").value.trim();
    const address = document.getElementById("pmAddress").value.trim();
    const amount = ExcelIO.parseAmount(document.getElementById("pmAmount").value);
    const balanceType = document.getElementById("pmBalanceType").value;
    const email = document.getElementById("pmEmail").value.trim();
    const gstin = document.getElementById("pmGstin").value.trim().toUpperCase();

    const errors = [];
    if (!clientId) errors.push("Missing Client ID");
    if (!clientName) errors.push("Missing Client Name");
    if (!address) errors.push("Missing Address");
    if (amount === null) errors.push("Invalid Amount");
    if (!asOnDate) errors.push("Invalid Date");

    const updated = {
      uid: uid || `manual_${Date.now()}`,
      rowNumber: 1,
      clientId,
      clientName,
      address,
      amount: amount !== null ? amount : 0,
      asOnDate,
      balanceType,
      email,
      gstin,
      valid: errors.length === 0,
      errors,
      warning: ""
    };

    if (uid) {
      const idx = this.parties.findIndex((p) => p.uid === uid);
      if (idx !== -1) this.parties[idx] = updated;
    } else {
      this.parties.unshift(updated);
    }

    this.closeModal("partyModal");
    this.renderDraftPreview();
    this.renderQueue();
    this.showToast(uid ? `Updated ${clientId}.` : `Added ${clientId} locally.`);
  },

  removeParty(uid) {
    const idx = this.parties.findIndex((p) => p.uid === uid);
    if (idx === -1) return;
    const [removed] = this.parties.splice(idx, 1);
    this.renderQueue();
    this.renderDraftPreview();
    this.showToast(`Removed ${removed.clientId || "party"}`, "Undo", () => {
      this.parties.splice(idx, 0, removed);
      this.renderQueue();
      this.renderDraftPreview();
    });
  },

  clearParties() {
    if (this.parties.length === 0) return;
    if (confirm("Clear all loaded party rows from browser memory?")) {
      this.parties = [];
      document.getElementById("uploadStatusBanner")?.classList.add("hidden");
      this.setDatasetLabel("No rows loaded · Upload an Excel file or load sample clients");
      this.renderQueue();
      this.renderDraftPreview();
    }
  },

  updateKpis() {
    const total = this.parties.length;
    const valid = this.parties.filter((p) => p.valid);
    const errCount = total - valid.length;
    const totalValue = valid.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    document.getElementById("kpiTotalRows").textContent = total;
    document.getElementById("kpiReadyRows").textContent = valid.length;
    document.getElementById("kpiErrorRows").textContent = errCount;
    document.getElementById("kpiTotalValue").textContent = LetterTemplates.formatIndianAmount(totalValue);

    const badge = document.getElementById("navOutputBadge");
    if (badge) badge.textContent = valid.length;
    const tab1Sum = document.getElementById("tab1DatasetSummary");
    if (tab1Sum) {
      tab1Sum.textContent = total === 0
        ? "No data loaded yet"
        : `${valid.length} of ${total} parties ready`;
    }
  },

  renderQueue() {
    this.updateKpis();
    const tbody = document.getElementById("queueTableBody");
    if (!tbody) return;

    const filtered = this.parties.filter((p) => {
      if (this.statusFilter === "ready" && !p.valid) return false;
      if (this.statusFilter === "error" && p.valid) return false;
      if (this.searchQuery) {
        const hay = `${p.clientId} ${p.clientName} ${p.address}`.toLowerCase();
        if (!hay.includes(this.searchQuery)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table-cell">
            ${this.parties.length === 0
              ? 'No party rows loaded yet. Upload your Excel sheet in Tab 2 or click "+ Add Party".'
              : "No rows match your current search/filter."}
          </td>
        </tr>`;
      return;
    }

    const esc = (v) => LetterTemplates.escapeHtml(v);

    tbody.innerHTML = filtered.map((p) => {
      const statusHtml = p.valid
        ? `<span class="row-pill ok">${p.warning ? `Ready (${esc(p.warning)})` : "Ready"}</span>`
        : `<span class="row-pill err" title="${esc(p.errors.join(", "))}">${esc(p.errors[0] || "Error")}</span>`;

      const isPayable = (p.balanceType || "").toLowerCase().includes("payable");
      const dateDisplay = LetterTemplates.formatDisplayDate(p.asOnDate) || "-";
      const amtDisplay = LetterTemplates.formatIndianAmount(p.amount);

      return `
        <tr data-uid="${esc(p.uid)}" class="${p.valid ? "" : "row-has-error"}">
          <td><span class="id-chip">${esc(p.clientId)}</span></td>
          <td>
            <div class="party-name-cell">${esc(p.clientName)}</div>
            <div class="party-addr-cell" title="${esc(p.address)}">${esc(p.address)}</div>
          </td>
          <td class="mono-date">${esc(dateDisplay)}</td>
          <td><span class="nature-pill ${isPayable ? "pay" : "rec"}">${isPayable ? "Payable" : "Receivable"}</span></td>
          <td class="amount-cell">${esc(amtDisplay)}</td>
          <td>${statusHtml}</td>
          <td class="actions-cell">
            <button type="button" class="btn btn-xs btn-soft" onclick="ConfirmationStudio.previewSingle('${esc(p.uid)}')" ${p.valid ? "" : "disabled"}>Preview</button>
            <button type="button" class="btn btn-xs btn-secondary" onclick="ConfirmationStudio.openPartyModal('${esc(p.uid)}')">Edit</button>
            <button type="button" class="btn btn-xs btn-secondary" onclick="ConfirmationStudio.downloadSinglePdf('${esc(p.uid)}')" ${p.valid ? "" : "disabled"}>PDF</button>
            <button type="button" class="btn btn-xs btn-secondary" onclick="ConfirmationStudio.downloadSingleDocx('${esc(p.uid)}')" ${p.valid ? "" : "disabled"}>Word</button>
            <button type="button" class="btn btn-xs btn-danger-ghost" title="Remove row" onclick="ConfirmationStudio.removeParty('${esc(p.uid)}')">&#10005;</button>
          </td>
        </tr>`;
    }).join("");
  },

  triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  },

  async downloadDraft(format) {
    const party = this.getDraftPreviewParty();
    try {
      if (format === "pdf") {
        const blob = await PdfBuilder.buildLetterPdfBlob(party, this.settings);
        this.triggerBlobDownload(blob, "Draft_Balance_Confirmation_Template.pdf");
      } else {
        const blob = await DocxBuilder.buildLetterDocxBlob(party, this.settings);
        this.triggerBlobDownload(blob, "Draft_Balance_Confirmation_Template.docx");
      }
    } catch (err) {
      alert(`Could not generate draft ${format.toUpperCase()}: ${err.message}`);
    }
  },

  async downloadSinglePdf(uid) {
    const party = this.parties.find((p) => p.uid === uid && p.valid);
    if (!party) return;
    try {
      const blob = await PdfBuilder.buildLetterPdfBlob(party, this.settings);
      this.triggerBlobDownload(blob, LetterTemplates.buildLetterFilename(party, "pdf"));
    } catch (err) {
      alert(`PDF generation error: ${err.message}`);
    }
  },

  async downloadSingleDocx(uid) {
    const party = this.parties.find((p) => p.uid === uid && p.valid);
    if (!party) return;
    try {
      const blob = await DocxBuilder.buildLetterDocxBlob(party, this.settings);
      this.triggerBlobDownload(blob, LetterTemplates.buildLetterFilename(party, "docx"));
    } catch (err) {
      alert(`Word generation error: ${err.message}`);
    }
  },

  setProgress(visible, done = 0, total = 0, text = "") {
    const wrap = document.getElementById("batchProgressWrap");
    const bar = document.getElementById("batchProgressBar");
    const label = document.getElementById("batchProgressText");
    const pctEl = document.getElementById("batchProgressPct");
    if (!wrap || !bar || !label) return;
    if (!visible) {
      wrap.classList.add("hidden");
      return;
    }
    wrap.classList.remove("hidden");
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    bar.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    label.textContent = text || `Generating ${done} of ${total}...`;
  },

  async downloadAllZip(format) {
    if (this.isBusy) return;
    if (!window.JSZip) {
      alert("ZIP engine is still loading. Please try again.");
      return;
    }
    const validParties = this.parties.filter((p) => p.valid);
    if (validParties.length === 0) {
      alert("No valid party rows available to generate.");
      return;
    }

    this.isBusy = true;
    const ext = format === "docx" ? "docx" : "pdf";
    this.setProgress(true, 0, validParties.length, `Starting ${ext.toUpperCase()} bundle...`);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`Balance_Confirmations_${ext.toUpperCase()}`);
      const usedNames = new Map();

      for (let i = 0; i < validParties.length; i++) {
        const party = validParties[i];
        let filename = LetterTemplates.buildLetterFilename(party, ext);
        if (usedNames.has(filename)) {
          const count = usedNames.get(filename) + 1;
          usedNames.set(filename, count);
          const stem = filename.slice(0, -(ext.length + 1));
          filename = `${stem} (${count}).${ext}`;
        } else {
          usedNames.set(filename, 1);
        }

        const blob = ext === "pdf"
          ? await PdfBuilder.buildLetterPdfBlob(party, this.settings)
          : await DocxBuilder.buildLetterDocxBlob(party, this.settings);

        folder.file(filename, blob);
        this.setProgress(true, i + 1, validParties.length, `Generated ${i + 1} of ${validParties.length} ${ext.toUpperCase()} files locally...`);

        if (i % 3 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      this.setProgress(true, validParties.length, validParties.length, "Packing ZIP archive in browser...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const dateTag = new Date().toISOString().slice(0, 10);
      this.triggerBlobDownload(zipBlob, `Balance_Confirmations_${ext.toUpperCase()}_${dateTag}.zip`);
      this.showToast(`Downloaded ${validParties.length} ${ext.toUpperCase()} letters inside ZIP.`);
    } catch (err) {
      alert(`Batch ZIP generation failed: ${err.message}`);
    } finally {
      this.isBusy = false;
      setTimeout(() => this.setProgress(false), 1800);
    }
  },

  downloadSummaryExcel() {
    if (this.parties.length === 0) {
      alert("Load or upload party data first.");
      return;
    }
    ExcelIO.downloadSummaryReport(this.parties, this.settings);
  },

  previewList: [],
  previewIndex: 0,

  previewSingle(uid) {
    this.previewList = this.parties.filter((p) => p.valid).map((p) => p.uid);
    this.previewIndex = Math.max(0, this.previewList.indexOf(uid));
    this.renderPreviewModalLetter();
    document.getElementById("previewModal").classList.remove("hidden");
  },

  stepPreview(delta) {
    if (!this.previewList.length) return;
    this.previewIndex = (this.previewIndex + delta + this.previewList.length) % this.previewList.length;
    this.renderPreviewModalLetter();
  },

  renderPreviewModalLetter() {
    const uid = this.previewList[this.previewIndex];
    const party = this.parties.find((p) => p.uid === uid && p.valid);
    if (!party) return;

    const body = document.getElementById("modalLettersContainer");
    const title = document.getElementById("modalTitle");
    const sub = document.getElementById("modalSubtitle");
    const pdfBtn = document.getElementById("modalDownloadPdfBtn");
    const docxBtn = document.getElementById("modalDownloadDocxBtn");
    const navGroup = document.getElementById("modalNavGroup");
    const navCounter = document.getElementById("modalNavCounter");

    title.textContent = `${party.clientId} — ${party.clientName}`;
    sub.textContent = "Ready for PDF / Word export or A4 print (generated locally in browser)";
    body.innerHTML = `<div class="modal-sheet-wrap">${LetterTemplates.renderLetterHtml(party, this.settings)}</div>`;

    if (navGroup && navCounter) {
      navGroup.classList.remove("hidden");
      navCounter.textContent = `${this.previewIndex + 1} / ${this.previewList.length}`;
    }

    pdfBtn.classList.remove("hidden");
    docxBtn.classList.remove("hidden");
    pdfBtn.onclick = () => this.downloadSinglePdf(party.uid);
    docxBtn.onclick = () => this.downloadSingleDocx(party.uid);
  },

  openPrintAllModal() {
    const validParties = this.parties.filter((p) => p.valid);
    if (validParties.length === 0) {
      alert("No valid party rows available to print.");
      return;
    }
    const modal = document.getElementById("previewModal");
    const body = document.getElementById("modalLettersContainer");
    const title = document.getElementById("modalTitle");
    const sub = document.getElementById("modalSubtitle");
    const pdfBtn = document.getElementById("modalDownloadPdfBtn");
    const docxBtn = document.getElementById("modalDownloadDocxBtn");
    const navGroup = document.getElementById("modalNavGroup");

    title.textContent = `Batch Print View (${validParties.length} Letters)`;
    sub.textContent = "Press Print to save multi-page PDF or print all letters to paper";
    body.innerHTML = validParties
      .map((p) => `<div class="modal-sheet-wrap print-page-break">${LetterTemplates.renderLetterHtml(p, this.settings)}</div>`)
      .join("");

    navGroup?.classList.add("hidden");
    pdfBtn.classList.add("hidden");
    docxBtn.classList.add("hidden");
    modal.classList.remove("hidden");
  },

  closeModal(modalId = "previewModal") {
    document.getElementById(modalId)?.classList.add("hidden");
  },

  showToast(message, actionLabel = "", actionFn = null) {
    const toast = document.getElementById("studioToast");
    if (!toast) return;
    toast.innerHTML = "";
    const span = document.createElement("span");
    span.textContent = message;
    toast.appendChild(span);
    if (actionLabel && typeof actionFn === "function") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toast-undo-btn";
      btn.textContent = actionLabel;
      btn.onclick = () => {
        actionFn();
        toast.classList.add("hidden");
      };
      toast.appendChild(btn);
    }
    toast.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.add("hidden");
    }, actionLabel ? 5500 : 3600);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  ConfirmationStudio.init();
});
