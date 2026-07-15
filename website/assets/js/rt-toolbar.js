/*
 * rt-toolbar.js — shared floating rich-text toolbar (Bold/Italic/Underline/
 * Link/Clear format) used by both render.js (data-cms / list-item inline
 * fields) and sections.js (custom block text widgets), so the toolbar markup
 * only lives in one place.
 */
(function () {
  window.PloyRTToolbar = {
    attach: function (el, opts) {
      opts = opts || {};
      var toolbarClass = opts.toolbarClass || 'ploy-rt-toolbar-cms';
      var host = opts.host || el; // element the toolbar node is appended to
      el.addEventListener('focus', function () {
        if (host.querySelector('.' + toolbarClass)) return;
        var rt = document.createElement('div');
        rt.className = toolbarClass;
        rt.style.cssText = 'position:absolute; top:-35px; left:0; z-index:90; display:flex; gap:4px; background:#1f2937; padding:4px; border-radius:4px; font-family:system-ui;';
        var btn = function (l, fn) {
          var b = document.createElement('button');
          b.textContent = l;
          b.style.cssText = 'background:transparent; border:none; color:#fff; cursor:pointer; font-size:12px; padding:2px 6px;';
          b.onmousedown = function (e) { e.preventDefault(); fn(); };
          return b;
        };
        rt.append(
          btn('B', function () { document.execCommand('bold'); }),
          btn('I', function () { document.execCommand('italic'); }),
          btn('U', function () { document.execCommand('underline'); }),
          btn('🔗', function () {
            var u = prompt('Link URL:');
            if (u) document.execCommand('createLink', false, u);
            else document.execCommand('unlink');
          }),
          btn('</>', function () { document.execCommand('removeFormat'); })
        );
        host.style.position = 'relative';
        host.appendChild(rt);
        if (opts.onOpen) opts.onOpen(rt);
      });
      el.addEventListener('blur', function () {
        var rt = host.querySelector('.' + toolbarClass);
        if (rt) rt.remove();
        if (opts.onClose) opts.onClose(rt);
      });
    }
  };
})();
