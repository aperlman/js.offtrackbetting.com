/*
Minimize should always be used in production. Generate race.min.js using the
following:

terser race.js | sed -r 's/\\n\s+/ /g;' > race.min.js

Version: 2
  PRIMARY FUNCTIONS
    PopulateDates - Results Form
      SetDateLocations

    NOTE: these should be housed within Race
    Race - display the race
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
    dateObj: (eventNo, track) convert event date to date object
*/

// Enable Results Form
//  - raceDay: YYYYmmdd (this days results)
//  - initialize: boolean - true --> won't clean out current results
function PopulateDates(raceDay, initialize) {
  var validDays = []; // list in YYYYmmdd format

  // fetch from selected track (form)
  const [meetno, trackURI] = $('select[name="track"]').val().split('/');

  // if we aren't initializing -- we need rebuild the date field
  const resetDateField = () => {
    $('.datepicker').val('');
    $(".datepicker").datepicker("destroy");

    $("#resultsForm > fieldset > legend").html("Select Date to Continue");
    // highlight the date fieldset
    $(".datepicker").css('border-color', 'red');
  };

  const setDateLocations = (meetno, trackURI, validDays) => {

    // true if date in validDays -- false otherwise
    const enableDays = (date) => {
      var dateStr = $.datepicker.formatDate('yymmdd', date);
      return ($.inArray(dateStr, validDays) != -1) ? [true] : [false];
    };
  
    // default raceDay is the last day of the validDays list
    if (raceDay === undefined) raceDay = validDays[validDays.length - 1];

    // defines jquery's datepicker function
    $('.datepicker').datepicker({
      beforeShowDay: enableDays,
      defaultDate: `${raceDay}`,
      yearRange: `${validDays[0].substring(0,4)}:nn`,
      changeMonth: true,
      changeYear: true,
      dateFormat: "yymmdd",
      altField: '#dateSubmit',
      onSelect: function(date, instance) {
        var addDateToURI = `-${date}`;

        // last date the track ran --> remove the date from the URI
        if (date == validDays[validDays.length - 1]) addDateToURI = '';

        $(location).attr('href', "https://www.offtrackbetting.com/results/" +
          `${meetno}/${trackURI}${addDateToURI}.html`);
      }
    });
  };

  // pushes current YYYYmmdd day onto validDays if appropriate
  const addCurrentRaceDay = (racingTracks) => {
    const raceIndex = racingTracks.tracks.findIndex(v => v.meetno == meetno);

    if (raceIndex > -1) { // this track is running today?
      // program_date [INT] becomes currentRaceDay [STR]
      const currentRaceDay = `${racingTracks.tracks[raceIndex].programDate}`;

      // if the current day doesn't exist, add it to validDays
      if (!(validDays.find(e => e === currentRaceDay)))
        validDays.push(currentRaceDay);
    }
  };

  // execution
  if (!(initialize)) resetDateField(); // selected new track

  $.ajax({
    url: `https://json.offtrackbetting.com/tracks/v2/${meetno}/meetdays.txt`,
    crossDomain: true
  })
    .done( (dateStr) => validDays = dateStr.split("\n") )
    .fail((jqXHR, status, err) => {
      console.log("failed to fetch meetdays.txt for meetno: " + meetno);
      console.log(err);
    })
    .always( () => {
      // is this track running today?
      if (typeof todaysRaces === "undefined" || !("tracks" in todaysRaces)) {
        // previous AJAX call did not complete -- try again
        $.getJSON({
          url: 'https://us-west-2.aws.data.mongodb-api.com/app/races-bwsnh/endpoint/current_races/v2',
          crossDomain: true
        })
          .done((data) => {
            todaysRaces = data.todaysraces; //sets our global variable
            addCurrentRaceDay(todaysRaces);
          })
          .fail((jqXHR, status, err) => {
            console.log("failed to get current days races");
            console.log(err);
          })
          .always( () => setDateLocations(meetno, trackURI, validDays) );
      } else {// we have a previously cached version of todaysRaces
        addCurrentRaceDay(todaysRaces);
        setDateLocations(meetno, trackURI, validDays);
      }
    });
} // end PopulateDates



// Display Results
function Race(track) {
  // execution is at end of function

  /* HEADER */
  const RaceDisplay = (eventNo, track) => (
    RaceTitle(eventNo, track) // comes from the page itself
    + SelectionTable(eventNo, track)
    + ('results' in track.events[eventNo -1] ? 
      DividendTable(eventNo, track) : '')
    //+ ActionBox(eventNo, track)
    // any time the eventNo is 1, OR if it's after 1/1/2022,
    // display the action box, otherwise hide it
    + (eventNo == 1 || parseInt( 
        thisEvent(eventNo, track).postTime.$numberDouble ||
        thisEvent(eventNo, track).postTime
        ) > 1640995200 ? ActionBox(eventNo, track) : '')
    + RaceDetails(eventNo, track)
    + (eventNo == 3 ? PromoSignup(track) : '')
    + (eventNo == (track.events.length > 6 && track.events.length - 3)
        ? PromoJoin(track) : '')
  );

  const RaceTitle = (eventNo, track) => {
    const dateStr = dateObj(eventNo, track)
      .toLocaleDateString("en-US", {timeZone: "America/New_York"})
      .replace(/\//g,"-");

    return `
      <div id="raceTitle" name="race${eventNo}">
        <h3>Race ${eventNo} 
          <span>${track.ID} ${dateStr}</span></h3>
      </div>
      ${isCanceled(eventNo, track) ? `<h4>Race Canceled</h4>` : ''}`;
  }

  /* SELECTIONS */
  const SelectionTable = (eventNo, track) => `
    <div id="selection" class="${
      thisEvent(eventNo, track).results ? 'results' : 'odds'}
      table-responsive">
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
      <th id="selectionText">${event.breed == "Dog" ? 'Greyhound' : 'Horse'}
      </th>
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
              (isNaN(x.programNumber)
                ? x.programNumber.replace(/\D/g, '') : x.programNumber)}"
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
          (isNaN(x.number) ? x.number.replace(/\D/g, '') : x.number)}">
          <a>${x.number}</a></td>
        <td><strong>${x.name}</strong></td>
        <td>${x.morningOdds}</td>
      </tr>
    `).join("\n");
  };

  /* DIVIDENDS */
  const DividendTable = (eventNo, track) => `
    <div id="dividends" class="table-responsive">
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
      // XXX if (isNaN(parseInt(amt))) console.log("wtf: " + amt);
      const dollars = convertToAmt(parseInt(amt)/100);
      return (dollars.endsWith(".00")) ? dollars.slice(0,-3) : dollars; 
    };

    return event.results.dividends.map( (x, idx) => `
      <tr>
        <td>${dispAmt(x.baseAmount?.$numberDouble || x.baseAmount?.$numberInt 
          || x.baseAmount)}&nbsp;${convertBetType(x.betType) || x.betType}
        </td>
        <td>${x.finishers.replace(/\//g,"/<wbr>")}</td>
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
          '<li><strong>Scratches:</strong>&nbsp;' + 
          event.results.scratches.join(", ") + '</li>' : '' }

        ${ // purse and distance --> opening tag
          (event.purse.$numberDouble && event.purse.$numberDouble > 0) || 
          event.distance ? '<li>' : '' }
        
        ${ // PURSE
          event.purse.$numberDouble && event.purse.$numberDouble > 0 ?
          '<strong>Purse:</strong> ' + convertToAmt(
            parseInt(event.purse.$numberDouble)/100).slice(0,-3) : '' }
        
        ${ // DISTANCE
          event.distance ? ' <strong>Distance:</strong> '+
          event.distance.toString().replace(/[Ff]$/, ' Furlongs') : '' }
        
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
            '<li><strong>Conditions:</strong> ' + event.conditions +
            '</li>': ''}

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
    const postYear = dateStr.match(/^\d{4}/);

    const programDate = track.businessDate
    .replace(/(\d{4})(\d{2})(\d{2})/g, '$1-$2-$3');
    
    // we don't have replays from before 2022 - these links reflect that

    const buildHTMLLink = () => {
      const prefix = '<a href="https://app.offtrackbetting.com/#/lobby/';
      const attribs = 'class="btn btn-blue text-right" role="button">';
      return postYear < 2022 ?
        prefix + '"' +  attribs :
        prefix + `live-racing?programDate=${programDate}&` + 
          `programName=${track.eventCode}&raceNumber=${eventNo}"` + attribs;
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
      const myDateObj = new Date( // convert postTime to date obj
        parseInt(
          thisEvent(eventNo, track).postTime.$numberDouble ||
          thisEvent(eventNo, track).postTime
        ) * 1000);
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
    <br/>
    ${[...Array(track.events.length).keys()].map(
      x => RaceDisplay(++x, track)).join('<br/>')}
  </div>`;
}
