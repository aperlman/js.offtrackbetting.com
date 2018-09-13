// login form
$("#loginButton").click(function () {
    var loginForm = $("#loginForm");
    var account = $("#accountNumber").val();
    var pin = $("#pin").val();
    var valid = true;
    if (account == "") {
        $("#accountNumber").parent().addClass("required")
        valid = false;
    }
    if (pin == "") {
        $("#pin").parent().addClass("required")
        valid = false;
    }
    if (valid) {
        loginForm.submit();          
    }
});   

// scroll to top
$(function(){
	$(document).on( 'scroll', function(){
		if ($(window).scrollTop() > 99) {
			$('.scroll-top-wrapper').addClass('show');
		} else {
			$('.scroll-top-wrapper').removeClass('show');
		}
	});
	$('.scroll-top-wrapper, .modal-scroll-top').on('click', scrollToTop);
});

function scrollToTop() {
	verticalOffset = typeof(verticalOffset) != 'undefined' ? verticalOffset : 0;
	element = $('body');
	offset = element.offset();
	offsetTop = offset.top;
	$('html, body').animate({scrollTop: offsetTop}, 500, 'linear');
}

// nav toggle
jQuery(function($) {
    var $wrapper = $('#wrapper'),
        $drawer = $('#nav-mobile'),
        $button = $('#nav-skip'),
        toggleDrawer = function() {
            $wrapper.toggleClass("active");
            $drawer.toggleClass("active");
            $button.toggleClass('toggled');
        };
    $('#main, #ticket, .toggleView').on('click', function() {
        if ($wrapper.hasClass('active')) toggleDrawer();
    });
    $button.on('click', function(e) {
        e.preventDefault();
        toggleDrawer();
    });
    $(window).on('resize', function() {
        if ($wrapper.hasClass('active')) toggleDrawer();
    });
});