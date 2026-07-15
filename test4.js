
/* ==================== APPEARANCE / THEME ==================== */
(function () {
  const DEFAULT_THEME = {
    colors: { background: '#f4f1ec', surface: '#e9e6e0', ink: '#090706', onDark: '#ffffff', accent: '#89221c', bg: '#f5f1ea', headerBg: '#171412', footerBg: '#171412' },
    fonts: { headingPreset: 'playfair', headingCustom: '', bodyPreset: 'inter', bodyCustom: '' },
  };
  const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  let theme = null;
  let themeDirty = false;

  const themeStatus = document.getElementById('themeStatus');
  const themeSaveBtn = document.getElementById('themeSaveBtn');
  const themeResetBtn = document.getElementById('themeResetBtn');
  const controls = document.getElementById('appearanceControls');
  const frame = document.getElementById('themeFrame');

  function markThemeDirty() {
    themeDirty = true;
    themeSaveBtn.disabled = false;
    themeStatus.textContent = 'Unsaved changes';
    themeStatus.className = 'dirty';
  }

  function applyToPreview() {
    if (!theme) return;
    try {
      frame.contentWindow.postMessage({ type: 'ploy-theme-preview', theme: theme }, window.WEBSITE_ORIGIN);
    } catch (e) {}
  }

  function colorRow(label, key, hint) {
    const wrap = document.createElement('div');
    wrap.className = 'colorfield';
    const l = document.createElement('label');
    l.textContent = label;
    if (hint) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.style.cssText = 'margin:0 0 6px;font-size:12px';
      p.textContent = hint;
      wrap.append(l, p);
    } else {
      wrap.append(l);
    }
    const row = document.createElement('div');
    row.className = 'colorfield__row';
    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.value = HEX_RE.test(theme.colors[key] || '') ? theme.colors[key].slice(0, 7) : '#000000';
    const hex = document.createElement('input');
    hex.type = 'text';
    hex.value = theme.colors[key] || '';
    function commit(v) {
      theme.colors[key] = v;
      if (HEX_RE.test(v)) swatch.value = v;
      markThemeDirty();
      applyToPreview();
    }
    swatch.addEventListener('input', () => { hex.value = swatch.value; commit(swatch.value); });
    hex.addEventListener('input', () => commit(hex.value));
    row.append(swatch, hex);
    wrap.append(row);
    return wrap;
  }

  function fontRow(label, presetKey, customKey) {
    const wrap = document.createElement('div');
    wrap.className = 'fontfield';
    const l = document.createElement('label');
    l.textContent = label;
    const select = document.createElement('select');
    window.PloyTheme.FONT_OPTIONS.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.label;
      if (theme.fonts[presetKey] === o.id) opt.selected = true;
      select.append(opt);
    });
    const custom = document.createElement('input');
    custom.type = 'text';
    custom.placeholder = 'e.g. "Roboto", sans-serif';
    custom.value = theme.fonts[customKey] || '';
    custom.style.display = theme.fonts[presetKey] === 'custom' ? '' : 'none';
    select.addEventListener('change', () => {
      theme.fonts[presetKey] = select.value;
      custom.style.display = select.value === 'custom' ? '' : 'none';
      markThemeDirty();
      applyToPreview();
    });
    custom.addEventListener('input', () => {
      theme.fonts[customKey] = custom.value;
      markThemeDirty();
      applyToPreview();
    });
    wrap.append(l, select, custom);
    return wrap;
  }

  function buildAppearanceForm() {
    controls.innerHTML = '';
    controls.append(
      colorRow('Page background', 'background'),
      colorRow('Card & panel background', 'surface'),
      colorRow('Ink — headings, body text, dark sections', 'ink'),
      colorRow('Text on dark sections', 'onDark'),
      colorRow('Accent', 'accent'),
      colorRow('Global Background', 'bg', 'Overall page background color.'),
      colorRow('Header Background', 'headerBg'),
      colorRow('Footer Background', 'footerBg'),
      fontRow('Heading font', 'headingPreset', 'headingCustom'),
      fontRow('Body font', 'bodyPreset', 'bodyCustom'),
    );
  }

  // Page bar is now built dynamically — see the Sections editor script below.
  // We just wire frame load here.
  frame.addEventListener('load', applyToPreview);

  themeResetBtn.addEventListener('click', () => {
    theme = JSON.parse(JSON.stringify(DEFAULT_THEME));
    buildAppearanceForm();
    markThemeDirty();
    applyToPreview();
  });

  async function saveTheme() {
    if (!themeDirty) return;
    const badColor = Object.entries(theme.colors).find(([, v]) => !HEX_RE.test(v || ''));
    if (badColor) {
      themeStatus.textContent = 'Fix invalid color value before saving';
      themeStatus.className = 'dirty';
      return;
    }
    themeSaveBtn.disabled = true;
    themeStatus.textContent = 'Saving…';
    try {
      const resp = await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme),
      });
      const out = await resp.json();
      if (!resp.ok) throw new Error(out.error || 'Save failed');
      themeDirty = false;
      themeStatus.textContent = 'All changes saved';
      themeStatus.className = 'saved';
    } catch (e) {
      themeSaveBtn.disabled = false;
      themeStatus.textContent = 'Save failed';
      themeStatus.className = 'dirty';
    }
  }
  themeSaveBtn.addEventListener('click', saveTheme);
  window.addEventListener('beforeunload', (e) => { if (themeDirty) e.preventDefault(); });

  (async function initTheme() {
    try {
      const resp = await fetch('/api/theme', { cache: 'no-store' });
      theme = resp.ok ? await resp.json() : JSON.parse(JSON.stringify(DEFAULT_THEME));
    } catch (e) {
      theme = JSON.parse(JSON.stringify(DEFAULT_THEME));
    }
    buildAppearanceForm();
    themeStatus.textContent = 'All changes saved';
    themeStatus.className = 'saved';
    applyToPreview();
  })();
})();
