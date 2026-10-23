const loader = document.getElementById("loader");
const loaderPercent = document.getElementById("loader-percent");
const heroVideo = document.getElementById("hero-video");
const topbar = document.querySelector(".topbar");
const topbarMenuButton = document.getElementById("topbar-menu-button");
const heroFooter = document.querySelector(".hero__footer");
const heroFooterMenuButton = document.getElementById("hero-footer-menu-button");
const heroFooterMobilePanel = document.getElementById("hero-footer-mobile-panel");
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

const openModal = (modal) => {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeModal = (modal) => {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

for (const item of journeyCloseItems) {
  item.addEventListener("click", () => closeModal(item.closest(".journey-modal")));
}

window.addEventListener("keydown", (event) => {
  const openedModal = document.querySelector(".journey-modal.is-open");
  if (event.key === "Escape" && openedModal) {
    closeModal(openedModal);
  }
});

if (journeyTrigger && journeyModal) {
  journeyTrigger.addEventListener("click", () => openModal(journeyModal));
  if (journeyTriggerMobile) {
    journeyTriggerMobile.addEventListener("click", () => openModal(journeyModal));
  }
}

// окно раздела по клику на бабл: витрина кейса — заголовок, картинки, пара строк и «подробнее»
// (клик отличает от перетаскивания bubbles.js)
const sectionModal = document.getElementById("section-modal");
if (sectionModal) {
  const sectionLabel = document.getElementById("showcase-section");
  const switcher = document.getElementById("showcase-switch");
  const title = document.getElementById("showcase-title");
  const gallery = document.getElementById("showcase-gallery");
  const text = document.getElementById("showcase-text");
  const more = document.getElementById("showcase-more");

  const showCase = (items, i, emptyText) => {
    const item = items[i];
    switcher.querySelectorAll("button").forEach((b, n) => b.classList.toggle("is-active", n === i));
    if (!item) {
      title.textContent = "скоро здесь появятся кейсы";
      gallery.replaceChildren();
      text.textContent = emptyText || "";
      more.hidden = true;
      return;
    }
    // слова через дефис не разрываем («ии-киностудии» целиком)
    title.replaceChildren(
      ...item.title.split(/(\S+-\S+)/).filter(Boolean).map((part) => {
        if (!part.includes("-")) return part;
        const span = document.createElement("span");
        span.style.whiteSpace = "nowrap";
        span.textContent = part;
        return span;
      }),
    );
    // витрина: обложка крупно + до четырёх картинок из галереи
    const shots = [item.cover, ...item.gallery.map((g) => g.src).filter((src) => src !== item.cover)].slice(0, 5);
    gallery.replaceChildren(
      ...shots.map((src, n) => {
        const img = document.createElement("img");
        img.src = window.caseImage(item, src);
        img.alt = n === 0 ? item.title : "";
        img.className = n === 0 ? "showcase__cover" : "showcase__thumb";
        return img;
      }),
    );
    text.textContent = (item.intro && item.intro[0]) || "";
    more.hidden = false;
    more.href = `./case.html?id=${encodeURIComponent(item.id)}`;
  };

  window.openSectionModal = (bubble) => {
    const tag = bubble.dataset.section;
    // сначала кейсы, для которых это направление основное (первый тег), потом остальные
    const items = (window.CASES || [])
      .filter((c) => c.tags.includes(tag))
      .sort((a, b) => a.tags.indexOf(tag) - b.tags.indexOf(tag));
    sectionLabel.textContent = bubble.innerText.replace(/\s+/g, " ").trim();
    switcher.replaceChildren(
      ...(items.length > 1
        ? items.map((item, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "showcase__switch-item";
            b.textContent = item.title;
            b.addEventListener("click", () => showCase(items, i));
            return b;
          })
        : []),
    );
    currentItems = items;
    lockTextHeights();
    showCase(items, 0, bubble.dataset.sectionText);
    openModal(sectionModal);
  };

  // заголовок и описание занимают столько места, сколько у самого длинного кейса раздела,
  // поэтому при переключении кейсов окно не меняет размер
  let currentItems = [];
  const lockTextHeights = () => {
    title.style.minHeight = text.style.minHeight = "";
    let titleH = 0;
    let textH = 0;
    currentItems.forEach((item, i) => {
      showCase(currentItems, i);
      titleH = Math.max(titleH, title.offsetHeight);
      textH = Math.max(textH, text.offsetHeight);
    });
    if (titleH) title.style.minHeight = `${titleH}px`;
    if (textH) text.style.minHeight = `${textH}px`;
  };
  window.addEventListener("resize", () => {
    if (!sectionModal.classList.contains("is-open") || currentItems.length < 2) return;
    const active = [...switcher.children].findIndex((b) => b.classList.contains("is-active"));
    lockTextHeights();
    showCase(currentItems, Math.max(active, 0));
  });
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

if (heroFooter && heroFooterMenuButton && heroFooterMobilePanel) {
  const closeHeroFooterMenu = () => {
    heroFooter.classList.remove("is-open");
    heroFooterMenuButton.setAttribute("aria-expanded", "false");
    heroFooterMobilePanel.setAttribute("aria-hidden", "true");
  };

  heroFooterMenuButton.addEventListener("click", () => {
    const isOpen = heroFooter.classList.toggle("is-open");
    heroFooterMenuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    heroFooterMobilePanel.setAttribute("aria-hidden", isOpen ? "false" : "true");
  });

  heroFooterMobilePanel.querySelectorAll("a, button").forEach((item) => {
    item.addEventListener("click", () => {
      closeHeroFooterMenu();
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1120) {
      closeHeroFooterMenu();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && heroFooter.classList.contains("is-open")) {
      closeHeroFooterMenu();
    }
  });
}
