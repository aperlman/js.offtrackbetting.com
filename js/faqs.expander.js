jQuery(document).ready(function() {
	jQuery('.expandItem').css("display", "none");
});

function toggleFAQ(faqtotoggle) {
	jQuery('.expandItem').each(function(index) {
		if (jQuery(this).attr("id") == faqtotoggle) {
			jQuery(this).slideDown(150);
			jQuery(this).prev().addClass("active");
		} else {
			jQuery(this).slideUp(150);
			jQuery(this).prev().removeClass("active");
		}
	});
}