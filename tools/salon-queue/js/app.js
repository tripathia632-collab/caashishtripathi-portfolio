/**
 * SalonSync Studio UI & State Controller
 */

const SalonApp = {
  activeTab: "board", // "board" | "diary"
  selectedDate: SalonScheduler.todayISO(),
  filterChair: "all",
  filterSource: "all",
  diarySearch: "",
  dragBookingId: null,

  async init() {
    this.bindStaticEvents();
    await SyncStore.init(() => this.renderAll());
    this.renderAll();
  },

  bindStaticEvents() {
    document.getElementById("datePickerInput")?.addEventListener("change", (e) => {
      if (e.target.value) {
        this.selectedDate = e.target.value;
        this.renderBoard();
        this.renderDiary();
      }
    });

    document.getElementById("chairFilterSelect")?.addEventListener("change", (e) => {
      this.filterChair = e.target.value;
      this.renderBoard();
    });

    document.getElementById("sourceFilterSelect")?.addEventListener("change", (e) => {
      this.filterSource = e.target.value;
      this.renderBoard();
    });

    document.getElementById("diarySearchInput")?.addEventListener("input", (e) => {
      this.diarySearch = e.target.value.trim().toLowerCase();
      this.renderDiary();
    });

    // Live phone lookup inside Booking Modal
    document.getElementById("bkPhone")?.addEventListener("input", (e) => {
      const match = SalonScheduler.lookupByPhone(SyncStore.bookings, e.target.value);
      const pill = document.getElementById("bkReturningBadge");
      const nameInput = document.getElementById("bkName");
      if (match) {
        if (nameInput && !nameInput.value.trim()) {
          nameInput.value = match.name;
        }
        if (pill) {
          pill.textContent = `Returning customer · ${match.visits} visit${match.visits > 1 ? "s" : ""} · Last: ${match.lastService} (${match.lastDate})`;
          pill.classList.remove("hidden");
        }
      } else {
        pill?.classList.add("hidden");
      }
    });

    // Service select updates duration & price automatically
    document.getElementById("bkService")?.addEventListener("change", (e) => {
      const svc = SyncStore.settings.services.find((s) => s.name === e.target.value);
      if (svc) {
        document.getElementById("bkDuration").value = svc.durationMin;
        document.getElementById("bkPrice").value = svc.price;
      }
      this.checkModalConflict();
    });

    ["bkDate", "bkTime", "bkDuration", "bkChair"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => this.checkModalConflict());
    });

    ["bookingModal", "paymentModal", "customerModal", "syncModal", "settingsModal"].forEach((mId) => {
      document.getElementById(mId)?.addEventListener("click", (e) => {
        if (e.target.id === mId) this.closeModal(mId);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ["bookingModal", "paymentModal", "customerModal", "syncModal", "settingsModal"].forEach((m) => this.closeModal(m));
      }
    });
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll(".ws-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.getElementById("view-board")?.classList.toggle("active", tab === "board");
    document.getElementById("view-diary")?.classList.toggle("active", tab === "diary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  setRole(role) {
    SyncStore.setRole(role);
    this.showToast(`Switched to ${role === "owner" ? "Owner (Remote Phone)" : "Reception (Shop Desk)"} view`);
  },

  shiftSelectedDate(delta) {
    this.selectedDate = delta === 0
      ? SalonScheduler.todayISO()
      : SalonScheduler.addDaysISO(this.selectedDate, delta);
    this.renderAll();
  },

  renderAll() {
    this.renderHeader();
    this.renderBoard();
    this.renderDiary();
  },

  renderHeader() {
    const isOwner = SyncStore.role === "owner";
    document.getElementById("roleOwnerBtn")?.classList.toggle("on", isOwner);
    document.getElementById("roleRecBtn")?.classList.toggle("on", !isOwner);

    const salonTitle = document.getElementById("headerSalonName");
    if (salonTitle) {
      salonTitle.textContent = SyncStore.settings.salon_name || "SalonSync Studio";
    }

    const syncBtn = document.getElementById("syncStatusBtn");
    const syncLabel = document.getElementById("syncStatusLabel");
    if (syncBtn && syncLabel) {
      const live = SyncStore.mode === "supabase";
      syncBtn.classList.toggle("is-live", live);
      syncBtn.classList.toggle("is-demo", !live);
      syncLabel.textContent = live
        ? `Live Sync · ${SyncStore.shopCode}`
        : `Demo Sync · Connect Supabase`;
    }

    const dp = document.getElementById("datePickerInput");
    if (dp) dp.value = this.selectedDate;

    const chairFilter = document.getElementById("chairFilterSelect");
    if (chairFilter) {
      const curVal = this.filterChair;
      chairFilter.innerHTML = `<option value="all">All Chairs</option>` +
        SyncStore.settings.chairs.map((c) => `<option value="${this.esc(c.id)}">${this.esc(c.name)}</option>`).join("");
      chairFilter.value = SyncStore.settings.chairs.some((c) => c.id === curVal) ? curVal : "all";
    }

    const dayBookings = SyncStore.bookings.filter((b) => b.booking_date === this.selectedDate && b.status !== "cancelled");
    const activeCount = dayBookings.filter((b) => b.status === "booked" || b.status === "seated").length;
    const tabBadge = document.getElementById("boardCountBadge");
    if (tabBadge) tabBadge.textContent = activeCount;
  },

  renderBoard() {
    const { chairs, open_min, close_min } = SyncStore.settings;
    const dayAll = SyncStore.bookings.filter((b) => b.booking_date === this.selectedDate && b.status !== "cancelled");

    // 1. KPIs + Next Free Slots
    const nextSlots = SalonScheduler.getNextFreeSlots(SyncStore.bookings, chairs, this.selectedDate, 30, open_min, close_min);
    const nextSlotHtml = nextSlots.map((ns) => {
      const shortChair = ns.chairName.split("·").pop().trim();
      const disabled = ns.nextMin === null ? "disabled" : "";
      return `
        <button type="button" class="free-slot-chip ${ns.isFreeNow ? "free-now" : ""}" ${disabled}
          title="Click to book ${this.esc(ns.chairName)} at ${this.esc(ns.label)}"
          onclick="SalonApp.openBookingModal(null, { chair_id: '${this.esc(ns.chairId)}', start_min: ${ns.nextMin || open_min} })">
          <span class="fsc-name">${this.esc(shortChair)}</span>
          <strong class="fsc-time">${this.esc(ns.label)}</strong>
        </button>`;
    }).join("");
    const nextContainer = document.getElementById("nextSlotsChips");
    if (nextContainer) nextContainer.innerHTML = nextSlotHtml;

    const walkinsWaiting = dayAll.filter((b) => b.status === "booked" && b.booking_source === "walkin").length;
    const phoneBooked = dayAll.filter((b) => b.status === "booked" && b.booking_source === "phone").length;
    const inChairCount = dayAll.filter((b) => b.status === "seated").length;
    const paidToday = dayAll
      .filter((b) => b.status === "completed" && b.amount_paid != null)
      .reduce((s, b) => s + Number(b.amount_paid || 0), 0);

    document.getElementById("kpiWaiting").textContent = walkinsWaiting + phoneBooked;
    document.getElementById("kpiWaitingSub").textContent = `${walkinsWaiting} walk-in · ${phoneBooked} phone`;
    document.getElementById("kpiInChair").textContent = `${inChairCount} / ${chairs.length}`;
    document.getElementById("kpiCollection").textContent = SalonScheduler.formatINR(paidToday);

    // 2. Filtered items for Queue + Grid
    const filtered = dayAll.filter((b) => {
      if (this.filterChair !== "all" && b.chair_id !== this.filterChair) return false;
      if (this.filterSource !== "all" && b.booking_source !== this.filterSource) return false;
      return true;
    });

    this.renderQueueList(filtered, chairs);
    this.renderTimeGrid(filtered, chairs, open_min, close_min);
  },

  renderQueueList(dayBookings, chairs) {
    const container = document.getElementById("queueListBody");
    if (!container) return;

    const statusOrder = { seated: 0, booked: 1, completed: 2 };
    const sorted = [...dayBookings].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
      return a.start_min - b.start_min;
    });

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="empty-queue">
          <p>No bookings or walk-ins for this date.</p>
          <button type="button" class="btn btn-primary btn-sm" onclick="SalonApp.openBookingModal(null)">+ Add Booking / Walk-In</button>
        </div>`;
      return;
    }

    container.innerHTML = sorted.map((b) => {
      const chairName = chairs.find((c) => c.id === b.chair_id)?.name || "Chair";
      const isPhone = b.booking_source === "phone";
      const sourceBadge = isPhone
        ? `<span class="src-pill phone">Phone Call</span>`
        : `<span class="src-pill walkin">Walk-In</span>`;

      let statusBadge = `<span class="st-pill booked">Booked</span>`;
      if (b.status === "seated") statusBadge = `<span class="st-pill seated">In Chair</span>`;
      if (b.status === "completed") {
        statusBadge = `<span class="st-pill done">Paid ${SalonScheduler.formatINR(b.amount_paid || 0)} ${this.esc(b.payment_mode || "")}</span>`;
      }

      const timeStr = SalonScheduler.minsToDisplay(b.start_min);
      const waType = b.status === "seated" ? "ready" : "confirm";

      return `
        <div class="queue-item status-${this.esc(b.status)}">
          <div class="qi-top">
            <div>
              <strong class="qi-name">${this.esc(b.customer_name)}</strong>
              <span class="qi-phone">${this.esc(b.customer_phone || "No mobile")}</span>
            </div>
            <div class="qi-pills">${sourceBadge}${statusBadge}</div>
          </div>

          <div class="qi-meta">
            <span><strong>${this.esc(timeStr)}</strong> &middot; ${this.esc(chairName)}</span>
            <span>${this.esc(b.service_name)} (${b.duration_min}m)</span>
          </div>

          <div class="qi-actions">
            ${b.status === "booked" ? `<button type="button" class="btn btn-xs btn-soft" onclick="SalonApp.quickSetStatus('${b.id}', 'seated')">Seat Now</button>` : ""}
            ${b.status !== "completed" ? `<button type="button" class="btn btn-xs btn-emerald" onclick="SalonApp.openPaymentModal('${b.id}')">Done &amp; Pay &#8377;</button>` : `<button type="button" class="btn btn-xs btn-secondary" onclick="SalonApp.openPaymentModal('${b.id}')">Edit &#8377;</button>`}
            <button type="button" class="btn btn-xs btn-secondary" onclick="SalonApp.openBookingModal('${b.id}')">Shift / Edit</button>
            <a class="btn btn-xs btn-wa" target="_blank" rel="noopener" href="${SalonScheduler.buildWhatsAppUrl(b, SyncStore.settings.salon_name, chairs, waType)}" title="Send WhatsApp confirmation">WhatsApp</a>
            ${b.status !== "completed" ? `<button type="button" class="btn btn-xs btn-danger-ghost" title="Cancel booking" onclick="SalonApp.cancelBooking('${b.id}')">&#10005;</button>` : ""}
          </div>
        </div>`;
    }).join("");
  },

  renderTimeGrid(dayBookings, chairs, openMin, closeMin) {
    const gridWrap = document.getElementById("timeSlotGrid");
    if (!gridWrap) return;

    const visibleChairs = this.filterChair === "all"
      ? chairs
      : chairs.filter((c) => c.id === this.filterChair);

    // 30-min visual slots from openMin to closeMin
    const rows = [];
    for (let m = openMin; m < closeMin; m += 30) {
      rows.push(m);
    }

    const colTemplate = `92px repeat(${visibleChairs.length}, minmax(160px, 1fr))`;

    let html = `<div class="grid-header-row" style="grid-template-columns:${colTemplate}">
      <div class="grid-corner">Time</div>
      ${visibleChairs.map((c) => `<div class="grid-chair-head">${this.esc(c.name)}</div>`).join("")}
    </div>`;

    html += `<div class="grid-body">`;
    for (const slotMin of rows) {
      html += `<div class="grid-row" style="grid-template-columns:${colTemplate}">`;
      html += `<div class="grid-time-label">${SalonScheduler.minsToDisplay(slotMin)}</div>`;

      for (const chair of visibleChairs) {
        // Find bookings starting within [slotMin, slotMin + 30) OR spanning into this row
        const startingHere = dayBookings.filter(
          (b) => b.chair_id === chair.id && b.start_min >= slotMin && b.start_min < slotMin + 30
        );
        const occupied = dayBookings.some(
          (b) => b.chair_id === chair.id && b.start_min < slotMin + 30 && (b.start_min + b.duration_min) > slotMin
        );

        const cardsHtml = startingHere.map((b) => {
          const isPhone = b.booking_source === "phone";
          const cls = `slot-card src-${b.booking_source} st-${b.status}`;
          const endStr = SalonScheduler.minsToDisplay(b.start_min + b.duration_min);
          return `
            <div class="${cls}" draggable="true"
              ondragstart="SalonApp.onDragStart(event, '${b.id}')"
              onclick="event.stopPropagation(); SalonApp.openBookingModal('${b.id}')"
              title="${this.esc(b.customer_name)} · ${this.esc(b.service_name)} · Click to Edit/Shift or Drag to move">
              <div class="sc-top">
                <strong>${this.esc(b.customer_name)}</strong>
                <span>${isPhone ? "Call" : "Walk-In"}</span>
              </div>
              <div class="sc-mid">${this.esc(b.service_name)}</div>
              <div class="sc-bot">
                <span>${SalonScheduler.minsToDisplay(b.start_min)} – ${endStr}</span>
                ${b.status === "completed" ? `<em>${SalonScheduler.formatINR(b.amount_paid || 0)}</em>` : (b.status === "seated" ? `<em>In Chair</em>` : "")}
              </div>
            </div>`;
        }).join("");

        html += `
          <div class="grid-cell ${occupied ? "is-busy" : "is-open"}"
            ondragover="event.preventDefault(); this.classList.add('drag-hover');"
            ondragleave="this.classList.remove('drag-hover');"
            ondrop="SalonApp.onDropSlot(event, '${this.esc(chair.id)}', ${slotMin}); this.classList.remove('drag-hover');"
            onclick="SalonApp.openBookingModal(null, { chair_id: '${this.esc(chair.id)}', start_min: ${slotMin} })">
            ${cardsHtml}
            ${!occupied ? `<span class="slot-plus-hint">+ Book</span>` : ""}
          </div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    gridWrap.innerHTML = html;
  },

  onDragStart(ev, bookingId) {
    this.dragBookingId = bookingId;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", bookingId);
  },

  async onDropSlot(ev, targetChairId, targetMin) {
    ev.preventDefault();
    const id = this.dragBookingId || ev.dataTransfer.getData("text/plain");
    this.dragBookingId = null;
    if (!id) return;

    const existing = SyncStore.bookings.find((b) => b.id === id);
    if (!existing) return;

    const conflict = SalonScheduler.findConflict(
      SyncStore.bookings,
      existing.booking_date,
      targetChairId,
      targetMin,
      existing.duration_min,
      existing.id
    );

    if (conflict) {
      this.showToast(`Conflict: ${conflict.customer_name} is already booked on that chair at ${SalonScheduler.minsToDisplay(conflict.start_min)}.`);
      return;
    }

    const prevSnapshot = { ...existing };
    await SyncStore.saveBooking({
      ...existing,
      chair_id: targetChairId,
      start_min: targetMin
    });

    const newTimeStr = SalonScheduler.minsToDisplay(targetMin);
    this.showToast(`Moved ${existing.customer_name} to ${newTimeStr}`, "Undo", async () => {
      await SyncStore.saveBooking(prevSnapshot);
    });
  },

  async quickSetStatus(id, newStatus) {
    const b = SyncStore.bookings.find((x) => x.id === id);
    if (!b) return;
    await SyncStore.saveBooking({ ...b, status: newStatus });
    this.showToast(`${b.customer_name} marked ${newStatus === "seated" ? "In Chair" : newStatus}.`);
  },

  async cancelBooking(id) {
    const b = SyncStore.bookings.find((x) => x.id === id);
    if (!b) return;
    const prevStatus = b.status;
    await SyncStore.saveBooking({ ...b, status: "cancelled" });
    this.showToast(`Cancelled booking for ${b.customer_name}`, "Undo", async () => {
      await SyncStore.saveBooking({ ...b, status: prevStatus });
    });
  },

  // =========================================================
  // BOOKING / SHIFT MODAL
  // =========================================================
  openBookingModal(bookingId = null, prefill = {}) {
    const modal = document.getElementById("bookingModal");
    const existing = bookingId ? SyncStore.bookings.find((b) => b.id === bookingId) : null;

    document.getElementById("bkId").value = existing ? existing.id : "";
    document.getElementById("bkModalTitle").textContent = existing ? `Edit / Shift Slot — ${existing.customer_name}` : "New Booking / Walk-In";

    // Populate dropdowns
    const chairSel = document.getElementById("bkChair");
    chairSel.innerHTML = SyncStore.settings.chairs.map((c) => `<option value="${this.esc(c.id)}">${this.esc(c.name)}</option>`).join("");

    const svcSel = document.getElementById("bkService");
    svcSel.innerHTML = SyncStore.settings.services.map((s) => `<option value="${this.esc(s.name)}">${this.esc(s.name)} (${s.durationMin}m · ₹${s.price})</option>`).join("");

    const defaultSvc = SyncStore.settings.services[0] || { name: "Haircut", durationMin: 30, price: 250 };
    const defaultStart = prefill.start_min ?? Math.max(SyncStore.settings.open_min, SalonScheduler.nowMinutesRounded15());

    document.getElementById("bkSource").value = existing ? existing.booking_source : (SyncStore.role === "owner" ? "phone" : "walkin");
    document.getElementById("bkPhone").value = existing ? existing.customer_phone : (prefill.customer_phone || "");
    document.getElementById("bkName").value = existing ? existing.customer_name : (prefill.customer_name || "");
    svcSel.value = existing ? existing.service_name : defaultSvc.name;
    document.getElementById("bkDuration").value = existing ? existing.duration_min : defaultSvc.durationMin;
    document.getElementById("bkPrice").value = existing ? existing.service_price : defaultSvc.price;
    document.getElementById("bkDate").value = existing ? existing.booking_date : this.selectedDate;
    document.getElementById("bkTime").value = SalonScheduler.minsToTimeInput(existing ? existing.start_min : defaultStart);
    chairSel.value = existing ? existing.chair_id : (prefill.chair_id || SyncStore.settings.chairs[0]?.id || "c1");
    document.getElementById("bkNotes").value = existing ? (existing.notes || "") : "";

    // Show quick action footer buttons only when editing an existing slot
    document.getElementById("bkShiftGroup")?.classList.toggle("hidden", !existing);
    const waLink = document.getElementById("bkWhatsAppBtn");
    if (waLink) {
      waLink.classList.toggle("hidden", !existing);
      if (existing) {
        waLink.href = SalonScheduler.buildWhatsAppUrl(existing, SyncStore.settings.salon_name, SyncStore.settings.chairs, "shifted");
      }
    }

    document.getElementById("bkReturningBadge")?.classList.add("hidden");
    if (!existing && prefill.customer_phone) {
      const m = SalonScheduler.lookupByPhone(SyncStore.bookings, prefill.customer_phone);
      if (m) {
        document.getElementById("bkReturningBadge").textContent = `Returning customer · ${m.visits} visits · Last: ${m.lastService}`;
        document.getElementById("bkReturningBadge").classList.remove("hidden");
      }
    }

    this.checkModalConflict();
    modal.classList.remove("hidden");
  },

  nudgeModalTime(deltaMin) {
    const inp = document.getElementById("bkTime");
    if (!inp) return;
    const cur = SalonScheduler.timeInputToMins(inp.value);
    const next = Math.max(SyncStore.settings.open_min, Math.min(SyncStore.settings.close_min - 15, cur + deltaMin));
    inp.value = SalonScheduler.minsToTimeInput(next);
    this.checkModalConflict();
  },

  checkModalConflict() {
    const id = document.getElementById("bkId").value || null;
    const dateStr = document.getElementById("bkDate").value;
    const startMin = SalonScheduler.timeInputToMins(document.getElementById("bkTime").value);
    const dur = Number(document.getElementById("bkDuration").value || 30);
    const chairId = document.getElementById("bkChair").value;

    const conflict = SalonScheduler.findConflict(SyncStore.bookings, dateStr, chairId, startMin, dur, id);
    const warnEl = document.getElementById("bkConflictAlert");
    if (warnEl) {
      if (conflict) {
        warnEl.textContent = `Heads up: Overlaps ${conflict.customer_name} (${SalonScheduler.minsToDisplay(conflict.start_min)} – ${SalonScheduler.minsToDisplay(conflict.start_min + conflict.duration_min)}).`;
        warnEl.classList.remove("hidden");
      } else {
        warnEl.classList.add("hidden");
      }
    }
    return conflict;
  },

  async saveBookingModal(ev) {
    ev.preventDefault();
    const id = document.getElementById("bkId").value || null;
    const existing = id ? SyncStore.bookings.find((b) => b.id === id) : null;
    const startMin = SalonScheduler.timeInputToMins(document.getElementById("bkTime").value);
    const dur = Number(document.getElementById("bkDuration").value || 30);
    const dateStr = document.getElementById("bkDate").value;
    const chairId = document.getElementById("bkChair").value;

    const conflict = this.checkModalConflict();
    if (conflict) {
      if (!confirm(`This time overlaps with ${conflict.customer_name}. Still save this booking?`)) {
        return;
      }
    }

    const record = await SyncStore.saveBooking({
      ...(existing || {}),
      id: id || undefined,
      booking_date: dateStr,
      start_min: startMin,
      duration_min: dur,
      chair_id: chairId,
      customer_name: document.getElementById("bkName").value.trim(),
      customer_phone: document.getElementById("bkPhone").value.trim(),
      service_name: document.getElementById("bkService").value,
      service_price: Number(document.getElementById("bkPrice").value || 0),
      booking_source: document.getElementById("bkSource").value,
      notes: document.getElementById("bkNotes").value.trim()
    });

    this.selectedDate = dateStr;
    this.closeModal("bookingModal");
    this.showToast(existing ? `Updated slot for ${record.customer_name}` : `Booked ${record.customer_name} at ${SalonScheduler.minsToDisplay(record.start_min)}`);
  },

  // =========================================================
  // RECEPTION PAYMENT COLLECTION MODAL
  // =========================================================
  openPaymentModal(bookingId) {
    const b = SyncStore.bookings.find((x) => x.id === bookingId);
    if (!b) return;

    document.getElementById("payBookingId").value = b.id;
    document.getElementById("payPartyMeta").textContent = `${b.customer_name} · ${b.service_name} (${b.customer_phone || "Walk-in"})`;
    document.getElementById("payAmount").value = b.amount_paid != null ? b.amount_paid : (b.service_price || 250);
    document.getElementById("payMode").value = b.payment_mode || "UPI";
    document.getElementById("payNotes").value = b.notes || "";

    document.getElementById("paymentModal").classList.remove("hidden");
  },

  async savePaymentModal(ev) {
    ev.preventDefault();
    const id = document.getElementById("payBookingId").value;
    const b = SyncStore.bookings.find((x) => x.id === id);
    if (!b) return;

    const paidAmt = Number(document.getElementById("payAmount").value || 0);
    const mode = document.getElementById("payMode").value;
    const notes = document.getElementById("payNotes").value.trim();

    await SyncStore.saveBooking({
      ...b,
      status: "completed",
      amount_paid: paidAmt,
      payment_mode: mode,
      notes
    });

    this.closeModal("paymentModal");
    this.showToast(`Recorded ${SalonScheduler.formatINR(paidAmt)} (${mode}) for ${b.customer_name}`);
  },

  // =========================================================
  // TAB 2: CUSTOMER DIARY & RECEPTION CASHBOOK
  // =========================================================
  renderDiary() {
    // 1. Daily Cashbook for selectedDate
    const dayPaid = SyncStore.bookings.filter(
      (b) => b.booking_date === this.selectedDate && b.status === "completed" && b.amount_paid != null
    );
    const cash = dayPaid.filter((b) => b.payment_mode === "Cash").reduce((s, b) => s + Number(b.amount_paid || 0), 0);
    const upi = dayPaid.filter((b) => b.payment_mode === "UPI").reduce((s, b) => s + Number(b.amount_paid || 0), 0);
    const card = dayPaid.filter((b) => b.payment_mode === "Card").reduce((s, b) => s + Number(b.amount_paid || 0), 0);
    const total = cash + upi + card;

    document.getElementById("cbDateLabel").textContent = `Daily Collection — ${this.selectedDate}`;
    document.getElementById("cbTotal").textContent = SalonScheduler.formatINR(total);
    document.getElementById("cbCash").textContent = SalonScheduler.formatINR(cash);
    document.getElementById("cbUpi").textContent = SalonScheduler.formatINR(upi);
    document.getElementById("cbCard").textContent = SalonScheduler.formatINR(card);

    const cbBody = document.getElementById("cashbookTableBody");
    if (cbBody) {
      if (dayPaid.length === 0) {
        cbBody.innerHTML = `<tr><td colspan="6" class="empty-cell">No completed payments recorded for ${this.esc(this.selectedDate)} yet.</td></tr>`;
      } else {
        cbBody.innerHTML = dayPaid.map((b) => {
          const chairName = SyncStore.settings.chairs.find((c) => c.id === b.chair_id)?.name || "-";
          return `
            <tr>
              <td class="mono">${SalonScheduler.minsToDisplay(b.start_min)}</td>
              <td><strong>${this.esc(b.customer_name)}</strong> <span class="sub-phone">${this.esc(b.customer_phone)}</span></td>
              <td>${this.esc(b.service_name)}</td>
              <td>${this.esc(chairName)}</td>
              <td><span class="mode-pill">${this.esc(b.payment_mode || "Cash")}</span></td>
              <td class="right mono"><strong>${SalonScheduler.formatINR(b.amount_paid)}</strong></td>
            </tr>`;
        }).join("");
      }
    }

    // 2. Customer Diary (All Historical Visits)
    const diary = SalonScheduler.buildCustomerDiary(SyncStore.bookings).filter((c) => {
      if (!this.diarySearch) return true;
      return `${c.name} ${c.phone} ${c.lastService}`.toLowerCase().includes(this.diarySearch);
    });

    const diaryBody = document.getElementById("diaryTableBody");
    if (diaryBody) {
      if (diary.length === 0) {
        diaryBody.innerHTML = `<tr><td colspan="6" class="empty-cell">No matching customers found in diary.</td></tr>`;
      } else {
        diaryBody.innerHTML = diary.map((c) => `
          <tr>
            <td><strong>${this.esc(c.name)}</strong></td>
            <td class="mono">${this.esc(c.phone || "—")}</td>
            <td><span class="visit-badge">${c.visits} visit${c.visits > 1 ? "s" : ""}</span></td>
            <td>${this.esc(c.lastService)} <span class="sub-date">(${this.esc(c.lastDate)})</span></td>
            <td class="right mono"><strong>${SalonScheduler.formatINR(c.totalSpent)}</strong></td>
            <td class="right">
              <button type="button" class="btn btn-xs btn-secondary" onclick="SalonApp.openCustomerHistory('${this.esc(c.key)}')">History</button>
              <button type="button" class="btn btn-xs btn-soft" onclick="SalonApp.openBookingModal(null, { customer_name: '${this.esc(c.name)}', customer_phone: '${this.esc(c.phone)}' })">Book Again</button>
            </td>
          </tr>`).join("");
      }
    }
  },

  openCustomerHistory(custKey) {
    const cust = SalonScheduler.buildCustomerDiary(SyncStore.bookings).find((c) => c.key === custKey);
    if (!cust) return;
    document.getElementById("custModalTitle").textContent = cust.name;
    document.getElementById("custModalSub").textContent = `${cust.phone || "No mobile"} · ${cust.visits} total visits · Lifetime Spend: ${SalonScheduler.formatINR(cust.totalSpent)}`;

    const listEl = document.getElementById("custHistoryRows");
    listEl.innerHTML = cust.history.map((b) => {
      const chairName = SyncStore.settings.chairs.find((c) => c.id === b.chair_id)?.name || "-";
      const amt = b.amount_paid != null ? `${SalonScheduler.formatINR(b.amount_paid)} (${b.payment_mode || "Paid"})` : b.status;
      return `
        <div class="hist-row">
          <div>
            <strong>${this.esc(b.service_name)}</strong>
            <span>${this.esc(b.booking_date)} at ${SalonScheduler.minsToDisplay(b.start_min)} · ${this.esc(chairName)}</span>
            ${b.notes ? `<em>Note: ${this.esc(b.notes)}</em>` : ""}
          </div>
          <span class="hist-amt">${this.esc(amt)}</span>
        </div>`;
    }).join("");

    document.getElementById("custQuickBookBtn").onclick = () => {
      this.closeModal("customerModal");
      this.openBookingModal(null, { customer_name: cust.name, customer_phone: cust.phone });
    };

    document.getElementById("customerModal").classList.remove("hidden");
  },

  exportDailyCSV() {
    const dayRows = SyncStore.bookings.filter((b) => b.booking_date === this.selectedDate && b.status !== "cancelled");
    if (!dayRows.length) {
      alert("No rows for this date to export.");
      return;
    }
    const headers = ["Date", "Time", "Customer Name", "Mobile", "Service", "Source", "Chair", "Status", "Amount Paid (INR)", "Payment Mode", "Notes"];
    const lines = dayRows.map((b) => {
      const chair = SyncStore.settings.chairs.find((c) => c.id === b.chair_id)?.name || "";
      return [
        b.booking_date,
        SalonScheduler.minsToDisplay(b.start_min),
        `"${(b.customer_name || "").replace(/"/g, '""')}"`,
        `"${b.customer_phone || ""}"`,
        `"${b.service_name || ""}"`,
        b.booking_source,
        `"${chair}"`,
        b.status,
        b.amount_paid ?? "",
        b.payment_mode || "",
        `"${(b.notes || "").replace(/"/g, '""')}"`
      ].join(",");
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Salon_Register_${this.selectedDate}.csv`;
    a.click();
  },

  // =========================================================
  // SYNC & SALON SETTINGS MODALS
  // =========================================================
  openSyncModal() {
    document.getElementById("syncShopCode").value = SyncStore.shopCode;
    document.getElementById("syncSbUrl").value = SyncStore.supabaseUrl || "";
    document.getElementById("syncSbKey").value = SyncStore.supabaseAnonKey || "";

    const msgEl = document.getElementById("syncModalAlert");
    if (SyncStore.statusError) {
      msgEl.textContent = SyncStore.statusError;
      msgEl.className = "sync-alert err";
      msgEl.classList.remove("hidden");
    } else if (SyncStore.mode === "supabase") {
      msgEl.textContent = `Connected to Supabase Realtime for Shop Code "${SyncStore.shopCode}". Both Owner and Reception devices sync automatically.`;
      msgEl.className = "sync-alert ok";
      msgEl.classList.remove("hidden");
    } else {
      msgEl.textContent = "Currently running in Demo Mode (syncs across tabs in this browser). Connect a free Supabase project below for multi-phone live sync.";
      msgEl.className = "sync-alert info";
      msgEl.classList.remove("hidden");
    }

    const baseUrl = `${window.location.origin}${window.location.pathname}?shop=${encodeURIComponent(SyncStore.shopCode)}`;
    document.getElementById("shareStaffUrl").value = `${baseUrl}&role=reception`;
    document.getElementById("syncModal").classList.remove("hidden");
  },

  async saveSupabaseConnection(ev) {
    ev.preventDefault();
    const code = document.getElementById("syncShopCode").value.trim().toUpperCase() || "STUDIO-LUXE";
    const url = document.getElementById("syncSbUrl").value.trim();
    const key = document.getElementById("syncSbKey").value.trim();

    if (!url || !key) {
      SyncStore.shopCode = code;
      SyncStore.saveLocalConfig({ shopCode: code });
      SyncStore.emit();
      this.closeModal("syncModal");
      this.showToast(`Updated Shop Code to ${code} (Demo Sync).`);
      return;
    }

    const ok = await SyncStore.connectSupabase(url, key, code);
    if (ok) {
      this.closeModal("syncModal");
      this.showToast(`Connected live to Supabase (${code})!`);
    } else {
      this.openSyncModal();
    }
  },

  async copySqlScript() {
    try {
      const res = await fetch("/tools/salon-queue/supabase_schema.sql");
      const sql = await res.text();
      await navigator.clipboard.writeText(sql);
      this.showToast("Copied SQL setup script! Paste it in Supabase SQL Editor and click Run.");
    } catch (_) {
      alert("Please view /tools/salon-queue/supabase_schema.sql to copy the SQL setup script.");
    }
  },

  async copyStaffLink() {
    const inp = document.getElementById("shareStaffUrl");
    if (!inp) return;
    try {
      await navigator.clipboard.writeText(inp.value);
      this.showToast("Copied Shop Reception link!");
    } catch (_) {
      inp.select();
    }
  },

  openSettingsModal() {
    document.getElementById("cfgSalonName").value = SyncStore.settings.salon_name || "";
    document.getElementById("cfgChairsText").value = SyncStore.settings.chairs.map((c) => c.name).join("\n");
    document.getElementById("cfgServicesText").value = SyncStore.settings.services
      .map((s) => `${s.name} | ${s.durationMin} | ${s.price}`)
      .join("\n");
    document.getElementById("settingsModal").classList.remove("hidden");
  },

  async saveSalonSettings(ev) {
    ev.preventDefault();
    const name = document.getElementById("cfgSalonName").value.trim() || "Studio Luxe Salon";
    const chairLines = document.getElementById("cfgChairsText").value
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    const chairs = chairLines.map((label, idx) => ({
      id: SyncStore.settings.chairs[idx]?.id || `c${idx + 1}`,
      name: label
    }));

    const svcLines = document.getElementById("cfgServicesText").value
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    const services = svcLines.map((line, idx) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        id: `s${idx + 1}`,
        name: parts[0] || `Service ${idx + 1}`,
        durationMin: Math.max(15, Number(parts[1]) || 30),
        price: Math.max(0, Number(parts[2]) || 200)
      };
    });

    if (chairs.length && services.length) {
      await SyncStore.saveSettings({ salon_name: name, chairs, services });
      this.closeModal("settingsModal");
      this.showToast("Saved salon chairs & service menu!");
    }
  },

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add("hidden");
  },

  showToast(message, actionLabel = "", actionFn = null) {
    const t = document.getElementById("studioToast");
    if (!t) return;
    t.innerHTML = "";
    const sp = document.createElement("span");
    sp.textContent = message;
    t.appendChild(sp);
    if (actionLabel && typeof actionFn === "function") {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toast-undo-btn";
      b.textContent = actionLabel;
      b.onclick = () => {
        actionFn();
        t.classList.add("hidden");
      };
      t.appendChild(b);
    }
    t.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add("hidden"), actionLabel ? 5500 : 3400);
  },

  esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  SalonApp.init();
});
