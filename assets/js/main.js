(function () {
  var doc = document.documentElement;
  var isEn = doc.lang === 'en';

  // ---------- Form Validation and Submission ----------
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

  function msg(k) {
    return (MSG[isEn ? 'en' : 'hi'] || MSG.en)[k];
  }

  function validate(form) {
    var first = null;
    [].forEach.call(form.querySelectorAll('.field'), function (field) {
      field.classList.remove('invalid');
      var old = field.querySelector('.err');
      if (old) old.remove();
      var inp = field.querySelector('input, select, textarea');
      if (!inp || inp.disabled || field.hidden) return;
      var v = (inp.type === 'checkbox' ? '' : inp.value.trim());
      var bad = null;
      if (inp.required) {
        if (inp.type === 'checkbox') {
          if (!inp.checked) bad = 'consent';
        } else if (!v) {
          bad = 'required';
        }
      }
      if (!bad && v && inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) bad = 'email';
      if (!bad && v && inp.type === 'tel') {
        var d = v.replace(/[\s\-()+]/g, '');
        if (!/^\d{10,13}$/.test(d)) bad = 'phone';
      }
      if (bad) {
        field.classList.add('invalid');
        var e = document.createElement('small');
        e.className = 'err';
        e.textContent = msg(bad);
        field.appendChild(e);
        if (!first) first = inp;
      }
    });
    return first;
  }

  function collect(form) {
    var fields = {};
    [].forEach.call(form.querySelectorAll('input, select, textarea'), function (inp) {
      if (!inp.name || inp.disabled || inp.type === 'submit') return;
      if (inp.type === 'checkbox') {
        if (inp.name === 'consent') return;
        if (inp.checked) {
          fields[inp.name] = fields[inp.name] || [];
          fields[inp.name].push(inp.value);
        }
      } else if (inp.value.trim()) {
        fields[inp.name] = inp.value.trim();
      }
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
    var fieldsBox = form.querySelector('.form-fields');
    if (fieldsBox) fieldsBox.hidden = true;
    var done = form.querySelector('.form-done');
    if (done) {
      done.hidden = false;
      var sent = done.querySelector('.done-sent');
      var mail = done.querySelector('.done-mail');
      if (sent) sent.hidden = mode !== 'sent';
      if (mail) mail.hidden = mode !== 'mail';
      done.focus();
    }
  }

  function initForm(form) {
    var status = form.querySelector('.form-status');
    var btn = form.querySelector('button[type="submit"]');

    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid')) {
        field.classList.remove('invalid');
        var er = field.querySelector('.err');
        if (er) er.remove();
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.textContent = '';
      if (form.elements.website && form.elements.website.value) {
        finish(form, 'sent');
        return;
      }
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
        fields: fields
      };

      if (btn) btn.disabled = true;
      if (status) status.textContent = msg('sending');

      if (cfg.endpoint) {
        fetch(cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        })
          .then(function (r) {
            if (!r.ok && r.type !== 'opaque') throw new Error(r.status);
            if (status) status.textContent = '';
            finish(form, 'sent');
          })
          .catch(function () {
            if (btn) btn.disabled = false;
            if (status) {
              var to = form.getAttribute('data-to') || 'deepika.pawar@timesinternet.in';
              status.innerHTML = msg('fail') + ' <a href="mailto:' + to + '">' + to + '</a>';
            }
          });
        return;
      }

      // Fallback mailto
      var lines = Object.keys(fields).map(function (k) {
        return k + ': ' + (Array.isArray(fields[k]) ? fields[k].join(', ') : fields[k]);
      });
      lines.push('', 'Source: ' + payload.page + ' (' + payload.lang + ')');
      var to = form.getAttribute('data-to') || 'deepika.pawar@timesinternet.in';
      var subject = 'NBT Vasudha ' + (payload.form === 'nomination' ? 'Nomination' : 'Enquiry') + (fields.name ? ' — ' + fields.name : '');
      var href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      finish(form, 'mail');
      var fallbackLink = form.querySelector('.mail-fallback');
      if (fallbackLink) fallbackLink.href = href;
      window.location.href = href;
    });
  }

  [].forEach.call(document.querySelectorAll('form[data-form]'), initForm);

  // ---------- Mobile Navigation Menu ----------
  var menuBtn = document.querySelector('.menu-btn');
  var navMenu = document.getElementById('nav-menu') || document.querySelector('nav');
  if (menuBtn && navMenu) {
    menuBtn.addEventListener('click', function () {
      var open = navMenu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    navMenu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        navMenu.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------- Countdown Timer ----------
  [].forEach.call(document.querySelectorAll('[data-countdown]'), function (box) {
    var target = new Date(box.getAttribute('data-countdown')).getTime();
    var cells = {};
    [].forEach.call(box.querySelectorAll('[data-unit]'), function (b) {
      cells[b.getAttribute('data-unit')] = b;
    });
    function pad(n) {
      return n < 10 ? '0' + n : String(n);
    }
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        box.hidden = true;
        clearInterval(timer);
        return;
      }
      var s = Math.floor(diff / 1000);
      var vals = {
        d: String(Math.floor(s / 86400)),
        h: pad(Math.floor((s % 86400) / 3600)),
        m: pad(Math.floor((s % 3600) / 60)),
        s: pad(s % 60)
      };
      Object.keys(vals).forEach(function (k) {
        if (cells[k]) cells[k].textContent = vals[k];
      });
    }
    var timer = setInterval(tick, 1000);
    tick();
  });

  // ---------- Pre-fill pass on click ----------
  document.addEventListener('click', function (e) {
    var pick = e.target.closest && e.target.closest('[data-pick]');
    if (!pick) return;
    var pass = pick.getAttribute('data-pick');
    var select = document.getElementById('reg-pass');
    if (select) {
      select.value = pass;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // ---------- Close Dialog Modals ----------
  document.addEventListener('click', function (e) {
    var closeBtn = e.target.closest && e.target.closest('[data-close]');
    if (closeBtn) {
      var dlg = closeBtn.closest('dialog');
      if (dlg && dlg.close) dlg.close();
    }
  });

  // ---------- Awards Page: Category Tabs & Chips ----------
  var catsEn = {
    "Climate & Energy": [
      "EcoTech & climate innovation", "Clean energy & renewables", "Energy storage & battery tech",
      "Green hydrogen & alternative fuels", "Solar energy innovation", "Wind energy innovation",
      "Smart grid & energy management", "Carbon management & offsetting"
    ],
    "Mobility & Circularity": [
      "Sustainable mobility & EV ecosystem", "Green building & construction", "Green logistics & last-mile",
      "Sustainable aviation", "Circular economy & recycling", "Packaging innovation",
      "Waste-to-energy solutions", "Green materials & manufacturing"
    ],
    "Lifestyle & Nature": [
      "Food & agriculture sustainability", "Sustainable fashion & textiles", "Green home & lifestyle products",
      "Water conservation & management", "Biodiversity conservation", "Blue economy & oceans",
      "Climate resilience", "Sustainable tourism & hospitality"
    ],
    "Finance, Health & Leaders": [
      "Green finance & impact investing", "ESG consulting & advisory", "Green campus initiative",
      "Community-led sustainability", "Women-led green enterprises", "Youth-led climate action",
      "Net-zero transformation", "Green startup of the year", "Sustainability leader", "Lifetime achievement in sustainability"
    ]
  };

  var catsHi = {
    "क्लाइमेट और एनर्जी": [
      "इकोटेक और क्लाइमेट इनोवेशन", "स्वच्छ ऊर्जा और नवीकरणीय ऊर्जा", "एनर्जी स्टोरेज और बैटरी तकनीक",
      "ग्रीन हाइड्रोजन और वैकल्पिक ईंधन", "सौर ऊर्जा नवाचार", "पवन ऊर्जा नवाचार",
      "स्मार्ट ग्रिड और ऊर्जा प्रबंधन", "कार्बन प्रबंधन और ऑफसेटिंग"
    ],
    "मोबिलिटी और सर्कुलैरिटी": [
      "सतत गतिशीलता और ईवी इकोसिस्टम", "ग्रीन बिल्डिंग और निर्माण", "ग्रीन लॉजिस्टिक्स और लास्ट-माईल",
      "संवहनीय विमानन", "सर्कुलर इकोनॉमी और रीसाइक्लिंग", "पैकेजिंग नवाचार",
      "वेस्ट-टू-एनर्जी समाधान", "ग्रीन सामग्री और विनिर्माण"
    ],
    "लाइफस्टाइल और प्रकृति": [
      "खाद्य और कृषि सस्टेनेबिलिटी", "सतत फैशन और वस्त्र", "ग्रीन होम और लाइफस्टाइल उत्पाद",
      "जल संरक्षण और प्रबंधन", "जैव विविधता संरक्षण", "ब्लू इकोनॉमी और महासागर",
      "क्लाइमेट रेजिलिएंस", "सतत पर्यटन और आतिथ्य"
    ],
    "फाइनेंस, स्वास्थ्य और नेतृत्व": [
      "ग्रीन फाइनेंस और इम्पैक्ट इन्वेस्टिंग", "ईएसजी कंसल्टिंग और एडवाइजरी", "ग्रीन कैंपस पहल",
      "सामुदायिक सस्टेनेबिलिटी", "महिला-नेतृत्व वाले ग्रीन उद्यम", "युवा-नेतृत्व वाली क्लाइमेट पहल",
      "नेट-ज़ीरो रूपांतरण", "ग्रीन स्टार्टअप ऑफ़ द ईयर", "सस्टेनेबिलिटी लीडर", "सस्टेनेबिलिटी में लाइफटाइम अचीवमेंट"
    ]
  };

  var tabsContainer = document.getElementById('tabs');
  var chipsContainer = document.getElementById('chips');
  if (tabsContainer && chipsContainer) {
    var activeCats = isEn ? catsEn : catsHi;
    var keys = Object.keys(activeCats);

    function showCategory(k) {
      [].forEach.call(tabsContainer.children, function (b) {
        b.classList.toggle('on', b.textContent === k);
      });
      chipsContainer.innerHTML = activeCats[k].map(function (c) {
        return '<span>' + c + '</span>';
      }).join('');
    }

    tabsContainer.innerHTML = '';
    keys.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = k;
      b.onclick = function () {
        showCategory(k);
      };
      tabsContainer.appendChild(b);
    });

    if (keys.length > 0) {
      showCategory(keys[0]);
    }
  }

  // ---------- Awards Page: Pricing Plans Switcher ----------
  var plansEn = {
    ind: [
      ["Growth", "₹9,999", 1, ["Profiling article", "Brand page", "Certificate of nomination", "1 social media post"]],
      ["Acceleration", "₹17,999", 2, ["Profiling article", "Brand page", "Certificate of nomination", "2 social media posts"], 1]
    ],
    corp: [
      ["Standard", "₹14,999", 1, ["Profiling article", "Listing on awards website", "Red carpet coverage", "Exclusive table booking"]],
      ["Growth", "₹25,999", 2, ["Profiling article", "2 social media posts", "Red carpet coverage", "Exclusive table booking"]],
      ["Acceleration", "₹45,999", 3, ["2 profiling articles", "Priority listing", "Red carpet coverage", "Exclusive table booking"], 1],
      ["Exclusive", "₹89,999", 3, ["2 profiling articles", "3 social media posts", "Priority listing", "Exclusive table booking"]]
    ]
  };

  var plansHi = {
    ind: [
      ["ग्रोथ", "₹9,999", 1, ["प्रोफाइलिंग आर्टिकल", "ब्रांड पेज", "नामांकन प्रमाणपत्र", "1 सोशल मीडिया पोस्ट"]],
      ["एक्सेलेरेशन", "₹17,999", 2, ["प्रोफाइलिंग आर्टिकल", "ब्रांड पेज", "नामांकन प्रमाणपत्र", "2 सोशल मीडिया पोस्ट"], 1]
    ],
    corp: [
      ["स्टैंडर्ड", "₹14,999", 1, ["प्रोफाइलिंग आर्टिकल", "अवॉर्ड्स वेबसाइट पर लिस्टिंग", "रेड कार्पेट कवरेज", "एक्सक्लूसिव टेबल बुकिंग"]],
      ["ग्रोथ", "₹25,999", 2, ["प्रोफाइलिंग आर्टिकल", "2 सोशल मीडिया पोस्ट", "रेड कार्पेट कवरेज", "एक्सक्लूसिव टेबल बुकिंग"]],
      ["एक्सेलेरेशन", "₹45,999", 3, ["2 प्रोफाइलिंग आर्टिकल", "प्राथमिकता लिस्टिंग", "रेड कार्पेट कवरेज", "एक्सक्लूसिव टेबल बुकिंग"], 1],
      ["एक्सक्लूसिव", "₹89,999", 3, ["2 प्रोफाइलिंग आर्टिकल", "3 सोशल मीडिया पोस्ट", "प्राथमिकता लिस्टिंग", "एक्सक्लूसिव टेबल बुकिंग"]]
    ]
  };

  var plansContainer = document.getElementById('plans');
  var planToggles = document.querySelectorAll('[data-p]');
  if (plansContainer && planToggles.length > 0) {
    var activePlans = isEn ? plansEn : plansHi;

    function renderPlans(type) {
      var list = activePlans[type];
      plansContainer.innerHTML = list.map(function (p) {
        var isPop = !!p[4];
        var planFullName = (type === 'ind' ? (isEn ? 'Individual ' : 'व्यक्तिगत ') : (isEn ? 'Corporate ' : 'कॉर्पोरेट ')) + p[0];
        var catText = isEn
          ? (p[2] + ' categor' + (p[2] > 1 ? 'ies' : 'y') + ' nominated')
          : (p[2] + ' ' + (p[2] > 1 ? 'श्रेणियाँ नामांकित' : 'श्रेणी नामांकित'));
        var btnText = isEn ? 'Select Plan' : 'प्लान चुनें';
        var popTag = isPop ? ('<span class="tag">' + (isEn ? 'Most popular' : 'सर्वाधिक लोकप्रिय') + '</span>') : '';
        var feeText = '<div class="price">' + p[1] + ' <small>+ GST</small></div>';

        return '<div class="card' + (isPop ? ' pop' : '') + '">' +
          popTag +
          '<h3>' + p[0] + ' ' + (isEn ? 'Plan' : 'प्लान') + '</h3>' +
          feeText +
          '<div class="muted">' + catText + '</div>' +
          '<ul>' + p[3].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
          '<button type="button" class="btn' + (isPop ? '' : ' alt') + '" data-open-plan="' + planFullName + '">' + btnText + '</button>' +
          '</div>';
      }).join('');
    }

    planToggles.forEach(function (b) {
      b.onclick = function () {
        planToggles.forEach(function (x) { x.classList.toggle('on', x === b); });
        renderPlans(b.getAttribute('data-p'));
      };
    });

    renderPlans('ind');
  }

  // ---------- Awards Page: Open Nomination Modal ----------
  var regModal = document.getElementById('reg-modal');
  var regPlanSelect = document.getElementById('reg-plan-select');
  var regTrackSelect = document.getElementById('reg-track-select');
  var regCatSelect = document.getElementById('reg-category-select');

  function updateCategoryOptions() {
    if (!regTrackSelect || !regCatSelect) return;
    var track = regTrackSelect.value;
    var catList = catsEn[track] || [];
    regCatSelect.innerHTML = catList.map(function (c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');
  }

  if (regTrackSelect) {
    regTrackSelect.addEventListener('change', updateCategoryOptions);
    updateCategoryOptions();
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('[data-open-plan]');
    if (trigger && regModal && regModal.showModal) {
      var plan = trigger.getAttribute('data-open-plan');
      if (regPlanSelect) {
        for (var i = 0; i < regPlanSelect.options.length; i++) {
          if (regPlanSelect.options[i].value.toLowerCase().indexOf(plan.toLowerCase()) > -1) {
            regPlanSelect.selectedIndex = i;
            break;
          }
        }
      }
      regModal.showModal();
    }
  });

})();
