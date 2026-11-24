# CA Ashish Tripathi | Personal Portfolio & Finance Automation Suite

> **Domain:** [caashishtripathi.in](https://caashishtripathi.in)  
> **Credentials:** Chartered Accountant (ICAI) • Cleared CA Final September 2025  
> **Focus:** Finance Transformation, FP&A Automation, Controllership & Applied AI  
> **Deploy Target:** Vercel (Zero-backend, instant static delivery, automatic HTTPS)

---

## 🌟 Executive Overview

This repository houses the personal career and executive interview portfolio of **CA Ashish Tripathi**. It showcases production financial software, automated tax reconciliation tools, and corporate FP&A dashboards designed to demonstrate real-world technical execution paired with statutory Chartered Accountant domain rigor.

### 🛠️ Interactive Tool Suite Included
1. **Dual-Compliance Fixed Asset Register (FAR):** (`/tools/fixed-asset-register/`)
   - Calculates daily pro-rata depreciation under **Companies Act, 2013 (Schedule II)** and **Income Tax Act, 1961 (Section 32)** simultaneously.
   - Enforces 5% residual value floors, Note 3 shift multipliers (1.5x / 2.0x), 180-day put-to-use rule, Section 50 capital gains, and AS 22 / Ind AS 12 Deferred Tax Asset/Liability (DTA/DTL) computation.
   - Features 1-click sample data, bulk Excel/CSV validation, and formatted workpaper exports.
2. **GSTWise Enterprise: GSTR-2B vs. Books Reconciler:** (`/tools/gst-reco/`)
   - High-speed reconciliation comparing Books Purchase Registers against GSTR-2B data using exact and configurable tolerance matching (₹1 to ₹10).
   - Features Rule 88A tax offset optimizer, Invoice Management System (IMS) actions, and 100% compliant official GSTN offline JSON generation.
3. **Bulk Audit Confirmation Letter Generator:** (`/tools/confirmation-generator/`)
   - Standard on Auditing (SA 505) compliant balance confirmation generator for Debtors, Creditors, and Loans.
   - Automatic rupee number-to-words conversion, custom auditee letterhead tokens, and printable third-party tear-off reply slips.
4. **FP&A Variance Analyzer & MIS Showcase:** (`/tools/fpa-dashboard/`)
   - Interactive Budget vs. Actuals variance analyzer with real-time recalculation of Gross Margin and EBITDA.
   - Automated executive board commentary narrative generator, customizable sensitivity threshold sliders, and star-schema Power BI DAX showcase.

---

## 💻 Local Testing & Verification

To run and preview the entire portfolio locally on your Mac:

```bash
cd "/Users/ashishtripathi/Documents/New Tools/Profile"
python3 -m http.server 3000
```

Open your browser and navigate to:
**`http://localhost:3000`**

---

## 🚀 How to Push to GitHub & Deploy to Vercel

### Step 1: Initialize Git and Commit
```bash
cd "/Users/ashishtripathi/Documents/New Tools/Profile"
git init
git add .
git commit -m "feat: Initial commit of CA Ashish Tripathi executive portfolio & finance tools suite"
```

### Step 2: Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Set repository name as: `caashishtripathi-portfolio` (or your choice).
3. Choose **Public** or **Private**.
4. Do NOT initialize with a README (this repository already has one).
5. Copy the remote URL and run in terminal:
```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/caashishtripathi-portfolio.git
git branch -M main
git push -u origin main
```

### Step 3: Import into Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Select your GitHub repository (`caashishtripathi-portfolio`).
4. Framework Preset: **Other** (Zero configuration needed, root directory is `./`).
5. Click **"Deploy"**. Your site will be live within 15 seconds!

### Step 4: Connect Your Domain (`caashishtripathi.in`)
1. In your Vercel project dashboard, go to **Settings** → **Domains**.
2. Enter `caashishtripathi.in` and `www.caashishtripathi.in`.
3. Vercel will display the exact DNS records to add:
   - **Type A Record:** `@` points to `76.76.21.21`
   - **Type CNAME Record:** `www` points to `cname.vercel-dns.com`
4. Log into where you purchased `caashishtripathi.in` (GoDaddy, Hostinger, Namecheap, etc.) → **DNS Management**, and add those two records.
5. Vercel will automatically provision a free SSL certificate within a few minutes!
