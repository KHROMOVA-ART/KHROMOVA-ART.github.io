// Liquid Glass для баблов и шара загрузки: линза по краю (SVG displacement) + лёгкая хроматическая аберрация.
// Работает в Chromium (backdrop-filter: url()); в Safari/Firefox остаётся CSS-стекло из styles.css.
// Настройки элемента: data-glass-round — круглая линза, data-glass-bezel — ширина кромки, data-glass-scale — сила преломления.
(() => {
  const bubbles = [...document.querySelectorAll(".hero__bubble, [data-glass-lens]")];

  const probe = document.createElement("div");
  probe.style.backdropFilter = "url(#x)";
  const isChromium = !!window.chrome && probe.style.backdropFilter !== "";
  if (!isChromium) return;

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  document.body.appendChild(svg);

  // карта смещения: у края картинка берётся глубже изнутри и растягивается к кромке, как в толстой линзе
  // (снаружи бабла backdrop пустой, поэтому смещаем только внутрь)
  const buildMap = (w, h, r, bezel) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(w, h);
    const hw = w / 2;
    const hh = h / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x + 0.5 - hw;
        const py = y + 0.5 - hh;
        // SDF скруглённого прямоугольника
        const qx = Math.abs(px) - (hw - r);
        const qy = Math.abs(py) - (hh - r);
        const ox = Math.max(qx, 0);
        const oy = Math.max(qy, 0);
        const dist = -(Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r);
        // нормаль к краю
        let nx;
        let ny;
        if (qx > 0 && qy > 0) {
          const l = Math.hypot(ox, oy) || 1;
          nx = (ox / l) * Math.sign(px);
          ny = (oy / l) * Math.sign(py);
        } else if (qx > qy) {
          nx = Math.sign(px);
          ny = 0;
        } else {
          nx = 0;
          ny = Math.sign(py);
        }
        const t = Math.min(Math.max(dist / bezel, 0), 1);
        // профиль выпуклой кромки: сильнее всего у самого края
        const k = Math.pow(1 - t, 2.2);
        const i = (y * w + x) * 4;
        img.data[i] = 128 - nx * k * 127;
        img.data[i + 1] = 128 - ny * k * 127;
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  };

  const channel = (id, scale, matrix, input) => `
    <feDisplacementMap in="${input}" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d${id}"/>
    <feColorMatrix in="d${id}" type="matrix" values="${matrix}" result="c${id}"/>`;

  const render = (bubble, index) => {
    const w = Math.round(bubble.offsetWidth);
    const h = Math.round(bubble.offsetHeight);
    if (!w || !h) return;
    const key = `${w}x${h}`;
    if (bubble.dataset.glass === key) return;
    bubble.dataset.glass = key;

    const { glassRound, glassBezel, glassScale } = bubble.dataset;
    const r = glassRound !== undefined
      ? Math.min(w, h) / 2
      : Math.min(parseFloat(getComputedStyle(bubble).borderTopLeftRadius) || h / 2, h / 2);
    const bezel = glassBezel ? Number(glassBezel) : Math.min(h * 0.42, 22);
    const map = buildMap(w, h, r, bezel);
    // у пузырей, которые появляются и исчезают (окно раздела), постоянный id — фильтры не копятся
    const id = bubble.dataset.glassId ? `liquid-glass-${bubble.dataset.glassId}` : `liquid-glass-${index}`;
    const S = glassScale ? Number(glassScale) : 34;

    let filter = svg.querySelector(`#${id}`);
    if (!filter) {
      filter = document.createElementNS(NS, "filter");
      filter.id = id;
      svg.appendChild(filter);
    }
    filter.setAttribute("x", "0");
    filter.setAttribute("y", "0");
    filter.setAttribute("width", w);
    filter.setAttribute("height", h);
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("primitiveUnits", "userSpaceOnUse");
    filter.setAttribute("color-interpolation-filters", "sRGB");
    filter.innerHTML = `
      <feImage href="${map}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="src"/>
      ${channel("r", S * 1.12, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", "src")}
      ${channel("g", S, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", "src")}
      ${channel("b", S * 0.88, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", "src")}
      <feBlend in="cr" in2="cg" mode="screen" result="rg"/>
      <feBlend in="rg" in2="cb" mode="screen"/>`;

    bubble.style.backdropFilter = `url(#${id}) saturate(1.6) brightness(1.05)`;
    bubble.style.webkitBackdropFilter = bubble.style.backdropFilter;
    bubble.classList.add("is-liquid");
  };

  const renderAll = () => bubbles.forEach(render);
  const ro = new ResizeObserver((entries) => entries.forEach((e) => render(e.target, bubbles.indexOf(e.target))));
  bubbles.forEach((b) => ro.observe(b));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderAll);
  renderAll();

  // линза для элементов, добавленных позже
  window.liquidGlass = (el) => {
    // убираем пузыри, которых уже нет на странице (первые — постоянные баблы — всегда на месте)
    for (let i = bubbles.length - 1; i >= 0; i--) {
      if (!bubbles[i].isConnected) {
        ro.unobserve(bubbles[i]);
        bubbles.splice(i, 1);
      }
    }
    bubbles.push(el);
    ro.observe(el);
    render(el, bubbles.length - 1);
  };
})();
