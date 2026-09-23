// imarket2web - shared behaviour (mobile menu + footer year)
(function () {
  var header = document.querySelector('.site-header');
  var btn = document.getElementById('menu-toggle');
  if (header && btn) {
    btn.addEventListener('click', function () {
      var open = header.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.querySelectorAll('#mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        header.classList.remove('is-open');
        btn.setAttribute('aria-expanded', false);
      });
    });
  }
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
