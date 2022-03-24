/*
 Schedule - populate from cloudfront

 - TodaysSchedule: given scheduleData, return rows of table
 - FutureSchedules: given dates (YYYY-mm-dd), populate table for each date
   - ThisDaysSchedule(scheduleData): return individual day's schedule rows
*/


function ConvertTime(date, timeStr) {
  // ETOffset --> set in main page
  const offset = ETOffset + (new Date().getTimezoneOffset())/60;
  const timeParts = timeStr.split(/:| /).map(
    (part, idx) => (idx < 2) ? parseInt(part) : part);
  const ampm = timeParts.pop();
  timeParts[0] += (ampm == "PM") ? 12 : 0;

  const dateParts = date.split('-').map((d) => parseInt(d));
  dateParts[1] -= 1;

  const localTime = new Date(...[...dateParts, ...timeParts, 0]);
  localTime.setHours(localTime.getHours() - offset);

  return localTime.toLocaleTimeString().replace(':00', '') + " (local time)";
}

function DisplayLocalTime(date, cell) {
  current_value = cell.innerHTML;
  return (original) => cell.innerHTML = (original) ? current_value : 
    ConvertTime(date, current_value); 
}

function ThisDaysSchedule(date, scheduleData) {
  return scheduleData.sort((a, b) => {
    if (a.name > b.name)
      return 1;
    if (a.name < b.name)
      return -1;
    return 0;
  }).map((track) => `
      <tr>
        <td>${track.canceled ? "<s>" : ""}${track.name}${
          track.canceled ? "</s>" : ""}</td>
        <td onMouseOver="localTime=DisplayLocalTime('${date}', this); 
          localTime(false);"
          onMouseOut="localTime(true);"
          >${track.posttime}</td>
      </tr>`);
}

function FutureSchedules(dates) {
  dates.forEach((date) => {
    // YYYY-mm-dd --> YYYY/mmdd
    const dateURL = date.replace('-','/').replace('-','');
    $.getJSON({
      url: `https://json.offtrackbetting.com/schedule/${dateURL}.json`,
      crossDomain: true,
      success: (scheduleData) => $(`#day-${date} tbody`).html(
        ThisDaysSchedule(date, scheduleData)),
      error: (err) => {
        console.log("fail");
        console.log(err);
      }
    });
  });
}

function TodaysSchedule(date, scheduleData) {
  return scheduleData.todaysraces.tracks.map((track) => `
    <tr>
      <td><a href="${track.resultsUrl}">${track.name}</a></td>
      <td onMouseOver="localTime=DisplayLocalTime('${date}', this); 
      localTime(false);" onMouseOut="localTime(true);">${track.time}</td>
    </tr>`).join("\n");
}
