/*
 * sections.js — Next-Gen Figma/Canva style renderer
 *
 * Supports: Auto Layout (flexbox) vs Free Layout (absolute X/Y)
 * Inline text editing via contenteditable
 * Shapes (Rectangle, Circle, Polygon, Line)
 * Drag & Drop for Free Layout elements
 */
(function () {
  var container = document.querySelector('.custom-sections');
  var PAGE = container ? container.dataset.page : null;
  var framed = window.parent && window.parent !== window;
  var ORIGINS = window.PLOY_CMS_ORIGINS || [];

  var state = { sections: [], editMode: false, selected: { s: null, b: null } };
  var draggingBlock = null;
  var isDragging = false;
  var dragOffset = { x: 0, y: 0 };
  
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

  var styleEl = document.createElement('style');
  styleEl.textContent = [
    '.ploy-sec { position: relative; width: 100%; box-sizing: border-box; transition: outline 0.15s; }',
    '.ploy-sec--auto { display: flex; flex-wrap: wrap; box-sizing: border-box; }',
    '.ploy-sec--free { position: relative; overflow: hidden; }',
    
    '.ploy-container { position: relative; box-sizing: border-box; }',
    '.ploy-container--auto { display: flex; }',
    '.ploy-container--free { position: relative; }',

    '.ploy-blk { position: relative; box-sizing: border-box; transition: outline 0.15s; }',
    
    '.custom-sections--edit .ploy-blk { cursor: pointer; }',
    '.custom-sections--edit .ploy-blk:hover { outline: 1px dashed rgba(37,99,235,.55); outline-offset: 2px; }',
    '.custom-sections--edit .ploy-sec:hover { outline: 1px dashed rgba(124,58,237,.3); outline-offset: -2px; }',
    
    '.ploy-sel { outline: 2px solid #2563eb !important; outline-offset: 2px; z-index: 10; }',
    '.ploy-sel-sec { outline: 2px solid #7c3aed !important; outline-offset: -2px; z-index: 5; }',
    
    '.ploy-blk--free { position: absolute !important; margin: 0 !important; }',
    '.ploy-draggable { cursor: grab !important; }',
    '.ploy-dragging { cursor: grabbing !important; opacity: 0.8; z-index: 99 !important; transition: none !important; }',

    '.ploy-shape { display: block; box-sizing: border-box; }',
    '.ploy-line { height: 2px; background: #000; width: 100%; }',

    '.ploy-blk__text { outline: none; min-width: 10px; min-height: 14px; }',
    '.ploy-blk__text[contenteditable="true"] { cursor: text; }',
    
    '.ploy-blk__text a { color: var(--ploy-accent-primary, #2563eb); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color .15s; }',
    '.ploy-blk__text a:hover { border-color: currentColor; }',
    
    '.is-animating { opacity: 0; animation-fill-mode: forwards; }',
    '.is-visible { opacity: 1; }',
    '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
    '@keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }',
    '@keyframes slide-left { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }',
    '@keyframes slide-right { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }',
    '@keyframes zoom-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }',
    '@keyframes bounce { 0% { opacity: 0; transform: translateY(30px); } 60% { opacity: 1; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }',
    '@keyframes flip { from { opacity: 0; transform: perspective(400px) rotateX(90deg); } to { opacity: 1; transform: perspective(400px) rotateX(0deg); } }',
    '.animate-fade.is-visible { animation-name: fade; }',
    '.animate-slide-up.is-visible { animation-name: slide-up; }',
    '.animate-slide-left.is-visible { animation-name: slide-left; }',
    '.animate-slide-right.is-visible { animation-name: slide-right; }',
    '.animate-zoom-in.is-visible { animation-name: zoom-in; }',
    '.animate-bounce.is-visible { animation-name: bounce; }',
    '.animate-flip.is-visible { animation-name: flip; }',
    
    '.hover-grow { transition: transform 0.25s; } .hover-grow:hover { transform: scale(1.05); }',
    '.hover-shrink { transition: transform 0.25s; } .hover-shrink:hover { transform: scale(0.95); }',
    '.hover-float { transition: transform 0.25s; } .hover-float:hover { transform: translateY(-6px); }',
    '.hover-glow { transition: box-shadow 0.25s; } .hover-glow:hover { box-shadow: 0 0 16px rgba(255,255,255,0.4); }',
    '.hover-pulse { animation: hoverPulse 1.5s infinite; } @keyframes hoverPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 100% { transform: scale(1); } }'
  ].join('\n');
  document.head.appendChild(styleEl);

  function post(msg) {
    if (!framed) return;
    try { window.parent.postMessage(msg, '*'); } catch (e) {}
  }

  function applyAnimation(el, data) {
    if (!data.animation || data.animation === 'none') {
      el.classList.remove('is-animating');
      return;
    }
    el.classList.add('is-animating');
    el.classList.add('animate-' + data.animation);
    if (data.animDuration) el.style.animationDuration = data.animDuration + 's';
    if (data.animDelay) el.style.animationDelay = data.animDelay + 's';
    
    if (data.hoverEffect && data.hoverEffect !== 'none') {
      el.classList.add('hover-' + data.hoverEffect);
    }

    if (animObserver) animObserver.observe(el);
    else el.classList.add('is-visible');
  }

  function renderText(text) {
    var div = document.createElement('div');
    var raw = (text || '').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>').replace(/\n/g, '<br>');
    div.innerHTML = raw;
    return div.innerHTML; // returns raw HTML string
  }

  // Find a block across the whole tree
  function findBlock(sections, id) {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === id) return { sec: sections[i], block: null, parent: null };
      var found = findInBlocks(sections[i], sections[i].blocks, id);
      if (found) return found;
    }
    return null;
  }
  function findInBlocks(sec, blocks, id) {
    if (!blocks) return null;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].id === id) return { sec: sec, block: blocks[i], parent: blocks };
      if (blocks[i].blocks) {
        var found = findInBlocks(sec, blocks[i].blocks, id);
        if (found) return found;
      }
    }
    return null;
  }

  function applyBaseStyles(el, blk, parentLayoutMode) {
    el.classList.add('ploy-blk');
    if (blk.id === state.selected.b) el.classList.add('ploy-sel');
    
    if (parentLayoutMode === 'free') {
      el.classList.add('ploy-blk--free');
      el.style.left = (blk.x || 0) + 'px';
      el.style.top = (blk.y || 0) + 'px';
      if (blk.width) el.style.width = blk.width + 'px';
      if (blk.height) el.style.height = blk.height + 'px';
      
      if (state.editMode) {
        el.classList.add('ploy-draggable');
        el.addEventListener('mousedown', function(e) {
          if (e.target.closest('[contenteditable="true"]')) return;
          e.stopPropagation();
          isDragging = true;
          draggingBlock = blk.id;
          
          var rect = el.getBoundingClientRect();
          dragOffset.x = e.clientX - rect.left;
          dragOffset.y = e.clientY - rect.top;
          
          el.classList.add('ploy-dragging');
          post({ type: 'ploy-blocks-select', sectionId: findBlock(state.sections, blk.id).sec.id, blockId: blk.id });
        });
      }
    } else {
      // Auto layout sizing (flex child)
      var w = blk.width || 100;
      el.style.flex = '0 1 ' + w + '%';
    }

    applyAnimation(el, blk);

    el.addEventListener('click', function(e) {
      e.stopPropagation();
      var found = findBlock(state.sections, blk.id);
      if (found) {
        state.selected = { s: found.sec.id, b: blk.id };
        post({ type: 'ploy-blocks-select', sectionId: found.sec.id, blockId: blk.id });
        renderSections();
      }
    });
  }

  document.addEventListener('mousemove', function(e) {
    if (!isDragging || !draggingBlock) return;
    var el = document.querySelector('[data-block-id="' + draggingBlock + '"]');
    if (!el) return;
    
    var parent = el.parentElement;
    var parentRect = parent.getBoundingClientRect();
    
    var newX = e.clientX - parentRect.left - dragOffset.x;
    var newY = e.clientY - parentRect.top - dragOffset.y;
    
    el.style.left = newX + 'px';
    el.style.top = newY + 'px';
  });

  document.addEventListener('mouseup', function(e) {
    if (isDragging && draggingBlock) {
      var el = document.querySelector('[data-block-id="' + draggingBlock + '"]');
      if (el) {
        el.classList.remove('ploy-dragging');
        var found = findBlock(state.sections, draggingBlock);
        if (found && found.block) {
          found.block.x = parseFloat(el.style.left);
          found.block.y = parseFloat(el.style.top);
          post({ type: 'ploy-blocks-move', sectionId: found.sec.id, blockId: draggingBlock, x: found.block.x, y: found.block.y });
        }
      }
      isDragging = false;
      draggingBlock = null;
    }
  });

  function buildBlock(blk, parentLayoutMode) {
    var el;
    
    if (blk.type === 'container') {
      el = document.createElement('div');
      el.className = 'ploy-container ploy-container--' + (blk.layoutMode || 'auto');
      
      if (blk.layoutMode !== 'free') {
        el.style.flexDirection = blk.flexDirection || 'column';
        el.style.gap = (blk.gap || 0) + 'px';
        el.style.alignItems = blk.alignItems || 'stretch';
        el.style.justifyContent = blk.justifyContent || 'flex-start';
        el.style.paddingTop = (blk.paddingT != null ? blk.paddingT : blk.padding || 0) + 'px';
        el.style.paddingRight = (blk.paddingR != null ? blk.paddingR : blk.padding || 0) + 'px';
        el.style.paddingBottom = (blk.paddingB != null ? blk.paddingB : blk.padding || 0) + 'px';
        el.style.paddingLeft = (blk.paddingL != null ? blk.paddingL : blk.padding || 0) + 'px';
      }
      
      if (blk.bg) el.style.backgroundColor = blk.bg;
      if (blk.radius) el.style.borderRadius = blk.radius + 'px';
      if (blk.border) el.style.border = blk.border;
      if (blk.shadow) el.style.boxShadow = blk.shadow;

      if (blk.blocks) {
        blk.blocks.forEach(function(child) {
          el.appendChild(buildBlock(child, blk.layoutMode || 'auto'));
        });
      }
    } 
    else if (blk.type === 'text') {
      var tag = blk.tag || 'p';
      el = document.createElement(tag);
      el.className = 'ploy-blk__text';
      el.innerHTML = renderText(blk.text);
      
      if (blk.size) el.style.fontSize = blk.size + 'px';
      if (blk.color) el.style.color = blk.color;
      if (blk.bold) el.style.fontWeight = 'bold';
      if (blk.align) el.style.textAlign = blk.align;
      if (blk.font && blk.font !== 'custom') {
        var opt = (window.PloyTheme ? window.PloyTheme.FONT_OPTIONS : []).find(function(x) { return x.id === blk.font; });
        if (opt) el.style.fontFamily = opt.css;
      } else if (blk.font === 'custom' && blk.fontCustom) {
        el.style.fontFamily = blk.fontCustom;
      }

      if (state.editMode) {
        el.setAttribute('contenteditable', 'true');
        el.addEventListener('blur', function() {
          var newText = el.innerText;
          var found = findBlock(state.sections, blk.id);
          if (found) {
            found.block.text = newText;
            post({ type: 'ploy-blocks-text', sectionId: found.sec.id, blockId: blk.id, text: newText });
          }
        });
        el.addEventListener('mousedown', function(e) { e.stopPropagation(); }); // prevent drag
      }
    }
    else if (blk.type === 'image') {
      el = document.createElement('img');
      el.src = blk.src || '';
      el.alt = blk.alt || '';
      if (blk.radius) el.style.borderRadius = blk.radius + 'px';
      if (blk.objectFit) el.style.objectFit = blk.objectFit;
      if (blk.height) el.style.height = blk.height + 'px';
      el.style.width = '100%';
    }
    else if (blk.type === 'button') {
      el = document.createElement('a');
      el.href = state.editMode ? 'javascript:void(0)' : (blk.url || '#');
      el.textContent = blk.text || 'Button';
      el.className = 'typography-button inline-flex items-center justify-center rounded-button border px-5 py-3 text-sm transition-colors duration-200 button-link--primary border-ploy-button-primary-border bg-ploy-button-primary-background text-ploy-button-primary-text hover:opacity-80';
      if (blk.align) {
        var wrap = document.createElement('div');
        wrap.style.textAlign = blk.align;
        wrap.appendChild(el);
        el = wrap;
      }
    }
    else if (blk.type === 'shape') {
      el = document.createElement('div');
      el.className = 'ploy-shape';
      if (blk.shapeType === 'circle') el.style.borderRadius = '50%';
      if (blk.shapeType === 'line') el.className += ' ploy-line';
      if (blk.shapeType === 'polygon' && blk.clipPath) el.style.clipPath = blk.clipPath;
      
      if (blk.bg) el.style.backgroundColor = blk.bg;
      if (blk.border) el.style.border = blk.border;
      if (blk.radius && blk.shapeType !== 'circle') el.style.borderRadius = blk.radius + 'px';
      if (blk.shadow) el.style.boxShadow = blk.shadow;
    }

    el.dataset.blockId = blk.id;
    applyBaseStyles(el, blk, parentLayoutMode);
    return el;
  }

  function renderSections() {
    if (!container) return;
    container.innerHTML = '';
    
    if (state.editMode) {
      container.classList.add('custom-sections--edit');
    } else {
      container.classList.remove('custom-sections--edit');
    }

    state.sections.forEach(function (sec) {
      var sEl = document.createElement('section');
      sEl.className = 'ploy-sec ploy-sec--' + (sec.layoutMode || 'auto');
      sEl.id = sec.id;
      
      if (sec.id === state.selected.s) sEl.classList.add('ploy-sel-sec');

      if (sec.layoutMode !== 'free') {
        sEl.style.flexDirection = sec.flexDirection || 'column';
        sEl.style.alignItems = sec.alignItems || 'flex-start';
        sEl.style.justifyContent = sec.justifyContent || 'flex-start';
        sEl.style.gap = (sec.gap || 0) + 'px';
        sEl.style.paddingTop = (sec.paddingT != null ? sec.paddingT : sec.paddingY || 0) + 'px';
        sEl.style.paddingRight = (sec.paddingR != null ? sec.paddingR : 0) + 'px';
        sEl.style.paddingBottom = (sec.paddingB != null ? sec.paddingB : sec.paddingY || 0) + 'px';
        sEl.style.paddingLeft = (sec.paddingL != null ? sec.paddingL : 0) + 'px';
        if (sec.maxWidth) {
          sEl.style.maxWidth = sec.maxWidth + 'px';
          sEl.style.marginLeft = 'auto';
          sEl.style.marginRight = 'auto';
        }
      } else {
        if (sec.minHeight) sEl.style.minHeight = sec.minHeight + 'px';
      }

      if (sec.bg) sEl.style.backgroundColor = sec.bg;

      if (sec.blocks) {
        sec.blocks.forEach(function(blk) {
          sEl.appendChild(buildBlock(blk, sec.layoutMode || 'auto'));
        });
      }

      sEl.addEventListener('click', function(e) {
        if (e.target === sEl) {
          state.selected = { s: sec.id, b: null };
          post({ type: 'ploy-blocks-select', sectionId: sec.id, blockId: null });
          renderSections();
        }
      });

      container.appendChild(sEl);
    });
  }

  window.addEventListener('message', function (ev) {
    if (ORIGINS.indexOf(ev.origin) === -1) return;
    var d = ev.data || {};
    
    if (d.type === 'ploy-blocks-preview') {
      state.sections = d.sections || [];
      state.editMode = d.editMode;
      state.selected = d.selected || { s: null, b: null };
      renderSections();
    }
    else if (d.type === 'ploy-scroll-to-section') {
      var s = document.getElementById('default:' + d.sectionKey);
      if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  window.addEventListener('DOMContentLoaded', function () {
    if (!container) return;
    // Signal to CMS that we are ready
    post({ type: 'ploy-blocks-ready', page: PAGE });
  });

})();
