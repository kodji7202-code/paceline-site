/* Paceline site interactions. Vanilla JS, no dependencies, no network requests. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- header state + scroll progress + parallax ---------- */
  var header = $('header.site');
  var bar = $('.progress span');
  var paras = reduce ? [] : $$('[data-parallax]');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle('scrolled', y > 8);
    var h = root.scrollHeight - window.innerHeight;
    if (bar) bar.style.setProperty('--p', h > 0 ? Math.min(1, y / h).toFixed(4) : 0);
    for (var i = 0; i < paras.length; i++) {
      var k = parseFloat(paras[i].getAttribute('data-parallax')) || 0;
      paras[i].style.transform = 'translate3d(0,' + (y * k).toFixed(1) + 'px,0)';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var menuBtn = $('.menu-btn');
  var nav = $('#nav');
  function setMenu(open) {
    if (!menuBtn || !nav) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('open', open);
    doc.body.style.overflow = open ? 'hidden' : '';
    if (open) { var f = $('a', nav); if (f) f.focus({ preventScroll: true }); }
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 900 && nav.classList.contains('open')) setMenu(false); });
  }

  /* ---------- headline split ---------- */
  var hl = $('[data-split]');
  if (hl) {
    var words = hl.textContent.trim().split(/\s+/);
    var accent = { 'Original': 1, 'Content': 1, 'Rewards': 1 };
    hl.setAttribute('aria-label', hl.textContent.trim());
    hl.innerHTML = words.map(function (w, i) {
      return '<span class="w" aria-hidden="true"><span class="' + (accent[w] ? 'hl' : '') + '" style="--wd:' + (0.05 + i * 0.045).toFixed(3) + 's">' + w + '</span></span>';
    }).join(' ');
  }

  /* ---------- count-up ---------- */
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  var counters = $$('[data-count]');
  counters.forEach(function (el) {
    el._target = parseFloat(el.getAttribute('data-count')) || 0;
    el._suffix = el.getAttribute('data-suffix') || '';
    if (!reduce) el.textContent = '0' + el._suffix;
  });
  function runCount(el) {
    if (el._done || reduce) return;
    el._done = true;
    var dur = el._target > 1000 ? 2200 : 1600, t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      el.textContent = fmt(el._target * easeOutExpo(p)) + el._suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- dashboard bars (demo data, deterministic) ---------- */
  var barsEl = $('#bars');
  if (barsEl) {
    var seed = 7, html = '';
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 45; i++) {
      var base = 22 + i * 0.9 + rnd() * 38 + (rnd() > 0.88 ? 30 : 0);
      var cls = '';
      if (i > 3 && rnd() > 0.9) { base = 4; cls = 'dead'; }
      if (i < 4) cls = 'out';
      html += '<i class="' + cls + '" style="--h:' + Math.min(96, base).toFixed(1) + '%;--dl:' + (i * 0.022).toFixed(3) + 's"></i>';
    }
    barsEl.innerHTML = html;
  }

  /* ---------- reveal observer ---------- */
  var revealEls = $$('[data-reveal]');
  if (hl) revealEls.push(hl);
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        $$('[data-count]', en.target).forEach(runCount);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
    // counters not inside a reveal container
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { if (!el.closest('[data-reveal]')) cio.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
    counters.forEach(function (el) { el.textContent = fmt(el._target) + el._suffix; });
  }

  /* ---------- active nav link ---------- */
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.nav ul a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = links[en.target.id];
        if (a && en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          a.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = doc.getElementById(id); if (s) sio.observe(s); });
  }

  /* ---------- Compose Guard demo ---------- */
  var cmp = $('#composer');
  if (cmp) {
    var typed = $('.cmp-typed', cmp), caret = $('.caret', cmp), replying = $('.cmp-replying', cmp);
    var badge = $('.guard-badge', cmp), btext = $('.guard-text', cmp), tip = $('.guard-tip', cmp);
    var BASE = 'Most creators ignore the 90-day window. Old days drop out every morning. ';
    var BAD = 'Repost if you agree';
    var FIX = 'How do you plan around it?';
    var BAD_LABEL = 'Solicitation phrase: "repost if you agree"';
    var OK_LABEL = 'Counts toward rewards';
    var REPLY = 'Totally agree, the 90-day window is the part most people miss.';
    function setBadge(state, label, tipText) {
      badge.className = 'guard-badge ' + state;
      void badge.offsetWidth; badge.classList.add('pop');
      btext.textContent = label;
      cmp.setAttribute('data-state', state);
      if (tipText) { tip.textContent = tipText; tip.hidden = false; } else { tip.hidden = true; }
    }
    function show(text, flag) {
      var at = flag ? text.indexOf(flag) : -1;
      if (at < 0) { typed.textContent = text; return; }
      typed.innerHTML = '';
      typed.appendChild(doc.createTextNode(text.slice(0, at)));
      var m = doc.createElement('mark'); m.textContent = text.slice(at, at + flag.length); typed.appendChild(m);
      typed.appendChild(doc.createTextNode(text.slice(at + flag.length)));
    }
    if (reduce) {
      show(BASE + FIX); setBadge('ok', OK_LABEL);
      if (caret) caret.style.display = 'none';
    } else {
      /* script: type the post, flag the CTA (red), erase it, rewrite (green), then show a reply */
      var visible = false, runId = 0;
      var wait = function (ms) { var id = runId; return new Promise(function (res, rej) { setTimeout(function () { id === runId ? res() : rej(new Error('stale')); }, ms); }); };
      var typeTo = async function (from, to, flag, onEach) {
        for (var i = from.length; i <= to.length; i++) {
          show(to.slice(0, i), flag && to.slice(0, i).indexOf(flag) >= 0 ? flag : null);
          if (onEach) onEach(to.slice(0, i));
          await wait(26 + Math.random() * 42);
        }
      };
      var eraseTo = async function (from, to, flag) {
        for (var i = from.length; i >= to.length; i -= 2) {
          var cur = from.slice(0, Math.max(i, to.length));
          show(cur, flag && cur.indexOf(flag) >= 0 ? flag : null);
          await wait(22);
        }
        show(to);
      };
      var loop = async function (id) {
        while (id === runId) {
          replying.hidden = true; typed.textContent = ''; setBadge('idle', 'Checking as you type…');
          await wait(500);
          var flagged = false;
          await typeTo('', BASE + BAD, BAD, function (cur) {
            if (!flagged && cur.length === BASE.length + BAD.length) { flagged = true; setBadge('bad', BAD_LABEL, 'Engagement ask. Try ending with a real question.'); }
          });
          await wait(2400);
          await eraseTo(BASE + BAD, BASE, BAD);
          setBadge('idle', 'Checking as you type…');
          await typeTo(BASE, BASE + FIX);
          setBadge('ok', OK_LABEL);
          await wait(3000);
          await eraseTo(BASE + FIX, '');
          replying.hidden = false; setBadge('idle', 'Checking as you type…');
          await typeTo('', REPLY, null, function (cur) { if (cur.length === 6) setBadge('warn', "Replies don't count"); });
          await wait(2600);
          await eraseTo(REPLY, '');
        }
      };
      var start = function () { runId++; loop(runId).catch(function () {}); };
      typed.textContent = ''; setBadge('idle', 'Checking as you type…');
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          var was = visible; visible = en[0].isIntersecting;
          if (visible && !was) start();
          else if (!visible && was) runId++;
        }, { threshold: 0.35 }).observe(cmp);
      } else { visible = true; start(); }
    }
  }

  /* ---------- micro-interactions (desktop pointers only) ---------- */
  if (finePointer && !reduce) {
    $$('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
    $$('.tilt').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-4px)';
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
    var g1 = $('.hero .g2'), heroEl = $('.hero');
    if (g1 && heroEl) {
      heroEl.addEventListener('pointermove', function (e) {
        var r = heroEl.getBoundingClientRect();
        g1.style.translate = (((e.clientX - r.left) / r.width - 0.5) * 60).toFixed(1) + 'px ' + (((e.clientY - r.top) / r.height - 0.5) * 40).toFixed(1) + 'px';
      });
    }
  }

  /* ---------- FAQ smooth accordion ---------- */
  $$('.faq details').forEach(function (d) {
    var s = $('summary', d), body = $('.ans', d);
    if (!s || !body || reduce || !body.animate) return;
    s.addEventListener('click', function (e) {
      e.preventDefault();
      if (d._anim) d._anim.cancel();
      if (!d.open) {
        d.open = true;
        var h = body.scrollHeight;
        d._anim = body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
      } else {
        var h2 = body.scrollHeight;
        d._anim = body.animate([{ height: h2 + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.4,0,.2,1)' });
        d._anim.onfinish = function () { d.open = false; };
      }
    });
  });

})();
