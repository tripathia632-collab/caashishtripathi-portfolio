/**
 * Excel & CSV Merger — Simple Progressive-Disclosure UI Controller
 */
(function () {
  'use strict';

  const ACCEPTED_EXT = /\.(xlsx|xls|xlsm|xlsb|csv|tsv|ods)$/i;

  const state = {
    files: [],
    dataset: null,
    activeStage: 'preview',
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
      sheetMode: 'first',
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
      'fileInput', 'folderInput', 'landingView', 'studioView', 'heroDropzone',
      'heroSelectFilesBtn', 'heroSelectFolderBtn', 'heroSampleBtn',
      'importProgress', 'importProgressText', 'importProgressFill', 'cancelImportBtn',
      'fileInvMeta', 'addMoreBtn', 'clearFilesBtn', 'fileSearchInput', 'fileList',
      'optSourceFile', 'optHasHeaders', 'repeatHeaderWrap', 'optRemoveRepeated',
      'optStripExt', 'optSheetName', 'headerDetectRowWrap', 'optHeaderRowMode',
      'customRowWrap', 'optCustomHeaderRow', 'smartMatchWrap', 'optSmartMatch',
      'optSheetMode', 'optSkipBlank', 'optDupKey', 'optDupAction', 'optSummaryGroup',
      'summaryStatMain', 'summaryStatChips', 'exportFilename', 'exportCsvBtn',
      'exportXlsxBtn', 'tabPreviewBadge', 'tabSchemaBadge', 'tabDupBadge',
      'sortColSelect', 'sortDirBtn', 'clearSortBtn', 'dupFilterLabel',
      'optOnlyDups', 'tableSearchInput', 'previewThead', 'previewTbody',
      'pagerInfo', 'pageSizeSelect', 'prevPageBtn', 'nextPageBtn', 'pageNumText',
      'schemaTbody', 'summaryGroupBadge', 'summaryThead', 'summaryTbody',
      'dupAuditContent', 'helpPopover', 'helpPopTitle', 'helpPopBody',
      'privacyBtn', 'privacyModal', 'toast'
    ].forEach((id) => { els[id] = $(id); });
  }

  function switchLandingOrStudio() {
    const hasFiles = state.files.length > 0;
    els.landingView.classList.toggle('hidden', hasFiles);
    els.studioView.classList.toggle('hidden', !hasFiles);
  }

  function rebuildAndRender() {
    switchLandingOrStudio();
    if (!state.files.length) return;
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

    // Sort Column Select
    const prevSort = state.options.sortColId;
    let sortHtml = '<option value="">Original Order</option>';
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

    // Duplicate Check Select
    const prevDup = state.options.duplicateKeyColId;
    let dupHtml = '<option value="">Off</option>';
    nonSystemCols.forEach((c) => {
      dupHtml += `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`;
    });
    els.optDupKey.innerHTML = dupHtml;
    if (nonSystemCols.some((c) => c.id === prevDup)) {
      els.optDupKey.value = prevDup;
    } else {
      state.options.duplicateKeyColId = '';
      els.optDupKey.value = '';
    }

    // Summary Group By Select
    const prevGrp = state.options.summaryGroupColId;
    let grpHtml = '';
    if (state.options.includeSourceFile) {
      grpHtml += '<option value="__source_file">Source File</option>';
    }
    nonSystemCols.forEach((c) => {
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
    const enabledCount = st.enabledFileCount;

    els.summaryStatMain.textContent = `${formatInt(st.totalRowCount)} rows merged from ${enabledCount} file${enabledCount === 1 ? '' : 's'} · ${st.visibleColCount} columns`;

    let chips = '';
    if (st.repeatedRemoved > 0) {
      chips += `<span class="mini-pill cleaned">${st.repeatedRemoved} repeated header(s) removed</span>`;
    }
    if (st.extraColCount > 0) {
      chips += `<span class="mini-pill extra">${st.extraColCount} extra branch column(s) aligned</span>`;
    }
    if (st.duplicateCount > 0) {
      chips += `<span class="mini-pill extra">${st.duplicateCount} duplicate row(s) flagged</span>`;
    }
    const errCount = state.files.filter((f) => f.error).length;
    if (errCount > 0) {
      chips += `<span class="mini-pill err">${errCount} file(s) unreadable</span>`;
    }
    els.summaryStatChips.innerHTML = chips;

    els.tabPreviewBadge.textContent = formatInt(st.totalRowCount);
    els.tabSchemaBadge.textContent = formatInt(ds.allSchemaCols.length);
    els.tabDupBadge.textContent = `${st.duplicateCount} dup`;
    els.tabDupBadge.classList.toggle('hidden', st.duplicateCount === 0);

    const hasRows = st.totalRowCount > 0 && st.visibleColCount > 0;
    els.exportXlsxBtn.disabled = !hasRows;
    els.exportCsvBtn.disabled = !hasRows;
  }

  function renderFileList() {
    const enabledCount = state.files.filter((f) => f.enabled && !f.error).length;
    els.fileInvMeta.textContent = `${enabledCount} of ${state.files.length} active`;
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
        if (fStat.detectedHeaderRow > 1) {
          badges += `<span class="mini-pill cleaned">Header R${fStat.detectedHeaderRow}</span>`;
        }
        if (extraInFile > 0) {
          badges += `<span class="mini-pill extra">+${extraInFile} extra col</span>`;
        }
      }

      const cls = ['file-item'];
      if (!f.enabled) cls.push('is-disabled');
      if (f.error) cls.push('is-error');

      html += `
        <div class="${cls.join(' ')}" data-file-id="${escapeHtml(f.id)}">
          <input type="checkbox" class="file-toggle" ${f.enabled ? 'checked' : ''} ${f.error ? 'disabled' : ''} aria-label="Include ${escapeHtml(f.name)}">
          <div style="min-width:0;">
            <div class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
            <div class="file-sub">${badges}</div>
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
    $('stage-schema').classList.toggle('hidden', state.activeStage !== 'schema');
    $('stage-summary').classList.toggle('hidden', state.activeStage !== 'summary');

    document.querySelectorAll('.stage-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.stage === state.activeStage);
    });

    if (state.activeStage === 'preview') renderPreviewTable();
    else if (state.activeStage === 'schema') renderSchemaTable();
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
    const cols = ds.visibleCols;
    const dupAvailable = Boolean(state.options.duplicateKeyColId && ds.duplicateGroups.length > 0);
    els.dupFilterLabel.classList.toggle('hidden', !dupAvailable);

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

  function renderSchemaTable() {
    const ds = state.dataset;
    const cols = ds.allSchemaCols;
    const mergeTargets = cols.filter((c) => !c.isSystem);
    let html = '';

    cols.forEach((col) => {
      const covBadge = col.isSystem
        ? '<span class="mini-pill cleaned">Tracking Col</span>'
        : (col.isExtra
          ? `<span class="mini-pill extra">${col.fileCoverage} / ${col.totalFiles} files (Extra)</span>`
          : `<span class="mini-pill">${col.fileCoverage} / ${col.totalFiles} files</span>`);

      let mergeHtml = '<span style="color:var(--faint);font-size:12px;">—</span>';
      if (!col.isSystem) {
        const curMerge = (state.options.colOverrides[col.id] && state.options.colOverrides[col.id].mergeInto) || '';
        mergeHtml = `<select class="sel schema-merge" data-col-id="${escapeHtml(col.id)}" style="height:30px;font-size:11.5px;">
          <option value="">Keep separate</option>`;
        mergeTargets.forEach((t) => {
          if (t.id === col.id) return;
          mergeHtml += `<option value="${escapeHtml(t.id)}" ${curMerge === t.id ? 'selected' : ''}>Merge into: ${escapeHtml(t.label)}</option>`;
        });
        mergeHtml += '</select>';
      }

      const nonSysIdx = cols.filter((c) => !c.isSystem).findIndex((c) => c.id === col.id);
      const nonSysLen = cols.filter((c) => !c.isSystem).length;

      html += `<tr>
        <td>
          <input type="checkbox" class="schema-vis toggle-inp" data-col-id="${escapeHtml(col.id)}" ${!col.hidden ? 'checked' : ''} ${col.isSystem ? 'disabled' : ''}>
        </td>
        <td>
          <input type="text" class="inp schema-rename" data-col-id="${escapeHtml(col.id)}" value="${escapeHtml(col.label)}" style="height:30px;font-size:12px;">
        </td>
        <td>${covBadge}</td>
        <td>${mergeHtml}</td>
        <td>
          ${!col.isSystem ? `<div class="order-btns">
            <button type="button" class="btn btn-xs schema-up" data-col-id="${escapeHtml(col.id)}" ${nonSysIdx <= 0 ? 'disabled' : ''}>&uarr;</button>
            <button type="button" class="btn btn-xs schema-down" data-col-id="${escapeHtml(col.id)}" ${nonSysIdx >= nonSysLen - 1 ? 'disabled' : ''}>&darr;</button>
          </div>` : '<span class="mini-pill cleaned">Left Fixed</span>'}
        </td>
      </tr>`;
    });

    els.schemaTbody.innerHTML = html;
  }

  function renderSummaryAndDups() {
    const ds = state.dataset;
    const sumColObj = ds.allSchemaCols.find((c) => c.id === ds.summaryColId);
    els.summaryGroupBadge.textContent = `Grouped by: ${sumColObj ? sumColObj.label : 'Source File'}`;

    if (!ds.summaryRows.length) {
      els.summaryThead.innerHTML = '';
      els.summaryTbody.innerHTML = '<tr><td style="text-align:center;padding:24px;color:var(--muted);">No rows to summarize.</td></tr>';
    } else {
      let th = '<tr><th>Group / Source</th><th>Rows</th><th>Duplicates</th>';
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
      els.dupAuditContent.innerHTML = 'Open <strong>More options</strong> on the left and pick a column under <em>Check duplicates</em> (such as <strong>Invoice No</strong>) to flag repeated records.';
    } else if (!ds.duplicateGroups.length) {
      els.dupAuditContent.innerHTML = '<span style="color:var(--ok);font-weight:600;">No repeated records found for this column.</span>';
    } else {
      let dHtml = `<p style="margin-bottom:8px;color:var(--warn);font-weight:600;">Found ${ds.duplicateGroups.length} repeated key value(s):</p>`;
      dHtml += '<table class="schema-table"><thead><tr><th>Repeated Value</th><th>Count</th><th>Files</th></tr></thead><tbody>';
      ds.duplicateGroups.slice(0, 100).forEach((grp) => {
        const filesSet = Array.from(new Set(grp.rows.map((r) => r.__source_file)));
        dHtml += `<tr>
          <td><code>${escapeHtml(grp.keyVal)}</code></td>
          <td><span class="dup-badge">&times;${grp.count}</span></td>
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
      showToast(`Added ${added} file(s); ${errors} unreadable file(s) skipped.`, true);
    } else {
      showToast(`Merged ${added} file(s) — ready to review & download.`);
    }
  }

  function loadSamples() {
    try {
      state.files = window.MergerEngine.generateSampleFiles();
      state.options.colOverrides = {};
      state.options.sortColId = '';
      state.options.duplicateKeyColId = '';
      state.page = 1;
      rebuildAndRender();

      const invCol = state.dataset.allSchemaCols.find((c) => /invoice\s*no/i.test(c.label));
      if (invCol) {
        state.options.duplicateKeyColId = invCol.id;
        els.optDupKey.value = invCol.id;
        rebuildAndRender();
      }
      showToast('Loaded 5 sample branch files.');
    } catch (err) {
      showToast('Sample load failed: ' + err.message, true);
    }
  }

  function moveDataColumnOrder(colId, direction) {
    if (!state.dataset) return;
    const dataCols = state.dataset.allSchemaCols.filter((c) => !c.isSystem && !c.mergeInto);
    const idx = dataCols.findIndex((c) => c.id === colId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= dataCols.length) return;

    dataCols.forEach((c, i) => {
      if (!state.options.colOverrides[c.id]) state.options.colOverrides[c.id] = {};
      state.options.colOverrides[c.id].order = i * 10;
    });
    const tmp = state.options.colOverrides[dataCols[idx].id].order;
    state.options.colOverrides[dataCols[idx].id].order = state.options.colOverrides[dataCols[targetIdx].id].order;
    state.options.colOverrides[dataCols[targetIdx].id].order = tmp;
    rebuildAndRender();
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
    // Landing Dropzone & Pickers
    els.heroSelectFilesBtn.addEventListener('click', () => els.fileInput.click());
    els.heroSelectFolderBtn.addEventListener('click', () => els.folderInput.click());
    els.heroSampleBtn.addEventListener('click', loadSamples);
    els.addMoreBtn.addEventListener('click', () => els.fileInput.click());

    els.heroDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      els.heroDropzone.classList.add('drag-over');
    });
    els.heroDropzone.addEventListener('dragleave', () => els.heroDropzone.classList.remove('drag-over'));
    els.heroDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      els.heroDropzone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files) ingestFileList(e.dataTransfer.files);
    });

    // Also allow dropping onto the whole studio window once files are loaded!
    document.body.addEventListener('dragover', (e) => e.preventDefault());
    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.target.closest('#heroDropzone')) return;
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        ingestFileList(e.dataTransfer.files);
      }
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

    // File Inventory
    els.fileSearchInput.addEventListener('input', (e) => {
      state.fileSearch = e.target.value;
      renderFileList();
    });
    els.clearFilesBtn.addEventListener('click', () => {
      state.files = [];
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
      const scroller = document.querySelector('.sheet-scroll');
      if (scroller) scroller.scrollTop = 0;
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

    // Quick Options + Advanced Options
    els.optSourceFile.addEventListener('change', () => {
      state.options.includeSourceFile = els.optSourceFile.checked;
      rebuildAndRender();
    });
    els.optHasHeaders.addEventListener('change', () => {
      const hasHdr = els.optHasHeaders.checked;
      if (!hasHdr) {
        state.savedNamedDupKey = state.options.duplicateKeyColId;
        state.savedNamedSummaryKey = state.options.summaryGroupColId;
      } else {
        if (state.savedNamedDupKey) state.options.duplicateKeyColId = state.savedNamedDupKey;
        if (state.savedNamedSummaryKey) state.options.summaryGroupColId = state.savedNamedSummaryKey;
      }
      els.repeatHeaderWrap.classList.toggle('hidden', !hasHdr);
      els.headerDetectRowWrap.classList.toggle('hidden', !hasHdr);
      els.smartMatchWrap.classList.toggle('hidden', !hasHdr);
      els.customRowWrap.classList.toggle('hidden', !hasHdr || els.optHeaderRowMode.value !== 'custom');
      state.options.headerMode = hasHdr ? els.optHeaderRowMode.value : 'none';
      state.page = 1;
      rebuildAndRender();
    });
    els.optHeaderRowMode.addEventListener('change', () => {
      const mode = els.optHeaderRowMode.value;
      els.customRowWrap.classList.toggle('hidden', mode !== 'custom');
      if (els.optHasHeaders.checked) {
        state.options.headerMode = mode;
        state.page = 1;
        rebuildAndRender();
      }
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
    els.optStripExt.addEventListener('change', () => {
      state.options.stripExtension = els.optStripExt.checked;
      rebuildAndRender();
    });
    els.optSheetName.addEventListener('change', () => {
      state.options.includeSheetName = els.optSheetName.checked;
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

    // Tabs, Sorting & Filter
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

    // Pagination
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

    // Schema Table interactions
    els.schemaTbody.addEventListener('change', (e) => {
      const colId = e.target.dataset.colId;
      if (!colId) return;
      if (!state.options.colOverrides[colId]) state.options.colOverrides[colId] = {};
      if (e.target.classList.contains('schema-vis')) {
        state.options.colOverrides[colId].hidden = !e.target.checked;
        rebuildAndRender();
      } else if (e.target.classList.contains('schema-rename')) {
        state.options.colOverrides[colId].rename = e.target.value;
        rebuildAndRender();
      } else if (e.target.classList.contains('schema-merge')) {
        state.options.colOverrides[colId].mergeInto = e.target.value;
        rebuildAndRender();
      }
    });
    els.schemaTbody.addEventListener('click', (e) => {
      const colId = e.target.dataset.colId;
      if (!colId) return;
      if (e.target.classList.contains('schema-up')) moveDataColumnOrder(colId, -1);
      else if (e.target.classList.contains('schema-down')) moveDataColumnOrder(colId, 1);
    });

    // Exports
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

    // [?] Help tooltips (clean hover + click pin without focus/click race)
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

    // Privacy Modal
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
    switchLandingOrStudio();
  });
})();
