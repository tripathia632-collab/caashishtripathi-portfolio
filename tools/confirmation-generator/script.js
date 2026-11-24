// Bulk Audit Confirmation Generator (ICAI SA 505)
// Built by CA Ashish Tripathi

const ConfirmationApp = {
  parties: [],

  sampleParties: [
    {
      id: 1,
      name: "Tata Consultancy Services Ltd.",
      category: "Sundry Debtor",
      gstin: "27AAACT2727Q1ZW",
      balance: 14850000,
      drCr: "Dr",
      email: "accounts.payable@tcs.example.com",
      contactPerson: "Mr. Rajesh Mehta"
    },
    {
      id: 2,
      name: "Siemens Industrial Turbomachinery Pvt Ltd.",
      category: "Sundry Creditor",
      gstin: "24AABCS1234D1ZF",
      balance: 6245800,
      drCr: "Cr",
      email: "finance.receivables@siemens.example.com",
      contactPerson: "Ms. Neha Sharma"
    },
    {
      id: 3,
      name: "HDFC Bank Ltd. - Term Loan Account #0092",
      category: "Borrowing / Bank Loan",
      gstin: "27AAACH2702H1ZE",
      balance: 35000000,
      drCr: "Cr",
      email: "corporate.loans@hdfcbank.example.com",
      contactPerson: "Relationship Manager"
    },
    {
      id: 4,
      name: "Schneider Electric India Pvt Ltd.",
      category: "Capital Goods Creditor",
      gstin: "29AAACS4928J1ZK",
      balance: 8930450,
      drCr: "Cr",
      email: "commercial.billing@se.example.com",
      contactPerson: "Mr. Amit Patel"
    },
    {
      id: 5,
      name: "Apollo Tyres Corporate Enterprise",
      category: "Sundry Debtor",
      gstin: "07AAACA1234A1Z5",
      balance: 3120000,
      drCr: "Dr",
      email: "vendor.desk@apollotyres.example.com",
      contactPerson: "Mr. Vikas Malhotra"
    }
  ],

  init() {
    this.loadSampleData();
  },

  loadSampleData() {
    this.parties = JSON.parse(JSON.stringify(this.sampleParties));
    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById("partiesTableBody");
    const countSpan = document.getElementById("partyCount");
    countSpan.textContent = this.parties.length;

    if (this.parties.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #52676D;">No parties loaded. Click "⚡ 1-Click Sample Parties" or "Add Single Party" to begin.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.parties.map((party, index) => `
      <tr data-id="${party.id}">
        <td style="color:#52676D; font-size: 0.75rem;">${index + 1}</td>
        <td>
          <input type="text" class="table-input" value="${this.escapeHtml(party.name)}" onchange="ConfirmationApp.updateField(${party.id}, 'name', this.value)" style="font-weight:600;">
        </td>
        <td>
          <select class="table-select" onchange="ConfirmationApp.updateField(${party.id}, 'category', this.value)">
            <option value="Sundry Debtor" ${party.category === 'Sundry Debtor' ? 'selected' : ''}>Sundry Debtor</option>
            <option value="Sundry Creditor" ${party.category === 'Sundry Creditor' ? 'selected' : ''}>Sundry Creditor</option>
            <option value="Borrowing / Bank Loan" ${party.category === 'Borrowing / Bank Loan' ? 'selected' : ''}>Borrowing / Loan</option>
            <option value="Capital Goods Creditor" ${party.category === 'Capital Goods Creditor' ? 'selected' : ''}>Capital Goods Creditor</option>
            <option value="Advance Received" ${party.category === 'Advance Received' ? 'selected' : ''}>Advance Received</option>
          </select>
        </td>
        <td>
          <input type="text" class="table-input code-font" value="${this.escapeHtml(party.gstin)}" onchange="ConfirmationApp.updateField(${party.id}, 'gstin', this.value)" placeholder="15-digit GSTIN">
        </td>
        <td>
          <input type="number" step="0.01" class="table-input table-input-number" value="${party.balance}" onchange="ConfirmationApp.updateField(${party.id}, 'balance', parseFloat(this.value) || 0)">
        </td>
        <td>
          <select class="table-select" onchange="ConfirmationApp.updateField(${party.id}, 'drCr', this.value)" style="font-weight: 700; color: ${party.drCr === 'Dr' ? '#08765D' : '#102D37'};">
            <option value="Dr" ${party.drCr === 'Dr' ? 'selected' : ''}>Dr (Debit)</option>
            <option value="Cr" ${party.drCr === 'Cr' ? 'selected' : ''}>Cr (Credit)</option>
          </select>
        </td>
        <td>
          <input type="email" class="table-input" value="${this.escapeHtml(party.email)}" onchange="ConfirmationApp.updateField(${party.id}, 'email', this.value)">
        </td>
        <td style="text-align: center;">
          <button class="btn btn-sm btn-danger-outline" title="Delete" onclick="ConfirmationApp.removeParty(${party.id})">✕</button>
        </td>
      </tr>
    `).join("");
  },

  updateField(id, field, value) {
    const party = this.parties.find(p => p.id === id);
    if (party) {
      party[field] = value;
    }
  },

  addNewRow() {
    const newId = Date.now();
    this.parties.push({
      id: newId,
      name: "New Enterprise Party",
      category: "Sundry Debtor",
      gstin: "27AAAAA0000A1Z5",
      balance: 100000,
      drCr: "Dr",
      email: "accounts@example.com",
      contactPerson: "Finance Head"
    });
    this.renderTable();
  },

  removeParty(id) {
    this.parties = this.parties.filter(p => p.id !== id);
    this.renderTable();
  },

  clearAllParties() {
    if (confirm("Are you sure you want to clear all parties?")) {
      this.parties = [];
      this.renderTable();
    }
  },

  resetTemplate() {
    const defaultTemplate = `In connection with the statutory audit of our financial statements for the period ended {AsOnDate}, our statutory auditors, {AuditorName}, require direct written confirmation of the balance outstanding in your account as per our books of accounts.

According to our records, the balance outstanding as on {AsOnDate} was ₹{Balance} ({DrCr}).

Kindly examine your accounts and confirm directly to our statutory auditors via email ({AuditorEmail}) whether the stated balance agrees with your books of accounts by {DueDate}. In case of any discrepancy or unadjusted credit note/debit note, please furnish the itemized statement of reconciliation.`;
    document.getElementById("templateBody").value = defaultTemplate;
  },

  formatIndianCurrency(num) {
    if (isNaN(num)) return "0.00";
    const parts = Number(num).toFixed(2).split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1];
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== "") {
      integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    } else {
      integerPart = lastThree;
    }
    return integerPart + "." + decimalPart;
  },

  numberToIndianWords(n) {
    if (n === 0) return "Zero Rupees Only";
    const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const double = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const formatUnderThousand = (num) => {
      let str = "";
      if (num >= 100) {
        str += single[Math.floor(num / 100)] + " Hundred ";
        num %= 100;
      }
      if (num >= 10 && num <= 19) {
        str += double[num - 10] + " ";
      } else if (num >= 20) {
        str += tens[Math.floor(num / 10)] + " ";
        if (num % 10 > 0) str += single[num % 10] + " ";
      } else if (num > 0) {
        str += single[num] + " ";
      }
      return str;
    };

    let intVal = Math.floor(Math.abs(n));
    let result = "";

    const crore = Math.floor(intVal / 10000000);
    intVal %= 10000000;
    const lakh = Math.floor(intVal / 100000);
    intVal %= 100000;
    const thousand = Math.floor(intVal / 1000);
    intVal %= 1000;
    const remainder = intVal;

    if (crore > 0) result += formatUnderThousand(crore) + "Crore ";
    if (lakh > 0) result += formatUnderThousand(lakh) + "Lakh ";
    if (thousand > 0) result += formatUnderThousand(thousand) + "Thousand ";
    if (remainder > 0) result += formatUnderThousand(remainder);

    return result.trim() + " Rupees Only";
  },

  openBulkPrintModal() {
    if (this.parties.length === 0) {
      alert("Please load or add at least one party to generate letters.");
      return;
    }

    const companyName = document.getElementById("companyName").value.trim() || "Apex Bharat Technologies Ltd.";
    const auditorName = document.getElementById("auditorName").value.trim() || "Tripathi & Associates, Chartered Accountants";
    const auditorEmail = document.getElementById("auditorEmail").value.trim() || "audit@caashishtripathi.in";
    const asOnDateRaw = document.getElementById("asOnDate").value || "2026-03-31";
    const dueDateRaw = document.getElementById("dueDate").value || "2026-04-20";
    const confirmationType = document.getElementById("confirmationType").value;
    const templateText = document.getElementById("templateBody").value;

    const formatDate = (dateStr) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    };

    const asOnDate = formatDate(asOnDateRaw);
    const dueDate = formatDate(dueDateRaw);

    const container = document.getElementById("printLettersContainer");

    container.innerHTML = this.parties.map((p) => {
      const formattedBal = this.formatIndianCurrency(p.balance);
      const drCrText = p.drCr === "Dr" ? "Debit" : "Credit";
      const words = this.numberToIndianWords(p.balance);

      let processedBody = templateText
        .replace(/\{PartyName\}/g, p.name)
        .replace(/\{Balance\}/g, formattedBal)
        .replace(/\{DrCr\}/g, drCrText)
        .replace(/\{AsOnDate\}/g, asOnDate)
        .replace(/\{CompanyName\}/g, companyName)
        .replace(/\{AuditorName\}/g, auditorName)
        .replace(/\{AuditorEmail\}/g, auditorEmail)
        .replace(/\{DueDate\}/g, dueDate);

      return `
        <div class="audit-letter-sheet">
          <div class="letter-header">
            <div>
              <div class="letter-company-title">${this.escapeHtml(companyName)}</div>
              <div style="font-size: 0.75rem; color: #52676D; margin-top: 2px;">CIN: L72200MH2018PLC123456 · Registered Office: Commercial Tower, BKC, Mumbai - 400051</div>
            </div>
            <div class="letter-meta">
              <div><strong>Ref No:</strong> CONF/${asOnDateRaw.substring(0, 4)}/${p.id}</div>
              <div><strong>Date:</strong> ${new Date().toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div><strong>Confirmation Type:</strong> ${confirmationType === 'positive' ? 'Positive (SA 505)' : 'Negative (SA 505)'}</div>
            </div>
          </div>

          <div class="letter-to-block">
            <div>To,</div>
            <strong>${this.escapeHtml(p.name)}</strong>
            ${p.contactPerson ? `<div>Attn: ${this.escapeHtml(p.contactPerson)}</div>` : ''}
            <div>GSTIN: <span style="font-family: 'JetBrains Mono', monospace;">${this.escapeHtml(p.gstin || 'N/A')}</span></div>
            <div>Email: ${this.escapeHtml(p.email || 'N/A')}</div>
          </div>

          <div class="letter-subject">
            SUBJECT: BALANCE CONFIRMATION AS ON ${asOnDate.toUpperCase()} (${confirmationType === 'positive' ? 'POSITIVE CONFIRMATION REQUEST' : 'NEGATIVE CONFIRMATION REQUEST'})
          </div>

          <div class="letter-body">${this.escapeHtml(processedBody)}</div>

          <div style="background-color: #F5F7F6; border: 1px solid #DCE5E0; border-radius: 6px; padding: 10px 14px; margin: 16px 0; font-size: 0.8125rem;">
            <strong>Amount in Words:</strong> <em>${words} (${drCrText})</em>
          </div>

          <div class="letter-signatures">
            <div class="sig-block">
              <div>For <strong>${this.escapeHtml(companyName)}</strong></div>
              <div class="sig-line">
                Authorized Signatory / CFO<br>
                Name & Designation
              </div>
            </div>
            <div class="sig-block" style="text-align: right;">
              <div>Under Request by Statutory Auditors:</div>
              <div style="font-weight: 700; color: #102D37;">${this.escapeHtml(auditorName)}</div>
              <div class="sig-line" style="text-align: right;">
                Chartered Accountants<br>
                Audit Engagement Partner Seal
              </div>
            </div>
          </div>

          <div class="tear-off-slip">
            <span class="tear-off-label">✂ Tear-Off Slip for Third Party Direct Auditor Reply</span>
            <div class="tear-off-content">
              <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                <span><strong>To:</strong> ${this.escapeHtml(auditorName)} (${this.escapeHtml(auditorEmail)})</span>
                <span><strong>Auditee:</strong> ${this.escapeHtml(companyName)}</span>
              </div>
              <div style="margin: 8px 0; line-height: 1.8;">
                [ &nbsp; ] We confirm that the balance of <strong>₹${formattedBal} (${drCrText})</strong> as on ${asOnDate} is in full agreement with our books of accounts.<br>
                [ &nbsp; ] We do NOT agree with the balance. According to our books, the balance was ₹_________________ (${drCrText}). Reconciliation attached.
              </div>
              <div style="display:flex; justify-content:space-between; margin-top: 14px; font-size: 0.75rem; color: #52676D;">
                <span>Party Representative Signature: __________________________</span>
                <span>Date: _______________ Official Seal: _____________________</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    document.getElementById("printModal").classList.remove("hidden");
  },

  closeModal() {
    document.getElementById("printModal").classList.add("hidden");
  },

  exportPartiesCSV() {
    if (this.parties.length === 0) {
      alert("No parties to export.");
      return;
    }
    const headers = ["ID", "PartyName", "Category", "GSTIN", "LedgerBalance", "DrCr", "Email", "ContactPerson"];
    const rows = this.parties.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.gstin}"`,
      p.balance,
      p.drCr,
      `"${p.email}"`,
      `"${p.contactPerson || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_parties_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) {
        alert("CSV file must have a header row and at least one data row.");
        return;
      }

      const importedParties = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map(cell => cell.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 2 && parts[1]) {
          importedParties.push({
            id: Date.now() + i,
            name: parts[1],
            category: parts[2] || "Sundry Debtor",
            gstin: parts[3] || "",
            balance: parseFloat(parts[4]) || 0,
            drCr: parts[5] || "Dr",
            email: parts[6] || "",
            contactPerson: parts[7] || ""
          });
        }
      }

      if (importedParties.length > 0) {
        this.parties = importedParties;
        this.renderTable();
        alert(`Successfully imported ${importedParties.length} parties from CSV!`);
      } else {
        alert("Could not parse parties from CSV. Ensure format matches the exported template.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  },

  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  ConfirmationApp.init();
});
