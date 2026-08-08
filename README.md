# rathachai-web

Personal academic website — plain HTML/CSS/JS, no build step. Pages are written
as Markdown files and rendered in the browser.

## Structure

```
index.html              app shell (header, nav, footer)
404.html                copy of index.html — see "Routing" below
assets/css/style.css    all styling (light + dark, responsive)
assets/js/markdown.js   dependency-free Markdown renderer
assets/js/app.js        router: maps a URL path to a content file
content/home.md         /
content/publications.md /publications
content/teaching.md     /teaching
content/data-analytics.md   /data-analytics
content/semantic-web.md     /semantic-web
images/
.nojekyll               tells GitHub Pages to serve files as-is
```

## Routing

`/<slug>` loads `content/<slug>.md`. The root path loads `content/home.md`.

GitHub Pages has no server-side rewrites, so `404.html` is a copy of
`index.html`: a request for `/publications` finds no such file, GitHub serves
`404.html`, and the router reads `location.pathname` and loads the right
content. Navigation between pages uses `history.pushState`, so no reload.

Tradeoff: those URLs return an HTTP 404 status. Browsers render them normally;
crawlers may treat them as missing. `?p=<slug>` also works as an entry point.

**If you edit `index.html`, copy it over `404.html` again:**

```bash
cp index.html 404.html
```

## Adding a page

1. Create `content/my-page.md`. It is live at `/my-page` immediately — no
   registration step.
2. If it should appear in the menu, add a link in `index.html` (then re-copy
   to `404.html`).

## Page front matter

A content file may start with an optional block of `key: value` lines between
`---` delimiters. It controls the banner at the top of the page:

```
---
hero: Data Analytics                          # large text over the banner
sub: Wake your data up. They'll work for you. # smaller line beneath it
tall: true                                    # taller banner (home page)
title: Data Analytics                         # browser tab title
---
```

Every key is optional. Without `title`, the page's first `# Heading` is used.

## Supported Markdown

Headings, horizontal rules, tables, blockquotes, ordered/unordered lists,
fenced code, inline code, bold, italic, links, images, bare URLs (auto-linked),
and raw HTML blocks. A single newline inside a paragraph renders as a line
break, which is what keeps the office address on separate lines.

A raw HTML block runs until the next blank line, so **do not leave blank lines
inside one**. That is how the home page builds its photo-beside-name intro and
its address-beside-map layout.

### Embedding video and slides

Wrap the iframe in `.embed` (16:9, for YouTube) or `.embed embed-slides`
(taller, for SlideShare) so it scales with the page:

```html
<div class="embed">
<iframe src="https://www.youtube.com/embed/VIDEO_ID" title="..." allowfullscreen loading="lazy"></iframe>
</div>
```

## Images

`images/banner.jpg` is the single starry-sky banner used by both the page
header and the footer strip, matching the original site. Replace that one file
to restyle every page at once.

## Local preview

`fetch()` does not work over `file://`, so serve over HTTP:

```bash
python3 -m http.server 4000
```

Then open http://127.0.0.1:4000/. Note that this server does not do the
`404.html` fallback, so a hard reload at `/publications` will 404 locally —
use `/?p=publications` to test those pages, or just click through the nav.

## Deploy

Push to the default branch, then in **Settings → Pages** set Source to
"Deploy from a branch" → `main` → `/ (root)`.

The site assumes it is served from a domain root (`<base href="/">` in
`index.html`). If you host it under a project subpath instead, for example
`username.github.io/rathachai-web/`, change that tag to
`<base href="/rathachai-web/">` and re-copy `index.html` to `404.html`.
