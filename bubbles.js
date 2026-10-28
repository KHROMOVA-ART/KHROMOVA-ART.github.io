// Баблы свободно плавают по первому экрану: медленный дрейф, отскок от краёв и друг от друга.
// Их можно схватить и перетащить (или бросить), а клик без перетаскивания открывает окно раздела.
// Плавание и перетаскивание — только на десктопе (>1120px); на мобильных остаётся колонка из styles.css.
(() => {
  const canvas = document.querySelector(".hero__canvas");
  const els = [...document.querySelectorAll(".hero__bubble")];
  if (!canvas || !els.length) return;

  const desktop = window.matchMedia("(min-width: 1121px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  // отступы: ниже текстов шапки и выше нижнего меню (по их реальным размерам — они не масштабируются с высотой)
  const headerBlocks = document.querySelectorAll(".topbar__group--intro, .topbar__right-frame .topbar__group");
  const footer = document.querySelector(".hero__footer");
  let headerBottom = 170;
  let footerTop = 0;
  const measureChrome = () => {
    const top = canvas.getBoundingClientRect().top;
    headerBottom = 0;
    headerBlocks.forEach((el) => {
      headerBottom = Math.max(headerBottom, el.getBoundingClientRect().bottom - top);
    });
    headerBottom = headerBottom ? headerBottom + 16 : 170;
    footerTop = footer ? footer.getBoundingClientRect().top - top - 12 : 0;
  };
  const padTop = () => headerBottom;
  const padBottom = (h) => (footerTop > 0 ? h - footerTop : 90);
  const PAD_SIDE = 24;
  const SPEED_MIN = 14; // px/s
  const SPEED_MAX = 30;
  const THROW_MAX = 700; // макс. скорость броска
  const DRAG_THRESHOLD = 5; // px — меньше считается кликом

  let items = [];
  let raf = 0;
  let last = 0;
  let visible = true;
  let suppressClick = false;

  const bounds = () => ({
    w: canvas.clientWidth,
    h: Math.min(canvas.clientHeight, window.innerHeight),
  });

  const clampItem = (it, w, h) => {
    const minX = PAD_SIDE + it.w / 2;
    const maxX = w - PAD_SIDE - it.w / 2;
    const minY = padTop(h) + it.h / 2;
    const maxY = h - padBottom(h) - it.h / 2;
    if (it.x < minX) { it.x = minX; it.vx = Math.abs(it.vx); }
    if (it.x > maxX) { it.x = maxX; it.vx = -Math.abs(it.vx); }
    if (it.y < minY) { it.y = minY; it.vy = Math.abs(it.vy); }
    if (it.y > maxY) { it.y = maxY; it.vy = -Math.abs(it.vy); }
  };

  // радиус скругления: форма бабла — прямоугольник со скруглёнными углами (у однострочных — капсула)
  const radiusOf = (el) => Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, el.offsetHeight / 2, el.offsetWidth / 2);

  const setup = () => {
    const c = canvas.getBoundingClientRect();
    items = els.map((el) => {
      // стартуем с позиций из макета, чтобы первый кадр выглядел как раньше
      const r = el.getBoundingClientRect();
      const angle = Math.random() * Math.PI * 2;
      const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
      return {
        el,
        w: el.offsetWidth,
        h: el.offsetHeight,
        r: radiusOf(el),
        x: r.left - c.left + r.width / 2,
        y: r.top - c.top + r.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        cruise: speed,
        k: 1, // текущий масштаб (при наведении и перетаскивании бабл чуть раздувается)
        hover: false,
        drag: null,
      };
    });
    const { w, h } = bounds();
    items.forEach((it) => clampItem(it, w, h));
  };

  const step = (now) => {
    raf = requestAnimationFrame(step);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const { w, h } = bounds();

    for (const it of items) {
      // масштаб из CSS (:hover 1.09, перетаскивание 1.14) — физика учитывает раздутый размер
      const target = it.drag ? 1.14 : it.hover ? 1.09 : 1;
      it.k += (target - it.k) * Math.min(1, dt * 9);
      if (it.drag) continue;
      // после броска или удара плавно возвращаем скорость к обычному дрейфу — и сверху, и снизу
      const speed = Math.hypot(it.vx, it.vy);
      if (speed > it.cruise) {
        const k = Math.max(it.cruise / speed, Math.exp(-dt * 1.6));
        it.vx *= k;
        it.vy *= k;
      } else if (speed > 0.001 && speed < it.cruise) {
        const k = Math.min(it.cruise / speed, 1 + dt * 0.8);
        it.vx *= k;
        it.vy *= k;
      }
      if (it.hover) continue; // под курсором бабл замирает, чтобы по нему было легко попасть
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      clampItem(it, w, h);
    }

    // столкновения по настоящей форме: скруглённый прямоугольник = «ядро» (прямоугольник без скруглений),
    // раздутое на радиус. Расстояние между формами = расстояние между ядрами − сумма радиусов,
    // так баблы касаются краями без зазора. После удара оба отлетают друг от друга.
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const gx = Math.abs(dx) - (a.w / 2 - a.r) * a.k - (b.w / 2 - b.r) * b.k;
        const gy = Math.abs(dy) - (a.h / 2 - a.r) * a.k - (b.h / 2 - b.r) * b.k;
        const rs = a.r * a.k + b.r * b.k;
        let nx;
        let ny;
        let overlap;
        if (gx > 0 && gy > 0) {
          // ближайшие точки — углы ядер: нормаль идёт по диагонали
          const d = Math.hypot(gx, gy);
          overlap = rs - d;
          if (overlap <= 0) continue;
          nx = (gx / d) * (Math.sign(dx) || 1);
          ny = (gy / d) * (Math.sign(dy) || 1);
        } else if (gx > gy) {
          overlap = rs - gx;
          if (overlap <= 0) continue;
          nx = Math.sign(dx) || 1;
          ny = 0;
        } else {
          overlap = rs - gy;
          if (overlap <= 0) continue;
          nx = 0;
          ny = Math.sign(dy) || 1;
        }
        // кого держат или наводят — не двигаем, толкаем другого целиком
        const aFixed = !!a.drag || a.hover;
        const bFixed = !!b.drag || b.hover;
        if (aFixed && bFixed) continue;
        const shareA = aFixed ? 0 : bFixed ? 1 : 0.5;
        const shareB = 1 - shareA;
        a.x -= nx * overlap * shareA;
        a.y -= ny * overlap * shareA;
        b.x += nx * overlap * shareB;
        b.y += ny * overlap * shareB;
        // скорости вдоль нормали; расходятся — ничего не делаем
        const va = a.vx * nx + a.vy * ny;
        const vb = b.vx * nx + b.vy * ny;
        if (aFixed) {
          if (vb < 0) { b.vx -= 2 * vb * nx; b.vy -= 2 * vb * ny; }
        } else if (bFixed) {
          if (va > 0) { a.vx -= 2 * va * nx; a.vy -= 2 * va * ny; }
        } else if (va - vb > 0) {
          // оба отлетают в противоположные стороны от точки удара: нормальная составляющая
          // каждого разворачивается «от соседа» (не слабее половины дрейфа), касательная сохраняется
          const na = -Math.max(Math.abs(va), a.cruise * 0.5);
          const nb = Math.max(Math.abs(vb), b.cruise * 0.5);
          a.vx += (na - va) * nx;
          a.vy += (na - va) * ny;
          b.vx += (nb - vb) * nx;
          b.vy += (nb - vb) * ny;
        }
      }
    }

    for (const it of items) {
      if (!it.drag) clampItem(it, w, h);
      it.el.style.left = `${it.x}px`;
      it.el.style.top = `${it.y}px`;
    }
  };

  const start = () => {
    if (raf || !visible || !desktop.matches || reduced.matches) return;
    measureChrome();
    if (!items.length) setup();
    last = performance.now();
    raf = requestAnimationFrame(step);
  };

  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const reset = () => {
    stop();
    items = [];
    els.forEach((el) => {
      el.style.left = "";
      el.style.top = "";
      el.classList.remove("is-dragging");
    });
    start();
  };

  const measure = () => {
    measureChrome();
    items.forEach((it) => {
      it.w = it.el.offsetWidth;
      it.h = it.el.offsetHeight;
      it.r = radiusOf(it.el);
    });
  };

  // --- перетаскивание ---
  const itemOf = (el) => items.find((it) => it.el === el);

  els.forEach((el) => {
    el.addEventListener("pointerenter", () => { const it = itemOf(el); if (it) it.hover = true; });
    el.addEventListener("pointerleave", () => { const it = itemOf(el); if (it) it.hover = false; });

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      suppressClick = false;
      const it = itemOf(el);
      if (!it || !raf) return;
      const { w, h } = bounds();
      it.drag = {
        id: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        ox: it.x - e.clientX,
        oy: it.y - e.clientY,
        moved: false,
        samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
        w,
        h,
      };
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", (e) => {
      const it = itemOf(el);
      const d = it && it.drag;
      if (!d || d.id !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return;
      if (!d.moved) {
        d.moved = true;
        el.classList.add("is-dragging");
      }
      e.preventDefault();
      it.x = e.clientX + d.ox;
      it.y = e.clientY + d.oy;
      // держим в пределах экрана, но без отскока
      it.x = Math.min(Math.max(it.x, PAD_SIDE + it.w / 2), d.w - PAD_SIDE - it.w / 2);
      it.y = Math.min(Math.max(it.y, padTop(d.h) + it.h / 2), d.h - padBottom(d.h) - it.h / 2);
      const now = performance.now();
      d.samples.push({ x: e.clientX, y: e.clientY, t: now });
      while (d.samples.length > 2 && now - d.samples[0].t > 90) d.samples.shift();
    });

    const release = (e) => {
      const it = itemOf(el);
      const d = it && it.drag;
      if (!d || d.id !== e.pointerId) return;
      it.drag = null;
      el.classList.remove("is-dragging");
      if (!d.moved) return; // это клик — откроется окно
      suppressClick = true;
      // бросок: скорость по последним ~90 мс движения
      const a = d.samples[0];
      const b = d.samples[d.samples.length - 1];
      const t = Math.max((b.t - a.t) / 1000, 0.016);
      let vx = (b.x - a.x) / t;
      let vy = (b.y - a.y) / t;
      const v = Math.hypot(vx, vy);
      if (v > THROW_MAX) { vx *= THROW_MAX / v; vy *= THROW_MAX / v; }
      if (v < it.cruise) {
        // отпустили без броска — продолжает дрейф в ту же сторону, что и раньше
        const s = Math.hypot(it.vx, it.vy) || 1;
        vx = (it.vx / s) * it.cruise;
        vy = (it.vy / s) * it.cruise;
      }
      it.vx = vx;
      it.vy = vy;
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);

    // клик (или Enter с клавиатуры) открывает окно раздела, перетаскивание — нет
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      if (typeof window.openSectionModal === "function") window.openSectionModal(el);
    });
    el.addEventListener("dragstart", (e) => e.preventDefault());
  });

  desktop.addEventListener("change", reset);
  reduced.addEventListener("change", reset);
  window.addEventListener("resize", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(canvas);

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
