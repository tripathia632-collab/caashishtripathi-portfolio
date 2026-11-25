/**
 * Vector A4 PDF Letter Builder
 * Runs 100% in browser memory using jsPDF + local DejaVuSans TTF for native ₹ rendering.
 */

const PdfBuilder = {
  _fontCache: null,
  _fontPromise: null,

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    const chunks = [];
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize)));
    }
    return btoa(chunks.join(""));
  },

  async ensureFonts() {
    if (this._fontCache) return this._fontCache;
    if (this._fontPromise) return this._fontPromise;

    this._fontPromise = (async () => {
      try {
        const [regRes, boldRes] = await Promise.all([
          fetch("/tools/confirmation-generator/fonts/DejaVuSans.ttf"),
          fetch("/tools/confirmation-generator/fonts/DejaVuSans-Bold.ttf")
        ]);
        if (!regRes.ok || !boldRes.ok) {
          throw new Error("Font fetch failed");
        }
        const [regBuf, boldBuf] = await Promise.all([
          regRes.arrayBuffer(),
          boldRes.arrayBuffer()
        ]);
        this._fontCache = {
          regular: this.arrayBufferToBase64(regBuf),
          bold: this.arrayBufferToBase64(boldBuf),
          ready: true
        };
      } catch (e) {
        console.warn("Falling back to Helvetica PDF font:", e);
        this._fontCache = { ready: false };
      }
      return this._fontCache;
    })();

    return this._fontPromise;
  },

  registerFonts(doc, fontCache) {
    if (fontCache && fontCache.ready) {
      doc.addFileToVFS("DejaVuSans.ttf", fontCache.regular);
      doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
      doc.addFileToVFS("DejaVuSans-Bold.ttf", fontCache.bold);
      doc.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
      return { family: "DejaVuSans", hasRupee: true };
    }
    return { family: "helvetica", hasRupee: false };
  },

  safeText(txt, hasRupee) {
    const s = String(txt ?? "");
    return hasRupee ? s : s.replace(/₹/g, "Rs. ");
  },

  async buildLetterPdfBlob(party, settings) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("PDF engine (jsPDF) is not loaded yet.");
    }

    const fontCache = await this.ensureFonts();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const fontMeta = this.registerFonts(doc, fontCache);
    const F = fontMeta.family;
    const rupee = fontMeta.hasRupee;

    const f = LetterTemplates.getResolvedFields(party, settings);
    const copy = LetterTemplates.getBodyCopy(f, settings);
    const T = (v) => this.safeText(v, rupee);

    const pageW = 210;
    const margin = 16;
    const contentW = pageW - margin * 2;
    let y = 0;

    // 1. Top Gradient-Style Accent Strip
    doc.setFillColor(15, 118, 110); // #0F766E
    doc.rect(0, 0, pageW * 0.62, 3, "F");
    doc.setFillColor(67, 56, 202); // #4338CA
    doc.rect(pageW * 0.62, 0, pageW * 0.38, 3, "F");

    y = 13;

    // 2. Corporate Letterhead
    let textStartX = margin;
    if (settings.logoDataUrl) {
      try {
        const imgType = settings.logoDataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(settings.logoDataUrl, imgType, margin, y - 1, 13, 13);
        textStartX = margin + 16;
      } catch (_) {
        // Ignore invalid logo image silently
      }
    } else {
      // Crisp monogram badge
      doc.setFillColor(15, 118, 110);
      doc.roundedRect(margin, y - 1, 11, 11, 2, 2, "F");
      doc.setFont(F, "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      const mono = (settings.companyName || "CO").slice(0, 2).toUpperCase();
      doc.text(mono, margin + 5.5, y + 6, { align: "center" });
      textStartX = margin + 14.5;
    }

    // Left company name & department
    doc.setFont(F, "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(11, 18, 32);
    const coNameLines = doc.splitTextToSize(T(settings.companyName || "Your Company Name"), 92);
    doc.text(coNameLines, textStartX, y + 3.2);

    doc.setFont(F, "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 118, 110);
    doc.text(T(settings.companyDept || "Finance & Accounts"), textStartX, y + 3.2 + coNameLines.length * 4.5);

    // Right company contact block
    doc.setFont(F, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const rightInfoLines = [];
    if (settings.companyAddress) {
      rightInfoLines.push(...doc.splitTextToSize(T(settings.companyAddress), 68));
    }
    if (settings.companyTaxId) {
      rightInfoLines.push(...doc.splitTextToSize(T(settings.companyTaxId), 68));
    }
    if (settings.companyEmail) {
      rightInfoLines.push(T(settings.companyEmail));
    }
    let ry = y + 2.5;
    rightInfoLines.slice(0, 5).forEach((line) => {
      doc.text(line, pageW - margin, ry, { align: "right" });
      ry += 3.6;
    });

    y = Math.max(y + 15, ry + 3);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageW - margin, y);
    y += 7;

    // 3. Document Title + Badge
    doc.setFont(F, "bold");
    doc.setFontSize(12);
    doc.setTextColor(11, 18, 32);
    doc.text(T(copy.heading), margin, y);

    const badgeText = T(f.drCrLabel);
    doc.setFontSize(7.5);
    const badgeW = doc.getTextWidth(badgeText) + 7;
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(pageW - margin - badgeW, y - 4.5, badgeW, 6.2, 3, 3, "FD");
    doc.setTextColor(15, 118, 110);
    doc.text(badgeText, pageW - margin - badgeW / 2, y - 0.3, { align: "center" });

    y += 5.5;

    // 4. 2x2 Metadata Box
    const metaH = 17;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentW, metaH, 2, 2, "FD");
    doc.line(margin + contentW / 2, y, margin + contentW / 2, y + metaH);
    doc.line(margin, y + metaH / 2, pageW - margin, y + metaH / 2);

    const drawMetaCell = (cx, cy, label, val) => {
      doc.setFont(F, "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(T(label), cx + 3, cy + 3.4);
      doc.setFont(F, "bold");
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text(T(val), cx + 3, cy + 7.1);
    };

    drawMetaCell(margin, y, "LETTER DATE", f.letterDateFmt);
    drawMetaCell(margin + contentW / 2, y, "PARTY / CLIENT CODE", f.clientId);
    drawMetaCell(margin, y + metaH / 2, "REFERENCE NO.", f.refNo);
    drawMetaCell(margin + contentW / 2, y + metaH / 2, "REPORTING AS ON DATE", f.asOnDateFmt);

    y += metaH + 7;

    // 5. Addressee Block
    doc.setFont(F, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("To,", margin, y);
    y += 4.2;
    doc.setTextColor(71, 85, 105);
    doc.text("The Accounts / Finance Department", margin, y);
    y += 4.8;
    doc.setFont(F, "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 18, 32);
    const nameLines = doc.splitTextToSize(T(f.clientName), contentW);
    doc.text(nameLines, margin, y);
    y += nameLines.length * 4.5;

    doc.setFont(F, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const addrLines = doc.splitTextToSize(T(f.address), contentW * 0.78);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 4.1;

    const extras = [];
    if (f.gstin) extras.push(`GSTIN: ${f.gstin}`);
    if (f.email) extras.push(`Email: ${f.email}`);
    if (extras.length) {
      doc.setFontSize(7.8);
      doc.setTextColor(100, 116, 139);
      doc.text(T(extras.join("   |   ")), margin, y + 0.5);
      y += 4.5;
    }

    y += 3;

    // 6. Subject Ribbon
    const subjLines = doc.splitTextToSize(T(copy.subject), contentW - 8);
    const subjH = Math.max(8, subjLines.length * 4.3 + 3.5);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, subjH, "F");
    doc.setFillColor(15, 118, 110);
    doc.rect(margin, y, 1.3, subjH, "F");
    doc.setFont(F, "bold");
    doc.setFontSize(8.7);
    doc.setTextColor(15, 23, 42);
    doc.text(subjLines, margin + 4, y + 5.1);
    y += subjH + 6;

    // 7. Salutation & Opening Paragraph
    doc.setFont(F, "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Dear Finance Team,", margin, y);
    y += 5;

    doc.setFont(F, "normal");
    doc.setFontSize(8.7);
    doc.setTextColor(51, 65, 85);
    const openLines = doc.splitTextToSize(T(copy.opening), contentW);
    doc.text(openLines, margin, y);
    y += openLines.length * 4.3 + 4;

    // 8. Highlighted Balance Card
    const wordsLines = doc.splitTextToSize(T(f.wordsFmt), 102);
    const balBoxH = Math.max(21, 13 + wordsLines.length * 3.8);
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.45);
    doc.roundedRect(margin, y, contentW, balBoxH, 2.2, 2.2, "FD");

    doc.setFont(F, "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(15, 118, 110);
    doc.text(T(copy.boxLabel), margin + 5, y + 7.2);

    doc.setFont(F, "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(T(`As at ${f.asOnDateFmt}`), margin + 5, y + 12.2);

    doc.setFont(F, "bold");
    doc.setFontSize(13.5);
    doc.setTextColor(11, 18, 32);
    doc.text(T(f.amountFmt), pageW - margin - 5, y + 8.3, { align: "right" });

    doc.setFont(F, "normal");
    doc.setFontSize(7.3);
    doc.setTextColor(71, 85, 105);
    doc.text(wordsLines, pageW - margin - 5, y + 13.3, { align: "right" });

    y += balBoxH + 6;

    // 9. Closing Paragraph
    doc.setFont(F, "normal");
    doc.setFontSize(8.7);
    doc.setTextColor(51, 65, 85);
    const closeLines = doc.splitTextToSize(T(copy.closing), contentW);
    doc.text(closeLines, margin, y);
    y += closeLines.length * 4.3 + 5;

    // 10. Signatory & Optional Auditor Box
    const sigStartY = y;
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("Thanking you,", margin, y);
    y += 4.3;
    doc.text("Yours faithfully,", margin, y);
    y += 4.6;
    doc.setFont(F, "bold");
    doc.setTextColor(11, 18, 32);
    doc.text(T(`For ${settings.companyName || "Company Name"}`), margin, y);
    y += 12;

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + 65, y);
    y += 4;
    doc.setFont(F, "bold");
    doc.setFontSize(8.3);
    doc.text(T(settings.signatoryName || "Authorized Signatory"), margin, y);
    y += 3.8;
    doc.setFont(F, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(T(`${settings.signatoryTitle || "Finance & Accounts"} | ${settings.companyEmail || ""}`), margin, y);

    if (settings.templateMode === "sa505") {
      const boxW = 74;
      const boxX = pageW - margin - boxW;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(boxX, sigStartY + 2, boxW, 24, 2, 2, "FD");
      doc.setFont(F, "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(15, 118, 110);
      doc.text("DIRECT CONFIRMATION TO AUDITOR", boxX + 3.5, sigStartY + 7);
      doc.setFont(F, "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const audLines = doc.splitTextToSize(T(settings.auditorName || ""), boxW - 7);
      doc.text(audLines, boxX + 3.5, sigStartY + 12);
      doc.setFont(F, "normal");
      doc.setFontSize(7.4);
      doc.setTextColor(71, 85, 105);
      doc.text(T(settings.auditorEmail || ""), boxX + 3.5, sigStartY + 22);
    }

    // 11. Perforated Confirmation Reply Slip
    if (settings.includeTearOff) {
      const slipY = Math.max(y + 9, 232);
      doc.setDrawColor(148, 163, 184);
      doc.setLineDashPattern([2, 1.5], 0);
      doc.line(margin, slipY, pageW - margin, slipY);
      doc.setLineDashPattern([], 0);

      doc.setFillColor(255, 255, 255);
      doc.rect(pageW / 2 - 42, slipY - 2.5, 84, 5, "F");
      doc.setFont(F, "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("CONFIRMATION REPLY SLIP (SIGN & RETURN)", pageW / 2, slipY + 0.8, { align: "center" });

      const boxY = slipY + 4;
      const boxH = 44;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, boxY, contentW, boxH, 2, 2, "FD");

      doc.setFont(F, "bold");
      doc.setFontSize(7.6);
      doc.setTextColor(15, 23, 42);
      doc.text(T(`Party: ${f.clientName} (${f.clientId})`), margin + 4, boxY + 5.5);
      doc.text(T(`Ref: ${f.refNo}`), pageW - margin - 4, boxY + 5.5, { align: "right" });

      // Checkbox 1
      doc.setDrawColor(71, 85, 105);
      doc.rect(margin + 4, boxY + 9.2, 3.2, 3.2);
      doc.setFont(F, "normal");
      doc.setFontSize(7.6);
      doc.setTextColor(51, 65, 85);
      const chk1 = doc.splitTextToSize(
        T(`Balance Confirmed: We confirm that the balance of ${f.amountFmt} (${f.shortType}) as at ${f.asOnDateFmt} agrees with our books.`),
        contentW - 14
      );
      doc.text(chk1, margin + 9.5, boxY + 11.8);

      // Checkbox 2
      const c2Y = boxY + 9.2 + chk1.length * 3.8 + 2.2;
      doc.rect(margin + 4, c2Y, 3.2, 3.2);
      const chk2 = doc.splitTextToSize(
        T(`Balance Disagreed: Per our books, the balance as at ${f.asOnDateFmt} is ${rupee ? "₹" : "Rs. "}______________________. Reconciliation attached.`),
        contentW - 14
      );
      doc.text(chk2, margin + 9.5, c2Y + 2.6);

      // Bottom signature line
      doc.setFontSize(7.3);
      doc.setTextColor(100, 116, 139);
      doc.text("Authorised Signatory & Name: ________________________", margin + 4, boxY + boxH - 4.5);
      doc.text("Date: _____________   Company Seal: ______________", pageW - margin - 4, boxY + boxH - 4.5, { align: "right" });
    }

    // Subtle Privacy / Verification Footer
    doc.setFont(F, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("This statement is generated for periodic balance confirmation and reconciliation.", pageW / 2, 291, { align: "center" });

    return doc.output("blob");
  }
};
