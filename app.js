// DOC Bern App – Navigation & Interactions

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  const target = document.getElementById('page-' + page);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const tab = document.querySelector('.tab[data-page="' + page + '"]');
  if (tab) tab.classList.add('active');

  history.pushState({ page }, '', '#' + page);
}

window.addEventListener('popstate', function (e) {
  if (e.state && e.state.page) {
    navigateTo(e.state.page);
  } else {
    navigateTo('home');
  }
});

window.addEventListener('DOMContentLoaded', function () {
  var hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById('page-' + hash)) {
    navigateTo(hash);
  }

  initFilters();
  initHeaderScroll();
});

// Event filter chips
function initFilters() {
  var chips = document.querySelectorAll('.filter-chip');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');

      var filter = chip.getAttribute('data-filter');
      var cards = document.querySelectorAll('.event-card-full');

      cards.forEach(function (card) {
        if (filter === 'all' || card.getAttribute('data-type') === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
}

// Header shrink on scroll
function initHeaderScroll() {
  var header = document.querySelector('.header-glass');
  var heroLogo = document.getElementById('headerLogo');
  var lastScroll = 0;

  window.addEventListener('scroll', function () {
    var scrollY = window.scrollY;

    if (scrollY > 40) {
      header.style.background = 'rgba(17, 17, 17, 0.92)';
    } else {
      header.style.background = 'rgba(17, 17, 17, 0.75)';
    }

    lastScroll = scrollY;
  }, { passive: true });
}

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
