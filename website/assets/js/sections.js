/*
 * sections.js — renders user-defined page sections (content/blocks.json)
 * and per-element text style overrides (content/styles.json), and provides
 * the in-preview editing mode used by the CMS (../cms).
 *
 * Sections use auto-layout: a flex row that wraps, with a gap. Each block
 * has a width in % of the row; removing a block lets the others reflow so
 * everything stays aligned.
 *
 * Editing protocol (postMessage; allowed origins come from theme-apply.js):
 *   CMS → page: { type:'ploy-blocks-preview', sections, editMode, selected, defaultOverrides }
 *               { type:'ploy-styles-preview', overrides }
 *   page → CMS: { type:'ploy-blocks-ready', page, defaultSections }
 *               { type:'ploy-blocks-select', sectionId, blockId }
 *               { type:'ploy-blocks-text', sectionId, blockId, text }
 *               { type:'ploy-blocks-resize', sectionId, blockId, width }
 *               { type:'ploy-blocks-section-resize', sectionId, minHeight }
 *               { type:'ploy-blocks-op', op, sectionId, blockId?, dir?, blockType? }
 */
(function () {
  var container = document.querySelector('.custom-sections');
  var PAGE = container ? container.dataset.page : null;
  var framed = window.parent && window.parent !== window;
  var ORIGINS = window.PLOY_CMS_ORIGINS || [];

  var state = { sections: [], editMode: false, selected: { s: null, b: null }, defaultOverrides: {}, migrated: false, multi: [] };
  var focusBlockId = null;
  var styledEls = [];
  var pendingOverrides = null;
  var extractedDefaultNodes = {};

  var animObserver = null;
  if (typeof IntersectionObserver !== 'undefined') {
    animObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          animObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  }

  function applyAnimation(el, data) {
    if (!data.animation || data.animation === 'none') return;
    el.classList.add('is-animating');
    el.classList.add('animate-' + data.animation);
    if (data.animDuration) el.style.animationDuration = data.animDuration + 's';
    if (data.animDelay) el.style.animationDelay = data.animDelay + 's';
    if (animObserver) animObserver.observe(el);
    else el.classList.add('is-visible'); // fallback
  }

  function applyHoverEffect(el, data) {
    if (!data.hoverEffect) return;
    el.classList.add('ploy-hover-' + data.hoverEffect);
  }

  // Apply border + corner-radius settings shared by sections and widgets.
  function applyBorder(el, o) {
    if (!o) return;
    if (o.borderWidth) {
      el.style.border = o.borderWidth + 'px ' + (o.borderStyle || 'solid') + ' ' + (o.borderColor || '#000000');
    }
    if (o.borderRadius != null && o.borderRadius !== '' && o.borderRadius !== 0) {
      el.style.borderRadius = o.borderRadius + 'px';
    }
  }

  var TAGS = {
    h1: { size: 48, weight: 600, heading: true },
    h2: { size: 36, weight: 600, heading: true },
    h3: { size: 28, weight: 600, heading: true },
    p: { size: 16, weight: 400, heading: false },
    small: { size: 13, weight: 400, heading: false },
  };

  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '.ploy-sec{position:relative}',
    /* Widget (block) hover + selection */
    '.custom-sections--edit .ploy-blk{cursor:pointer}',
    '.custom-sections--edit .ploy-blk:hover{outline:1px dashed rgba(37,99,235,.55);outline-offset:2px}',
    '.ploy-blk.ploy-sel{outline:2px solid #2563eb!important;outline-offset:2px}',
    '.ploy-blk.ploy-multisel{outline:2px solid #f59e0b!important;outline-offset:2px}',
    '.ploy-sec.ploy-sel-sec{outline:2px solid #7c3aed;outline-offset:-2px}',
    /* Floating element-name label (Webflow-style), shown on hover/selection */
    '.ploy-name-label{position:absolute;top:0;left:0;transform:translateY(-100%);z-index:71;background:#2563eb;color:#fff;font:600 11px/1.4 system-ui,sans-serif;padding:2px 8px;border-radius:3px 3px 0 0;pointer-events:none;letter-spacing:.2px;white-space:nowrap}',
    '.ploy-name-label--sec{background:#7c3aed}',
    '.ploy-blk{position:relative}',
    '.ploy-blk > .ploy-name-label{opacity:0;transition:opacity .12s}',
    '.custom-sections--edit .ploy-blk:hover > .ploy-name-label{opacity:1}',
    '.ploy-blk.ploy-sel > .ploy-name-label{opacity:1}',
    '.ploy-handle{position:absolute;width:14px;height:14px;border-radius:3px;z-index:60;box-shadow:0 0 0 2px #fff;touch-action:none}',
    '.ploy-handle--right{background:#2563eb;right:-8px;top:50%;transform:translateY(-50%);cursor:ew-resize}',
    '.ploy-handle--bottom{background:#7c3aed;left:50%;bottom:-8px;transform:translateX(-50%);cursor:ns-resize}',
    '.ploy-handle--move{width:22px;height:22px;background:#7c3aed;left:-11px;top:-11px;cursor:move;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px}',
    '.ploy-freeframe--edit{outline:1px dashed rgba(124,58,237,.35);outline-offset:-1px;background-image:radial-gradient(rgba(124,58,237,.16) 1px, transparent 1px);background-size:16px 16px}',
    '.ploy-toolbar{position:absolute;display:flex;gap:4px;z-index:70;font-family:system-ui,sans-serif}',
    '.ploy-toolbar--sec{top:6px;right:6px}',
    '.ploy-toolbar--blk{top:-30px;left:0}',
    '.ploy-toolbar button{border:0;border-radius:3px;padding:3px 9px;font-size:12px;line-height:1.5;cursor:pointer;background:#1f2937;color:#fff}',
    '.ploy-toolbar--sec button{background:#7c3aed}',
    '.ploy-empty{border:2px dashed #b9b2a6;border-radius:8px;margin:28px auto;max-width:900px;padding:44px 20px;text-align:center;color:#8a8375;font:14px/1.5 system-ui,sans-serif}',
    '.ploy-imgph{border:2px dashed #999;border-radius:6px;min-height:140px;display:flex;align-items:center;justify-content:center;color:#777;font:13px system-ui,sans-serif;background:rgba(0,0,0,.04);padding:12px;text-align:center}',
    '.ploy-blk__text:focus{outline:none}',
    /* Default section edit-mode styles. The section is selectable via its
       chrome (empty areas), but inner text/image fields stay directly
       clickable for inline editing — so no blocking overlay. */
    '.ploy-defsec--edit{position:relative;transition:outline .15s}',
    '.ploy-defsec--edit:hover{outline:2px dashed rgba(124,58,237,.45);outline-offset:-2px}',
    '.ploy-defsec--edit:hover > .ploy-defsec-label{opacity:1}',
    '.ploy-defsec--selected{outline:2px solid #7c3aed!important;outline-offset:-2px}',
    '.ploy-defsec--selected > .ploy-defsec-label{opacity:1}',
    '.ploy-defsec-label{position:absolute;top:0;left:0;z-index:72;background:#7c3aed;color:#fff;font:600 11px/1.4 system-ui,sans-serif;padding:3px 10px;border-radius:0 0 4px 0;pointer-events:none;letter-spacing:.3px;opacity:.55;transition:opacity .12s}',
    /* Extra-widgets zone dropped into a default section */
    '.ploy-defsec-extra{position:relative;z-index:2}',
    /* Inline-editable fields get a subtle affordance on hover in edit mode */
    '.ploy-defsec--edit [data-cms]:hover,.ploy-defsec--edit [data-f]:hover{outline:1px dashed rgba(37,99,235,.5);outline-offset:2px;cursor:text}',
    /* Link styling */
    '.ploy-blk__text a{color:var(--ploy-accent-primary, #2563eb);text-decoration:none;border-bottom:1px solid transparent;transition:border-color .15s}',
    '.ploy-blk__text a:hover{border-color:currentColor}',
  ].join('\n');
  document.head.appendChild(styleEl);

  function post(msg) {
    if (!framed) return;
    try { window.parent.postMessage(msg, '*'); } catch (e) {}
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function blockFlex(b, gap) {
    var w = clamp(b.width || 100, 8, 100);
    var reduce = (gap * (100 - w)) / 100;
    return '0 1 calc(' + w + '% - ' + reduce.toFixed(2) + 'px)';
  }

  // Build a CSS padding string from per-side values (padTop/Right/Bottom/Left),
  // falling back to a single value or a default when sides aren't set.
  function paddingCss(obj, fallback) {
    var hasSides = obj.padTop != null || obj.padRight != null || obj.padBottom != null || obj.padLeft != null;
    if (hasSides) {
      var t = obj.padTop != null ? obj.padTop : 0;
      var r = obj.padRight != null ? obj.padRight : 0;
      var bt = obj.padBottom != null ? obj.padBottom : 0;
      var l = obj.padLeft != null ? obj.padLeft : 0;
      return t + 'px ' + r + 'px ' + bt + 'px ' + l + 'px';
    }
    return fallback;
  }

  // ---------------- default section detection & editing ----------------
  function getDefaultSections() {
    // A default section's element may match both the live DOM query (once
    // it's been re-inserted after extraction) and the extractedDefaultNodes
    // cache — de-duplicate by key so each section is only listed once.
    var byKey = {};
    var order = [];
    function add(key, el) {
      if (byKey[key]) return;
      byKey[key] = { id: 'default:' + key, key: key, label: el.dataset.defaultLabel || key, el: el };
      order.push(key);
    }
    Array.prototype.slice.call(document.querySelectorAll('[data-default-section]')).forEach(function (el) {
      add(el.dataset.defaultSection, el);
    });
    Object.keys(extractedDefaultNodes).forEach(function (k) { add(k, extractedDefaultNodes[k]); });
    return order.map(function (k) { return byKey[k]; });
  }

  function applyDefaultOverrides(overrides) {
    var secs = getDefaultSections();
    secs.forEach(function (sec) {
      var ov = (overrides || {})[sec.key];
      if (!ov) return;
      if (ov.bg) sec.el.style.backgroundColor = ov.bg;
      if (ov.paddingY != null && ov.paddingY !== '') {
        sec.el.style.paddingTop = ov.paddingY + 'px';
        sec.el.style.paddingBottom = ov.paddingY + 'px';
      }
      applyBorder(sec.el, ov);
    });
  }

  // Default-section DOM nodes are persistent (extracted once, re-appended
  // every render), so any editing chrome we add to them accumulates unless
  // cleared first. This strips all editor-only additions and inline-edit
  // artifacts so each render starts from a clean section element.
  function cleanDefaultChrome(el) {
    var junk = el.querySelectorAll('.ploy-defsec-label, .ploy-toolbar, .ploy-handle, .ploy-sec-overlay, .ploy-defsec-extra, .ploy-name-label');
    for (var i = 0; i < junk.length; i++) junk[i].remove();
    el.classList.remove('ploy-defsec--edit', 'ploy-defsec--selected', 'ploy-sel-sec');
    if (el._ployClickHandler) {
      el.removeEventListener('click', el._ployClickHandler);
      delete el._ployClickHandler;
    }
    el.style.outline = '';
    el.style.outlineColor = '';
  }

  // ---------------- rendering ----------------
  function renderSections() {
    if (!container) return;
    
    // Extract default sections if the page is migrated, so we can reorder them
    if (state.migrated && Object.keys(extractedDefaultNodes).length === 0) {
      document.querySelectorAll('[data-default-section]').forEach(function (el) {
        extractedDefaultNodes[el.dataset.defaultSection] = el;
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    }

    container.innerHTML = '';
    container.classList.toggle('custom-sections--edit', state.editMode);

    // Safety net: if a default section exists in the DOM (e.g. Header, once
    // wrapped in data-default-section) but isn't in this page's saved
    // sections list yet (stale/pre-existing blocks.json data), still render
    // it rather than letting it silently disappear.
    if (state.migrated) {
      var knownKeys = {};
      state.sections.forEach(function (sec) { if (sec.type === 'default_section') knownKeys[sec.key] = true; });
      Object.keys(extractedDefaultNodes).forEach(function (key) {
        if (knownKeys[key]) return;
        var orphan = extractedDefaultNodes[key];
        if (orphan && !orphan.parentNode) container.appendChild(orphan);
      });
    }

    if (!state.sections.length && state.migrated) {
      if (state.editMode) {
        var ph = document.createElement('div');
        ph.className = 'ploy-empty';
        ph.textContent = 'No sections on this page yet — use "Add custom section" in the CMS panel.';
        container.appendChild(ph);
      }
      return;
    }
    
    // If not migrated, we just append custom sections into container and leave default sections alone in the DOM.
    // If migrated, ALL sections are in state.sections and will be rendered here.
    state.sections.forEach(function (sec) {
      if (sec.type === 'default_section') {
        var el = extractedDefaultNodes[sec.key];
        if (el) {
          // Always start from a clean element — default section nodes persist
          // across renders, so stale chrome/extra-widgets must be stripped.
          cleanDefaultChrome(el);

          if (sec.bg) {
             el.style.setProperty('background-color', sec.bg, 'important');
             el.classList.remove('bg-ploy-background-primary', 'bg-ploy-background-inverse', 'bg-ploy-background-secondary');
          }
          if (sec.paddingY != null) el.style.padding = sec.paddingY + 'px 0';

          // Extra widgets the user added into this default section. They sit on
          // a free-form overlay so they can be dragged anywhere over the
          // section's hand-built content (which stays inline-editable
          // underneath — the overlay itself ignores pointer events).
          if (sec.blocks && sec.blocks.length) {
            el.style.position = el.style.position || 'relative';
            var extraZone = document.createElement('div');
            extraZone.className = 'ploy-defsec-extra';
            extraZone.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;';
            sec.blocks.forEach(function (b) {
              var childEl = renderBlock(sec, b, true);
              childEl.style.position = 'absolute';
              childEl.style.left = (b.x || 20) + 'px';
              childEl.style.top = (b.y || 20) + 'px';
              childEl.style.width = b.freeW ? b.freeW + 'px' : 'auto';
              childEl.style.flex = '';
              childEl.style.pointerEvents = 'auto';
              if (state.editMode && state.selected.b === b.id) {
                addFreeMoveHandle(childEl, sec, b, el);
                addFreeResizeHandle(childEl, sec, b);
              }
              extraZone.appendChild(childEl);
            });
            el.appendChild(extraZone);
          }

          if (state.editMode) attachSectionEditing(el, sec);
          applyAnimation(el, sec);
          applyHoverEffect(el, sec);
          container.appendChild(el);
        }
        return;
      }

      var secEl = document.createElement('section');
      secEl.className = 'ploy-sec';
      secEl.dataset.sid = sec.id;
      if (sec.bg) secEl.style.background = sec.bg;
      secEl.style.padding = paddingCss(sec, (sec.paddingY != null ? sec.paddingY : 64) + 'px 20px');
      if (sec.minHeight) secEl.style.minHeight = sec.minHeight + 'px';

      if (sec.layout === 'free') {
        // Free-form canvas: widgets are placed anywhere and dragged around,
        // like a Figma frame. Bounded to the content max-width and centered.
        var canvas = document.createElement('div');
        canvas.className = 'ploy-sec__canvas';
        canvas.style.position = 'relative';
        canvas.style.maxWidth = (sec.maxWidth || 1152) + 'px';
        canvas.style.margin = '0 auto';
        canvas.style.minHeight = (sec.minHeight || 400) + 'px';
        if (state.editMode) canvas.classList.add('ploy-freeframe--edit');
        (sec.blocks || []).forEach(function (b) {
          var childEl = renderBlock(sec, b, true);
          childEl.style.position = 'absolute';
          childEl.style.left = (b.x || 0) + 'px';
          childEl.style.top = (b.y || 0) + 'px';
          childEl.style.width = b.freeW ? b.freeW + 'px' : 'auto';
          childEl.style.flex = '';
          if (state.editMode && state.selected.b === b.id) {
            addFreeMoveHandle(childEl, sec, b, canvas);
            addFreeResizeHandle(childEl, sec, b);
          }
          canvas.appendChild(childEl);
        });
        if (state.editMode && !(sec.blocks && sec.blocks.length)) {
          var cph = document.createElement('div');
          cph.className = 'ploy-empty';
          cph.textContent = 'Empty section — add widgets from the Elements panel, then drag them anywhere.';
          canvas.appendChild(cph);
        }
        secEl.appendChild(canvas);
      } else {
        var row = document.createElement('div');
        row.className = 'ploy-sec__row';
        row.style.maxWidth = (sec.maxWidth || 1152) + 'px';
        row.style.margin = '0 auto';
        row.style.display = 'flex';
        row.style.flexWrap = 'wrap';
        row.style.gap = (sec.gap != null ? sec.gap : 24) + 'px';
        row.style.alignItems = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' }[sec.align || 'start'];
        (sec.blocks || []).forEach(function (b) { row.appendChild(renderBlock(sec, b)); });
        secEl.appendChild(row);
      }
      if (state.editMode) attachSectionEditing(secEl, sec);
      applyAnimation(secEl, sec);
      applyHoverEffect(secEl, sec);
      applyBorder(secEl, sec);
      container.appendChild(secEl);
    });
    if (focusBlockId) {
      var el = container.querySelector('[data-bid="' + focusBlockId + '"] .ploy-blk__text');
      if (el) {
        el.focus();
        try {
          var r = document.createRange();
          r.selectNodeContents(el);
          r.collapse(false);
          var s = window.getSelection();
          s.removeAllRanges();
          s.addRange(r);
        } catch (e) {}
      }
      focusBlockId = null;
    }

    // Apply any saved visual overrides to default sections (bg/padding set
    // through the inspector's Background/Padding fields).
    applyDefaultOverrides(state.defaultOverrides);
  }

  function renderBlock(sec, b, freeCtx) {
    var gap = sec.gap != null ? sec.gap : 24;
    var wrap = document.createElement('div');
    wrap.className = 'ploy-blk';
    wrap.dataset.bid = b.id;
    if (!freeCtx) wrap.style.flex = blockFlex(b, gap);
    wrap.style.minWidth = freeCtx ? '' : '60px';
    wrap.style.position = 'relative';
    if (b.type === 'container') {
      var freeForm = b.layout === 'free';
      if (freeForm) {
        // Free-form (absolute) layout: children are positioned by x/y/w.
        wrap.style.display = 'block';
        wrap.style.position = 'relative';
        wrap.style.minHeight = (b.minHeight || 240) + 'px';
        if (state.editMode) wrap.classList.add('ploy-freeframe--edit');
      } else {
        // Auto-layout (flex stack), Framer/Figma-style.
        wrap.style.display = 'flex';
        wrap.style.flexDirection = b.flexDirection || 'column';
        wrap.style.flexWrap = b.wrap ? 'wrap' : 'nowrap';
        wrap.style.gap = (b.gap != null ? b.gap : 16) + 'px';
        wrap.style.alignItems = b.alignItems || 'stretch';
        wrap.style.justifyContent = b.justifyContent || 'flex-start';
      }
      var cpad = paddingCss(b, b.padding ? b.padding + 'px' : '');
      if (cpad) wrap.style.padding = cpad;
      if (b.bg) wrap.style.backgroundColor = b.bg;
      if (b.radius) wrap.style.borderRadius = b.radius + 'px';
      (b.blocks || []).forEach(function (child) {
        var childEl = renderBlock(sec, child, freeForm);
        if (freeForm) {
          childEl.style.position = 'absolute';
          childEl.style.left = (child.x || 0) + 'px';
          childEl.style.top = (child.y || 0) + 'px';
          if (child.freeW) childEl.style.width = child.freeW + 'px';
          childEl.style.flex = '';
          // When selected, add drag + resize handles for the free-form child.
          if (state.editMode && state.selected.b === child.id) {
            addFreeMoveHandle(childEl, sec, child, wrap);
            addFreeResizeHandle(childEl, sec, child);
          }
        }
        wrap.appendChild(childEl);
      });
      if (state.editMode && !(b.blocks && b.blocks.length)) {
         var ph = document.createElement('div');
         ph.className = 'ploy-empty';
         ph.textContent = freeForm ? 'Empty free-form frame' : 'Empty container';
         ph.style.padding = '20px';
         ph.style.border = '1px dashed #ccc';
         wrap.appendChild(ph);
      }
    } else if (b.type === 'button') {
      var btn = document.createElement('a');
      btn.className = 'button-link typography-button inline-flex items-center justify-center rounded-button border px-5 py-3 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 button-link--primary border-ploy-button-primary-border bg-ploy-button-primary-background text-ploy-button-primary-text hover:opacity-80';
      btn.textContent = b.text || 'Button';
      btn.href = b.url ? (window.PloyTheme ? window.PloyTheme.url(b.url) : b.url) : '#';
      if (state.editMode) btn.addEventListener('click', function(e) { e.preventDefault(); });
      wrap.appendChild(btn);
    } else if (b.type === 'image') {
      if (b.src) {
        var img = document.createElement('img');
        img.src = window.PloyTheme ? window.PloyTheme.url(b.src) : b.src;
        img.alt = b.alt || '';
        img.style.width = '100%';
        img.style.display = 'block';
        if (b.radius) img.style.borderRadius = b.radius + 'px';
        if (b.url) {
          // Wrap in a link so images can point to another page/URL. In edit
          // mode the click is suppressed so it doesn't navigate while editing.
          var alink = document.createElement('a');
          alink.href = window.PloyTheme ? window.PloyTheme.url(b.url) : b.url;
          alink.style.display = 'block';
          if (state.editMode) alink.addEventListener('click', function (e) { e.preventDefault(); });
          alink.appendChild(img);
          wrap.appendChild(alink);
        } else {
          wrap.appendChild(img);
        }
      } else if (state.editMode) {
        var ph = document.createElement('div');
        ph.className = 'ploy-imgph';
        ph.textContent = 'Image — choose or upload one in the CMS panel';
        wrap.appendChild(ph);
      }
    } else if (b.type === 'divider') {
      var div = document.createElement('hr');
      div.style.border = 'none';
      div.style.borderTop = (b.height || 1) + 'px ' + (b.lineStyle || 'solid') + ' ' + (b.color || '#e5e7eb');
      div.style.margin = '0';
      div.style.width = '100%';
      wrap.appendChild(div);
    } else {
      var d = TAGS[b.tag] || TAGS.p;
      var el = document.createElement(TAGS[b.tag] ? b.tag : 'p');
      el.className = 'ploy-blk__text';
      // Text widgets store rich HTML from inline editing (bold/links/line
      // breaks). Render that HTML identically in edit AND live mode so the
      // two never diverge. Only apply the markdown shortcuts to plain text
      // that contains no HTML tags yet.
      var raw = b.text || '';
      var looksHtml = /<[a-z!/][\s\S]*>/i.test(raw);
      if (!looksHtml && raw) {
        el.innerHTML = raw
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
          .replace(/\*([^*]+)\*/g, '<i>$1</i>')
          .replace(/__([^_]+)__/g, '<u>$1</u>');
      } else {
        el.innerHTML = raw;
      }
      el.style.margin = '0';
      el.style.whiteSpace = 'pre-wrap';
      el.style.fontSize = (b.size || d.size) + 'px';
      el.style.fontWeight = b.bold ? 700 : d.weight;
      el.style.lineHeight = d.heading ? '1.15' : '1.6';
      el.style.textAlign = b.align || 'left';
      el.style.fontFamily = (b.font && window.PloyTheme)
        ? window.PloyTheme.fontStack(b.font, b.fontCustom)
        : (d.heading ? 'var(--font-heading)' : 'var(--font-body)');
      if (b.color) el.style.color = b.color;
      wrap.appendChild(el);
    }
    if (state.editMode) {
      var typeName = { text: 'Text', image: 'Image', button: 'Button', divider: 'Divider', container: 'Container' }[b.type] || 'Widget';
      var icon = { text: 'T', image: '🖼', button: '🔘', divider: '➖', container: '📦' }[b.type] || '▪';
      wrap.appendChild(makeNameLabel(icon + ' ' + typeName, false));
      if (state.multi && state.multi.indexOf(b.id) !== -1) wrap.classList.add('ploy-multisel');
      attachBlockEditing(wrap, sec, b, freeCtx);
    }
    applyAnimation(wrap, b);
    applyHoverEffect(wrap, b);
    applyBorder(wrap, b);
    return wrap;
  }

  // ---------------- edit mode ----------------
  function select(sid, bid, focusText) {
    state.selected = { s: sid, b: bid };
    focusBlockId = focusText ? bid : null;
    renderSections();
    post({ type: 'ploy-blocks-select', sectionId: sid, blockId: bid });
  }

  function dragHandle(handle, onMove, onEnd) {
    handle.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var startX = ev.clientX;
      var startY = ev.clientY;
      handle.setPointerCapture(ev.pointerId);
      function move(e) { onMove(e.clientX - startX, e.clientY - startY); }
      function up() {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        if (onEnd) onEnd();
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
  }

  function toolbarButton(label, title, fn) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener('click', function (ev) { ev.stopPropagation(); fn(); });
    return btn;
  }

  // Adds a drag handle to a free-form child so it can be dragged around its
  // frame on the canvas. Updates x/y live and posts the final position so the
  // CMS persists it. Snaps to a 16px grid unless Alt is held.
  function addFreeMoveHandle(childEl, sec, blk, frame) {
    var handle = document.createElement('div');
    handle.className = 'ploy-handle ploy-handle--move';
    handle.title = 'Drag to move';
    handle.textContent = '✥';
    var startX = 0, startY = 0, origX = 0, origY = 0, snap = true;
    handle.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      startX = ev.clientX; startY = ev.clientY;
      origX = blk.x || 0; origY = blk.y || 0;
      snap = !ev.altKey;
      try { handle.setPointerCapture(ev.pointerId); } catch (e) {}
      function move(e) {
        var nx = Math.max(0, origX + (e.clientX - startX));
        var ny = Math.max(0, origY + (e.clientY - startY));
        if (snap) { nx = Math.round(nx / 16) * 16; ny = Math.round(ny / 16) * 16; }
        blk.x = Math.round(nx); blk.y = Math.round(ny);
        childEl.style.left = blk.x + 'px';
        childEl.style.top = blk.y + 'px';
      }
      function up() {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        post({ type: 'ploy-blocks-free-move', sectionId: sec.id, blockId: blk.id, x: blk.x, y: blk.y });
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
    childEl.appendChild(handle);
  }

  // True when a click landed on something inside a section that should be
  // handled directly (inline text editing, image swap, an added widget) rather
  // than selecting the whole section.
  function isInnerEditTarget(t) {
    if (!t || !t.closest) return false;
    return !!t.closest('[data-cms], [data-cms-src], [data-f], [data-f-src], [contenteditable="true"], .ploy-defsec-extra, .ploy-blk, .ploy-toolbar, .ploy-handle, .ploy-defsec-label');
  }

  function makeNameLabel(text, isSection) {
    var label = document.createElement('div');
    label.className = 'ploy-name-label' + (isSection ? ' ploy-name-label--sec' : '');
    label.textContent = text;
    return label;
  }

  function sectionToolbar(sec, isDefault) {
    var bar = document.createElement('div');
    bar.className = 'ploy-toolbar ploy-toolbar--sec';
    bar.append(
      toolbarButton('+ Add Widget', 'Add a widget into this section', function () {
        post({ type: 'ploy-blocks-select', sectionId: sec.id, blockId: null, openWidgets: true });
      }),
      toolbarButton('✕', isDefault ? 'Hide section' : 'Delete section', function () {
        post({ type: 'ploy-blocks-op', op: 'deleteSection', sectionId: sec.id });
      })
    );
    return bar;
  }

  function attachSectionEditing(secEl, sec) {
    var isDefault = sec.type === 'default_section';
    var selectedHere = state.selected.s === sec.id && !state.selected.b;

    if (isDefault) {
      secEl.classList.add('ploy-defsec--edit');
      // Name label (Webflow-style) shown on hover / when selected.
      var dlabel = document.createElement('div');
      dlabel.className = 'ploy-defsec-label';
      dlabel.textContent = '📌 ' + (secEl.dataset.defaultLabel || sec.key || 'Section');
      secEl.appendChild(dlabel);

      // Click selects the section, but only when the click is on section
      // "chrome" (empty areas) — inner text/images/widgets/links keep their
      // own behavior so inline editing keeps working.
      secEl._ployClickHandler = function (ev) {
        // Stop links from navigating away while editing.
        var a = ev.target.closest && ev.target.closest('a');
        if (a) ev.preventDefault();
        if (isInnerEditTarget(ev.target)) return; // let inline editing handle it
        ev.stopPropagation();
        if (selectedHere) return;
        select(sec.id, null);
      };
      secEl.addEventListener('click', secEl._ployClickHandler);

      if (selectedHere) {
        secEl.classList.add('ploy-defsec--selected');
        secEl.appendChild(sectionToolbar(sec, true));
      }
      return;
    }

    // Custom section — element is freshly created each render.
    secEl.appendChild(makeNameLabel('▦ Section', true));
    secEl.addEventListener('click', function (ev) {
      if (isInnerEditTarget(ev.target)) return;
      ev.stopPropagation();
      if (selectedHere) return;
      select(sec.id, null);
    });
    if (!selectedHere) return;

    secEl.classList.add('ploy-sel-sec');
    secEl.style.outlineColor = 'var(--ploy-sel, #3b82f6)';
    secEl.appendChild(sectionToolbar(sec, false));

    var handle = document.createElement('div');
    handle.className = 'ploy-handle ploy-handle--bottom';
    handle.title = 'Drag to set section height';
    var startH = 0;
    handle.addEventListener('pointerdown', function () { startH = secEl.getBoundingClientRect().height; });
    dragHandle(handle, function (dx, dy) {
      sec.minHeight = Math.max(0, Math.round(startH + dy));
      secEl.style.minHeight = sec.minHeight + 'px';
      var cv = secEl.querySelector('.ploy-sec__canvas');
      if (cv) cv.style.minHeight = sec.minHeight + 'px';
    }, function () {
      post({ type: 'ploy-blocks-section-resize', sectionId: sec.id, minHeight: sec.minHeight });
    });
    secEl.appendChild(handle);
  }

  // Enter text "typewriter" editing on a text widget: make it editable, focus
  // it, place the caret at the end, and show the rich-text toolbar.
  function enterTextEdit(wrap, el) {
    if (!el) return;
    el.contentEditable = 'true';
    el.focus();
    try {
      var r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    } catch (e) {}
    if (!wrap.querySelector('.ploy-rt-toolbar')) {
      var rt = document.createElement('div');
      rt.className = 'ploy-rt-toolbar ploy-toolbar';
      rt.style.top = '-60px'; rt.style.left = '0'; rt.style.zIndex = '80';
      rt.append(
        toolbarButton('B', 'Bold (Ctrl+B)', function () { document.execCommand('bold'); el.focus(); }),
        toolbarButton('I', 'Italic (Ctrl+I)', function () { document.execCommand('italic'); el.focus(); }),
        toolbarButton('U', 'Underline (Ctrl+U)', function () { document.execCommand('underline'); el.focus(); }),
        toolbarButton('🔗', 'Add Link', function () {
          var url = prompt('Enter link URL:');
          if (url) { document.execCommand('createLink', false, url); }
          else { document.execCommand('unlink'); }
          el.focus();
        }),
        toolbarButton('</>', 'Clear Format', function () { document.execCommand('removeFormat'); el.focus(); })
      );
      wrap.appendChild(rt);
    }
  }

  function attachBlockEditing(wrap, sec, b, freeCtx) {
    var textEl = b.type === 'text' ? wrap.querySelector('.ploy-blk__text') : null;

    // Single click SELECTS the widget (shows its properties). Clicking an
    // already-selected text widget again enters edit mode — like Figma:
    // click to select the box, click again to type. Shift/Ctrl/Cmd-click
    // adds the widget to a multi-selection for grouping/alignment.
    wrap.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) {
        post({ type: 'ploy-blocks-multiselect', sectionId: sec.id, blockId: b.id });
        return;
      }
      if (state.selected.b === b.id) {
        if (textEl && textEl.contentEditable !== 'true') enterTextEdit(wrap, textEl);
        return;
      }
      select(sec.id, b.id);
    });

    if (textEl) {
      textEl.contentEditable = 'false';
      textEl.addEventListener('input', function () {
        // Normalize contentEditable's block wrappers into clean <br> line
        // breaks so the stored HTML renders the same on the live site.
        b.text = textEl.innerHTML
          .replace(/<div><br\s*\/?><\/div>/gi, '<br>')
          .replace(/<div>/gi, '<br>')
          .replace(/<\/div>/gi, '')
          .replace(/&nbsp;/gi, ' ');
        post({ type: 'ploy-blocks-text', sectionId: sec.id, blockId: b.id, text: b.text });
      });
      textEl.addEventListener('blur', function () {
        textEl.contentEditable = 'false';
        setTimeout(function () {
          var rt = wrap.querySelector('.ploy-rt-toolbar');
          if (rt && !rt.contains(document.activeElement)) rt.remove();
        }, 200);
      });
    }

    if (state.selected.b !== b.id) return;
    wrap.classList.add('ploy-sel');

    var bar = document.createElement('div');
    bar.className = 'ploy-toolbar ploy-toolbar--blk';
    if (b.type === 'container') {
       bar.append(
         toolbarButton('⬆', 'Select parent', function() { select(sec.id, null); }),
       );
    }
    // Move buttons only make sense in flow (stacked) layout; free-form uses drag.
    if (!freeCtx) {
      bar.append(
        toolbarButton('◀', 'Move left', function () { post({ type: 'ploy-blocks-op', op: 'moveBlock', sectionId: sec.id, blockId: b.id, dir: -1 }); }),
        toolbarButton('▶', 'Move right', function () { post({ type: 'ploy-blocks-op', op: 'moveBlock', sectionId: sec.id, blockId: b.id, dir: 1 }); })
      );
    }
    if (textEl) bar.append(toolbarButton('✎', 'Edit text', function () { enterTextEdit(wrap, textEl); }));
    bar.append(
      toolbarButton('✕', 'Delete', function () { post({ type: 'ploy-blocks-op', op: 'deleteBlock', sectionId: sec.id, blockId: b.id }); })
    );
    wrap.appendChild(bar);

    // Width resize handle — only in flow layout. Free-form widgets resize via
    // the freeW handle added by the free-form renderer.
    if (!freeCtx) {
      var handle = document.createElement('div');
      handle.className = 'ploy-handle ploy-handle--right';
      handle.title = 'Drag to resize';
      var startW = 0;
      var rowW = 1;
      handle.addEventListener('pointerdown', function () {
        startW = wrap.getBoundingClientRect().width;
        rowW = wrap.parentElement.getBoundingClientRect().width || 1;
      });
      var SNAPS = [25, 33.33, 50, 66.67, 75, 100];
      dragHandle(handle, function (dx) {
        var pct = clamp(((startW + dx) / rowW) * 100, 8, 100);
        for (var i = 0; i < SNAPS.length; i += 1) {
          if (Math.abs(pct - SNAPS[i]) < 2.5) { pct = SNAPS[i]; break; }
        }
        b.width = Math.round(pct * 100) / 100;
        wrap.style.flex = blockFlex(b, sec.gap != null ? sec.gap : 24);
      }, function () {
        post({ type: 'ploy-blocks-resize', sectionId: sec.id, blockId: b.id, width: b.width });
      });
      wrap.appendChild(handle);
    }
  }

  // Resize handle for a free-form widget: drags set an explicit pixel width.
  function addFreeResizeHandle(childEl, sec, blk) {
    var handle = document.createElement('div');
    handle.className = 'ploy-handle ploy-handle--right';
    handle.title = 'Drag to resize width';
    var startW = 0;
    handle.addEventListener('pointerdown', function () { startW = childEl.getBoundingClientRect().width; });
    dragHandle(handle, function (dx) {
      var w = Math.max(40, Math.round(startW + dx));
      blk.freeW = w;
      childEl.style.width = w + 'px';
    }, function () {
      post({ type: 'ploy-blocks-free-resize', sectionId: sec.id, blockId: blk.id, freeW: blk.freeW });
    });
    childEl.appendChild(handle);
  }

  document.addEventListener('click', function (ev) {
    if (!state.editMode || !container) return;
    if (container.contains(ev.target)) return;
    // Don't deselect if clicking inside a default section
    var defaultEl = ev.target.closest && ev.target.closest('[data-default-section]');
    if (defaultEl) return;
    if (state.selected.s || state.selected.b) select(null, null);
  });

  // ---------------- text style overrides ----------------
  function targetsFor(key) {
    var direct = document.querySelectorAll('[data-cms="' + key + '"]');
    if (direct.length) return Array.prototype.slice.call(direct);
    var m = key.match(/^(.*)\.(\d+)(?:\.([a-zA-Z_]+))?$/);
    if (!m) return [];
    var cont = document.querySelector('[data-cms-list="' + m[1] + '"], [data-cms-textlist="' + m[1] + '"]');
    if (!cont) return [];
    var items = Array.prototype.filter.call(cont.children, function (n) { return n.tagName !== 'TEMPLATE'; });
    var item = items[Number(m[2])];
    if (!item) return [];
    if (!m[3]) return [item];
    var els = item.querySelectorAll('[data-f="' + m[3] + '"]');
    return Array.prototype.slice.call(els);
  }

  function applyOverrides(ov) {
    if (!window.__ployRendered) { pendingOverrides = ov; return; }
    styledEls.forEach(function (el) {
      el.style.fontFamily = '';
      el.style.fontSize = '';
      el.style.color = '';
    });
    styledEls = [];
    Object.keys(ov || {}).forEach(function (key) {
      var o = ov[key] || {};
      targetsFor(key).forEach(function (el) {
        if (o.font && window.PloyTheme) el.style.fontFamily = window.PloyTheme.fontStack(o.font, o.fontCustom);
        if (o.size) el.style.fontSize = o.size + 'px';
        if (o.color) el.style.color = o.color;
        styledEls.push(el);
      });
    });
  }

  document.addEventListener('ploy:rendered', function () {
    if (pendingOverrides) {
      var o = pendingOverrides;
      pendingOverrides = null;
      applyOverrides(o);
    }
  });

  // ---------------- messages from the CMS ----------------
  window.addEventListener('message', function (ev) {
    if (ORIGINS.indexOf(ev.origin) === -1) return;
    var d = ev.data || {};
    if (d.type === 'ploy-blocks-preview') {
      state.sections = d.sections || [];
      state.editMode = !!d.editMode;
      state.selected = d.selected || { s: null, b: null };
      state.defaultOverrides = d.defaultOverrides || {};
      state.multi = d.multi || [];
      renderSections();
    } else if (d.type === 'ploy-styles-preview') {
      applyOverrides(d.overrides || {});
    } else if (d.type === 'ploy-scroll-to-section') {
      // CMS asks us to scroll a default section into view
      var target = document.querySelector('[data-default-section="' + d.sectionKey + '"]');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (d.type === 'ploy-free-align') {
      // Center a free-form widget within its frame. Measured here (in the
      // iframe) where real element/frame sizes are known, then the new x/y
      // is posted back so the CMS persists it.
      var childEl = document.querySelector('[data-bid="' + d.blockId + '"]');
      if (!childEl) return;
      var frameEl = childEl.parentElement;
      if (!frameEl) return;
      var cr = childEl.getBoundingClientRect();
      var fr = frameEl.getBoundingClientRect();
      var nx = childEl.offsetLeft, ny = childEl.offsetTop;
      if (d.mode === 'centerH' || d.mode === 'center') nx = Math.max(0, Math.round((fr.width - cr.width) / 2));
      if (d.mode === 'centerV' || d.mode === 'center') ny = Math.max(0, Math.round((fr.height - cr.height) / 2));
      childEl.style.left = nx + 'px';
      childEl.style.top = ny + 'px';
      post({ type: 'ploy-blocks-free-move', sectionId: d.sectionId, blockId: d.blockId, x: nx, y: ny });
    } else if (d.type === 'ploy-multi-align') {
      // Align/distribute several free-form widgets. Measured here where real
      // sizes are known; new x/y are posted back as a batch to persist.
      var ids = d.ids || [];
      var items = [];
      ids.forEach(function (id) {
        var el = document.querySelector('[data-bid="' + id + '"]');
        if (el) items.push({ id: id, el: el, l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
      });
      if (items.length < 2) return;
      var minL = Math.min.apply(null, items.map(function (i) { return i.l; }));
      var maxR = Math.max.apply(null, items.map(function (i) { return i.l + i.w; }));
      var minT = Math.min.apply(null, items.map(function (i) { return i.t; }));
      var maxB = Math.max.apply(null, items.map(function (i) { return i.t + i.h; }));
      var cx = (minL + maxR) / 2, cy = (minT + maxB) / 2;
      items.forEach(function (i) {
        if (d.mode === 'left') i.nx = minL;
        else if (d.mode === 'right') i.nx = maxR - i.w;
        else if (d.mode === 'hcenter') i.nx = Math.round(cx - i.w / 2);
        if (d.mode === 'top') i.ny = minT;
        else if (d.mode === 'bottom') i.ny = maxB - i.h;
        else if (d.mode === 'vcenter') i.ny = Math.round(cy - i.h / 2);
      });
      if (d.mode === 'hdist' || d.mode === 'vdist') {
        var horiz = d.mode === 'hdist';
        var sorted = items.slice().sort(function (a, b2) { return horiz ? a.l - b2.l : a.t - b2.t; });
        var total = horiz ? (maxR - minL) : (maxB - minT);
        var sizes = sorted.reduce(function (s, i) { return s + (horiz ? i.w : i.h); }, 0);
        var gap = (total - sizes) / (sorted.length - 1);
        var cursor = horiz ? minL : minT;
        sorted.forEach(function (i) {
          if (horiz) { i.nx = Math.round(cursor); cursor += i.w + gap; }
          else { i.ny = Math.round(cursor); cursor += i.h + gap; }
        });
      }
      var moves = [];
      items.forEach(function (i) {
        var nx = i.nx != null ? Math.max(0, i.nx) : i.l;
        var ny = i.ny != null ? Math.max(0, i.ny) : i.t;
        i.el.style.left = nx + 'px';
        i.el.style.top = ny + 'px';
        moves.push({ id: i.id, x: nx, y: ny });
      });
      post({ type: 'ploy-blocks-free-move-batch', sectionId: d.sectionId, moves: moves });
    }
  });

  // ---------------- initial load ----------------
  var base = (window.PloyTheme && window.PloyTheme.base) || '/';
  Promise.all([
    fetch(base + 'content/blocks.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch(base + 'content/styles.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
  ]).then(function (res) {
    var blocks = res[0];
    var styles = res[1];
    if (blocks && blocks.pages && PAGE && blocks.pages[PAGE]) {
      state.sections = blocks.pages[PAGE].sections || [];
      state.migrated = !!blocks.pages[PAGE].migrated;
      // Also load default overrides for this page
      if (blocks.pages[PAGE].defaultOverrides) {
        state.defaultOverrides = blocks.pages[PAGE].defaultOverrides;
      }
      // Header/Footer are shared site-wide: always resolve their widgets and
      // overrides from blocks.global so every page reflects the same edits,
      // regardless of when this particular page was last saved from the CMS.
      if (blocks.global) {
        state.sections.forEach(function (s) {
          if (s.type === 'default_section' && blocks.global[s.key]) {
            s.blocks = blocks.global[s.key].blocks || [];
            state.defaultOverrides[s.key] = blocks.global[s.key].override || {};
          }
        });
      }
      renderSections();
    }
    if (styles && styles.overrides && Object.keys(styles.overrides).length) applyOverrides(styles.overrides);

    // Collect default section info to send to CMS, including any repeatable
    // list bindings inside each section (e.g. Experience) so the CMS can offer
    // add/remove-item controls.
    var defSecs = getDefaultSections().map(function (s) {
      var lists = Array.prototype.slice.call(s.el.querySelectorAll('[data-cms-list],[data-cms-textlist]')).map(function (c) {
        return { path: c.dataset.cmsList || c.dataset.cmsTextlist, kind: c.dataset.cmsList ? 'list' : 'textlist' };
      });
      return { id: s.id, key: s.key, label: s.label, lists: lists };
    });
    post({ type: 'ploy-blocks-ready', page: PAGE, defaultSections: defSecs });
  });
})();
