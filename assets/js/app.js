/* Client-side router: maps a single-level path to content/<slug>.md.
   On GitHub Pages, 404.html is a copy of index.html, so an unmatched path such
   as /publications still serves this app and the router reads location.pathname. */
(function () {
  'use strict';

  var HOME = 'home';
  var VALID_SLUG = /^[a-z0-9][a-z0-9-]*$/i;

  var content = document.getElementById('content');
  var nav = document.getElementById('nav');

  // Path relative to <base href>, so routing works under a project subpath too.
  function basePath() {
    return new URL(document.baseURI).pathname;
  }

  function currentSlug() {
    var qs = new URLSearchParams(location.search).get('p');
    if (qs) return qs;
    var base = basePath();
    var path = location.pathname;
    if (path.indexOf(base) === 0) path = path.slice(base.length);
    path = path.replace(/^\/+|\/+$/g, '');
    return path || HOME;
  }

  function notFound(slug) {
    content.innerHTML =
      '<h1>Page not found</h1>' +
      '<p>There is no page at <code></code>.</p>' +
      '<p><a href="' + basePath() + '">← Back to home</a></p>';
    content.querySelector('code').textContent = '/' + slug;
    document.title = 'Page not found — Rathachai Chawuthai';
  }

  function setActiveNav(slug) {
    var base = basePath();
    var links = nav.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      var href = new URL(links[i].getAttribute('href'), document.baseURI).pathname;
      var linkSlug = href.indexOf(base) === 0 ? href.slice(base.length) : href;
      linkSlug = linkSlug.replace(/^\/+|\/+$/g, '') || HOME;
      links[i].classList.toggle('active', linkSlug === slug);
    }
  }

  function afterRender() {
    var h1 = content.querySelector('h1');
    document.title = h1 && h1.textContent.trim()
      ? h1.textContent.trim() + ' — Rathachai Chawuthai'
      : 'Rathachai Chawuthai';

    if (location.hash.length > 1) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) { target.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }

  function load() {
    var slug = currentSlug();
    setActiveNav(slug);

    if (!VALID_SLUG.test(slug)) { notFound(slug); return; }

    fetch('content/' + slug + '.md', { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (md) {
        content.innerHTML = window.renderMarkdown(md);
        afterRender();
      })
      .catch(function () { notFound(slug); });
  }

  // Intercept internal links so navigation happens without a full page reload.
  document.addEventListener('click', function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;

    var a = e.target.closest && e.target.closest('a');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;

    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;

    var url = new URL(href, document.baseURI);
    if (url.origin !== location.origin) return;
    if (url.pathname.indexOf(basePath()) !== 0) return;
    if (/\.[a-z0-9]+$/i.test(url.pathname)) return; // let real files (e.g. .md) load normally

    e.preventDefault();
    if (url.href !== location.href) {
      history.pushState(null, '', url.href);
      load();
    }
  });

  window.addEventListener('popstate', load);
  load();
})();
