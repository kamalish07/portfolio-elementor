
const SCHEMA = [
  {
    id: 'site', title: 'Site & Navigation',
    hint: 'Global identity shown on every page.',
    fields: [
      { path: 'site.name', label: 'Site name' },
      { path: 'site.title', label: 'Browser tab title (home page)' },
      { path: 'site.description', label: 'Meta description', type: 'textarea' },
      { path: 'site.nav.logo', label: 'Header logo text' },
      { path: 'site.nav.links', label: 'Header links', type: 'list', itemLabel: 'Link', item: [
        { key: 'label', label: 'Label' },
        { key: 'href', label: 'URL' },
      ]},
    ],
  },
  {
    id: 'footer', title: 'Footer',
    hint: 'Shown at the bottom of every page.',
    fields: [
      { path: 'site.footer.title', label: 'Headline' },
      { path: 'site.footer.copy', label: 'Copy', type: 'textarea' },
      { path: 'site.footer.links', label: 'Footer links', type: 'list', itemLabel: 'Link', item: [
        { key: 'label', label: 'Label' },
        { key: 'href', label: 'URL' },
      ]},
      { path: 'site.footer.copyrightYear', label: 'Copyright year' },
      { path: 'site.footer.copyrightName', label: 'Copyright name' },
      { path: 'site.footer.linkedinUrl', label: 'LinkedIn URL (leave blank for "coming soon" badge)' },
    ],
  },
  {
    id: 'hero', title: 'Home — Hero',
    fields: [
      { path: 'home.hero.title', label: 'Title' },
      { path: 'home.hero.subtitle', label: 'Subtitle', type: 'textarea' },
      { path: 'home.hero.ctaLabel', label: 'Button label' },
      { path: 'home.hero.ctaHref', label: 'Button link' },
      { path: 'home.hero.image', label: 'Hero image', type: 'image' },
      { path: 'home.hero.imageAlt', label: 'Hero image alt text' },
    ],
  },
  {
    id: 'practice', title: 'Home — Capabilities',
    hint: 'The four capability tiles under the hero.',
    fields: [
      { path: 'home.practice', label: 'Capabilities', type: 'list', itemLabel: 'Capability', item: [
        { key: 'mark', label: 'Mark (2 letters)' },
        { key: 'title', label: 'Title' },
        { key: 'copy', label: 'Copy' },
      ]},
    ],
  },
  {
    id: 'projects', title: 'Home — Projects',
    hint: 'Cards in the "Selected work" grid. The slug is the /work/… page it links to.',
    fields: [
      { path: 'home.projectsTitle', label: 'Section title' },
      { path: 'home.projects', label: 'Project cards', type: 'list', itemLabel: 'Project', item: [
        { key: 'slug', label: 'Slug (work page)' },
        { key: 'discipline', label: 'Discipline' },
        { key: 'title', label: 'Title' },
        { key: 'summary', label: 'Summary', type: 'textarea' },
        { key: 'image', label: 'Cover image', type: 'image' },
        { key: 'imageAlt', label: 'Image alt text' },
      ]},
    ],
  },
  {
    id: 'experience', title: 'Home — Experience',
    fields: [
      { path: 'home.experienceTitle', label: 'Section title' },
      { path: 'home.experienceIntro', label: 'Section intro', type: 'textarea' },
      { path: 'home.experience', label: 'Experience entries', type: 'list', itemLabel: 'Role', item: [
        { key: 'role', label: 'Role' },
        { key: 'organization', label: 'Organization' },
        { key: 'period', label: 'Period' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'skills', label: 'Skills (separate with ·)' },
      ]},
    ],
  },
  {
    id: 'cs-wireframes', title: 'Case Study — Product Wireframes',
    fields: caseStudyFields('product-wireframes'),
  },
  {
    id: 'cs-visual', title: 'Case Study — Visual Systems',
    fields: caseStudyFields('visual-systems'),
  },
  {
    id: 'decks', title: 'Product Decks Gallery',
    hint: 'Cards on the /work/product-decks page. Add a PDF URL to make a card clickable.',
    fields: [
      { path: 'deckGallery.title', label: 'Page title' },
      { path: 'deckGallery.backLabel', label: 'Back link label' },
      { path: 'deckGallery.items', label: 'Deck cards', type: 'list', itemLabel: 'Deck', item: [
        { key: 'title', label: 'Title' },
        { key: 'image', label: 'Cover image', type: 'image' },
        { key: 'imageAlt', label: 'Image alt text' },
        { key: 'pdfUrl', label: 'PDF URL (optional)' },
      ]},
    ],
  },
];

function caseStudyFields(slug) {
  const p = 'caseStudies.' + slug + '.';
  return [
    { path: p + 'discipline', label: 'Discipline' },
    { path: p + 'title', label: 'Title' },
    { path: p + 'summary', label: 'Summary', type: 'textarea' },
    { path: p + 'year', label: 'Meta line (e.g. year)' },
    { path: p + 'note', label: 'Meta note', type: 'textarea' },
    { path: p + 'image', label: 'Main image', type: 'image' },
    { path: p + 'imageAlt', label: 'Image alt text' },
    { path: p + 'overviewTitle', label: 'Overview heading' },
    { path: p + 'overview', label: 'Overview text', type: 'textarea' },
    { path: p + 'deliverablesLabel', label: 'Deliverables heading' },
    { path: p + 'deliverables', label: 'Deliverables (one per line)', type: 'stringlist' },
    { path: p + 'pdfTitle', label: 'PDF section heading' },
    { path: p + 'pdfBody', label: 'PDF section text', type: 'textarea' },
    { path: p + 'pdfStatus', label: 'PDF status badge (shown when no PDF URL)' },
    { path: p + 'pdfUrl', label: 'PDF URL (shows a "View PDF" button when set)' },
  ];
}

let data = null;
let dirty = false;
let stylesData = { overrides: {} };
let stylesDirty = false;

const $ = (s, el) => (el || document).querySelector(s);
const statusEl = $('#status');
const saveBtn = $('#saveBtn');

const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
function set(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] = o[k] || {}), data);
  target[last] = value;
  markDirty();
}

function markDirty() {
  dirty = true;
  saveBtn.disabled = false;
  statusEl.textContent = 'Unsaved changes';
  statusEl.className = 'dirty';
}

function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.className = 'toast'), 2600);
}

function textInput(value, onInput, isArea) {
  const el = document.createElement(isArea ? 'textarea' : 'input');
  if (!isArea) el.type = 'text';
  el.value = value == null ? '' : value;
  el.addEventListener('input', () => onInput(el.value));
  return el;
}

function pushStylesPreview() {
  const f = document.getElementById('themeFrame');
  try {
    f.contentWindow.postMessage({ type: 'ploy-styles-preview', overrides: stylesData.overrides }, window.WEBSITE_ORIGIN);
  } catch (e) {}
}
window.pushStylesPreview = pushStylesPreview;

// Font/size/color override editor for one piece of site text, stored in
// styles.json under the text's content path.
function styleRow(key) {
  const box = document.createElement('div');
  box.className = 'stylerow';
  const cur = () => stylesData.overrides[key] || {};
  const setO = (patch) => {
    const next = Object.assign({}, stylesData.overrides[key] || {}, patch);
    Object.keys(next).forEach((k) => { if (next[k] === '' || next[k] === 0 || next[k] == null) delete next[k]; });
    if (Object.keys(next).length) stylesData.overrides[key] = next;
    else delete stylesData.overrides[key];
    stylesDirty = true;
    markDirty();
    pushStylesPreview();
  };

  const sel = document.createElement('select');
  [{ id: '', label: 'Default font' }].concat(window.PloyTheme ? window.PloyTheme.FONT_OPTIONS : []).forEach((f) => {
    const op = document.createElement('option');
    op.value = f.id;
    op.textContent = f.label;
    if ((cur().font || '') === f.id) op.selected = true;
    sel.append(op);
  });
  const custom = document.createElement('input');
  custom.type = 'text';
  custom.placeholder = 'e.g. "Roboto", sans-serif';
  custom.value = cur().fontCustom || '';
  custom.style.display = cur().font === 'custom' ? '' : 'none';
  sel.addEventListener('change', () => {
    custom.style.display = sel.value === 'custom' ? '' : 'none';
    setO({ font: sel.value });
  });
  custom.addEventListener('input', () => setO({ fontCustom: custom.value }));

  const size = document.createElement('input');
  size.type = 'number';
  size.min = 8;
  size.max = 200;
  size.placeholder = 'Size px';
  size.title = 'Font size in px (empty = default)';
  size.value = cur().size || '';
  size.addEventListener('input', () => setO({ size: parseFloat(size.value) || 0 }));

  const colRow = document.createElement('div');
  colRow.className = 'row';
  colRow.style.marginBottom = '0';
  const sw = document.createElement('input');
  sw.type = 'color';
  sw.style.flex = 'none';
  sw.value = /^#[0-9a-fA-F]{6}$/.test(cur().color || '') ? cur().color : '#000000';
  const hx = document.createElement('input');
  hx.type = 'text';
  hx.placeholder = 'Color (empty = default)';
  hx.value = cur().color || '';
  sw.addEventListener('input', () => { hx.value = sw.value; setO({ color: sw.value }); });
  hx.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hx.value)) sw.value = hx.value;
    setO({ color: hx.value });
  });
  const clr = document.createElement('button');
  clr.type = 'button';
  clr.className = 'btn-sm';
  clr.textContent = 'Clear';
  clr.title = 'Remove all style overrides for this text';
  clr.addEventListener('click', () => {
    delete stylesData.overrides[key];
    stylesDirty = true;
    markDirty();
    pushStylesPreview();
    sel.value = '';
    custom.value = '';
    custom.style.display = 'none';
    size.value = '';
    hx.value = '';
  });
  colRow.append(sw, hx, clr);

  const r1 = document.createElement('div');
  r1.className = 'row';
  r1.append(sel, size);
  box.append(r1, custom, colRow);
  return box;
}

function fieldWrap(labelText, control, styleKey) {
  const w = document.createElement('div');
  w.className = 'field';
  const l = document.createElement('label');
  l.textContent = labelText;
  w.append(l);
  if (styleKey) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aa-btn';
    btn.textContent = 'Aa';
    btn.title = 'Font, size & color for this text';
    if (stylesData.overrides[styleKey]) btn.classList.add('on');
    l.style.display = 'flex';
    l.style.alignItems = 'center';
    l.append(btn);
    const row = styleRow(styleKey);
    row.style.display = stylesData.overrides[styleKey] ? '' : 'none';
    btn.addEventListener('click', () => {
      const show = row.style.display === 'none';
      row.style.display = show ? '' : 'none';
      btn.classList.toggle('on', show || !!stylesData.overrides[styleKey]);
    });
    w.append(row);
  }
  w.append(control);
  return w;
}

function imageControl(value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'imgfield';
  const thumbwrap = document.createElement('div');
  thumbwrap.className = 'thumbwrap';
  const img = document.createElement('img');
  img.className = 'thumb';
  img.src = value || '';
  img.onerror = () => { img.style.visibility = 'hidden'; };
  img.onload = () => { img.style.visibility = 'visible'; };
  thumbwrap.append(img);

  const grow = document.createElement('div');
  grow.className = 'grow';
  const input = textInput(value, (v) => { onChange(v); img.src = v; });

  const uploadrow = document.createElement('div');
  uploadrow.className = 'uploadrow';
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.webp,.png,.jpg,.jpeg,.gif,.svg';
  file.style.display = 'none';
  const btn = document.createElement('button');
  btn.className = 'btn-sm';
  btn.textContent = 'Upload image…';
  btn.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    btn.textContent = 'Uploading…';
    try {
      const dataBase64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const resp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name, dataBase64 }),
      });
      const out = await resp.json();
      if (!resp.ok) throw new Error(out.error || 'Upload failed');
      input.value = out.path;
      img.src = out.path;
      onChange(out.path);
      toast('Image uploaded: ' + out.path);
    } catch (e) {
      toast('Upload failed: ' + e.message, true);
    }
    btn.textContent = 'Upload image…';
    file.value = '';
  });
  uploadrow.append(btn, file);
  grow.append(input, uploadrow);
  wrap.append(thumbwrap, grow);
  return wrap;
}

function renderItemFields(container, arr, idx, itemSchema, rerender, basePath) {
  itemSchema.forEach((f) => {
    let control;
    let styleKey = null;
    if (f.type === 'image') {
      control = imageControl(arr[idx][f.key], (v) => { arr[idx][f.key] = v; markDirty(); });
    } else {
      control = textInput(arr[idx][f.key], (v) => { arr[idx][f.key] = v; markDirty(); }, f.type === 'textarea');
      if (basePath) styleKey = basePath + '.' + idx + '.' + f.key;
    }
    container.append(fieldWrap(f.label, control, styleKey));
  });
}

function listControl(field) {
  const outer = document.createElement('div');
  const arr = get(field.path) || [];

  function rerender() {
    outer.innerHTML = '';
    arr.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'list-item';
      const tools = document.createElement('div');
      tools.className = 'itemtools';
      const mk = (txt, title, fn, cls) => {
        const b = document.createElement('button');
        b.textContent = txt;
        b.title = title;
        if (cls) b.className = cls;
        b.addEventListener('click', () => { fn(); markDirty(); rerender(); });
        return b;
      };
      tools.append(
        mk('↑', 'Move up', () => { if (idx > 0) arr.splice(idx - 1, 0, arr.splice(idx, 1)[0]); }),
        mk('↓', 'Move down', () => { if (idx < arr.length - 1) arr.splice(idx + 1, 0, arr.splice(idx, 1)[0]); }),
        mk('✕', 'Remove', () => { if (confirm('Remove this ' + (field.itemLabel || 'item') + '?')) arr.splice(idx, 1); }, 'del'),
      );
      card.append(tools);
      renderItemFields(card, arr, idx, field.item, rerender, field.path);
      outer.append(card);
    });
    const add = document.createElement('button');
    add.className = 'addbtn';
    add.textContent = '+ Add ' + (field.itemLabel || 'item');
    add.addEventListener('click', () => {
      const blank = {};
      field.item.forEach((f) => (blank[f.key] = ''));
      arr.push(blank);
      markDirty();
      rerender();
    });
    outer.append(add);
  }
  rerender();
  return outer;
}

function buildEditor() {
  const editor = $('#editor');
  const toc = $('#toc');
  editor.innerHTML = '';
  toc.innerHTML = '';

  SCHEMA.forEach((section) => {
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.id = 'sec-' + section.id;
    const h = document.createElement('h2');
    h.textContent = section.title;
    panel.append(h);
    if (section.hint) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = section.hint;
      panel.append(p);
    }

    section.fields.forEach((field) => {
      if (field.type === 'list') {
        panel.append(fieldWrap(field.label, listControl(field)));
      } else if (field.type === 'stringlist') {
        const area = textInput((get(field.path) || []).join('\n'), (v) => {
          set(field.path, v.split('\n').map((s) => s.trim()).filter(Boolean));
        }, true);
        panel.append(fieldWrap(field.label, area));
      } else if (field.type === 'image') {
        panel.append(fieldWrap(field.label, imageControl(get(field.path), (v) => set(field.path, v))));
      } else {
        panel.append(fieldWrap(field.label, textInput(get(field.path), (v) => set(field.path, v), field.type === 'textarea'), field.path));
      }
    });

    editor.append(panel);

    const link = document.createElement('a');
    link.href = '#sec-' + section.id;
    link.textContent = section.title;
    toc.append(link);
  });

  // highlight toc while scrolling
  const links = Array.from(toc.querySelectorAll('a'));
  const panels = Array.from(editor.querySelectorAll('section.panel'));
  const onScroll = () => {
    let active = 0;
    panels.forEach((p, i) => { if (p.getBoundingClientRect().top < 140) active = i; });
    links.forEach((l, i) => l.classList.toggle('active', i === active));
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

async function save() {
  if (!dirty) return;
  saveBtn.disabled = true;
  statusEl.textContent = 'Saving…';
  try {
    const resp = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const out = await resp.json();
    if (!resp.ok) throw new Error(out.error || 'Save failed');
    if (stylesDirty) {
      const r2 = await fetch('/api/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stylesData),
      });
      if (!r2.ok) throw new Error('Text styles save failed');
      stylesDirty = false;
    }
    dirty = false;
    statusEl.textContent = 'All changes saved';
    statusEl.className = 'saved';
    toast('Saved. Reload any open site tab to see it.');
  } catch (e) {
    saveBtn.disabled = false;
    statusEl.textContent = 'Save failed';
    statusEl.className = 'dirty';
    toast('Save failed: ' + e.message, true);
  }
}

saveBtn.addEventListener('click', save);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
});
window.addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });

(async function init() {
  try {
    const [resp, stylesResp] = await Promise.all([
      fetch('/api/content', { cache: 'no-store' }),
      fetch('/api/styles', { cache: 'no-store' }),
    ]);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    data = await resp.json();
    if (stylesResp.ok) stylesData = await stylesResp.json();
    if (!stylesData.overrides) stylesData.overrides = {};
    buildEditor();
    statusEl.textContent = 'All changes saved';
    statusEl.className = 'saved';
  } catch (e) {
    statusEl.textContent = 'Could not load content';
    toast('Run this through server.js (node server.js), not as a plain file.', true);
  }
})();
