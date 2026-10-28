"use strict";

document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#main-nav");
const navigationLinks = [...navigation.querySelectorAll('a[href^="#"]')];
const mobileLayout = window.matchMedia("(max-width: 760px)");

function closeMenu(restoreFocus = false) {
  menuButton.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
  if (restoreFocus) menuButton.focus();
}

menuButton.hidden = false;
menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  navigation.classList.toggle("is-open", !isOpen);
});

navigationLinks.forEach((link) => {
  link.addEventListener("click", () => {
    closeMenu();
    // Move o foco para o conteúdo para manter a navegação por teclado previsível.
    const section = document.querySelector(link.hash);
    section.setAttribute("tabindex", "-1");
    section.focus({ preventScroll: true });
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    closeMenu(true);
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
});

function syncMenu() {
  menuButton.hidden = !mobileLayout.matches;
  closeMenu();
}

mobileLayout.addEventListener("change", syncMenu);
syncMenu();

// A seção sob o cabeçalho determina o destaque da navegação.
let updateScheduled = false;
const sections = [...document.querySelectorAll("main section[id]")];

function updateCurrentSection() {
  const marker = document.querySelector(".site-header").offsetHeight + 130;
  let activeId = "home";
  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= marker) activeId = section.id;
  });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
    activeId = "contato";
  }
  navigationLinks.forEach((link) => {
    if (link.hash === `#${activeId}`) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  updateScheduled = false;
}

function scheduleSectionUpdate() {
  if (updateScheduled) return;
  updateScheduled = true;
  window.requestAnimationFrame(updateCurrentSection);
}

window.addEventListener("scroll", scheduleSectionUpdate, { passive: true });
window.addEventListener("resize", scheduleSectionUpdate);
updateCurrentSection();

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

function initParticles() {
  const canvas = document.querySelector("#background-particles");
  const context = canvas.getContext("2d");
  if (!context) return;

  let particles = [];
  let width = 0;
  let height = 0;
  let frame = null;
  let resizeFrame = null;
  let lastTime = 0;
  const frameInterval = 1000 / 30;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const limit = mobileLayout.matches ? 12 : 36;
    const count = Math.min(limit, Math.max(6, Math.round(width * height / 34000)));
    particles = Array.from({ length: count }, () => {
      const depth = .3 + Math.random() * .7;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: .45 + depth * .85,
        opacity: .12 + depth * .2,
        vx: (Math.random() - .5) * 5 * depth,
        vy: -(2 + Math.random() * 5) * depth,
        phase: Math.random() * Math.PI * 2,
        depth,
      };
    });
    resizeFrame = null;
  }

  function draw(time) {
    frame = window.requestAnimationFrame(draw);
    const elapsed = time - lastTime;
    if (elapsed < frameInterval) return;
    const delta = Math.min(elapsed / 1000, .08);
    lastTime = time - (elapsed % frameInterval);
    context.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.x += (particle.vx + Math.sin(time / 6000 + particle.phase) * particle.depth * 2) * delta;
      particle.y += particle.vy * delta;
      if (particle.x < -3) particle.x = width + 3;
      if (particle.x > width + 3) particle.x = -3;
      if (particle.y < -3) particle.y = height + 3;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(177, 239, 122, ${particle.opacity})`;
      context.fill();
    });
  }

  function syncParticles() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
    frame = null;
    resizeFrame = null;
    if (document.hidden || reducedMotion.matches) {
      if (reducedMotion.matches) context.clearRect(0, 0, width, height);
      return;
    }
    resize();
    lastTime = performance.now();
    frame = window.requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => {
    if (resizeFrame !== null || document.hidden || reducedMotion.matches) return;
    resizeFrame = window.requestAnimationFrame(resize);
  }, { passive: true });
  document.addEventListener("visibilitychange", syncParticles);
  reducedMotion.addEventListener("change", syncParticles);
  syncParticles();
}

function initCardLighting() {
  const cards = document.querySelectorAll(".project-card, .writeup-item");
  let activeCard = null;
  let frame = null;
  let pointerX = 0;
  let pointerY = 0;

  function reset() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    if (activeCard) activeCard.classList.remove("is-glowing");
    activeCard = null;
  }

  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType === "touch") return;
      if (activeCard !== card) {
        reset();
        activeCard = card;
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--glow-x", `${pointerX - bounds.left}px`);
        card.style.setProperty("--glow-y", `${pointerY - bounds.top}px`);
        card.classList.add("is-glowing");
        frame = null;
      });
    }, { passive: true });
    card.addEventListener("pointerleave", reset);
    card.addEventListener("pointercancel", reset);
  });
  window.addEventListener("blur", reset);
  window.addEventListener("scroll", reset, { passive: true });
  document.addEventListener("visibilitychange", reset);
  finePointer.addEventListener("change", reset);
  reducedMotion.addEventListener("change", reset);
}

function initEntranceAnimations() {
  if (!("IntersectionObserver" in window)) return;
  const targets = [...new Set(document.querySelectorAll(
    ".hero-copy, .profile-panel, .section-heading, .about-content, .contact > div, .skill-card, .project-card, .writeup-item"
  ))];
  const revealed = new WeakSet();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) reveal(entry.target);
    });
  }, { threshold: .08, rootMargin: "0px 0px -24px 0px" });

  function reveal(target) {
    target.classList.remove("reveal-pending");
    revealed.add(target);
    observer.unobserve(target);
  }

  function syncEntranceAnimations() {
    if (reducedMotion.matches) {
      targets.forEach(reveal);
      return;
    }
    targets.forEach((target) => {
      if (revealed.has(target)) return;
      // Conteúdo já visível não é ocultado durante a inicialização.
      if (target.getBoundingClientRect().top < window.innerHeight) {
        reveal(target);
        return;
      }
      const siblings = [...target.parentElement.children].filter((element) =>
        element.matches(".skill-card, .project-card, .writeup-item")
      );
      const delay = Math.min(Math.max(siblings.indexOf(target), 0), 3) * 65;
      target.style.setProperty("--reveal-delay", `${delay}ms`);
      target.classList.add("reveal-target", "reveal-pending");
      observer.observe(target);
    });
  }

  // Foco e âncoras revelam o conteúdo imediatamente, inclusive antes do observer.
  document.addEventListener("focusin", (event) => {
    targets.forEach((target) => {
      if (target.contains(event.target) || event.target.contains(target)) reveal(target);
    });
  });
  syncEntranceAnimations();
  reducedMotion.addEventListener("change", syncEntranceAnimations);
}

initParticles();
initCardLighting();
initEntranceAnimations();

function initHeroClue() {
  const hero = document.querySelector("#home");
  if (!hero || !("IntersectionObserver" in window)) return;
  const clue = document.createElement("span");
  clue.className = "hero-secret-clue";
  clue.textContent = "secret.txt";
  clue.setAttribute("aria-hidden", "true");
  hero.append(clue);
  let visible = false;
  let nextTimer = null;
  let hideTimer = null;

  function canShow() {
    return visible && !document.hidden && !reducedMotion.matches && !document.querySelector("dialog[open]");
  }

  function hide() {
    window.clearTimeout(hideTimer);
    clue.classList.remove("is-visible");
  }

  function schedule() {
    if (canShow()) nextTimer = window.setTimeout(appear, 20000 + Math.random() * 25000);
  }

  function appear() {
    nextTimer = null;
    if (!canShow()) return;
    schedule();
    const area = hero.getBoundingClientRect();
    const size = clue.getBoundingClientRect();
    const driftX = (Math.random() < .5 ? -1 : 1) * (18 + Math.random() * 14);
    const driftY = -(1 + Math.random() * 3);
    const footprintWidth = size.width + Math.abs(driftX);
    const footprintHeight = size.height + Math.abs(driftY);
    const header = document.querySelector(".site-header").getBoundingClientRect();
    const minX = area.left + 12;
    const maxX = area.right - footprintWidth - 12;
    const minY = Math.max(area.top + 12, header.bottom + 18);
    const maxY = Math.min(area.bottom - 12, window.innerHeight - 12) - footprintHeight;
    if (maxX < minX || maxY < minY) return;
    const obstacles = [...hero.querySelectorAll(".hero-copy, .profile-panel, .hero-bottom")]
      .map((element) => element.getBoundingClientRect());

    // Protege todo o trajeto, incluindo o espaço percorrido até desaparecer.
    for (let attempt = 0; attempt < 48; attempt++) {
      const x = minX + Math.random() * (maxX - minX);
      let bands = [[minY, maxY]];
      obstacles.forEach((rect) => {
        if (x >= rect.right + 18 || x + footprintWidth <= rect.left - 18) return;
        bands = bands.flatMap(([start, end]) => [
          [start, Math.min(end, rect.top - 18 - footprintHeight)],
          [Math.max(start, rect.bottom + 18), end],
        ].filter(([low, high]) => high >= low));
      });
      if (!bands.length) continue;
      const [low, high] = bands[Math.floor(Math.random() * bands.length)];
      const y = low + Math.random() * (high - low);
      clue.style.left = `${x - Math.min(driftX, 0) - area.left}px`;
      clue.style.top = `${y - Math.min(driftY, 0) - area.top}px`;
      clue.style.setProperty("--clue-drift-x", `${driftX}px`);
      clue.style.setProperty("--clue-drift-y", `${driftY}px`);
      clue.classList.add("is-visible");
      hideTimer = window.setTimeout(hide, 2000);
      return;
    }
  }

  function restart() {
    window.clearTimeout(nextTimer);
    nextTimer = null;
    hide();
    schedule();
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    restart();
  });
  observer.observe(hero);
  window.addEventListener("scroll", restart, { passive: true });
  window.addEventListener("resize", restart, { passive: true });
  document.addEventListener("visibilitychange", restart);
  document.addEventListener("click", restart);
  document.querySelector("#portfolio-terminal")?.addEventListener("close", restart);
  reducedMotion.addEventListener("change", restart);
}

initHeroClue();
