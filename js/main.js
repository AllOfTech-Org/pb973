/**
 * PB(973) — page switching, FAQ accordion, intro loader, animated tab bar.
 * Uses GSAP (cdnjs) when available; falls back to CSS transitions where noted.
 */

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasGsap() {
  return typeof window.gsap !== 'undefined';
}

let pageTransitionLock = false;

const revealObservers = [];
const counterObservers = [];

/** True mouse/trackpad desktop: custom cursor + magnetic — never phones/tablet breakpoints */
function isDesktopPointerUX() {
  if (prefersReducedMotion()) return false;
  if (!window.matchMedia('(min-width: 1024px)').matches) return false;
  if (!window.matchMedia('(pointer: fine)').matches) return false;
  if (!window.matchMedia('(hover: hover)').matches) return false;
  return true;
}

function teardownDesktopPointerUX() {
  document.body.classList.remove('has-custom-cursor', 'is-cursor-ready');
}

/** Max-width 767px — mobile nav, lighter motion, no parallax */
function isMobileViewport() {
  return window.matchMedia('(max-width: 767px)').matches;
}

function getActivePageId() {
  const el = document.querySelector('.page.active');
  return el && el.id && el.id.startsWith('page-') ? el.id.slice(5) : 'home';
}

function getRevealFrom(dir) {
  const m = isMobileViewport();
  const blur = { opacity: 0, filter: m ? 'blur(0px)' : 'blur(8px)' };
  if (dir === 'left') return { ...blur, x: m ? -16 : -52 };
  if (dir === 'right') return { ...blur, x: m ? 16 : 52 };
  if (dir === 'scale') return { ...blur, scale: m ? 0.98 : 0.94 };
  if (dir === 'blur') return { opacity: 0, filter: m ? 'blur(0px)' : 'blur(14px)' };
  return { ...blur, y: m ? 12 : 44 };
}

function disconnectScrollReveal() {
  revealObservers.forEach((o) => o.disconnect());
  revealObservers.length = 0;
}

function disconnectStatCounters() {
  counterObservers.forEach((o) => o.disconnect());
  counterObservers.length = 0;
}

function animateStatValue(el, target, duration = 1.45) {
  const gsap = window.gsap;
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const dec = el.dataset.decimals !== undefined ? parseInt(el.dataset.decimals, 10) : 0;
  const obj = { val: 0 };
  gsap.to(obj, {
    val: target,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      const v =
        dec > 0 ? obj.val.toFixed(dec) : Math.round(obj.val);
      el.textContent = prefix + v + suffix;
    },
  });
}

function connectStatCounters() {
  disconnectStatCounters();
  const page = document.querySelector('.page.active');
  if (!page) return;

  page.querySelectorAll('.stat-value').forEach((el) => {
    const raw = el.dataset.target;
    const target = parseFloat(raw, 10);
    if (!Number.isFinite(target)) return;

    if (!hasGsap() || prefersReducedMotion()) {
      const dec = el.dataset.decimals !== undefined ? parseInt(el.dataset.decimals, 10) : 0;
      const v = dec > 0 ? target.toFixed(dec) : String(Math.round(target));
      el.textContent = (el.dataset.prefix || '') + v + (el.dataset.suffix || '');
      return;
    }

    el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || '');
    delete el.dataset.counted;

    const statMobile = isMobileViewport();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || el.dataset.counted === '1') return;
          el.dataset.counted = '1';
          animateStatValue(el, target, statMobile ? 0.85 : 1.45);
          io.unobserve(el);
        });
      },
      {
        threshold: statMobile ? 0.12 : 0.2,
        rootMargin: statMobile ? '0px 0px 24px 0px' : '0px 0px -5% 0px',
      }
    );
    io.observe(el);
    counterObservers.push(io);
  });
}

function connectScrollReveal() {
  disconnectScrollReveal();
  if (!hasGsap() || prefersReducedMotion()) return;

  const page = document.querySelector('.page.active');
  if (!page) return;

  const gsap = window.gsap;

  page.querySelectorAll('.reveal-section').forEach((section) => {
    if (section.parentElement && section.parentElement.classList.contains('page')) return;

    const dir = section.dataset.reveal || 'up';
    const from = getRevealFrom(dir);
    const kids = section.querySelectorAll(':scope .stagger-children > *');
    const m = isMobileViewport();

    gsap.set(section, from);
    if (kids.length) gsap.set(kids, { opacity: 0, y: m ? 12 : 28 });

    const heading = section.querySelector('.section-heading');
    if (heading) heading.classList.remove('is-underline-revealed');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          io.unobserve(el);
          const k = el.querySelectorAll(':scope .stagger-children > *');
          const h = el.querySelector('.section-heading');
          const mv = isMobileViewport();
          gsap.to(el, {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: mv ? 0.3 : 0.65,
            ease: 'power3.out',
            onComplete: () => gsap.set(el, { clearProps: 'filter' }),
          });
          if (k.length) {
            gsap.to(k, {
              opacity: 1,
              y: 0,
              duration: mv ? 0.3 : 0.48,
              stagger: mv ? 0.05 : 0.075,
              ease: 'power2.out',
              delay: 0.08,
            });
          }
          if (h) requestAnimationFrame(() => h.classList.add('is-underline-revealed'));
        });
      },
      {
        threshold: m ? 0 : 0.1,
        rootMargin: m ? '0px 0px 32px 0px' : '0px 0px -7% 0px',
      }
    );
    io.observe(section);
    revealObservers.push(io);
  });
}

function refreshMotionForActivePage() {
  connectScrollReveal();
  connectStatCounters();
}

function initMagneticButtons() {
  if (!isDesktopPointerUX()) return;
  const strength = 0.2;
  const sel =
    '.btn-outline, .btn-solid, .btn-email, .btn-submit, .btn-join, .btn-ghost, .nav-icon, .social-btn, .club-tab';
  document.querySelectorAll(sel).forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}

function initCustomCursor() {
  if (!isDesktopPointerUX()) return;
  const dot = document.querySelector('.cursor-dot');
  const glow = document.querySelector('.cursor-glow');
  if (!dot || !glow) return;

  document.body.classList.add('has-custom-cursor');

  let mx = 0;
  let my = 0;
  let gx = 0;
  let gy = 0;
  let rafId = 0;

  function syncDot() {
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
  }

  function loopGlow() {
    gx += (mx - gx) * 0.12;
    gy += (my - gy) * 0.12;
    glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    if (Math.abs(mx - gx) > 0.35 || Math.abs(my - gy) > 0.35) {
      rafId = requestAnimationFrame(loopGlow);
    } else {
      rafId = 0;
    }
  }

  document.addEventListener(
    'pointermove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      syncDot();
      if (!rafId) rafId = requestAnimationFrame(loopGlow);
    },
    { passive: true }
  );

  document.addEventListener('pointerdown', () => {
    dot.style.opacity = '0.7';
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0) scale(0.88)`;
  });
  document.addEventListener('pointerup', () => {
    dot.style.opacity = '1';
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0) scale(1)`;
  });

  document.addEventListener(
    'mouseover',
    (e) => {
      if (e.target.closest('a, button, .club-tab, input, textarea, select, .faq-v2-trigger, .plan-card')) {
        glow.classList.add('is-hover');
      }
    },
    true
  );
  document.addEventListener(
    'mouseout',
    (e) => {
      if (e.target.closest('a, button, .club-tab, input, textarea, select, .faq-v2-trigger, .plan-card')) {
        glow.classList.remove('is-hover');
      }
    },
    true
  );

  document.body.classList.add('is-cursor-ready');
}

let parallaxRaf = 0;
function initHeroParallax() {
  if (prefersReducedMotion() || isMobileViewport()) return;
  const layer = document.querySelector('.hero-parallax-layer');
  if (!layer) return;

  function tick() {
    if (isMobileViewport()) {
      layer.style.transform = '';
      return;
    }
    const home = document.getElementById('page-home');
    if (!home || !home.classList.contains('active')) {
      layer.style.transform = '';
      return;
    }
    const hero = home.querySelector('.hero');
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (-rect.top + 120) / (rect.height + 100)));
    layer.style.transform = `translate3d(0, ${p * 52}px, 0) scale(1.06)`;
  }

  window.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(parallaxRaf);
      parallaxRaf = requestAnimationFrame(tick);
    },
    { passive: true }
  );
  tick();
}

/**
 * Positions the sliding pill behind the active nav tab (main tab section).
 */
function moveNavTabIndicator(opts) {
  const immediate = !!(opts && opts.immediate);
  const tabBar = document.querySelector('.nav-pill-tabbar');
  if (tabBar && window.getComputedStyle(tabBar).display === 'none') return;

  const wrap = document.querySelector('.nav-pill');
  const ind = document.querySelector('.nav-tab-indicator');
  const active = document.querySelector('.nav-pill-links a.active');
  if (!wrap || !ind || !active) return;

  const wrapRect = wrap.getBoundingClientRect();
  if (wrapRect.width < 4 || wrapRect.height < 4) return;
  const aRect = active.getBoundingClientRect();
  /* .nav-pill is the positioning context — use viewport deltas (no scrollLeft; pill moves with scroll parent). */
  const left = aRect.left - wrapRect.left;
  const top = aRect.top - wrapRect.top;
  const w = aRect.width;
  const h = aRect.height;

  // On full page loads (junior.html / membership.html / faq.html), the indicator starts at 0x0.
  // Animating from that default looks like the capsule drops in from above.
  // First placement is instant; later moves are animated.
  const firstPlace = ind.dataset.pb973Ready !== '1';
  if (firstPlace) ind.dataset.pb973Ready = '1';

  if (hasGsap() && !prefersReducedMotion()) {
    const gsap = window.gsap;
    if (immediate || firstPlace) {
      gsap.set(ind, { left, top, width: w, height: h });
    } else {
      gsap.to(ind, {
        left,
        top,
        width: w,
        height: h,
        duration: 0.52,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    }
  } else {
    ind.style.transition = 'left 0.45s ease, top 0.45s ease, width 0.45s ease, height 0.45s ease';
    ind.style.left = `${left}px`;
    ind.style.top = `${top}px`;
    ind.style.width = `${w}px`;
    ind.style.height = `${h}px`;
  }
}

/** Sliding pill behind active tab on the home “glass tabs” section. */
function moveClubTabIndicator() {
  const wrap = document.querySelector('.club-tab-bar');
  const ind = document.querySelector('.club-tab-indicator');
  const active = document.querySelector('.club-tab-bar .club-tab.active');
  if (!wrap || !ind || !active) return;

  const wrapRect = wrap.getBoundingClientRect();
  if (wrapRect.width < 4 || wrapRect.height < 4) return;

  const aRect = active.getBoundingClientRect();
  const left = aRect.left - wrapRect.left + wrap.scrollLeft;
  const top = aRect.top - wrapRect.top + wrap.scrollTop;
  const w = aRect.width;
  const h = aRect.height;

  if (hasGsap() && !prefersReducedMotion()) {
    window.gsap.to(ind, {
      left,
      top,
      width: w,
      height: h,
      duration: 0.48,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  } else {
    ind.style.transition = 'left 0.45s ease, top 0.45s ease, width 0.45s ease, height 0.45s ease';
    ind.style.left = `${left}px`;
    ind.style.top = `${top}px`;
    ind.style.width = `${w}px`;
    ind.style.height = `${h}px`;
  }
}

function initClubTabs() {
  const bar = document.querySelector('.club-tab-bar');
  if (!bar) return;

  bar.querySelectorAll('.club-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      const panelId = btn.getAttribute('aria-controls');
      bar.querySelectorAll('.club-tab').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
        b.setAttribute('tabindex', '-1');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');

      document.querySelectorAll('.club-panel').forEach((p) => {
        const show = p.id === panelId;
        p.hidden = !show;
      });
      requestAnimationFrame(() => moveClubTabIndicator());
    });
  });

  let clubScrollT;
  bar.addEventListener('scroll', () => {
    clearTimeout(clubScrollT);
    clubScrollT = setTimeout(moveClubTabIndicator, 40);
  });
}

function updateNav(id) {
  document.querySelectorAll('.nav-pill-links a').forEach((a) => {
    a.classList.remove('active');
    a.setAttribute('aria-selected', 'false');
  });
  const navEl = document.getElementById('nav-' + id);
  if (navEl) {
    navEl.classList.add('active');
    navEl.setAttribute('aria-selected', 'true');
  }
  document.querySelectorAll('.mobile-nav-link').forEach((a) => {
    const on = a.dataset.page === id;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  requestAnimationFrame(() => {
    moveNavTabIndicator();
    if (id === 'home') moveClubTabIndicator();
  });
}

let mobileNavCloseTimer = 0;

function closeMobileNav() {
  const drawer = document.getElementById('mobileNavDrawer');
  const backdrop = document.getElementById('mobileNavBackdrop');
  const toggle = document.getElementById('navMenuToggle');
  if (!drawer || !backdrop || !toggle) return;
  if (!drawer.classList.contains('is-open')) return;

  toggle.setAttribute('aria-expanded', 'false');
  drawer.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('nav-mobile-open');

  if (hasGsap()) {
    const links = document.querySelectorAll('.mobile-nav-link');
    const joinBtn = document.querySelector('.btn-join-mobile-nav');
    const nodes = [...links, joinBtn].filter(Boolean);
    if (nodes.length) {
      window.gsap.killTweensOf(nodes);
      window.gsap.set(nodes, { clearProps: 'opacity,transform,x,y' });
    }
  }

  clearTimeout(mobileNavCloseTimer);
  mobileNavCloseTimer = setTimeout(() => {
    drawer.hidden = true;
    backdrop.hidden = true;
  }, 380);

  if (window.getComputedStyle(toggle).display !== 'none') {
    toggle.focus();
  }
}

function animateMobileNavOpen() {
  const links = document.querySelectorAll('.mobile-nav-link');
  const joinBtn = document.querySelector('.btn-join-mobile-nav');
  if (!links.length) return;

  if (prefersReducedMotion() || !hasGsap()) {
    if (hasGsap()) {
      const gsap = window.gsap;
      gsap.killTweensOf([...links, joinBtn].filter(Boolean));
      gsap.set([...links, joinBtn].filter(Boolean), { clearProps: 'opacity,transform,x,y' });
    }
    return;
  }

  const gsap = window.gsap;
  const nodes = [...links, joinBtn].filter(Boolean);
  gsap.killTweensOf(nodes);
  /* Keep opacity at 1: fading from 0 can stick invisible if tweens are killed (e.g. rapid taps).
   * Timeline onComplete runs once after link + button motion (GSAP 3 has no stagger onCompleteAll). */
  const navOpenTl = gsap.timeline({
    onComplete: () => {
      gsap.set(links, { clearProps: 'transform' });
      if (joinBtn) gsap.set(joinBtn, { clearProps: 'transform' });
    },
  });
  navOpenTl.fromTo(
    links,
    { opacity: 1, x: 22 },
    { opacity: 1, x: 0, duration: 0.28, stagger: 0.065, ease: 'power2.out' },
    0.06
  );
  if (joinBtn) {
    navOpenTl.fromTo(
      joinBtn,
      { opacity: 1, y: 12 },
      { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out' },
      0.06 + links.length * 0.065
    );
  }
}

function openMobileNav() {
  const drawer = document.getElementById('mobileNavDrawer');
  const backdrop = document.getElementById('mobileNavBackdrop');
  const toggle = document.getElementById('navMenuToggle');
  if (!drawer || !backdrop || !toggle) return;
  const toggleDisp = window.getComputedStyle(toggle).display;
  if (toggleDisp === 'none') return;

  clearTimeout(mobileNavCloseTimer);
  drawer.hidden = false;
  backdrop.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.setAttribute('aria-hidden', 'false');
  document.body.classList.add('nav-mobile-open');

  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    drawer.classList.add('is-open');
    updateNav(getActivePageId());
    animateMobileNavOpen();
    drawer.querySelector('.mobile-nav-link')?.focus();
  });
}

function initMobileNav() {
  const toggle = document.getElementById('navMenuToggle');
  const backdrop = document.getElementById('mobileNavBackdrop');
  const closeBtn = document.getElementById('mobileNavClose');
  if (!toggle || !backdrop) return;

  toggle.addEventListener('click', () => {
    if (window.getComputedStyle(toggle).display === 'none') return;
    const open = toggle.getAttribute('aria-expanded') === 'true';
    if (open) closeMobileNav();
    else openMobileNav();
  });

  backdrop.addEventListener('click', closeMobileNav);
  closeBtn?.addEventListener('click', closeMobileNav);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileNav();
  });
}

function getPageContentBlocks(pageEl) {
  return [...pageEl.children].filter((el) => el.tagName !== 'FOOTER');
}

/** True when this document actually contains that page's sections (not an empty SPA stub). */
function pageHasInDocumentContent(pageEl) {
  if (!pageEl) return false;
  return getPageContentBlocks(pageEl).length > 0;
}

function htmlPathForPageId(id) {
  // Clean URLs (no .html) for Vercel rewrites.
  if (id === 'home') return '/';
  if (id === 'about') return '/about';
  if (id === 'contact') return '/contact';
  if (id === 'junior') return '/junior';
  if (id === 'membership') return '/membership';
  if (id === 'press') return '/press';
  if (id === 'faq') return '/faq';
  return null;
}

/** Junior Programs: Dinkin Dinos vs Competitive Edge tab switcher (junior.html). */
function switchProgram(prog) {
  document.querySelectorAll('.program-tab-btn').forEach((btn) => {
    const isTarget = btn.id === 'tab-' + prog;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  document.querySelectorAll('.program-panel').forEach((panel) => {
    const isTarget = panel.id === 'panel-' + prog;
    panel.classList.toggle('active', isTarget);
  });

  const tabs = document.querySelector('.program-tabs');
  if (tabs) {
    const rect = tabs.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + rect.bottom - 80, behavior: 'smooth' });
  }

  if (typeof connectScrollReveal === 'function') {
    setTimeout(connectScrollReveal, 80);
  }
  if (typeof connectStatCounters === 'function') {
    setTimeout(connectStatCounters, 80);
  }
}

function showPage(id) {
  closeMobileNav();

  if (pageTransitionLock) return false;

  const next = document.getElementById('page-' + id);
  if (!next || !pageHasInDocumentContent(next)) {
    const path = htmlPathForPageId(id);
    if (path) window.location.href = path;
    return false;
  }

  const current = document.querySelector('.page.active');
  if (!current || current === next) return false;

  // Keep the URL bar in sync with the active page so refresh/back-forward work.
  // Only push state when called outside the click interceptor (the interceptor
  // already pushes its own state and pageIdFromLocation will already match).
  try {
    if (pageIdFromLocation() !== id) {
      const path = htmlPathForPageId(id) || (id === 'home' ? '/' : '/' + id);
      history.pushState({ page: id }, '', path);
    }
  } catch (err) {}

  updateNav(id);
  window.scrollTo(0, 0);
  if (id === 'faq') { setTimeout(initFaqV2, 50); }

  const motion = hasGsap() && !prefersReducedMotion();

  if (!motion) {
    current.classList.remove('active');
    next.classList.add('active');
    refreshMotionForActivePage();
    return false;
  }

  pageTransitionLock = true;
  document.body.classList.add('is-page-transitioning');
  const gsap = window.gsap;
  const blocks = getPageContentBlocks(next);
  const mv = isMobileViewport();

  if (blocks.length) gsap.set(blocks, { opacity: 0, y: mv ? 12 : 18 });

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      gsap.set(current, { clearProps: 'opacity,transform,filter' });
      gsap.set(next, { clearProps: 'opacity,transform,filter' });
      if (blocks.length) gsap.set(blocks, { clearProps: 'opacity,transform' });
      pageTransitionLock = false;
      document.body.classList.remove('is-page-transitioning');
      refreshMotionForActivePage();
    },
  });

  if (mv) {
    tl.to(current, {
      opacity: 0,
      y: -16,
      duration: 0.28,
      ease: 'power2.in',
    })
      .add(() => {
        current.classList.remove('active');
        next.classList.add('active');
      })
      .fromTo(
        next,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.32, ease: 'power3.out' },
        '-=0.04'
      )
      .to(
        blocks,
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: 'power2.out',
        },
        '-=0.18'
      );
  } else {
    tl.to(current, {
      opacity: 0,
      y: -32,
      scale: 0.97,
      filter: 'blur(10px)',
      duration: 0.4,
      ease: 'power3.in',
    })
      .add(() => {
        current.classList.remove('active');
        next.classList.add('active');
      })
      .fromTo(
        next,
        { opacity: 0, y: 36, scale: 1.02, filter: 'blur(12px)' },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.55,
          ease: 'power3.out',
          onComplete: () => gsap.set(next, { clearProps: 'filter' }),
        },
        '-=0.06'
      )
      .to(
        blocks,
        {
          opacity: 1,
          y: 0,
          duration: 0.46,
          stagger: 0.065,
          ease: 'power2.out',
        },
        '-=0.32'
      );
  }

  return false;
}

function pageIdFromHref(href) {
  const h = (href || '').toLowerCase();
  // Clean URL routes: /about, /contact, /faq (supports relative and absolute).
  const pathPart = h.replace(/^https?:\/\/[^/]+/i, '').split('?')[0].split('#')[0];
  if (pathPart === '' || pathPart === '/' || pathPart === '/index' || pathPart === '/index.html') return 'home';
  if (pathPart === '/about' || pathPart === '/about/') return 'about';
  if (pathPart === '/contact' || pathPart === '/contact/') return 'contact';
  if (pathPart === '/junior' || pathPart === '/junior/') return 'junior';
  if (pathPart === '/membership' || pathPart === '/membership/') return 'membership';
  if (pathPart === '/press' || pathPart === '/press/') return 'press';
  if (pathPart === '/faq' || pathPart === '/faq/') return 'faq';
  if (h.endsWith('/index.html') || h.endsWith('index.html') || h === '' || h === '/' ) return 'home';
  if (h.endsWith('/about.html') || h.endsWith('about.html')) return 'about';
  if (h.endsWith('/contact.html') || h.endsWith('contact.html')) return 'contact';
  if (h.endsWith('/junior.html') || h.endsWith('junior.html')) return 'junior';
  if (h.endsWith('/membership.html') || h.endsWith('membership.html')) return 'membership';
  if (h.endsWith('/press.html') || h.endsWith('press.html')) return 'press';
  if (h.endsWith('/faq.html') || h.endsWith('faq.html')) return 'faq';
  return null;
}

function pageIdFromLocation() {
  const p = (location && location.pathname ? location.pathname : '').toLowerCase();
  if (p === '/about' || p === '/about/') return 'about';
  if (p === '/contact' || p === '/contact/') return 'contact';
  if (p === '/junior' || p === '/junior/') return 'junior';
  if (p === '/membership' || p === '/membership/') return 'membership';
  if (p === '/press' || p === '/press/') return 'press';
  if (p === '/faq' || p === '/faq/') return 'faq';
  if (p.endsWith('/') || p.endsWith('/index.html') || p.endsWith('index.html') || p === '') return 'home';
  if (p.endsWith('/about.html') || p.endsWith('about.html')) return 'about';
  if (p.endsWith('/contact.html') || p.endsWith('contact.html')) return 'contact';
  if (p.endsWith('/junior.html') || p.endsWith('junior.html')) return 'junior';
  if (p.endsWith('/membership.html') || p.endsWith('membership.html')) return 'membership';
  if (p.endsWith('/press.html') || p.endsWith('press.html')) return 'press';
  if (p.endsWith('/faq.html') || p.endsWith('faq.html')) return 'faq';
  return 'home';
}

function initSpaTabNavigation() {
  const onClick = (e) => {
    let a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) {
      // If the user clicks the <li>/<ul> gap around a nav tab, treat it as a click on the tab link.
      const li = e.target && e.target.closest ? e.target.closest('.nav-pill-links li') : null;
      if (li) a = li.querySelector('a');
    }
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const id = pageIdFromHref(href);
    if (!id) return;

    // allow new tab / download / external behaviors
    if (a.target === '_blank') return;
    if (a.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // Stub pages (e.g. junior.html) ship empty #page-* shells; use real navigation.
    const nextPageEl = document.getElementById('page-' + id);
    if (!pageHasInDocumentContent(nextPageEl)) return;

    // Prevent full page reload and switch tabs smoothly.
    // showPage() handles history.pushState internally, so no need to do it here.
    e.preventDefault();
    e.stopPropagation();
    if (getActivePageId() === id) return;
    showPage(id);
  };

  document.addEventListener('click', onClick, true);

  window.addEventListener('popstate', () => {
    const id = pageIdFromLocation();
    if (getActivePageId() === id) return;
    const el = document.getElementById('page-' + id);
    if (!pageHasInDocumentContent(el)) {
      window.location.reload();
      return;
    }
    showPage(id);
  });
}

/* ===== FAQ V2 — New accordion, search & category filter ===== */

function toggleFaqV2(triggerBtn) {
  const item = triggerBtn.closest('.faq-v2-item');
  const body = item.querySelector('.faq-v2-body');
  if (!item || !body) return;
  const isOpen = item.classList.contains('is-open');
  if (isOpen) {
    item.classList.remove('is-open');
    triggerBtn.setAttribute('aria-expanded', 'false');
    if (hasGsap() && !prefersReducedMotion()) {
      window.gsap.to(body, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.inOut',
        onComplete: () => { body.hidden = true; window.gsap.set(body, { clearProps: 'height,opacity' }); }
      });
    } else { body.hidden = true; }
  } else {
    item.classList.add('is-open');
    triggerBtn.setAttribute('aria-expanded', 'true');
    body.hidden = false;
    if (hasGsap() && !prefersReducedMotion()) {
      const h = body.scrollHeight;
      window.gsap.fromTo(body, { height: 0, opacity: 0 },
        { height: h, opacity: 1, duration: 0.38, ease: 'power3.out',
          onComplete: () => { body.style.height = 'auto'; window.gsap.set(body, { clearProps: 'opacity' }); }
        }
      );
    }
  }
}

function clearFaqSearch() {
  const input = document.getElementById('faqSearchInput');
  if (input) { input.value = ''; input.dispatchEvent(new Event('input')); }
}

function initFaqV2() {
  const searchInput = document.getElementById('faqSearchInput');
  const clearBtn = document.getElementById('faqSearchClear');
  const noResults = document.getElementById('faqNoResults');
  const catBtns = document.querySelectorAll('.faq-cat');
  const items = document.querySelectorAll('.faq-v2-item');
  if (!searchInput) return;
  let activeCat = 'all';
  function applyFilters() {
    const query = searchInput.value.trim().toLowerCase();
    if (clearBtn) clearBtn.hidden = query.length === 0;
    let visible = 0;
    items.forEach((item) => {
      const qEl = item.querySelector('.faq-v2-q');
      const bodyEl = item.querySelector('.faq-v2-content');
      const cat = item.dataset.cat || 'all';
      const catMatch = activeCat === 'all' || cat === activeCat;
      const qText = qEl ? qEl.textContent.toLowerCase() : '';
      const bodyText = bodyEl ? bodyEl.textContent.toLowerCase() : '';
      const queryMatch = query === '' || qText.includes(query) || bodyText.includes(query);
      const show = catMatch && queryMatch;
      item.classList.toggle('faq-filtered-out', !show);
      if (show) visible++;
      if (qEl) {
        const raw = qEl.textContent;
        if (query) {
          const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          qEl.innerHTML = raw.replace(new RegExp('(' + esc + ')', 'gi'), '<mark>$1</mark>');
        } else {
          qEl.textContent = raw;
        }
      }
    });
    if (noResults) noResults.hidden = visible > 0;
  }
  searchInput.addEventListener('input', applyFilters);
  if (clearBtn) clearBtn.addEventListener('click', () => { searchInput.value = ''; applyFilters(); searchInput.focus(); });
  catBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      catBtns.forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeCat = btn.dataset.cat || 'all';
      applyFilters();
    });
  });
}

function removeLoader() {
  const loader = document.getElementById('site-loader');
  if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
  document.body.classList.remove('is-loading');
}

function getNavType() {
  try {
    const nav = performance.getEntriesByType('navigation');
    return nav && nav[0] && nav[0].type ? nav[0].type : 'navigate';
  } catch (e) {
    return 'navigate';
  }
}

function runIntro() {
  const motion = hasGsap() && !prefersReducedMotion();
  const loader = document.getElementById('site-loader');
  // Animate whichever page is actually active on this load (home, about, etc.)
  // so users landing directly on a sub-page still see the intro reveal.
  const activePage = document.querySelector('.page.active') || document.getElementById('page-home');

  if (!motion || !loader) {
    removeLoader();
    return;
  }

  const gsap = window.gsap;
  const blocks = activePage ? getPageContentBlocks(activePage) : [];
  const mv = isMobileViewport();

  if (blocks.length) gsap.set(blocks, { opacity: 0, y: mv ? 12 : 28 });

  const tl = gsap.timeline({
    onComplete: () => {
      removeLoader();
      try { sessionStorage.setItem('pb973_intro_seen', '1'); } catch (e) {}
      if (blocks.length) gsap.set(blocks, { clearProps: 'opacity,transform' });
      gsap.set('nav', { clearProps: 'opacity,transform' });
      moveNavTabIndicator();
      moveClubTabIndicator();
      refreshMotionForActivePage();
    },
  });

  tl.from('.site-loader-inner', { opacity: 0, scale: 0.94, duration: 0.45, ease: 'power2.out' })
    .from(
      '.site-loader-logo',
      { opacity: 0, y: 14, duration: 0.5, ease: 'power3.out' },
      '-=0.2'
    )
    .from(
      '.site-loader-tag',
      { opacity: 0, letterSpacing: '0.4em', duration: 0.55, ease: 'power2.out' },
      '-=0.35'
    )
    .fromTo(
      '.site-loader-bar-fill',
      { scaleX: 0 },
      { scaleX: 1, transformOrigin: 'left center', duration: 0.95, ease: 'power2.inOut' },
      '-=0.25'
    )
    .to('.site-loader', {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.inOut',
    })
    .from(
      'nav',
      { y: -80, opacity: 0, duration: 0.55, ease: 'power3.out' },
      '-=0.35'
    )
    .to(
      blocks,
      {
        opacity: 1,
        y: 0,
        duration: mv ? 0.32 : 0.52,
        stagger: mv ? 0.05 : 0.075,
        ease: 'power2.out',
      },
      '-=0.4'
    );
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!isDesktopPointerUX()) teardownDesktopPointerUX();
    closeMobileNav();
    moveNavTabIndicator();
    moveClubTabIndicator();
  }, 100);
});

window.addEventListener('DOMContentLoaded', () => {
  // Ensure correct tab is active based on the URL (works for about.html, contact.html, etc.)
  const initialId = pageIdFromLocation();
  updateNav(initialId);
  const initialEl = document.getElementById('page-' + initialId);
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  if (initialEl) initialEl.classList.add('active');
  requestAnimationFrame(() => moveNavTabIndicator({ immediate: true }));

  // Home hero "pop" only on the very first entry (not when switching tabs later).
  if (initialId === 'home') {
    let seen = false;
    try { seen = sessionStorage.getItem('pb973_home_hero_pop_seen') === '1'; } catch (e) {}
    if (!seen) {
      document.body.classList.add('pb973-first-enter');
      try { sessionStorage.setItem('pb973_home_hero_pop_seen', '1'); } catch (e) {}
      // Remove the class after the first paint so it won't retrigger.
      setTimeout(() => document.body.classList.remove('pb973-first-enter'), 1400);
    }
  }

  initMobileNav();
  initClubTabs();
  initFaqV2();
  initSpaTabNavigation();

  const tabWrap = document.querySelector('.nav-pill-tabbar');
  let scrollT;
  if (tabWrap) {
    tabWrap.addEventListener('scroll', () => {
      clearTimeout(scrollT);
      scrollT = setTimeout(moveNavTabIndicator, 40);
    });
  }

  initMagneticButtons();
  initCustomCursor();
  initHeroParallax();

  if (!hasGsap() || prefersReducedMotion()) {
    removeLoader();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        moveNavTabIndicator();
        moveClubTabIndicator();
        refreshMotionForActivePage();
      });
    });
    return;
  }

  // Loader should appear only on first entry or a true reload, not on every internal page/tab click.
  const navType = getNavType(); // 'navigate' | 'reload' | 'back_forward' | 'prerender'
  let introSeen = false;
  try { introSeen = sessionStorage.getItem('pb973_intro_seen') === '1'; } catch (e) {}
  const shouldSkipIntro = introSeen && navType === 'navigate';
  if (shouldSkipIntro) {
    removeLoader();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        moveNavTabIndicator();
        moveClubTabIndicator();
        refreshMotionForActivePage();
      });
    });
    return;
  }

  runIntro();
});