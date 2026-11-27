/**
 * Excel & CSV Multi-File Consolidator Engine
 * 100% Client-Side via SheetJS — supports 2 to 2,000+ branch files,
 * dynamic union of mismatched columns, auto/manual/none header modes,
 * repeated-header stripping, left Source File tracking, sorting,
 * duplicate detection, and Branch Summary workbook generation.
 */
(function (global) {
  'use strict';

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function normalizeKey(str, smartMatch) {
    const raw = String(str == null ? '' : str).trim();
    if (!smartMatch) return raw;
    return raw
      .toLowerCase()
      .replace(/[\.\-_/\\:;()]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanDisplayHeader(str) {
    return String(str == null ? '' : str).replace(/\s+/g, ' ').trim();
  }

  function excelSerialToIsoDate(serial) {
    if (typeof serial !== 'number' || !Number.isFinite(serial)) return null;
    // Excel epoch: Dec 30 1899 (handles 1900 leap bug cleanly via SheetJS SSF)
    if (global.XLSX && global.XLSX.SSF && typeof global.XLSX.SSF.parse_date_code === 'function') {
      const d = global.XLSX.SSF.parse_date_code(serial);
      if (d && d.y >= 1900 && d.m >= 1 && d.d >= 1) {
        return {
          y: d.y,
          m: d.m,
          d: d.d,
          iso: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`,
          display: `${String(d.d).padStart(2, '0')}-${MONTHS[d.m - 1] || '01'}-${d.y}`
        };
      }
    }
    const utcDays = Math.floor(serial - 25569);
    const dt = new Date(utcDays * 86400 * 1000);
    if (Number.isNaN(dt.getTime())) return null;
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    return {
      y, m, d,
      iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      display: `${String(d).padStart(2, '0')}-${MONTHS[m - 1]}-${y}`
    };
  }

  function looksLikeDateFormat(fmt, formattedText) {
    if (fmt && /[dmyh]/i.test(fmt) && !/^general$/i.test(fmt) && !/0\.00/.test(fmt)) {
      return true;
    }
    if (formattedText && /^\d{1,4}[\/\-][A-Za-z0-9]{1,3}[\/\-]\d{2,4}$/.test(String(formattedText).trim())) {
      return true;
    }
    return false;
  }

  /**
   * Read a SheetJS worksheet into a 2D array preserving clean values:
   * - numbers stay numbers (unless formatted as dates, which become { __date: true, iso, display, serial })
   * - strings are trimmed cleanly without destroying internal text
   */
  function extractSheetMatrix(ws) {
    if (!ws || !ws['!ref'] || !global.XLSX) return [];
    const range = global.XLSX.utils.decode_range(ws['!ref']);
    const maxR = Math.min(range.e.r, range.s.r + 250000);
    const maxC = Math.min(range.e.c, range.s.c + 500);
    const rows = [];

    for (let r = range.s.r; r <= maxR; r++) {
      const row = [];
      let hasAny = false;
      for (let c = range.s.c; c <= maxC; c++) {
        const addr = global.XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell || cell.v === undefined || cell.v === null || cell.t === 'z') {
          row.push('');
          continue;
        }
        hasAny = true;
        if (cell.t === 'd' && cell.v instanceof Date) {
          const dt = cell.v;
          const y = dt.getFullYear();
          const m = dt.getMonth() + 1;
          const d = dt.getDate();
          row.push({
            __isDate: true,
            iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            display: `${String(d).padStart(2, '0')}-${MONTHS[m - 1]}-${y}`
          });
        } else if (cell.t === 'n') {
          if (looksLikeDateFormat(cell.z, cell.w) && cell.v > 20000 && cell.v < 80000) {
            const parsed = excelSerialToIsoDate(cell.v);
            row.push(parsed ? { __isDate: true, iso: parsed.iso, display: parsed.display, serial: cell.v } : cell.v);
          } else {
            row.push(cell.v);
          }
        } else if (cell.t === 'b') {
          row.push(cell.v ? 'TRUE' : 'FALSE');
        } else {
          const text = String(cell.v).trim();
          row.push(text);
        }
      }
      rows.push(hasAny ? row : []);
    }
    return rows;
  }

  function cellToString(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object' && val.__isDate) return val.display || val.iso || '';
    return String(val).trim();
  }

  function cellToComparable(val) {
    if (val === null || val === undefined || val === '') return { type: 'empty', val: '' };
    if (typeof val === 'object' && val.__isDate) return { type: 'date', val: val.iso || '' };
    if (typeof val === 'number' && Number.isFinite(val)) return { type: 'num', val };
    const s = String(val).trim();
    const numTest = Number(s.replace(/,/g, ''));
    if (s !== '' && !Number.isNaN(numTest) && /^-?[\d,]+(\.\d+)?$/.test(s)) {
      return { type: 'num', val: numTest };
    }
    return { type: 'str', val: s.toLowerCase() };
  }

  function isRowEmpty(row) {
    if (!row || !row.length) return true;
    for (let i = 0; i < row.length; i++) {
      const v = row[i];
      if (v !== '' && v !== null && v !== undefined) return false;
    }
    return true;
  }

  /**
   * Auto-detect the most likely header row index among the first 15 rows.
   * Skips 1-cell title banners ("XYZ Pvt Ltd", "Sales Register Oct 2026") and blank rows.
   */
  function detectHeaderRowIndex(matrix) {
    const scanLimit = Math.min(matrix.length, 15);
    let bestIdx = -1;
    let bestScore = -1;

    for (let r = 0; r < scanLimit; r++) {
      const row = matrix[r];
      if (isRowEmpty(row)) continue;

      let nonEmpty = 0;
      let textCells = 0;
      let numericCells = 0;
      const seen = new Set();

      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        if (val === '' || val === null || val === undefined) continue;
        nonEmpty++;
        if (typeof val === 'number' || (typeof val === 'object' && val.__isDate)) {
          numericCells++;
        } else {
          const s = String(val).trim();
          if (/^-?[\d,]+(\.\d+)?$/.test(s)) {
            numericCells++;
          } else {
            textCells++;
            seen.add(s.toLowerCase());
          }
        }
      }

      if (nonEmpty === 0) continue;
      // Favor rows with multiple distinct text labels and few raw numbers
      const score = (textCells * 3) + (seen.size * 1.5) - (numericCells * 1.2) - (r * 0.08);
      if (textCells >= 2 && score > bestScore) {
        bestScore = score;
        bestIdx = r;
      } else if (bestIdx === -1 && nonEmpty >= 1) {
        bestIdx = r;
        bestScore = score;
      }
    }

    return bestIdx < 0 ? 0 : bestIdx;
  }

  function parseWorkbookBuffer(arrayBuffer, fileName) {
    if (!global.XLSX) throw new Error('SheetJS library not loaded');
    const wb = global.XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
    const sheets = wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name];
      const matrix = extractSheetMatrix(ws);
      return { name, matrix };
    });
    return { fileName, sheets };
  }

  /**
   * Check whether a candidate data row is actually a repeated header row.
   */
  function isRepeatedHeaderRow(row, headerMetaList, smartMatch) {
    if (!row || !row.length || !headerMetaList.length) return false;
    let comparableCols = 0;
    let matches = 0;

    for (let i = 0; i < headerMetaList.length; i++) {
      const h = headerMetaList[i];
      if (!h.key) continue;
      const cellStr = normalizeKey(cellToString(row[h.colIdx]), smartMatch);
      if (!cellStr) continue;
      comparableCols++;
      if (cellStr === h.key) matches++;
    }

    if (comparableCols < 2) return false;
    return matches >= 2 && (matches / comparableCols) >= 0.6;
  }

  /**
   * Process all parsed files + current settings into a unified dataset.
   * Dynamic schema union, column rename/order/merge overrides, left tracking columns,
   * sorting, duplicate flagging, and branch summary generation.
   */
  function buildMergedDataset(files, options) {
    const opts = Object.assign({
      includeSourceFile: true,
      stripExtension: false,
      includeSheetName: false,
      headerMode: 'auto',      // 'auto' | 'row1' | 'custom' | 'none'
      customHeaderRow: 1,      // 1-based
      removeRepeatedHeaders: true,
      smartHeaderMatch: true,
      sheetMode: 'first',      // 'first' | 'all'
      skipEmptyRows: true,
      colOverrides: {},        // { colId: { hidden, rename, mergeInto, order } }
      sortColId: '',
      sortDir: 'asc',          // 'asc' | 'desc'
      duplicateKeyColId: '',
      dedupeMode: 'flag',      // 'flag' | 'drop'
      summaryGroupColId: '__source_file'
    }, options || {});

    const enabledFiles = (files || []).filter((f) => f.enabled && !f.error);

    // 1. Extract sheet records & discover union of all headers in order of appearance
    const schemaMap = new Map(); // normalizedKey -> { id, label, normKey, filesSet, sheetRowCount, isExtra }
    const rawExtractedRecords = [];
    let totalRepeatedRemoved = 0;
    let totalBlankSkipped = 0;
    const perFileStats = new Map();

    enabledFiles.forEach((file) => {
      let fileRowCount = 0;
      let fileRepeatedRemoved = 0;
      const fileColKeys = new Set();
      let detectedRow1Based = 1;

      const sheetsToRead = opts.sheetMode === 'all'
        ? (file.sheets || [])
        : ((file.sheets && file.sheets.length) ? [file.sheets[0]] : []);

      sheetsToRead.forEach((sheet) => {
        const matrix = sheet.matrix || [];
        if (!matrix.length) return;

        let headerIdx = 0;
        let hasHeader = true;
        if (opts.headerMode === 'none') {
          hasHeader = false;
          headerIdx = -1;
        } else if (opts.headerMode === 'row1') {
          headerIdx = 0;
        } else if (opts.headerMode === 'custom') {
          headerIdx = Math.max(0, (parseInt(opts.customHeaderRow, 10) || 1) - 1);
        } else {
          headerIdx = detectHeaderRowIndex(matrix);
        }
        detectedRow1Based = hasHeader ? (headerIdx + 1) : 0;

        // Determine max width across matrix
        let maxCols = 0;
        for (let r = 0; r < matrix.length; r++) {
          if (matrix[r].length > maxCols) maxCols = matrix[r].length;
        }
        if (maxCols === 0) return;

        const headerRow = hasHeader ? (matrix[headerIdx] || []) : [];
        const localHeaders = [];
        const dupLocalCounter = new Map();

        for (let c = 0; c < maxCols; c++) {
          const rawLabel = hasHeader ? cleanDisplayHeader(cellToString(headerRow[c])) : `Column ${c + 1}`;
          // Skip completely unnamed trailing columns with zero data across the sheet
          if (!rawLabel) {
            let colHasData = false;
            for (let r = headerIdx + 1; r < matrix.length; r++) {
              if (matrix[r] && matrix[r][c] !== '' && matrix[r][c] !== undefined && matrix[r][c] !== null) {
                colHasData = true;
                break;
              }
            }
            if (!colHasData) continue;
          }

          const baseLabel = rawLabel || `Column ${c + 1}`;
          let normKey = normalizeKey(baseLabel, opts.smartHeaderMatch);
          if (!normKey) normKey = `col_${c + 1}`;

          // Disambiguate duplicate header names within the SAME sheet (e.g. two "Amount" cols)
          const seenN = dupLocalCounter.get(normKey) || 0;
          dupLocalCounter.set(normKey, seenN + 1);
          const uniqueNormKey = seenN > 0 ? `${normKey}__dup${seenN + 1}` : normKey;
          const uniqueLabel = seenN > 0 ? `${baseLabel} (${seenN + 1})` : baseLabel;

          const colId = `c_${uniqueNormKey}`;
          fileColKeys.add(colId);

          if (!schemaMap.has(colId)) {
            schemaMap.set(colId, {
              id: colId,
              defaultLabel: uniqueLabel,
              normKey: uniqueNormKey,
              filesSet: new Set([file.id]),
              orderIndex: schemaMap.size
            });
          } else {
            schemaMap.get(colId).filesSet.add(file.id);
          }

          localHeaders.push({
            colIdx: c,
            colId,
            key: normalizeKey(baseLabel, opts.smartHeaderMatch)
          });
        }

        const startDataRow = hasHeader ? headerIdx + 1 : 0;
        for (let r = startDataRow; r < matrix.length; r++) {
          const row = matrix[r];
          if (opts.skipEmptyRows && isRowEmpty(row)) {
            totalBlankSkipped++;
            continue;
          }
          if (hasHeader && opts.removeRepeatedHeaders && isRepeatedHeaderRow(row, localHeaders, opts.smartHeaderMatch)) {
            totalRepeatedRemoved++;
            fileRepeatedRemoved++;
            continue;
          }

          const cells = {};
          for (let h = 0; h < localHeaders.length; h++) {
            const lh = localHeaders[h];
            const rawVal = row[lh.colIdx];
            if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
              cells[lh.colId] = rawVal;
            }
          }

          const cleanName = opts.stripExtension
            ? file.name.replace(/\.(xlsx|xls|xlsm|xlsb|csv|tsv|ods)$/i, '')
            : file.name;

          rawExtractedRecords.push({
            __fileId: file.id,
            __sourceFile: cleanName,
            __sourceSheet: sheet.name,
            __rowNum: r + 1,
            cells
          });
          fileRowCount++;
        }
      });

      perFileStats.set(file.id, {
        rowCount: fileRowCount,
        colCount: fileColKeys.size,
        colKeys: fileColKeys,
        repeatedRemoved: fileRepeatedRemoved,
        detectedHeaderRow: detectedRow1Based
      });
    });

    // 2. Build final Schema (including merged-into columns, renames, visibility & sorting)
    const rawCols = Array.from(schemaMap.values());
    const enabledCount = enabledFiles.length;

    // Identify columns missing from at least 1 enabled file when >1 file loaded
    rawCols.forEach((col) => {
      const ov = opts.colOverrides[col.id] || {};
      col.mergeInto = ov.mergeInto || '';
    });

    // Propagate file coverage from merged synonym columns into their target column
    rawCols.forEach((col) => {
      if (col.mergeInto && schemaMap.has(col.mergeInto) && col.mergeInto !== col.id) {
        const target = schemaMap.get(col.mergeInto);
        col.filesSet.forEach((fid) => target.filesSet.add(fid));
      }
    });

    rawCols.forEach((col) => {
      col.isExtra = enabledCount > 1 && col.filesSet.size < enabledCount;
      col.fileCoverage = col.filesSet.size;
    });

    // Active output data columns (excluding those merged into another column)
    const activeDataCols = rawCols
      .filter((col) => !col.mergeInto || !schemaMap.has(col.mergeInto) || col.mergeInto === col.id)
      .map((col, idx) => {
        const ov = opts.colOverrides[col.id] || {};
        return {
          id: col.id,
          label: (ov.rename && ov.rename.trim()) ? ov.rename.trim() : col.defaultLabel,
          defaultLabel: col.defaultLabel,
          hidden: !!ov.hidden,
          isSystem: false,
          isExtra: col.isExtra,
          fileCoverage: col.fileCoverage,
          totalFiles: enabledCount,
          order: typeof ov.order === 'number' ? ov.order : (idx + 100)
        };
      });

    // System left-tracking columns
    const systemCols = [];
    if (opts.includeSourceFile) {
      systemCols.push({
        id: '__source_file',
        label: (opts.colOverrides.__source_file && opts.colOverrides.__source_file.rename) || 'Source File',
        defaultLabel: 'Source File',
        hidden: false,
        isSystem: true,
        isExtra: false,
        fileCoverage: enabledCount,
        totalFiles: enabledCount,
        order: -20
      });
    }
    if (opts.includeSheetName) {
      systemCols.push({
        id: '__source_sheet',
        label: (opts.colOverrides.__source_sheet && opts.colOverrides.__source_sheet.rename) || 'Sheet Name',
        defaultLabel: 'Sheet Name',
        hidden: false,
        isSystem: true,
        isExtra: false,
        fileCoverage: enabledCount,
        totalFiles: enabledCount,
        order: -10
      });
    }

    activeDataCols.sort((a, b) => a.order - b.order);
    const allSchemaCols = systemCols.concat(activeDataCols);
    const visibleCols = allSchemaCols.filter((c) => !c.hidden);

    // Build merge map for synonym columns (sourceColId -> targetColId)
    const mergeMap = {};
    rawCols.forEach((col) => {
      if (col.mergeInto && schemaMap.has(col.mergeInto) && col.mergeInto !== col.id) {
        mergeMap[col.id] = col.mergeInto;
      }
    });

    // 3. Project records into final row objects
    let rows = rawExtractedRecords.map((rec, idx) => {
      const out = {
        __idx: idx,
        __fileId: rec.__fileId,
        __source_file: rec.__sourceFile,
        __source_sheet: rec.__sourceSheet,
        __dupCount: 1,
        __isDuplicate: false
      };

      // Assign raw values
      Object.keys(rec.cells).forEach((k) => {
        const targetKey = mergeMap[k] || k;
        if (out[targetKey] === undefined || out[targetKey] === '') {
          out[targetKey] = rec.cells[k];
        }
      });

      return out;
    });

    // 4. Duplicate Detection (if a Duplicate Check Key Column is chosen)
    let duplicateGroups = [];
    let duplicateRowCount = 0;
    if (opts.duplicateKeyColId) {
      const keyCounts = new Map();
      const keyBuckets = new Map();
      rows.forEach((r) => {
        const rawKey = cellToString(r[opts.duplicateKeyColId]);
        if (!rawKey) return;
        const norm = rawKey.toLowerCase();
        keyCounts.set(norm, (keyCounts.get(norm) || 0) + 1);
        if (!keyBuckets.has(norm)) keyBuckets.set(norm, []);
        keyBuckets.get(norm).push(r);
      });

      keyBuckets.forEach((bucket) => {
        if (bucket.length > 1) {
          duplicateGroups.push({
            keyVal: cellToString(bucket[0][opts.duplicateKeyColId]),
            count: bucket.length,
            rows: bucket
          });
          bucket.forEach((r, idx) => {
            r.__dupCount = bucket.length;
            r.__isDuplicate = idx > 0;
            if (idx > 0) duplicateRowCount++;
          });
        }
      });

      if (opts.dedupeMode === 'drop') {
        rows = rows.filter((r) => !r.__isDuplicate);
      }
    }

    // 5. Sorting
    if (opts.sortColId) {
      const dir = opts.sortDir === 'desc' ? -1 : 1;
      const colId = opts.sortColId;
      rows.sort((a, b) => {
        const ca = cellToComparable(a[colId]);
        const cb = cellToComparable(b[colId]);
        if (ca.type === 'empty' && cb.type === 'empty') return a.__idx - b.__idx;
        if (ca.type === 'empty') return 1; // keep blanks at bottom
        if (cb.type === 'empty') return -1;
        if (ca.type === 'num' && cb.type === 'num') {
          return ca.val === cb.val ? (a.__idx - b.__idx) : (ca.val - cb.val) * dir;
        }
        const sa = String(ca.val);
        const sb = String(cb.val);
        const cmp = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
        return cmp === 0 ? (a.__idx - b.__idx) : cmp * dir;
      });
    }

    // 6. Detect numeric columns & build Branch / File Summary
    const numericCols = activeDataCols.filter((col) => {
      if (col.hidden) return false;
      // Don't treat invoice numbers, percentages, rates, or IDs as summable currency/qty amounts
      const lname = col.label.toLowerCase();
      if (/(invoice|inv\b|bill|phone|mobile|gstin|pin|code|date|sr|s\.?no|id\b|%|percent|pct\b|rate\b|ratio)/i.test(lname)) return false;
      let numHits = 0;
      let nonEmpty = 0;
      const limit = Math.min(rows.length, 200);
      for (let i = 0; i < limit; i++) {
        const v = rows[i][col.id];
        if (v === undefined || v === null || v === '') continue;
        nonEmpty++;
        if (typeof v === 'number' && Number.isFinite(v)) numHits++;
        else if (typeof v === 'string' && /^-?[\d,]+(\.\d+)?$/.test(v.trim())) numHits++;
      }
      return nonEmpty > 0 && (numHits / nonEmpty) >= 0.7;
    });

    const summaryColId = opts.summaryGroupColId || '__source_file';
    const summaryGroupsMap = new Map();
    rows.forEach((r) => {
      const gVal = cellToString(r[summaryColId]) || '(Blank)';
      if (!summaryGroupsMap.has(gVal)) {
        const entry = { group: gVal, rowCount: 0, dupCount: 0, sums: {} };
        numericCols.forEach((nc) => { entry.sums[nc.id] = 0; });
        summaryGroupsMap.set(gVal, entry);
      }
      const g = summaryGroupsMap.get(gVal);
      g.rowCount++;
      if (r.__isDuplicate) g.dupCount++;
      numericCols.forEach((nc) => {
        const v = r[nc.id];
        const n = typeof v === 'number' ? v : Number(String(v || '').replace(/,/g, ''));
        if (Number.isFinite(n)) g.sums[nc.id] += n;
      });
    });

    const summaryRows = Array.from(summaryGroupsMap.values());
    const extraColCount = rawCols.filter((c) => c.isExtra && !c.mergeInto).length;

    return {
      rows,
      allSchemaCols,
      visibleCols,
      rawCols,
      numericCols,
      summaryRows,
      summaryColId,
      duplicateGroups,
      stats: {
        enabledFileCount: enabledCount,
        totalRowCount: rows.length,
        visibleColCount: visibleCols.length,
        extraColCount,
        repeatedRemoved: totalRepeatedRemoved,
        blankSkipped: totalBlankSkipped,
        duplicateCount: duplicateRowCount
      },
      perFileStats
    };
  }

  function exportCellValueForSheet(val) {
    if (val === undefined || val === null) return '';
    if (typeof val === 'object' && val.__isDate) {
      return val.display || val.iso || '';
    }
    return val;
  }

  function exportToExcel(dataset, filenameBase) {
    if (!global.XLSX) throw new Error('SheetJS library unavailable');
    const wb = global.XLSX.utils.book_new();
    const cols = dataset.visibleCols;

    // Sheet 1: Consolidated_Data
    const aoaMain = [cols.map((c) => c.label)];
    dataset.rows.forEach((r) => {
      aoaMain.push(cols.map((c) => exportCellValueForSheet(r[c.id])));
    });
    const wsMain = global.XLSX.utils.aoa_to_sheet(aoaMain);
    wsMain['!cols'] = cols.map((c) => {
      let maxLen = Math.max(12, String(c.label).length + 3);
      for (let i = 0; i < Math.min(dataset.rows.length, 60); i++) {
        const s = cellToString(dataset.rows[i][c.id]);
        if (s.length + 3 > maxLen) maxLen = Math.min(42, s.length + 3);
      }
      return { wch: maxLen };
    });
    global.XLSX.utils.book_append_sheet(wb, wsMain, 'Consolidated_Data');

    // Sheet 2: Branch_Summary (if we have summary rows)
    if (dataset.summaryRows && dataset.summaryRows.length) {
      const grpCol = dataset.allSchemaCols.find((c) => c.id === dataset.summaryColId);
      const grpLabel = grpCol ? grpCol.label : 'Group / Source';
      const sumHeaders = [grpLabel, 'Rows', 'Flagged Duplicates'].concat(
        dataset.numericCols.map((nc) => `Total ${nc.label}`)
      );
      const aoaSum = [sumHeaders];
      const grand = { rows: 0, dups: 0, sums: {} };
      dataset.numericCols.forEach((nc) => { grand.sums[nc.id] = 0; });

      dataset.summaryRows.forEach((sr) => {
        grand.rows += sr.rowCount;
        grand.dups += sr.dupCount;
        const line = [sr.group, sr.rowCount, sr.dupCount];
        dataset.numericCols.forEach((nc) => {
          const val = Math.round((sr.sums[nc.id] || 0) * 100) / 100;
          grand.sums[nc.id] += val;
          line.push(val);
        });
        aoaSum.push(line);
      });

      const grandLine = ['GRAND TOTAL', grand.rows, grand.dups].concat(
        dataset.numericCols.map((nc) => Math.round((grand.sums[nc.id] || 0) * 100) / 100)
      );
      aoaSum.push(grandLine);

      const wsSum = global.XLSX.utils.aoa_to_sheet(aoaSum);
      wsSum['!cols'] = sumHeaders.map((h) => ({ wch: Math.max(16, h.length + 4) }));
      global.XLSX.utils.book_append_sheet(wb, wsSum, 'Branch_Summary');
    }

    // Sheet 3: Duplicate_Check (if duplicates found)
    if (dataset.duplicateGroups && dataset.duplicateGroups.length) {
      const dupHeaders = ['Repeated Key', 'Repeat Count', 'Source File'].concat(
        cols.filter((c) => !c.isSystem).map((c) => c.label)
      );
      const aoaDup = [dupHeaders];
      dataset.duplicateGroups.forEach((grp) => {
        grp.rows.forEach((r) => {
          aoaDup.push(
            [grp.keyVal, grp.count, r.__source_file].concat(
              cols.filter((c) => !c.isSystem).map((c) => exportCellValueForSheet(r[c.id]))
            )
          );
        });
      });
      const wsDup = global.XLSX.utils.aoa_to_sheet(aoaDup);
      wsDup['!cols'] = dupHeaders.map((h) => ({ wch: Math.max(14, h.length + 4) }));
      global.XLSX.utils.book_append_sheet(wb, wsDup, 'Duplicate_Check');
    }

    const safeName = (filenameBase || 'Consolidated_Master_MIS').replace(/[\\/:*?"<>|]/g, '_');
    global.XLSX.writeFile(wb, `${safeName}.xlsx`);
  }

  function escapeCsvCell(val) {
    const str = cellToString(val);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function exportToCsv(dataset, filenameBase) {
    const cols = dataset.visibleCols;
    const lines = [];
    lines.push(cols.map((c) => escapeCsvCell(c.label)).join(','));
    dataset.rows.forEach((r) => {
      lines.push(cols.map((c) => escapeCsvCell(r[c.id])).join(','));
    });
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (filenameBase || 'Consolidated_Master_MIS').replace(/[\\/:*?"<>|]/g, '_');
    a.download = `${safeName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Generate 5 realistic branch Excel/CSV files cleanly in-memory using SheetJS
   * demonstrating: blank rows, multi-sheet workbook tabs, banner rows,
   * extra branch columns, repeated mid-file headers, smart casing match,
   * and an exact duplicate invoice record (matching branch, invoice & amount).
   */
  function generateSampleFiles() {
    if (!global.XLSX) return [];
    const defs = [
      {
        name: 'Mumbai_Main_Oct2026.xlsx',
        // Contains 1 blank row mid-sheet so "Skip blank rows" can be tested live
        sheets: [
          {
            sheetName: 'Sales_Oct',
            aoa: [
              ['Branch', 'Invoice No', 'Invoice Date', 'Customer Name', 'Net Sales', 'GST Amount'],
              ['Mumbai Main', 'INV-MUM-101', '2026-10-02', 'Reliance Retail Ltd', 145000, 26100],
              ['Mumbai Main', 'INV-MUM-102', '2026-10-05', 'Apex Distributors', 82500, 14850],
              ['', '', '', '', '', ''],
              ['Mumbai Main', 'INV-MUM-103', '2026-10-11', 'Horizon Logistics', 112000, 20160],
              ['Mumbai Main', 'INV-MUM-104', '2026-10-18', 'Metro Traders', 64000, 11520]
            ]
          }
        ]
      },
      {
        name: 'Delhi_NCR_Oct2026.xlsx',
        // Sheet 1 has ERP title banners (Auto-header detects Row 4);
        // Sheet 2 adds multi-sheet data so "First sheet only" vs "All sheets stacked" works live!
        sheets: [
          {
            sheetName: 'Sales_Oct',
            aoa: [
              ['ACME TRADING CO. - DELHI NCR BRANCH'],
              ['Monthly Sales Register (01-Oct-2026 to 31-Oct-2026)'],
              [],
              ['Branch', 'Invoice No', 'Invoice Date', 'Customer Name', 'Net Sales', 'GST Amount'],
              ['Delhi NCR', 'INV-DEL-201', '2026-10-03', 'NorthStar Infra', 198000, 35640],
              ['Delhi NCR', 'INV-DEL-202', '2026-10-09', 'Kaveri Hardware', 54000, 9720],
              ['Delhi NCR', 'INV-DEL-203', '2026-10-14', 'Capital Builders', 129500, 23310]
            ]
          },
          {
            sheetName: 'Week4_Extra',
            aoa: [
              ['Branch', 'Invoice No', 'Invoice Date', 'Customer Name', 'Net Sales', 'GST Amount'],
              ['Delhi NCR', 'INV-DEL-204', '2026-10-26', 'Yamuna Logistics', 91000, 16380],
              ['Delhi NCR', 'INV-DEL-205', '2026-10-29', 'NCR Steel Corp', 136000, 24480]
            ]
          }
        ]
      },
      {
        name: 'Pune_Retail_Oct2026.xlsx',
        // Contains a repeated header row mid-file + exact accidental duplicate of Mumbai's INV-MUM-102 (matching branch & amount)
        sheets: [
          {
            sheetName: 'Sales_Oct',
            aoa: [
              ['Branch', 'Invoice No', 'Invoice Date', 'Customer Name', 'Net Sales', 'GST Amount'],
              ['Pune Retail', 'INV-PUN-301', '2026-10-04', 'Sahyadri Enterprises', 76000, 13680],
              ['Pune Retail', 'INV-PUN-302', '2026-10-12', 'Deccan Motors', 94500, 17010],
              ['Branch', 'Invoice No', 'Invoice Date', 'Customer Name', 'Net Sales', 'GST Amount'],
              ['Mumbai Main', 'INV-MUM-102', '2026-10-05', 'Apex Distributors', 82500, 14850],
              ['Pune Retail', 'INV-PUN-304', '2026-10-21', 'Bajaj Auto Ancillary', 158000, 28440]
            ]
          }
        ]
      },
      {
        name: 'Bengaluru_Hub_Oct2026.xlsx',
        // Has TWO extra branch-only columns: Discount % and Sales Executive!
        sheets: [
          {
            sheetName: 'Sales_Oct',
            aoa: [
              ['Branch', 'Invoice No', 'Invoice Date', 'Customer Name', 'Net Sales', 'GST Amount', 'Discount %', 'Sales Executive'],
              ['Bengaluru Hub', 'INV-BLR-401', '2026-10-06', 'TechPark Solutions', 225000, 40500, 5, 'Karthik R'],
              ['Bengaluru Hub', 'INV-BLR-402', '2026-10-16', 'Mysore Silks & Crafts', 89000, 16020, 2.5, 'Ananya M'],
              ['Bengaluru Hub', 'INV-BLR-403', '2026-10-24', 'Indiranagar Cafe Co', 41500, 7470, 0, 'Karthik R']
            ]
          }
        ]
      },
      {
        name: 'Ahmedabad_West_Oct2026.csv',
        // Lowercase / dotted / trailing-space headings -> aligned via "Match similar column headings"
        sheets: [
          {
            sheetName: 'Sales_Oct',
            aoa: [
              ['branch', 'invoice no.', 'invoice date', 'customer name', 'net sales ', 'gst amount'],
              ['Ahmedabad West', 'INV-AMD-501', '2026-10-07', 'Sabarmati Chemicals', 173000, 31140],
              ['Ahmedabad West', 'INV-AMD-502', '2026-10-19', 'Gujarat Textile Mill', 118500, 21330]
            ]
          }
        ]
      }
    ];

    return defs.map((def, idx) => {
      const wb = global.XLSX.utils.book_new();
      def.sheets.forEach((sh) => {
        const ws = global.XLSX.utils.aoa_to_sheet(sh.aoa);
        global.XLSX.utils.book_append_sheet(wb, ws, sh.sheetName);
      });

      const isCsv = def.name.endsWith('.csv');
      let buf;
      if (isCsv) {
        const csvStr = global.XLSX.write(wb, { bookType: 'csv', type: 'string' });
        buf = new TextEncoder().encode(csvStr).buffer;
      } else {
        buf = global.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      }
      const parsed = parseWorkbookBuffer(buf, def.name);
      return {
        id: `sample_${idx}_${Date.now()}`,
        name: def.name,
        sizeBytes: buf.byteLength || buf.length || 1024,
        enabled: true,
        error: null,
        sheets: parsed.sheets
      };
    });
  }

  global.MergerEngine = {
    parseWorkbookBuffer,
    buildMergedDataset,
    exportToExcel,
    exportToCsv,
    generateSampleFiles,
    cellToString,
    normalizeKey
  };
})(window);
