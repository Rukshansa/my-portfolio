/* ============================================================
   PORTFOLIO — script.js
   Cinematic 3D Scroll Hero + Interactive UI
   ============================================================ */

'use strict';

// ── Utility helpers ─────────────────────────────────────────
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function easeInCubic(t) { return t * t * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── DOM references ──────────────────────────────────────────
const root            = document.documentElement;
const heroScroll      = document.getElementById('hero-scroll');
const heroSticky      = document.getElementById('hero-sticky');
const heroHalftone    = document.getElementById('hero-halftone');
const heroPhoto       = document.getElementById('hero-photo');
const heroName        = document.getElementById('hero-name');
const heroCaption     = document.getElementById('hero-caption');
const heroInfo        = document.getElementById('hero-info');
const scrollIndicator = document.getElementById('scroll-indicator');
const navbar          = document.getElementById('navbar');
const hamburger       = document.getElementById('hamburger');
const navMobile       = document.getElementById('navMobile');
const navLinks        = document.querySelectorAll('.nav-link');


// ── HERO SCROLL ENGINE ──────────────────────────────────────
let scrollRafPending = false;

function getScrollProgress() {
  const rect     = heroScroll.getBoundingClientRect();
  const total    = heroScroll.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return clamp01(-rect.top / total);
}

function updateHero() {
  const p = getScrollProgress(); // 0 → 1 across 195vh sticky scroll budget

  // 1. Editorial chrome (caption, dock buttons, scroll arrow) fade out smoothly early
  const chromeFade = clamp01(mapRange(p, 0.03, 0.28, 1, 0));
  const chromeShift = (1 - chromeFade) * -20;
  if (heroCaption) {
    heroCaption.style.opacity   = chromeFade;
    heroCaption.style.transform = `translateY(${chromeShift}px)`;
  }
  heroInfo.style.opacity   = chromeFade;
  heroInfo.style.transform = `translateX(-50%) translateY(${(1 - chromeFade) * 18}px)`;
  heroInfo.style.pointerEvents = chromeFade > 0.15 ? 'auto' : 'none';
  scrollIndicator.style.opacity = clamp01(mapRange(p, 0.0, 0.18, 1, 0));

  // 2. Portrait Cutout: Sharp B&W -> Softly blurred & dimmed behind the rising single RUKSHAN
  const blurEase     = easeInOutCubic(clamp01(mapRange(p, 0.10, 0.85, 0, 1)));
  const blurPx       = blurEase * 18;                    // 0px → 18px soft blur
  const brightness   = 0.98 - blurEase * 0.62;           // 0.98 → 0.36
  const photoOpacity = 1 - blurEase * 0.82;              // 1.0 → 0.18 (smooth handoff)
  const photoScale   = 1 - blurEase * 0.06;              // 1.0 → 0.94 (recedes smoothly)

  heroPhoto.style.filter = [
    `contrast(1.06)`,
    `brightness(${brightness.toFixed(2)})`,
    `blur(${blurPx.toFixed(1)}px)`,
    `drop-shadow(0 18px 42px rgba(0, 0, 0, 0.88))`
  ].join(' ');
  heroPhoto.style.opacity   = photoOpacity.toFixed(2);
  heroPhoto.style.transform = `scale(${photoScale.toFixed(4)})`;

  // 3. Single "RUKSHAN" element: starts BEHIND portrait (z=2), moves IN FRONT (z=4) once photo fades/blurs
  const nameEase  = easeInOutCubic(clamp01(mapRange(p, 0.12, 0.88, 0, 1)));
  const nameScale = 1 + nameEase * 0.08;                 // 1.0 → 1.08 comes forward
  const parallaxFactor = p < 0.45 ? -0.55 : 0.85;

  heroName.style.zIndex = p >= 0.45 ? '4' : '2';
  heroName.style.transform =
    `translate3d(calc(var(--mx) * ${parallaxFactor}), calc(-50% + var(--my) * ${parallaxFactor}), 0) scale(${nameScale.toFixed(4)})`;

  // 4. Pop-art halftone behind head subtly expands and fades on scroll
  if (heroHalftone) {
    const htFade = clamp01(mapRange(p, 0.05, 0.72, 1, 0.12));
    const htScale = 1 + p * 0.12;
    heroHalftone.style.opacity = htFade.toFixed(2);
    heroHalftone.style.transform =
      `translate3d(calc(-50% + var(--mx) * -0.85), calc(-50% + var(--my) * -0.85), -90px) rotate(-25deg) scale(${htScale.toFixed(4)})`;
  }

  scrollRafPending = false;
}


// ── 3D MOUSE DEPTH PARALLAX (Hero stage) ────────────────────
let targetMx = 0, targetMy = 0;
let curMx = 0, curMy = 0;

function onHeroPointerMove(e) {
  const nx = (e.clientX / window.innerWidth) * 2 - 1;  // -1 .. 1
  const ny = (e.clientY / window.innerHeight) * 2 - 1; // -1 .. 1
  targetMx = nx * 18;
  targetMy = ny * 12;
  root.style.setProperty('--rx', `${(-ny * 2.2).toFixed(2)}deg`);
  root.style.setProperty('--ry', `${(nx * 2.8).toFixed(2)}deg`);
}

if (window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('mousemove', onHeroPointerMove, { passive: true });
}


// ── NAVBAR BEHAVIOUR ────────────────────────────────────────
function updateNavbar() {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}

window.addEventListener('scroll', () => {
  if (!scrollRafPending) {
    scrollRafPending = true;
    requestAnimationFrame(() => {
      updateHero();
      updateNavbar();
    });
  }
}, { passive: true });


// ── ACTIVE NAV LINK ON SCROLL ───────────────────────────────
const sections = document.querySelectorAll('section[id]:not(#hero-scroll)');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, {
  threshold: 0.25,
  rootMargin: '-80px 0px 0px 0px'
});

sections.forEach(s => sectionObserver.observe(s));


// ── SCROLL REVEAL ───────────────────────────────────────────
const revealEls = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.08,
  rootMargin: '0px 0px -40px 0px'
});

revealEls.forEach((el, i) => {
  el.style.transitionDelay = `${(i % 5) * 0.06}s`;
  revealObserver.observe(el);
});


// ── MOBILE HAMBURGER MENU ───────────────────────────────────
hamburger.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

navMobile.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMobile.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  });
});

document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target)) {
    navMobile.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
});


// ── SMOOTH ANCHOR SCROLLING ─────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const targetId = anchor.getAttribute('href');
    const target   = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      const navH = navbar.offsetHeight;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH + 2;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});


// ── CURSOR GLOW + 3D PARALLAX SMOOTH LOOP ───────────────────
const cursorGlow = document.createElement('div');
cursorGlow.id = 'cursor-glow';
cursorGlow.style.cssText = `
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 166, 35, 0.08) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  will-change: left, top;
`;
document.body.appendChild(cursorGlow);

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let glowX = mouseX, glowY = mouseY;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
}, { passive: true });

function animateFrame() {
  glowX += (mouseX - glowX) * 0.1;
  glowY += (mouseY - glowY) * 0.1;
  cursorGlow.style.left = glowX + 'px';
  cursorGlow.style.top  = glowY + 'px';

  curMx += (targetMx - curMx) * 0.09;
  curMy += (targetMy - curMy) * 0.09;
  root.style.setProperty('--mx', `${curMx.toFixed(2)}px`);
  root.style.setProperty('--my', `${curMy.toFixed(2)}px`);

  requestAnimationFrame(animateFrame);
}
animateFrame();


// ── PROJECT CARDS 3D TILT ───────────────────────────────────
document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect  = card.getBoundingClientRect();
    const dx    = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy    = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    card.style.transform = `translateY(-5px) perspective(900px) rotateX(${(dy * -5).toFixed(2)}deg) rotateY(${(dx * 5).toFixed(2)}deg)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.35s, box-shadow 0.35s';
  });

  card.addEventListener('mouseenter', () => {
    card.style.transition = 'border-color 0.35s, box-shadow 0.35s';
  });
});


// ── INITIAL PAINT ───────────────────────────────────────────
updateHero();
updateNavbar();
