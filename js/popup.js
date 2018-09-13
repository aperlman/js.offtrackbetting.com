/* 
   INPUTS:
        file: pulls a file from the 'popup' 
	      directory unless you start 
	      with a '/' for absolute urls
	      '.html' is optional
       width: # (default is 500)
      height: # (default is 500)
        name: NAMESPACE default is NULL
*/
function pop(file, width, height, name) {

    if (file == null) { alert("I have no filename to popup"); }
   
    // can you use full or absoluate urls to call popup locations otherwise
    //  we'll append popup to the url
    if (!(file.substring(0,4) == "http" || file.charAt(0) == '/')) { 
	file = '/popup/'+file;
    }

    /*if (file.substring(file.length - 5, file.length) != ".html") {
	file = file + '.html';
    }*/

    width  = (width  == null) ? 500 : width;
    height = (height == null) ? 500 : height;

    window.open(file, name, 'scrollbars=yes,width='+width+',height='+height);

return false;
}
