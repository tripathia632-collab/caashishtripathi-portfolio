/**
 * Shared Live Data Network Background (caashishtripathi.in)
 * - Teal -> Indigo drifting nodes, cursor orbit glow, data packets & click ripples
 */
(function () {
  if (document.getElementById('field')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'bg';
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = '<div class="bg-aurora"></div><div class="bg-dots"></div><canvas id="field"></canvas>';
  document.body.prepend(wrapper);
  window.__bgNetworkActive = true;

  const c = document.getElementById('field');
  if (!c) return;
  const ctx = c.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FIELD_FROM = [13, 148, 136];
  const FIELD_TO = [79, 70, 229];
  const mouse = { x: -9999, y: -9999 };

  let w, h, dpr, L, L2, M, R0;
  let pts = [];
  let packets = [];
  let ripples = [];
  let running = true;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = c.width = window.innerWidth * dpr;
    h = c.height = window.innerHeight * dpr;
    c.style.width = window.innerWidth + 'px';
    c.style.height = window.innerHeight + 'px';
    L = 140 * dpr;
    L2 = L * L;
    M = 210 * dpr;
    R0 = 70 * dpr;
    const n = Math.round(Math.min(100, (window.innerWidth * window.innerHeight) / 15000));
    pts = Array.from({ length: n }, () => {
      const vx = (Math.random() - 0.5) * 0.28 * dpr;
      const vy = (Math.random() - 0.5) * 0.28 * dpr;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx,
        vy,
        bx: vx,
        by: vy,
        r: (Math.random() * 1.4 + 0.8) * dpr,
        h: Math.random()
      };
    });
    packets = [];
    ripples = [];
  }

  function col(t, a) {
    const clamped = Math.max(0, Math.min(1, t));
    return (
      'rgba(' +
      Math.round(FIELD_FROM[0] + (FIELD_TO[0] - FIELD_FROM[0]) * clamped) + ',' +
      Math.round(FIELD_FROM[1] + (FIELD_TO[1] - FIELD_FROM[1]) * clamped) + ',' +
      Math.round(FIELD_FROM[2] + (FIELD_TO[2] - FIELD_FROM[2]) * clamped) + ',' +
      a + ')'
    );
  }

  function spawnPacket() {
    if (!pts.length) return;
    const a = pts[(Math.random() * pts.length) | 0];
    for (let k = 0; k < pts.length; k++) {
      const b = pts[(Math.random() * pts.length) | 0];
      if (b === a) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy < L2 * 0.8) {
        packets.push({ a, b, t: 0, s: 0.01 + Math.random() * 0.012 });
        return;
      }
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const scrollP = Math.min(1, window.scrollY / maxScroll);
    const mx = mouse.x * dpr;
    const my = mouse.y * dpr;
    const active = mouse.x > -1000;

    if (active) {
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, M);
      g.addColorStop(0, col(scrollP, 0.08));
      g.addColorStop(1, col(scrollP, 0));
      ctx.fillStyle = g;
      ctx.fillRect(mx - M, my - M, M * 2, M * 2);
    }

    for (const p of pts) {
      if (active) {
        const dx = mx - p.x;
        const dy2 = my - p.y;
        const d = Math.hypot(dx, dy2);
        if (d < M && d > 1) {
          const f = d < R0 ? -(1 - d / R0) * 0.35 * dpr : (1 - d / M) * 0.03 * dpr;
          p.vx += (dx / d) * f;
          p.vy += (dy2 / d) * f;
        }
      }
      p.vx += (p.bx - p.vx) * 0.03;
      p.vy += (p.by - p.vy) * 0.03;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x += w;
      else if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h;
      else if (p.y > h) p.y -= h;
    }

    ctx.lineWidth = 0.8 * dpr;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j];
        const dx = a.x - b.x;
        const dy2 = a.y - b.y;
        const d = dx * dx + dy2 * dy2;
        if (d < L2) {
          ctx.strokeStyle = col(scrollP, (1 - d / L2) * 0.19);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const p of pts) {
      let near = 0;
      if (active) {
        const md = Math.hypot(p.x - mx, p.y - my);
        if (md < M) {
          near = 1 - md / M;
          ctx.strokeStyle = col(scrollP + 0.15, near * 0.45);
          ctx.lineWidth = dpr;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mx, my);
          ctx.stroke();
        }
      }
      ctx.fillStyle = col(scrollP * 0.8 + p.h * 0.3, 0.4 + near * 0.42);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + near * 1.1), 0, Math.PI * 2);
      ctx.fill();
    }

    if (packets.length < 8 && Math.random() < 0.08) spawnPacket();
    ctx.shadowBlur = 10 * dpr;
    for (let k = packets.length - 1; k >= 0; k--) {
      const q = packets[k];
      q.t += q.s;
      const dx = q.b.x - q.a.x;
      const dy2 = q.b.y - q.a.y;
      if (q.t >= 1 || dx * dx + dy2 * dy2 > L2 * 1.6) {
        packets.splice(k, 1);
        continue;
      }
      const x = q.a.x + dx * q.t;
      const y = q.a.y + dy2 * q.t;
      ctx.shadowColor = col(scrollP + 0.2, 0.85);
      ctx.fillStyle = col(scrollP + 0.2, 0.9);
      ctx.beginPath();
      ctx.arc(x, y, 2 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (let k = ripples.length - 1; k >= 0; k--) {
      const r = ripples[k];
      r.r += 7 * dpr;
      r.a *= 0.93;
      if (r.a < 0.02) {
        ripples.splice(k, 1);
        continue;
      }
      ctx.strokeStyle = col(scrollP, r.a);
      ctx.lineWidth = 1.4 * dpr;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (running && !reduce) requestAnimationFrame(frame);
  }

  size();
  frame();

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      size();
      if (reduce) frame();
    }, 150);
  });
  document.addEventListener('visibilitychange', () => {
    const was = running;
    running = document.visibilityState === 'visible';
    if (running && !was && !reduce) requestAnimationFrame(frame);
  });
  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });
  if (!reduce) {
    window.addEventListener('pointerdown', (e) => {
      const x = e.clientX * dpr;
      const y = e.clientY * dpr;
      ripples.push({ x, y, r: 0, a: 0.4 });
      for (const p of pts) {
        const dx = p.x - x;
        const dy = p.y - y;
        const d = Math.hypot(dx, dy);
        if (d < 220 * dpr && d > 1) {
          const f = (1 - d / (220 * dpr)) * 4 * dpr;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
    }, { passive: true });
  }
})();
