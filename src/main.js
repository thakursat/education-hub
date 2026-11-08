// Forms have no backend: each one validates, then opens WhatsApp with the enquiry pre-filled.
(function () {
  var WA = '__WHATSAPP__';

  var burger = document.getElementById('burger');
  var nav = document.getElementById('mainNavCollapse');
  if (burger && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
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

  var mainNav = document.getElementById('mainNav');
  if (mainNav) {
    var onScroll = function () {
      mainNav.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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
    var item = function (label, val, cls) {
      return (
        '<div class="job-live-item"><span class="job-live-label">' +
        label +
        '</span><span class="job-live-val' +
        (cls ? ' ' + cls : '') +
        '">' +
        val +
        '</span></div>'
      );
    };
    return (
      '<article class="job-live-card"><div class="job-live-card__header"><div class="job-live-card__header-inner"><div class="job-live-badge"><span class="job-live-dot"></span>Actively Hiring</div><div class="job-live-id">ID #' +
      esc(j.id) +
      '</div></div></div><div class="job-live-card__body"><h3 class="job-live-title">' +
      esc(j.title) +
      '</h3><div class="job-live-loc"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' +
      esc(j.area) +
      '</div><div class="job-live-grid">' +
      item('Budget', esc(j.budget || 'On request')) +
      item('Tutor Preferred', esc(j.gender || 'Any')) +
      item('Mode', esc(j.mode || 'Home / Offline')) +
      item('Status', 'Active', 'job-live-active') +
      '</div>' +
      (j.subjects ? '<p class="job-live-desc">Subjects: ' + esc(j.subjects) + ' | Gender: ' + esc(j.gender || 'Any') + '</p>' : '') +
      '</div><div class="job-live-card__footer"><a class="job-apply-btn" href="https://wa.me/' +
      WA +
      '?text=' +
      encodeURIComponent(msg) +
      '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Apply Now on WhatsApp</a></div></article>'
    );
  }

  function jobPill(j) {
    return (
      '<a href="/tuition-jobs/" class="tht-job-pill" title="' +
      esc(j.title) +
      '"><span class="tht-job-pill__badge">NEW</span>' +
      esc(j.title) +
      ' — ' +
      esc(j.area) +
      '</a><span class="tht-marquee-dot" aria-hidden="true">·</span>'
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
        if (!jobs.length) {
          if (empty) empty.hidden = false;
          return;
        }
        el.innerHTML = jobs.map(jobCard).join('');
        var nav = document.querySelector('[data-carousel-nav="' + el.id + '"]');
        if (nav) nav.hidden = false;
        // The home page also scrolls the job titles in a ticker under the header; doubled for a seamless loop.
        var strip = document.getElementById('jobs-strip');
        if (strip) {
          var pills = jobs.map(jobPill).join('');
          document.getElementById('jobs-strip-track').innerHTML = pills + pills;
          strip.hidden = false;
        }
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
      document.querySelectorAll('.dropdown-menu.open').forEach(function (o) {
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

  // Hero rotator: the coloured box resizes to each word, measured with a hidden sizer span.
  var stage = document.getElementById('rotateStage');
  if (stage && !reduceMotion) {
    var items = stage.querySelectorAll('.tht-rotate-item');
    var box = document.getElementById('rotateBox');
    var sizer = document.getElementById('rotateSizer');
    var r = 0;
    var fit = function () {
      sizer.textContent = items[r].textContent;
      var pad = parseFloat(getComputedStyle(box).paddingLeft) * 2;
      box.style.width = sizer.getBoundingClientRect().width + pad + 'px';
    };
    fit();
    // Re-measure once the web font arrives; the first measurement used the fallback font.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);
    setInterval(function () {
      var prev = items[r];
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      r = (r + 1) % items.length;
      items[r].classList.add('is-active');
      fit();
      setTimeout(function () {
        prev.classList.remove('is-leaving');
      }, 450);
    }, 2400);
  }

  var typed = document.querySelector('[data-type]');
  if (typed && !reduceMotion) {
    var words = typed.getAttribute('data-type').split('|');
    var wi = 0;
    var ci = words[0].length;
    var deleting = true;
    (function step() {
      var w = words[wi];
      ci += deleting ? -1 : 1;
      typed.textContent = w.slice(0, ci);
      var delay = deleting ? 45 : 90;
      if (deleting && ci === 0) {
        deleting = false;
        wi = (wi + 1) % words.length;
      } else if (!deleting && ci === words[wi].length) {
        deleting = true;
        delay = 1800;
      }
      setTimeout(step, delay);
    })();
  }

  // Sections fade up as they enter the viewport; without IntersectionObserver everything is shown at once.
  var reveals = document.querySelectorAll('.tht-reveal, .falling-text');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var ro = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-visible');
          ro.unobserve(en.target);
        });
      },
      { rootMargin: '0px 0px -60px 0px' },
    );
    reveals.forEach(function (el) {
      ro.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  document.querySelectorAll('.tht-faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.tht-faq-item');
      var open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  // "Refresh" shows a different dozen of the popular-search links; all of them are in the HTML for crawlers.
  var refresh = document.getElementById('tfs-refresh-btn');
  var linkGrid = document.getElementById('tfs-links-grid');
  if (refresh && linkGrid) {
    refresh.hidden = false;
    refresh.addEventListener('click', function () {
      var links = Array.prototype.slice.call(linkGrid.children);
      for (var i = links.length - 1; i > 0; i--) {
        var k = Math.floor(Math.random() * (i + 1));
        var t = links[i];
        links[i] = links[k];
        links[k] = t;
      }
      links.forEach(function (a, n) {
        a.hidden = n >= 12;
        linkGrid.appendChild(a);
      });
    });
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
