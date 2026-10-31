// Forms have no backend: each one validates, then opens WhatsApp with the enquiry pre-filled.
(function () {
  var WA = '__WHATSAPP__';

  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    var header = document.querySelector('.hdr');
    var setOpen = function (open) {
      // The top bar scrolls away, so the menu starts wherever the header's bottom edge is right now.
      if (open) nav.style.setProperty('--nav-top', header.getBoundingClientRect().bottom + 'px');
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('nav-open', open);
      document.documentElement.classList.toggle('nav-open', open);
    };
    burger.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        burger.focus();
      }
    });
  }

  // On pages that already have the booking form, the dock's "Free Demo" jumps to it instead of loading /get-tutor/.
  var demo = document.querySelector('.dock__demo');
  var lead = document.getElementById('lead');
  if (demo && lead) {
    demo.addEventListener('click', function (e) {
      e.preventDefault();
      lead.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var first = lead.querySelector('input[name="name"]');
      if (first) first.focus({ preventScroll: true });
    });
  }

  function openWhatsApp(lines) {
    var text = lines.filter(Boolean).join('\n');
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }

  function validate(form) {
    var err = form.querySelector('.lead__err');
    var bad = Array.prototype.find.call(form.elements, function (el) {
      return el.willValidate && !el.checkValidity();
    });
    if (!bad) {
      if (err) err.hidden = true;
      return true;
    }
    var label = bad.closest('label');
    var name = label ? label.firstChild.textContent.trim() : 'this field';
    if (err) {
      err.textContent = bad.name === 'phone' ? 'Please enter a valid 10-digit mobile number.' : 'Please fill ' + name.toLowerCase() + '.';
      err.hidden = false;
    }
    bad.focus();
    return false;
  }

  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var d = new FormData(form);
      openWhatsApp([
        'Hi Education Hub 👋 I would like to book a FREE demo class.',
        '',
        'Name: ' + d.get('name'),
        'Mobile: ' + d.get('phone'),
        'Class: ' + d.get('class'),
        'Area: ' + d.get('area'),
        d.get('subjects') ? 'Subjects: ' + d.get('subjects') : '',
        'Tutor preference: ' + d.get('gender'),
        d.get('context') ? '(From: ' + d.get('context') + ')' : '',
      ]);
    });
  });

  document.querySelectorAll('form[data-tutor]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var d = new FormData(form);
      openWhatsApp([
        'Hi Education Hub 👋 I want to register as a home tutor.',
        '',
        'Name: ' + d.get('name'),
        'Mobile: ' + d.get('phone'),
        'Qualification: ' + d.get('qualification'),
        'Subjects: ' + d.get('subjects'),
        d.get('classes') ? 'Classes: ' + d.get('classes') : '',
        'Area: ' + d.get('area'),
        'Experience: ' + d.get('experience'),
      ]);
    });
  });

  document.querySelectorAll('form[data-finder]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var lines = ['Hi Education Hub 👋 I am looking for a tutor:'];
      [
        ['area', 'Area'],
        ['class', 'Class'],
        ['subject', 'Subject'],
        ['board', 'Board'],
        ['gender', 'Tutor'],
        ['mode', 'Mode'],
      ].forEach(function (f) {
        if (d.get(f[0])) lines.push(f[1] + ': ' + d.get(f[0]));
      });
      openWhatsApp(lines);
    });
  });

  var esc = function (s) {
    var p = document.createElement('p');
    p.textContent = s == null ? '' : String(s);
    return p.innerHTML;
  };

  function jobCard(j) {
    var msg = 'Hi Education Hub 👋 I want to apply for Job ID ' + j.id + ' (' + j.title + ').';
    return (
      '<article class="job"><div class="job__top"><span class="tag">ID #' +
      esc(j.id) +
      '</span><span class="job__status"><span class="pulse"></span>Active</span></div>' +
      '<h3>' +
      esc(j.title) +
      '</h3><p>📍 ' +
      esc(j.area) +
      '</p><dl>' +
      (j.budget ? '<div><dt>Budget</dt><dd>' + esc(j.budget) + '</dd></div>' : '') +
      '<div><dt>Tutor</dt><dd>' +
      esc(j.gender || 'Any') +
      '</dd></div>' +
      '<div><dt>Mode</dt><dd>' +
      esc(j.mode || 'Home') +
      '</dd></div>' +
      (j.subjects ? '<div><dt>Subjects</dt><dd>' + esc(j.subjects) + '</dd></div>' : '') +
      '</dl><a class="btn" href="https://wa.me/' +
      WA +
      '?text=' +
      encodeURIComponent(msg) +
      '" target="_blank" rel="noopener">Apply on WhatsApp</a></article>'
    );
  }

  // Tuition jobs live in /jobs.json so they can be updated without rebuilding the site.
  document.querySelectorAll('[data-jobs-src]').forEach(function (el) {
    var empty = document.getElementById(el.id + '-empty');
    fetch(el.getAttribute('data-jobs-src'))
      .then(function (r) {
        return r.ok ? r.json() : [];
      })
      .catch(function () {
        return [];
      })
      .then(function (jobs) {
        jobs = (jobs || []).filter(function (j) {
          return j.active !== false;
        });
        var limit = parseInt(el.getAttribute('data-limit'), 10);
        if (limit) jobs = jobs.slice(0, limit);
        if (empty) empty.hidden = false;
        if (!jobs.length) return;
        el.innerHTML = jobs.map(jobCard).join('');
        var nav = document.querySelector('[data-carousel-nav="' + el.id + '"]');
        if (nav) nav.hidden = false;
      });
  });

  document.querySelectorAll('[data-carousel-nav]').forEach(function (nav) {
    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-dir]');
      var track = document.getElementById(nav.getAttribute('data-carousel-nav'));
      if (!btn || !track || !track.firstElementChild) return;
      var step = track.firstElementChild.getBoundingClientRect().width + 14;
      track.scrollBy({ left: step * Number(btn.getAttribute('data-dir')), behavior: 'smooth' });
    });
  });

  // Dropdown toggles: needed for touch and keyboard; desktop hover is handled in CSS.
  document.querySelectorAll('.sub-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sub = document.getElementById(btn.getAttribute('aria-controls'));
      var open = !sub.classList.contains('open');
      document.querySelectorAll('.sub.open').forEach(function (o) {
        if (o !== sub) {
          o.classList.remove('open');
          document.querySelector('[aria-controls="' + o.id + '"]').setAttribute('aria-expanded', 'false');
        }
      });
      sub.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var word = document.querySelector('[data-rotate]');
  if (word && !reduceMotion) {
    var words = word.getAttribute('data-rotate').split('|');
    var w = 0;
    setInterval(function () {
      word.classList.add('out');
      setTimeout(function () {
        w = (w + 1) % words.length;
        word.textContent = words[w];
        word.classList.remove('out');
      }, 250);
    }, 2200);
  }

  // Counters render their final value in HTML (for no-JS and crawlers) and only animate when scrolled into view.
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target;
        var end = Number(el.getAttribute('data-count'));
        var t0 = performance.now();
        (function tick(t) {
          var k = Math.min((t - t0) / 1200, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      });
    });
    counters.forEach(function (c) {
      io.observe(c);
    });
  }

  var welcome = document.getElementById('welcome');
  if (welcome && welcome.showModal && window.matchMedia('(min-width: 1000px)').matches) {
    var seen = false;
    try {
      seen = sessionStorage.getItem('eh-welcome') === '1';
    } catch {
      seen = true;
    }
    if (!seen) {
      setTimeout(function () {
        if (document.querySelector('dialog[open]')) return;
        welcome.showModal();
        try {
          sessionStorage.setItem('eh-welcome', '1');
        } catch {
          /* storage blocked: popup just shows again next visit */
        }
      }, 8000);
    }
    welcome.addEventListener('click', function (e) {
      if (e.target === welcome || e.target.closest('[data-close]')) welcome.close();
    });
  }
})();
