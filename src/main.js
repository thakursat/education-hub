// Forms have no backend: each one validates, then opens WhatsApp with the enquiry pre-filled.
(function () {
  var WA = '__WHATSAPP__';

  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('nav-open', open);
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

  // Tuition jobs are kept in /jobs.json so they can be updated without rebuilding the site.
  var jobsEl = document.getElementById('jobs');
  if (jobsEl) {
    var empty = document.getElementById('jobs-empty');
    var esc = function (s) {
      var p = document.createElement('p');
      p.textContent = s == null ? '' : String(s);
      return p.innerHTML;
    };
    fetch(jobsEl.getAttribute('data-jobs-src'))
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
        if (!jobs.length) {
          empty.hidden = false;
          return;
        }
        jobsEl.innerHTML = jobs
          .map(function (j) {
            var msg = 'Hi Education Hub 👋 I want to apply for Job ID ' + j.id + ' (' + j.title + ').';
            return (
              '<article class="job"><span class="tag">ID #' +
              esc(j.id) +
              '</span><h2>' +
              esc(j.title) +
              '</h2>' +
              '<p>📍 ' +
              esc(j.area) +
              '</p><div class="job__meta">' +
              (j.budget ? '<span>💰 ' + esc(j.budget) + '</span>' : '') +
              (j.gender ? '<span>👤 ' + esc(j.gender) + '</span>' : '') +
              (j.subjects ? '<span>📚 ' + esc(j.subjects) + '</span>' : '') +
              '<span>🏠 ' +
              esc(j.mode || 'Home') +
              '</span></div>' +
              '<a class="btn" href="https://wa.me/' +
              WA +
              '?text=' +
              encodeURIComponent(msg) +
              '" target="_blank" rel="noopener">Apply on WhatsApp</a></article>'
            );
          })
          .join('');
        empty.hidden = false;
      });
  }
})();
