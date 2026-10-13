/* "Horse Betting News" carousel — vanilla JS rewrite (no jQuery, no jcarousel).
   Bootstrap 5 Carousel, cards grouped per breakpoint (Option A):
   sm -> 1, md -> 2, lg -> 3, xl -> 4, xxl -> 6 cards per slide, implemented as
   five parallel carousels toggled with d-block/d-none responsive utilities
   (a single carousel can't vary its own items-per-slide by breakpoint).
   See tmp/phase-out-jquery/bootstrap5-upgrade-decisions.md item 1 and
   tmp/phase-out-jquery/demo-bs5-news-carousel.html (reviewed reference demo). */
(function () {
  var HEADLINES_URL = 'https://json.offtrackbetting.com/news/headlines.json';
  var WRAPPER_ID = 'news-headlines-carousels';
  var GROUPS = [
    { id: 'newsCarouselSm', size: 1 },
    { id: 'newsCarouselMd', size: 2 },
    { id: 'newsCarouselLg', size: 3 },
    { id: 'newsCarouselXl', size: 4 },
    { id: 'newsCarouselXxl', size: 6 }
  ];
  var COL_CLASS = { 1: 'col-12', 2: 'col-6', 3: 'col-4', 4: 'col-3', 6: 'col-2' };

  function chunk(list, size) {
    var out = [];
    for (var i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  }

  function buildCard(story, colClass) {
    var col = document.createElement('div');
    col.className = colClass;

    var card = document.createElement('div');
    card.className = 'card news-card';

    var img = document.createElement('img');
    img.className = 'card-img-top';
    img.src = story.img;
    img.alt = '';
    card.appendChild(img);

    var body = document.createElement('div');
    body.className = 'card-body';

    var heading = document.createElement('h4');
    heading.className = 'card-title h5';
    var link = document.createElement('a');
    link.href = story.pageName;
    link.textContent = story.title;
    heading.appendChild(link);
    body.appendChild(heading);

    var summary = document.createElement('p');
    summary.className = 'card-text small';
    summary.textContent = story.summary;
    body.appendChild(summary);

    card.appendChild(body);
    col.appendChild(card);
    return col;
  }

  function buildGroup(container, stories, size) {
    var inner = container.querySelector('.carousel-inner');
    if (!inner) return;
    inner.textContent = '';

    var slides = chunk(stories, size);
    slides.forEach(function (slideStories, idx) {
      var item = document.createElement('div');
      item.className = 'carousel-item' + (idx === 0 ? ' active' : '');
      var row = document.createElement('div');
      row.className = 'row';
      slideStories.forEach(function (story) {
        row.appendChild(buildCard(story, COL_CLASS[size]));
      });
      item.appendChild(row);
      inner.appendChild(item);
    });

    var controlsNeeded = slides.length > 1;
    container.querySelectorAll('.carousel-control-prev, .carousel-control-next').forEach(function (btn) {
      btn.classList.toggle('d-none', !controlsNeeded);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var wrapper = document.getElementById(WRAPPER_ID);
    if (!wrapper) return;

    fetch(HEADLINES_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var stories = (data && data.entries) || [];
        if (!stories.length) return;

        GROUPS.forEach(function (group) {
          var container = document.getElementById(group.id);
          if (container) buildGroup(container, stories, group.size);
        });

        wrapper.style.display = '';
      });
  });
})();
