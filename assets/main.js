(function () {
  var doc = document.documentElement;

  // Languages are separate URLs (/ and /en/), so there is no client-side swapping.
  // Elements in the page are already in the page's own language.

  // ---------- enquiry forms ----------
  var MSG = {
    hi: { required: 'यह जानकारी ज़रूरी है', email: 'कृपया सही ईमेल लिखें', phone: 'कृपया सही मोबाइल नंबर लिखें', consent: 'आगे बढ़ने के लिए सहमति ज़रूरी है',
          fix: 'कृपया चिह्नित फ़ील्ड ठीक करें।', fail: 'भेजा नहीं जा सका। कृपया दोबारा कोशिश करें, या सीधे लिखें:', sending: 'भेजा जा रहा है…' },
    en: { required: 'This field is required', email: 'Please enter a valid email', phone: 'Please enter a valid mobile number', consent: 'Consent is needed to continue',
          fix: 'Please fix the highlighted fields.', fail: 'Could not send. Please try again, or write to us directly:', sending: 'Sending…' }
  };
  function msg(k) { return MSG[doc.lang === 'en' ? 'en' : 'hi'][k]; }

  function clearFormErrors() {
    [].forEach.call(document.querySelectorAll('.field.invalid'), function (f) { f.classList.remove('invalid'); var e = f.querySelector('.err'); if (e) e.remove(); });
    [].forEach.call(document.querySelectorAll('.form-status'), function (p) { p.textContent = ''; });
  }
  function setError(field, key) {
    field.classList.add('invalid');
    var e = field.querySelector('.err');
    if (!e) { e = document.createElement('small'); e.className = 'err'; field.appendChild(e); }
    e.setAttribute('data-key', key);
    e.textContent = msg(key);
  }
  function enLabel(field) {
    var l = field.querySelector('label span[data-en], legend[data-en]');
    return l ? l.getAttribute('data-en') : '';
  }

  function validate(form) {
    var first = null;
    [].forEach.call(form.querySelectorAll('.field'), function (field) {
      field.classList.remove('invalid');
      var old = field.querySelector('.err'); if (old) old.remove();
      var inp = field.querySelector('input, select, textarea');
      if (!inp || inp.disabled || field.hidden) return;
      var v = (inp.type === 'checkbox' ? '' : inp.value.trim()), bad = null;
      if (inp.required) {
        if (inp.type === 'checkbox') { if (!inp.checked) bad = field.classList.contains('consent') ? 'consent' : 'required'; }
        else if (!v) bad = 'required';
      }
      if (!bad && v && inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) bad = 'email';
      if (!bad && v && inp.type === 'tel') { var d = v.replace(/[\s\-()+]/g, ''); if (!/^\d{10,13}$/.test(d)) bad = 'phone'; }
      if (bad) { setError(field, bad); if (!first) first = inp; }
    });
    return first;
  }

  function collect(form) {
    var fields = {}, labels = {};
    [].forEach.call(form.querySelectorAll('.field'), function (field) {
      var inputs = field.querySelectorAll('input, select, textarea');
      if (!inputs.length || field.hidden || field.classList.contains('consent')) return;
      var name = inputs[0].name, label = enLabel(field) || name;
      if (field.classList.contains('chips')) {
        var picked = [].filter.call(inputs, function (i) { return i.checked; }).map(function (i) { return i.value; });
        if (picked.length) { fields[name] = picked; labels[name] = label; }
      } else if (!inputs[0].disabled && inputs[0].value.trim()) { fields[name] = inputs[0].value.trim(); labels[name] = label; }
    });
    return { fields: fields, labels: labels };
  }

  function utm() {
    var o = {}; try { new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_|^gclid$|^fbclid$/.test(k)) o[k] = v; }); } catch (e) {}
    return o;
  }

  function finish(form, mode) {
    form.querySelector('.form-fields').hidden = true;
    var done = form.querySelector('.form-done');
    done.hidden = false;
    done.querySelector('.done-sent').hidden = mode !== 'sent';
    done.querySelector('.done-mail').hidden = mode !== 'mail';
    done.focus();
    celebrate(done);
  }

  function initForm(form) {
    var status = form.querySelector('.form-status'), btn = form.querySelector('.submit');

    // conditional fields, e.g. seats only for corporate table / group booking
    [].forEach.call(form.querySelectorAll('[data-when]'), function (f) {
      var src = form.elements[f.getAttribute('data-when')], vals = f.getAttribute('data-values').split('|');
      var inp = f.querySelector('input, select, textarea');
      function sync() { var on = vals.indexOf(src.value) > -1; f.hidden = !on; inp.disabled = !on; if (!on) inp.value = ''; }
      src.addEventListener('change', sync); sync();
    });

    // dependent select, e.g. nomination category follows the chosen track
    [].forEach.call(form.querySelectorAll('[data-depends]'), function (f) {
      var src = form.elements[f.getAttribute('data-depends')], sel = f.querySelector('select');
      var all = [].slice.call(sel.options), placeholder = all[0], opts = all.slice(1);
      function sync() {
        var t = src.value; sel.innerHTML = ''; sel.appendChild(placeholder);
        opts.forEach(function (o) { var k = o.getAttribute('data-track'); if (t && (k === t || k === '*' || (t === 'Not sure' && k === '*'))) sel.appendChild(o); });
        sel.value = ''; placeholder.selected = true;
        sel.disabled = !t;
      }
      src.addEventListener('change', sync); sync();
    });

    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) { field.classList.remove('invalid'); var er = field.querySelector('.err'); if (er) er.remove(); }
    });
    form.addEventListener('change', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) { field.classList.remove('invalid'); var er = field.querySelector('.err'); if (er) er.remove(); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';
      if (form.elements.website && form.elements.website.value) { finish(form, 'sent'); return; }   // honeypot
      var bad = validate(form);
      if (bad) { status.textContent = msg('fix'); bad.focus(); return; }

      var data = collect(form), cfg = window.NBT_FORMS || {};
      var payload = { form: form.getAttribute('data-form'), submittedAt: new Date().toISOString(), page: location.pathname.split('/').pop() || 'index.html',
                      lang: doc.lang, utm: utm(), referrer: document.referrer || '', fields: data.fields };
      btn.disabled = true; status.textContent = msg('sending');

      if (cfg.endpoint) {
        fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
          .then(function (r) { if (!r.ok && r.type !== 'opaque') throw new Error(r.status); status.textContent = ''; finish(form, 'sent'); })
          .catch(function () {
            btn.disabled = false;
            status.innerHTML = '';
            status.appendChild(document.createTextNode(msg('fail') + ' '));
            var a = document.createElement('a'); a.href = 'mailto:' + form.getAttribute('data-to'); a.textContent = form.getAttribute('data-to'); status.appendChild(a);
          });
        return;
      }

      // no backend configured: hand the lead to the right person by email
      var lines = Object.keys(data.fields).map(function (k) {
        var v = data.fields[k]; return data.labels[k] + ': ' + (Array.isArray(v) ? v.join(', ') : v);
      });
      lines.push('', 'Source: ' + payload.page + ' (' + payload.lang + ')');
      var names = { registration: 'Delegate registration', partnership: 'Partnership enquiry', nomination: 'Nomination enquiry' };
      var who = data.fields.name || '';
      var href = 'mailto:' + form.getAttribute('data-to') + '?subject=' + encodeURIComponent('NBT Vasudha 2027 — ' + names[payload.form] + (who ? ' — ' + who : '')) + '&body=' + encodeURIComponent(lines.join('\n'));
      finish(form, 'mail');
      form.querySelector('.mail-fallback').href = href;
      window.location.href = href;
    });
  }
  [].forEach.call(document.querySelectorAll('form[data-form]'), initForm);


  // ---------- motion preferences ----------
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var finePointer = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);
  var scrubs = [];

  // confetti burst on a successful form submission
  function celebrate(host) {
    if (reduce) return;
    var box = document.createElement('div'), colors = ['#f2c25b', '#34d399', '#fff1c9', '#2dd4bf', '#fb923c', '#a78bfa'];
    box.className = 'confetti';
    for (var i = 0; i < 46; i++) {
      var p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 170;
      p.style.setProperty('--x', (Math.cos(a) * d).toFixed(1) + 'px');
      p.style.setProperty('--y', (Math.sin(a) * d * 0.8 + 60).toFixed(1) + 'px');
      p.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      p.style.setProperty('--c', colors[i % colors.length]);
      p.style.setProperty('--dl', (Math.random() * 0.15).toFixed(2) + 's');
      box.appendChild(p);
    }
    host.appendChild(box);
    setTimeout(function () { box.remove(); }, 2200);
  }

  // ---------- mobile menu ----------
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  });

  // ---------- reveal on scroll (staggered among siblings) ----------
  var els = [].slice.call(document.querySelectorAll('.reveal'));
  els.forEach(function (el) {
    var sib = [].filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
    var i = sib.indexOf(el);
    if (i > 0) el.style.setProperty('--rd', Math.min(i, 6) * 90 + 'ms');
  });
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in-view'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // ---------- scrollspy for the main nav ----------
  var links = [].slice.call(nav.querySelectorAll('a[href^="#"]:not(.cta)'));
  var map = links.map(function (a) { return { a: a, t: document.querySelector(a.getAttribute('href')) }; }).filter(function (x) { return x.t; });
  function spy() {
    var y = window.scrollY + 120, cur = null;
    map.forEach(function (x) { if (x.t.offsetTop <= y) cur = x; });
    links.forEach(function (a) { a.classList.toggle('active', !!cur && cur.a === a); });
  }

  // ---------- word-by-word scrub on the big intro paragraphs ----------
  function escapeHtml(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function buildScrub() {
    if (reduce) return;
    scrubs = [].map.call(document.querySelectorAll('.scrub'), function (el) {
      el.innerHTML = el.textContent.split(/(\s+)/).map(function (t) {
        return /^\s*$/.test(t) ? t : '<span class="w">' + escapeHtml(t) + '</span>';
      }).join('');
      return { el: el, words: [].slice.call(el.querySelectorAll('.w')), lit: -1 };
    });
    requestAnimationFrame(function () { scrubUpdate(window.innerHeight, true); });
  }
  function scrubUpdate(vh, force) {
    scrubs.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.3)));
      var n = Math.round(p * s.words.length);
      if (n === s.lit && !force) return;
      s.lit = n;
      s.words.forEach(function (w, i) {
        w.classList.toggle('on', i < n);
        w.classList.toggle('hot', i < n && i >= n - 3 && n < s.words.length);
      });
    });
  }
  requestAnimationFrame(buildScrub);
  document.addEventListener('langchange', buildScrub);

  // ---------- scroll-driven: header glass, progress bar, timeline, horizon parallax ----------
  var header = document.querySelector('.site-header');
  var progress = document.querySelector('.progress span');
  var sched = document.querySelector('.schedule');
  var schedItems = sched ? [].slice.call(sched.children) : [];
  var horizon = document.querySelector('.horizon');
  var layers = horizon ? [].slice.call(horizon.querySelectorAll('[data-depth]')) : [];
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
    header.classList.toggle('scrolled', y > 24);
    if (progress) progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    if (sched) {
      var r = sched.getBoundingClientRect(), mid = vh * 0.62;
      sched.style.setProperty('--p', Math.min(1, Math.max(0, (mid - r.top) / r.height)).toFixed(4));
      schedItems.forEach(function (li) { li.classList.toggle('lit', li.getBoundingClientRect().top + 30 < mid); });
    }
    scrubUpdate(vh);
    if (layers.length && !reduce) {
      var hr = horizon.getBoundingClientRect();
      if (hr.top < vh && hr.bottom > 0) {
        var hp = 1 - Math.min(1, Math.max(0, (vh - hr.top) / (vh + hr.height)));
        layers.forEach(function (g) { g.style.transform = 'translateY(' + (hp * parseFloat(g.getAttribute('data-depth')) * 70).toFixed(1) + 'px)'; });
      }
    }
    spy();
  }
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  window.addEventListener('load', requestTick);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestTick);

  // ---------- animated counters ----------
  var counters = [].slice.call(document.querySelectorAll('.count'));
  if (!reduce && 'IntersectionObserver' in window) {
    counters.forEach(function (c) { c.textContent = '0'; });
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target, to = +el.getAttribute('data-to'), t0 = performance.now(), dur = 1300 + to * 25;
        (function step(now) {
          var k = Math.min(1, (now - t0) / dur);
          el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  // ---------- live countdowns ----------
  [].forEach.call(document.querySelectorAll('[data-countdown]'), function (box) {
    var target = new Date(box.getAttribute('data-countdown')).getTime(), cells = {}, timer;
    [].forEach.call(box.querySelectorAll('[data-unit]'), function (b) { cells[b.getAttribute('data-unit')] = b; });
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) { box.hidden = true; clearInterval(timer); return; }
      var s = Math.floor(diff / 1000);
      var vals = { d: String(Math.floor(s / 86400)), h: pad(Math.floor(s % 86400 / 3600)), m: pad(Math.floor(s % 3600 / 60)), s: pad(s % 60) };
      Object.keys(vals).forEach(function (k) {
        var c = cells[k];
        if (!c || c.textContent === vals[k]) return;
        c.textContent = vals[k];
        if (!reduce) { c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick'); }
      });
    }
    timer = setInterval(tick, 1000);
    tick();
  });

  // "nominations close in N days" chip (re-filled after a language switch)
  function fillDays() {
    [].forEach.call(document.querySelectorAll('[data-days-to]'), function (b) {
      var d = Math.ceil((new Date(b.getAttribute('data-days-to')).getTime() - Date.now()) / 86400000);
      var wrap = b.closest('[data-days-wrap]');
      if (d < 0) { if (wrap) wrap.hidden = true; return; }
      b.textContent = d;
    });
  }
  fillDays();
  document.addEventListener('langchange', fillDays);

  // ---------- key-dates timeline: mark passed and upcoming milestones ----------
  [].forEach.call(document.querySelectorAll('.dates'), function (ol) {
    var items = [].slice.call(ol.children), now = Date.now(), next = -1;
    items.forEach(function (li, i) {
      var t = li.querySelector('time[datetime]');
      if (!t) return;
      var end = new Date(t.getAttribute('datetime') + 'T23:59:59+05:30').getTime();
      if (end < now) li.classList.add('done');
      else if (next < 0) { next = i; li.classList.add('next'); }
    });
    var p = next < 0 ? 1 : next === 0 ? 0 : (next - 0.5) / (items.length - 1);
    if (reduce || !('IntersectionObserver' in window)) { ol.style.setProperty('--p', p.toFixed(3)); return; }
    var dio = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { ol.style.setProperty('--p', p.toFixed(3)); dio.disconnect(); }
    }, { threshold: 0.3 });
    dio.observe(ol);
  });

  // ---------- "choose this pass" pre-fills the registration form ----------
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-pick]');
    if (!a) return;
    var sel = document.getElementById('reg-pass');
    if (!sel) return;
    sel.value = a.getAttribute('data-pick');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    var f = sel.closest('.field');
    f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash');
  });

  // ---------- category explorer: tabs, search, nominate-in-category ----------
  (function () {
    var ui = document.querySelector('.cat-ui'); if (!ui) return;
    var tabs = [].slice.call(ui.querySelectorAll('.cat-tab')), panels = [].slice.call(ui.querySelectorAll('.cat-panel'));
    var q = document.getElementById('cat-q'), empty = ui.querySelector('.cat-empty');
    function show(i, focus) {
      tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach(function (p, k) { p.hidden = k !== i; });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { if (q.value) { q.value = ''; filter(); } show(i); });
      t.addEventListener('keydown', function (e) {
        var d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); show((i + d + tabs.length) % tabs.length, true); }
      });
    });
    function filter() {
      var v = q.value.trim().toLowerCase(), any = false;
      ui.classList.toggle('searching', !!v);
      panels.forEach(function (p) {
        var hits = 0;
        [].forEach.call(p.querySelectorAll('.cat'), function (c) {
          var hay = (c.textContent + ' ' + c.getAttribute('data-name')).toLowerCase();
          var ok = !v || hay.indexOf(v) > -1; c.hidden = !ok; if (ok) hits++;
        });
        p.classList.toggle('nomatch', !!v && !hits);
        if (hits) any = true;
      });
      empty.hidden = !v || any;
    }
    // category detail panels are built on first open (keeps the initial DOM small)
    var T = { hi: ['मान्यता समूह', 'इस श्रेणी के लिए प्लान चुनें →', 'इस श्रेणी को जोड़ें +'], en: ['Recognition group', 'Choose a plan for this category →', 'Add this category +'] };
    ui.addEventListener('toggle', function (e) {
      var d = e.target;
      if (!d.classList || !d.classList.contains('cat') || !d.open || d.querySelector('.cat-body')) return;
      var t = T[doc.lang === 'en' ? 'en' : 'hi'], panel = d.closest('.cat-panel');
      var body = document.createElement('div'); body.className = 'cat-body';
      var p = document.createElement('p'), b = document.createElement('b');
      b.textContent = panel.querySelector('h3').textContent;
      p.appendChild(document.createTextNode(t[0] + ': ')); p.appendChild(b);
      var a = document.createElement('a'); a.className = 'btn gold sm'; a.href = '#fees';
      a.setAttribute('data-cat-pick', ''); a.setAttribute('data-group', panel.getAttribute('data-group')); a.setAttribute('data-name', d.getAttribute('data-name'));
      var dlg = ui.closest('dialog'); a.textContent = dlg && dlg.getAttribute('data-mode') === 'pick' ? t[2] : t[1];
      body.appendChild(p); body.appendChild(a); d.appendChild(body);
    }, true);
    q.addEventListener('input', filter);
    document.addEventListener('langchange', filter);
  })();

  // marquee: second half is a visual duplicate for the seamless loop
  [].forEach.call(document.querySelectorAll('.mq-track'), function (t) {
    var k = t.children, half = k.length / 2;
    for (var i = half; i < k.length; i++) k[i].classList.add('dup');
  });

  // ---------- hero particle field ----------
  function particles(canvas) {
    var ctx = canvas.getContext('2d'), host = canvas.parentNode, dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, ps = [], running = false, raf;
    var palette = canvas.closest('.hero-awards') ? ['242,194,91', '255,241,201', '227,154,45', '255,255,255'] : ['52,211,153', '242,194,91', '167,243,208'];
    function spawn(anywhere) {
      return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10, r: 0.6 + Math.random() * 2.2, vy: 0.15 + Math.random() * 0.55,
               ph: Math.random() * 6.28, sp: 0.005 + Math.random() * 0.02, c: palette[(Math.random() * palette.length) | 0] };
    }
    function size() {
      W = host.clientWidth; H = host.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(W < 720 ? 28 : 70, W / 18)); ps = [];
      for (var i = 0; i < n; i++) ps.push(spawn(true));
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.shadowBlur = 10;
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        p.y -= p.vy; p.ph += p.sp; p.x += Math.sin(p.ph) * 0.35;
        if (p.y < -10) { p = ps[i] = spawn(false); }
        var a = 0.35 + Math.sin(p.ph * 2) * 0.3;
        ctx.fillStyle = 'rgba(' + p.c + ',' + a.toFixed(3) + ')';
        ctx.shadowColor = 'rgba(' + p.c + ',.9)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    size();
    window.addEventListener('resize', size);
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      if (vis && !running) { running = true; frame(); }
      else if (!vis && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(host);
  }
  var conn = navigator.connection || {};
  var slowNet = conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || '');
  var lowPower = (navigator.hardwareConcurrency || 4) < 4 || (navigator.deviceMemory || 4) < 4;
  if (!reduce && !slowNet && !lowPower) {
    var idle = window.requestIdleCallback || function (f) { setTimeout(f, 1200); };
    window.addEventListener('load', function () {
      idle(function () {
        [].forEach.call(document.querySelectorAll('.hero'), function (h) {
          var c = document.createElement('canvas'); c.className = 'fx-particles'; c.setAttribute('aria-hidden', 'true');
          h.insertBefore(c, h.querySelector('.hero-grid')); particles(c);
        });
      });
    });
  }

  // ---------- pointer effects (mouse / trackpad only) ----------
  if (!reduce && finePointer) {
    [].forEach.call(document.querySelectorAll('.hero'), function (h) {
      h.addEventListener('pointermove', function (e) {
        var r = h.getBoundingClientRect();
        h.style.setProperty('--px', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
        h.style.setProperty('--py', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
      });
      h.addEventListener('pointerleave', function () { h.style.setProperty('--px', 0); h.style.setProperty('--py', 0); });
    });
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.glow-card');
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
    [].forEach.call(document.querySelectorAll('.tilt'), function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 8).toFixed(2) + 'deg) rotateY(' + (x * 10).toFixed(2) + 'deg)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    [].forEach.call(document.querySelectorAll('.magnetic'), function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.translate = ((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1) + 'px';
      });
      el.addEventListener('pointerleave', function () { el.style.translate = ''; });
    });
  }


  // Individual / Corporate plan switch (both panels stay visible without JS).
  (function () {
    var tabs = document.querySelectorAll('.plan-switch [role=tab]');
    if (!tabs.length) return;
    function show(tab) {
      for (var i = 0; i < tabs.length; i++) {
        var on = tabs[i] === tab;
        tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
        tabs[i].tabIndex = on ? 0 : -1;
        document.getElementById(tabs[i].getAttribute('aria-controls')).hidden = !on;
      }
    }
    for (var i = 0; i < tabs.length; i++) (function (t, k) {
      t.addEventListener('click', function () { show(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var o = tabs[1 - k]; show(o); o.focus(); }
      });
    })(tabs[i], i);
    show(tabs[0]);
    // choosing a plan from the form-side links / hash switches to the right group
    document.addEventListener('click', function (e) {
      var pl = e.target.closest && e.target.closest('[data-plan]');
      if (pl && /^Corporate/.test(pl.getAttribute('data-plan'))) show(tabs[1]);
    });
  })();

  // ---------- register flow: sectors -> plan -> registration popup -> review -> payment ----------
  (function () {
    var reg = document.getElementById('reg-modal'), catM = document.getElementById('cat-modal');
    if (!reg || !catM) return;
    var EN = doc.lang === 'en';
    function T(hi, en) { return EN ? en : hi; }
    var cfg = window.NBT_PAY || {}, forms = window.NBT_FORMS || {};
    var GST = cfg.gstRate != null ? +cfg.gstRate : 18;
    var SUPPORT = 'sagun.kumari@timesinternet.in';

    var plans = {}, order = [];
    [].forEach.call(document.querySelectorAll('button[data-plan]'), function (b) {
      var n = b.getAttribute('data-plan');
      plans[n] = { name: n, label: b.getAttribute(EN ? 'data-label-en' : 'data-label-hi'), price: +b.getAttribute('data-price'), cats: +b.getAttribute('data-cats') };
      order.push(n);
    });

    // no <dialog> support: fall back to email so "Select Plan" never dead-ends
    if (!reg.showModal) {
      document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button[data-plan]'); if (!b) return;
        location.href = 'mailto:' + SUPPORT + '?subject=' + encodeURIComponent('NBT Vasudha Awards 2027 — ' + b.getAttribute('data-plan'));
      });
      return;
    }

    var form = document.getElementById('reg-form'), views = {}, steps = [].slice.call(reg.querySelectorAll('.steps li'));
    [].forEach.call(reg.querySelectorAll('.rview'), function (v) { views[v.getAttribute('data-view')] = v; });
    function $(id) { return document.getElementById(id); }
    var status = $('reg-status'), rvStatus = $('rv-status'), payBtn = $('rv-pay'), selPlan = form.elements.plan, selSector = form.elements.sector;
    var chips = $('reg-chips'), list = $('reg-list'), need = $('reg-need'), catsErr = $('reg-cats-err'), note = $('pre-note');

    // category catalogue, read from the explorer markup (English keys are language-independent)
    var groups = [];
    [].forEach.call(catM.querySelectorAll('.cat-panel'), function (p) {
      var g = { key: p.getAttribute('data-group'), label: p.querySelector('h3').textContent, items: [] };
      [].forEach.call(p.querySelectorAll('.cat'), function (c) { g.items.push({ key: c.getAttribute('data-name'), label: c.querySelector('summary span').textContent, group: g }); });
      groups.push(g);
    });
    function opt(sel, v, t) { var o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o); return o; }
    order.forEach(function (n) { opt(selPlan, n, plans[n].label + ' — ₹' + plans[n].price.toLocaleString('en-IN') + ' + GST'); });
    var ph = opt(selSector, '', T('क्षेत्र चुनें', 'Select a sector')); 
    groups.forEach(function (g) { opt(selSector, g.key, g.label); });

    var cur = null, sel = [], preCat = null, ref = null, done = false;
    function money(n) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function calc(p) { var gst = Math.round(p.price * GST) / 100; return { base: p.price, gst: gst, total: Math.round((p.price + gst) * 100) / 100 }; }

    function showView(v) {
      Object.keys(views).forEach(function (k) { views[k].hidden = k !== v; });
      var n = { form: 0, review: 1, result: 2 }[v];
      steps.forEach(function (li, i) { li.classList.toggle('on', i <= n); if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      reg.scrollTop = 0;
      var h = views[v].querySelector('h2'); if (h) h.focus({ preventScroll: true });
    }

    function setPlan(n) {
      cur = plans[n]; selPlan.value = n;
      $('reg-plan-name').textContent = cur.label;
      $('reg-plan-price').textContent = '₹' + cur.price.toLocaleString('en-IN');
      need.textContent = T('(' + cur.cats + ' चुनें)', '(choose ' + cur.cats + ')');
      if (sel.length > cur.cats) sel = sel.slice(0, cur.cats);
      renderPick();
    }

    function renderPick() {
      chips.textContent = '';
      sel.forEach(function (it) {
        var c = document.createElement('button'); c.type = 'button'; c.className = 'chip-sel';
        c.textContent = it.label + ' ×';
        c.setAttribute('aria-label', T('हटाएँ: ', 'Remove: ') + it.label);
        c.addEventListener('click', function () { sel.splice(sel.indexOf(it), 1); renderPick(); });
        chips.appendChild(c);
      });
      var cnt = document.createElement('span'); cnt.className = 'chip-count'; cnt.textContent = sel.length + ' / ' + cur.cats + T(' चुनी गईं', ' selected'); chips.appendChild(cnt);
      list.textContent = '';
      var g = groups.filter(function (k) { return k.key === selSector.value; })[0];
      if (!g) { var h = document.createElement('p'); h.className = 'pick-hint'; h.textContent = T('श्रेणियाँ देखने के लिए क्षेत्र चुनें, या “सभी श्रेणियाँ देखें” दबाएँ।', 'Choose a sector to see its categories, or press “View All Categories”.'); list.appendChild(h); return; }
      g.items.forEach(function (it) {
        var on = sel.indexOf(it) > -1;
        var l = document.createElement('label'); l.className = 'pick-item';
        var i = document.createElement('input'); i.type = 'checkbox'; i.checked = on; i.disabled = !on && cur.cats > 1 && sel.length >= cur.cats;
        i.addEventListener('change', function () {
          if (i.checked) { if (cur.cats === 1) sel = [it]; else if (sel.length < cur.cats) sel.push(it); }
          else sel.splice(sel.indexOf(it), 1);
          catsErr.hidden = true; renderPick();
        });
        var t = document.createElement('span'); t.textContent = it.label;
        l.appendChild(i); l.appendChild(t); list.appendChild(l);
      });
    }

    function addByKey(key) {
      var it = null; groups.forEach(function (g) { g.items.forEach(function (x) { if (x.key === key) it = x; }); });
      if (!it) return;
      if (sel.indexOf(it) < 0) {
        if (cur.cats === 1) sel = [it];
        else if (sel.length < cur.cats) sel.push(it);
        else { catsErr.hidden = false; catsErr.textContent = T('इस प्लान में अधिकतम ' + cur.cats + ' श्रेणियाँ चुनी जा सकती हैं। नई जोड़ने के लिए पहले एक हटाएँ।', 'This plan allows up to ' + cur.cats + ' categories. Remove one to add another.'); }
      }
      selSector.value = it.group.key; renderPick();
    }

    function openReg(name) {
      setPlan(name);
      if (preCat && !sel.length) addByKey(preCat);
      status.textContent = ''; catsErr.hidden = true;
      showView('form'); reg.showModal();
    }
    function openCat(i, pick) {
      catM.setAttribute('data-mode', pick ? 'pick' : 'browse');
      var t = { hi: ['इस श्रेणी को जोड़ें +', 'इस श्रेणी के लिए प्लान चुनें →'], en: ['Add this category +', 'Choose a plan for this category →'] }[EN ? 'en' : 'hi'];
      [].forEach.call(catM.querySelectorAll('.cat-body a'), function (a) { a.textContent = pick ? t[0] : t[1]; });
      if (i !== 'all') { var tab = catM.querySelectorAll('.cat-tab')[+i]; if (tab) tab.click(); }
      catM.showModal(); catM.scrollTop = 0;
    }

    document.addEventListener('click', function (e) {
      var t = e.target; if (!t.closest) return;
      var b = t.closest('button[data-plan]'); if (b) { openReg(b.getAttribute('data-plan')); return; }
      var o = t.closest('[data-open-cat]'); if (o) { openCat(o.getAttribute('data-open-cat'), false); return; }
      var card = t.closest('.sector'); if (card && !t.closest('a')) { card.querySelector('[data-open-cat]').click(); return; }
      var x = t.closest('[data-close]'); if (x) { x.closest('dialog').close(); return; }
      var p = t.closest('[data-cat-pick]');
      if (p) {
        e.preventDefault();
        var key = p.getAttribute('data-name');
        if (catM.getAttribute('data-mode') === 'pick') { addByKey(key); catM.close(); return; }
        preCat = key; catM.close();
        var it = null; groups.forEach(function (g) { g.items.forEach(function (y) { if (y.key === key) it = y; }); });
        if (it) { note.hidden = false; note.textContent = T('चुनी गई श्रेणी: ', 'Category selected: ') + it.label + T(' — अब अपना प्लान चुनें।', ' — now choose your plan.'); }
        $('fees').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      }
    });
    [reg, catM].forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d) d.close(); }); });
    $('reg-viewall').addEventListener('click', function () { openCat('all', true); });
    selSector.addEventListener('change', renderPick);
    selPlan.addEventListener('change', function () { setPlan(selPlan.value); });
    reg.addEventListener('close', function () { if (done) { form.reset(); sel = []; ref = null; done = false; preCat = null; note.hidden = true; clearFormErrors(); showView('form'); } });

    // step 1 -> 2
    form.addEventListener('submit', function (e) {
      e.preventDefault(); status.textContent = '';
      if (form.elements.website.value) return;   // honeypot
      var bad = validate(form), okCats = sel.length === cur.cats;
      catsErr.hidden = okCats;
      if (!okCats) catsErr.textContent = T('कृपया ' + cur.cats + ' श्रेणी' + (cur.cats > 1 ? 'याँ' : '') + ' चुनें।', 'Please choose ' + cur.cats + ' categor' + (cur.cats > 1 ? 'ies' : 'y') + '.');
      if (bad || !okCats) { status.textContent = msg('fix'); (bad || selSector).focus(); return; }
      fillReview(); rvStatus.textContent = ''; payBtn.disabled = false; showView('review');
    });
    $('rv-back').addEventListener('click', function () { showView('form'); });

    function fillReview() {
      var f = form.elements, c = calc(cur), recap = $('rv-recap'); recap.textContent = '';
      [[T('नाम', 'Name'), f.name.value], [T('मोबाइल', 'Mobile'), f.mobile.value], [T('ईमेल', 'Email'), f.email.value],
       [T('संगठन', 'Organisation'), f.company.value], [T('पदनाम', 'Designation'), f.designation.value], [T('GSTIN', 'GSTIN'), f.gstin.value],
       [T('प्लान', 'Plan'), cur.label], [T('श्रेणियाँ', 'Categories'), sel.map(function (x) { return x.label; }).join(' · ')]
      ].forEach(function (r) { if (!r[1]) return; var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = r[0]; dd.textContent = r[1]; recap.appendChild(dt); recap.appendChild(dd); });
      var bill = $('rv-bill'); bill.textContent = '';
      [[T('प्लान शुल्क', 'Plan fee'), money(c.base)], ['GST @' + GST + '%', money(c.gst)], [T('कुल देय राशि', 'Total payable'), money(c.total)]].forEach(function (r, i) {
        var row = document.createElement('div'); row.className = 'bill-row' + (i === 2 ? ' total' : '');
        var a = document.createElement('span'), b = document.createElement('b'); a.textContent = r[0]; b.textContent = r[1]; row.appendChild(a); row.appendChild(b); bill.appendChild(row);
      });
    }

    // ----- payment -----
    function newRef() { return 'NBTV27-' + Date.now().toString(36).slice(-5).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
    function payload() {
      var f = form.elements, c = calc(cur), secs = [];
      sel.forEach(function (x) { if (secs.indexOf(x.group.key) < 0) secs.push(x.group.key); });
      return { form: 'registration', reference: ref, submittedAt: new Date().toISOString(), page: location.pathname.split('/').pop() || 'awards.html', lang: doc.lang, utm: utm(), referrer: document.referrer || '',
        plan: cur.name, amount: { base: c.base, gstRate: GST, gst: c.gst, total: c.total, currency: 'INR' },
        fields: { name: f.name.value.trim(), mobile: f.mobile.value.trim(), email: f.email.value.trim(), company: f.company.value.trim(), designation: f.designation.value.trim(), gstin: f.gstin.value.trim() },
        sectors: secs, categories: sel.map(function (x) { return x.key; }) };
    }
    function result(state, title, text, extra) {
      $('res-title').textContent = title; $('res-msg').textContent = text;
      $('res-refline').hidden = state === 'failed'; $('res-ref').textContent = ref || '';
      reg.querySelector('.res').setAttribute('data-state', state);
      $('res-retry').hidden = state !== 'failed'; $('res-mail').hidden = !(extra && extra.mail);
      if (extra && extra.mail) $('res-mail').href = extra.mail;
      showView('result');
      if (state === 'success') { done = true; celebrate(views.result); }
    }
    function fail(text) { payBtn.disabled = false; result('failed', T('भुगतान पूरा नहीं हुआ', 'Payment not completed'), text); }
    $('res-retry').addEventListener('click', function () { rvStatus.textContent = ''; payBtn.disabled = false; showView('review'); });

    function loadScript(src) {
      return new Promise(function (ok, no) {
        if (window.Razorpay) return ok();
        var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error('script')); }; document.head.appendChild(s);
      });
    }
    function post(url, body) {
      return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    }
    function online() {
      post(cfg.createOrderEndpoint, payload()).then(function (o) {
        if (!o || !o.orderId || !o.keyId) throw new Error('order');
        if (o.reference) ref = o.reference;
        return loadScript(cfg.checkoutScript || 'https://checkout.razorpay.com/v1/checkout.js').then(function () { openCheckout(o); });
      }).catch(function () { fail(T('भुगतान शुरू नहीं हो सका। कृपया दोबारा कोशिश करें, या हमसे संपर्क करें।', 'We could not start the payment. Please try again, or contact us.')); });
    }
    function openCheckout(o) {
      var f = form.elements;
      var rz = new window.Razorpay({
        key: o.keyId, amount: o.amount, currency: o.currency || 'INR', order_id: o.orderId, name: 'NBT Vasudha Awards 2027', description: cur.label,
        prefill: { name: f.name.value.trim(), email: f.email.value.trim(), contact: f.mobile.value.trim() }, notes: { reference: ref }, theme: { color: '#047857' },
        handler: verify,
        modal: { ondismiss: function () { payBtn.disabled = false; rvStatus.textContent = T('भुगतान रद्द किया गया। आप दोबारा कोशिश कर सकते हैं।', 'Payment was cancelled. You can try again.'); } }
      });
      rz.on('payment.failed', function () { fail(T('बैंक/कार्ड से भुगतान सफल नहीं हुआ। कृपया दोबारा कोशिश करें।', 'The payment was not successful. Please try again.')); });
      rz.open();
    }
    // a registration is only marked paid once the server has verified the gateway signature
    function verify(r) {
      rvStatus.textContent = T('भुगतान की पुष्टि हो रही है…', 'Verifying your payment…');
      if (!cfg.verifyEndpoint) { fail(T('भुगतान की पुष्टि सेटअप नहीं है। कृपया संदर्भ संख्या के साथ हमसे संपर्क करें: ', 'Payment verification is not set up. Please contact us with your reference: ') + ref); return; }
      post(cfg.verifyEndpoint, { reference: ref, razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature })
        .then(function (v) {
          if (!v || !v.ok) throw new Error('verify');
          if (v.reference) ref = v.reference;
          result('success', T('पंजीकरण की पुष्टि हो गई', 'Registration confirmed'), T('भुगतान सफल रहा। पुष्टि आपके ईमेल पर भेजी जाएगी; हमारी टीम नामांकन की अगली प्रक्रिया साझा करेगी।', 'Payment received. A confirmation will be emailed to you and our team will share the next steps for your nomination.'));
        })
        .catch(function () { fail(T('भुगतान की पुष्टि नहीं हो सकी। अगर राशि कट गई है तो संदर्भ संख्या के साथ हमसे संपर्क करें: ', 'We could not confirm the payment. If money was debited, contact us with your reference: ') + ref); });
    }
    // no payment gateway configured yet: hand the registration to the team, never claim it is paid
    function offline() {
      var p = payload(), pend = function (mail) {
        result('pending', T('पंजीकरण अनुरोध दर्ज हुआ', 'Registration request recorded'),
          T('ऑनलाइन भुगतान अभी चालू नहीं है। हमारी टीम आपसे संपर्क कर भुगतान लिंक साझा करेगी।', 'Online payment is not switched on yet. Our team will contact you and share a payment link.') + (mail ? T(' कृपया खुले हुए ईमेल को भेज दें।', ' Please press send on the email that opened.') : ''), { mail: mail });
      };
      if (forms.endpoint) {
        p.status = 'payment_pending';
        fetch(forms.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) })
          .then(function (r) { if (!r.ok && r.type !== 'opaque') throw new Error(r.status); pend(null); })
          .catch(function () { fail(T('भेजा नहीं जा सका। कृपया दोबारा कोशिश करें, या सीधे लिखें: ', 'Could not send. Please try again, or write to us directly: ') + SUPPORT); });
        return;
      }
      var f = p.fields, lines = ['Reference: ' + ref, 'Plan: ' + cur.name + ' (' + money(p.amount.total) + ' incl. GST)', 'Name: ' + f.name, 'Mobile: ' + f.mobile, 'Email: ' + f.email, 'Organisation: ' + f.company, 'Designation: ' + f.designation, 'GSTIN: ' + (f.gstin || '-'), 'Sectors: ' + p.sectors.join('; '), 'Categories: ' + p.categories.join('; ')];
      var href = 'mailto:' + SUPPORT + '?subject=' + encodeURIComponent('NBT Vasudha Awards 2027 — Registration ' + ref + ' — ' + f.name) + '&body=' + encodeURIComponent(lines.join('\n'));
      pend(href); location.href = href;
    }
    payBtn.addEventListener('click', function () {
      if (!ref) ref = newRef();
      payBtn.disabled = true; rvStatus.textContent = T('प्रोसेस हो रहा है…', 'Processing…');
      if (cfg.createOrderEndpoint) online(); else offline();
    });
  })();


  // Everything is wired up: switch on the JS-driven reveal state, then show the below-the-fold content once its CSS is in.
  doc.classList.remove('no-js');
  var restCss = document.getElementById('rest-css');
  function unveil() { doc.classList.remove('pending'); requestTick(); }
  if (restCss && !restCss.sheet) restCss.addEventListener('load', unveil); else unveil();
})();
