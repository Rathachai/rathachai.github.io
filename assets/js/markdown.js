/* Minimal Markdown renderer — supports the subset used by this site:
   headings, horizontal rules, GFM tables, blockquotes, unordered/ordered
   lists, fenced code, raw HTML blocks, and inline emphasis/links/images/code.
   Soft line breaks inside a paragraph render as <br> (addresses, tag rows). */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
  }

  function slugify(s) {
    return s.toLowerCase().trim()
            .replace(/[^\w฀-๿\s-]/g, '')
            .replace(/\s+/g, '-');
  }

  // Only allow URL schemes that are safe to put in href/src.
  function safeUrl(url) {
    var u = url.trim();
    if (/^(https?:|mailto:|tel:|#|\/|\.{1,2}\/)/i.test(u)) return u;
    if (/^[\w.-]+(\/|$)/.test(u) && !/^[a-z][a-z0-9+.-]*:/i.test(u)) return u; // relative
    return '#';
  }

  function inline(text) {
    var stash = [];
    // \u0000 cannot appear in source text, so placeholders never collide
    // with ordinary content (e.g. a bare year like 2006).
    function keep(html) {
      stash.push(html);
      return '\u0000' + (stash.length - 1) + '\u0000';
    }

    // Code spans first — their contents must not be processed further.
    text = text.replace(/`([^`]+)`/g, function (_, code) {
      return keep('<code>' + escapeHtml(code) + '</code>');
    });

    // Images before links: ![alt](src)
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, src) {
      return keep('<img src="' + escapeHtml(safeUrl(src)) + '" alt="' + escapeHtml(alt) + '">');
    });

    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      var href = safeUrl(url);
      var ext = /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : '';
      return keep('<a href="' + escapeHtml(href) + '"' + ext + '>' + inline(label) + '</a>');
    });

    // Bare URLs
    text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, function (_, pre, url) {
      return pre + keep('<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(url) + '</a>');
    });

    text = escapeHtml(text);

    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
               .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
               .replace(/~~([^~]+)~~/g, '<del>$1</del>');

    return text.replace(/\u0000(\d+)\u0000/g, function (_, i) { return stash[+i]; });
  }

  function renderTable(rows) {
    var head = rows[0], align = rows[1], body = rows.slice(2);
    function cells(row) {
      return row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); });
    }
    var aligns = cells(align).map(function (a) {
      if (/^:-+:$/.test(a)) return ' style="text-align:center"';
      if (/^-+:$/.test(a)) return ' style="text-align:right"';
      return '';
    });
    var html = '<table><thead><tr>';
    cells(head).forEach(function (c, i) {
      html += '<th' + (aligns[i] || '') + '>' + inline(c) + '</th>';
    });
    html += '</tr></thead><tbody>';
    body.forEach(function (row) {
      html += '<tr>';
      cells(row).forEach(function (c, i) {
        html += '<td' + (aligns[i] || '') + '>' + inline(c) + '</td>';
      });
      html += '</tr>';
    });
    return html + '</tbody></table>';
  }

  function isBlank(l) { return /^\s*$/.test(l); }
  function isHr(l) { return /^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(l); }
  function isTableSep(l) { return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(l) && l.indexOf('|') !== -1 && /-/.test(l); }

  function render(src) {
    var lines = String(src).replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (isBlank(line)) { i++; continue; }

      // Fenced code
      var fence = line.match(/^\s*(```+|~~~+)\s*(\S*)/);
      if (fence) {
        var close = fence[1][0], lang = fence[2], buf = [];
        i++;
        while (i < lines.length && !new RegExp('^\\s*' + close + '{3,}\\s*$').test(lines[i])) {
          buf.push(lines[i]); i++;
        }
        i++;
        out.push('<pre><code' + (lang ? ' class="language-' + escapeHtml(lang) + '"' : '') + '>' +
                 escapeHtml(buf.join('\n')) + '</code></pre>');
        continue;
      }

      if (isHr(line)) { out.push('<hr>'); i++; continue; }

      var heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (heading) {
        var level = heading[1].length, body = heading[2];
        out.push('<h' + level + ' id="' + escapeHtml(slugify(body)) + '">' + inline(body) + '</h' + level + '>');
        i++;
        continue;
      }

      // Table: a pipe row followed by a separator row
      if (line.indexOf('|') !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        var rows = [line, lines[i + 1]];
        i += 2;
        while (i < lines.length && lines[i].indexOf('|') !== -1 && !isBlank(lines[i])) {
          rows.push(lines[i]); i++;
        }
        out.push(renderTable(rows));
        continue;
      }

      // Blockquote
      if (/^\s*>/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, '')); i++;
        }
        out.push('<blockquote>' + render(quote.join('\n')) + '</blockquote>');
        continue;
      }

      // Lists
      var bullet = line.match(/^\s*([-*+]|\d+\.)\s+/);
      if (bullet) {
        var ordered = /\d/.test(bullet[1]);
        var items = [];
        while (i < lines.length) {
          var m = lines[i].match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
          if (m && /\d/.test(m[1]) === ordered) {
            var item = [m[2]];
            i++;
            // Lazy continuation: indented or plain non-blank lines belong to this item.
            while (i < lines.length && !isBlank(lines[i]) &&
                   !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) && !isHr(lines[i]) && !/^#{1,6}\s/.test(lines[i])) {
              item.push(lines[i].trim()); i++;
            }
            items.push(inline(item.join('\n')).replace(/\n/g, '<br>'));
          } else if (isBlank(lines[i]) &&
                     i + 1 < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i + 1])) {
            i++; // blank line between items of the same list
          } else {
            break;
          }
        }
        var tag = ordered ? 'ol' : 'ul';
        out.push('<' + tag + '><li>' + items.join('</li><li>') + '</li></' + tag + '>');
        continue;
      }

      // Raw HTML block — passed through untouched until a blank line.
      if (/^\s*<([a-zA-Z][\w-]*)(\s|>|\/)/.test(line)) {
        var raw = [];
        while (i < lines.length && !isBlank(lines[i])) { raw.push(lines[i]); i++; }
        out.push(raw.join('\n'));
        continue;
      }

      // Paragraph
      var para = [];
      while (i < lines.length && !isBlank(lines[i]) && !isHr(lines[i]) &&
             !/^#{1,6}\s/.test(lines[i]) && !/^\s*>/.test(lines[i]) &&
             !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      out.push('<p>' + inline(para.join('\n')).replace(/\n/g, '<br>') + '</p>');
    }

    return out.join('\n');
  }

  global.renderMarkdown = render;
})(window);
