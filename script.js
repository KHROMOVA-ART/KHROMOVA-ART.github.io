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

// окно раздела по клику на бабл (клик отличает от перетаскивания bubbles.js)
const sectionModal = document.getElementById("section-modal");
if (sectionModal) {
  const sectionTitle = document.getElementById("section-title");
  const sectionText = document.getElementById("section-text");
  window.openSectionModal = (bubble) => {
    sectionTitle.textContent = bubble.innerText.replace(/\s+/g, " ").trim();
    sectionText.textContent = bubble.dataset.sectionText || "";
    openModal(sectionModal);
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
