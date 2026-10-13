/*
Minimize should always be used in production. Generate race-v3.min.js using:

terser race-v3.js | sed -r 's/\\n\s+/ /g;' > race-v3.min.js

Version: 3 — adds a mobile card layout alongside the existing desktop table,
and a live "next race" MTP banner. All result-rendering logic below (bet
type mapping, dead heat handling via per-finisher iteration, cancellation
detection, coupled-entry/saddle-cloth color lookup, timezone-correct post
time) is carried over verbatim from the proven race.js — only the new
mobile card view and MTP banner are new.

  PRIMARY FUNCTIONS
    Race - display the race (table AND card output from one data pass)
    updateLiveBanner / tickLiveBanner - live "next race" MTP banner

  HELPER FUNCTIONS
    exists, thisEvent, isCanceled, convertBetType, convertToAmt, dateObj
    (all unchanged from race.js)
    buildBetNowUrl - builds the per-race app.offtrackbetting.com deep link
    from a track's ITP track_code (new in v3; used by both the per-race
    "Bet now"/"BET NOW" action button and the live MTP banner)

  NOTE: race.js's PopulateDates()/the jQuery UI datepicker form are gone —
  the per-track page (results/template.tt2) no longer includes form.tt2 or
  its dropdown/datepicker at all. Track/date switching now lives entirely
  in the /results/ search UI (search-v3.js) and the prev/next-day buttons
  (display_prev_next() in pagination.tt2).
*/

// Renames a field in place if the snake_case key exists and the camelCase
// one doesn't yet (never overwrites real camelCase data).
function renameKey(obj, from, to) {
  if (obj && typeof obj === 'object' && from in obj && !(to in obj)) {
    obj[to] = obj[from];
    delete obj[from];
  }
}

function normalizeTrackData(track) {
  track.ID = track.ID || track.program_name || track.program_code;

  (track.events || []).forEach((event) => {
    renameKey(event, 'event_no', 'eventNo');
    renameKey(event, 'post_time', 'postTime');

    (event.runners || []).forEach((r) => renameKey(r, 'morning_odds', 'morningOdds'));

    if (event.results) {
      renameKey(event.results, 'also_ran', 'alsoRan');
      (event.results.finisher || []).forEach((f) => {
        renameKey(f, 'runner_name', 'runnerName');
        renameKey(f, 'finish_position', 'finishPosition');
        renameKey(f, 'win_amount', 'winAmount');
        renameKey(f, 'place_amount', 'placeAmount');
        renameKey(f, 'show_amount', 'showAmount');
        renameKey(f, 'dead_heat', 'deadHeat');
        renameKey(f, 'program_number', 'programNumber');
      });
      (event.results.dividends || []).forEach((d) => {
        renameKey(d, 'bet_type', 'betType');
        renameKey(d, 'base_amount', 'baseAmount');
      });
    }
  });
}


// Display Results
function Race(track) {
  // execution is at end of function

  // Some archived files (confirmed: certain dates' S3 exports, e.g. meetno
  // 57 from 2026-09-27 onward) use snake_case field names instead of the
  // camelCase the live feed and older archives use -- a real upstream data
  // pipeline inconsistency, not a guess (today/v2 is still camelCase; only
  // some archive dates switched). Normalize in place so every renderer
  // below can keep assuming camelCase, same as production always has.
  normalizeTrackData(track);

  /* Unwraps MongoDB Extended JSON ({"$numberDouble": "4"}), which appears
     throughout both the live and archived feeds, not just live -- same
     unwrap race.js already did ad hoc in several places, just centralized. */
  const num = (v) => {
    if (v && typeof v === 'object') return Number(v.$numberDouble ?? v.$numberInt ?? v.$numberLong ?? 0);
    return Number(v);
  };

  const eventNoOf = (event) => num(event.eventNo);

  // "Next up" = first race on the card without official results yet.
  const nextUpRace = (() => {
    const idx = track.events.findIndex((e) => !('results' in e));
    return idx === -1 ? null : idx + 1;
  })();

  /* RACE-JUMP NAV -- one quick-jump bar for the whole page (design ported
     from tmp/phase-out-jquery/results-form/copilot-concept/race.js). */
  const RaceJumpNav = () => `
    <nav class="race-jump" aria-label="Jump to race">
      ${track.events.map((event, idx) => {
        const n = idx + 1;
        const isNext = n === nextUpRace;
        return `<a href="#race${n}" class="${'results' in event ? 'official' : ''}${isNext ? ' next-up' : ''}"${isNext ? ' aria-current="true"' : ''}>
          R${n}${'results' in event ? ' &#10003;' : ''}</a>`;
      }).join('')}
    </nav>`;

  /* HEADER */
  const RaceDisplay = (eventNo, track) => (
    RaceSectionOpen(eventNo, track)
    + RaceConditions(eventNo, track)
    + ('results' in thisEvent(eventNo, track)
        ? OfficialBody(eventNo, track) : PendingBody(eventNo, track))
    // any time the eventNo is 1, OR if it's after 1/1/2022,
    // display the action box, otherwise hide it
    + (eventNo == 1 || num(thisEvent(eventNo, track).postTime) > 1640995200
        ? ActionBox(eventNo, track) : '')
    + '</div></section>'
    + (eventNo == 3 ? PromoSignup(track) : '')
    + (eventNo == (track.events.length > 6 && track.events.length - 3)
        ? PromoJoin(track) : '')
  );

  const RaceSectionOpen = (eventNo, track) => {
    const event = thisEvent(eventNo, track);
    const n = eventNo;
    const isNext = n === nextUpRace;
    const meta = [
      event.distance ? event.distance.toString().replace(/[Ff]$/, ' Furlongs') : '',
      num(event.purse) > 0
        ? 'Purse ' + convertToAmt(num(event.purse) / 100).slice(0, -3) : '',
      num(event.postTime)
        ? 'Post ' + new Date(num(event.postTime) * 1000).toLocaleTimeString('en-US',
            { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'America/New_York' })
        : '',
    ].filter(Boolean).join(' &middot; ');

    return `
      <section class="race-section${isNext ? ' next-up' : ''}" id="race${n}">
        <div class="race-head">
          <h2>Race ${n}${isCanceled(eventNo, track) ? ' &mdash; Canceled' : ''}</h2>
          <span class="race-meta">${track.ID} &middot; ${meta}</span>
        </div>
        <div class="race-body">`;
  };

  const RaceConditions = (eventNo, track) => {
    const event = thisEvent(eventNo, track);
    if (!event.conditions || typeof event.conditions !== 'string') return '';
    return `<details class="cond"><summary>Conditions</summary><p class="mt-2 mb-0">${event.conditions}</p></details>`;
  };

  // harness track? --> 'jockey' becomes 'driver'
  const personLabel = (event) => (event.breed.toLowerCase() === 'harness') ? 'Driver' : 'Jockey';

  // post position color class, e.g. "pp5" or "hpp5" -- coupled entries
  // ("1a") strip the letter suffix for color only, same as race.js.
  const ppClass = (event, programNumber) => (
    (event.breed.toLowerCase() === 'harness' ? 'hpp' : 'pp') +
      (isNaN(programNumber) ? programNumber.replace(/\D/g, '') : programNumber)
  );

  const OfficialBody = (eventNo, track) => {
    const event = thisEvent(eventNo, track);
    const finishers = event.results.finisher;
    const person = personLabel(event);
    const showJockey = exists(event, 'jockey');
    const showPlace = exists(event, 'placeAmount');
    const showShow = exists(event, 'showAmount');
    // finishPosition, not array order, is the real winner signal -- a tied-
    // for-win dead heat means more than one row renders as a winner.
    const isWinner = (x) => num(x.finishPosition) === 1;

    const rows = finishers.map((x) => `
      <tr class="${isWinner(x) ? 'winner-row' : ''}">
        <td class="postposition ${ppClass(event, x.programNumber)}"><a>${x.programNumber}</a></td>
        <td><strong>${x.runnerName}</strong></td>
        ${showJockey ? `<td class="d-none d-md-table-cell">${x.jockey || ''}</td>` : ''}
        <td class="amt">${x.winAmount || ''}</td>
        ${showPlace ? `<td class="amt">${x.placeAmount || ''}</td>` : ''}
        ${showShow ? `<td class="amt">${x.showAmount || ''}</td>` : ''}
      </tr>`).join('');

    const cards = finishers.map((x) => `
      <div class="selection-card${isWinner(x) ? ' winner' : ''}">
        <span class="pp-chip ${ppClass(event, x.programNumber)}"><a>${x.programNumber}</a></span>
        <div class="names">
          <div class="horse-name">${x.runnerName}</div>
          ${showJockey && x.jockey ? `<div class="jockey">${person}: ${x.jockey}</div>` : ''}
        </div>
        <div class="amounts">
          ${[['W', x.winAmount], ['P', x.placeAmount], ['S', x.showAmount]]
            .filter(([, v]) => v).map(([label, v]) => `${label} $${v}`).join(' &middot; ')
            || '<span class="text-muted">&mdash;</span>'}
        </div>
      </div>`).join('');

    // Real dividends list every permutation separately for a win-position
    // dead heat (e.g. a 3-way tie -> 6 separate EX lines) -- rendering the
    // list flatly like this already handles that correctly, no special
    // casing needed.
    const exotics = !isCanceled(eventNo, track) && event.results.dividends.length ? `
      <ul class="exotics">
        ${event.results.dividends.map((x) => `
          <li><span class="bt">${dispAmt(x.baseAmount?.$numberDouble || x.baseAmount?.$numberInt || x.baseAmount)}
            &nbsp;${convertBetType(x.betType) || x.betType} ${x.finishers.replace(/\//g, '/<wbr>')}</span>
            <span class="pay">${convertToAmt(x.amount?.$numberDouble || x.amount)}</span></li>`).join('')}
      </ul>` : '';

    const notes = (event.results.scratches.length || (event.results.alsoRan && event.results.alsoRan.length)) ? `
      <div class="small text-muted mt-2">
        ${event.results.scratches.length ? `<div><strong>Scratches:</strong> ${event.results.scratches.join(', ')}</div>` : ''}
        ${event.results.alsoRan && event.results.alsoRan.length
          ? `<div><strong>${isCanceled(eventNo, track) ? 'Scheduled Runners' : 'Also Ran'}:</strong> ${event.results.alsoRan.join(', ')}</div>` : ''}
      </div>` : '';

    return `
      <div id="selection" class="table-responsive d-none d-sm-block">
        <table class="table table-striped table-bordered res-table mb-0">
          <thead>
            <tr><th>#</th><th>${event.breed.toLowerCase() === 'dog' ? 'Greyhound' : 'Horse'}</th>
              ${showJockey ? `<th class="d-none d-md-table-cell">${person}</th>` : ''}
              <th class="amt">Win</th>${showPlace ? '<th class="amt">Place</th>' : ''}${showShow ? '<th class="amt">Show</th>' : ''}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="d-sm-none">${cards}</div>
      ${exotics}
      ${notes}`;
  };

  const dispAmt = (amt) => {
    const dollars = convertToAmt(parseInt(amt) / 100);
    return (dollars.endsWith('.00')) ? dollars.slice(0, -3) : dollars;
  };

  const PendingBody = (eventNo, track) => {
    const event = thisEvent(eventNo, track);
    const isNext = eventNo === nextUpRace;

    const rows = event.runners.map((x) => `
      <tr>
        <td class="postposition ${ppClass(event, x.number)}"><a>${x.number}</a></td>
        <td><strong>${x.name}</strong></td>
        <td class="amt">${x.morningOdds}</td>
      </tr>`).join('');

    const cards = event.runners.map((x) => `
      <div class="selection-card">
        <span class="pp-chip ${ppClass(event, x.number)}"><a>${x.number}</a></span>
        <div class="names"><div class="horse-name">${x.name}</div></div>
        <div class="amounts">M/L ${x.morningOdds}</div>
      </div>`).join('');

    return `
      <div id="selection" class="table-responsive d-none d-sm-block">
        <table class="table table-striped table-bordered res-table mb-0">
          <thead><tr><th>#</th><th>${event.breed.toLowerCase() === 'dog' ? 'Greyhound' : 'Horse'}</th><th class="amt">M/L Odds</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="d-sm-none">${cards}</div>
      <div class="pending-note${isNext ? ' next-up' : ''}">
        <span>${isNext ? `Race ${eventNo} hasn't run yet.` : `No results for Race ${eventNo} yet.`}</span>
      </div>`;
  };

  const ActionBox = (eventNo, track) => `
    <div id="actionbox">
      <div class="row">
        <div class="col-md-8 text-left">
          ${ thisEvent(eventNo, track).runners.length > 0 ?
            `No results for ${track.ID} Race ${eventNo} yet - place your bets!` :
            (parseInt(dateObj(eventNo, track) // no replays prior to 2022
              .toISOString("en-US", {timeZone: "America/New_York"})
              .replace(/T.*/g,"")) < 2022 ?
              `Bet ${track.ID} at OffTrackBetting.com` :
              `Watch ${track.ID} Race ${eventNo} Video Replay`)
            }

        </div>
    <div class="col-md-4">
          ${ActionButton(
            thisEvent(eventNo, track).runners.length > 0 ? false : true,
            eventNo, track)}
        </div>
      </div>
    </div>
  `;

  const ActionButton = (raceComplete, eventNo, track) => {
    const dateStr = (dateObj(eventNo, track)
    .toISOString("en-US", {timeZone: "America/New_York"})
    .replace(/T.*/g,""));

    const postYear = parseInt(dateStr.match(/^\d{4}/)[0]);

    const programDate = track.businessDate
    .replace(/(\d{4})(\d{2})(\d{2})/g, '$1-$2-$3');

    // we don't have replays from before 2022 - these links reflect that

    const buildHTMLLink = () => {
      const attribs = 'class="btn btn-blue text-right" role="button">';
      const url = postYear < 2022 ?
        'https://app.offtrackbetting.com' :
        buildBetNowUrl(track.trackCode, programDate, eventNo);
      return `<a href="${url}" ${attribs}`;
    };

    return `
      ${buildHTMLLink()}
      ${raceComplete ?
        (postYear < 2022 ?
          "BET TODAY'S LIVE TRACKS" :
          '<i class="fa fa-play-circle"></i> Watch Replay') :
        'BET NOW'}
      </a>`;
    };


  const PromoSignup = (track) => {

    const displayAnimation = () => {
      const downArrow = $("#promoSignup #object");
      const nextArrow = $("#promoSignup .btn .fa-angle-right");
      const promoTitle = $("#promoSignup h2");

      downArrow.css("visibility", "visible");
      nextArrow.css("visibility", "visible");

      const animations = {
        downArrow: {
          isOn: () => downArrow.attr('class') == "animated bounceInDown",
          turnOn: () => downArrow.addClass('animated bounceInDown'),
          turnOff: () => downArrow.removeClass('animated bounceInDown')
        },
        nextArrow: {
          isOn: () => nextArrow.attr('class').includes("animated fadeInLeft"),
          turnOn: () => nextArrow.addClass('animated fadeInLeft'),
          turnOff: () => nextArrow.removeClass('animated fadeInLeft')
        },
        promoTitle: {
          isOn: () => promoTitle.attr('class').includes("animated tada"),
          turnOn: () => promoTitle.addClass('animated tada'),
          turnOff: () => promoTitle.removeClass('animated tada')
        }
      };

      const toggle = (el) => {
        if (el.isOn()) el.turnOff()
        else el.turnOn();
      };

      Object.keys(animations).forEach((k) => toggle(animations[k]));

      setTimeout(() => displayAnimation(), 4500);
    };

    // Initial start of animation (don't take too long)
    setTimeout(() => displayAnimation(), 1000);

    return `
      <div id="promoSignup" class="calltoaction lazyloaded margin-bottom-25">
        <a href="/signup/">
          <span id="object"><i class="fa fa-arrow-circle-down"></i></span>
          <h2 class="animated tada">Bet ${track.ID} Racing</h2>
          <h3>US Legal Online Wagering</h3>
          <span class="btn btn-join">100% FIRST DEPOSIT MATCH
            <i class="fa fa-angle-right animated fadeInLeft"></i>
          </span>
        </a>
      </div>`
  };

  const PromoJoin = (track) =>  {
    const displayAnimation = () => {
      const rightArrow = $("#promoJoin #object1");
      const promoTitle = $("#promoJoin h2");

      $("#promoJoin #object1 .fa-play-circle").css("visibility", "visible");

      const animations = {
        rightArrow: {
          isOn: () => rightArrow.attr('class') == 'animated fadeInLeft',
          turnOn: () => rightArrow.addClass('animated fadeInLeft'),
          turnOff: () => rightArrow.removeClass('animated fadeInLeft')
        },
        promoTitle: {
          isOn: () => promoTitle.attr('class').includes('animated tada'),
          turnOn: () => promoTitle.addClass('animated tada'),
          turnOff: () => promoTitle.removeClass('animated tada')
        }
      };

      const toggle = (el) => {
        if (el.isOn()) el.turnOff()
        else el.turnOn();
      };

      Object.keys(animations).forEach((k) => toggle(animations[k]));

      setTimeout(() => displayAnimation(), 4500);
    };

    setTimeout(() => displayAnimation(), 5500);

    return `
      <div id="promoJoin" class="calltoaction lazyloaded margin-bottom-25">
        <a href="/signup/">
          <span id="object1"><i class="fa fa-play-circle"></i></span>
          <h2 class="animated tada">Watch ${track.ID} Race Replays</h2>
          <span class="btn btn-join">JOIN NOW</span>
        </a>
      </div>
    `
  };

  /* HELPER FUNCTIONS */
  // search all entries --> doesn't exist --> return 0 else 1
  const exists = (event, entry) => event.results.finisher.filter(
    (x) => entry in x && x[entry]).length;

  const thisEvent = (eventNo, track) => track.events[eventNo - 1];

  const isCanceled = (eventNo, track) => (
    track.events[eventNo - 1].results?.dividends[0]?.finishers === "RF" ?
      true : false // Also Ran vs Scheduled Runners
  );

  const convertToAmt = (amt) => parseFloat(amt).toLocaleString(
      'en-US', { style: 'currency', currency: 'USD'});

  const convertBetType = (betType) => {
    const betTypes = {
      E5: 'Pentafecta',
      EX: 'Exacta',
      QU: 'Quinella',
      QU3: 'Trio',
      DD: 'Daily Double',
      DB: 'Daily Double',
      P3: 'Pick 3',
      P4: 'Pick 4',
      P5: 'Pick 5',
      P6: 'Pick 6',
      TR: 'Trifecta',
      TS: 'Tri-Super',
      TT: 'Twin-Tri',
      SU: 'Superfecta',
      SW: 'Omni'
    };

    return betTypes[betType]
  };

  const dateObj = (eventNo, track) => {
    try {
      const myDateObj = new Date(num(thisEvent(eventNo, track).postTime) * 1000);
      // test that we have a valid Date object
      myDateObj.toISOString("en-US", {timeZone: "America/New_York"});
      return myDateObj;
    } catch (error) {
      if (error instanceof RangeError) return new Date();
    }
  };

  // execution
  return `
  <div id="race">
    ${RaceJumpNav()}
    <br/>
    ${[...Array(track.events.length).keys()].map(
      x => RaceDisplay(++x, track)).join('<br/>')}
  </div>`;
}


// Builds the deep link into the live wagering app for a specific race.
// Requires the ITP track code (meetinfo's `track_code`, distinct from the
// legacy `event_code`/`event_type` fields) to identify the program; falls
// back to the app's homepage when we don't have enough to build a precise
// link (e.g. missing trackCode, or no programDate/raceNumber yet).
function buildBetNowUrl(trackCode, programDateDashed, raceNumber) {
  if (!trackCode || !programDateDashed || !raceNumber) {
    return 'https://app.offtrackbetting.com';
  }
  return 'https://app.offtrackbetting.com/#/lobby/live-racing' +
    `?programDate=${programDateDashed}&programName=${trackCode}&raceNumber=${raceNumber}`;
}

/* LIVE "NEXT RACE" MTP BANNER (new in v3)
   Driven by the page's existing 5-minute poll cycle (see template.tt2) --
   folds one /api/current_races/v2 fetch into that same cycle rather than
   opening a separate faster loop, since that endpoint is uncached too and
   isn't otherwise polled continuously anywhere on the site. A 1-second
   local tick between syncs gives a live-feeling countdown at zero added
   network cost; it only ever counts DOWN from the last real server value,
   never past it, and never below 0. */
var _liveBannerTickTimer = null;

function renderLiveBanner(meetno, name) {
  if (!$('#liveMtpBanner').length) {
    $('#results_content').before(
      '<div id="liveMtpBanner" class="cta-banner" style="display:none"></div>'
    );
  }
}

// MTP from the server is whole minutes; the 1s local tick below counts
// down in fractional minutes, so format as M:SS rather than show the raw
// (floating-point-noisy) decimal.
function formatMtp(mtpMinutes) {
  const totalSeconds = Math.round(mtpMinutes * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function updateLiveBanner(meetno, name, todaysRaces, trackCode) {
  renderLiveBanner(meetno, name);
  const $banner = $('#liveMtpBanner');
  if (_liveBannerTickTimer) { clearInterval(_liveBannerTickTimer); _liveBannerTickTimer = null; }

  const entry = (todaysRaces && todaysRaces.tracks || [])
    .find((t) => String(t.meetno) === String(meetno));

  if (!entry) { $banner.hide(); return; }

  const isPending = (+entry.mtp) >= 255;
  let mtp = +entry.mtp;

  const programDate = entry.programDate &&
    `${entry.programDate}`.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  const betNowUrl = buildBetNowUrl(trackCode, programDate, entry.currentRace);

  const render = () => {
    if (isPending) {
      $banner.html(`Race ${entry.currentRace} &middot; first post ${entry.time}`);
    } else if (mtp <= 0) {
      $banner.html(`Race ${entry.currentRace} &middot; at post &mdash; checking&hellip;`);
    } else {
      $banner.html(
        `Race ${entry.currentRace} &middot; ${formatMtp(mtp)} to post ` +
        `<a class="btn btn-sm" href="${betNowUrl}" ` +
        `target="_blank" rel="noopener">Bet now</a>`
      );
    }
  };

  render();
  $banner.show();

  if (!isPending && mtp > 0) {
    _liveBannerTickTimer = setInterval(() => {
      mtp = Math.max(0, mtp - 1 / 60); // 1s tick, mtp is in minutes
      render();
    }, 1000);
  }
}
