// OTB hero carousel behavior (Bootstrap 5 Carousel, replaces Slider Revolution).
// See tmp/phase-out-jquery/bootstrap5-upgrade-decisions.md item 2 (Option E).
(function () {
  var carousel = document.getElementById('otbHero');
  if (!carousel) return;

  // After the first transition, let slide 1 animate its captions like the others.
  carousel.addEventListener('slide.bs.carousel', function () {
    var first = carousel.querySelector('.otb-first');
    if (first) first.classList.remove('otb-first');
  }, { once: true });

  // Bootstrap 5's stock carousel leaves inactive slides in the tab order/a11y tree.
  // Keep only the active slide focusable/exposed to assistive tech.
  function updateInertSlides() {
    var items = carousel.querySelectorAll('.carousel-item');
    for (var i = 0; i < items.length; i++) {
      if (items[i].classList.contains('active')) {
        items[i].removeAttribute('inert');
      } else {
        items[i].setAttribute('inert', '');
      }
    }
  }

  updateInertSlides();
  carousel.addEventListener('slid.bs.carousel', updateInertSlides);
})();
