// FP&A Variance Analyzer & MIS Showcase
// Built by CA Ashish Tripathi

const FpaApp = {
  currentEntity: 'inr',
  thresholdPct: 5.0,
  activeChartType: 'pnl',
  chartInstance: null,

  items: [
    { id: 1, name: "Enterprise SaaS Revenue", category: "Revenue", actual: 38.50, budget: 35.00, priorYear: 31.20, isSubtotal: false },
    { id: 2, name: "Professional Services & Advisory", category: "Revenue", actual: 12.20, budget: 11.50, priorYear: 9.80, isSubtotal: false },
    { id: 3, name: "Cloud Hosting & Infrastructure (COGS)", category: "Cost of Goods Sold", actual: 9.60, budget: 8.80, priorYear: 8.10, isSubtotal: false, isCost: true },
    { id: 4, name: "Implementation Direct Staffing", category: "Cost of Goods Sold", actual: 6.40, budget: 6.20, priorYear: 5.50, isSubtotal: false, isCost: true },
    { id: 5, name: "Research & Development Engineering", category: "Opex", actual: 7.80, budget: 7.50, priorYear: 6.20, isSubtotal: false, isCost: true },
    { id: 6, name: "Sales & Marketing (CAC)", category: "Opex", actual: 8.90, budget: 7.80, priorYear: 6.90, isSubtotal: false, isCost: true },
    { id: 7, name: "General & Administrative (G&A)", category: "Opex", actual: 4.10, budget: 4.30, priorYear: 3.90, isSubtotal: false, isCost: true },
    { id: 8, name: "Depreciation & Amortization", category: "D&A", actual: 2.10, budget: 2.00, priorYear: 1.80, isSubtotal: false, isCost: true },
    { id: 9, name: "Finance & Interest Costs", category: "Non-Operating", actual: 0.85, budget: 0.90, priorYear: 1.10, isSubtotal: false, isCost: true },
    { id: 10, name: "Income Tax Provision", category: "Tax", actual: 2.75, budget: 2.30, priorYear: 1.95, isSubtotal: false, isCost: true }
  ],

  init() {
    this.calculateAndRender();
  },

  loadSampleData() {
    this.items = [
      { id: 1, name: "Enterprise SaaS Revenue", category: "Revenue", actual: 38.50, budget: 35.00, priorYear: 31.20, isSubtotal: false },
      { id: 2, name: "Professional Services & Advisory", category: "Revenue", actual: 12.20, budget: 11.50, priorYear: 9.80, isSubtotal: false },
      { id: 3, name: "Cloud Hosting & Infrastructure (COGS)", category: "Cost of Goods Sold", actual: 9.60, budget: 8.80, priorYear: 8.10, isSubtotal: false, isCost: true },
      { id: 4, name: "Implementation Direct Staffing", category: "Cost of Goods Sold", actual: 6.40, budget: 6.20, priorYear: 5.50, isSubtotal: false, isCost: true },
      { id: 5, name: "Research & Development Engineering", category: "Opex", actual: 7.80, budget: 7.50, priorYear: 6.20, isSubtotal: false, isCost: true },
      { id: 6, name: "Sales & Marketing (CAC)", category: "Opex", actual: 8.90, budget: 7.80, priorYear: 6.90, isSubtotal: false, isCost: true },
      { id: 7, name: "General & Administrative (G&A)", category: "Opex", actual: 4.10, budget: 4.30, priorYear: 3.90, isSubtotal: false, isCost: true },
      { id: 8, name: "Depreciation & Amortization", category: "D&A", actual: 2.10, budget: 2.00, priorYear: 1.80, isSubtotal: false, isCost: true },
      { id: 9, name: "Finance & Interest Costs", category: "Non-Operating", actual: 0.85, budget: 0.90, priorYear: 1.10, isSubtotal: false, isCost: true },
      { id: 10, name: "Income Tax Provision", category: "Tax", actual: 2.75, budget: 2.30, priorYear: 1.95, isSubtotal: false, isCost: true }
    ];
    this.calculateAndRender();
  },

  calculateAndRender() {
    // 1. Calculate Aggregate Financial Metrics
    const totalRevAct = this.items.filter(i => i.category === 'Revenue').reduce((acc, i) => acc + i.actual, 0);
    const totalRevBud = this.items.filter(i => i.category === 'Revenue').reduce((acc, i) => acc + i.budget, 0);

    const cogsAct = this.items.filter(i => i.category === 'Cost of Goods Sold').reduce((acc, i) => acc + i.actual, 0);
    const cogsBud = this.items.filter(i => i.category === 'Cost of Goods Sold').reduce((acc, i) => acc + i.budget, 0);

    const grossProfitAct = totalRevAct - cogsAct;
    const grossProfitBud = totalRevBud - cogsBud;
    const gmPctAct = totalRevAct > 0 ? (grossProfitAct / totalRevAct) * 100 : 0;
    const gmPctBud = totalRevBud > 0 ? (grossProfitBud / totalRevBud) * 100 : 0;

    const opexAct = this.items.filter(i => i.category === 'Opex').reduce((acc, i) => acc + i.actual, 0);
    const opexBud = this.items.filter(i => i.category === 'Opex').reduce((acc, i) => acc + i.budget, 0);

    const ebitdaAct = grossProfitAct - opexAct;
    const ebitdaBud = grossProfitBud - opexBud;

    const dnaAct = this.items.filter(i => i.category === 'D&A').reduce((acc, i) => acc + i.actual, 0);
    const ebitAct = ebitdaAct - dnaAct;

    const nonOpAct = this.items.filter(i => i.category === 'Non-Operating').reduce((acc, i) => acc + i.actual, 0);
    const pbtAct = ebitAct - nonOpAct;

    const taxAct = this.items.filter(i => i.category === 'Tax').reduce((acc, i) => acc + i.actual, 0);
    const netIncomeAct = pbtAct - taxAct;

    const dnaBud = this.items.filter(i => i.category === 'D&A').reduce((acc, i) => acc + i.budget, 0);
    const ebitBud = ebitdaBud - dnaBud;
    const nonOpBud = this.items.filter(i => i.category === 'Non-Operating').reduce((acc, i) => acc + i.budget, 0);
    const pbtBud = ebitBud - nonOpBud;
    const taxBud = this.items.filter(i => i.category === 'Tax').reduce((acc, i) => acc + i.budget, 0);
    const netIncomeBud = pbtBud - taxBud;

    // Render KPI Cards
    const curSymbol = this.currentEntity === 'inr' ? '₹' : (this.currentEntity === 'uae' ? 'AED ' : '$');
    const unit = this.currentEntity === 'inr' ? ' Cr' : 'M';

    document.getElementById("valRevenue").textContent = `${curSymbol}${totalRevAct.toFixed(2)}${unit}`;
    const revVar = totalRevAct - totalRevBud;
    const revVarPct = totalRevBud > 0 ? (revVar / totalRevBud) * 100 : 0;
    const revSub = document.getElementById("subRevenue");
    revSub.innerHTML = `<span style="color:${revVar >= 0 ? '#15803d' : '#b91c1c'}">${revVar >= 0 ? '▲ +' : '▼ '}${revVarPct.toFixed(1)}% vs Budget (${curSymbol}${revVar.toFixed(2)}${unit})</span>`;

    document.getElementById("valGrossMargin").textContent = `${gmPctAct.toFixed(1)}%`;
    const gmDiffBps = (gmPctAct - gmPctBud) * 100;
    const gmSub = document.getElementById("subGrossMargin");
    gmSub.innerHTML = `<span style="color:${gmDiffBps >= 0 ? '#15803d' : '#b91c1c'}">${gmDiffBps >= 0 ? '▲ +' : '▼ '}${gmDiffBps.toFixed(0)} bps vs Budget</span>`;

    document.getElementById("valEbitda").textContent = `${curSymbol}${ebitdaAct.toFixed(2)}${unit}`;
    const ebitdaVar = ebitdaAct - ebitdaBud;
    const ebitdaVarPct = ebitdaBud > 0 ? (ebitdaVar / ebitdaBud) * 100 : 0;
    const ebitdaSub = document.getElementById("subEbitda");
    ebitdaSub.innerHTML = `<span style="color:${ebitdaVar >= 0 ? '#15803d' : '#b91c1c'}">${ebitdaVar >= 0 ? '▲ +' : '▼ '}${ebitdaVarPct.toFixed(1)}% vs Budget</span>`;

    document.getElementById("valNetIncome").textContent = `${curSymbol}${netIncomeAct.toFixed(2)}${unit}`;
    const netVar = netIncomeAct - netIncomeBud;
    const netVarPct = netIncomeBud > 0 ? (netVar / netIncomeBud) * 100 : 0;
    const netSub = document.getElementById("subNetIncome");
    netSub.innerHTML = `<span style="color:${netVar >= 0 ? '#15803d' : '#b91c1c'}">${netVar >= 0 ? '▲ +' : '▼ '}${netVarPct.toFixed(1)}% vs Budget</span>`;

    // Render Table
    this.renderTable();

    // Render Automated Commentary
    this.generateCommentary({
      totalRevAct, totalRevBud, revVar, revVarPct,
      gmPctAct, gmDiffBps,
      ebitdaAct, ebitdaBud, ebitdaVar, ebitdaVarPct,
      netIncomeAct, netIncomeBud,
      curSymbol, unit
    });

    // Render Chart
    this.renderChart();
  },

  renderTable() {
    const tbody = document.getElementById("pnlTableBody");
    tbody.innerHTML = this.items.map(item => {
      const varAbs = item.actual - item.budget;
      const varPct = item.budget !== 0 ? (varAbs / item.budget) * 100 : 0;

      // Favorable:
      // If revenue: actual > budget is favorable
      // If cost: actual < budget is favorable
      const isFav = item.isCost ? varAbs <= 0 : varAbs >= 0;
      const isCritical = Math.abs(varPct) >= this.thresholdPct;

      let statusBadge = '';
      if (isCritical) {
        statusBadge = `<span class="status-pill status-alert" title="Exceeds ${this.thresholdPct}% threshold">⚠ Alert (${varPct.toFixed(1)}%)</span>`;
      } else if (isFav) {
        statusBadge = `<span class="status-pill status-fav">Favorable</span>`;
      } else {
        statusBadge = `<span class="status-pill status-unfav">Unfavorable</span>`;
      }

      return `
        <tr>
          <td style="font-weight: 600;">${item.name}</td>
          <td style="color: #52676D; font-size: 0.75rem;">${item.category}</td>
          <td class="text-right">
            <input type="number" step="0.05" class="table-input-val" value="${item.actual.toFixed(2)}" onchange="FpaApp.updateItem(${item.id}, 'actual', parseFloat(this.value) || 0)">
          </td>
          <td class="text-right">
            <input type="number" step="0.05" class="table-input-val" value="${item.budget.toFixed(2)}" onchange="FpaApp.updateItem(${item.id}, 'budget', parseFloat(this.value) || 0)">
          </td>
          <td class="text-right" style="color: #64748b; font-family: 'JetBrains Mono', monospace;">${item.priorYear.toFixed(2)}</td>
          <td class="text-right" style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: ${isFav ? '#15803d' : '#b91c1c'};">
            ${varAbs >= 0 ? '+' : ''}${varAbs.toFixed(2)}
          </td>
          <td class="text-right" style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: ${isFav ? '#15803d' : '#b91c1c'};">
            ${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%
          </td>
          <td class="text-center">${statusBadge}</td>
        </tr>
      `;
    }).join("");
  },

  updateItem(id, field, value) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item[field] = value;
      this.calculateAndRender();
    }
  },

  onThresholdChange(val) {
    this.thresholdPct = parseFloat(val);
    document.getElementById("thresholdDisplay").textContent = `±${this.thresholdPct.toFixed(1)}%`;
    this.renderTable();
  },

  onEntityChange(val) {
    this.currentEntity = val;
    this.calculateAndRender();
  },

  generateCommentary(metrics) {
    const box = document.getElementById("commentaryText");
    const revBeat = metrics.revVar >= 0;
    const ebitdaBeat = metrics.ebitdaVar >= 0;

    // Find biggest positive and negative variance drivers
    const drivers = [...this.items].map(i => {
      const varAbs = i.actual - i.budget;
      const varPct = i.budget !== 0 ? (varAbs / i.budget) * 100 : 0;
      const isFav = i.isCost ? varAbs <= 0 : varAbs >= 0;
      return { ...i, varAbs, varPct, isFav, absImpact: Math.abs(varAbs) };
    }).sort((a, b) => b.absImpact - a.absImpact);

    const biggestUnfav = drivers.find(d => !d.isFav);
    const biggestFav = drivers.find(d => d.isFav);

    const narrative = `
<strong>EXECUTIVE FLASH COMMENTARY · FY 2025-26 PERFORMANCE:</strong><br><br>
• <strong>Top-Line Performance:</strong> Total Net Revenue closed at <strong>${metrics.curSymbol}${metrics.totalRevAct.toFixed(2)}${metrics.unit}</strong>, representing a <strong>${revBeat ? '+' : ''}${metrics.revVarPct.toFixed(1)}% variance (${metrics.curSymbol}${metrics.revVar.toFixed(2)}${metrics.unit})</strong> against annual target budget. ${revBeat ? 'Strong momentum was propelled by enterprise client expansion and sustained contract renewals.' : 'Top-line experienced slight headwinds across discretionary advisory services.'}<br><br>
• <strong>Profitability & Margins:</strong> Operating EBITDA landed at <strong>${metrics.curSymbol}${metrics.ebitdaAct.toFixed(2)}${metrics.unit}</strong> (${ebitdaBeat ? '+' : ''}${metrics.ebitdaVarPct.toFixed(1)}% vs. Budget). Gross margin tracked at <strong>${metrics.gmPctAct.toFixed(1)}%</strong> (${metrics.gmDiffBps >= 0 ? '+' : ''}${metrics.gmDiffBps.toFixed(0)} bps variance).<br><br>
• <strong>Key Variance Drivers:</strong> ${biggestFav ? `Primary favorable contributor was <em>${biggestFav.name}</em> with a favorable variance of ${metrics.curSymbol}${Math.abs(biggestFav.varAbs).toFixed(2)}${metrics.unit} (${biggestFav.varPct >= 0 ? '+' : ''}${biggestFav.varPct.toFixed(1)}%).` : ''} ${biggestUnfav ? `Conversely, operating cost overrun was registered in <em>${biggestUnfav.name}</em> (${metrics.curSymbol}${Math.abs(biggestUnfav.varAbs).toFixed(2)}${metrics.unit} over budget, ${biggestUnfav.varPct >= 0 ? '+' : ''}${biggestUnfav.varPct.toFixed(1)}%), triggering an executive variance alert.` : ''}<br><br>
• <strong>Controllership Recommendation:</strong> Maintain disciplined hiring velocity in implementation and review cloud infrastructure reserved instance commits to normalize hosting cost before next quarterly close.
    `.trim();

    box.innerHTML = narrative;
  },

  copyCommentary() {
    const text = document.getElementById("commentaryText").innerText;
    navigator.clipboard.writeText(text).then(() => {
      alert("Executive commentary copied to clipboard!");
    });
  },

  switchChart(type) {
    this.activeChartType = type;
    document.getElementById("btnChartPnl").classList.toggle("active-toggle", type === 'pnl');
    document.getElementById("btnChartOpex").classList.toggle("active-toggle", type === 'opex');
    this.renderChart();
  },

  renderChart() {
    const ctx = document.getElementById("varianceChart").getContext("2d");
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    let filteredItems = this.items;
    if (this.activeChartType === 'opex') {
      filteredItems = this.items.filter(i => i.category === 'Opex' || i.category === 'Cost of Goods Sold');
    } else {
      filteredItems = this.items.slice(0, 7);
    }

    const labels = filteredItems.map(i => i.name);
    const actualData = filteredItems.map(i => i.actual);
    const budgetData = filteredItems.map(i => i.budget);

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Actual',
            data: actualData,
            backgroundColor: '#08765D',
            borderRadius: 4
          },
          {
            label: 'Budget',
            data: budgetData,
            backgroundColor: '#102D37',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: 'Inter', size: 11, weight: '600' }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 10 } }
          },
          y: {
            grid: { color: '#DCE5E0' },
            ticks: { font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  },

  exportCSV() {
    const headers = ["LineItem", "Category", "Actual", "Budget", "PriorYear", "VarianceAbs", "VariancePct"];
    const rows = this.items.map(i => {
      const vAbs = i.actual - i.budget;
      const vPct = i.budget !== 0 ? (vAbs / i.budget) * 100 : 0;
      return [
        `"${i.name.replace(/"/g, '""')}"`,
        `"${i.category}"`,
        i.actual,
        i.budget,
        i.priorYear,
        vAbs.toFixed(2),
        vPct.toFixed(2)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `fpa_variance_analysis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  FpaApp.init();
});
