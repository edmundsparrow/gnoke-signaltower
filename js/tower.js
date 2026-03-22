/**
 * tower.js — Gnoke SignalTower
 * TYPE C tool module. Owns all signal tower logic:
 *   - Light segment control
 *   - Mode management (emergency / warning / normal / off)
 *   - Pattern engine (timed sequences)
 *   - Audio beep (Web Audio API)
 *   - Haptic feedback (Vibration API)
 *   - Hardware output (Device Torch via MediaDevices)
 *   - Settings persistence to localStorage
 *
 * Public API:
 *   Tower.init()                    → boot, load settings, wire nothing
 *   Tower.setMode(mode)             → 'emergency' | 'warning' | 'normal' | 'off'
 *   Tower.runPattern(name)          → run a named pattern
 *   Tower.clearAll()                → stop interval, turn off all lights
 *   Tower.updateHardware()          → called when hw-mode select changes
 *   Tower.requestTorch()            → request camera for torch access
 *   Tower.saveSetting(key, value)   → persist a setting to localStorage
 *   Tower.loadSettings()            → apply persisted settings to DOM inputs
 */

const Tower = (() => {

  const SETTINGS_KEY = 'gnoke_signaltower_settings';

  /* ── Internal state ─────────────────────────────────────── */
  let _interval  = null;
  let _torchTrack = null;
  let _audioCtx  = null;

  /* DOM references — populated in init() */
  let _lights   = {};   /* control page segments */
  let _circles  = {};   /* patterns page circles (mirror) */

  /* ── Helpers: settings persistence ─────────────────────── */

  function loadSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      if (s.flashRate   != null) { document.getElementById('flash-rate').value   = s.flashRate;   State.set('flashRate', s.flashRate); }
      if (s.strobeRate  != null) { document.getElementById('strobe-rate').value  = s.strobeRate;  State.set('strobeRate', s.strobeRate); }
      if (s.audioEnabled != null){ document.getElementById('audio-enable').checked = s.audioEnabled; State.set('audioEnabled', s.audioEnabled); }
      if (s.hapticEnabled!= null){ document.getElementById('haptic-enable').checked = s.hapticEnabled; State.set('hapticEnabled', s.hapticEnabled); }
      if (s.alarmFreq   != null) { document.getElementById('alarm-freq').value   = s.alarmFreq;   State.set('alarmFreq', s.alarmFreq); }
      if (s.hardwareMode!= null) { document.getElementById('hw-mode').value = s.hardwareMode;     State.set('hardwareMode', s.hardwareMode); }
    } catch (_) {}
  }

  function saveSetting(key, value) {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const s   = raw ? JSON.parse(raw) : {};
    s[key]    = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    State.set(key, value);
  }

  /* ── Light control ──────────────────────────────────────── */

  function _setLight(color, on) {
    const el = _lights[color];
    if (el) {
      if (on) el.classList.add('active');
      else { el.classList.remove('active'); el.style.opacity = ''; }
    }
    const ci = _circles[color];
    if (ci) {
      if (on) ci.classList.add('active');
      else { ci.classList.remove('active'); ci.style.opacity = ''; }
    }
    State.set('lights', { ...State.get('lights'), [color]: on });
  }

  function _setOpacity(color, val) {
    const el = _lights[color];
    if (el) { el.classList.add('active'); el.style.opacity = val; }
    const ci = _circles[color];
    if (ci) { ci.classList.add('active'); ci.style.opacity = val; }
  }

  function clearAll() {
    clearInterval(_interval);
    _interval = null;
    Object.keys(_lights).forEach(c => _setLight(c, false));
    _controlHardware(false);
    _clearPatternHighlight();
  }

  /* ── Audio ──────────────────────────────────────────────── */

  function _ensureAudio() {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume();
    }
    return _audioCtx;
  }

  function _beep() {
    if (!document.getElementById('audio-enable')?.checked) return;
    try {
      const ctx  = _ensureAudio();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = parseInt(document.getElementById('alarm-freq')?.value || 880);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  }

  /* ── Haptic ─────────────────────────────────────────────── */

  function _vibrate(pattern) {
    if (!document.getElementById('haptic-enable')?.checked) return;
    if (navigator.vibrate) navigator.vibrate(pattern || 40);
  }

  /* ── Hardware (torch) ───────────────────────────────────── */

  async function requestTorch() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      _torchTrack = stream.getVideoTracks()[0];
      _updateHWBadge('active');
      State.set('hardwareMode', 'torch');
      UI.toast('Torch connected.', 'ok');
    } catch (err) {
      _updateHWBadge('error');
      document.getElementById('hw-mode').value = 'none';
      UI.toast('Torch access denied.', 'err');
    }
  }

  async function _controlHardware(on) {
    const mode = document.getElementById('hw-mode')?.value;
    if (mode !== 'torch' || !_torchTrack) return;
    try {
      await _torchTrack.applyConstraints({ advanced: [{ torch: on }] });
    } catch (_) {}
  }

  function _updateHWBadge(state) {
    const dot   = document.getElementById('hw-dot');
    const label = document.getElementById('hw-label');
    if (!dot || !label) return;
    dot.className   = `hw-dot${state === 'error' ? ' error' : state === 'idle' ? ' idle' : ''}`;
    label.textContent = state === 'active' ? 'Torch On'
                      : state === 'error'  ? 'Error'
                      : state === 'idle'   ? 'Simulation'
                      : 'Simulation';
  }

  function updateHardware() {
    const mode = document.getElementById('hw-mode')?.value;
    saveSetting('hardwareMode', mode);

    if (mode === 'torch') {
      UI.openModal('torch-modal');
    } else {
      if (_torchTrack) { _torchTrack.stop(); _torchTrack = null; }
      _updateHWBadge('idle');
      UI.toast('Hardware: Simulation mode.', 'info');
    }
  }

  /* ── Pattern active-button highlight ────────────────────── */

  function _highlightPattern(patternId) {
    document.querySelectorAll('.pattern-btn').forEach(b => {
      b.classList.toggle('is-active', b.dataset.pattern === patternId);
    });
    State.set('currentPattern', patternId);
  }

  function _clearPatternHighlight() {
    document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('is-active'));
    State.set('currentPattern', null);
  }

  /* ── Mode control ───────────────────────────────────────── */

  function setMode(mode) {
    clearAll();
    State.set('currentMode', mode);
    _vibrate(50);

    switch (mode) {
      case 'emergency':
        _runPattern('flash-red');
        break;
      case 'warning':
        _runPattern('blink-amber');
        break;
      case 'normal':
        _setLight('green', true);
        _controlHardware(true);
        break;
      case 'off':
      default:
        break;
    }

    /* Update mode display + button highlights in app.js via state listener */
  }

  /* ── Pattern engine ─────────────────────────────────────── */

  function runPattern(name) {
    clearAll();
    _highlightPattern(name);
    _runPattern(name);
    /* switch to patterns page context-info is handled by app.js */
  }

  function _runPattern(name) {
    const flashRate  = parseInt(document.getElementById('flash-rate')?.value  || 200);
    const strobeRate = parseInt(document.getElementById('strobe-rate')?.value || 100);

    switch (name) {

      /* ── Emergency ── */
      case 'flash-red':
        _interval = setInterval(() => {
          const on = !_lights.red?.classList.contains('active');
          _setLight('red', on);
          if (on) { _beep(); _controlHardware(true); }
          else _controlHardware(false);
        }, flashRate);
        break;

      case 'strobe-red':
        _interval = setInterval(() => {
          _setLight('red', true);
          _controlHardware(true);
          setTimeout(() => { _setLight('red', false); _controlHardware(false); }, 45);
        }, strobeRate);
        break;

      case 'pulse-red': {
        let v = 0, dir = 1;
        _lights.red?.classList.add('active');
        _interval = setInterval(() => {
          v += dir * 0.08;
          if (v >= 1) { v = 1; dir = -1; }
          if (v <= 0) { v = 0; dir = 1; }
          _setOpacity('red', v);
          _controlHardware(v > 0.5);
        }, 40);
        break;
      }

      /* ── Warning ── */
      case 'blink-amber':
        _interval = setInterval(() => {
          const on = !_lights.amber?.classList.contains('active');
          _setLight('amber', on);
          _controlHardware(on);
        }, 600);
        break;

      case 'double-amber': {
        let phase = 0;
        _interval = setInterval(() => {
          if (phase === 0 || phase === 2) {
            _setLight('amber', true); _controlHardware(true);
          } else if (phase === 1 || phase === 3) {
            _setLight('amber', false); _controlHardware(false);
          }
          phase = (phase + 1) % 6; /* 0–3 double flash, 4–5 long gap */
        }, 180);
        break;
      }

      case 'fade-amber': {
        let v = 0, dir = 1;
        _lights.amber?.classList.add('active');
        _interval = setInterval(() => {
          v += dir * 0.05;
          if (v >= 1) { v = 1; dir = -1; }
          if (v <= 0) { v = 0; dir = 1; }
          _setOpacity('amber', v);
          _controlHardware(v > 0.5);
        }, 28);
        break;
      }

      /* ── Operational ── */
      case 'chase-up': {
        const seq = ['green', 'amber', 'red'];
        let i = 0;
        _interval = setInterval(() => {
          Object.keys(_lights).forEach(c => _setLight(c, false));
          _setLight(seq[i], true); _controlHardware(true);
          i = (i + 1) % seq.length;
        }, 380);
        break;
      }

      case 'chase-down': {
        const seq = ['red', 'amber', 'green'];
        let i = 0;
        _interval = setInterval(() => {
          Object.keys(_lights).forEach(c => _setLight(c, false));
          _setLight(seq[i], true); _controlHardware(true);
          i = (i + 1) % seq.length;
        }, 380);
        break;
      }

      case 'alternate':
        _interval = setInterval(() => {
          const redOn = _lights.red?.classList.contains('active');
          _setLight('red',   !redOn);
          _setLight('green',  redOn);
          _setLight('amber', false);
          _controlHardware(true);
        }, 480);
        break;

      case 'cycle-all': {
        const seq = ['red', 'amber', 'green'];
        let i = 0;
        _interval = setInterval(() => {
          Object.keys(_lights).forEach(c => _setLight(c, false));
          _setLight(seq[i], true); _controlHardware(true);
          i = (i + 1) % seq.length;
        }, 700);
        break;
      }

      /* ── Status ── */
      case 'steady-green':
        _setLight('green', true); _controlHardware(true);
        break;

      case 'heartbeat':
        _interval = setInterval(() => {
          _setLight('green', true); _controlHardware(true);
          setTimeout(() => { _setLight('green', false); _controlHardware(false); }, 100);
          setTimeout(() => {
            _setLight('green', true); _controlHardware(true);
            setTimeout(() => { _setLight('green', false); _controlHardware(false); }, 100);
          }, 250);
        }, 1600);
        break;

      case 'all-test': {
        const seq = ['red', 'amber', 'green'];
        let i = 0;
        _interval = setInterval(() => {
          Object.keys(_lights).forEach(c => _setLight(c, false));
          if (i < seq.length) {
            _setLight(seq[i], true); _controlHardware(true);
          } else {
            _controlHardware(false);
          }
          i = (i + 1) % (seq.length + 1);
        }, 500);
        break;
      }
    }
  }

  /* ── Init ───────────────────────────────────────────────── */

  function init() {
    _lights = {
      red:   document.getElementById('l-red'),
      amber: document.getElementById('l-amber'),
      green: document.getElementById('l-green'),
    };
    _circles = {
      red:   document.getElementById('p-red'),
      amber: document.getElementById('p-amber'),
      green: document.getElementById('p-green'),
    };
    loadSettings();
    _updateHWBadge('idle');
  }

  return {
    init,
    setMode,
    runPattern,
    clearAll,
    updateHardware,
    requestTorch,
    saveSetting,
    loadSettings,
  };

})();
