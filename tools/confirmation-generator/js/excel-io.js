/**
 * Client-Side Excel (.xlsx / .xlsm / .xls / .csv) Template & Validation Engine
 * Powered strictly in browser memory by SheetJS (XLSX). No data leaves the device.
 */

const ExcelIO = {
  REQUIRED_HEADERS: [
    "Client ID",
    "Client Name",
    "Address",
    "Outstanding Amount",
    "As On Date"
  ],

  normalizeHeader(h) {
    return String(h || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  },

  resolveColumnMap(headers) {
    const map = {};
    const aliases = {
      clientId: ["clientid", "partyid", "code", "clientcode", "partycode", "id", "customercode", "vendorcode"],
      clientName: ["clientname", "partyname", "name", "customername", "vendorname", "organisation"],
      address: ["address", "clientaddress", "partyaddress", "location", "registeredaddress"],
      amount: ["outstandingamount", "amount", "balance", "ledgerbalance", "closingbalance", "receivableamount"],
      asOnDate: ["asondate", "date", "reportingdate", "balancedate", "confirmationdate"],
      balanceType: ["balancetype", "type", "drcr", "receivablepayable", "nature"],
      email: ["email", "emailid", "mail", "contactemail"],
      gstin: ["gstin", "gstno", "gst"]
    };

    headers.forEach((rawHeader, idx) => {
      const norm = this.normalizeHeader(rawHeader);
      if (!norm) return;
      for (const [key, list] of Object.entries(aliases)) {
        if (map[key] === undefined && list.includes(norm)) {
          map[key] = idx;
          break;
        }
      }
    });

    return map;
  },

  parseAmount(raw) {
    if (typeof raw === "number") {
      return Number.isFinite(raw) ? raw : null;
    }
    if (raw === null || raw === undefined) return null;
    let s = String(raw).trim();
    if (!s) return null;

    let negative = false;
    if (s.startsWith("(") && s.endsWith(")")) {
      negative = true;
      s = s.slice(1, -1).trim();
    }
    s = s.replace(/₹|INR|Rs\.?/gi, "").replace(/,/g, "").replace(/\s+/g, "");
    if (!s || isNaN(Number(s))) return null;
    const val = Number(s);
    if (!Number.isFinite(val)) return null;
    return negative ? -Math.abs(val) : val;
  },

  parseDate(raw) {
    if (raw === null || raw === undefined || raw === "") return null;

    // Excel date serial number (SheetJS or raw numeric)
    if (typeof raw === "number" && raw > 1000 && raw < 100000) {
      if (window.XLSX && XLSX.SSF && XLSX.SSF.parse_date_code) {
        const d = XLSX.SSF.parse_date_code(raw);
        if (d && d.y && d.m && d.d) {
          return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        }
      }
      const utcDays = Math.floor(raw - 25569);
      const dt = new Date(utcDays * 86400 * 1000);
      if (!isNaN(dt.getTime())) {
        return dt.toISOString().slice(0, 10);
      }
    }

    if (raw instanceof Date && !isNaN(raw.getTime())) {
      const y = raw.getFullYear();
      const m = String(raw.getMonth() + 1).padStart(2, "0");
      const d = String(raw.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const s = String(raw).trim();
    // YYYY-MM-DD
    const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (iso) {
      return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    }
    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
      const dd = Number(dmy[1]);
      const mm = Number(dmy[2]);
      const yyyy = Number(dmy[3]);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      }
    }
    // DD MMM YYYY e.g. 31 Oct 2026
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  },

  normalizeBalanceType(raw, fallbackType = "Receivable") {
    const s = String(raw || "").trim().toLowerCase();
    if (!s) return fallbackType;
    if (s.includes("pay") || s === "cr" || s.includes("credit") || s.includes("vendor")) return "Payable";
    if (s.includes("rec") || s === "dr" || s.includes("debit") || s.includes("cust")) return "Receivable";
    return fallbackType;
  },

  parseUploadedFile(file, defaultBalanceType = "Receivable") {
    return new Promise((resolve, reject) => {
      if (!window.XLSX) {
        reject(new Error("Excel engine is still loading. Please try again in a second."));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the selected file."));
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array", cellDates: false });
          const sheetName = workbook.SheetNames.includes("Client Master")
            ? "Client Master"
            : workbook.SheetNames[0];

          const sheet = workbook.Sheets[sheetName];
          const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });

          if (!aoa || aoa.length < 2) {
            reject(new Error("The uploaded file must contain a header row and at least one data row."));
            return;
          }

          const rawHeaders = aoa[0].map((h) => String(h || "").trim());
          const colMap = this.resolveColumnMap(rawHeaders);

          const requiredKeys = [
            { key: "clientId", label: "Client ID" },
            { key: "clientName", label: "Client Name" },
            { key: "address", label: "Address" },
            { key: "amount", label: "Outstanding Amount" },
            { key: "asOnDate", label: "As On Date" }
          ];

          const missing = requiredKeys.filter((rk) => colMap[rk.key] === undefined).map((rk) => rk.label);
          if (missing.length > 0) {
            reject(new Error(`Missing required column(s): ${missing.join(", ")}. Download our Excel Template to see the expected column names.`));
            return;
          }

          const seenIds = new Set();
          const rows = [];

          for (let i = 1; i < aoa.length; i++) {
            const rowArr = aoa[i];
            if (!rowArr || rowArr.every((cell) => String(cell ?? "").trim() === "")) {
              continue; // skip completely empty rows
            }

            const clientId = String(rowArr[colMap.clientId] ?? "").trim();
            const clientName = String(rowArr[colMap.clientName] ?? "").trim();
            const address = String(rowArr[colMap.address] ?? "").trim();
            const rawAmount = rowArr[colMap.amount];
            const rawDate = rowArr[colMap.asOnDate];
            const rawType = colMap.balanceType !== undefined ? rowArr[colMap.balanceType] : "";
            const email = colMap.email !== undefined ? String(rowArr[colMap.email] ?? "").trim() : "";
            const gstin = colMap.gstin !== undefined ? String(rowArr[colMap.gstin] ?? "").trim() : "";

            const parsedAmount = this.parseAmount(rawAmount);
            const parsedDate = this.parseDate(rawDate);

            const errors = [];
            if (!clientId) errors.push("Missing Client ID");
            if (!clientName) errors.push("Missing Client Name");
            if (!address) errors.push("Missing Address");
            if (parsedAmount === null) errors.push("Invalid Outstanding Amount");
            if (!parsedDate) errors.push("Invalid As On Date");

            let warning = "";
            if (clientId) {
              const idKey = clientId.toUpperCase();
              if (seenIds.has(idKey)) {
                warning = "Duplicate Client ID";
              } else {
                seenIds.add(idKey);
              }
            }

            rows.push({
              uid: `${i}_${Date.now()}`,
              rowNumber: i + 1,
              clientId: clientId || `ROW-${i + 1}`,
              clientName: clientName || "Unnamed Party",
              address,
              amount: parsedAmount !== null ? parsedAmount : 0,
              rawAmount,
              asOnDate: parsedDate || String(rawDate || ""),
              balanceType: this.normalizeBalanceType(rawType, defaultBalanceType),
              email,
              gstin,
              valid: errors.length === 0,
              errors,
              warning
            });
          }

          if (rows.length === 0) {
            reject(new Error("No non-empty data rows were found in the uploaded sheet."));
            return;
          }

          resolve({
            fileName: file.name,
            sheetName,
            rows,
            validCount: rows.filter((r) => r.valid).length,
            errorCount: rows.filter((r) => !r.valid).length
          });
        } catch (err) {
          reject(new Error(`Unable to parse spreadsheet: ${err.message || "Invalid file"}`));
        }
      };

      reader.readAsArrayBuffer(file);
    });
  },

  downloadExcelTemplate() {
    if (!window.XLSX) {
      alert("Excel library is still loading. Please try again.");
      return;
    }

    const sampleRows = [
      ["Client ID", "Client Name", "Address", "Outstanding Amount", "As On Date", "Balance Type (Optional)", "Email (Optional)", "GSTIN (Optional)"],
      ["CUST-1001", "Bharat Precision Fabricators LLP", "Andheri East, Mumbai, Maharashtra - 400069", 482650, "2026-10-31", "Receivable", "accounts@bharatprecision.example", "27AAACB1234F1Z2"],
      ["CUST-1002", "Bluecrest Engineering Solutions Pvt. Ltd.", "Hinjewadi Phase 1, Pune, Maharashtra - 411057", 1278500, "2026-10-31", "Receivable", "finance@bluecrest.example", "27AAACB5678G1Z9"],
      ["CUST-1003", "Everline Packaging Industries", "Sanand, Ahmedabad, Gujarat - 382110", 96320, "2026-10-31", "Receivable", "", ""],
      ["VEND-2001", "Marigold Pumps and Valves Pvt. Ltd.", "Ambattur Industrial Estate, Chennai, Tamil Nadu - 600058", 645000, "2026-10-31", "Payable", "ar@marigoldpumps.example", "33AAACM9012H1Z1"],
      ["CUST-1004", "Trident Industrial Automation LLP", "Peenya Industrial Area, Bengaluru, Karnataka - 560058", 2457800, "2026-10-31", "Receivable", "", ""]
    ];

    const instructions = [
      ["Balance Confirmation Letter Generator — Excel Upload Template"],
      [""],
      ["Privacy Notice", "This template is processed 100% inside your browser. Your data NEVER leaves your computer and is never uploaded to any server."],
      [""],
      ["Column Name", "Required?", "Format / Notes"],
      ["Client ID", "Yes", "Unique customer or vendor code (e.g. CUST-1001). Used in filename & Reference No."],
      ["Client Name", "Yes", "Full legal name of the customer/vendor."],
      ["Address", "Yes", "Full postal address shown under Addressee block."],
      ["Outstanding Amount", "Yes", "Numeric balance (e.g. 1278500). Automatically formatted in Indian ₹ numbering & words."],
      ["As On Date", "Yes", "Excel date, YYYY-MM-DD (2026-10-31), or DD-MM-YYYY (31-10-2026)."],
      ["Balance Type (Optional)", "No", "Receivable (Dr) or Payable (Cr). Defaults to the setting selected on the webpage."],
      ["Email (Optional)", "No", "Printed on addressee block if filled."],
      ["GSTIN (Optional)", "No", "Printed on addressee block if filled."]
    ];

    const wb = XLSX.utils.book_new();
    const wsMaster = XLSX.utils.aoa_to_sheet(sampleRows);
    wsMaster["!cols"] = [
      { wch: 14 }, { wch: 42 }, { wch: 48 }, { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsMaster, "Client Master");

    const wsGuide = XLSX.utils.aoa_to_sheet(instructions);
    wsGuide["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, "Instructions");

    XLSX.writeFile(wb, "Balance_Confirmation_Template.xlsx");
  },

  downloadSummaryReport(rows, settings, outputFormatLabel = "PDF & DOCX") {
    if (!window.XLSX) {
      alert("Excel library is still loading. Please try again.");
      return;
    }

    const totalValid = rows.filter((r) => r.valid).length;
    const totalError = rows.length - totalValid;
    const totalValue = rows.filter((r) => r.valid).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    const summarySheetData = [
      ["Balance Confirmation Batch Summary Report"],
      ["Generated On", new Date().toLocaleString("en-IN")],
      ["Sender Company", settings.companyName],
      ["Template Style", settings.templateMode === "sa505" ? "Statutory Audit SA 505" : "Corporate Confirmation"],
      ["Letter Date", LetterTemplates.formatDisplayDate(settings.letterDate)],
      ["Reference Prefix", settings.refPrefix],
      ["Total Uploaded / Loaded Rows", rows.length],
      ["Ready / Valid Letters", totalValid],
      ["Rows With Errors", totalError],
      ["Total Valid Outstanding Balance (₹)", totalValue],
      ["Output Formats Available", outputFormatLabel],
      ["Processing Mode", "100% Client-Side Browser Processing (Data Never Left Device)"]
    ];

    const logRows = [
      ["Client ID", "Client Name", "Reference No.", "Address", "As On Date", "Balance Type", "Amount (Numeric)", "Amount (Formatted)", "PDF Filename", "Word (.docx) Filename", "Validation Status"]
    ];

    rows.forEach((r) => {
      const f = LetterTemplates.getResolvedFields(r, settings);
      logRows.push([
        r.clientId,
        r.clientName,
        f.refNo,
        r.address,
        f.asOnDateFmt,
        f.shortType,
        r.valid ? Number(r.amount) : "",
        r.valid ? f.amountFmt : "",
        r.valid ? LetterTemplates.buildLetterFilename(r, "pdf") : "-",
        r.valid ? LetterTemplates.buildLetterFilename(r, "docx") : "-",
        r.valid ? (r.warning ? `Ready (${r.warning})` : "Ready") : `Error: ${r.errors.join("; ")}`
      ]);
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
    wsSummary["!cols"] = [{ wch: 34 }, { wch: 56 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Batch Summary");

    const wsLog = XLSX.utils.aoa_to_sheet(logRows);
    wsLog["!cols"] = [
      { wch: 14 }, { wch: 38 }, { wch: 24 }, { wch: 42 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 40 }, { wch: 40 }, { wch: 26 }
    ];
    XLSX.utils.book_append_sheet(wb, wsLog, "Letter Dispatch Log");

    const dateTag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Balance_Confirmation_Summary_${dateTag}.xlsx`);
  }
};
