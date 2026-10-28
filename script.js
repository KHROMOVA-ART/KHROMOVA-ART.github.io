const loader = document.getElementById("loader");
const loaderPercent = document.getElementById("loader-percent");
const heroVideo = document.getElementById("hero-video");
const topbar = document.querySelector(".topbar");
const topbarMenuButton = document.getElementById("topbar-menu-button");
const journeyTrigger = document.getElementById("journey-trigger");
const journeyTriggerMobile = document.getElementById("journey-trigger-mobile");
const journeyModal = document.getElementById("journey-modal");
const journeyCloseItems = document.querySelectorAll("[data-journey-close]");

let displayProgress = 0;
let targetProgress = 0;
let rafId = 0;
let revealTriggered = false;
let loaderFallbackTimerId = 0;

const syncHeroMediaState = () => {
  if (!heroVideo) {
    return;
  }

  if (window.innerWidth <= 1120) {
    heroVideo.pause();
    return;
  }

  const playPromise = heroVideo.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
};

const renderProgress = () => {
  displayProgress += (targetProgress - displayProgress) * 0.08;

  if (targetProgress === 100 && 100 - displayProgress < 0.35) {
    displayProgress = 100;
  }

  if (loaderPercent) {
    loaderPercent.textContent = `${Math.round(displayProgress)}%`;
  }

  if (displayProgress < 99.9 || targetProgress < 100) {
    rafId = requestAnimationFrame(renderProgress);
    return;
  }

  if (!revealTriggered && loader) {
    revealTriggered = true;
    loader.classList.add("is-hidden");
    window.setTimeout(() => {
      loader.remove();
    }, 800);
  }
};

const setTargetProgress = (value) => {
  targetProgress = Math.max(targetProgress, Math.min(value, 100));
  if (!rafId) {
    rafId = requestAnimationFrame(renderProgress);
  }
};

const finalizeLoader = () => {
  if (loaderFallbackTimerId) {
    window.clearTimeout(loaderFallbackTimerId);
    loaderFallbackTimerId = 0;
  }

  setTargetProgress(100);
};

const armLoaderFallback = (delay = 2200) => {
  if (loaderFallbackTimerId) {
    window.clearTimeout(loaderFallbackTimerId);
  }

  loaderFallbackTimerId = window.setTimeout(() => {
    finalizeLoader();
  }, delay);
};

setTargetProgress(12);

if (document.readyState === "interactive" || document.readyState === "complete") {
  setTargetProgress(28);
} else {
  document.addEventListener("DOMContentLoaded", () => setTargetProgress(28), { once: true });
}

window.addEventListener("load", () => {
  setTargetProgress(60);
  if (heroVideo) {
    armLoaderFallback();
  }
});

if (heroVideo) {
  heroVideo.addEventListener("loadedmetadata", () => setTargetProgress(72), { once: true });
  heroVideo.addEventListener("loadeddata", () => setTargetProgress(80), { once: true });
  heroVideo.addEventListener("canplay", () => setTargetProgress(88), { once: true });
  heroVideo.addEventListener("playing", finalizeLoader, { once: true });
  heroVideo.addEventListener("canplaythrough", finalizeLoader, { once: true });
  heroVideo.addEventListener("error", finalizeLoader, { once: true });
  heroVideo.addEventListener("stalled", finalizeLoader, { once: true });
  heroVideo.addEventListener("suspend", finalizeLoader, { once: true });
  heroVideo.addEventListener("abort", finalizeLoader, { once: true });

  if (heroVideo.readyState >= 2) {
    setTargetProgress(72);
  }

  if (heroVideo.readyState >= 3) {
    setTargetProgress(88);
  }

  if (heroVideo.readyState >= 4) {
    finalizeLoader();
  }
} else if (document.getElementById("character-host")) {
  window.addEventListener("character:ready", finalizeLoader, { once: true });
  window.addEventListener("load", () => armLoaderFallback(8000), { once: true });
} else {
  window.addEventListener("load", () => {
    finalizeLoader();
  }, { once: true });
}

syncHeroMediaState();
window.addEventListener("resize", syncHeroMediaState);

// всё, что под мутным экраном, неактивно: шапка («кто я») не ловит нажатия, пока открыто окно
// или раскрыты разделы под кнопкой «проекты»; открытая панель «кто я» при этом закрывается
const syncCovered = () => {
  if (!topbar) return;
  const covered = !!document.querySelector(".journey-modal.is-open") || !!document.querySelector(".hero__canvas.is-sections");
  topbar.inert = covered;
  topbar.classList.toggle("is-covered", covered);
  if (covered && topbar.classList.contains("is-open")) {
    topbar.classList.remove("is-open");
    document.getElementById("topbar-menu-button")?.setAttribute("aria-expanded", "false");
  }
};

const openModal = (modal) => {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  syncCovered();
};

const closeModal = (modal) => {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  syncCovered();
};

// окно раздела закрывается своей анимацией (пузыри лопаются), остальные — сразу
const requestClose = (modal) => {
  if (modal.id === "section-modal" && window.popSectionModal) window.popSectionModal();
  else closeModal(modal);
};

for (const item of journeyCloseItems) {
  item.addEventListener("click", () => requestClose(item.closest(".journey-modal")));
}

window.addEventListener("keydown", (event) => {
  const openedModal = document.querySelector(".journey-modal.is-open");
  if (event.key === "Escape" && openedModal) {
    requestClose(openedModal);
  }
});

// путь героя: фото в пузыре медленно плавает по свободной полосе слева от резюме,
// на узком экране пузырь встаёт в начало резюме
const cvPhoto = document.getElementById("cv-photo");
const cvSlot = document.getElementById("cv-photo-slot");
const cvCard = journeyModal && journeyModal.querySelector(".cv");
let cvFrame = 0;
let cvStart = 0;

const cvWander = (now) => {
  if (!journeyModal.classList.contains("is-open")) {
    cvFrame = 0;
    return;
  }
  const d = cvPhoto.offsetWidth;
  const pad = 32;
  const zoneW = cvCard.getBoundingClientRect().left - pad * 2;
  const zoneH = window.innerHeight - pad * 2;
  const t = (now - cvStart) / 1000;
  // сумма медленных синусов — плавный путь без резких разворотов
  const nx = 0.62 * Math.sin(t * 0.23) + 0.38 * Math.sin(t * 0.41 + 1.3);
  const ny = 0.6 * Math.sin(t * 0.19 + 0.7) + 0.4 * Math.sin(t * 0.33 + 2.1);
  const x = pad + (zoneW - d) / 2 + (nx * Math.max(0, zoneW - d)) / 2;
  const y = pad + (zoneH - d) / 2 + (ny * Math.max(0, zoneH - d)) / 2;
  cvPhoto.style.transform = `translate(${x}px, ${y}px)`;
  cvFrame = requestAnimationFrame(cvWander);
};

const placeCvPhoto = () => {
  if (!cvPhoto || !cvSlot) return;
  const narrow = window.matchMedia("(max-width: 900px)").matches;
  if (narrow && cvPhoto.parentElement !== cvSlot) cvSlot.append(cvPhoto);
  if (!narrow && cvPhoto.parentElement === cvSlot) journeyModal.insertBefore(cvPhoto, cvCard);
  const glass = cvPhoto.querySelector(".orbit__glass");
  const d = cvPhoto.offsetWidth;
  glass.dataset.glassBezel = Math.round(d * 0.15);
  glass.dataset.glassScale = Math.round(d * 0.19);
  if (window.liquidGlass) window.liquidGlass(glass);
  if (!narrow && !cvFrame && journeyModal.classList.contains("is-open")) {
    cvStart = performance.now() - 4000;
    cvFrame = requestAnimationFrame(cvWander);
  }
};

const openJourney = () => {
  openModal(journeyModal);
  placeCvPhoto();
};

if (journeyTrigger && journeyModal) {
  journeyTrigger.addEventListener("click", openJourney);
  if (journeyTriggerMobile) {
    journeyTriggerMobile.addEventListener("click", openJourney);
  }
  window.addEventListener("resize", () => {
    if (journeyModal.classList.contains("is-open")) placeCvPhoto();
  });
}

// окно раздела по клику на бабл: из него выплывают круглые пузыри проектов с заставками,
// клик по пузырю ведёт на страницу кейса (клик отличает от перетаскивания bubbles.js)
const sectionModal = document.getElementById("section-modal");
if (sectionModal) {
  const title = document.getElementById("orbit-title");
  const stage = document.getElementById("orbit-stage");
  const related = document.getElementById("orbit-related");
  let current = null; // { items, origin } — чтобы переразложить пузыри при смене размера окна

  // раскладка: столько рядов, чтобы пузыри получились как можно крупнее и все влезли
  const layout = (n, w, h) => {
    const gap = 1.16;
    const cap = Math.min(340, Math.max(150, Math.min(w, h) * 0.46));
    let best = { rows: 1, d: 0 };
    for (let rows = 1; rows <= n; rows++) {
      const perRow = Math.ceil(n / rows);
      // запас по высоте на покачивание и разнобой рядов
      const d = Math.min(cap, w / (perRow * gap), h / (rows * gap + 0.15));
      // лишний ряд берём, только если пузыри от этого заметно крупнее
      if (d > best.d * 1.2) best = { rows, d };
    }
    const d = best.d;
    const perRow = Math.ceil(n / best.rows);
    const points = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - row * perRow);
      const col = i % perRow;
      // лёгкий разнобой по высоте, чтобы пузыри висели не по линейке
      const drift = (((i * 37) % 7) - 3) * d * 0.035;
      points.push({
        x: w / 2 + (col - (inRow - 1) / 2) * d * gap,
        y: h / 2 + (row - (best.rows - 1) / 2) * d * gap + drift,
      });
    }
    return { d, points };
  };

  const place = (animate) => {
    if (!current) return;
    const { items, origin } = current;
    const box = stage.getBoundingClientRect();
    const { d, points } = layout(items.length, box.width, box.height);
    [...stage.children].forEach((node, i) => {
      const p = points[i];
      node.style.width = node.style.height = `${d}px`;
      node.style.left = `${p.x - d / 2}px`;
      node.style.top = `${p.y - d / 2}px`;
      node.style.setProperty("--fx", `${origin.x - box.left - p.x}px`);
      node.style.setProperty("--fy", `${origin.y - box.top - p.y}px`);
      node.style.animationDelay = `${i * 90}ms`;
      // кромка линзы и сила преломления — от размера пузыря, чтобы на телефоне не было перебора
      const glass = node.querySelector(".orbit__glass");
      glass.dataset.glassBezel = Math.round(d * 0.15);
      glass.dataset.glassScale = Math.round(d * 0.19);
      if (!animate) node.style.animation = "none";
    });
  };

  window.openSectionModal = (bubble) => {
    const tag = bubble.dataset.section;
    // сначала кейсы, для которых это направление основное (первый тег), потом остальные
    const items = (window.CASES || [])
      .filter((c) => c.tags.includes(tag))
      .sort((a, b) => a.tags.indexOf(tag) - b.tags.indexOf(tag));
    title.textContent = bubble.innerText.replace(/\s+/g, " ").trim();
    // вайбкодинг тесно связан с архивом инструментов — даём перейти туда прямо отсюда
    related.hidden = tag !== "vibe";

    const r = bubble.getBoundingClientRect();
    current = { items, origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } };
    stage.classList.toggle("is-empty", !items.length);
    if (!items.length) {
      stage.replaceChildren(
        Object.assign(document.createElement("p"), {
          className: "orbit__empty",
          textContent: `скоро здесь появятся кейсы. ${bubble.dataset.sectionText || ""}`.trim(),
        }),
      );
      current = null;
    } else {
      stage.replaceChildren(
        ...items.map((item, i) => {
          const wrap = document.createElement("div");
          wrap.className = "orbit__item";
          // пузырь: заставка на весь круг, сверху стеклянная линза
          const a = document.createElement("a");
          a.className = "orbit__bubble";
          a.href = `./case.html?id=${encodeURIComponent(item.id)}`;
          a.setAttribute("aria-label", item.title);
          // лёгкая квадратная миниатюра (assets/thumbs, см. thumbs.sh); проявляется, когда загрузилась
          const img = document.createElement("img");
          img.alt = "";
          img.decoding = "async";
          img.addEventListener("load", () => a.classList.add("is-loaded"), { once: true });
          img.addEventListener("error", () => {
            img.src = window.caseImage(item, item.cover);
          }, { once: true });
          img.src = window.caseThumb(item);
          if (img.complete && img.naturalWidth) a.classList.add("is-loaded");
          const glass = document.createElement("span");
          glass.className = "orbit__glass";
          glass.dataset.glassRound = "";
          glass.dataset.glassId = `orbit-${i}`;
          a.append(img, glass);
          wrap.append(a);
          return wrap;
        }),
      );
    }
    openModal(sectionModal);
    place(true);
    // стеклянная линза (тяжёлый SVG-фильтр) включается, когда пузыри долетели, — иначе полёт дёргается
    clearTimeout(glassTimer);
    const settle = 1300 + Math.max(0, items.length - 1) * 90;
    glassTimer = setTimeout(() => {
      if (window.liquidGlass) stage.querySelectorAll(".orbit__glass").forEach((g) => window.liquidGlass(g));
    }, settle);
  };
  let glassTimer = 0;

  // миниатюры всех пузырей подгружаем заранее, когда страница уже ничем не занята
  const preloadThumbs = () => (window.CASES || []).forEach((item) => {
    new Image().src = window.caseThumb(item);
  });
  window.addEventListener("load", () => {
    if ("requestIdleCallback" in window) requestIdleCallback(preloadThumbs, { timeout: 4000 });
    else setTimeout(preloadThumbs, 2500);
  }, { once: true });

  window.addEventListener("resize", () => {
    if (sectionModal.classList.contains("is-open")) place(false);
  });

  // закрытие: пузыри по очереди лопаются, разбрызгивая капли, и только потом гаснет фон
  let popping = false;
  window.popSectionModal = () => {
    const bubbles = [...stage.querySelectorAll(".orbit__item")];
    if (popping) return;
    if (!bubbles.length || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      closeModal(sectionModal);
      return;
    }
    popping = true;
    const step = 70;
    // лопаются вразнобой, а не по порядку
    const order = bubbles.map((_, i) => i).sort(() => Math.random() - 0.5);
    order.forEach((index, k) => {
      const node = bubbles[index];
      node.style.setProperty("--pop-delay", `${k * step}ms`);
      for (let i = 0; i < 9; i++) {
        const drop = document.createElement("span");
        drop.className = "orbit__drop";
        const angle = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
        const reach = (node.offsetWidth / 2) * (1.05 + Math.random() * 0.45);
        drop.style.setProperty("--dx", `${Math.cos(angle) * reach}px`);
        drop.style.setProperty("--dy", `${Math.sin(angle) * reach}px`);
        drop.style.setProperty("--size", `${8 + Math.random() * 12}px`);
        node.append(drop);
      }
      node.classList.add("is-popping");
    });
    window.setTimeout(() => {
      closeModal(sectionModal);
      popping = false;
      window.setTimeout(() => {
        if (!sectionModal.classList.contains("is-open")) stage.replaceChildren();
      }, 300);
    }, bubbles.length * step + 420);
  };
}

if (topbar && topbarMenuButton) {
  const syncTopbarCompactState = () => {
    if (!topbar) {
      return;
    }

    if (window.innerWidth <= 1120) {
      topbar.classList.add("topbar--compact");
      return;
    }

    topbar.classList.remove("topbar--compact");
  };

  const closeTopbarMenu = () => {
    topbar.classList.remove("is-open");
    topbarMenuButton.setAttribute("aria-expanded", "false");
    const mobilePanel = document.getElementById("topbar-mobile-panel");
    if (mobilePanel) {
      mobilePanel.setAttribute("aria-hidden", "true");
    }
  };

  topbarMenuButton.addEventListener("click", () => {
    const isOpen = topbar.classList.toggle("is-open");
    topbarMenuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    const mobilePanel = document.getElementById("topbar-mobile-panel");
    if (mobilePanel) {
      mobilePanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }
  });

  // пункты навигации в панели «кто я» закрывают её
  document.querySelectorAll("#topbar-mobile-panel .topbar__mobile-nav a, #topbar-mobile-panel .topbar__mobile-nav button").forEach((item) => {
    item.addEventListener("click", closeTopbarMenu);
  });

  syncTopbarCompactState();

  window.addEventListener("resize", () => {
    syncTopbarCompactState();

    if (!topbar.classList.contains("topbar--compact")) {
      closeTopbarMenu();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && topbar.classList.contains("is-open")) {
      closeTopbarMenu();
    }
  });

  window.addEventListener("load", syncTopbarCompactState, { once: true });
}


// мобильная главная: разделы спрятаны в кнопку «проекты» — по нажатию фон плавно мутнеет,
// пузыри разделов вылетают из кнопки двумя колонками «ёлочкой»; тап по фону прячет их обратно
(() => {
  const canvas = document.querySelector(".hero__canvas");
  const toggle = document.getElementById("hero-projects");
  const veil = document.getElementById("hero-sections-veil");
  if (!canvas || !toggle || !veil) return;
  const mobile = window.matchMedia("(max-width: 1120px)");
  const bubbles = [...canvas.querySelectorAll(".hero__bubble")];

  const layout = () => {
    const w = canvas.clientWidth;
    const top = toggle.offsetTop + toggle.offsetHeight;
    const ox = w / 2;
    const oy = toggle.offsetTop + toggle.offsetHeight / 2;
    const step = Math.min(78, Math.max(64, (window.innerHeight - top - 120) / 6));
    const half = Math.min(84, w / 4 - 6);
    bubbles.forEach((b, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      // лёгкий разброс, чтобы колонки не выглядели таблицей
      const jitter = ((i * 37) % 17) - 8;
      const tx = ox + (col ? half : -half) + jitter;
      const ty = top + 70 + row * step + (col ? step / 2 : 0);
      b.style.setProperty("--tx", `${tx}px`);
      b.style.setProperty("--ty", `${ty}px`);
      // сдвиг до кнопки: из этой точки пузырь вылетает и туда же прячется
      b.style.setProperty("--dx", `${ox - tx}px`);
      b.style.setProperty("--dy", `${oy - ty}px`);
      b.style.setProperty("--in", `${i * 45}ms`);
      b.style.setProperty("--out", `${(bubbles.length - 1 - i) * 25}ms`);
    });
  };

  let movingTimer = 0;
  const setOpen = (open) => {
    if (open) layout();
    // пока пузыри летят — без тяжёлой стеклянной линзы
    canvas.classList.add("is-moving");
    clearTimeout(movingTimer);
    movingTimer = setTimeout(() => canvas.classList.remove("is-moving"), open ? 820 + bubbles.length * 45 + 60 : 800);
    canvas.classList.toggle("is-sections", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    syncCovered();
  };

  toggle.addEventListener("click", () => setOpen(!canvas.classList.contains("is-sections")));
  veil.addEventListener("click", () => setOpen(false));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.querySelector(".journey-modal.is-open")) setOpen(false);
  });
  window.addEventListener("resize", () => {
    if (!mobile.matches) setOpen(false);
    else layout();
  });
  layout();
})();
