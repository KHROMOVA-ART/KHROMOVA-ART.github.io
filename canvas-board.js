// Канвас Obsidian на сайте: карточки, картинки, группы и связи из canvas.json (см. canvas-export.py).
// Двигать — мышью или пальцем, масштаб — колесом, щипком, двойным кликом или кнопками.
(() => {
  // цвета Obsidian «1»…«6» в светлой теме
  const PALETTE = { 1: "#e93147", 2: "#ec7500", 3: "#e0ac00", 4: "#08b94e", 5: "#00bfbc", 6: "#7852ee" };
  const colorOf = (c) => (c ? PALETTE[c] || c : null);

  const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // небольшой Markdown: заголовки, списки, цитаты, жирный, курсив, выделение, ссылки
  const inline = (s) =>
    escape(s)
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
      .replace(/==([^=]+)==/g, "<mark>$1</mark>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  const markdown = (text) => {
    const out = [];
    let list = null;
    const closeList = () => {
      if (list) out.push(`</${list}>`);
      list = null;
    };
    for (const raw of text.split("\n")) {
      const line = raw.replace(/\s+$/, "");
      let m;
      if (!line.trim()) {
        closeList();
      } else if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
        closeList();
        out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`);
      } else if ((m = line.match(/^\s*[-*+]\s+(?:\[[ x]\]\s+)?(.*)$/))) {
        if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
        out.push(`<li>${inline(m[1])}</li>`);
      } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
        if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
        out.push(`<li>${inline(m[1])}</li>`);
      } else if ((m = line.match(/^>\s?(.*)$/))) {
        closeList();
        out.push(`<blockquote>${inline(m[1])}</blockquote>`);
      } else if (/^-{3,}$/.test(line.trim())) {
        closeList();
        out.push("<hr>");
      } else {
        closeList();
        out.push(`<p>${inline(line)}</p>`);
      }
    }
    closeList();
    return out.join("");
  };

  // точка на стороне карточки и направление, куда из неё выходит связь
  const anchor = (n, side) => {
    switch (side) {
      case "top": return { x: n.x + n.width / 2, y: n.y, dx: 0, dy: -1 };
      case "bottom": return { x: n.x + n.width / 2, y: n.y + n.height, dx: 0, dy: 1 };
      case "left": return { x: n.x, y: n.y + n.height / 2, dx: -1, dy: 0 };
      default: return { x: n.x + n.width, y: n.y + n.height / 2, dx: 1, dy: 0 };
    }
  };

  const SVG = "http://www.w3.org/2000/svg";

  window.CanvasBoard = async (container, url) => {
    const base = url.slice(0, url.lastIndexOf("/") + 1);
    // без кеша: после перевыгрузки канваса имена картинок меняются
    const data = await fetch(url, { cache: "no-cache" }).then((r) => r.json());
    const byId = new Map(data.nodes.map((n) => [n.id, n]));

    container.replaceChildren();
    container.classList.add("canvas-board");
    const world = document.createElement("div");
    world.className = "canvas-board__world";
    container.append(world);

    // группы — под всем остальным
    for (const n of data.nodes.filter((n) => n.type === "group")) {
      const g = document.createElement("div");
      g.className = "canvas-board__group";
      Object.assign(g.style, { left: `${n.x}px`, top: `${n.y}px`, width: `${n.width}px`, height: `${n.height}px` });
      const c = colorOf(n.color);
      if (c) g.style.setProperty("--c", c);
      if (n.label) {
        const label = document.createElement("span");
        label.className = "canvas-board__group-label";
        label.textContent = n.label;
        g.append(label);
      }
      world.append(g);
    }

    // связи
    const svg = document.createElementNS(SVG, "svg");
    svg.classList.add("canvas-board__edges");
    svg.innerHTML = `<defs><marker id="cb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="context-stroke"/></marker></defs>`;
    for (const e of data.edges) {
      const a = byId.get(e.fromNode);
      const b = byId.get(e.toNode);
      if (!a || !b) continue;
      const p = anchor(a, e.fromSide);
      const q = anchor(b, e.toSide);
      const k = Math.min(Math.max(Math.hypot(q.x - p.x, q.y - p.y) * 0.4, 40), 300);
      const path = document.createElementNS(SVG, "path");
      path.setAttribute("d", `M${p.x} ${p.y} C${p.x + p.dx * k} ${p.y + p.dy * k} ${q.x + q.dx * k} ${q.y + q.dy * k} ${q.x} ${q.y}`);
      const c = colorOf(e.color);
      if (c) path.style.stroke = c;
      if ((e.toEnd || "arrow") === "arrow") path.setAttribute("marker-end", "url(#cb-arrow)");
      if (e.fromEnd === "arrow") path.setAttribute("marker-start", "url(#cb-arrow)");
      svg.append(path);
      if (e.label) {
        const t = document.createElementNS(SVG, "text");
        t.setAttribute("x", (p.x + q.x) / 2);
        t.setAttribute("y", (p.y + q.y) / 2);
        t.textContent = e.label;
        svg.append(t);
      }
    }
    world.append(svg);

    // карточки
    for (const n of data.nodes.filter((n) => n.type !== "group")) {
      const card = document.createElement(n.type === "link" ? "a" : "div");
      card.className = `canvas-board__node canvas-board__node--${n.type}`;
      Object.assign(card.style, { left: `${n.x}px`, top: `${n.y}px`, width: `${n.width}px`, height: `${n.height}px` });
      const c = colorOf(n.color);
      if (c) {
        card.style.setProperty("--c", c);
        card.classList.add("has-color");
      }
      if (n.type === "text") {
        card.innerHTML = markdown(n.text || "");
      } else if (n.type === "file") {
        const img = document.createElement("img");
        img.src = base + n.src;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.draggable = false;
        card.append(img);
      } else if (n.type === "link") {
        card.href = n.url;
        card.target = "_blank";
        card.rel = "noopener";
        let host = n.url;
        try { host = new URL(n.url).hostname.replace(/^www\./, ""); } catch {}
        card.innerHTML = `<span class="canvas-board__link-host">${escape(host)} ↗</span><span class="canvas-board__link-url">${escape(n.url)}</span>`;
      }
      world.append(card);
    }

    // --- камера ---
    const xs = data.nodes.map((n) => n.x);
    const ys = data.nodes.map((n) => n.y);
    const bounds = {
      x0: Math.min(...xs),
      y0: Math.min(...ys),
      x1: Math.max(...data.nodes.map((n) => n.x + n.width)),
      y1: Math.max(...data.nodes.map((n) => n.y + n.height)),
    };
    let view = { x: 0, y: 0, s: 1 };
    let settleTimer = 0;

    const apply = (animate) => {
      world.classList.toggle("is-animating", !!animate);
      // во время движения слой на видеокарте (плавно), после остановки — перерисовка в чёткость
      world.style.willChange = "transform";
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => (world.style.willChange = "auto"), animate ? 650 : 180);
      world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
      // точечная сетка едет вместе с канвасом; шаг удваивается, чтобы точки не сливались при отдалении
      let step = 24 * view.s;
      while (step < 16) step *= 2;
      container.style.backgroundSize = `${step}px ${step}px`;
      container.style.backgroundPosition = `${view.x}px ${view.y}px`;
    };

    const minScale = () => {
      const r = container.getBoundingClientRect();
      return Math.min(r.width / (bounds.x1 - bounds.x0), r.height / (bounds.y1 - bounds.y0)) * 0.5;
    };
    const clampScale = (s) => Math.min(Math.max(s, minScale()), 4);

    const home = (animate = true) => {
      const r = container.getBoundingClientRect();
      const pad = 48;
      const s = Math.min((r.width - pad * 2) / (bounds.x1 - bounds.x0), (r.height - pad * 2) / (bounds.y1 - bounds.y0));
      view = {
        s,
        x: (r.width - (bounds.x1 - bounds.x0) * s) / 2 - bounds.x0 * s,
        y: (r.height - (bounds.y1 - bounds.y0) * s) / 2 - bounds.y0 * s,
      };
      apply(animate);
    };

    // масштаб вокруг точки экрана (px, py)
    const zoomAt = (factor, px, py, animate) => {
      const s = clampScale(view.s * factor);
      const k = s / view.s;
      view = { s, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
      apply(animate);
    };
    const zoomBy = (factor) => {
      const r = container.getBoundingClientRect();
      zoomAt(factor, r.width / 2, r.height / 2, true);
    };

    const local = (e) => {
      const r = container.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onWheel = (e) => {
      e.preventDefault();
      const p = local(e);
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y, false);
    };

    // перетаскивание и щипок
    const pointers = new Map();
    let last = null;
    let moved = 0;
    const onDown = (e) => {
      container.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, local(e));
      last = null;
      moved = 0;
    };
    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, local(e));
      const pts = [...pointers.values()];
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
      if (last && last.n === pts.length) {
        view.x += cx - last.cx;
        view.y += cy - last.cy;
        moved += Math.abs(cx - last.cx) + Math.abs(cy - last.cy);
        if (dist && last.dist) zoomAt(dist / last.dist, cx, cy, false);
        else apply(false);
      }
      last = { cx, cy, dist, n: pts.length };
    };
    const onUp = (e) => {
      pointers.delete(e.pointerId);
      last = null;
    };
    // ссылки в карточках не срабатывают, если доску тащили
    const onClick = (e) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onDouble = (e) => {
      const p = local(e);
      zoomAt(2, p.x, p.y, true);
    };
    // при смене размера окна доска снова целиком помещается на экран
    const ro = new ResizeObserver(() => home(false));

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("pointerdown", onDown);
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerup", onUp);
    container.addEventListener("pointercancel", onUp);
    container.addEventListener("click", onClick, true);
    container.addEventListener("dblclick", onDouble);
    ro.observe(container);
    home(false);

    return {
      zoomBy,
      home: () => home(true),
      destroy() {
        container.removeEventListener("wheel", onWheel);
        container.removeEventListener("pointerdown", onDown);
        container.removeEventListener("pointermove", onMove);
        container.removeEventListener("pointerup", onUp);
        container.removeEventListener("pointercancel", onUp);
        container.removeEventListener("click", onClick, true);
        container.removeEventListener("dblclick", onDouble);
        ro.disconnect();
        container.classList.remove("canvas-board");
        container.replaceChildren();
      },
    };
  };
})();
