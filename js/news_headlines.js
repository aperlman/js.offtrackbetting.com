/* 
   Horse Betting News - Carousel Headlines

   NOTE: This is development code -- the real thing should be embedded in 
         a js file that's loaded everywhere (otb.js?) as this happens on nearly
         every page of the site.

   * Reads in current news from js.offtrackbetting.com/news/headlines.json
   * Builds out Carousel HTML data from these results
   
   * Width is set to 272px;
*/

// TRADITIONAL CHANGES
// $(document).ready( function () {
//   $.getJSON({
//     url: 'https://json.offtrackbetting.com/news/headlines.json',
//     crossDomain: true,
//     success: function (data) {
//       $(data.entries).each((idx, story) => {
//         $("#jcarousel_news_headlines ul").append(
//           "<li>"+
//           "<img src=\"" + story.img + "\" class=\"lazyloaded\" alt=\"\">" +
//           "<h4><a href=\"" + story.page_name + "\">" + story.title + 
//           "</a></h4>" + story.summary + "</li>"
//         )
//       });
//       $("#jcarousel_news_headlines").show();
//     }
//   });
// });

// TEMPLATE (delivers the layout back to the HTML developer)
$(document).ready( function () {
  $.getJSON({
    url: 'https://json.offtrackbetting.com/news/headlines.json',
    crossDomain: true
  })
    .done(function (data) {
      // turn the template into a string
      var $template = $("#jcarousel_news_headlines template").html();
      //$("#jcarousel_news_headlines template").remove();

      $(data.entries).each((idx, story) => {
        // copy template - sans reference
        var clone = (' ' + $template).slice(1)
          .replace("[story.img]", story.img)
          .replace("[story.title]", story.title)
          .replace("[story.pageName]", story.pageName)
          .replace("[story.summary]", story.summary);

        $("#jcarousel_news_headlines ul").append(clone);
      });
      
      $("#jcarousel_news_headlines").show();
    });
}); // $(document).ready()