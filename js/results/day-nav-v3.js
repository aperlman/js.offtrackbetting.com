/*
Day navigation: calendar popover on the #dayNav date button, plus the full
year/month archive in #dayArchive. Both are built from the #otb-valid-days
JSON pagination.tt2 already embeds (the server already loaded the full
valid_days list to compute prev/next) -- no extra fetch needed.

Ported from tmp/phase-out-jquery/results-form/rewrite-form/track.html's
calendar popover + "#archive" section, using the same mini-cal grid
markup/pattern already shipped in search-v3.js (vanilla JS, no new
datepicker library).
*/

(function () {
  const nav = document.getElementById('dayNav');
  const dataEl = document.getElementById('otb-valid-days');
  if (!nav || !dataEl) return;

  let days;
  try {
    days = JSON.parse(dataEl.textContent).slice().sort();
  } catch (e) {
    return;
  }
  if (!days.length) return;

  const meetno = nav.dataset.meetno;
  const slug = nav.dataset.slug;
  const latest = days[days.length - 1];
  const selected = nav.dataset.raceday || latest;

  function resultsUrl(ymd) {
    const suffix = ymd === latest ? '' : `-${ymd}`;
    return `/results/${meetno}/${slug}${suffix}.html`;
  }

  function formatYmd(ymd) {
    const y = ymd.slice(0, 4), m = ymd.slice(4, 6), d = ymd.slice(6, 8);
    return new Date(`${y}-${m}-${d}T12:00:00`).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }

  /* CALENDAR POPOVER */
  const btn = document.getElementById('dayNavDateBtn');
  const pop = document.getElementById('dayNavCalPop');
  if (btn && pop) {
    let built = false;
    const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', () => {
      const open = pop.hidden;
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open && !built) {
        built = true;
        pop.innerHTML = monthJumpHtml();
        const select = pop.querySelector('.month-jump');
        select.value = selected.slice(0, 6);
        select.addEventListener('change', () => renderMonth(select.value));
        renderMonth(select.value);
      }
    });
    document.addEventListener('click', (e) => {
      if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !pop.hidden) { close(); btn.focus(); }
    });
  }

  function monthJumpHtml() {
    const months = [...new Set(days.map((d) => d.slice(0, 6)))].sort().reverse();
    const opts = months.map((ym) => {
      const label = new Date(`${ym.slice(0, 4)}-${ym.slice(4, 6)}-01T12:00:00`)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `<option value="${ym}">${label}</option>`;
    }).join('');
    return `
      <select class="form-select form-select-sm month-jump mb-2">${opts}</select>
      <div class="mini-cal-container"></div>`;
  }

  function renderMonth(ym) {
    const container = pop.querySelector('.mini-cal-container');
    const year = parseInt(ym.slice(0, 4), 10);
    const month = parseInt(ym.slice(4, 6), 10) - 1;
    const daySet = new Set(days.filter((d) => d.slice(0, 6) === ym));
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = '';
    for (let i = 0; i < firstDow; i++) cells += '<div class="cell empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = `${ym}${String(d).padStart(2, '0')}`;
      if (!daySet.has(ymd)) { cells += `<div class="cell no-race">${d}</div>`; continue; }
      const cls = [ymd === latest ? 'is-latest' : '', ymd === selected ? 'is-sel' : ''].filter(Boolean).join(' ');
      cells += `<a class="cell ${cls}" href="${resultsUrl(ymd)}">${d}</a>`;
    }

    container.innerHTML = `
      <div class="mini-cal">
        ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<div class="dow">${d}</div>`).join('')}
        ${cells}
      </div>`;
  }

  /* YEAR/MONTH ARCHIVE (#dayArchive), rendered eagerly */
  const archive = document.getElementById('dayArchive');
  if (archive && days.length > 1) {
    const byYear = {};
    days.forEach((d) => {
      const y = d.slice(0, 4), m = d.slice(4, 6);
      (byYear[y] ??= {});
      (byYear[y][m] ??= []).push(d);
    });
    const years = Object.keys(byYear).sort().reverse();
    const selYear = selected.slice(0, 4);

    const monthHtml = (y, m) => {
      const label = new Date(`${y}-${m}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long' });
      const list = byYear[y][m].slice().reverse();
      return `
        <div class="day-archive-month">
          <h3>${label} <span class="text-muted">&middot; ${list.length}</span></h3>
          <ul class="day-archive-days">
            ${list.map((d) => {
              const dt = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T12:00:00`);
              const cls = [d === latest ? 'is-latest' : '', d === selected ? 'is-sel' : ''].filter(Boolean).join(' ');
              return `<li><a class="${cls}" href="${resultsUrl(d)}" aria-label="${formatYmd(d)}">
                <span class="dow">${dt.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span class="dd">${dt.getDate()}</span></a></li>`;
            }).join('')}
          </ul>
        </div>`;
    };

    const yearBody = (y) => Object.keys(byYear[y]).sort().reverse().map((m) => monthHtml(y, m)).join('');
    const yearCount = (y) => Object.values(byYear[y]).reduce((n, list) => n + list.length, 0);

    archive.innerHTML = `
      <div class="day-archive-head">
        <h2>All race days <span class="text-muted fw-normal">(${days.length.toLocaleString()})</span></h2>
        <nav class="year-nav" aria-label="Jump to year">
          ${years.map((y) => `<a href="#dayArchiveY${y}" ${y === selYear ? 'aria-current="true"' : ''}>${y}</a>`).join('')}
        </nav>
      </div>
      ${years.map((y) => `
        <details class="year" id="dayArchiveY${y}" ${y === selYear ? 'open' : ''}>
          <summary>${y} <span class="text-muted fw-normal">&middot; ${yearCount(y)} race days</span></summary>
          ${yearBody(y)}
        </details>`).join('')}`;

    archive.querySelector('.year-nav').addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.open = true;
    });
  }
})();
