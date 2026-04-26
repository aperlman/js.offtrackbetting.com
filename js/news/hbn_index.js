/*
Horse Betting News - Index Pages

Max Stories per Page: 10

HTML Tags
- 

Minimize should always be used in production. Generate hbn_index.min.js using
the following:

terser hbn_index.js | sed -r 's/\\n\s+/ /g;' > hbn_index.min.js
*/
function ListStories() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(prop),
    });
    const currentPage = params.p || 1;
    $("#pageNumber").replaceWith(currentPage);

    const populateLinks = (page) => {
      $.getJSON({
        url: `https://json.offtrackbetting.com/news/pages/headlines-${currentPage}.json`,
        crossDomain: true
      }).done((data) => {
        // populate the template
        // data.maxPages
        // data.entries
        //   pageName | summary | title | img?
        console.log(data);
        
        $("#maxPages").replaceWith( // complete with comma's
          data.maxEntries.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));

        $("#fakeSecs").replaceWith(Math.random().toFixed(3).toString());

        var $template = $("#storyTemplate").html();
          $("#storyTemplate").remove();

        $(data.entries).each((idx, story) => {
          var clone = (' ' + $template).slice(1)
            .replace("[story.title]", story.title)
            .replace("[story.summary]", story.summary)
            .replace("[story.pageName]", story.pageName);
          
            $("#storyLinks").append(clone);
        });

        populatePageNumbers(data.maxEntries);
      });
    };

    const populatePageNumbers = (maxStories) => {
      var storiesPerPage = 10;
      var firstPage = parseInt(currentPage) - 5;
      var lastPage = parseInt(currentPage) + 4;
      
      if (lastPage > (maxStories / storiesPerPage)) {
        lastPage = Math.ceil(maxStories / storiesPerPage);
        firstPage = lastPage - storiesPerPage;
      }else if (firstPage < 1) {
        firstPage = 1;
        lastPage = storiesPerPage;
      }

      console.log("first page: " + firstPage);
      console.log("last page: " + lastPage);

      var template = $("template#pageNumberTemplate").html();

      // var clone = $("#pageNumberTemplate #pnFirstPage").text(); //find("#pnFirstPage").html("<span></span>");
      // var clone = $("#whatever").html(); //find("#pnFirstPage").html("<span></span>");
      var cloney = $(template).find("#pnFirstPage").html();

      console.log(cloney);

      // console.log(maxStories);
      // console.log(template);
    };

    populateLinks(currentPage);
}
