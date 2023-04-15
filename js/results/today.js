/* 
Version: 2

Minimize should always be used in production. Generate race.min.js using the
following:

terser today.js | sed -r 's/\\n\s+/ /g;' > today.min.js
*/
function PopulateTodaysRaces() {
  // {name} in the url means we don't have it setup in meetinfo
  const TodaysRaces = (todaysraces) => todaysraces.tracks.filter(
  (track) => !track.resultsUrl.includes("{name}")).map((track) => 
    `<a href="${track.resultsUrl}" alt="${track.name} Results"
    title="current race: ${track.currentRace} mtp: ${track.mtp}"
    class="item btn btn-default">${track.name}</a>`).join("\n");

  // [todaysRaces] global variable -- populated when OTB Schedule loads
  if (typeof todaysRaces === "undefined" || !("tracks" in todaysRaces)) {
    $.getJSON({
      url: 'https://us-west-2.aws.data.mongodb-api.com/app/races-bwsnh/endpoint/current_races/v2',
      crossDomain: true
    })
      .done((data) => {
        todaysRaces = data.todaysraces; //sets our global variable
        $("#todaystracks .items").html(TodaysRaces(todaysRaces))
      })
      .fail((jqXHR, status, err) => {
        console.log("failed to load current races [PopulateTodaysRaces()]");
        console.log(err);
      });
  }else{
    $("#todaystracks .items").html(TodaysRaces(todaysRaces));
  }
};
