/**
 * Live Multi-Device Sync Store
 * - Uses Supabase PostgreSQL + Realtime WebSockets when connected (via /api/salon/config or user-saved keys)
 * - Uses Demo LocalStorage + BroadcastChannel across browser tabs when running in zero-config Demo Mode
 */

const SyncStore = {
  CONFIG_KEY: "salonsync_cfg_v1",
  DEMO_DATA_KEY: "salonsync_demo_bookings_v1",
  DEMO_SETTINGS_KEY: "salonsync_demo_settings_v1",

  mode: "demo", // "supabase" | "demo"
  statusText: "Demo Live Sync",
  statusError: "",
  shopCode: "STUDIO-LUXE",
  role: "owner", // "owner" | "reception"
  supabaseUrl: "",
  supabaseAnonKey: "",
  client: null,
  channel: null,
  bc: null,

  settings: {
    salon_name: "Studio Luxe Salon",
    chairs: JSON.parse(JSON.stringify(SalonScheduler.DEFAULT_CHAIRS)),
    services: JSON.parse(JSON.stringify(SalonScheduler.DEFAULT_SERVICES)),
    open_min: 570,  // 09:30 AM
    close_min: 1290 // 09:30 PM
  },
  bookings: [],
  onChange: null,

  makeUUID() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  async init(onChangeCb) {
    this.onChange = onChangeCb;

    // Read URL params (?shop=...&role=...)
    const params = new URLSearchParams(window.location.search);
    const saved = this.loadLocalConfig();

    this.shopCode = (params.get("shop") || saved.shopCode || "STUDIO-LUXE").trim().toUpperCase();
    this.role = params.get("role") === "reception" ? "reception" : (saved.role || "owner");

    // 1. Check Vercel serverless /api/salon/config first
    let envCfg = { configured: false };
    try {
      const res = await fetch("/api/salon/config");
      if (res.ok) envCfg = await res.json();
    } catch (_) {}

    if (envCfg.configured && envCfg.supabaseUrl && envCfg.supabaseAnonKey) {
      this.supabaseUrl = envCfg.supabaseUrl;
      this.supabaseAnonKey = envCfg.supabaseAnonKey;
    } else if (saved.supabaseUrl && saved.supabaseAnonKey) {
      this.supabaseUrl = saved.supabaseUrl;
      this.supabaseAnonKey = saved.supabaseAnonKey;
    }

    if (this.supabaseUrl && this.supabaseAnonKey && window.supabase) {
      const ok = await this.connectSupabase(this.supabaseUrl, this.supabaseAnonKey, this.shopCode);
      if (ok) return;
    }

    // Fallback: Demo Live Mode with BroadcastChannel across tabs
    this.initDemoMode();
  },

  loadLocalConfig() {
    try {
      return JSON.parse(localStorage.getItem(this.CONFIG_KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  },

  saveLocalConfig(patch) {
    const cur = this.loadLocalConfig();
    const next = { ...cur, ...patch };
    try {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(next));
    } catch (_) {}
  },

  setRole(role) {
    this.role = role === "reception" ? "reception" : "owner";
    this.saveLocalConfig({ role: this.role });
    this.emit();
  },

  async connectSupabase(url, anonKey, shopCode) {
    this.statusError = "";
    this.shopCode = (shopCode || "STUDIO-LUXE").trim().toUpperCase();
    this.supabaseUrl = (url || "").trim();
    this.supabaseAnonKey = (anonKey || "").trim();

    if (!this.supabaseUrl || !this.supabaseAnonKey || !window.supabase) {
      this.statusError = "Supabase URL, Anon Key, or SDK missing.";
      return false;
    }

    try {
      if (this.channel) {
        try { await this.client?.removeChannel(this.channel); } catch (_) {}
        this.channel = null;
      }

      this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);

      // Load settings & bookings for this shop
      const [{ data: sData, error: sErr }, { data: bData, error: bErr }] = await Promise.all([
        this.client.from("salon_settings").select("*").eq("shop_code", this.shopCode).maybeSingle(),
        this.client.from("salon_bookings").select("*").eq("shop_code", this.shopCode).order("booking_date", { ascending: false }).order("start_min", { ascending: true })
      ]);

      if (sErr || bErr) {
        const msg = (sErr || bErr).message || "Supabase query error";
        this.statusError = msg.includes("does not exist") || msg.includes("schema cache")
          ? "Tables not created yet — copy the SQL Setup Script in Sync Settings and run it in Supabase SQL Editor."
          : msg;
        this.mode = "demo";
        this.statusText = "Demo Mode (Setup Pending)";
        this.initDemoMode(false);
        return false;
      }

      if (sData) {
        this.settings = {
          salon_name: sData.salon_name || "Studio Luxe Salon",
          chairs: Array.isArray(sData.chairs) && sData.chairs.length ? sData.chairs : JSON.parse(JSON.stringify(SalonScheduler.DEFAULT_CHAIRS)),
          services: Array.isArray(sData.services) && sData.services.length ? sData.services : JSON.parse(JSON.stringify(SalonScheduler.DEFAULT_SERVICES)),
          open_min: sData.open_min ?? 570,
          close_min: sData.close_min ?? 1290
        };
      } else {
        // Initialize shop settings row cleanly
        await this.client.from("salon_settings").upsert({
          shop_code: this.shopCode,
          ...this.settings
        });
      }

      this.bookings = (bData || []).map((r) => this.normalizeBookingRow(r));
      this.mode = "supabase";
      this.statusText = "Supabase Live Sync";
      this.saveLocalConfig({
        shopCode: this.shopCode,
        supabaseUrl: this.supabaseUrl,
        supabaseAnonKey: this.supabaseAnonKey
      });

      // Real-time subscription across Owner Phone + Shop Reception
      this.channel = this.client
        .channel(`salon-${this.shopCode}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "salon_bookings", filter: `shop_code=eq.${this.shopCode}` }, () => {
          this.refreshSupabase();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "salon_settings", filter: `shop_code=eq.${this.shopCode}` }, () => {
          this.refreshSupabase();
        })
        .subscribe();

      this.emit();
      return true;
    } catch (err) {
      this.statusError = err.message || "Could not connect to Supabase.";
      this.mode = "demo";
      this.statusText = "Demo Live Sync";
      this.initDemoMode(false);
      return false;
    }
  },

  async refreshSupabase() {
    if (this.mode !== "supabase" || !this.client) return;
    try {
      const [{ data: sData }, { data: bData }] = await Promise.all([
        this.client.from("salon_settings").select("*").eq("shop_code", this.shopCode).maybeSingle(),
        this.client.from("salon_bookings").select("*").eq("shop_code", this.shopCode).order("booking_date", { ascending: false }).order("start_min", { ascending: true })
      ]);
      if (sData) {
        this.settings = {
          salon_name: sData.salon_name || this.settings.salon_name,
          chairs: Array.isArray(sData.chairs) && sData.chairs.length ? sData.chairs : this.settings.chairs,
          services: Array.isArray(sData.services) && sData.services.length ? sData.services : this.settings.services,
          open_min: sData.open_min ?? 570,
          close_min: sData.close_min ?? 1290
        };
      }
      if (bData) {
        this.bookings = bData.map((r) => this.normalizeBookingRow(r));
      }
      this.emit();
    } catch (_) {}
  },

  async disconnectToDemo() {
    if (this.channel && this.client) {
      try { await this.client.removeChannel(this.channel); } catch (_) {}
    }
    this.channel = null;
    this.client = null;
    this.supabaseUrl = "";
    this.supabaseAnonKey = "";
    this.statusError = "";
    this.saveLocalConfig({ supabaseUrl: "", supabaseAnonKey: "" });
    this.initDemoMode();
  },

  normalizeBookingRow(r) {
    return {
      ...r,
      start_min: Number(r.start_min),
      duration_min: Number(r.duration_min),
      service_price: Number(r.service_price || 0),
      amount_paid: r.amount_paid === null || r.amount_paid === "" || r.amount_paid === undefined ? null : Number(r.amount_paid)
    };
  },

  seedDemoBookings() {
    const today = SalonScheduler.todayISO();
    const y1 = SalonScheduler.addDaysISO(today, -2);
    const y2 = SalonScheduler.addDaysISO(today, -6);
    const y3 = SalonScheduler.addDaysISO(today, -12);

    // Anchor demo slots around current time or early evening so board looks alive right away
    const nowM = Math.max(630, Math.min(1170, SalonScheduler.nowMinutesRounded15()));

    return [
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: today,
        start_min: nowM - 60, duration_min: 30, chair_id: "c1",
        customer_name: "Vikram Joshi", customer_phone: "9820145112",
        service_name: "Haircut", service_price: 250,
        booking_source: "walkin", status: "completed", amount_paid: 250, payment_mode: "UPI",
        notes: "Regular trim", updated_by: "reception"
      },
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: today,
        start_min: nowM - 45, duration_min: 45, chair_id: "c2",
        customer_name: "Siddharth Rao", customer_phone: "9819223344",
        service_name: "Haircut + Beard Combo", service_price: 350,
        booking_source: "phone", status: "completed", amount_paid: 350, payment_mode: "Cash",
        notes: "Called owner at 5 PM", updated_by: "reception"
      },
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: today,
        start_min: nowM - 15, duration_min: 30, chair_id: "c1",
        customer_name: "Arjun Kapoor", customer_phone: "9820456789",
        service_name: "Haircut", service_price: 250,
        booking_source: "walkin", status: "seated", amount_paid: null, payment_mode: "",
        notes: "In chair now", updated_by: "reception"
      },
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: today,
        start_min: nowM, duration_min: 45, chair_id: "c3",
        customer_name: "Neha Malhotra", customer_phone: "9920112233",
        service_name: "Facial / Cleanup", service_price: 600,
        booking_source: "phone", status: "seated", amount_paid: null, payment_mode: "",
        notes: "Seated on time", updated_by: "reception"
      },
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: today,
        start_min: nowM + 15, duration_min: 30, chair_id: "c1",
        customer_name: "Karan Sharma", customer_phone: "9876543210",
        service_name: "Haircut", service_price: 250,
        booking_source: "walkin", status: "booked", amount_paid: null, payment_mode: "",
        notes: "Waiting at front desk", updated_by: "reception"
      },
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: today,
        start_min: nowM + 30, duration_min: 45, chair_id: "c2",
        customer_name: "Rahul Verma", customer_phone: "9820998877",
        service_name: "Haircut + Beard Combo", service_price: 350,
        booking_source: "phone", status: "booked", amount_paid: null, payment_mode: "",
        notes: "Owner confirmed on phone", updated_by: "owner"
      },
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: today,
        start_min: nowM + 45, duration_min: 15, chair_id: "c1",
        customer_name: "Rohan Desai", customer_phone: "9811112233",
        service_name: "Beard Trim & Styling", service_price: 150,
        booking_source: "walkin", status: "booked", amount_paid: null, payment_mode: "",
        notes: "Waiting after Karan", updated_by: "reception"
      },
      // Historical diary entries so search & customer history work immediately
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: y1,
        start_min: 1080, duration_min: 45, chair_id: "c2",
        customer_name: "Rahul Verma", customer_phone: "9820998877",
        service_name: "Haircut + Beard Combo", service_price: 350,
        booking_source: "phone", status: "completed", amount_paid: 350, payment_mode: "UPI",
        notes: "Medium fade + beard line", updated_by: "reception"
      },
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: y2,
        start_min: 1140, duration_min: 30, chair_id: "c1",
        customer_name: "Arjun Kapoor", customer_phone: "9820456789",
        service_name: "Haircut", service_price: 250,
        booking_source: "walkin", status: "completed", amount_paid: 250, payment_mode: "Cash",
        notes: "", updated_by: "reception"
      },
      {
        id: this.makeUUID(), shop_code: this.shopCode, booking_date: y3,
        start_min: 1020, duration_min: 60, chair_id: "c3",
        customer_name: "Neha Malhotra", customer_phone: "9920112233",
        service_name: "Hair Color / Spa", service_price: 850,
        booking_source: "phone", status: "completed", amount_paid: 900, payment_mode: "UPI",
        notes: "Includes serum finish", updated_by: "reception"
      }
    ];
  },

  initDemoMode(resetBanner = true) {
    this.mode = "demo";
    if (resetBanner) {
      this.statusText = "Demo Live Sync";
    }

    try {
      const rawSettings = localStorage.getItem(this.DEMO_SETTINGS_KEY);
      if (rawSettings) {
        this.settings = { ...this.settings, ...JSON.parse(rawSettings) };
      }
      const rawBookings = localStorage.getItem(this.DEMO_DATA_KEY);
      if (rawBookings) {
        this.bookings = JSON.parse(rawBookings).map((r) => this.normalizeBookingRow(r));
      } else {
        this.bookings = this.seedDemoBookings();
        this.persistDemo();
      }
    } catch (_) {
      this.bookings = this.seedDemoBookings();
    }

    if (!this.bc && "BroadcastChannel" in window) {
      this.bc = new BroadcastChannel(`salonsync_${this.shopCode}`);
      this.bc.onmessage = (ev) => {
        if (ev.data?.type === "sync") {
          try {
            const rawB = localStorage.getItem(this.DEMO_DATA_KEY);
            const rawS = localStorage.getItem(this.DEMO_SETTINGS_KEY);
            if (rawB) this.bookings = JSON.parse(rawB).map((r) => this.normalizeBookingRow(r));
            if (rawS) this.settings = { ...this.settings, ...JSON.parse(rawS) };
            this.emit();
          } catch (_) {}
        }
      };
    }

    this.emit();
  },

  persistDemo() {
    try {
      localStorage.setItem(this.DEMO_DATA_KEY, JSON.stringify(this.bookings));
      localStorage.setItem(this.DEMO_SETTINGS_KEY, JSON.stringify(this.settings));
      this.bc?.postMessage({ type: "sync" });
    } catch (_) {}
  },

  resetDemoData() {
    this.bookings = this.seedDemoBookings();
    this.persistDemo();
    this.emit();
  },

  emit() {
    if (typeof this.onChange === "function") {
      this.onChange();
    }
  },

  async saveBooking(record) {
    const clean = this.normalizeBookingRow({
      id: record.id || this.makeUUID(),
      shop_code: this.shopCode,
      booking_date: record.booking_date,
      start_min: Number(record.start_min),
      duration_min: Number(record.duration_min),
      chair_id: record.chair_id,
      customer_name: record.customer_name.trim(),
      customer_phone: record.customer_phone.trim(),
      service_name: record.service_name,
      service_price: Number(record.service_price || 0),
      booking_source: record.booking_source || (this.role === "owner" ? "phone" : "walkin"),
      status: record.status || "booked",
      amount_paid: record.amount_paid === undefined ? null : record.amount_paid,
      payment_mode: record.payment_mode || "",
      notes: record.notes || "",
      updated_by: this.role,
      updated_at: new Date().toISOString()
    });

    const idx = this.bookings.findIndex((b) => b.id === clean.id);
    if (idx !== -1) {
      this.bookings[idx] = { ...this.bookings[idx], ...clean };
    } else {
      this.bookings.push(clean);
    }
    this.emit();

    if (this.mode === "supabase" && this.client) {
      const { error } = await this.client.from("salon_bookings").upsert(clean);
      if (error) throw new Error(error.message);
    } else {
      this.persistDemo();
    }
    return clean;
  },

  async deleteBookingPermanently(id) {
    this.bookings = this.bookings.filter((b) => b.id !== id);
    this.emit();

    if (this.mode === "supabase" && this.client) {
      const { error } = await this.client.from("salon_bookings").delete().eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      this.persistDemo();
    }
  },

  async saveSettings(newSettings) {
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    this.emit();

    if (this.mode === "supabase" && this.client) {
      const { error } = await this.client.from("salon_settings").upsert({
        shop_code: this.shopCode,
        salon_name: this.settings.salon_name,
        chairs: this.settings.chairs,
        services: this.settings.services,
        open_min: this.settings.open_min,
        close_min: this.settings.close_min,
        updated_at: new Date().toISOString()
      });
      if (error) throw new Error(error.message);
    } else {
      this.persistDemo();
    }
  }
};
