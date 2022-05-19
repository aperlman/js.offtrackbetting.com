/*
Version: 2
  PRIMARY FUNCTIONS
    Race
      RaceDisplay
      RaceTitle
      SelectionTable
        SelectionColHeaders
        SelectionRows
      DividendTable
        DividendColHeaders
        DividendRows
      ActionBox
        ActionButton
      RaceDetails

      PromoSignup: after race #3
      PromoJoin: 3rd race from end (if the track has more than 6 races)

  HELPER FUNCTIONS
    exists: (bool) does entry exist in results? i.e. 'jockey'?
    thisEvent: extract the current event from 'eventNo' and 'track' data
    isCanceled: (bool) return true if a track is canceled
    convertBetType: EX --> Exacta for instance
    convertToAmt: string of pennies converted to number of dollars and cents
*/

const Race = (track) => `
  <div id="race">
    <br/>
    ${[...Array(track.events.length).keys()].map(
      x => RaceDisplay(++x,track)).join('<br/>')}
  </div>`;

/* HEADER */
const RaceDisplay = (eventNo, track) => (
  RaceTitle(eventNo, track) // comes from the page itself
  + SelectionTable(eventNo, track)
  + ('results' in track.events[eventNo -1] ? 
    DividendTable(eventNo, track) : '')
  + ActionBox(eventNo, track)
  + RaceDetails(eventNo, track)
  + (eventNo == 3 ? PromoSignup(track) : '')
  + (eventNo == (track.events.length > 6 && track.events.length - 3)
      ? PromoJoin(track) : '')
);

const RaceTitle = (eventNo, track) => {
  const date_str = new Date( // convert post_time to date then --> m-d-YYYY
      parseInt(
        thisEvent(eventNo, track).postTime.$numberDouble ||
        thisEvent(eventNo, track).postTime
      ) * 1000)
    .toLocaleDateString("en-US", {timeZone: "America/New_York"})
    .replace(/\//g,"-");

  return `
    <div id="raceTitle">
      <h3>Race ${eventNo} <span>${track.ID} ${date_str}</span></h3>
    </div>
    ${isCanceled(eventNo, track) ? `<h4>Race Canceled</h4>` : ''}`;
}

/* SELECTIONS */
const SelectionTable = (eventNo, track) => `
  <div id="selection" class="${
    thisEvent(eventNo, track).results ? 'results' : 'odds'} table-responsive">
    <table class="table table-striped table-condensed table-bordered">
      <thead>
        <tr>${SelectionHeader(eventNo, track)}</tr>
      </thead>
      <tbody>
        ${SelectionBody(eventNo, track)}
      </tbody>
    </table>
  </div>`;

const SelectionHeader = (eventNo, track) => {
  const event = thisEvent(eventNo, track);

  // RESULTS
  if ('results' in event) {
    let headers = ['Win']; // default headers
    if (exists(event, 'placeAmount')) headers.push('Place');
    if (exists(event, 'showAmount')) headers.push('Show');

    // harness track? --> 'jockey' becomes 'driver'
    const person = (event.breed.toLowerCase() === 'harness') ? 
      'Driver' : 'Jockey';

    const horse_header = (exists(event, 'jockey') ? 
      ['Horse', person] : ['Horse']);

    // jockey entry means horse race --> otherwise Dog
    headers.unshift(...event.breed.toLowerCase() === "dog" ?
     ['Greyhound'] : horse_header);

    // set selectionText for display in process
    return `<th>#</th>` +
      headers.map( (x, idx) => `
        <th${idx < headers.indexOf('Win') ? ' id="selectionText"' : ''}>
        ${x}</th>`).join("\n");
  }

  // RUNNERS
  return `<th>#</th>
    <th id="selectionText">${event.breed == "Dog" ? 'Greyhound' : 'Horse'}</th>
    <th>M/L Odds</th>`;
};

const SelectionBody = (eventNo, track) => {
  const event = thisEvent(eventNo, track);

  // RESULTS
  if ('results' in event) {
    return event.results.finisher.map( (x, idx) => `
      <tr>
        <td class="postposition ${/* color: [h]pp1 .. [h]pp24 */''}
          ${(event.breed.toLowerCase() === 'harness' ? 'hpp' : 'pp') +
            (isNaN(x.programNumber) ? x.programNumber.replace(/\D/g, '') : x.programNumber)}"
        ><a>${x.programNumber}</a></td>
        <td><strong>${x.runnerName}</strong></td>
        ${ exists(event, 'jockey') ? 
          ("<td>" + (x.jockey || '') + "</td>") : '' }
        <td id="amt">${x.winAmount || ''}</td>
        ${ exists(event, 'placeAmount') ?
          ('<td id="amt">' + (x.placeAmount || '') + '</td>') : ''}
        ${ exists(event, 'showAmount') ?
          ('<td id="amt">' + (x.showAmount || '') + '</td>') : ''}
      </tr>
    `).join("\n");
  }

  // NO RESULTS YET...
  return event.runners.map( x => `
    <tr>
      <td class="postposition ${/* color: [h]pp1 .. [h]pp24 */''}
      ${(event.breed.toLowerCase() === 'harness' ? 'hpp' : 'pp') +
        (isNaN(x.number) ? x.number.replace(/\D/g, '') : x.number)}"><a>${x.number}</a></td>
      <td><strong>${x.name}</strong></td>
      <td>${x.morningOdds}</td>
    </tr>
  `).join("\n");
};

/* DIVIDENDS */
const DividendTable = (eventNo, track) => `
  <div id="dividends">
    <table class="table table-striped table-condensed table-bordered">
      <thead>
        <tr>
          ${['Bet Type', 'Runners', 'Pay Out'].map(
            x => '<th>' + x + '</th>').join("\n")}
        </tr>
      </thead>
      <tbody>
        ${DividendBody(eventNo, track)}
      </tbody>
    </table>
  </div>`;

const DividendBody = (eventNo, track) => {
  const event = thisEvent(eventNo, track);

  if (isCanceled(eventNo, track)) return '';

  const dispAmt = (amt) => {
    if (isNaN(parseInt(amt))) console.log("wtf: " + amt);
    const dollars = convertToAmt(parseInt(amt)/100);
    return (dollars.endsWith(".00")) ? dollars.slice(0,-3) : dollars; 
  };

  return event.results.dividends.map( (x, idx) => `
    <tr>
      <td>${dispAmt(x.baseAmount?.$numberDouble || x.baseAmount?.$numberInt || x.baseAmount)}&nbsp;${convertBetType(x.betType) || x.betType}
      </td>
      <td>${x.finishers}</td>
      <td>${convertToAmt(x.amount?.$numberDouble || x.amount)}</td>
    </tr>
  `).join("\n");
};

const RaceDetails = (eventNo, track) => {
  const event = thisEvent(eventNo, track);

  return `
    <ul>
      ${ // SCRATCHES
        'results' in event && event.results.scratches[0] ? 
        '<li><strong>Scratches:</strong>&nbsp;' + event.results.scratches.join(", ")
        + '</li>' : '' }

      ${ // purse and distance --> opening tag
        (event.purse.$numberDouble && event.purse.$numberDouble > 0) || 
        event.distance ? '<li>' : '' }
      
      ${ // PURSE
        event.purse.$numberDouble && event.purse.$numberDouble > 0 ?
        '<strong>Purse:</strong> ' + convertToAmt(
          parseInt(event.purse.$numberDouble)/100).slice(0,-3) : '' }
      
      ${ // DISTANCE
        event.distance ? ' <strong>Distance:</strong> '+
        event.distance.replace(/[Ff]$/, ' Furlongs') : '' }
      
      ${ // purse and distance --> closing tag
        (event.purse.$numberDouble && event.purse.$numberDouble > 0) ||
         event.distance ? '</li>' : '' }

      ${ // POST TIME
        event.postTime.$numberDouble ? 
        '<li><strong>Scheduled Post:</strong> ' + new Date(
          event.postTime.$numberDouble * 1000).toLocaleTimeString( 'en-US', 
          { hour: 'numeric', minute: 'numeric', hour12: true } ) + 
          '</li>' : '' }

      ${ // CONDITIONS
        event.conditions && typeof event.conditions === 'string' ? 
          '<li><strong>Conditions:</strong> ' + event.conditions + '</li>': ''}

      ${ // ALSO RAN
        event.results?.alsoRan && event.results.alsoRan.length ?
        `<li><strong>${isCanceled(eventNo, track) ? 
          "Scheduled Runners" : "Also Ran"}:</strong>&nbsp;`
        + event.results.alsoRan.join(', ')
        + '</li>' : '' }

    </ul>
  `;
}

const ActionBox = (eventNo, track) => `
  <div id="actionbox">
    <div class="row">
      <div class="col-md-8 text-left">
        ${ thisEvent(eventNo, track).runners.length > 0 ?
          `No results for ${track.ID} Race ${eventNo} yet - place your bets!` :
          `Watch ${track.ID} Race ${eventNo} Video Replay`}
      </div>
      <div class="col-md-4">
        ${ActionButton(
          thisEvent(eventNo, track).runners.length > 0 ? false : true)}
      </div>
    </div>
  </div>
`;

const ActionButton = (raceComplete) => `
    <a href="/login.html" class="btn btn-blue text-right" role="button">
    ${raceComplete ? '<i class="fa fa-play-circle"></i> Watch Replay' :
      'BET NOW'}
    </a>
`;

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
