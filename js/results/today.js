/* 
Version: 2

*/
const PopulateTodayRaces = () => {
  $.getJSON({
    url: "https://us-west-2.aws.data.mongodb-api.com/app/races-bwsnh/" +
      "endpoint/current_races/v2",
    crossDomain: true,
    success: (currentRaces) => $("#todaystracks .items").html(
      TodaysRaces(currentRaces)),
    error: (err) => {
      console.log("fail");
      console.log(err);
    }
  });
};

const TodaysRaces = (events) => events.todaysraces.tracks.map((track) => `
  <a href="${track.resultsUrl}" alt="${track.name} Results"
    title="current race: ${track.currentRace} mtp: ${track.mtp}"
    class="item btn btn-default">${track.name}</a>`).join("\n");