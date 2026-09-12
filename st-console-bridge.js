/**
 * Mirror Mobile / phone-extension logs into the main SillyTavern console.
 * Load this file FIRST from index.js so later modules inherit the hook.
 *
 * What it does:
 * - Forwards console.log/info/warn/error/debug to window.top.console
 *   (the ST page you have DevTools on)
 * - Keeps a 300-line ring buffer: window.mobileLogBuffer
 * - Dump with window.dumpMobileLogs() or the "Phone logs" dock
 * - Errors also hit toastr when ST has it
 *
 * Toggle dock: localStorage.MOBILE_SHOW_LOG_DOCK = "1"
 * Mute dock:   localStorage.MOBILE_SHOW_LOG_DOCK = "0"
 */
(function installMobileStConsoleBridge() {
  if (window.__mobileStConsoleBridgeInstalled) {
    return;
  }
  window.__mobileStConsoleBridgeInstalled = true;

  const PREFIXES = [
    '[Mobile',
    '[Live App]',
    '[Watch Live',
    '[Parallel Events',
    '[Friends Circle',
    '[Message',
    '[Context',
    '[Forum',
    '[Weibo',
    '[Custom API',
    '[Style Config',
    '[Test]',
    '[Debug Loader]',
  ];

  const buffer = [];
  const MAX = 300;
  window.mobileLogBuffer = buffer;

  function pickTargetConsole() {
    try {
      if (window.top && window.top !== window && window.top.console) {
        return window.top.console;
      }
    } catch (_) {
      /* cross-origin iframe */
    }
    try {
      if (window.parent && window.parent !== window && window.parent.console) {
        return window.parent.console;
      }
    } catch (_) {
      /* isolated */
    }
    return window.console;
  }

  const target = pickTargetConsole();
  const sameConsole = target === window.console;

  function isMobileLog(args) {
    const first = args && args.length ? args[0] : '';
    if (typeof first === 'string') {
      if (PREFIXES.some(p => first.indexOf(p) !== -1)) return true;
    }
    try {
      const stack = new Error().stack || '';
      if (/third-party\/mobile|mobile-phone|live-app|watch-live|message-app|parallel-events|context-monitor|custom-api-config/i.test(stack)) {
        return true;
      }
    } catch (_) {
      /* ignore */
    }
    return false;
  }

  function stamp(level, args) {
    const time = new Date().toISOString().slice(11, 23);
    let text = '';
    try {
      text = args
        .map(a => {
          if (typeof a === 'string') return a;
          if (a instanceof Error) return a.stack || a.message;
          try {
            return JSON.stringify(a);
          } catch (_) {
            return String(a);
          }
        })
        .join(' ');
    } catch (_) {
      text = String(args);
    }
    buffer.push({ t: time, level, text });
    if (buffer.length > MAX) buffer.shift();
    appendDock(level, time, text);
    if (level === 'error' && window.toastr && typeof window.toastr.error === 'function') {
      try {
        window.toastr.error(text.slice(0, 240), 'Phone');
      } catch (_) {
        /* ignore */
      }
    }
  }

  function wrap(level) {
    const localOrig = window.console[level] ? window.console[level].bind(window.console) : window.console.log.bind(window.console);
    const targetFn = target[level] ? target[level].bind(target) : target.log.bind(target);
    window.console[level] = function mobileStConsoleWrapped() {
      const args = Array.prototype.slice.call(arguments);
      try {
        localOrig.apply(window.console, args);
      } catch (_) {
        /* ignore */
      }
      if (!sameConsole && isMobileLog(args)) {
        try {
          targetFn.apply(target, args);
        } catch (_) {
          /* ignore */
        }
      }
      if (isMobileLog(args)) {
        stamp(level, args);
      }
    };
  }

  ['log', 'info', 'warn', 'error', 'debug'].forEach(wrap);

  window.dumpMobileLogs = function dumpMobileLogs() {
    const lines = buffer.map(e => `[${e.t}] ${e.level.toUpperCase()} ${e.text}`);
    const blob = lines.join('\n');
    try {
      pickTargetConsole().log('%c[Mobile] last ' + buffer.length + ' log lines', 'color:#7dd3fc;font-weight:bold');
      pickTargetConsole().log(blob);
    } catch (_) {
      window.console.log(blob);
    }
    return blob;
  };

  window.clearMobileLogs = function clearMobileLogs() {
    buffer.length = 0;
    const pre = document.getElementById('mobile-st-log-pre');
    if (pre) pre.textContent = '';
  };

  function appendDock(level, time, text) {
    const pre = document.getElementById('mobile-st-log-pre');
    if (!pre) return;
    const line = document.createElement('div');
    line.className = 'mobile-st-log-' + level;
    line.textContent = '[' + time + '] ' + text;
    pre.appendChild(line);
    while (pre.childNodes.length > MAX) {
      pre.removeChild(pre.firstChild);
    }
    pre.scrollTop = pre.scrollHeight;
  }

  function ensureDock() {
    if (document.getElementById('mobile-st-log-dock')) return;
    const show = localStorage.getItem('MOBILE_SHOW_LOG_DOCK');
    if (show === '0') return;

    const dock = document.createElement('div');
    dock.id = 'mobile-st-log-dock';
    dock.innerHTML =
      '<div id="mobile-st-log-bar">' +
      '<span>Phone → ST console</span>' +
      '<span style="flex:1"></span>' +
      '<button type="button" id="mobile-st-log-dump">Dump</button>' +
      '<button type="button" id="mobile-st-log-clear">Clear</button>' +
      '<button type="button" id="mobile-st-log-hide">Hide</button>' +
      '</div>' +
      '<div id="mobile-st-log-pre"></div>';
    const style = document.createElement('style');
    style.textContent =
      '#mobile-st-log-dock{position:fixed;right:8px;bottom:8px;z-index:2147483000;width:min(420px,92vw);max-height:36vh;display:flex;flex-direction:column;background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:8px;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 8px 24px rgba(0,0,0,.4)}' +
      '#mobile-st-log-bar{display:flex;align-items:center;gap:6px;padding:6px 8px;background:#1f2937;border-bottom:1px solid #374151;font-weight:600}' +
      '#mobile-st-log-bar button{background:#374151;color:#fff;border:0;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px}' +
      '#mobile-st-log-pre{overflow:auto;padding:6px 8px;max-height:28vh;white-space:pre-wrap;word-break:break-word}' +
      '#mobile-st-log-pre .mobile-st-log-error{color:#f87171}' +
      '#mobile-st-log-pre .mobile-st-log-warn{color:#fbbf24}' +
      '#mobile-st-log-pre .mobile-st-log-info{color:#93c5fd}' +
      '#mobile-st-log-pre .mobile-st-log-debug{color:#9ca3af}';
    document.documentElement.appendChild(style);
    document.documentElement.appendChild(dock);
    document.getElementById('mobile-st-log-dump').onclick = function () {
      window.dumpMobileLogs();
    };
    document.getElementById('mobile-st-log-clear').onclick = function () {
      window.clearMobileLogs();
    };
    document.getElementById('mobile-st-log-hide').onclick = function () {
      localStorage.setItem('MOBILE_SHOW_LOG_DOCK', '0');
      dock.remove();
    };
  }

  if (document.body) {
    ensureDock();
  } else {
    document.addEventListener('DOMContentLoaded', ensureDock);
  }

  try {
    target.log('%c[Mobile] console bridge on — phone logs mirror to this ST console', 'color:#38bdf8;font-weight:bold');
  } catch (_) {
    window.console.log('[Mobile] console bridge on');
  }
})();
