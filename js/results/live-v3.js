// Shared live-endpoint helpers for the results search UI.
// Ported from tmp/phase-out-jquery/results-form/copilot-concept/live.js,
// with the local dev-proxy branch removed: CORS on these endpoints is
// allow-listed to https://www.offtrackbetting.com only, so once this runs
// on the real site there's no proxy involved, same as production's
// existing race.js/today.js. Stage 1 subset only (track list + date
// panels) — archive/today per-race fetches are Stage 2 (race-day page).
function liveUrl(kind, params = {}) {
  switch (kind) {
    case 'meetdays':
      return `https://json.offtrackbetting.com/tracks/v2/${params.meetno}/meetdays.txt`;
    case 'current_races':
      return '/api/current_races/v2';
    default:
      throw new Error(`liveUrl: unknown kind "${kind}"`);
  }
}

// meetdays.txt is a newline-separated YYYYMMDD list.
function parseMeetdaysText(text) {
  return text.split('\n').map((s) => s.trim()).filter(Boolean);
}

async function fetchMeetdaysLive(meetno) {
  const res = await fetch(liveUrl('meetdays', { meetno }));
  if (!res.ok) throw new Error(`meetdays ${meetno}: HTTP ${res.status}`);
  return parseMeetdaysText(await res.text());
}

async function fetchCurrentRacesLive() {
  const res = await fetch(liveUrl('current_races'));
  if (!res.ok) throw new Error(`current_races: HTTP ${res.status}`);
  return res.json();
}

// Normalizes a raw /api/current_races/v2 track entry into the
// {race, mtp, time, pd} shape the search UI uses everywhere.
function normalizeTodayEntry(entry) {
  return entry && { race: entry.currentRace, mtp: entry.mtp, time: entry.time, pd: entry.programDate };
}

// `mtp: "255"` is the real feed's sentinel for "not open yet, no live
// countdown" — not a literal minute count.
function isPendingMtp(mtp) {
  return +mtp >= 255;
}

function formatYmd(ymd) {
  const y = ymd.slice(0, 4), m = ymd.slice(4, 6), d = ymd.slice(6, 8);
  return new Date(`${y}-${m}-${d}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}
