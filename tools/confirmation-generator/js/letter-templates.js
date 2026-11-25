/**
 * Letter Templates, Formatters & 24-Client Sample Dataset
 * Zero external network calls; runs 100% locally in browser memory.
 */

const LetterTemplates = {
  SAMPLE_24: [
    { clientId: "CUST-1001", clientName: "Bharat Precision Fabricators LLP", address: "Andheri East, Mumbai, Maharashtra - 400069", amount: 482650, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1002", clientName: "Bluecrest Engineering Solutions Pvt. Ltd.", address: "Hinjewadi Phase 1, Pune, Maharashtra - 411057", amount: 1278500, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1003", clientName: "Everline Packaging Industries", address: "Sanand, Ahmedabad, Gujarat - 382110", amount: 96320, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1004", clientName: "Trident Industrial Automation LLP", address: "Peenya Industrial Area, Bengaluru, Karnataka - 560058", amount: 2457800, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1005", clientName: "Silverpeak Auto Components Pvt. Ltd.", address: "MIDC Satpur, Nashik, Maharashtra - 422007", amount: 384950, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1006", clientName: "Apex Material Handling Systems", address: "Balanagar, Hyderabad, Telangana - 500037", amount: 752600, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1007", clientName: "Marigold Pumps and Valves Pvt. Ltd.", address: "Ambattur Industrial Estate, Chennai, Tamil Nadu - 600058", amount: 1834150, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1008", clientName: "Pinnacle Tooling Services LLP", address: "Udyog Vihar Phase 4, Gurugram, Haryana - 122015", amount: 219875, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1009", clientName: "Summit Electrical Equipments Pvt. Ltd.", address: "Vashi, Navi Mumbai, Maharashtra - 400703", amount: 688240, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1010", clientName: "Eastline Infrastructure Equipment LLP", address: "Bhubaneswar, Odisha - 751010", amount: 3468900, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1011", clientName: "Orion Process Controls Pvt. Ltd.", address: "Mahape, Navi Mumbai, Maharashtra - 400710", amount: 172450, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1012", clientName: "Metroline Industrial Projects", address: "Pithampur, Dhar, Madhya Pradesh - 454775", amount: 915780, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1013", clientName: "Valence Machinery Works Pvt. Ltd.", address: "Manesar, Gurugram, Haryana - 122051", amount: 458250, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1014", clientName: "Nexora Metal Processing LLP", address: "Hosur, Tamil Nadu - 635109", amount: 2316480, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1015", clientName: "Riverstone Manufacturing Solutions", address: "Vatva GIDC, Ahmedabad, Gujarat - 382445", amount: 124560, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1016", clientName: "Northfield Pneumatics Pvt. Ltd.", address: "Whitefield, Bengaluru, Karnataka - 560066", amount: 1498750, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1017", clientName: "Lighthouse Mechanical Systems LLP", address: "Thane West, Maharashtra - 400604", amount: 786300, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1018", clientName: "Delta Forge Industrial Services", address: "Faridabad, Haryana - 121006", amount: 206985, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1019", clientName: "Crownline Speciality Components", address: "Vapi GIDC, Gujarat - 396195", amount: 564370, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1020", clientName: "Westbridge Fabrication Technologies", address: "Chakan MIDC, Pune, Maharashtra - 410501", amount: 3275400, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1021", clientName: "Indigo Industrial Equipment LLP", address: "Jeedimetla, Hyderabad, Telangana - 500055", amount: 113280, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1022", clientName: "Prism Mechanical Assemblies Pvt. Ltd.", address: "SIPCOT Industrial Park, Sriperumbudur, Tamil Nadu - 602105", amount: 1486900, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1023", clientName: "Harbourline Process Engineering LLP", address: "Panvel, Raigad, Maharashtra - 410206", amount: 629450, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" },
    { clientId: "CUST-1024", clientName: "Coraltech Industrial Products", address: "Kundli, Sonipat, Haryana - 131028", amount: 257849, asOnDate: "2026-10-31", balanceType: "Receivable", email: "", gstin: "" }
  ],

  DEFAULT_SETTINGS: {
    templateMode: "corporate", // "corporate" | "sa505"
    companyName: "Asterline Industrial Components Pvt. Ltd.",
    companyDept: "Finance & Accounts Receivable",
    companyAddress: "Plot 42, Commercial Tower, BKC, Mumbai, Maharashtra - 400051",
    companyEmail: "finance@asterline.example",
    companyTaxId: "GSTIN: 27AABCA1234F1Z5 | CIN: U29100MH2018PTC123456",
    auditorName: "Tripathi & Associates, Chartered Accountants",
    auditorEmail: "audit@caashishtripathi.in",
    refPrefix: "AR/CONF/2026-27",
    letterDate: new Date().toISOString().slice(0, 10),
    responseDays: "7 working days",
    signatoryName: "Accounts Receivable Team",
    signatoryTitle: "Finance & Accounts Department",
    defaultBalanceType: "Receivable",
    includeTearOff: true,
    logoDataUrl: ""
  },

  PLACEHOLDER_PARTY: {
    clientId: "{{Client ID}}",
    clientName: "{{Client Name}}",
    address: "{{Address}}",
    amount: "{{Outstanding Amount}}",
    asOnDate: "{{As On Date}}",
    balanceType: "Receivable",
    email: "{{Email}}",
    gstin: "{{GSTIN}}",
    isPlaceholder: true
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  formatIndianAmount(num) {
    if (num === null || num === undefined || num === "") return "₹0.00";
    if (typeof num === "string" && num.includes("{{")) return num;
    const parsed = Number(num);
    if (!Number.isFinite(parsed)) return "₹0.00";

    const negative = parsed < 0;
    const absVal = Math.abs(parsed);
    const parts = absVal.toFixed(2).split(".");
    let intPart = parts[0];
    const decPart = parts[1];

    if (intPart.length > 3) {
      const lastThree = intPart.slice(-3);
      const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
      intPart = `${rest},${lastThree}`;
    }

    return `${negative ? "-₹" : "₹"}${intPart}.${decPart}`;
  },

  numberToIndianWords(n) {
    if (typeof n === "string" && n.includes("{{")) return "{{Amount in Words}}";
    const parsed = Number(n);
    if (!Number.isFinite(parsed)) return "Zero Rupees Only";
    if (Math.abs(parsed) < 0.005) return "Zero Rupees Only";

    const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const dbl = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const under1000 = (num) => {
      let s = "";
      if (num >= 100) {
        s += single[Math.floor(num / 100)] + " Hundred ";
        num %= 100;
      }
      if (num >= 10 && num <= 19) {
        s += dbl[num - 10] + " ";
      } else if (num >= 20) {
        s += tens[Math.floor(num / 10)] + " ";
        if (num % 10 > 0) s += single[num % 10] + " ";
      } else if (num > 0) {
        s += single[num] + " ";
      }
      return s;
    };

    const absVal = Math.abs(parsed);
    let intVal = Math.floor(absVal);
    const paise = Math.round((absVal - intVal) * 100);

    const crore = Math.floor(intVal / 10000000);
    intVal %= 10000000;
    const lakh = Math.floor(intVal / 100000);
    intVal %= 100000;
    const thousand = Math.floor(intVal / 1000);
    intVal %= 1000;
    const rem = intVal;

    let words = "";
    if (crore > 0) words += under1000(crore) + "Crore ";
    if (lakh > 0) words += under1000(lakh) + "Lakh ";
    if (thousand > 0) words += under1000(thousand) + "Thousand ";
    if (rem > 0) words += under1000(rem);

    words = words.trim() || "Zero";
    let result = `Rupees ${words}`;
    if (paise > 0) {
      result += ` and ${under1000(paise).trim()} Paise`;
    }
    return `${parsed < 0 ? "Minus " : ""}${result} Only`;
  },

  formatDisplayDate(val) {
    if (!val) return "";
    if (typeof val === "string" && val.includes("{{")) return val;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (val instanceof Date && !isNaN(val.getTime())) {
      const dd = String(val.getDate()).padStart(2, "0");
      const mmm = months[val.getMonth()];
      const yyyy = val.getFullYear();
      return `${dd} ${mmm} ${yyyy}`;
    }

    const str = String(val).trim();
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const y = Number(isoMatch[1]);
      const m = Number(isoMatch[2]) - 1;
      const d = Number(isoMatch[3]);
      if (m >= 0 && m < 12) {
        return `${String(d).padStart(2, "0")} ${months[m]} ${y}`;
      }
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, "0");
      const mmm = months[parsed.getMonth()];
      const yyyy = parsed.getFullYear();
      return `${dd} ${mmm} ${yyyy}`;
    }

    return str;
  },

  sanitizeFilename(name) {
    return String(name || "Letter")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "Letter";
  },

  buildLetterFilename(party, ext) {
    const id = this.sanitizeFilename(party.clientId || "PARTY");
    const name = this.sanitizeFilename(party.clientName || "Confirmation");
    return `${id} - ${name}.${ext}`;
  },

  getResolvedFields(party, settings) {
    const isPh = Boolean(party.isPlaceholder);
    const balType = party.balanceType || settings.defaultBalanceType || "Receivable";
    const isPayable = balType.toLowerCase().includes("payable") || balType.toLowerCase() === "cr";
    const drCrLabel = isPayable ? "Credit / Payable" : "Debit / Receivable";
    const shortType = isPayable ? "Payable" : "Receivable";

    const refNo = isPh
      ? `${settings.refPrefix || "CONF"}/{{Client ID}}`
      : `${settings.refPrefix || "CONF"}/${party.clientId}`;

    const letterDateFmt = isPh ? "{{Letter Date}}" : this.formatDisplayDate(settings.letterDate);
    const asOnDateFmt = isPh ? "{{As On Date}}" : this.formatDisplayDate(party.asOnDate);
    const amountFmt = isPh ? "{{Outstanding Amount}}" : this.formatIndianAmount(party.amount);
    const wordsFmt = isPh ? "{{Amount in Indian Words}}" : this.numberToIndianWords(party.amount);

    return {
      isPh,
      isPayable,
      drCrLabel,
      shortType,
      refNo,
      letterDateFmt,
      asOnDateFmt,
      amountFmt,
      wordsFmt,
      clientId: party.clientId || "-",
      clientName: party.clientName || "-",
      address: party.address || "-",
      email: party.email || "",
      gstin: party.gstin || ""
    };
  },

  getBodyCopy(f, settings) {
    const isAudit = settings.templateMode === "sa505";
    const responseWindow = settings.responseDays || "7 working days";

    if (isAudit) {
      return {
        heading: "STATUTORY AUDIT BALANCE CONFIRMATION (SA 505)",
        subject: `Subject: Direct Audit Confirmation of Balance ${f.shortType} as at ${f.asOnDateFmt}`,
        boxLabel: `BALANCE ${f.shortType.toUpperCase()} PER BOOKS`,
        opening: `In connection with the statutory audit of our financial statements for the period ended ${f.asOnDateFmt}, our statutory auditors, ${settings.auditorName || "Statutory Auditors"}, require independent confirmation of the balance outstanding in your account as per our books.`,
        closing: `Kindly compare this balance with your ledger records and send your confirmation directly to our auditors at ${settings.auditorEmail || settings.companyEmail} within ${responseWindow} using the reply slip below. If you note any variance, please enclose a reconciliation statement with invoice, credit note, or payment details.`
      };
    }

    return {
      heading: "ACCOUNT BALANCE CONFIRMATION",
      subject: `Subject: Confirmation of ${f.shortType.toLowerCase()} balance as at ${f.asOnDateFmt}`,
      boxLabel: `BALANCE ${f.shortType.toUpperCase()}`,
      opening: `As part of our regular accounts reconciliation and financial reporting process, we request your kind confirmation of the outstanding balance reflected in our books for your organisation as at the reporting date stated below.`,
      closing: `Kindly reconcile the above amount with your books of accounts and confirm whether the balance agrees. In case of any discrepancy, please share your ledger extract and details of unadjusted invoices, credit notes, or payments within ${responseWindow} so that we can resolve the variance promptly.`
    };
  },

  renderLetterHtml(party, settings) {
    const f = this.getResolvedFields(party, settings);
    const copy = this.getBodyCopy(f, settings);
    const esc = (v) => this.escapeHtml(v);

    const logoBlock = settings.logoDataUrl
      ? `<img src="${settings.logoDataUrl}" alt="Company Logo" class="letter-logo-img">`
      : `<div class="letter-monogram">${esc((settings.companyName || "CO").slice(0, 2).toUpperCase())}</div>`;

    const optionalMeta = [];
    if (f.gstin) optionalMeta.push(`GSTIN: ${esc(f.gstin)}`);
    if (f.email) optionalMeta.push(`Email: ${esc(f.email)}`);

    return `
      <article class="exec-letter">
        <div class="exec-accent-bar"></div>

        <header class="exec-letterhead">
          <div class="exec-lh-left">
            ${logoBlock}
            <div>
              <div class="exec-company-name">${esc(settings.companyName || "Your Company Name")}</div>
              <div class="exec-company-dept">${esc(settings.companyDept || "Finance & Accounts")}</div>
            </div>
          </div>
          <div class="exec-lh-right">
            <div>${esc(settings.companyAddress || "")}</div>
            ${settings.companyTaxId ? `<div class="exec-mono-sub">${esc(settings.companyTaxId)}</div>` : ""}
            <div class="exec-email-sub">${esc(settings.companyEmail || "")}</div>
          </div>
        </header>

        <div class="exec-doc-title-row">
          <h3 class="exec-doc-title">${esc(copy.heading)}</h3>
          <span class="exec-pill">${esc(f.drCrLabel)}</span>
        </div>

        <div class="exec-meta-grid">
          <div class="exec-meta-cell">
            <span class="exec-meta-k">Letter Date</span>
            <span class="exec-meta-v">${esc(f.letterDateFmt)}</span>
          </div>
          <div class="exec-meta-cell">
            <span class="exec-meta-k">Party / Client Code</span>
            <span class="exec-meta-v mono">${esc(f.clientId)}</span>
          </div>
          <div class="exec-meta-cell">
            <span class="exec-meta-k">Reference No.</span>
            <span class="exec-meta-v mono">${esc(f.refNo)}</span>
          </div>
          <div class="exec-meta-cell">
            <span class="exec-meta-k">Reporting As On Date</span>
            <span class="exec-meta-v">${esc(f.asOnDateFmt)}</span>
          </div>
        </div>

        <div class="exec-recipient">
          <div class="exec-to-label">To,</div>
          <div class="exec-to-dept">The Accounts / Finance Department</div>
          <div class="exec-to-name">${esc(f.clientName)}</div>
          <div class="exec-to-addr">${esc(f.address)}</div>
          ${optionalMeta.length ? `<div class="exec-to-extra">${optionalMeta.join(" &nbsp;&middot;&nbsp; ")}</div>` : ""}
        </div>

        <div class="exec-subject-bar">${esc(copy.subject)}</div>

        <div class="exec-salutation">Dear Finance Team,</div>
        <p class="exec-para">${esc(copy.opening)}</p>

        <div class="exec-balance-card">
          <div class="exec-bal-left">
            <div class="exec-bal-label">${esc(copy.boxLabel)}</div>
            <div class="exec-bal-sub">As at ${esc(f.asOnDateFmt)}</div>
          </div>
          <div class="exec-bal-right">
            <div class="exec-bal-amount">${esc(f.amountFmt)}</div>
            <div class="exec-bal-words">${esc(f.wordsFmt)}</div>
          </div>
        </div>

        <p class="exec-para">${esc(copy.closing)}</p>

        <div class="exec-closing-row">
          <div class="exec-signoff">
            <div>Thanking you,</div>
            <div class="exec-faithfully">Yours faithfully,</div>
            <div class="exec-for-co">For <strong>${esc(settings.companyName || "Company Name")}</strong></div>
            <div class="exec-sig-space"></div>
            <div class="exec-sig-name">${esc(settings.signatoryName || "Authorized Signatory")}</div>
            <div class="exec-sig-title">${esc(settings.signatoryTitle || "Finance & Accounts")} &middot; ${esc(settings.companyEmail || "")}</div>
          </div>

          ${settings.templateMode === "sa505" ? `
            <div class="exec-auditor-box">
              <div class="exec-auditor-k">Direct Confirmation To Auditor</div>
              <div class="exec-auditor-name">${esc(settings.auditorName || "")}</div>
              <div class="exec-auditor-mail">${esc(settings.auditorEmail || "")}</div>
            </div>
          ` : ""}
        </div>

        ${settings.includeTearOff ? `
          <div class="exec-tear-off">
            <div class="exec-tear-tag">&#9986; Confirmation Reply Slip &mdash; Kindly Return Signed / Emailed Copy</div>
            <div class="exec-tear-meta">
              <span><strong>Party:</strong> ${esc(f.clientName)} (${esc(f.clientId)})</span>
              <span><strong>Ref:</strong> ${esc(f.refNo)}</span>
            </div>
            <div class="exec-check-row">
              <span class="exec-checkbox"></span>
              <span><strong>Balance Confirmed:</strong> We confirm that the balance of <strong>${esc(f.amountFmt)}</strong> (${esc(f.shortType)}) as at ${esc(f.asOnDateFmt)} agrees with our books.</span>
            </div>
            <div class="exec-check-row">
              <span class="exec-checkbox"></span>
              <span><strong>Balance Disagreed:</strong> Per our books, the balance as at ${esc(f.asOnDateFmt)} is &#8377;______________________. Reconciliation statement attached.</span>
            </div>
            <div class="exec-tear-sigs">
              <span>Authorised Signatory &amp; Designation: _______________________</span>
              <span>Date: ______________ &nbsp; Company Seal: ________________</span>
            </div>
          </div>
        ` : ""}
      </article>
    `;
  }
};
