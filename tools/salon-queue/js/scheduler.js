/**
 * Scheduling Engine, Wait-Time Finder, Customer Diary & WhatsApp Helper
 */

const SalonScheduler = {
  DEFAULT_CHAIRS: [
    { id: "c1", name: "Chair 1 · Ravi" },
    { id: "c2", name: "Chair 2 · Aman" },
    { id: "c3", name: "Chair 3 · Priya" }
  ],

  DEFAULT_SERVICES: [
    { id: "s1", name: "Haircut", durationMin: 30, price: 250 },
    { id: "s2", name: "Beard Trim & Styling", durationMin: 15, price: 150 },
    { id: "s3", name: "Haircut + Beard Combo", durationMin: 45, price: 350 },
    { id: "s4", name: "Hair Color / Spa", durationMin: 60, price: 850 },
    { id: "s5", name: "Facial / Cleanup", durationMin: 45, price: 600 },
    { id: "s6", name: "Head Massage", durationMin: 30, price: 300 }
  ],

  todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },

  addDaysISO(baseIso, deltaDays) {
    const [y, m, d] = baseIso.split("-").map(Number);
    const dt = new Date(y, m - 1, d + deltaDays);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  },

  nowMinutesRounded15() {
    const d = new Date();
    const mins = d.getHours() * 60 + d.getMinutes();
    return Math.ceil(mins / 15) * 15;
  },

  minsToDisplay(mins) {
    const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
    const h24 = Math.floor(clamped / 60);
    const m = clamped % 60;
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  },

  minsToTimeInput(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  },

  timeInputToMins(str) {
    if (!str || !str.includes(":")) return 600;
    const [h, m] = str.split(":").map(Number);
    return (h * 60) + m;
  },

  normalizePhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
  },

  formatINR(val) {
    const n = Number(val || 0);
    return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  },

  isBlockingBooking(b) {
    return b && b.status !== "cancelled";
  },

  findConflict(bookings, dateStr, chairId, startMin, durationMin, excludeId = null) {
    const endMin = startMin + durationMin;
    return bookings.find((b) => {
      if (b.id === excludeId) return false;
      if (b.booking_date !== dateStr || b.chair_id !== chairId) return false;
      if (b.status === "cancelled") return false;
      const bStart = Number(b.start_min);
      const bEnd = bStart + Number(b.duration_min);
      return startMin < bEnd && endMin > bStart;
    }) || null;
  },

  getNextFreeSlots(bookings, chairs, dateStr, durationMin = 30, openMin = 570, closeMin = 1290) {
    const isToday = dateStr === this.todayISO();
    const earliestBase = isToday ? Math.max(openMin, this.nowMinutesRounded15()) : openMin;

    return chairs.map((chair) => {
      let candidate = earliestBase;
      const chairBookings = bookings
        .filter((b) => b.booking_date === dateStr && b.chair_id === chair.id && b.status !== "cancelled")
        .sort((a, b) => a.start_min - b.start_min);

      for (const b of chairBookings) {
        const bStart = Number(b.start_min);
        const bEnd = bStart + Number(b.duration_min);
        if (candidate + durationMin <= bStart) {
          break; // Fits cleanly before this booking
        }
        if (candidate < bEnd) {
          candidate = Math.ceil(bEnd / 15) * 15;
        }
      }

      const fits = candidate + durationMin <= closeMin;
      const isNow = isToday && fits && candidate <= earliestBase;
      const waitMins = isToday && fits ? Math.max(0, candidate - this.nowMinutesRounded15()) : null;

      return {
        chairId: chair.id,
        chairName: chair.name,
        nextMin: fits ? candidate : null,
        label: !fits ? "Full Today" : (isNow ? `Free Now (${this.minsToDisplay(candidate)})` : this.minsToDisplay(candidate)),
        isFreeNow: isNow,
        waitMins
      };
    });
  },

  buildCustomerDiary(bookings) {
    const map = new Map();
    const sorted = [...bookings]
      .filter((b) => b.status !== "cancelled")
      .sort((a, b) => {
        if (a.booking_date !== b.booking_date) return b.booking_date.localeCompare(a.booking_date);
        return b.start_min - a.start_min;
      });

    for (const b of sorted) {
      const phoneKey = this.normalizePhone(b.customer_phone);
      const key = phoneKey || `name:${(b.customer_name || "").trim().toLowerCase()}`;
      if (!key || key === "name:") continue;

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: b.customer_name,
          phone: b.customer_phone || "",
          normPhone: phoneKey,
          visits: 0,
          paidVisits: 0,
          totalSpent: 0,
          lastDate: b.booking_date,
          lastService: b.service_name,
          lastChairId: b.chair_id,
          history: []
        });
      }

      const rec = map.get(key);
      if (b.customer_name && (!rec.name || rec.name === "Walk-in Guest")) {
        rec.name = b.customer_name;
      }
      if (b.customer_phone && !rec.phone) {
        rec.phone = b.customer_phone;
      }
      rec.visits += 1;
      if (b.status === "completed" && b.amount_paid != null && b.amount_paid !== "") {
        rec.paidVisits += 1;
        rec.totalSpent += Number(b.amount_paid) || 0;
      }
      rec.history.push(b);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.lastDate !== b.lastDate) return b.lastDate.localeCompare(a.lastDate);
      return b.visits - a.visits;
    });
  },

  lookupByPhone(bookings, phoneInput) {
    const p = this.normalizePhone(phoneInput);
    if (p.length < 6) return null;
    const diary = this.buildCustomerDiary(bookings);
    return diary.find((c) => c.normPhone === p) || null;
  },

  buildWhatsAppUrl(booking, salonName, chairs, messageType = "confirm") {
    const clean = String(booking.customer_phone || "").replace(/\D/g, "");
    const targetPhone = clean.length === 10 ? `91${clean}` : clean;
    const chair = chairs.find((c) => c.id === booking.chair_id)?.name || "Assigned Chair";
    const timeStr = this.minsToDisplay(booking.start_min);
    const dateStr = booking.booking_date;

    let msg = "";
    if (messageType === "ready") {
      msg = `Hi ${booking.customer_name}, your chair (${chair}) at *${salonName}* is ready now for *${booking.service_name}*. Please come to the counter!`;
    } else if (messageType === "shifted") {
      msg = `Hi ${booking.customer_name}, update from *${salonName}*: your *${booking.service_name}* slot has been shifted to *${timeStr}* on *${dateStr}* (${chair}). Reply if you need any change.`;
    } else {
      msg = `Hi ${booking.customer_name}, your booking at *${salonName}* is confirmed!\n• Service: ${booking.service_name} (${booking.duration_min} min)\n• Time: ${timeStr} on ${dateStr}\n• Chair: ${chair}\nPlease arrive 5 mins before your slot.`;
    }

    const encoded = encodeURIComponent(msg);
    return targetPhone ? `https://wa.me/${targetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  }
};
