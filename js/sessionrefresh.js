// When logged in we need to ensure that the session is refreshed
/*
$.get('/json/sessionrefresh');
setInterval(function() {
	$.get('/json/sessionrefresh');
}, 1000 * 60 * 15); // 15 minutes
*/

$.get('https://bet.offtrackbetting.com/api/sessionrefresh');
setInterval(function() {
	$.get('https://bet.offtrackbetting.com/api/sessionrefresh');
}, 1000 * 60 * 15); // 15 minutes


