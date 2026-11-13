(function () {
  var doc = document.documentElement;
  var isEn = doc.lang === 'en';

  // ---------- Forms: validation + submit (endpoint from config.js, else pre-filled email) ----------
  var MSG = {
    hi: {
      required: 'यह जानकारी ज़रूरी है',
      email: 'कृपया सही ईमेल लिखें',
      phone: 'कृपया सही मोबाइल नंबर लिखें',
      consent: 'आगे बढ़ने के लिए सहमति ज़रूरी है',
      fix: 'कृपया चिह्नित फ़ील्ड ठीक करें।',
      fail: 'भेजा नहीं जा सका। कृपया दोबारा कोशिश करें या सीधे लिखें:',
      sending: 'भेजा जा रहा है…'
    },
    en: {
      required: 'This field is required',
      email: 'Please enter a valid email',
      phone: 'Please enter a valid mobile number',
      consent: 'Consent is needed to continue',
      fix: 'Please fix the highlighted fields.',
      fail: 'Could not send. Please try again or write to us directly:',
      sending: 'Sending…'
    }
  };
  function msg(k) { return MSG[isEn ? 'en' : 'hi'][k]; }

  function validate(form) {
    var first = null;
    [].forEach.call(form.querySelectorAll('.field'), function (field) {
      field.classList.remove('invalid');
      var old = field.querySelector('.err');
      if (old) old.remove();
      var inp = field.querySelector('input, select, textarea');
      if (!inp || inp.disabled || field.hidden) return;
      var v = inp.type === 'checkbox' ? '' : inp.value.trim();
      var bad = null;
      if (inp.required) {
        if (inp.type === 'checkbox') { if (!inp.checked) bad = 'consent'; }
        else if (!v) bad = 'required';
      }
      if (!bad && v && inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) bad = 'email';
      if (!bad && v && inp.type === 'tel' && !/^\d{10,13}$/.test(v.replace(/[\s\-()+]/g, ''))) bad = 'phone';
      if (bad) {
        field.classList.add('invalid');
        inp.setAttribute('aria-invalid', 'true');
        var e = document.createElement('small');
        e.className = 'err';
        e.id = (inp.id || inp.name) + '-err';
        e.textContent = msg(bad);
        inp.setAttribute('aria-describedby', e.id);
        field.appendChild(e);
        if (!first) first = inp;
      } else {
        inp.removeAttribute('aria-invalid');
      }
    });
    return first;
  }

  function collect(form) {
    var fields = {};
    [].forEach.call(form.querySelectorAll('input, select, textarea'), function (inp) {
      if (!inp.name || inp.disabled || inp.type === 'submit' || inp.name === 'consent') return;
      if (inp.value.trim()) fields[inp.name] = inp.value.trim();
    });
    return fields;
  }

  function utm() {
    var o = {};
    try {
      new URLSearchParams(location.search).forEach(function (v, k) {
        if (/^utm_|^gclid$|^fbclid$/.test(k)) o[k] = v;
      });
    } catch (e) {}
    return o;
  }

  function finish(form, mode) {
    var box = form.querySelector('.form-fields');
    var done = form.querySelector('.form-done');
    if (!done) return;
    if (box) box.hidden = true;
    done.hidden = false;
    var sent = done.querySelector('.done-sent');
    var mail = done.querySelector('.done-mail');
    if (sent) sent.hidden = mode !== 'sent';
    if (mail) mail.hidden = mode !== 'mail';
    done.focus();
  }

  function initForm(form) {
    var status = form.querySelector('.form-status');
    var btn = form.querySelector('button[type="submit"]');
    var to = form.getAttribute('data-to') || 'deepika.pawar@timesinternet.in';

    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) {
        field.classList.remove('invalid');
        e.target.removeAttribute('aria-invalid');
        var er = field.querySelector('.err');
        if (er) er.remove();
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.textContent = '';
      var bad = validate(form);
      if (bad) {
        if (status) status.textContent = msg('fix');
        bad.focus();
        return;
      }
      var fields = collect(form);
      var cfg = window.NBT_FORMS || {};
      var payload = {
        form: form.getAttribute('data-form') || 'enquiry',
        submittedAt: new Date().toISOString(),
        page: location.pathname.split('/').pop() || 'index.html',
        lang: doc.lang,
        utm: utm(),
        referrer: document.referrer || '',
        fields: fields
      };
      if (btn) btn.disabled = true;
      if (status) status.textContent = msg('sending');

      if (cfg.endpoint) {
        fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
          .then(function (r) {
            if (!r.ok && r.type !== 'opaque') throw new Error(r.status);
            if (status) status.textContent = '';
            finish(form, 'sent');
          })
          .catch(function () {
            if (btn) btn.disabled = false;
            if (status) status.innerHTML = msg('fail') + ' <a href="mailto:' + to + '">' + to + '</a>';
          });
        return;
      }

      // No endpoint configured: open a pre-filled email.
      var lines = Object.keys(fields).map(function (k) { return k + ': ' + fields[k]; });
      lines.push('', 'Source: ' + payload.page + ' (' + payload.lang + ')');
      var subject = 'NBT Vasudha ' + (payload.form === 'nomination' ? 'Nomination' : 'Enquiry') + (fields.name ? ' — ' + fields.name : '');
      var href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      var fallback = form.querySelector('.mail-fallback');
      if (fallback) fallback.href = href;
      finish(form, 'mail');
      if (btn) btn.disabled = false;
      if (status && !form.querySelector('.form-done')) status.innerHTML = msg('fail') + ' <a href="' + href + '">' + to + '</a>';
      window.location.href = href;
    });
  }
  [].forEach.call(document.querySelectorAll('form[data-form]'), initForm);

  // ---------- Mobile menu ----------
  var menuBtn = document.querySelector('.menu-btn');
  var navMenu = document.getElementById('nav-menu');
  if (menuBtn && navMenu) {
    function setMenu(open) {
      navMenu.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    }
    menuBtn.addEventListener('click', function () { setMenu(!navMenu.classList.contains('open')); });
    navMenu.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  // ---------- Summit: "Select pass" pre-fills the registration form ----------
  document.addEventListener('click', function (e) {
    var pick = e.target.closest && e.target.closest('[data-pick]');
    var select = document.getElementById('reg-pass');
    if (pick && select) select.value = pick.getAttribute('data-pick');
  });

  // ---------- Tabs (award tracks, Individual/Corporate packages) ----------
  // Panels ship in the HTML; this only switches which one is shown.
  [].forEach.call(document.querySelectorAll('[role="tablist"]'), function (list) {
    var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (e.key === 'Home') d = -i; else if (e.key === 'End') d = tabs.length - 1 - i;
        if (d === undefined) return;
        e.preventDefault();
        select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
  });

  // ---------- Awards: nomination dialog ----------
  var modal = document.getElementById('nominate');
  if (modal && modal.showModal) {
    var planSel = document.getElementById('nom-plan');
    var trackSel = document.getElementById('nom-track');
    var catSel = document.getElementById('nom-category');
    var panels = [].slice.call(document.querySelectorAll('.track-panel'));

    // Tracks and categories come from the panels on the page, in the page's language.
    trackSel.innerHTML = panels.map(function (p, i) {
      return '<option value="' + i + '">' + p.querySelector('h3').textContent + '</option>';
    }).join('');
    function fillCategories() {
      var p = panels[+trackSel.value];
      catSel.innerHTML = [].map.call(p.querySelectorAll('.chips li'), function (li) {
        return '<option>' + li.textContent + '</option>';
      }).join('');
    }
    trackSel.addEventListener('change', fillCategories);
    fillCategories();

    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-nominate]');
      if (!t) return;
      e.preventDefault();
      var plan = t.getAttribute('data-plan');
      if (plan) planSel.value = plan;
      var track = t.getAttribute('data-track');
      if (track !== null) { trackSel.value = track; fillCategories(); }
      modal.showModal();
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal || (e.target.closest && e.target.closest('[data-close]'))) modal.close();
    });
  }
})();

// ---------- Deferred images: fetched after load so they never compete with the LCP image ----------
// (the mandated Times Languages logo in the hero is 140 KB; its box is reserved in CSS)
(function () {
  function swap() {
    [].forEach.call(document.querySelectorAll('img[data-defer-src]'), function (img) {
      img.src = img.getAttribute('data-defer-src');
      img.removeAttribute('data-defer-src');
    });
  }
  if (document.readyState === 'complete') swap(); else addEventListener('load', swap);
})();

// ---------- Hero video: never competes with first paint ----------
// The poster <img> is the LCP element. The video starts after load, sized to the screen,
// and is skipped for reduced motion, Save-Data and 2G/3G connections.
(function () {
  var v = document.querySelector('.hero-video');
  if (!v) return;
  var c = navigator.connection || {};
  if ((window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '')) return;
  function start() {
    var small = matchMedia('(max-width: 860px)').matches;
    v.src = v.getAttribute(small ? 'data-src-sm' : 'data-src');
    v.addEventListener('playing', function () { v.classList.add('is-playing'); }, { once: true });
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  if (document.readyState === 'complete') setTimeout(start, 200);
  else addEventListener('load', function () { setTimeout(start, 200); });
})();
