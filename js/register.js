/* 
   override the signup form entries to include all states and 
   redirect to the proper submission form given the state

   UPDATES
   2011-04-07 [Adam] - creation date
*/

   var myform = document.getElementById('formWizStep1');
   var mystate = document.getElementById('state');

   // gather up the current form action
   var ebet_action = myform.action;

   // gather up all the current states
   var ebet_states = [];
   for (var i = 0; i < mystate.options.length; i++) {
       ebet_states.push(mystate.options[i].value);
   }

   // wipe it out and repopulate
   mystate.options.length = 0;

   var states = {
     "AL":"Alabama",
     "AK":"Alaska",
     "AZ":"Arizona",
     "AR":"Arkansas",
     "CA":"California",
     "CO":"Colorado",
     "CT":"Connecticut",
     "DE":"Delaware",
     "DC":"District of Columbia",
     "FL":"Florida",
     "GA":"Georgia",
     "HI":"Hawaii",
     "ID":"Idaho",
     "IL":"Illinois",
     "IN":"Indiana",
     "IA":"Iowa",
     "KS":"Kansas",
     "KY":"Kentucky",
     "LA":"Louisiana",
     "ME":"Maine",
     "MD":"Maryland",
     "MA":"Massachusetts",
     "MI":"Michigan",
     "MN":"Minnesota",
     "MS":"Mississippi",
     "MO":"Missouri",
     "MT":"Montana",
     "NE":"Nebraska",
     "NV":"Nevada",
     "NH":"New Hampshire",
     "NJ":"New Jersey",
     "NM":"New Mexico",
     "NY":"New York",
     "NC":"North Carolina",
     "ND":"North Dakota",
     "OH":"Ohio",
     "OK":"Oklahoma",
     "OR":"Oregon",
     "PA":"Pennsylvania",
     "RI":"Rhode Island",
     "SC":"South Carolina",
     "SD":"South Dakota",
     "TN":"Tennessee",
     "TX":"Texas",
     "UT":"Utah",
     "VT":"Vermont",
     "VA":"Virginia",
     "WA":"Washington",
     "WV":"West Virginia",
     "WI":"Wisconsin",
     "WY":"Wyoming"
   };

   mystate.options[0] = new Option('Choose');
   for (key in states) {
       mystate.options[mystate.options.length] = new Option(states[key], key);
   }

   // we need the action when the submit button is clicked
   myform.elements['wizNext'].setAttribute('onClick','return form_action(event)');

   function form_action (myevent) {
      var chosen_state = mystate.options[mystate.selectedIndex].value;

      // reset if they change their mind about which state
      myform.action = ebet_states.grep(chosen_state).length ? ebet_action : '/contactme';

   return myform.submit();
   }
