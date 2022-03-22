/*
Schedule - populate from cloudfront
*/
// const TodaysSchedule = (scheduleData) => {
//   return scheduleData.todaysraces.tracks.map((track) => `
//     <tr>
//       <td><a href="${track.resultsUrl}">${track.name}</a></td>
//       <td>${track.time}</td>
//     </tr>
//   `).join("\n");
// };

const TodaysSchedule = (scheduleData) => 
  scheduleData.todaysraces.tracks.map((track) => `
    <tr>
      <td><a href="${track.resultsUrl}">${track.name}</a></td>
      <td>${track.time}</td>
    </tr>
  `).join("\n");

const ThisDaysSchedule = (scheduleData) =>
  scheduleData.sort((a, b) => {
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0 }).map((track) => `
    <tr>
      <td>${track.canceled ? "<s>" : ""}
        ${track.name}
        ${track.canceled ? "</s>" : ""}</td>
      <td>${track.posttime}</td>
    </tr>
  `);

const FutureSchedules = (dates) => {
  dates.forEach((date) => $.getJSON({
    url: "https://json.offtrackbetting.com/schedule/2022/0322.json",
    crossDomain: true,
    success: (scheduleData) => $(`#day-${date} tbody`).append(
      ThisDaysSchedule(scheduleData)),
    error: (err) => {
      console.log("fail");
      console.log(err);
    }
  }));
};