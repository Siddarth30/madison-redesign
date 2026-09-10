/* Madison Management Services — interaction layer.
   Navigation, scroll choreography, counters, FAQ accordion.
   Progressive enhancement: if this file fails to run, every element
   stays visible and every control still works as plain HTML. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /* ----------------------------------------------------------------------
     Scroll reveals
     Attributes are assigned here rather than in the HTML so the markup
     stays clean and no page can fall out of sync. Elements are grouped by
     parent so siblings stagger against each other.
     -------------------------------------------------------------------- */
  var REVEAL = [
    '.section-head',
    '.service-card',
    '.solution-card',
    '.why-item',
    '.why-visual',
    '.t-card',
    '.fee-block',
    '.form-link-card',
    '.info-block',
    '.contact-card',
    '.faq-item',
    '.warning-block',
    '.form-card',
    '.cta-banner',
    '.holiday-table',
    '.stats .wrap'
  ].join(',');

  function markReveals() {
    if (reduceMotion || !('IntersectionObserver' in window)) return [];

    var groups = new Map();

    Array.prototype.forEach.call(document.querySelectorAll(REVEAL), function (node) {
      // Heroes run their own load animation — don't double-animate them.
      if (node.closest('.hero') || node.closest('.page-hero')) return;
      var parent = node.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(node);
    });

    var all = [];
    groups.forEach(function (nodes) {
      nodes.forEach(function (node, i) {
        node.setAttribute('data-reveal', '');
        node.style.setProperty('--reveal-delay', Math.min(i, 6) * 90 + 'ms');
        all.push(node);
      });
    });
    return all;
  }

  function observeReveals(nodes) {
    if (!nodes.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    nodes.forEach(function (node) {
      io.observe(node);
    });
  }

  /* ----------------------------------------------------------------------
     Counters — any element with data-count animates to its value once
     it scrolls into view. data-prefix / data-suffix wrap the figure.
     -------------------------------------------------------------------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;

    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1500;
    var startedAt = null;

    function frame(now) {
      if (startedAt === null) startedAt = now;
      var p = Math.min((now - startedAt) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(counters, function (el) {
        el.textContent =
          (el.getAttribute('data-prefix') || '') +
          el.getAttribute('data-count') +
          (el.getAttribute('data-suffix') || '');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    Array.prototype.forEach.call(counters, function (el) {
      el.textContent = (el.getAttribute('data-prefix') || '') + '0' + (el.getAttribute('data-suffix') || '');
      io.observe(el);
    });
  }

  /* ----------------------------------------------------------------------
     Scroll-linked chrome: sticky nav state + reading progress
     -------------------------------------------------------------------- */
  function initScrollChrome() {
    var nav = document.querySelector('nav');
    var bar = null;

    if (!reduceMotion) {
      bar = document.createElement('div');
      bar.className = 'scroll-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }

    var ticking = false;

    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop;

      if (nav) nav.classList.toggle('is-scrolled', y > 12);

      if (bar) {
        var doc = document.documentElement;
        var max = (document.body.scrollHeight || doc.scrollHeight) - window.innerHeight;
        var pct = max > 0 ? Math.min(y / max, 1) : 0;
        bar.style.transform = 'scaleX(' + pct + ')';
      }
      ticking = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );

    update();
  }

  /* ----------------------------------------------------------------------
     Navigation
     -------------------------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var navlinks = document.querySelector('.navlinks');

    if (toggle && navlinks) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.addEventListener('click', function () {
        var open = navlinks.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.innerHTML = open ? '&#10005;' : '&#9776;';
      });

      // Tapping a real link should close the drawer behind it.
      Array.prototype.forEach.call(navlinks.querySelectorAll('a'), function (a) {
        a.addEventListener('click', function () {
          navlinks.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.innerHTML = '&#9776;';
        });
      });
    }

    Array.prototype.forEach.call(
      document.querySelectorAll('.navlinks .dropdown > span, .navlinks .dropdown > a'),
      function (trigger) {
        trigger.addEventListener('click', function (e) {
          if (window.innerWidth <= 780) {
            e.preventDefault();
            trigger.parentElement.classList.toggle('open');
          }
        });
      }
    );
  }

  /* ----------------------------------------------------------------------
     FAQ accordion — also makes the headers keyboard-operable, which they
     weren't before (they're divs, not buttons).
     -------------------------------------------------------------------- */
  function initFaq() {
    Array.prototype.forEach.call(document.querySelectorAll('.faq-item .faq-q'), function (q) {
      var item = q.parentElement;

      q.setAttribute('role', 'button');
      q.setAttribute('tabindex', '0');
      q.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');

      function toggle() {
        var open = item.classList.toggle('open');
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      q.addEventListener('click', toggle);
      q.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  /* ---------------------------------------------------------------------- */

  // Runs at parse time (script sits at the end of <body>) so reveal targets
  // are hidden before first paint rather than flashing in.
  var revealNodes = markReveals();

  function init() {
    observeReveals(revealNodes);
    initCounters();
    initScrollChrome();
    initNav();
    initFaq();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
