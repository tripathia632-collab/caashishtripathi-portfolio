/**
 * Editable Microsoft Word (.docx) OOXML Builder
 * Generates genuine .docx files 100% locally inside browser memory using JSZip.
 */

const DocxBuilder = {
  xmlEsc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  },

  p(text, opts = {}) {
    const {
      bold = false,
      size = 20, // half-points (20 = 10pt)
      color = "1E293B",
      align = "left",
      spaceBefore = 0,
      spaceAfter = 100,
      shading = null,
      leftBorder = null
    } = opts;

    const pPrParts = [
      `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="264" w:lineRule="auto"/>`,
      `<w:jc w:val="${align}"/>`
    ];

    if (shading) {
      pPrParts.push(`<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>`);
    }
    if (leftBorder) {
      pPrParts.push(
        `<w:pBdr><w:left w:val="single" w:sz="${leftBorder.sz || 18}" w:space="6" w:color="${leftBorder.color}"/></w:pBdr>`
      );
    }

    const rPr = [
      `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>`,
      bold ? "<w:b/>" : "",
      `<w:color w:val="${color}"/>`,
      `<w:sz w:val="${size}"/>`,
      `<w:szCs w:val="${size}"/>`
    ].join("");

    // Support newlines inside a paragraph cleanly
    const lines = String(text ?? "").split(/\r?\n/);
    const runs = lines
      .map((line, i) => {
        const br = i > 0 ? "<w:br/>" : "";
        return `${br}<w:t xml:space="preserve">${this.xmlEsc(line)}</w:t>`;
      })
      .join("");

    return `<w:p><w:pPr>${pPrParts.join("")}</w:pPr><w:r><w:rPr>${rPr}</w:rPr>${runs}</w:r></w:p>`;
  },

  cell(innerXml, opts = {}) {
    const {
      widthDxa = 4800,
      fill = null,
      borders = "none",
      topMargin = 90,
      bottomMargin = 90,
      leftMargin = 140,
      rightMargin = 140,
      vAlign = "center"
    } = opts;

    let bdrXml = `
      <w:tcBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
      </w:tcBorders>`;

    if (borders === "grid") {
      bdrXml = `
        <w:tcBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tcBorders>`;
    } else if (borders === "teal") {
      bdrXml = `
        <w:tcBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="0F766E"/>
          <w:left w:val="single" w:sz="24" w:space="0" w:color="0F766E"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="0F766E"/>
          <w:right w:val="single" w:sz="8" w:space="0" w:color="0F766E"/>
        </w:tcBorders>`;
    } else if (borders === "dashed") {
      bdrXml = `
        <w:tcBorders>
          <w:top w:val="dashed" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tcBorders>`;
    } else if (borders === "bottomTeal") {
      bdrXml = `
        <w:tcBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:right w:val="none"/>
          <w:bottom w:val="single" w:sz="16" w:space="0" w:color="0F766E"/>
        </w:tcBorders>`;
    }

    const shdXml = fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : "";

    return `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${widthDxa}" w:type="dxa"/>
          ${bdrXml}
          ${shdXml}
          <w:tcMar>
            <w:top w:w="${topMargin}" w:type="dxa"/>
            <w:left w:w="${leftMargin}" w:type="dxa"/>
            <w:bottom w:w="${bottomMargin}" w:type="dxa"/>
            <w:right w:w="${rightMargin}" w:type="dxa"/>
          </w:tcMar>
          <w:vAlign w:val="${vAlign}"/>
        </w:tcPr>
        ${innerXml}
      </w:tc>`;
  },

  table(rowsXml, totalWidthDxa = 9900) {
    return `
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="${totalWidthDxa}" w:type="dxa"/>
          <w:tblLayout w:type="fixed"/>
        </w:tblPr>
        ${rowsXml.map((r) => `<w:tr>${r}</w:tr>`).join("")}
      </w:tbl>`;
  },

  async buildLetterDocxBlob(party, settings) {
    if (!window.JSZip) {
      throw new Error("ZIP/DOCX library (JSZip) is not loaded yet.");
    }

    const f = LetterTemplates.getResolvedFields(party, settings);
    const copy = LetterTemplates.getBodyCopy(f, settings);

    // 1. Header Table
    const leftHeader = [
      this.p(settings.companyName || "Your Company Name", { bold: true, size: 26, color: "0B1220", spaceAfter: 30 }),
      this.p(settings.companyDept || "Finance & Accounts", { bold: true, size: 17, color: "0F766E", spaceAfter: 0 })
    ].join("");

    const rightLines = [
      settings.companyAddress || "",
      settings.companyTaxId || "",
      settings.companyEmail || ""
    ].filter(Boolean);
    const rightHeader = rightLines
      .map((ln, idx) => this.p(ln, { size: 16, color: "475569", align: "right", spaceAfter: idx === rightLines.length - 1 ? 0 : 25 }))
      .join("");

    const headerTable = this.table([
      this.cell(leftHeader, { widthDxa: 5400, borders: "bottomTeal", topMargin: 40, bottomMargin: 140, leftMargin: 0, rightMargin: 100 }) +
      this.cell(rightHeader, { widthDxa: 4500, borders: "bottomTeal", topMargin: 40, bottomMargin: 140, leftMargin: 100, rightMargin: 0 })
    ]);

    // 2. Title + Pill Table
    const titleBlock = this.table([
      this.cell(this.p(copy.heading, { bold: true, size: 24, color: "0B1220", spaceBefore: 160, spaceAfter: 80 }), { widthDxa: 7100, leftMargin: 0, topMargin: 80, bottomMargin: 60 }) +
      this.cell(this.p(f.drCrLabel.toUpperCase(), { bold: true, size: 16, color: "0F766E", align: "right", spaceBefore: 160, spaceAfter: 80 }), { widthDxa: 2800, rightMargin: 0, topMargin: 80, bottomMargin: 60 })
    ]);

    // 3. 2x2 Metadata Table
    const metaCell = (label, val) =>
      this.cell(
        this.p(label, { size: 15, color: "64748B", spaceAfter: 20 }) +
        this.p(val, { bold: true, size: 18, color: "0F172A", spaceAfter: 0 }),
        { widthDxa: 4950, fill: "F8FAFC", borders: "grid", topMargin: 70, bottomMargin: 70 }
      );

    const metaTable = this.table([
      metaCell("LETTER DATE", f.letterDateFmt) + metaCell("PARTY / CLIENT CODE", f.clientId),
      metaCell("REFERENCE NO.", f.refNo) + metaCell("REPORTING AS ON DATE", f.asOnDateFmt)
    ]);

    // 4. Addressee Block
    const extraLine = [f.gstin ? `GSTIN: ${f.gstin}` : "", f.email ? `Email: ${f.email}` : ""].filter(Boolean).join("   |   ");
    const addresseeXml = [
      this.p("To,", { size: 18, color: "64748B", spaceBefore: 160, spaceAfter: 20 }),
      this.p("The Accounts / Finance Department", { size: 18, color: "475569", spaceAfter: 30 }),
      this.p(f.clientName, { bold: true, size: 21, color: "0B1220", spaceAfter: 30 }),
      this.p(f.address, { size: 18, color: "334155", spaceAfter: extraLine ? 30 : 120 }),
      extraLine ? this.p(extraLine, { size: 16, color: "64748B", spaceAfter: 120 }) : ""
    ].join("");

    // 5. Subject Ribbon
    const subjectXml = this.p(copy.subject, {
      bold: true,
      size: 19,
      color: "0F172A",
      spaceBefore: 60,
      spaceAfter: 140,
      shading: "F1F5F9",
      leftBorder: { color: "0F766E", sz: 24 }
    });

    // 6. Salutation & Opening
    const bodyStart = [
      this.p("Dear Finance Team,", { bold: true, size: 19, color: "0F172A", spaceAfter: 80 }),
      this.p(copy.opening, { size: 19, color: "334155", spaceAfter: 140 })
    ].join("");

    // 7. Highlighted Balance Card
    const balLeft = [
      this.p(copy.boxLabel, { bold: true, size: 18, color: "0F766E", spaceAfter: 30 }),
      this.p(`As at ${f.asOnDateFmt}`, { size: 17, color: "475569", spaceAfter: 0 })
    ].join("");

    const balRight = [
      this.p(f.amountFmt, { bold: true, size: 28, color: "0B1220", align: "right", spaceAfter: 30 }),
      this.p(f.wordsFmt, { size: 16, color: "475569", align: "right", spaceAfter: 0 })
    ].join("");

    const balanceTable = this.table([
      this.cell(balLeft, { widthDxa: 4200, fill: "F0FDFA", borders: "teal", topMargin: 120, bottomMargin: 120 }) +
      this.cell(balRight, { widthDxa: 5700, fill: "F0FDFA", borders: "teal", topMargin: 120, bottomMargin: 120 })
    ]);

    // 8. Closing & Signatures
    const closingXml = this.p(copy.closing, { size: 19, color: "334155", spaceBefore: 140, spaceAfter: 160 });

    const leftSig = [
      this.p("Thanking you,\nYours faithfully,", { size: 18, color: "334155", spaceAfter: 40 }),
      this.p(`For ${settings.companyName || "Company Name"}`, { bold: true, size: 19, color: "0B1220", spaceAfter: 260 }),
      this.p("___________________________________", { size: 16, color: "94A3B8", spaceAfter: 30 }),
      this.p(settings.signatoryName || "Authorized Signatory", { bold: true, size: 18, color: "0F172A", spaceAfter: 20 }),
      this.p(`${settings.signatoryTitle || "Finance & Accounts"} | ${settings.companyEmail || ""}`, { size: 16, color: "64748B", spaceAfter: 0 })
    ].join("");

    const rightSig = settings.templateMode === "sa505"
      ? [
          this.p("DIRECT CONFIRMATION TO STATUTORY AUDITOR", { bold: true, size: 15, color: "0F766E", spaceAfter: 40 }),
          this.p(settings.auditorName || "", { bold: true, size: 18, color: "0F172A", spaceAfter: 25 }),
          this.p(settings.auditorEmail || "", { size: 17, color: "475569", spaceAfter: 0 })
        ].join("")
      : this.p("", { spaceAfter: 0 });

    const sigTable = this.table([
      this.cell(leftSig, { widthDxa: 5600, leftMargin: 0, topMargin: 40, bottomMargin: 80 }) +
      this.cell(rightSig, {
        widthDxa: 4300,
        fill: settings.templateMode === "sa505" ? "F8FAFC" : null,
        borders: settings.templateMode === "sa505" ? "grid" : "none",
        topMargin: 90,
        bottomMargin: 90,
        vAlign: "top"
      })
    ]);

    // 9. Tear-Off Confirmation Reply Slip
    let tearOffXml = "";
    if (settings.includeTearOff) {
      const slipInner = [
        this.p("CONFIRMATION REPLY SLIP — KINDLY RETURN SIGNED / EMAILED COPY", { bold: true, size: 16, color: "0F766E", align: "center", spaceAfter: 80 }),
        this.p(`Party: ${f.clientName} (${f.clientId})   |   Ref: ${f.refNo}`, { bold: true, size: 17, color: "0F172A", spaceAfter: 70 }),
        this.p(`[   ] Balance Confirmed: We confirm that the balance of ${f.amountFmt} (${f.shortType}) as at ${f.asOnDateFmt} agrees with our books.`, { size: 17, color: "334155", spaceAfter: 50 }),
        this.p(`[   ] Balance Disagreed: Per our books, the balance as at ${f.asOnDateFmt} is ₹______________________. Reconciliation statement attached.`, { size: 17, color: "334155", spaceAfter: 120 }),
        this.p("Authorised Signatory & Name: ________________________     Date: _____________     Company Seal: ______________", { size: 16, color: "64748B", spaceAfter: 0 })
      ].join("");

      tearOffXml = this.p("", { spaceBefore: 120, spaceAfter: 40 }) + this.table([
        this.cell(slipInner, { widthDxa: 9900, fill: "F8FAFC", borders: "dashed", topMargin: 120, bottomMargin: 120 })
      ]);
    }

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${headerTable}
    ${titleBlock}
    ${metaTable}
    ${addresseeXml}
    ${subjectXml}
    ${bodyStart}
    ${balanceTable}
    ${closingXml}
    ${sigTable}
    ${tearOffXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="860" w:right="1000" w:bottom="860" w:left="1000" w:header="400" w:footer="400" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="20"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.file("_rels/.rels", relsXml);
    zip.file("word/_rels/document.xml.rels", docRelsXml);
    zip.file("word/styles.xml", stylesXml);
    zip.file("word/document.xml", documentXml);

    return zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }
};
