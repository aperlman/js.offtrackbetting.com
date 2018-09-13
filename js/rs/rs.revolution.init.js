var revapi;
jQuery(document).ready(function() {

	 revapi = jQuery('.tp-banner').revolution(
				{
					delay:10000,
					autoplay:"true",
					startwidth:1200,
					startheight:480,
					autoHeight:"true",
					hideThumbs:10,
					fullWidth:"off",
					forceFullWidth:"off",
					fullScreen: "off",
					touchenabled:"on",
					onHoverStop:"on",
					hideThumbsOnMobile:"on",
					hideBulletsOnMobile:"on",
					hideArrowsOnMobile:"on",
					videoJsPath:"../videojs/",
					hideTimerBar:"on",
				});

		});	//ready
