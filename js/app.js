/**
 * app.js — Gnoke SignalTower
 * Bootstrap. Runs after ALL other scripts are loaded.
 * Owns: DOMContentLoaded init, page routing, event wiring, UI sync.
 * This is the ONLY file that wires DOM events.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Init shared modules ─────────────────────────────── */
  Theme.init();
  UI.init();
  Tower.init();

  /* ── 2. About tech table ────────────────────────────────── */
  renderAboutTech([
    ['Hardware',    'Device Torch (optional)'],
    ['Patterns',    '12 timed sequences'],
    ['Persistence', 'localStorage'],
    ['Network',     'None required'],
    ['Stack',       'HTML · CSS · Vanilla JS'],
    ['Version',     'v1.0'],
  ]);

  /* ── 3. Initial state ───────────────────────────────────── */
  Tower.setMode('off');
  loadPage('main-page');


  /* ══════════════════════════════════════════════════════════
     PAGE ROUTING
  ═══════════════════════════════════════════════════════════ */

  function loadPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
    State.set('activePage', pageId);

    /* Sync topbar menu button active state */
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    const menuMap = {
      'main-page':     'menu-control',
      'patterns-page': 'menu-patterns',
      'config-page':   'menu-config',
    };
    const activeMenuId = menuMap[pageId];
    if (activeMenuId) document.getElementById(activeMenuId)?.classList.add('active');

    /* Sync drawer button active state */
    document.querySelectorAll('.drawer-btn').forEach(b => b.classList.remove('active'));
    const drawerMap = {
      'main-page':     'drawer-control',
      'patterns-page': 'drawer-patterns',
      'config-page':   'drawer-config',
    };
    const activeDrawerId = drawerMap[pageId];
    if (activeDrawerId) document.getElementById(activeDrawerId)?.classList.add('active');

    /* Update context-info */
    document.getElementById('context-info').textContent = '';
  }

  /* Expose globally for inline onclick attributes */
  window.loadPage = loadPage;


  /* ══════════════════════════════════════════════════════════
     MODE UI SYNC
     Called whenever the mode changes to update the display
     and mode button highlight states.
  ═══════════════════════════════════════════════════════════ */

  function updateModeUI(mode) {
    const modeText = document.getElementById('mode-text');
    if (!modeText) return;

    const labels = {
      emergency: 'Emergency',
      warning:   'Warning',
      normal:    'Normal',
      off:       'Standby',
    };
    modeText.textContent = labels[mode] || 'Standby';
    modeText.className   = `mode-value ${mode === 'off' ? '' : mode}`;

    /* Highlight active mode button */
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.mode === mode);
    });
  }

  /* Expose globally so tower.js patterns page Stop btn can call it */
  window.updateModeUI = updateModeUI;

  /* Expose runPattern globally for inline pattern-btn onclick */
  window.runPattern = (name) => {
    Tower.runPattern(name);
    updateModeUI('off'); /* patterns don't map to a mode */
  };

  /* Watch state changes → sync UI */
  State.on('currentMode', updateModeUI);


  /* ══════════════════════════════════════════════════════════
     MOBILE DRAWER
  ═══════════════════════════════════════════════════════════ */

  const Drawer = (() => {
    const panel   = () => document.getElementById('drawer');
    const overlay = () => document.getElementById('drawer-overlay');

    function open() {
      panel()?.classList.add('open');
      overlay()?.classList.add('open');
    }
    function close() {
      panel()?.classList.remove('open');
      overlay()?.classList.remove('open');
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        close();
        /* Also stop patterns on Escape */
        Tower.clearAll();
        updateModeUI('off');
      }
    });

    document.getElementById('hamburger')?.addEventListener('click', open);
    document.getElementById('drawer-close')?.addEventListener('click', close);
    document.getElementById('drawer-overlay')?.addEventListener('click', close);

    return { open, close };
  })();

  window.Drawer = Drawer;


  /* ══════════════════════════════════════════════════════════
     KEYBOARD SHORTCUTS
  ═══════════════════════════════════════════════════════════ */
  document.addEventListener('keydown', e => {
    /* Only fire if not in an input */
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    switch (e.key) {
      case '1': Tower.setMode('emergency'); updateModeUI('emergency'); loadPage('main-page'); break;
      case '2': Tower.setMode('warning');   updateModeUI('warning');   loadPage('main-page'); break;
      case '3': Tower.setMode('normal');    updateModeUI('normal');    loadPage('main-page'); break;
      case '0': Tower.setMode('off');       updateModeUI('off');       loadPage('main-page'); break;
    }
  });

  /* ══════════════════════════════════════════════════════════
     INTERCEPT Tower.setMode to also sync mode UI
  ═══════════════════════════════════════════════════════════ */
  const _originalSetMode = Tower.setMode.bind(Tower);
  Tower.setMode = (mode) => {
    _originalSetMode(mode);
    updateModeUI(mode);
  };

});


/* ──────────────────────────────────────────────────────────
   renderAboutTech — populates the ⚙️ Under The Hood table.
──────────────────────────────────────────────────────────── */
function renderAboutTech(rows) {
  const tbody = document.getElementById('about-tech-table');
  if (!tbody) return;
  tbody.innerHTML = rows.map(([k, v]) => `
    <tr>
      <td>${k}</td>
      <td>${v}</td>
    </tr>`).join('');
}
