// CA Ashish Tripathi Portfolio Engine
// caashishtripathi.in

const Portfolio = {
  activeToolFilter: 'all',

  toolArchitectures: {
    'fixed-asset-register': {
      title: 'Dual-Compliance Fixed Asset Register (FAR) & Depreciation Engine',
      subtitle: 'Schedule II (Companies Act 2013) + Section 32 (Income Tax Act 1961) + AS 22 DTA/DTL',
      badge: 'Statutory Accounting & Tax Engine',
      problem: 'Enterprises struggle with manual Excel calculations to reconcile book depreciation against tax depreciation. Human error in applying the 180-day rule, shift depreciation multipliers, and Section 50 capital gains causes audit delay and deferred tax misstatements.',
      engine: 'Pure JavaScript (ES6+) · Pro-Rata Math · SheetJS (.xlsx IO) · Chart.js · 100% Client-Side',
      pipeline: [
        { step: '1. Ingestion & Validation', desc: 'Accepts multi-column ERP asset registers (SAP, Oracle, Tally, Zoho) via drag-and-drop Excel/CSV. Automatically validates 18 fields per row (Capitalised Cost, Ready for Use Date, Put to Use Date, Asset Class).' },
        { step: '2. Companies Act Schedule II Math', desc: 'Enforces statutory useful lives and 5% residual floor. Automatically factors leap years (366 days for FY 23-24, FY 27-28) and Note 3 shift multipliers (1.5x double shift, 2.0x triple shift) on daily pro-rata basis.' },
        { step: '3. Income Tax Act Sec 32 Block Computation', desc: 'Calculates block additions, automatically segregating assets put to use for ≥180 days (100% rate) vs <180 days (50% half-rate). Computes Additional Depreciation u/s 32(1)(iia) and Section 50 STCG when block is wiped out.' },
        { step: '4. AS 22 / Ind AS 12 Deferred Tax Workings', desc: 'Computes timing difference (Book Depr vs Tax Depr) and outputs DTA/DTL schedules across standard corporate tax rates (25.17%, 26%, 29.12%, 34.94%).' },
        { step: '5. Audit-Ready Reporting & Export', desc: 'Generates Schedule II balance sheet notes, Form 3CD Clause 18 schedules, and formatted Excel workpapers in 1 click.' }
      ],
      sampleTestPrompt: 'Click "Launch Live Sandbox", then click the emerald "⚡ 1-Click Sample Data" button to instantly process 16 diverse corporate assets.'
    },

    'gst-reco': {
      title: 'GSTWise Enterprise: GSTR-2B vs. Books Reconciler & GST Suite',
      subtitle: 'Statutory Rule 88A / 88C / 88D Compliance & Official GSTN Offline JSON Generator',
      badge: 'Tax Compliance & Reconciliation Suite',
      problem: 'Matching thousands of vendor purchase invoices against monthly GSTR-2B portal downloads is time-consuming. Unmatched invoices lead to lost ITC cash flow or statutory notice risks under Rule 36(4) / Section 16(2)(aa).',
      engine: 'React 18 · Vite · Tailwind CSS · Luhn Mod-36 GSTIN Algorithm · Multi-Criteria Fuzzy Matcher',
      pipeline: [
        { step: '1. Multi-Format Input Parsing', desc: 'Parses Books Purchase Registers and official GSTN GSTR-2B Excel/JSON downloads with automated column mapping.' },
        { step: '2. Multi-Criteria Intelligent Matching Engine', desc: 'Categorizes entries into 4 audit buckets: (a) Exact Match (GSTIN, Doc No, Date, Tax), (b) Value/Tax Mismatch within configurable tolerance (₹1 to ₹10), (c) Missing in 2B (Books only - ITC notice risk), and (d) Missing in Books (2B only - unclaimed credit).' },
        { step: '3. Invoice Management System (IMS)', desc: 'Enables 1-click Accept, Reject, or Pending marking with automated supplier notice generator for missing invoices.' },
        { step: '4. Rule 88A Tax Offset Optimization', desc: 'Executes statutory tax payment order: IGST credit exhausted 100% first, then CGST/SGST optimally allocated to minimize cash challan outflow.' },
        { step: '5. Official GSTN JSON Generation', desc: 'Validates 15-character GSTINs via Mod-36 Luhn check and builds schema-compliant JSON ready to upload to gst.gov.in.' }
      ],
      sampleTestPrompt: 'Launch the sandbox and explore the pre-loaded multi-month return dashboard, 2B reconciliation matrix, and Rule 88A tax optimizer.'
    },

    'confirmation-generator': {
      title: 'Bulk Audit Confirmation Letter Generator',
      subtitle: 'ICAI Standard on Auditing (SA) 505 External Confirmations',
      badge: 'Statutory & Internal Audit Automation',
      problem: 'Statutory auditors and corporate controllers spend dozens of hours manually customizing, formatting, and generating individual balance confirmation letters for debtors, creditors, and banks during annual financial closure.',
      engine: 'Vanilla JavaScript · ICAI SA 505 Template Engine · Indian Numbering In Words · Print CSS',
      pipeline: [
        { step: '1. Ledger Master Import', desc: 'Accepts client debtor/creditor ledger tables with balances, reference dates, GSTINs, and contact details via CSV or table entry.' },
        { step: '2. Statutory SA 505 Template Compiler', desc: 'Interpolates positive or negative confirmation formats with automated conversion of rupee balances into formal Indian words (Lakhs & Crores).' },
        { step: '3. Auditor & Client Verification Tokens', desc: 'Inserts auditee company CIN/registered office header, statutory auditor contact details for direct response, and due date safeguards.' },
        { step: '4. Tear-Off Slip Generation', desc: 'Appends a third-party audit confirmation reply slip with agreement checkboxes and discrepancy reconciliation blocks.' },
        { step: '5. Bulk Vector PDF / Print Engine', desc: 'Leverages browser vector print engine (@media print) to generate clean, individual page-break confirmation letters ready for physical dispatch or digital signing.' }
      ],
      sampleTestPrompt: 'Click "Launch Live Sandbox", click "⚡ 1-Click Sample Parties", and hit "Generate & Print Letters" to preview formal SA 505 confirmation sheets.'
    },

    'fpa-dashboard': {
      title: 'FP&A Variance Analyzer & MIS Showcase',
      subtitle: 'Budget vs. Actual Variance Engine & Star-Schema Power BI Architecture',
      badge: 'Corporate FP&A & Controllership',
      problem: 'Controllers and FP&A managers lose critical days at month-end manually consolidating departmental variance matrices and drafting qualitative board narratives explaining why EBITDA diverged from forecast.',
      engine: 'Vanilla JavaScript · Chart.js · Dynamic Variance Threshold Engine · DAX Measures',
      pipeline: [
        { step: '1. Financial Aggregation & Recalculation', desc: 'Maintains live reactive state across Revenue, COGS, Gross Margins, Opex (R&D, CAC, G&A), EBITDA, EBIT, and PAT. Any change in table inputs recalculates all subtotals instantly.' },
        { step: '2. Dynamic Threshold Alerting', desc: 'Interactive sensitivity slider allows CFO to set alert threshold (e.g. ±5% or ±10%), dynamically highlighting critical cost overruns in amber.' },
        { step: '3. Automated Executive Board Commentary', desc: 'Deterministic natural language generator transforms mathematical variances into an executive flash commentary detailing top-line drivers, margin contraction/expansion in basis points, and actionable controllership recommendations.' },
        { step: '4. Power BI Architecture Integration', desc: 'Star-schema model designed with dedicated Dim_Date, Dim_Entity, and Fact_GL tables with time-intelligence DAX measures (YTD, QoQ, Rolling 12M, DSO, RLS).' },
        { step: '5. Multi-Currency Consolidation', desc: 'One-click switching between INR Crores (India), AED Millions (Dubai/UAE), and USD Millions (US).' }
      ],
      sampleTestPrompt: 'Launch sandbox, edit any value in the P&L table or adjust the sensitivity slider, and observe the live commentary update in real time.'
    }
  },

  init() {
    this.setupFilterTabs();
    this.setupSmoothScroll();
  },

  setupFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter');
        this.filterTools(filter);
      });
    });
  },

  filterTools(filter) {
    this.activeToolFilter = filter;
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(card => {
      const category = card.getAttribute('data-category');
      if (filter === 'all' || category === filter) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  },

  launchSandbox(toolId, toolUrl) {
    const modal = document.getElementById('sandboxModal');
    const iframe = document.getElementById('sandboxIframe');
    const title = document.getElementById('sandboxTitle');
    const fullLink = document.getElementById('sandboxFullTabLink');

    const toolMeta = this.toolArchitectures[toolId] || { title: 'Interactive Finance Tool Sandbox' };
    title.textContent = toolMeta.title;
    fullLink.href = toolUrl;

    iframe.src = toolUrl;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeSandbox() {
    const modal = document.getElementById('sandboxModal');
    const iframe = document.getElementById('sandboxIframe');
    iframe.src = 'about:blank';
    modal.classList.remove('active');
    document.body.style.overflow = '';
  },

  openArchitectureModal(toolId) {
    const data = this.toolArchitectures[toolId];
    if (!data) return;

    const modal = document.getElementById('archModal');
    const title = document.getElementById('archTitle');
    const body = document.getElementById('archContent');

    title.textContent = data.title;

    body.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <span class="badge" style="background:#EAF4EF; color:#08765D; font-weight:700; padding:4px 10px; border-radius:9999px; font-size:11px;">${data.badge}</span>
        <div style="font-size:12px; color:#52676D; margin-top:6px; font-weight:600;">${data.subtitle}</div>
      </div>

      <div class="arch-block">
        <h4>🚨 The Finance Bottleneck Solved</h4>
        <p>${data.problem}</p>
      </div>

      <div class="arch-block">
        <h4>⚙️ Underlying Technology &amp; Engine</h4>
        <p><code style="background:#F5F7F6; padding:3px 8px; border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:12px; color:#102D37; border:1px solid #DCE5E0;">${data.engine}</code></p>
      </div>

      <div class="arch-block">
        <h4>📐 End-to-End Architectural Pipeline</h4>
        <ul class="arch-step-list">
          ${data.pipeline.map(p => `
            <li>
              <div>
                <strong>${p.step}</strong>
                <div style="margin-top:2px; font-size:12px; color:#52676D; line-height:1.45;">${p.desc}</div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="background-color:#EAF4EF; border:1px solid #bcdbc8; border-radius:8px; padding:12px 16px; margin-top:1.5rem; font-size:12px; color:#065F4B;">
        <strong>💡 Live Interview Demo Tip:</strong> ${data.sampleTestPrompt}
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeArchModal() {
    document.getElementById('archModal').classList.remove('active');
    document.body.style.overflow = '';
  },

  openResumeModal() {
    document.getElementById('resumeModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeResumeModal() {
    document.getElementById('resumeModal').classList.remove('active');
    document.body.style.overflow = '';
  },

  copyEmail(email, btnElement) {
    navigator.clipboard.writeText(email).then(() => {
      const originalText = btnElement.innerText;
      btnElement.innerText = "✓ Copied to Clipboard!";
      setTimeout(() => {
        btnElement.innerText = originalText;
      }, 2500);
    });
  },

  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Portfolio.init();
});
