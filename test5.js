
/* ==================== SECTIONS EDITOR (blocks.json) ==================== */
(function () {
  const frame = document.getElementById('themeFrame');
  const ORIGIN = window.WEBSITE_ORIGIN;

  // Dynamic pages — loaded from /api/pages
  let pagesData = { pages: [] };
  let currentPage = 'home';
  let currentPagePath = '/';

  const TAG_OPTIONS = [
    { v: 'h1', l: 'Heading 1' },
    { v: 'h2', l: 'Heading 2' },
    { v: 'h3', l: 'Heading 3' },
    { v: 'p', l: 'Paragraph' },
    { v: 'small', l: 'Small text' },
  ];

  let blocksData = null;
  let blocksDirty = false;
  let selected = { s: null, b: null };
  let editMode = false;
  let knownDefaultSections = []; // sent from the preview iframe

  const statusEl = document.getElementById('blocksStatus');
  const saveBtn = document.getElementById('blocksSaveBtn');
  const listEl = document.getElementById('secList');
  const inspector = document.getElementById('blocksInspector');
  const pageNameEl = document.getElementById('sectionsPageName');
  const pageBar = document.getElementById('pageBar');

  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);
  function cur() {
    if (!blocksData.pages[currentPage]) blocksData.pages[currentPage] = { sections: [], defaultOverrides: {} };
    if (!blocksData.pages[currentPage].sections) blocksData.pages[currentPage].sections = [];
    if (!blocksData.pages[currentPage].defaultOverrides) blocksData.pages[currentPage].defaultOverrides = {};
    return blocksData.pages[currentPage];
  }
  const findSec = (id) => cur().sections.find((s) => s.id === id);
  const findBlk = (sec, id) => (sec ? (sec.blocks || []).find((x) => x.id === id) : null);

  function markBlocksDirty() {
    blocksDirty = true;
    saveBtn.disabled = false;
    statusEl.textContent = 'Unsaved changes';
    statusEl.className = 'dirty';
  }

  function push() {
    if (!blocksData) return;
    try {
      frame.contentWindow.postMessage({
        type: 'ploy-blocks-preview',
        sections: cur().sections,
        editMode,
        selected,
        defaultOverrides: cur().defaultOverrides || {},
      }, ORIGIN);
    } catch (e) {}
  }

  function newTextBlock() {
    return { id: uid('b'), type: 'text', tag: 'p', text: 'New text — click in the preview to edit.', font: '', fontCustom: '', size: 0, color: '', bold: false, align: 'left', width: 100 };
  }
  function newImageBlock() {
    return { id: uid('b'), type: 'image', src: '', alt: '', width: 48, radius: 0 };
  }
  function newContainerBlock() {
    return { id: uid('b'), type: 'container', width: 100, flexDirection: 'column', gap: 16, alignItems: 'stretch', justifyContent: 'flex-start', padding: 0, bg: '', radius: 0, blocks: [newTextBlock()] };
  }
  function newButtonBlock() {
    return { id: uid('b'), type: 'button', text: 'Button', url: '#', width: 100 };
  }
  function newSection() {
    return { id: uid('s'), bg: '', paddingY: 64, gap: 24, maxWidth: 1152, minHeight: 0, align: 'start', blocks: [newTextBlock()] };
  }

  // ---- tabs ----
  const tabA = document.getElementById('tabAppearanceBtn');
  const tabS = document.getElementById('tabSectionsBtn');
  const paneA = document.getElementById('tab-appearance');
  const paneS = document.getElementById('tab-sections');
  function setTab(sections) {
    editMode = sections;
    tabA.classList.toggle('active', !sections);
    tabS.classList.toggle('active', sections);
    paneA.style.display = sections ? 'none' : '';
    paneS.style.display = sections ? '' : 'none';
    push();
  }
  tabA.addEventListener('click', () => setTab(false));
  tabS.addEventListener('click', () => setTab(true));

  // ---- dynamic page bar ----
  function buildPageBar() {
    pageBar.innerHTML = '';
    pagesData.pages.forEach((pg) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = pg.label;
      b.dataset.page = pg.path;
      b.dataset.slug = pg.slug;
      if (pg.slug === currentPage) b.classList.add('active');
      b.addEventListener('click', () => {
        currentPage = pg.slug;
        currentPagePath = pg.path;
        pageBar.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        frame.src = ORIGIN + pg.path;
        selected = { s: null, b: null };
        knownDefaultSections = [];
        renderAll();
      });
      pageBar.append(b);
    });

    // Add page button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-page-btn';
    addBtn.textContent = '+ Add page';
    addBtn.addEventListener('click', showAddPageModal);
    pageBar.append(addBtn);
  }

  function showAddPageModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <h3>Add New Page</h3>
      <p>Create a new work page. It will appear in the page bar and can be linked from your navigation.</p>
      <div class="field">
        <label>Page title</label>
        <input type="text" id="newPageTitle" placeholder="e.g. Brand Guidelines" autofocus>
      </div>
      <div class="modal-actions">
        <button class="modal-cancel" type="button">Cancel</button>
        <button class="modal-confirm" type="button">Create page</button>
      </div>
    `;
    overlay.append(modal);
    document.body.append(overlay);

    const titleInput = modal.querySelector('#newPageTitle');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const confirmBtn = modal.querySelector('.modal-confirm');

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    confirmBtn.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      if (!title) { titleInput.focus(); return; }
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Creating…';
      try {
        const resp = await fetch('/api/pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        const out = await resp.json();
        if (!resp.ok) throw new Error(out.error || 'Failed');
        // Add to local pages data
        pagesData.pages.push({ slug: out.slug, path: out.path, label: out.label, builtin: false });
        buildPageBar();
        toast('Page "' + title + '" created! Switch to it in the page bar.');
        overlay.remove();
      } catch (e) {
        toast('Failed: ' + e.message, true);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Create page';
      }
    });

    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmBtn.click();
      if (e.key === 'Escape') overlay.remove();
    });

    setTimeout(() => titleInput.focus(), 50);
  }

  // Load the initial frame after building the page bar
  function loadInitialFrame() {
    frame.src = ORIGIN + currentPagePath;
  }

  // ---- messages from the preview ----
  window.addEventListener('message', (ev) => {
    if (ev.origin !== ORIGIN) return;
    const d = ev.data || {};
    if (d.type === 'ploy-blocks-ready') {
      // The preview page announces what default sections it has
      if (d.defaultSections) {
        knownDefaultSections = d.defaultSections;
        if (!cur().migrated) {
          cur().migrated = true;
          // If there are custom sections already (from previous non-migrated CMS usage),
          // they would normally just sit in the middle. For simplicity, we just append them.
          // The best approach is: if we have existing custom sections, we don't know where to put them, 
          // so we'll just put the defaults first.
          const oldSecs = cur().sections.slice();
          cur().sections = [];
          knownDefaultSections.forEach((ds) => {
            cur().sections.push({ id: ds.id, type: 'default_section', key: ds.key });
          });
          cur().sections.push(...oldSecs);
          markBlocksDirty();
        }
      }
      push();
      if (window.pushStylesPreview) window.pushStylesPreview();
      renderAll();
    } else if (d.type === 'ploy-blocks-select') {
      selected = { s: d.sectionId, b: d.blockId };
      renderAll();
    } else if (d.type === 'ploy-blocks-text') {
      const blk = findBlk(findSec(d.sectionId), d.blockId);
      if (!blk) return;
      blk.text = d.text;
      markBlocksDirty();
      const ta = inspector.querySelector('[data-role=blocktext]');
      if (ta && document.activeElement !== ta) ta.value = d.text;
    } else if (d.type === 'ploy-blocks-resize') {
      const blk = findBlk(findSec(d.sectionId), d.blockId);
      if (!blk) return;
      blk.width = d.width;
      markBlocksDirty();
      const wi = inspector.querySelector('[data-role=blockwidth]');
      if (wi && document.activeElement !== wi) wi.value = Math.round(d.width);
    } else if (d.type === 'ploy-blocks-section-resize') {
      const sec = findSec(d.sectionId);
      if (!sec) return;
      sec.minHeight = d.minHeight;
      markBlocksDirty();
      const mh = inspector.querySelector('[data-role=secminh]');
      if (mh && document.activeElement !== mh) mh.value = d.minHeight;
    } else if (d.type === 'ploy-blocks-op') {
      handleOp(d);
    }
  });

  function handleOp(d) {
    const secs = cur().sections;
    const si = secs.findIndex((s) => s.id === d.sectionId);
    if (si === -1) return;
    const sec = secs[si];
    if (d.op === 'moveSection') {
      const ni = si + d.dir;
      if (ni < 0 || ni >= secs.length) return;
      secs.splice(ni, 0, secs.splice(si, 1)[0]);
    } else if (d.op === 'deleteSection') {
      if (!confirm('Delete this section and everything in it?')) return;
      secs.splice(si, 1);
      selected = { s: null, b: null };
    } else if (d.op === 'addBlock') {
      let blk;
      if (d.blockType === 'image') blk = newImageBlock();
      else if (d.blockType === 'button') blk = newButtonBlock();
      else if (d.blockType === 'container') blk = newContainerBlock();
      else blk = newTextBlock();
      sec.blocks = sec.blocks || [];
      sec.blocks.push(blk);
      selected = { s: sec.id, b: blk.id };
    } else if (d.op === 'moveBlock' || d.op === 'deleteBlock') {
      const bi = sec.blocks.findIndex((x) => x.id === d.blockId);
      if (bi === -1) return;
      if (d.op === 'moveBlock') {
        const nb = bi + d.dir;
        if (nb < 0 || nb >= sec.blocks.length) return;
        sec.blocks.splice(nb, 0, sec.blocks.splice(bi, 1)[0]);
      } else {
        sec.blocks.splice(bi, 1);
        if (selected.b === d.blockId) selected = { s: sec.id, b: null };
      }
    }
    markBlocksDirty();
    renderAll();
    push();
  }

  document.getElementById('addSectionBtn').addEventListener('click', () => {
    if (!blocksData) return;
    const s = newSection();
    cur().sections.push(s);
    selected = { s: s.id, b: s.blocks[0].id };
    markBlocksDirty();
    renderAll();
    if (!editMode) setTab(true);
    else push();
  });

  // ---- inspector controls ----
  function field(label, control, role) {
    const w = document.createElement('div');
    w.className = 'field';
    const l = document.createElement('label');
    l.textContent = label;
    if (role) control.dataset.role = role;
    w.append(l, control);
    return w;
  }
  function numInput(val, onCh, min, max) {
    const i = document.createElement('input');
    i.type = 'number';
    if (min != null) i.min = min;
    if (max != null) i.max = max;
    i.value = val != null ? val : '';
    i.addEventListener('input', () => onCh(parseFloat(i.value) || 0));
    return i;
  }
  function selInput(options, val, onCh) {
    const s = document.createElement('select');
    options.forEach((o) => {
      const op = document.createElement('option');
      op.value = o.v;
      op.textContent = o.l;
      if (o.v === val) op.selected = true;
      s.append(op);
    });
    s.addEventListener('change', () => onCh(s.value));
    return s;
  }
  function colorInput(val, onCh) {
    const row = document.createElement('div');
    row.className = 'colorfield__row';
    const sw = document.createElement('input');
    sw.type = 'color';
    sw.value = /^#[0-9a-fA-F]{6}$/.test(val || '') ? val : '#ffffff';
    const hx = document.createElement('input');
    hx.type = 'text';
    hx.placeholder = 'empty = default';
    hx.value = val || '';
    sw.addEventListener('input', () => { hx.value = sw.value; onCh(sw.value); });
    hx.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hx.value)) sw.value = hx.value;
      onCh(hx.value);
    });
    const clr = document.createElement('button');
    clr.type = 'button';
    clr.className = 'btn-sm';
    clr.textContent = '✕';
    clr.title = 'Clear (use default)';
    clr.addEventListener('click', () => { hx.value = ''; onCh(''); });
    row.append(sw, hx, clr);
    return row;
  }
  function fontInputs(obj, onChange) {
    const wrap = document.createElement('div');
    const sel = selInput(
      [{ v: '', l: 'Default font' }].concat((window.PloyTheme ? window.PloyTheme.FONT_OPTIONS : []).map((f) => ({ v: f.id, l: f.label }))),
      obj.font || '',
      (v) => {
        obj.font = v;
        custom.style.display = v === 'custom' ? '' : 'none';
        onChange();
      },
    );
    const custom = document.createElement('input');
    custom.type = 'text';
    custom.placeholder = 'e.g. "Roboto", sans-serif';
    custom.style.marginTop = '8px';
    custom.value = obj.fontCustom || '';
    custom.style.display = obj.font === 'custom' ? '' : 'none';
    custom.addEventListener('input', () => { obj.fontCustom = custom.value; onChange(); });
    wrap.append(sel, custom);
    return wrap;
  }
  function actionBtn(label, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-sm';
    b.textContent = label;
    b.addEventListener('click', fn);
    return b;
  }

  function renderAll() {
    const pg = pagesData.pages.find((p) => p.slug === currentPage);
    pageNameEl.textContent = pg ? pg.label : currentPage;
    renderList();
    renderInspector();
  }

  function renderList() {
    listEl.innerHTML = '';
    if (!blocksData) return;
    cur().sections.forEach((sec, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      if (sec.type === 'default_section') {
        const dInfo = knownDefaultSections.find(x => x.id === sec.id);
        b.textContent = '📌 ' + (dInfo ? dInfo.label : sec.key || 'Default section');
        b.className = 'default-sec';
      } else {
        b.textContent = 'Section ' + (i + 1) + ' — ' + (sec.blocks || []).length + ' block' + ((sec.blocks || []).length === 1 ? '' : 's');
      }
      if (selected.s === sec.id) b.classList.add('active');
      b.addEventListener('click', () => {
        selected = { s: sec.id, b: null };
        renderAll();
        push();
        // Scroll the preview to the default section if it is one
        if (sec.type === 'default_section') {
          try {
            frame.contentWindow.postMessage({ type: 'ploy-scroll-to-section', sectionKey: sec.key }, ORIGIN);
          } catch (e) {}
        }
      });
      listEl.append(b);
    });
  }

  window.addSelectedWidget = function(type) {
    if (!selected.s) {
      toast('Please select a section first.', true);
      return;
    }
    const sec = findSec(selected.s);
    if (!sec || sec.type === 'default_section') {
      toast('Cannot add widgets to this section type.', true);
      return;
    }
    handleOp({ op: 'addBlock', sectionId: sec.id, blockType: type });
  };

  function renderInspector() {
    inspector.innerHTML = '';
    const defaultWidgets = document.getElementById('defaultWidgets');
    if (!blocksData || !selected.s) {
      if (defaultWidgets) defaultWidgets.style.display = 'block';
      inspector.style.display = 'none';
      return;
    }
    
    if (defaultWidgets) defaultWidgets.style.display = 'none';
    inspector.style.display = 'block';
    
    // Switch to elements tab automatically if we just selected something in Navigator
    if (!editMode) {
      document.getElementById('tabElementsBtn').click();
    }

    const sec = findSec(selected.s);
    if (!sec) { selected.s = null; renderInspector(); return; }

    const blk = findBlk(sec, selected.b);
    const upd = () => { markBlocksDirty(); push(); };
    const targetData = blk || sec;

    // Default Section logic (has very limited edits)
    if (sec.type === 'default_section') {
      const sKey = selected.s.replace('default:', '');
      const ds = knownDefaultSections.find((d) => d.key === sKey);
      const ov = cur().defaultOverrides[sKey] || {};
      
      const h = document.createElement('h3');
      h.textContent = '📌 ' + (ds ? ds.label : 'Default Section');
      inspector.append(h);
      
      inspector.append(field('Background color (empty = default)', colorInput(ov.bg || '', (v) => {
        if (!cur().defaultOverrides[sKey]) cur().defaultOverrides[sKey] = {};
        cur().defaultOverrides[sKey].bg = v;
        if (!v) delete cur().defaultOverrides[sKey].bg;
        upd();
      })));
      inspector.append(field('Vertical padding (px, empty = default)', numInput(ov.paddingY || '', (v) => {
        if (!cur().defaultOverrides[sKey]) cur().defaultOverrides[sKey] = {};
        cur().defaultOverrides[sKey].paddingY = v || 0;
        if (!v) delete cur().defaultOverrides[sKey].paddingY;
        upd();
      }, 0, 400)));

      const acts = document.createElement('div');
      acts.className = 'insp-actions';
      acts.append(
        actionBtn('↑ Move up', () => handleOp({ op: 'moveSection', sectionId: sec.id, dir: -1 })),
        actionBtn('↓ Move down', () => handleOp({ op: 'moveSection', sectionId: sec.id, dir: 1 })),
        actionBtn('✕ Delete section', () => handleOp({ op: 'deleteSection', sectionId: sec.id })),
      );
      inspector.append(acts);
      return;
    }

    // Tab Header
    const tabsRow = document.createElement('div');
    tabsRow.className = 'props-tabs';
    const btnC = document.createElement('button'); btnC.textContent = 'Content'; btnC.className = 'active';
    const btnS = document.createElement('button'); btnS.textContent = 'Style';
    const btnA = document.createElement('button'); btnA.textContent = 'Advanced';
    tabsRow.append(btnC, btnS, btnA);
    inspector.append(tabsRow);
    
    const panelC = document.createElement('div');
    const panelS = document.createElement('div'); panelS.style.display = 'none';
    const panelA = document.createElement('div'); panelA.style.display = 'none';
    inspector.append(panelC, panelS, panelA);
    
    const switchPropsTab = (t) => {
      btnC.className = t === 'c' ? 'active' : '';
      btnS.className = t === 's' ? 'active' : '';
      btnA.className = t === 'a' ? 'active' : '';
      panelC.style.display = t === 'c' ? 'block' : 'none';
      panelS.style.display = t === 's' ? 'block' : 'none';
      panelA.style.display = t === 'a' ? 'block' : 'none';
    };
    btnC.addEventListener('click', () => switchPropsTab('c'));
    btnS.addEventListener('click', () => switchPropsTab('s'));
    btnA.addEventListener('click', () => switchPropsTab('a'));

    // --- Content Tab ---
    if (!blk) {
      panelC.innerHTML = '<p class="hint">Sections do not have content fields. Add widgets from the grid above.</p>';
    } else {
      if (blk.type === 'image') {
        panelC.append(field('Image URL', imageControl(blk.src, (v) => { blk.src = v; upd(); })));
        panelC.append(field('Alt text', textInput(blk.alt, (v) => { blk.alt = v; upd(); })));
        panelC.append(field('Link URL', textInput(blk.url, (v) => { blk.url = v; upd(); })));
      } else if (blk.type === 'button') {
        panelC.append(field('Button text', textInput(blk.text, (v) => { blk.text = v; upd(); })));
        panelC.append(field('Link URL', textInput(blk.url, (v) => { blk.url = v; upd(); })));
      } else {
        const ta = textInput(blk.text, (v) => { blk.text = v; upd(); }, true);
        panelC.append(field('Text (use [Text](/url) for links)', ta, 'blocktext'));
      }
    }

    // --- Style Tab ---
    if (!blk) {
      panelS.append(field('Background color', colorInput(sec.bg, (v) => { sec.bg = v; upd(); })));
      panelS.append(field('Vertical padding (px)', numInput(sec.paddingY, (v) => { sec.paddingY = v; upd(); }, 0, 400)));
      panelS.append(field('Gap between blocks (px)', numInput(sec.gap, (v) => { sec.gap = v; upd(); }, 0, 120)));
      panelS.append(field('Content max width (px)', numInput(sec.maxWidth, (v) => { sec.maxWidth = v || 1152; upd(); }, 320, 2400)));
      panelS.append(field('Min height (px, 0 = auto)', numInput(sec.minHeight, (v) => { sec.minHeight = v; upd(); }, 0, 2000)));
      panelS.append(field('Block alignment', selInput(
        [{ v: 'start', l: 'Top' }, { v: 'center', l: 'Center' }, { v: 'end', l: 'Bottom' }, { v: 'stretch', l: 'Stretch' }],
        sec.align || 'start', (v) => { sec.align = v; upd(); }
      )));
    } else {
      if (blk.type === 'image') {
        panelS.append(field('Corner radius (px)', numInput(blk.radius, (v) => { blk.radius = v; upd(); }, 0, 100)));
      } else if (blk.type === 'text') {
        panelS.append(field('Typography Style', selInput(TAG_OPTIONS, blk.tag || 'p', (v) => { blk.tag = v; upd(); })));
        panelS.append(field('Font Family', fontInputs(blk, upd)));
        panelS.append(field('Size (px, 0 = default)', numInput(blk.size, (v) => { blk.size = v; upd(); }, 0, 200)));
        panelS.append(field('Color', colorInput(blk.color, (v) => { blk.color = v; upd(); })));
        panelS.append(field('Alignment', selInput(
          [{ v: 'left', l: 'Left' }, { v: 'center', l: 'Center' }, { v: 'right', l: 'Right' }],
          blk.align || 'left', (v) => { blk.align = v; upd(); }
        )));
        const boldWrap = document.createElement('div');
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!blk.bold;
        cb.addEventListener('change', () => { blk.bold = cb.checked; upd(); });
        boldWrap.append(cb);
        panelS.append(field('Bold', boldWrap));
      }
      panelS.append(field('Width (% of row)', numInput(Math.round(blk.width), (v) => { blk.width = Math.min(100, Math.max(8, v || 100)); upd(); }, 8, 100)));
    }

    // --- Advanced Tab ---
    panelA.append(field('Entrance Animation', selInput([
      { v: '', l: 'None' },
      { v: 'fade', l: 'Fade In' },
      { v: 'slide-up', l: 'Slide Up' },
      { v: 'slide-left', l: 'Slide Left' },
      { v: 'slide-right', l: 'Slide Right' },
      { v: 'zoom-in', l: 'Zoom In' }
    ], targetData.animation || '', (v) => { targetData.animation = v; upd(); })));
    
    panelA.append(field('Animation Duration (s)', numInput(targetData.animDuration || 0.6, (v) => { targetData.animDuration = v; upd(); }, 0.1, 5)));
    panelA.append(field('Animation Delay (s)', numInput(targetData.animDelay || 0, (v) => { targetData.animDelay = v; upd(); }, 0, 5)));
    
    // Actions
    const acts = document.createElement('div');
    acts.className = 'insp-actions';
    acts.style.marginTop = '24px';
    acts.style.paddingTop = '16px';
    acts.style.borderTop = '1px solid var(--line)';
    if (!blk) {
      acts.append(
        actionBtn('↑ Move up', () => handleOp({ op: 'moveSection', sectionId: sec.id, dir: -1 })),
        actionBtn('↓ Move down', () => handleOp({ op: 'moveSection', sectionId: sec.id, dir: 1 })),
        actionBtn('✕ Delete section', () => handleOp({ op: 'deleteSection', sectionId: sec.id })),
      );
    } else {
      acts.append(
        actionBtn('◀ Move left', () => handleOp({ op: 'moveBlock', sectionId: sec.id, blockId: blk.id, dir: -1 })),
        actionBtn('▶ Move right', () => handleOp({ op: 'moveBlock', sectionId: sec.id, blockId: blk.id, dir: 1 })),
        actionBtn('Select parent section', () => { selected = { s: sec.id, b: null }; renderAll(); push(); }),
        actionBtn('✕ Delete element', () => handleOp({ op: 'deleteBlock', sectionId: sec.id, blockId: blk.id })),
      );
    }
    inspector.append(acts);
  }

  // ---- save ----
  saveBtn.addEventListener('click', async () => {
    if (!blocksDirty || !blocksData) return;
    saveBtn.disabled = true;
    statusEl.textContent = 'Saving…';
    try {
      const resp = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blocksData),
      });
      const out = await resp.json();
      if (!resp.ok) throw new Error(out.error || 'Save failed');
      blocksDirty = false;
      statusEl.textContent = 'All changes saved';
      statusEl.className = 'saved';
    } catch (e) {
      saveBtn.disabled = false;
      statusEl.textContent = 'Save failed';
      statusEl.className = 'dirty';
    }
  });
  window.addEventListener('beforeunload', (e) => { if (blocksDirty) e.preventDefault(); });

  // ---- init ----
  (async function initBlocks() {
    try {
      const [blocksResp, pagesResp] = await Promise.all([
        fetch('/api/blocks', { cache: 'no-store' }),
        fetch('/api/pages', { cache: 'no-store' }),
      ]);
      blocksData = blocksResp.ok ? await blocksResp.json() : { pages: {} };
      if (pagesResp.ok) pagesData = await pagesResp.json();
    } catch (e) {
      blocksData = { pages: {} };
    }
    if (!blocksData.pages) blocksData.pages = {};
    if (!pagesData.pages || !pagesData.pages.length) {
      pagesData = {
        pages: [
          { slug: 'home', path: '/', label: 'Home', builtin: true },
          { slug: 'product-wireframes', path: '/work/product-wireframes/', label: 'Wireframes', builtin: true },
          { slug: 'product-decks', path: '/work/product-decks/', label: 'Decks', builtin: true },
          { slug: 'visual-systems', path: '/work/visual-systems/', label: 'Visual Systems', builtin: true },
        ]
      };
    }
    statusEl.textContent = 'All changes saved';
    statusEl.className = 'saved';
    buildPageBar();
    loadInitialFrame();
    renderAll();
  })();
})();
