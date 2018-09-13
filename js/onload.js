// Begin OnLoad handler

function addLoadEvent(func) {
  var oldonload = window.onload;
  if (typeof window.onload != 'function') {
    window.onload = func;
  } else {
    window.onload = function() {
      if (oldonload) {
        oldonload();
      }
      func();
    }
  }
}

addLoadEvent(collapseText);

// End OnLoad handler


function collapseText() {
        if (document.getElementById('OTBInfo')) {
        document.getElementById('OTBInfo').style.display="none";
        }
}

function ToggleOTBInfo(containerName,toggleLink) {
	var div1 = document.getElementById(containerName);
	
	
	if (div1.style.display=="none") {
	   div1.style.display="block";
	   toggleLink.innerHTML='Read Less &gt;&gt;';
	}else{
	    div1.style.display="none";
	    toggleLink.innerHTML='Read More &gt;&gt;';
	}
	   
}


