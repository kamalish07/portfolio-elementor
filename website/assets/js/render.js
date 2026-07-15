/*
 * render.js — binds content/site.json into the static pages.
 *
 * Bindings:
 *   data-cms="path"            → textContent
 *   data-cms-src="path"        → img src
 *   data-cms-alt="path"        → img alt
 *   data-cms-href="path"       → link href
 *   data-cms-show="path"       → element removed when value is falsy
 *   data-cms-hide="path"       → element removed when value is truthy
 *   data-cms-list="path"       → container re-rendered from array of objects
 *                                (uses its <template> child; fields bind with
 *                                data-f, data-f-src, data-f-alt, data-f-href
 *                                [+ data-href-prefix], data-f-if)
 *   data-cms-textlist="path"   → container re-rendered from array of strings
 *   data-cms-linkedin="path"   → pending badge becomes a real link when set
 *   <body data-title-path>     → document.title updated from content
 */
(async function () {
  // Resolve leading-slash paths against the site root so the page works
  // whether hosted at "/" or at a subpath (GitHub Pages project sites).
  const rurl = (p) => (window.PloyTheme ? window.PloyTheme.url(p) : p);
  const base = (window.PloyTheme && window.PloyTheme.base) || '/';
  const inCMS = window.parent !== window;

  let data;
  try {
    const res = await fetch(base + 'content/site.json', { cache: 'no-store' });
    if (!res.ok) return;
    data = await res.json();
  } catch (e) {
    return; // no server / offline: baked-in static content remains
  }

  const get = (path) =>
    path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);

  document.querySelectorAll('[data-cms]').forEach((el) => {
    const path = el.dataset.cms;
    const v = get(path);
    if (v != null) el.innerHTML = v;

    if (inCMS) {
      el.setAttribute('contenteditable', 'true');
      el.style.outline = 'none';
      el.addEventListener('focus', function() { 
        el.style.boxShadow = '0 0 0 2px #3b82f6'; 
        
        // Add RT toolbar
        if (el.parentNode.querySelector('.ploy-rt-toolbar-cms')) return;
        const rt = document.createElement('div');
        rt.className = 'ploy-rt-toolbar-cms';
        rt.style.cssText = 'position:absolute; top:-35px; left:0; z-index:90; display:flex; gap:4px; background:#1f2937; padding:4px; border-radius:4px; font-family:system-ui;';
        
        const btn = (l, fn) => {
          const b = document.createElement('button');
          b.textContent = l;
          b.style.cssText = 'background:transparent; border:none; color:#fff; cursor:pointer; font-size:12px; padding:2px 6px;';
          b.onmousedown = (e) => { e.preventDefault(); fn(); };
          return b;
        };
        rt.append(
          btn('B', () => document.execCommand('bold')),
          btn('I', () => document.execCommand('italic')),
          btn('U', () => document.execCommand('underline')),
          btn('🔗', () => { const u = prompt('Link URL:'); if (u) document.execCommand('createLink', false, u); else document.execCommand('unlink'); }),
          btn('</>', () => document.execCommand('removeFormat'))
        );
        el.style.position = 'relative';
        el.appendChild(rt);
      });
      el.addEventListener('blur', function() { 
        el.style.boxShadow = 'none';
        const rt = el.querySelector('.ploy-rt-toolbar-cms');
        if (rt) rt.remove();
        // Remove toolbar from HTML before saving
        const clone = el.cloneNode(true);
        const rtClone = clone.querySelector('.ploy-rt-toolbar-cms');
        if (rtClone) rtClone.remove();
        window.parent.postMessage({ type: 'ploy-inline-edit', path: path, value: clone.innerHTML }, '*');
      });
      el.addEventListener('click', function(e) { if(e.target.tagName !== 'A') e.preventDefault(); });
    }
  });
  document.querySelectorAll('[data-cms-src]').forEach((el) => {
    const path = el.dataset.cmsSrc;
    const v = get(path);
    if (v) el.setAttribute('src', rurl(v));
    
    if (inCMS) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.parent.postMessage({ type: 'ploy-image-edit', path: path, current: el.getAttribute('src') }, '*');
      });
      el.addEventListener('mouseover', function() { el.style.outline = '2px dashed #3b82f6'; });
      el.addEventListener('mouseout', function() { el.style.outline = 'none'; });
    }
  });
  document.querySelectorAll('[data-cms-alt]').forEach((el) => {
    const v = get(el.dataset.cmsAlt);
    if (v != null) el.setAttribute('alt', v);
  });
  document.querySelectorAll('[data-cms-href]').forEach((el) => {
    const v = get(el.dataset.cmsHref);
    if (v) el.setAttribute('href', rurl(v));
  });
  document.querySelectorAll('[data-cms-show]').forEach((el) => {
    if (!get(el.dataset.cmsShow)) el.remove();
  });
  document.querySelectorAll('[data-cms-hide]').forEach((el) => {
    if (get(el.dataset.cmsHide)) el.remove();
  });

  document.querySelectorAll('[data-cms-list]').forEach((container) => {
    const items = get(container.dataset.cmsList);
    const tpl = container.querySelector('template');
    if (!Array.isArray(items) || !tpl) return;
    Array.from(container.children).forEach((n) => {
      if (n !== tpl) n.remove();
    });
    items.forEach((item) => {
      const node = tpl.content.cloneNode(true);
      node.querySelectorAll('[data-f]').forEach((el) => {
        const path = container.dataset.cmsList + '.' + Array.prototype.indexOf.call(container.children, node) + '.' + el.dataset.f;
        const v = item[el.dataset.f];
        if (v != null) el.innerHTML = v;
        
        if (inCMS) {
          el.setAttribute('contenteditable', 'true');
          el.style.outline = 'none';
          el.addEventListener('focus', function() { 
            el.style.boxShadow = '0 0 0 2px #3b82f6'; 
            if (el.parentNode.querySelector('.ploy-rt-toolbar-cms')) return;
            const rt = document.createElement('div');
            rt.className = 'ploy-rt-toolbar-cms';
            rt.style.cssText = 'position:absolute; top:-35px; left:0; z-index:90; display:flex; gap:4px; background:#1f2937; padding:4px; border-radius:4px; font-family:system-ui;';
            const btn = (l, fn) => {
              const b = document.createElement('button');
              b.textContent = l; b.style.cssText = 'background:transparent; border:none; color:#fff; cursor:pointer; font-size:12px; padding:2px 6px;';
              b.onmousedown = (e) => { e.preventDefault(); fn(); }; return b;
            };
            rt.append(
              btn('B', () => document.execCommand('bold')),
              btn('I', () => document.execCommand('italic')),
              btn('U', () => document.execCommand('underline')),
              btn('🔗', () => { const u = prompt('Link URL:'); if (u) document.execCommand('createLink', false, u); else document.execCommand('unlink'); }),
              btn('</>', () => document.execCommand('removeFormat'))
            );
            el.style.position = 'relative';
            el.appendChild(rt);
          });
          el.addEventListener('blur', function() { 
            el.style.boxShadow = 'none';
            const rt = el.querySelector('.ploy-rt-toolbar-cms');
            if (rt) rt.remove();
            const clone = el.cloneNode(true);
            const rtClone = clone.querySelector('.ploy-rt-toolbar-cms');
            if (rtClone) rtClone.remove();
            window.parent.postMessage({ type: 'ploy-inline-edit', path: path, value: clone.innerHTML }, '*');
          });
          el.addEventListener('click', function(e) { if(e.target.tagName !== 'A') e.preventDefault(); });
        }
      });
      node.querySelectorAll('[data-f-src]').forEach((el) => {
        const path = container.dataset.cmsList + '.' + Array.prototype.indexOf.call(container.children, node) + '.' + el.dataset.fSrc;
        const v = item[el.dataset.fSrc];
        if (v) el.setAttribute('src', rurl(v));
        
        if (inCMS) {
          el.style.cursor = 'pointer';
          el.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.parent.postMessage({ type: 'ploy-image-edit', path: path, current: el.getAttribute('src') }, '*');
          });
          el.addEventListener('mouseover', function() { el.style.outline = '2px dashed #3b82f6'; });
          el.addEventListener('mouseout', function() { el.style.outline = 'none'; });
        }
      });
      node.querySelectorAll('[data-f-alt]').forEach((el) => {
        const v = item[el.dataset.fAlt];
        if (v != null) el.setAttribute('alt', v);
      });
      node.querySelectorAll('[data-f-href]').forEach((el) => {
        const v = item[el.dataset.fHref];
        const prefix = el.dataset.hrefPrefix || '';
        if (v) el.setAttribute('href', rurl(prefix + v));
        else el.removeAttribute('href');
      });
      node.querySelectorAll('[data-f-if]').forEach((el) => {
        if (!item[el.dataset.fIf]) el.remove();
      });
      container.appendChild(node);
    });
  });

  document.querySelectorAll('[data-cms-textlist]').forEach((container) => {
    const items = get(container.dataset.cmsTextlist);
    const tpl = container.querySelector('template');
    if (!Array.isArray(items) || !tpl) return;
    Array.from(container.children).forEach((n) => {
      if (n !== tpl) n.remove();
    });
    items.forEach((text) => {
      const node = tpl.content.cloneNode(true);
      if (node.firstElementChild) node.firstElementChild.textContent = text;
      container.appendChild(node);
    });
  });

  document.querySelectorAll('[data-cms-linkedin]').forEach((el) => {
    const url = get(el.dataset.cmsLinkedin);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = el.className.replace('footer__linkedin--pending', '').trim();
    a.setAttribute('aria-label', 'LinkedIn profile');
    a.innerHTML = el.innerHTML;
    el.replaceWith(a);
  });

  const titlePath = document.body.dataset.titlePath;
  if (titlePath) {
    const t = get(titlePath);
    if (t) document.title = t;
  }

  // Lets sections.js apply per-element style overrides only after the
  // list re-renders above have produced their final elements.
  window.__ployRendered = true;
  document.dispatchEvent(new CustomEvent('ploy:rendered'));
  if (inCMS) {
    window.addEventListener('message', (ev) => {
      const d = ev.data || {};
      if (d.type === 'ploy-image-updated') {
        const rurl = (p) => (window.PloyTheme ? window.PloyTheme.url(p) : p);
        
        // Find the element with data-cms-src = path
        let el = document.querySelector(`[data-cms-src="${d.path}"]`);
        if (!el) {
          // Check inside data-cms-list items
          document.querySelectorAll('[data-cms-list]').forEach(container => {
            Array.from(container.children).forEach((node, idx) => {
              if (node.tagName === 'TEMPLATE') return;
              node.querySelectorAll('[data-f-src]').forEach(fEl => {
                const path = container.dataset.cmsList + '.' + (idx - 1) + '.' + fEl.dataset.fSrc;
                if (path === d.path) el = fEl;
              });
            });
          });
        }
        if (el) {
          el.setAttribute('src', rurl(d.value));
        }
      }
    });
  }

})();
