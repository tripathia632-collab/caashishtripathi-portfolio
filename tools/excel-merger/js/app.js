/**
 * Excel & CSV Consolidator Studio — Full-Width Preview Controller
 * Pre-loads 5 realistic sample branch files demonstrating blank rows,
 * multi-sheet workbooks, banner skipping, repeated headers, extra columns,
 * and identical duplicate invoices.
 */
(function () {
  'use strict';

  const ACCEPTED_EXT = /\.(xlsx|xls|xlsm|xlsb|csv|tsv|ods)$/i;

  const state = {
    files: [],
    isSampleMode: true,
    dataset: null,
    activeStage: 'preview', // 'preview' | 'summary'
    importing: false,
    cancelImport: false,
    page: 1,
    pageSize: 100,
    searchQuery: '',
    onlyDups: false,
    fileSearch: '',
    pinnedHelpBtn: null,
    savedNamedDupKey: '',
    savedNamedSummaryKey: '',
    options: {
      includeSourceFile: true,
      stripExtension: false,
      includeSheetName: false,
      headerMode: 'auto',      // 'auto' | 'row1' | 'custom' | 'none'
      customHeaderRow: 1,
      removeRepeatedHeaders: true,
      smartHeaderMatch: true,
      sheetMode: 'first',      // 'first' | 'all'
      skipEmptyRows: true,
      colOverrides: {},
      sortColId: '',
      sortDir: 'asc',
      duplicateKeyColId: '',
      dedupeMode: 'flag',
      summaryGroupColId: '__source_file'
    }
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(msg, isError) {
    const t = els.toast;
    if (!t) return;
    t.textContent = msg;
    t.className = isError ? 'toast error' : 'toast';
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), 3200);
  }

  function formatInt(n) {
    return Number(n || 0).toLocaleString('en-IN');
  }

  function formatNum(n) {
    return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function cacheElements() {
    [
      'fileInput', 'folderInput', 'dropzone', 'dropSubHint',
      'pickFilesBtn', 'pickFolderBtn', 'loadSampleBtn', 'emptySampleBtn',
      'modeBadge', 'importProgress', 'importProgressText', 'importProgressFill',
      'cancelImportBtn', 'fileInvWrap', 'fileCountHeading', 'fileInvMeta',
      'toggleAllFilesBtn',
      'clearFilesBtn', 'fileSearchInput', 'fileList', 'optSourceFile',
      'sourceSubOpts', 'optStripExt', 'optSheetName', 'optHeaderMode',
      'customRowWrap', 'optCustomHeaderRow', 'repeatHeaderWrap',
      'optRemoveRepeated', 'smartMatchWrap', 'optSmartMatch', 'optSheetMode',
      'optSkipBlank', 'optDupKey', 'optDupAction', 'optSummaryGroup',
      'summaryStatMain', 'summaryStatChips', 'exportFilename', 'exportCsvBtn',
      'exportXlsxBtn', 'tabPreviewBadge', 'tabDupBadge', 'previewToolbar',
      'sortColSelect', 'sortDirBtn', 'clearSortBtn', 'dupFilterLabel',
      'optOnlyDups', 'tableSearchInput', 'emptyStage', 'sheetScroll',
      'previewThead', 'previewTbody', 'sheetFooter', 'pagerInfo',
      'pageSizeSelect', 'prevPageBtn', 'nextPageBtn', 'pageNumText',
      'summaryGroupBadge', 'summaryThead', 'summaryTbody', 'dupAuditContent',
      'helpPopover', 'helpPopTitle', 'helpPopBody', 'privacyBtn',
      'privacyModal', 'toast'
    ].forEach((id) => { els[id] = $(id); });
  }

  /**
   * Decide whether a column makes logical sense for "Group branch totals by":
   * Include Source File, Sheet Name, and categorical dimensions (Branch, Customer Name, Sales Executive);
   * exclude unique IDs / Invoices / Dates / numeric amount columns.
   */
  function isLogicalGroupColumn(col, numericColSet) {
    if (col.isSystem) return true;
    if (numericColSet.has(col.id)) return false;
    const lname = String(col.label || '').toLowerCase();
    if (/(invoice|inv\b|bill|voucher|vch|doc\b|ref\b|receipt|challan|date|time|sr\.?\s*no|s\.?no|\bid\b|gstin|pan\b|mobile|phone|amount|total|net\s*sales|gst|tax|cgst|sgst|igst|rate|%|percent|qty|quantity)/i.test(lname)) {
      return false;
    }
    return true;
  }

  /**
   * Exclude pure numeric currency amount columns from "Check duplicates by".
   */
  function isLogicalDupKeyColumn(col, numericColSet) {
    if (col.isSystem) return false;
    if (numericColSet.has(col.id)) return false;
    const lname = String(col.label || '').toLowerCase();
    if (/(net\s*sales|amount|gst|cgst|sgst|igst|discount\s*%|tax|total|rate)/i.test(lname)) {
      return false;
    }
    return true;
  }

  function rebuildAndRender() {
    state.dataset = window.MergerEngine.buildMergedDataset(state.files, state.options);
    syncOptionSelects();
    renderSummaryBar();
    renderFileList();
    renderActiveStage();
  }

  function syncOptionSelects() {
    const ds = state.dataset;
    const cols = ds ? ds.allSchemaCols.filter((c) => !c.hidden) : [];
    const nonSystemCols = ds ? ds.allSchemaCols.filter((c) => !c.isSystem && !c.hidden) : [];
    const numericSet = new Set((ds && ds.numericCols ? ds.numericCols : []).map((nc) => nc.id));

    // Sort Order
    const prevSort = state.options.sortColId;
    let sortHtml = '<option value="">Original File Order</option>';
    cols.forEach((c) => {
      sortHtml += `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`;
    });
    els.sortColSelect.innerHTML = sortHtml;
    if (cols.some((c) => c.id === prevSort)) {
      els.sortColSelect.value = prevSort;
    } else {
      state.options.sortColId = '';
      els.sortColSelect.value = '';
    }
    els.sortDirBtn.textContent = state.options.sortDir === 'desc' ? 'Desc ↓' : 'Asc ↑';
    els.clearSortBtn.classList.toggle('hidden', !state.options.sortColId);

    // Check Duplicates By (exclude numeric amounts; keep IDs like Invoice No first)
    const dupCandidates = nonSystemCols.filter((c) => isLogicalDupKeyColumn(c, numericSet));
    const dupList = dupCandidates.length ? dupCandidates : nonSystemCols;
    const prevDup = state.options.duplicateKeyColId;
    let dupHtml = '<option value="">Off (Keep all)</option>';
    dupList.forEach((c) => {
      dupHtml += `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`;
    });
    els.optDupKey.innerHTML = dupHtml;
    if (dupList.some((c) => c.id === prevDup)) {
      els.optDupKey.value = prevDup;
    } else {
      state.options.duplicateKeyColId = '';
      els.optDupKey.value = '';
    }

    // Group Branch Totals By (exclude unique IDs like Invoice No, Dates, and Numeric Amounts)
    const grpCandidates = cols.filter((c) => isLogicalGroupColumn(c, numericSet));
    const prevGrp = state.options.summaryGroupColId;
    let grpHtml = '';
    grpCandidates.forEach((c) => {
      grpHtml += `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`;
    });
    if (!grpHtml) grpHtml = '<option value="__source_file">Source File</option>';
    els.optSummaryGroup.innerHTML = grpHtml;
    const validGrp = Array.from(els.optSummaryGroup.options).some((o) => o.value === prevGrp);
    if (validGrp) {
      els.optSummaryGroup.value = prevGrp;
    } else {
      state.options.summaryGroupColId = els.optSummaryGroup.options[0].value;
      els.optSummaryGroup.value = state.options.summaryGroupColId;
    }
  }

  function renderSummaryBar() {
    const ds = state.dataset;
    const st = ds.stats;
    const totalFiles = state.files.length;

    if (!totalFiles) {
      els.summaryStatMain.innerHTML = 'No files loaded yet';
    } else {
      els.summaryStatMain.innerHTML = `<strong>${formatInt(st.totalRowCount)}</strong> rows &middot; <strong>${st.enabledFileCount}</strong> file${st.enabledFileCount === 1 ? '' : 's'} &middot; <strong>${st.visibleColCount}</strong> columns`;
    }

    let chips = '';
    if (totalFiles && state.isSampleMode) {
      chips += '<span class="sample-label">Sample data</span>';
    }
    if (st.repeatedRemoved > 0) {
      chips += `<span class="mini-pill cleaned">${st.repeatedRemoved} rep hdr removed</span>`;
    }
    if (st.blankSkipped > 0) {
      chips += `<span class="mini-pill cleaned">${st.blankSkipped} blank skipped</span>`;
    }
    if (st.extraColCount > 0) {
      chips += `<span class="mini-pill extra">${st.extraColCount} extra cols</span>`;
    }
    if (st.duplicateCount > 0) {
      const verb = state.options.dedupeMode === 'drop' ? 'eliminated' : 'flagged';
      chips += `<span class="mini-pill extra">${st.duplicateCount} dup ${verb}</span>`;
    }
    const errCount = state.files.filter((f) => f.error).length;
    if (errCount > 0) {
      chips += `<span class="mini-pill err">${errCount} unreadable</span>`;
    }
    els.summaryStatChips.innerHTML = chips;

    els.tabPreviewBadge.textContent = formatInt(st.totalRowCount);
    els.tabDupBadge.textContent = `${st.duplicateCount} dup`;
    els.tabDupBadge.classList.toggle('hidden', st.duplicateCount === 0);

    const hasRows = st.totalRowCount > 0 && st.visibleColCount > 0;
    els.exportXlsxBtn.disabled = !hasRows;
    els.exportCsvBtn.disabled = !hasRows;

    if (!totalFiles) {
      els.modeBadge.textContent = 'Empty';
      els.modeBadge.className = 'panel-tag';
      els.dropSubHint.textContent = 'Excel & CSV · 2 to 2,000+ files';
    } else if (state.isSampleMode) {
      els.modeBadge.textContent = 'Sample files';
      els.modeBadge.className = 'panel-tag is-demo';
      els.dropSubHint.textContent = 'Replaces samples on upload';
    } else {
      els.modeBadge.textContent = `${st.enabledFileCount} real file(s)`;
      els.modeBadge.className = 'panel-tag is-real';
      els.dropSubHint.textContent = 'Drop more files to append';
    }
  }

  function renderFileList() {
    const hasFiles = state.files.length > 0;
    els.fileInvWrap.classList.toggle('hidden', !hasFiles);
    if (!hasFiles) return;

    const enabledCount = state.files.filter((f) => f.enabled && !f.error).length;
    if (els.fileCountHeading) els.fileCountHeading.textContent = `(${state.files.length})`;
    els.fileInvMeta.textContent = `${enabledCount} of ${state.files.length} included`;
    els.toggleAllFilesBtn.textContent = enabledCount === state.files.length ? 'Uncheck all' : 'Check all';
    els.fileSearchInput.classList.toggle('hidden', state.files.length < 6);

    const q = state.fileSearch.trim().toLowerCase();
    const visibleFiles = q
      ? state.files.filter((f) => f.name.toLowerCase().includes(q))
      : state.files;

    const ds = state.dataset;
    const extraSet = new Set(ds.rawCols.filter((c) => c.isExtra && !c.mergeInto).map((c) => c.id));
    const maxRender = 200;
    let html = '';

    visibleFiles.slice(0, maxRender).forEach((f) => {
      const fStat = ds.perFileStats ? ds.perFileStats.get(f.id) : null;
      let extraInFile = 0;
      if (fStat && fStat.colKeys) {
        fStat.colKeys.forEach((ck) => { if (extraSet.has(ck)) extraInFile++; });
      }

      let badges = '';
      if (f.error) {
        badges = `<span class="mini-pill err">${escapeHtml(f.error)}</span>`;
      } else if (fStat) {
        badges += `<span class="mini-pill">${formatInt(fStat.rowCount)} rows</span>`;
        if (f.sheets && f.sheets.length > 1) {
          badges += `<span class="mini-pill cleaned">${f.sheets.length}sh</span>`;
        }
        if (extraInFile > 0) {
          badges += `<span class="mini-pill extra">+${extraInFile}</span>`;
        }
      }

      const cls = ['file-item'];
      if (!f.enabled) cls.push('is-disabled');
      if (f.error) cls.push('is-error');

      html += `
        <div class="${cls.join(' ')}" data-file-id="${escapeHtml(f.id)}">
          <input type="checkbox" class="file-toggle" ${f.enabled ? 'checked' : ''} ${f.error ? 'disabled' : ''} aria-label="Include ${escapeHtml(f.name)}">
          <div class="file-row-inner">
            <span class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
            <span class="file-badges">${badges}</span>
          </div>
          <button type="button" class="icon-del file-remove" title="Remove file">&times;</button>
        </div>`;
    });

    if (visibleFiles.length > maxRender) {
      html += `<div style="font-size:11px;color:var(--muted);text-align:center;padding:4px;">Showing first ${maxRender} of ${visibleFiles.length} files (all merge).</div>`;
    }

    els.fileList.innerHTML = html;
  }

  function renderActiveStage() {
    $('stage-preview').classList.toggle('hidden', state.activeStage !== 'preview');
    $('stage-summary').classList.toggle('hidden', state.activeStage !== 'summary');

    document.querySelectorAll('.stage-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.stage === state.activeStage);
    });

    if (state.activeStage === 'preview') renderPreviewTable();
    else if (state.activeStage === 'summary') renderSummaryAndDups();
  }

  function getFilteredRows() {
    const ds = state.dataset;
    if (!ds || !ds.rows.length) return [];
    let rows = ds.rows;
    if (state.onlyDups && state.options.duplicateKeyColId) {
      rows = rows.filter((r) => r.__dupCount > 1);
    }
    const q = state.searchQuery.trim().toLowerCase();
    if (!q) return rows;
    const cols = ds.visibleCols;
    return rows.filter((r) => {
      for (let i = 0; i < cols.length; i++) {
        const s = window.MergerEngine.cellToString(r[cols[i].id]).toLowerCase();
        if (s.includes(q)) return true;
      }
      return false;
    });
  }

  function renderPreviewTable() {
    const ds = state.dataset;
    const hasData = ds && ds.rows.length > 0 && ds.visibleCols.length > 0;

    els.emptyStage.classList.toggle('hidden', hasData);
    els.previewToolbar.classList.toggle('hidden', !hasData);
    els.sheetScroll.classList.toggle('hidden', !hasData);
    els.sheetFooter.classList.toggle('hidden', !hasData);
    if (!hasData) return;

    const dupAvailable = Boolean(state.options.duplicateKeyColId && ds.duplicateGroups.length > 0);
    els.dupFilterLabel.classList.toggle('hidden', !dupAvailable);

    const cols = ds.visibleCols;
    const filtered = getFilteredRows();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    const startIdx = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(startIdx, startIdx + state.pageSize);

    let thead = '<tr><th class="col-rownum">#</th>';
    cols.forEach((col) => {
      const cls = [];
      if (col.isSystem) cls.push('col-source');
      else if (col.isExtra) cls.push('col-extra');
      const isSorted = state.options.sortColId === col.id;
      const sortArrow = isSorted ? (state.options.sortDir === 'desc' ? ' ↓' : ' ↑') : '';
      const extraTag = col.isExtra
        ? `<span class="extra-tag" title="Present in ${col.fileCoverage} of ${col.totalFiles} files">${col.fileCoverage}/${col.totalFiles}</span>`
        : '';

      thead += `<th class="${cls.join(' ')}" data-sort-col="${escapeHtml(col.id)}" title="Click to sort">
        <span class="th-inner">${escapeHtml(col.label)}${extraTag}<span class="sort-arrow">${sortArrow}</span></span>
      </th>`;
    });
    thead += '</tr>';
    els.previewThead.innerHTML = thead;

    let tbody = '';
    if (!pageRows.length) {
      tbody = `<tr><td colspan="${cols.length + 1}" style="text-align:center;padding:28px;color:var(--muted);">No rows match your current filter.</td></tr>`;
    } else {
      pageRows.forEach((row, i) => {
        const rowNum = startIdx + i + 1;
        const isDup = row.__dupCount > 1;
        tbody += `<tr class="${isDup ? 'is-dup-row' : ''}">`;
        tbody += `<td class="col-rownum">${rowNum}</td>`;
        cols.forEach((col, cIdx) => {
          const val = row[col.id];
          const isEmpty = val === undefined || val === null || val === '';
          const tdCls = [];
          if (col.isSystem) tdCls.push('col-source');
          if (isEmpty) tdCls.push('col-empty');
          else if (typeof val === 'number') tdCls.push('col-num');

          const display = isEmpty
            ? '—'
            : (typeof val === 'number' ? formatNum(val) : window.MergerEngine.cellToString(val));
          const dupHtml = (isDup && cIdx === 0)
            ? `<span class="dup-badge">DUP &times;${row.__dupCount}</span>`
            : '';

          tbody += `<td class="${tdCls.join(' ')}" title="${escapeHtml(display)}">${escapeHtml(display)}${dupHtml}</td>`;
        });
        tbody += '</tr>';
      });
    }
    els.previewTbody.innerHTML = tbody;

    const fromNum = total === 0 ? 0 : startIdx + 1;
    const toNum = Math.min(total, startIdx + state.pageSize);
    els.pagerInfo.textContent = `Showing ${formatInt(fromNum)}–${formatInt(toNum)} of ${formatInt(total)} row(s)`;
    els.pageNumText.textContent = `${state.page} / ${totalPages}`;
    els.prevPageBtn.disabled = state.page <= 1;
    els.nextPageBtn.disabled = state.page >= totalPages;
  }

  function renderSummaryAndDups() {
    const ds = state.dataset;
    const sumColObj = ds.allSchemaCols.find((c) => c.id === ds.summaryColId);
    els.summaryGroupBadge.textContent = `Grouped by: ${sumColObj ? sumColObj.label : 'Source File'}`;

    if (!ds.summaryRows.length) {
      els.summaryThead.innerHTML = '';
      els.summaryTbody.innerHTML = '<tr><td style="text-align:center;padding:24px;color:var(--muted);">No data loaded to summarize.</td></tr>';
    } else {
      let th = '<tr><th>Group / Source</th><th>Rows</th><th>Flagged Duplicates</th>';
      ds.numericCols.forEach((nc) => {
        th += `<th style="text-align:right;">Total ${escapeHtml(nc.label)}</th>`;
      });
      th += '</tr>';
      els.summaryThead.innerHTML = th;

      let tb = '';
      const grand = { rows: 0, dups: 0, sums: {} };
      ds.numericCols.forEach((nc) => { grand.sums[nc.id] = 0; });

      ds.summaryRows.forEach((sr) => {
        grand.rows += sr.rowCount;
        grand.dups += sr.dupCount;
        tb += `<tr>
          <td><strong>${escapeHtml(sr.group)}</strong></td>
          <td style="font-family:var(--mono);">${formatInt(sr.rowCount)}</td>
          <td style="font-family:var(--mono);">${sr.dupCount ? `<span class="dup-badge">${sr.dupCount}</span>` : '0'}</td>`;
        ds.numericCols.forEach((nc) => {
          const val = sr.sums[nc.id] || 0;
          grand.sums[nc.id] += val;
          tb += `<td style="text-align:right;font-family:var(--mono);">${formatNum(val)}</td>`;
        });
        tb += '</tr>';
      });

      tb += `<tr style="background:var(--surface-2);font-weight:700;">
        <td>GRAND TOTAL</td>
        <td style="font-family:var(--mono);">${formatInt(grand.rows)}</td>
        <td style="font-family:var(--mono);">${formatInt(grand.dups)}</td>`;
      ds.numericCols.forEach((nc) => {
        tb += `<td style="text-align:right;font-family:var(--mono);">${formatNum(grand.sums[nc.id] || 0)}</td>`;
      });
      tb += '</tr>';
      els.summaryTbody.innerHTML = tb;
    }

    if (!state.options.duplicateKeyColId) {
      els.dupAuditContent.innerHTML = 'Pick a column like <strong>Invoice No</strong> under <em>3. Checks &amp; totals</em> above to inspect or remove repeated records.';
    } else if (!ds.duplicateGroups.length) {
      els.dupAuditContent.innerHTML = '<span style="color:var(--ok);font-weight:600;">No repeated records found for this column.</span>';
    } else {
      const verb = state.options.dedupeMode === 'drop'
        ? 'repeated key value(s) — extra rows eliminated cleanly (first record kept):'
        : 'repeated key value(s) — switch Action to "Remove Extras" to eliminate double counting:';
      let dHtml = `<p style="margin-bottom:8px;color:var(--warn);font-weight:600;">Found ${ds.duplicateGroups.length} ${verb}</p>`;
      dHtml += '<table class="schema-table"><thead><tr><th>Repeated Key</th><th>Count</th><th>Amount / Summary</th><th>Appears In Files</th></tr></thead><tbody>';
      ds.duplicateGroups.slice(0, 100).forEach((grp) => {
        const filesSet = Array.from(new Set(grp.rows.map((r) => r.__source_file)));
        const firstRow = grp.rows[0];
        const amtSummary = ds.numericCols.slice(0, 2).map((nc) => {
          const v = firstRow[nc.id];
          return v !== undefined && v !== '' ? `${nc.label}: ${formatNum(v)}` : '';
        }).filter(Boolean).join(' · ') || '—';
        dHtml += `<tr>
          <td><code>${escapeHtml(grp.keyVal)}</code></td>
          <td><span class="dup-badge">&times;${grp.count}</span></td>
          <td style="font-family:var(--mono);font-size:12px;">${escapeHtml(amtSummary)}</td>
          <td>${escapeHtml(filesSet.join(', '))}</td>
        </tr>`;
      });
      dHtml += '</tbody></table>';
      els.dupAuditContent.innerHTML = dHtml;
    }
  }

  async function ingestFileList(fileListObj) {
    const rawFiles = Array.from(fileListObj || []).filter((f) => ACCEPTED_EXT.test(f.name) && !f.name.startsWith('~$'));
    if (!rawFiles.length) {
      showToast('Please select Excel (.xlsx / .xls) or CSV files.', true);
      return;
    }

    if (state.isSampleMode) {
      state.files = [];
      state.isSampleMode = false;
      state.options.colOverrides = {};
      state.options.sortColId = '';
      state.options.duplicateKeyColId = '';
      state.options.summaryGroupColId = '__source_file';
    }

    state.importing = true;
    state.cancelImport = false;
    els.importProgress.classList.remove('hidden');

    let added = 0;
    let errors = 0;
    const total = rawFiles.length;

    for (let i = 0; i < total; i++) {
      if (state.cancelImport) break;
      const f = rawFiles[i];
      const pct = Math.round(((i + 1) / total) * 100);
      els.importProgressText.textContent = `Reading ${i + 1} / ${total}: ${f.name}`;
      els.importProgressFill.style.width = `${pct}%`;

      try {
        const buf = await f.arrayBuffer();
        const parsed = window.MergerEngine.parseWorkbookBuffer(buf, f.name);
        state.files.push({
          id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: f.name,
          sizeBytes: f.size,
          enabled: true,
          error: null,
          sheets: parsed.sheets
        });
        added++;
      } catch (err) {
        state.files.push({
          id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: f.name,
          sizeBytes: f.size,
          enabled: false,
          error: 'Unreadable / password-locked',
          sheets: []
        });
        errors++;
      }

      if (i % 6 === 5) {
        await new Promise((res) => setTimeout(res, 0));
      }
    }

    state.importing = false;
    els.importProgress.classList.add('hidden');
    state.page = 1;
    rebuildAndRender();

    if (errors > 0) {
      showToast(`Imported ${added} file(s); ${errors} unreadable file(s) skipped.`, true);
    } else {
      showToast(`Merged ${added} file(s) locally.`);
    }
  }

  function loadSamples(silent) {
    try {
      state.files = window.MergerEngine.generateSampleFiles();
      state.isSampleMode = true;
      state.options.colOverrides = {};
      state.options.sortColId = '';
      state.options.sortDir = 'asc';
      state.options.duplicateKeyColId = '';
      state.options.summaryGroupColId = '__source_file';
      state.savedNamedDupKey = '';
      state.savedNamedSummaryKey = '';
      state.searchQuery = '';
      state.onlyDups = false;
      els.tableSearchInput.value = '';
      els.optOnlyDups.checked = false;
      state.page = 1;
      rebuildAndRender();

      const invCol = state.dataset.allSchemaCols.find((c) => /invoice\s*no/i.test(c.label));
      if (invCol) {
        state.options.duplicateKeyColId = invCol.id;
        els.optDupKey.value = invCol.id;
        rebuildAndRender();
      }
      if (!silent) showToast('Loaded 5 sample branch files.');
    } catch (err) {
      showToast('Could not load samples: ' + err.message, true);
    }
  }

  function showHelpPopover(btn) {
    const title = btn.dataset.title || '';
    const help = btn.dataset.help || '';
    if (!help) return;
    els.helpPopTitle.textContent = title;
    els.helpPopBody.textContent = help;
    els.helpPopover.classList.remove('hidden');

    const rect = btn.getBoundingClientRect();
    const popRect = els.helpPopover.getBoundingClientRect();
    const margin = 10;
    let left = rect.left + (rect.width / 2) - (popRect.width / 2);
    left = Math.max(margin, Math.min(window.innerWidth - popRect.width - margin, left));
    let top = rect.bottom + 8;
    if (top + popRect.height > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - popRect.height - 8);
    }
    els.helpPopover.style.left = `${left}px`;
    els.helpPopover.style.top = `${top}px`;
  }

  function hideHelpPopover() {
    els.helpPopover.classList.add('hidden');
  }

  function bindEvents() {
    if (els.guidePickBtn) {
      els.guidePickBtn.addEventListener('click', () => els.fileInput.click());
    }
    if (els.manageFilesBtn && els.fileManagerPanel) {
      els.manageFilesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = els.fileManagerPanel.classList.toggle('hidden');
        els.manageFilesBtn.setAttribute('aria-expanded', String(!isHidden));
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#fileInvWrap') && !els.fileManagerPanel.classList.contains('hidden')) {
          els.fileManagerPanel.classList.add('hidden');
          els.manageFilesBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
    els.pickFilesBtn.addEventListener('click', (e) => { e.stopPropagation(); els.fileInput.click(); });
    els.pickFolderBtn.addEventListener('click', (e) => { e.stopPropagation(); els.folderInput.click(); });
    els.dropzone.addEventListener('click', () => els.fileInput.click());
    els.dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
    });
    els.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      els.dropzone.classList.add('drag-over');
    });
    els.dropzone.addEventListener('dragleave', () => els.dropzone.classList.remove('drag-over'));
    els.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      els.dropzone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files) ingestFileList(e.dataTransfer.files);
    });

    els.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) ingestFileList(e.target.files);
      e.target.value = '';
    });
    els.folderInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) ingestFileList(e.target.files);
      e.target.value = '';
    });
    els.cancelImportBtn.addEventListener('click', () => { state.cancelImport = true; });

    els.loadSampleBtn.addEventListener('click', () => loadSamples(false));
    els.emptySampleBtn.addEventListener('click', () => loadSamples(false));

    els.fileSearchInput.addEventListener('input', (e) => {
      state.fileSearch = e.target.value;
      renderFileList();
    });
    els.toggleAllFilesBtn.addEventListener('click', () => {
      const valid = state.files.filter((f) => !f.error);
      const allOn = valid.every((f) => f.enabled);
      valid.forEach((f) => { f.enabled = !allOn; });
      state.page = 1;
      rebuildAndRender();
    });
    els.clearFilesBtn.addEventListener('click', () => {
      state.files = [];
      state.isSampleMode = false;
      state.options.colOverrides = {};
      state.options.sortColId = '';
      state.options.sortDir = 'asc';
      state.options.duplicateKeyColId = '';
      state.options.summaryGroupColId = '__source_file';
      state.savedNamedDupKey = '';
      state.savedNamedSummaryKey = '';
      state.searchQuery = '';
      state.onlyDups = false;
      els.tableSearchInput.value = '';
      els.optOnlyDups.checked = false;
      els.sheetScroll.scrollTop = 0;
      state.page = 1;
      rebuildAndRender();
    });
    els.fileList.addEventListener('change', (e) => {
      if (!e.target.classList.contains('file-toggle')) return;
      const item = e.target.closest('[data-file-id]');
      const f = state.files.find((x) => x.id === item.dataset.fileId);
      if (f) {
        f.enabled = e.target.checked;
        state.page = 1;
        rebuildAndRender();
      }
    });
    els.fileList.addEventListener('click', (e) => {
      if (!e.target.classList.contains('file-remove')) return;
      const item = e.target.closest('[data-file-id]');
      state.files = state.files.filter((x) => x.id !== item.dataset.fileId);
      state.page = 1;
      rebuildAndRender();
    });

    els.optSourceFile.addEventListener('change', () => {
      state.options.includeSourceFile = els.optSourceFile.checked;
      els.sourceSubOpts.classList.toggle('hidden', !state.options.includeSourceFile);
      rebuildAndRender();
    });
    els.optStripExt.addEventListener('change', () => {
      state.options.stripExtension = els.optStripExt.checked;
      rebuildAndRender();
    });
    els.optSheetName.addEventListener('change', () => {
      state.options.includeSheetName = els.optSheetName.checked;
      rebuildAndRender();
    });
    els.optHeaderMode.addEventListener('change', () => {
      const prevMode = state.options.headerMode;
      const mode = els.optHeaderMode.value;
      if (prevMode !== 'none' && mode === 'none') {
        state.savedNamedDupKey = state.options.duplicateKeyColId;
        state.savedNamedSummaryKey = state.options.summaryGroupColId;
      } else if (prevMode === 'none' && mode !== 'none') {
        if (state.savedNamedDupKey) state.options.duplicateKeyColId = state.savedNamedDupKey;
        if (state.savedNamedSummaryKey) state.options.summaryGroupColId = state.savedNamedSummaryKey;
      }
      state.options.headerMode = mode;
      els.customRowWrap.classList.toggle('hidden', mode !== 'custom');
      const hasHeaders = mode !== 'none';
      els.repeatHeaderWrap.classList.toggle('hidden', !hasHeaders);
      els.smartMatchWrap.classList.toggle('hidden', !hasHeaders);
      state.page = 1;
      rebuildAndRender();
    });
    els.optCustomHeaderRow.addEventListener('input', () => {
      state.options.customHeaderRow = Math.max(1, parseInt(els.optCustomHeaderRow.value, 10) || 1);
      state.page = 1;
      rebuildAndRender();
    });
    els.optRemoveRepeated.addEventListener('change', () => {
      state.options.removeRepeatedHeaders = els.optRemoveRepeated.checked;
      state.page = 1;
      rebuildAndRender();
    });
    els.optSmartMatch.addEventListener('change', () => {
      state.options.smartHeaderMatch = els.optSmartMatch.checked;
      state.page = 1;
      rebuildAndRender();
    });
    els.optSheetMode.addEventListener('change', () => {
      state.options.sheetMode = els.optSheetMode.value;
      state.page = 1;
      rebuildAndRender();
    });
    els.optSkipBlank.addEventListener('change', () => {
      state.options.skipEmptyRows = els.optSkipBlank.checked;
      state.page = 1;
      rebuildAndRender();
    });
    els.optDupKey.addEventListener('change', () => {
      state.options.duplicateKeyColId = els.optDupKey.value;
      state.page = 1;
      rebuildAndRender();
    });
    els.optDupAction.addEventListener('change', () => {
      state.options.dedupeMode = els.optDupAction.value;
      state.page = 1;
      rebuildAndRender();
    });
    els.optSummaryGroup.addEventListener('change', () => {
      state.options.summaryGroupColId = els.optSummaryGroup.value;
      rebuildAndRender();
    });

    document.querySelectorAll('.stage-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeStage = btn.dataset.stage;
        renderActiveStage();
      });
    });
    els.sortColSelect.addEventListener('change', () => {
      state.options.sortColId = els.sortColSelect.value;
      state.page = 1;
      rebuildAndRender();
    });
    els.sortDirBtn.addEventListener('click', () => {
      state.options.sortDir = state.options.sortDir === 'asc' ? 'desc' : 'asc';
      state.page = 1;
      rebuildAndRender();
    });
    els.clearSortBtn.addEventListener('click', () => {
      state.options.sortColId = '';
      state.options.sortDir = 'asc';
      state.page = 1;
      rebuildAndRender();
    });
    els.previewThead.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort-col]');
      if (!th) return;
      const colId = th.dataset.sortCol;
      if (state.options.sortColId === colId) {
        state.options.sortDir = state.options.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.options.sortColId = colId;
        state.options.sortDir = 'asc';
      }
      state.page = 1;
      rebuildAndRender();
    });
    els.tableSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      state.page = 1;
      renderPreviewTable();
    });
    els.optOnlyDups.addEventListener('change', () => {
      state.onlyDups = els.optOnlyDups.checked;
      state.page = 1;
      renderPreviewTable();
    });

    els.pageSizeSelect.addEventListener('change', () => {
      state.pageSize = parseInt(els.pageSizeSelect.value, 10) || 100;
      state.page = 1;
      renderPreviewTable();
    });
    els.prevPageBtn.addEventListener('click', () => {
      if (state.page > 1) { state.page--; renderPreviewTable(); }
    });
    els.nextPageBtn.addEventListener('click', () => {
      state.page++;
      renderPreviewTable();
    });

    els.exportXlsxBtn.addEventListener('click', () => {
      if (!state.dataset || !state.dataset.rows.length) return;
      try {
        window.MergerEngine.exportToExcel(state.dataset, els.exportFilename.value.trim());
        showToast('Master Excel workbook (.xlsx) downloaded.');
      } catch (err) {
        showToast('Export failed: ' + err.message, true);
      }
    });
    els.exportCsvBtn.addEventListener('click', () => {
      if (!state.dataset || !state.dataset.rows.length) return;
      try {
        window.MergerEngine.exportToCsv(state.dataset, els.exportFilename.value.trim());
        showToast('Consolidated CSV downloaded.');
      } catch (err) {
        showToast('CSV export failed: ' + err.message, true);
      }
    });

    document.querySelectorAll('.help-q').forEach((btn) => {
      btn.addEventListener('mouseenter', () => showHelpPopover(btn));
      btn.addEventListener('mouseleave', () => {
        if (state.pinnedHelpBtn !== btn) hideHelpPopover();
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.pinnedHelpBtn === btn) {
          state.pinnedHelpBtn = null;
          hideHelpPopover();
        } else {
          state.pinnedHelpBtn = btn;
          showHelpPopover(btn);
        }
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.classList.contains('help-q')) {
        state.pinnedHelpBtn = null;
        hideHelpPopover();
      }
    });

    els.privacyBtn.addEventListener('click', () => els.privacyModal.classList.remove('hidden'));
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => $(btn.dataset.closeModal).classList.add('hidden'));
    });
    els.privacyModal.addEventListener('click', (e) => {
      if (e.target === els.privacyModal) els.privacyModal.classList.add('hidden');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    loadSamples(true);
  });
})();
