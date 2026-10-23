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

  // структура рассказа: шапка → обложка → разделы (основное, исследование, процесс, результат) → ещё кейсы
  const head = el("header", "case__head");
  const labels = el("p", "case__labels", [item.discipline, item.stage].filter(Boolean).join(" • "));
  // слова через дефис не разрываем («ии-киностудии» целиком на одной строке)
  const title = el("h1", "case__title");
  item.title.split(/(\S+-\S+)/).forEach((part) => {
    if (part.includes("-")) title.append(el("span", "case__nowrap", part));
    else if (part) title.append(part);
  });
  head.append(labels, title);
  if (item.subtitle) head.append(el("p", "case__subtitle", item.subtitle));
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
  head.append(tagRow);

  // картинка по имени файла → кнопка, открывающая её в просмотрщике
  const shownImages = new Set();
  const shot = (src, eager) => {
    const i = item.gallery.findIndex((g) => g.src === src);
    if (i < 0) return null;
    shownImages.add(src);
    const g = item.gallery[i];
    const fig = el("figure", "case__shot");
    const button = el("button", "case__shot-button");
    button.type = "button";
    button.setAttribute("aria-label", `Открыть: ${g.caption || "изображение"}`);
    const image = el("img");
    image.src = img(item, g.src);
    image.alt = g.caption || "";
    image.loading = eager ? "eager" : "lazy";
    button.append(image);
    button.addEventListener("click", () => openLightbox(i));
    fig.append(button);
    if (g.caption) fig.append(el("figcaption", null, g.caption));
    return fig;
  };
  const shots = (list, cls = "case__gallery") => {
    const grid = el("div", cls);
    for (const src of list) {
      const f = shot(src);
      if (f) grid.append(f);
    }
    return grid;
  };

  const cover = el("div", "case__cover");
  const coverShot = shot(item.cover, true);
  if (coverShot) cover.append(coverShot);

  const body = [];
  if (item.sections) {
    for (const section of item.sections) {
      const block = el("section", "case-section");
      block.append(el("h2", "case-section__title", section.title));
      const content = el("div", "case-section__body");
      for (const part of section.items || []) {
        const unit = el("div", "case-section__item");
        if (part.heading) unit.append(el("h3", "case-section__heading", part.heading));
        for (const p of [].concat(part.text || [])) unit.append(el("p", "case-section__text", p));
        if (part.list) {
          const ul = el("ul", "case-section__list");
          for (const li of part.list) ul.append(el("li", null, li));
          unit.append(ul);
        }
        content.append(unit);
        if (part.images) content.append(shots(part.images));
      }
      block.append(content);
      if (section.images) block.append(shots(section.images, "case__gallery case-section__wide"));
      body.push(block);
    }
  } else {
    const intro = el("div", "case__intro");
    for (const p of item.intro || []) intro.append(el("p", null, p));
    body.push(intro);
  }

  // всё, что не попало в разделы, — отдельной галереей в конце
  const rest = item.gallery.map((g) => g.src).filter((src) => !shownImages.has(src));
  if (rest.length) {
    if (item.sections) {
      const block = el("section", "case-section");
      block.append(el("h2", "case-section__title", "галерея"));
      block.append(shots(rest, "case__gallery case-section__wide"));
      body.push(block);
    } else {
      body.push(shots(rest));
    }
  }

  // ещё кейсы: до трёх следующих по списку
  const footer = el("footer", "case__footer");
  const others = [1, 2, 3].map((k) => cases[(index + k) % cases.length]).filter((c, k, arr) => c !== item && arr.indexOf(c) === k);
  const moreHead = el("div", "case__more-head");
  moreHead.append(el("h2", "case-section__title", "ещё кейсы"));
  const all = el("a", "case__all", "все проекты →");
  all.href = "./projects.html";
  moreHead.append(all);
  footer.append(moreHead);
  if (others.length) {
    const grid = el("div", "projects__grid case__more");
    for (const c of others) grid.append(card(c));
    footer.append(grid);
  }

  root.replaceChildren(head, cover, ...body, footer);

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
