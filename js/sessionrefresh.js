// When logged in we need to ensure that the session is refreshed
$.get('/json/sessionrefresh');
setInterval(function() {
	$.get('/json/sessionrefresh');
}, 1000 * 60 * 15); // 15 minutes
