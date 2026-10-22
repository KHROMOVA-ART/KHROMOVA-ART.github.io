// Рендер страниц кейсов: case.html?id=<id> — один кейс, projects.html?tag=<tag> — сетка с фильтром.
(() => {
  const cases = window.CASES || [];
  const tags = window.CASE_TAGS || {};
  const img = window.caseImage;
  const params = new URLSearchParams(location.search);

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  const caseUrl = (item) => `./case.html?id=${encodeURIComponent(item.id)}`;

  // --- карточка кейса (сетка проектов) ---
  const card = (item) => {
    const a = el("a", "project-card");
    a.href = caseUrl(item);
    const cover = el("img", "project-card__cover");
    cover.src = img(item, item.cover);
    cover.alt = "";
    cover.loading = "lazy";
    const title = el("span", "project-card__title", item.title);
    const meta = el("span", "project-card__tags", item.tags.map((t) => tags[t]).join(" • "));
    a.append(cover, title, meta);
    return a;
  };

  // --- страница проектов ---
  const grid = document.getElementById("grid");
  if (grid) {
    const filters = document.getElementById("filters");
    const used = Object.keys(tags).filter((t) => cases.some((c) => c.tags.includes(t)));
    let active = used.includes(params.get("tag")) ? params.get("tag") : "all";

    const render = () => {
      grid.replaceChildren(...cases.filter((c) => active === "all" || c.tags.includes(active)).map(card));
      filters.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b.dataset.tag === active));
    };

    for (const t of ["all", ...used]) {
      const b = el("button", "projects__filter", t === "all" ? "все" : tags[t]);
      b.type = "button";
      b.dataset.tag = t;
      b.addEventListener("click", () => {
        active = t;
        history.replaceState(null, "", t === "all" ? "./projects.html" : `./projects.html?tag=${t}`);
        render();
      });
      filters.append(b);
    }
    render();
    return;
  }

  // --- страница кейса ---
  const root = document.getElementById("case");
  const index = cases.findIndex((c) => c.id === params.get("id"));
  if (!root || index < 0) return;
  const item = cases[index];
  document.title = `${item.title} — Екатерина Хромова`;

  const head = el("header", "case__head");
  const labels = el("p", "case__labels", [item.discipline, item.stage].filter(Boolean).join(" • "));
  // слова через дефис не разрываем («ии-киностудии» целиком на одной строке)
  const title = el("h1", "case__title");
  item.title.split(/(\S+-\S+)/).forEach((part) => {
    if (part.includes("-")) title.append(el("span", "case__nowrap", part));
    else if (part) title.append(part);
  });
  const tagRow = el("div", "case__tags");
  for (const t of item.tags) {
    const a = el("a", "case__tag", tags[t]);
    a.href = `./projects.html?tag=${t}`;
    tagRow.append(a);
  }
  if (item.link) {
    const a = el("a", "case__tag case__link", `${item.link.label} ↗`);
    a.href = item.link.href;
    a.target = "_blank";
    a.rel = "noopener";
    tagRow.append(a);
  }
  head.append(labels, title, tagRow);

  const intro = el("div", "case__intro");
  for (const p of item.intro || []) intro.append(el("p", null, p));

  const gallery = el("div", "case__gallery");
  item.gallery.forEach((g, i) => {
    const fig = el("figure", "case__shot");
    const button = el("button", "case__shot-button");
    button.type = "button";
    button.setAttribute("aria-label", `Открыть: ${g.caption || "изображение"}`);
    const image = el("img");
    image.src = img(item, g.src);
    image.alt = g.caption || "";
    image.loading = i < 2 ? "eager" : "lazy";
    button.append(image);
    button.addEventListener("click", () => openLightbox(i));
    fig.append(button);
    if (g.caption) fig.append(el("figcaption", null, g.caption));
    gallery.append(fig);
  });

  const next = cases[(index + 1) % cases.length];
  const footer = el("footer", "case__footer");
  if (next && next !== item) {
    const a = el("a", "case__next");
    a.href = caseUrl(next);
    a.append(el("span", "case__next-label", "следующий проект"), el("span", "case__next-title", next.title));
    footer.append(a);
  }
  const all = el("a", "case__all", "все проекты →");
  all.href = "./projects.html";
  footer.append(all);

  root.replaceChildren(head, intro, gallery, footer);

  // --- просмотр картинок на весь экран ---
  const box = document.getElementById("lightbox");
  const boxImg = box.querySelector(".lightbox__img");
  const boxCaption = box.querySelector(".lightbox__caption");
  let current = 0;

  const show = (i) => {
    current = (i + item.gallery.length) % item.gallery.length;
    const g = item.gallery[current];
    boxImg.src = img(item, g.src);
    boxImg.alt = g.caption || "";
    boxCaption.textContent = g.caption || "";
  };
  function openLightbox(i) {
    show(i);
    box.classList.add("is-open");
    box.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  const close = () => {
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };
  box.querySelector(".lightbox__close").addEventListener("click", close);
  box.querySelector(".lightbox__arrow--prev").addEventListener("click", () => show(current - 1));
  box.querySelector(".lightbox__arrow--next").addEventListener("click", () => show(current + 1));
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  window.addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
})();
