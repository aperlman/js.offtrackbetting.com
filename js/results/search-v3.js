// OTB results search/discovery UI — ported from the reviewed prototype
// (tmp/phase-out-jquery/results-form/copilot-concept/app.js). Stage 1 only:
// searchable/filterable track list + per-track date panel. Replaces the
// 1,037-item <select> dropdown previously rendered by form.tt2.
//
// Track list comes from an embedded <script type="application/json"
// id="otb-tracks-data"> block (server-rendered from results_artifacts.meetinfo
// — same data the old dropdown used), not a static fixture file. Region
// grouping merges in regions-v3.json (a one-time snapshot lookup by meetno;
// no backend "region" field exists yet — see
// tmp/phase-out-jquery/results-form/TODO.md). "Racing today" status and
// per-track race-day history are always live-fetched (see live-v3.js).
const REGION_ORDER = [
  'North America', 'UK & Ireland', 'Australia & NZ',
  'France', 'Scandinavia', 'Rest of world', 'Special wagers'
];
// Same CDN host load_asset('js') renders server-side (see conventions.md).
const REGIONS_URL = 'https://js2.offtrackbetting.com/js/results/regions-v3.json';

let TRACKS = [];
let MEETDAYS = {};
let NAME_COUNTS = {};
let openPanelFor = null; // meetno currently expanded, or null

const APP = 'https://app.offtrackbetting.com'; // wagering CTAs go here

// Builds the deep link into the live wagering app for a track's currently
// open race, keyed by its ITP track code (`tc`, sourced from meetinfo's
// `track_code`). Falls back to the app's homepage if we're missing the
// track code or today's program date/race number.
function betNowUrl(trackCode, programDateYmd, raceNumber) {
  if (!trackCode || !programDateYmd || !raceNumber) return APP;
  const programDate = `${programDateYmd}`.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  return `${APP}/#/lobby/live-racing?programDate=${programDate}&programName=${trackCode}&raceNumber=${raceNumber}`;
}

const $root = document.getElementById('results-search');
const $list = document.getElementById('trackList');
const $search = document.getElementById('trackSearch');
const $emptyState = document.getElementById('noMatches');
const $todayOnly = document.getElementById('todayOnlyToggle');
const $resultCount = document.getElementById('resultCount');

let activeTypeFilter = 'all'; // all | Thoroughbred | Harness | Dog | Quarterhorse | special

function parsePostTime(t) {
  // "3:40 PM" -> minutes since midnight, for sorting "racing today" by soonest post
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t || '');
  if (!m) return 24 * 60;
  let [, h, min, ap] = m;
  h = parseInt(h, 10) % 12;
  if (ap.toUpperCase() === 'PM') h += 12;
  return h * 60 + parseInt(min, 10);
}

function trackType(t) {
  if (t.r === 'Special wagers') return 'special';
  return t.e;
}

// Ranks a track's current race by how useful it is to a bettor right now:
// open and counting down (can bet this second) beats a race that's already
// off (nothing to bet on until the next one) beats a card that hasn't even
// opened for wagering yet (mtp: 255 is that sentinel).
function todayTier(t) {
  if (isPendingMtp(t.t.mtp)) return 2; // not open yet
  if (+t.t.mtp === 0) return 1; // post time passed, between races
  return 0; // open now — the one to act on
}

async function init() {
  const dataEl = document.getElementById('otb-tracks-data');
  TRACKS = JSON.parse(dataEl.textContent);

  try {
    const res = await fetch(REGIONS_URL);
    const regionMap = await res.json();
    TRACKS.forEach((t) => { t.r = regionMap[t.m] || 'Rest of world'; });
  } catch (err) {
    console.warn('Region lookup fetch failed, grouping all tracks as "Rest of world":', err);
    TRACKS.forEach((t) => { t.r = 'Rest of world'; });
  }

  NAME_COUNTS = TRACKS.reduce((acc, t) => {
    acc[t.n] = (acc[t.n] || 0) + 1;
    return acc;
  }, {});

  const initialBreed = $root && $root.dataset.initialBreed;
  if (initialBreed) {
    activeTypeFilter = initialBreed;
    document.querySelectorAll('[data-type-filter]').forEach((b) =>
      b.classList.toggle('active', b.dataset.typeFilter === initialBreed));
  }

  render();
  await Promise.all([refreshTodayStatusLive(), prefetchDuplicateMeetdaysLive()]);
  render();

  $search.addEventListener('input', render);
  $todayOnly.addEventListener('change', render);
  document.querySelectorAll('[data-type-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTypeFilter = btn.dataset.typeFilter;
      document.querySelectorAll('[data-type-filter]').forEach((b) =>
        b.classList.toggle('active', b === btn));
      render();
    });
  });
}

// Merges real /api/current_races/v2 into TRACKS' `t` field — the same feed
// today.js already uses on the homepage.
async function refreshTodayStatusLive() {
  let payload;
  try {
    payload = await fetchCurrentRacesLive();
  } catch (err) {
    console.warn('Live current_races/v2 fetch failed, "Racing today" will be empty:', err);
    return;
  }
  const byMeetno = new Map();
  (payload.todaysraces?.tracks || []).forEach((t) => byMeetno.set(String(t.meetno), t));
  TRACKS.forEach((t) => {
    t.t = normalizeTodayEntry(byMeetno.get(String(t.m)));
  });
}

// Duplicate-name tracks (e.g. two "Bath UK" meetnos) need an accurate
// recency hint before the user opens either row, so fetch those meetnos'
// real meetdays.txt up front. Every other track lazy-fetches on first open
// (see openPanel/loadAndRenderPanel below).
async function prefetchDuplicateMeetdaysLive() {
  const dupMeetnos = TRACKS.filter((t) => NAME_COUNTS[t.n] > 1).map((t) => t.m);
  await Promise.all(dupMeetnos.map(async (m) => {
    try {
      MEETDAYS[m] = await fetchMeetdaysLive(m);
    } catch (err) {
      console.warn(`Live meetdays fetch failed for meetno ${m}:`, err);
      MEETDAYS[m] = null; // remembered failure (e.g. orphaned meetno with no upstream data)
    }
  }));
}

function matchesQuery(track, query) {
  if (!query) return true;
  const haystack = `${track.n} ${track.r}`.toLowerCase();
  return haystack.includes(query);
}

function render() {
  const query = $search.value.trim().toLowerCase();
  const todayOnly = $todayOnly.checked;

  let filtered = TRACKS.filter((t) => {
    if (todayOnly && !t.t) return false;
    if (activeTypeFilter !== 'all' && trackType(t) !== activeTypeFilter) return false;
    return matchesQuery(t, query);
  });

  $resultCount.textContent = `${filtered.length} track${filtered.length === 1 ? '' : 's'}`;

  if (!filtered.length) {
    $list.innerHTML = '';
    $emptyState.classList.remove('d-none');
    return;
  }
  $emptyState.classList.add('d-none');

  if (query) {
    // Searching: rank + flatten instead of grouping, so a match never hides
    // behind a collapsed region the user has to know to open first.
    filtered.sort((a, b) => rank(a, query) - rank(b, query) || a.n.localeCompare(b.n));
    $list.innerHTML = renderFlatList(filtered);
  } else {
    $list.innerHTML = renderGroupedList(filtered);
  }

  wireTrackRows();
  if (openPanelFor && filtered.some((t) => t.m === openPanelFor)) {
    const row = $list.querySelector(`[data-m="${openPanelFor}"]`);
    if (row) openPanel(row, true);
  } else {
    openPanelFor = null;
  }
}

function rank(track, query) {
  const name = track.n.toLowerCase();
  if (name.startsWith(query)) return 0;
  if (name.split(/\s+/).some((w) => w.startsWith(query))) return 1;
  return 2;
}

function renderFlatList(tracks) {
  return tracks.map((t) => trackRowHtml(t)).join('');
}

function renderGroupedList(tracks) {
  const today = tracks.filter((t) => t.t).sort((a, b) => {
    const tierDiff = todayTier(a) - todayTier(b);
    if (tierDiff) return tierDiff;
    const tier = todayTier(a);
    if (tier === 0) return (+a.t.mtp) - (+b.t.mtp);
    if (tier === 2) return parsePostTime(a.t.time) - parsePostTime(b.t.time);
    return a.n.localeCompare(b.n);
  });

  // Tracks racing today are pinned above; don't also list them in their
  // region group below, or every one of them shows up twice on the page.
  const todayMeetnos = new Set(today.map((t) => t.m));
  const byRegion = {};
  tracks.filter((t) => !todayMeetnos.has(t.m)).forEach((t) => {
    (byRegion[t.r] = byRegion[t.r] || []).push(t);
  });
  Object.values(byRegion).forEach((list) => list.sort((a, b) => a.n.localeCompare(b.n)));

  let html = '';
  if (today.length) {
    html += `
      <div class="mb-3">
        <div class="region-heading today-heading mb-2">
          Racing today &middot; ${today.length}
        </div>
        ${today.map((t) => trackRowHtml(t)).join('')}
      </div>`;
  }

  REGION_ORDER.forEach((region) => {
    const list = byRegion[region];
    if (!list || !list.length) return;
    const domId = `region-${region.replace(/[^a-z0-9]+/gi, '-')}`;
    // A breed filter has already narrowed the list, so collapsing regions
    // on top of that just adds a redundant extra click. Only collapse by
    // default on the unfiltered "All racing" view.
    const expanded = activeTypeFilter !== 'all' || region === 'North America';
    html += `
      <div class="mb-3">
        <button class="btn btn-link p-0 text-decoration-none region-heading mb-2"
          type="button" data-bs-toggle="collapse" data-bs-target="#${domId}">
          ${region} &middot; ${list.length}
        </button>
        <div id="${domId}" class="collapse${expanded ? ' show' : ''}">
          ${list.map((t) => trackRowHtml(t)).join('')}
        </div>
      </div>`;
  });
  return html;
}

function trackRowHtml(t) {
  // Meet numbers mean nothing to a user, so when a name isn't unique, show
  // recency instead (the same signal a person would actually use to tell
  // two same-named listings apart).
  const disambiguator = NAME_COUNTS[t.n] > 1
    ? `<small>${recencyHint(t)}</small>`
    : '';
  const metaHtml = t.t
    ? todayBadgeHtml(t.t)
    : `<span class="text-muted">${t.r}</span>`;
  const ctaHtml = t.t ? todayCtaHtml(t) : '';

  return `
    <div class="track-row">
      <button type="button" class="track-row-btn" data-m="${t.m}" data-s="${t.s}"
        data-n="${escapeAttr(t.n)}" aria-expanded="false">
        <span class="track-name">${escapeHtml(t.n)}${disambiguator}</span>
        <span class="track-meta">${metaHtml}</span>
      </button>
      ${ctaHtml}
    </div>`;
}

function todayBadgeHtml(today) {
  const mtp = +today.mtp;
  if (isPendingMtp(today.mtp)) {
    return `<span class="badge badge-mtp-off">First post ${escapeHtml(today.time)}</span>`;
  }
  if (mtp === 0) {
    return `<span class="badge badge-mtp-off">Race ${today.race} &middot; off</span>`;
  }
  return `<span class="badge badge-today">Race ${today.race} &middot; ${mtp} MTP</span>`;
}

// Only the "open and counting down" state is actually biddable right now.
function todayCtaHtml(t) {
  const today = t.t;
  const mtp = +today.mtp;
  if (mtp === 0 || isPendingMtp(today.mtp)) return '';
  const url = betNowUrl(t.tc, today.pd, today.race);
  return `
    <a class="btn btn-otb btn-sm track-row-cta" href="${url}" target="_blank" rel="noopener">
      Bet now
    </a>`;
}

function wireTrackRows() {
  $list.querySelectorAll('.track-row-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      closeAnyOpenPanel();
      if (!isOpen) openPanel(btn);
    });
  });
}

function closeAnyOpenPanel() {
  const existing = $list.querySelector('.date-panel');
  if (existing) existing.remove();
  $list.querySelectorAll('.track-row-btn[aria-expanded="true"]').forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
    b.closest('.track-row').classList.remove('is-open');
  });
  openPanelFor = null;
}

function openPanel(btn, keepScroll) {
  btn.setAttribute('aria-expanded', 'true');
  const row = btn.closest('.track-row');
  row.classList.add('is-open');
  openPanelFor = btn.dataset.m;
  const panel = document.createElement('div');
  panel.className = 'date-panel';
  row.insertAdjacentElement('afterend', panel);
  loadAndRenderPanel(panel, btn.dataset.m, btn.dataset.s, btn.dataset.n);
  if (!keepScroll) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// meetdays.txt loads on demand the first time a track's panel opens (unless
// already prefetched for a duplicate name, or cached from an earlier open).
async function loadAndRenderPanel(panel, meetno, slug, name) {
  if (MEETDAYS[meetno] === undefined) {
    panel.innerHTML = '<div class="text-muted small py-2">Loading race-day history\u2026</div>';
    try {
      MEETDAYS[meetno] = await fetchMeetdaysLive(meetno);
    } catch (err) {
      console.warn(`Live meetdays fetch failed for meetno ${meetno}:`, err);
      MEETDAYS[meetno] = null; // remember the failure so we don't refetch on every render
    }
    // user may have closed this panel (or opened a different one) while the fetch was in flight
    if (openPanelFor !== meetno || !panel.isConnected) return;
  }
  panel.innerHTML = datePanelHtml(meetno, slug, name);
  wireDatePanel(panel, meetno, slug, name);
}

function recencyHint(t) {
  if (t.t) return 'Racing today';
  const days = MEETDAYS[t.m];
  if (days === undefined) return 'Checking race history\u2026';
  if (days === null) return 'Race history unavailable right now';
  if (days.length) return `Last raced ${formatYmd([...days].sort().pop())}`;
  return 'No race days on record for this meet';
}

// Real production per-track route: /results/{meetno}/{slug}.html (latest)
// or /results/{meetno}/{slug}-{YYYYMMDD}.html (a specific past race day).
function resultsUrl(meetno, slug, ymd) {
  const suffix = ymd ? `-${ymd}` : '';
  return `/results/${meetno}/${slug}${suffix}.html`;
}

function datePanelHtml(meetno, slug, name) {
  const days = MEETDAYS[meetno];
  const primaryLink = `
    <a class="btn btn-otb btn-sm" href="${resultsUrl(meetno, slug, null)}">
      View latest results for ${escapeHtml(name)} &rarr;
    </a>`;

  if (days === null) {
    return `
      <div class="no-snapshot-note">
        Couldn't load race-day history for meet #${meetno} right now
        (live <code>meetdays.txt</code> fetch failed) &mdash; a transient
        issue, not a permanent gap. Try again in a moment.
      </div>
      ${primaryLink}`;
  }
  if (!days.length) {
    return `
      <div class="no-snapshot-note">
        No race-day history on record yet for meet #${meetno}.
      </div>
      ${primaryLink}`;
  }

  const sorted = [...days].sort();
  const latest = sorted[sorted.length - 1];
  const recent = sorted.slice(-12).reverse();

  return `
    <div class="last-raced">Last raced ${formatYmd(latest)} &middot;
      ${sorted.length} race day${sorted.length === 1 ? '' : 's'} on record</div>
    <div class="day-chip-row">
      ${recent.map((ymd) => `
        <a class="day-chip${ymd === latest ? ' latest' : ''}"
          href="${resultsUrl(meetno, slug, ymd === latest ? null : ymd)}">
          ${ymd === latest ? 'Latest &middot; ' : ''}${formatYmd(ymd)}
        </a>`).join('')}
    </div>
    ${primaryLink}
    <button type="button" class="btn btn-link btn-sm more-dates-toggle">
      More dates&hellip;
    </button>
    <div class="more-dates-panel d-none"></div>`;
}

function wireDatePanel(panel, meetno, slug, name) {
  const toggle = panel.querySelector('.more-dates-toggle');
  if (!toggle) return;
  const days = [...MEETDAYS[meetno]].sort();
  const monthsWithRacing = [...new Set(days.map((d) => d.slice(0, 6)))].sort().reverse();
  let shownMonthIdx = 0;

  toggle.addEventListener('click', () => {
    const more = panel.querySelector('.more-dates-panel');
    more.classList.toggle('d-none');
    if (!more.dataset.built) {
      more.dataset.built = '1';
      more.innerHTML = monthJumpHtml(monthsWithRacing);
      const select = more.querySelector('.month-jump');
      select.addEventListener('change', () => renderMonth(more, days, select.value, meetno, slug, name));
      renderMonth(more, days, monthsWithRacing[shownMonthIdx], meetno, slug, name);
    }
  });
}

function monthJumpHtml(months) {
  const opts = months.map((ym) => {
    const label = new Date(`${ym.slice(0, 4)}-${ym.slice(4, 6)}-01T12:00:00`)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `<option value="${ym}">${label}</option>`;
  }).join('');
  return `
    <label class="form-label small text-muted mb-1">
      Jump to a month with racing (empty months are skipped)
    </label>
    <select class="form-select form-select-sm month-jump mb-2">${opts}</select>
    <div class="mini-cal-container"></div>`;
}

function renderMonth(container, days, ym, meetno, slug, name) {
  container.querySelector('.month-jump').value = ym;
  const year = parseInt(ym.slice(0, 4), 10);
  const month = parseInt(ym.slice(4, 6), 10) - 1;
  const daySet = new Set(days.filter((d) => d.slice(0, 6) === ym));
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const latest = days[days.length - 1];

  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += '<div class="cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = `${ym}${String(d).padStart(2, '0')}`;
    const isRaceDay = daySet.has(ymd);
    cells += isRaceDay
      ? `<a class="cell race-day" href="${resultsUrl(meetno, slug, ymd === latest ? null : ymd)}">${d}</a>`
      : `<div class="cell no-race">${d}</div>`;
  }

  container.querySelector('.mini-cal-container').innerHTML = `
    <div class="mini-cal">
      ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<div class="dow">${d}</div>`).join('')}
      ${cells}
    </div>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

init();
