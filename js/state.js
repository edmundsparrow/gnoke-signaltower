/**
 * state.js — Gnoke SignalTower
 * Single source of truth for all runtime state.
 * No DOM. No DB. Just plain data + helpers.
 */

const State = (() => {

  const DEFAULTS = {
    /* Navigation */
    activePage: 'main-page',

    /* Tower state */
    currentMode:    'off',       /* 'off' | 'emergency' | 'warning' | 'normal' */
    currentPattern: null,        /* pattern id string or null */
    lights: { red: false, amber: false, green: false },

    /* Settings (persisted to localStorage) */
    flashRate:     200,
    strobeRate:    100,
    audioEnabled:  false,
    hapticEnabled: true,
    alarmFreq:     880,
    hardwareMode:  'none',       /* 'none' | 'torch' */
  };

  let _state    = { ...DEFAULTS };
  const _listeners = {};

  function get(key) {
    return _state[key];
  }

  function set(key, value) {
    _state[key] = value;
    (_listeners[key] || []).forEach(fn => fn(value));
  }

  function on(key, callback) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(callback);
  }

  function reset() {
    _state = { ...DEFAULTS };
  }

  return { get, set, on, reset, DEFAULTS };

})();
