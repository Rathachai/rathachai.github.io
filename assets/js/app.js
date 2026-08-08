/* Client-side router: maps a single-level path to content/<slug>.md.
   On GitHub Pages, 404.html is a copy of index.html, so an unmatched path such
   as /publications still serves this app and the router reads location.pathname. */
(function () {
  'use strict';

  var HOME = 'home';
  var VALID_SLUG = /^[a-z0-9][a-z0-9-]*$/i;
  var SITE = 'Rathachai Chawuthai';

  var content = document.getElementById('content');
  var nav = document.getElementById('nav');
  var hero = document.getElementById('hero');
  var heroTitle = document.getElementById('hero-title');
  var heroSub = document.getElementById('hero-sub');
  var navBar = document.querySelector('.nav-bar');
  var heroBg = document.getElementById('hero-bg');
  var footerBg = document.getElementById('footer-bg');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The pinned nav is transparent over the banner and solid once scrolled.
  function syncNavBar() {
    navBar.classList.toggle('nav-solid', window.scrollY > 24);
  }

  /* Shift each banner layer against the scroll direction. The layer is inset
     18% top and bottom, so a small factor never uncovers an edge. */
  var SHIFT = 0.08;

  function parallax(box, layer) {
    if (!box || !layer) return;
    var rect = box.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return; // off-screen
    var fromCentre = rect.top + rect.height / 2 - window.innerHeight / 2;
    layer.style.transform = 'translate3d(0,' + (-fromCentre * SHIFT).toFixed(1) + 'px,0)';
  }

  function syncParallax() {
    if (reduceMotion.matches) return;
    parallax(hero, heroBg);
    parallax(document.querySelector('.site-footer'), footerBg);
  }

  /* Done straight from the scroll handler rather than behind a
     requestAnimationFrame latch: a latch that never gets its callback (a
     background or hidden tab) stays stuck and parallax dies for good. The work
     here is two rects and two transform writes, which is cheap enough. */
  function onScroll() {
    syncNavBar();
    syncParallax();
  }

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

  /* Optional leading block of "key: value" lines delimited by --- lines.
     Everything after it is Markdown. */
  function splitFrontMatter(text) {
    var m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
    if (!m) return { meta: {}, body: text };

    var meta = {};
    m[1].split(/\r?\n/).forEach(function (line) {
      var kv = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line);
      if (kv) meta[kv[1]] = kv[2].trim();
    });
    return { meta: meta, body: text.slice(m[0].length) };
  }

  function setHero(meta) {
    heroTitle.textContent = meta.hero || '';
    heroSub.textContent = meta.sub || '';
    heroSub.hidden = !meta.sub;
    hero.classList.toggle('hero-tall', meta.tall === 'true');
  }

  function notFound(slug) {
    setHero({ hero: 'Page not found' });
    content.innerHTML =
      '<p>There is no page at <code></code>.</p>' +
      '<p><a href="' + basePath() + '">← Back to home</a></p>';
    content.querySelector('code').textContent = '/' + slug;
    document.title = 'Page not found — ' + SITE;
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

  function afterRender(meta) {
    var h1 = content.querySelector('h1');
    var name = (meta.title || (h1 && h1.textContent) || '').trim();
    document.title = name && name !== SITE ? name + ' — ' + SITE : SITE;

    if (location.hash.length > 1) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) { target.scrollIntoView(); onScroll(); return; }
    }
    window.scrollTo(0, 0);
    onScroll();
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
      .then(function (text) {
        var doc = splitFrontMatter(text);
        setHero(doc.meta);
        content.innerHTML = window.renderMarkdown(doc.body);
        afterRender(doc.meta);
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
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
  load();
})();
