// ==SillyTavern Extension==
// @name         Mobile Context Monitor with Upload & Editor & Custom API & MesID Floor Monitor
// @version      2.3.0
// @description  Mobile plugin that monitors SillyTavern context in real time, with file upload, context editor, Custom API config, and MesID floor monitor v2.3 (SillyTavern.getContext() API integration)
// @author       Assistant
// @license      MIT

// Phone log dock + ST console mirror (inline so it works without a second file)
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
 * Hide lasts this page load only. Refresh shows the dock again.
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
    // Do not toastr console.error — ST treats those as blocking banners.
    // Errors stay in the dock + F12 console.
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
    if (window.__mobileStLogDockHidden) return;
    const host = document.body || document.documentElement;
    if (!host) return;

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
    host.appendChild(style);
    host.appendChild(dock);
    document.getElementById('mobile-st-log-dump').onclick = function () {
      window.dumpMobileLogs();
    };
    document.getElementById('mobile-st-log-clear').onclick = function () {
      window.clearMobileLogs();
    };
    document.getElementById('mobile-st-log-hide').onclick = function () {
      window.__mobileStLogDockHidden = true;
      dock.remove();
    };
  }

  function bootDock() {
    ensureDock();
    if (!document.getElementById('mobile-st-log-dock') && !window.__mobileStLogDockHidden) {
      setTimeout(bootDock, 1000);
    }
  }
  if (document.body) bootDock();
  else document.addEventListener('DOMContentLoaded', bootDock);
  setInterval(() => {
    if (!window.__mobileStLogDockHidden && !document.getElementById('mobile-st-log-dock')) {
      ensureDock();
    }
  }, 3000);

  try {
    target.log('%c[Mobile] console bridge on — phone logs mirror to this ST console', 'color:#38bdf8;font-weight:bold');
  } catch (_) {
    window.console.log('[Mobile] console bridge on');
  }
})();

// Also load the standalone file if present (no-op if already installed)
(function loadStConsoleBridge() {
  const s = document.createElement('script');
  s.src = './scripts/extensions/third-party/mobile/st-console-bridge.js';
  s.onerror = function () { /* inline copy already ran */ };
  document.head.appendChild(s);
})();

// Optimization: load performance config and optimized loader first
const performanceScript = document.createElement('script');
performanceScript.src = './scripts/extensions/third-party/mobile/performance-config.js';
performanceScript.onload = () => {
  console.log('[Mobile Context] Performance config loaded');

  // Load optimized loader
  const optimizedLoaderScript = document.createElement('script');
  optimizedLoaderScript.src = './scripts/extensions/third-party/mobile/optimized-loader.js';
  optimizedLoaderScript.onload = () => {
    console.log('[Mobile Context] Optimized loader loaded');

    // Load performance tester
    const performanceTestScript = document.createElement('script');
    performanceTestScript.src = './scripts/extensions/third-party/mobile/performance-test.js';
    performanceTestScript.onload = () => {
      console.log('[Mobile Context] Performance tester loaded');

      // Load diagnostic tool
      const diagnosticScript = document.createElement('script');
      diagnosticScript.src = './scripts/extensions/third-party/mobile/diagnostic-tool.js';
      diagnosticScript.onload = () => {
        console.log('[Mobile Context] Diagnostic tool loaded');
        // Start optimized load flow
        initOptimizedLoading();
      };
      diagnosticScript.onerror = () => {
        console.warn('[Mobile Context] Diagnostic tool failed to load, continuing init');
        initOptimizedLoading();
      };
      document.head.appendChild(diagnosticScript);
    };
    performanceTestScript.onerror = () => {
      console.warn('[Mobile Context] Performance tester failed to load, continuing init');
      initOptimizedLoading();
    };
    document.head.appendChild(performanceTestScript);
  };
  document.head.appendChild(optimizedLoaderScript);
};
document.head.appendChild(performanceScript);

// Optimization: parallel load instead of sequential
async function initOptimizedLoading() {
  try {
    const loader = window.optimizedLoader;

    // Define core modules (high priority)
    const coreModules = [
      {
        src: './scripts/extensions/third-party/mobile/context-monitor.js',
        name: 'context-monitor',
        priority: 'high',
        required: true,
      },
      {
        src: './scripts/extensions/third-party/mobile/mobile-upload.js',
        name: 'mobile-upload',
        priority: 'high',
        required: true,
      },
      {
        src: './scripts/extensions/third-party/mobile/mobile-phone.js',
        name: 'mobile-phone',
        priority: 'high',
        required: true,
      },
    ];

    // Define extension modules (medium priority)
    const extensionModules = [
      {
        src: './scripts/extensions/third-party/mobile/context-editor.js',
        name: 'context-editor',
        priority: 'medium',
        required: false,
      },
      {
        src: './scripts/extensions/third-party/mobile/custom-api-config.js',
        name: 'custom-api-config',
        priority: 'medium',
        required: false,
      },
      {
        src: './scripts/extensions/third-party/mobile/mesid-floor-monitor.js',
        name: 'mesid-floor-monitor',
        priority: 'medium',
        required: false,
      },
      {
        src: './scripts/extensions/third-party/mobile/app/weibo-app/weibo-manager.js',
        name: 'weibo-manager',
        priority: 'medium',
        required: false,
      },
      {
        src: './scripts/extensions/third-party/mobile/app/forum-app/forum-manager.js',
        name: 'forum-manager',
        priority: 'medium',
        required: false,
      },
      {
        src: './scripts/extensions/third-party/mobile/app/weibo-app/weibo-auto-listener.js',
        name: 'weibo-auto-listener',
        priority: 'low',
        required: false,
      },
      {
        src: './scripts/extensions/third-party/mobile/app/forum-app/forum-auto-listener.js',
        name: 'forum-auto-listener',
        priority: 'low',
        required: false,
      },
    ];

    // Optimization: load core modules in parallel
    console.log('[Mobile Context] Starting parallel load of core modules...');
    await loader.loadScriptsParallel(coreModules);

    // Defer loading extension modules
    setTimeout(() => {
      console.log('[Mobile Context] Starting extension module load...');
      loader.loadScriptsParallel(extensionModules);
    }, 1000);

    console.log('[Mobile Context] Optimized load flow complete');
  } catch (error) {
    console.error('[Mobile Context] Optimized load failed, falling back to legacy load:', error);
    // Fall back to legacy load
    fallbackToTraditionalLoading();
  }
}

// Fall back to legacy load
function fallbackToTraditionalLoading() {
  console.log('[Mobile Context] Using legacy load...');

  // Import context monitor
  const contextScript = document.createElement('script');
  contextScript.src = './scripts/extensions/third-party/mobile/context-monitor.js';
  contextScript.onload = () => {
    console.log('[Mobile Context] Context monitor loaded');
  };
  document.head.appendChild(contextScript);

  // Load mobile upload manager
  const uploadScript = document.createElement('script');
  uploadScript.src = './scripts/extensions/third-party/mobile/mobile-upload.js';
  uploadScript.onload = () => {
    console.log('[Mobile Context] Mobile upload manager loaded');
    // Check whether upload manager was created
    setTimeout(() => {
      if (window.mobileUploadManager) {
        console.log('[Mobile Context] ✅ Mobile upload manager created');
      } else {
        console.error('[Mobile Context] ❌ Mobile upload manager create failed');
      }
    }, 100);
  };
  uploadScript.onerror = () => {
    console.error('[Mobile Context] Mobile upload manager failed to load');
  };
  document.head.appendChild(uploadScript);

  // Load performance tester (legacy)
  const performanceTestScript = document.createElement('script');
  performanceTestScript.src = './scripts/extensions/third-party/mobile/performance-test.js';
  performanceTestScript.onload = () => {
    console.log('[Mobile Context] Performance tester loaded (legacy)');

    // Load diagnostic tool (legacy)
    const diagnosticScript = document.createElement('script');
    diagnosticScript.src = './scripts/extensions/third-party/mobile/diagnostic-tool.js';
    diagnosticScript.onload = () => {
      console.log('[Mobile Context] Diagnostic tool loaded (legacy)');
    };
    diagnosticScript.onerror = () => {
      console.warn('[Mobile Context] Diagnostic tool failed to load (legacy)');
    };
    document.head.appendChild(diagnosticScript);
  };
  performanceTestScript.onerror = () => {
    console.warn('[Mobile Context] Performance tester failed to load (legacy)');
  };
  document.head.appendChild(performanceTestScript);
}

// Load mobile context editor
const contextEditorScript = document.createElement('script');
contextEditorScript.src = './scripts/extensions/third-party/mobile/context-editor.js';
contextEditorScript.onload = () => {
  console.log('[Mobile Context] Mobile context editor loaded');
  // Check whether context editor was created
  setTimeout(() => {
    if (window.mobileContextEditor) {
      console.log('[Mobile Context] ✅ Mobile context editor created');
    } else {
      console.error('[Mobile Context] ❌ Mobile context editor create failed');
    }
  }, 100);
};
contextEditorScript.onerror = () => {
  console.error('[Mobile Context] Mobile context editor failed to load');
};
document.head.appendChild(contextEditorScript);

// Load Custom API config module
const customAPIScript = document.createElement('script');
customAPIScript.src = './scripts/extensions/third-party/mobile/custom-api-config.js';
customAPIScript.onload = () => {
  console.log('[Mobile Context] Custom API config module loaded');
  setTimeout(() => {
    if (window.mobileCustomAPIConfig || window.MobileCustomAPIConfig) {
      console.log('[Mobile Context] Custom API config module created');
    } else {
      console.warn('[Mobile Context] Custom API config instance not ready yet');
    }
  }, 500);
};
customAPIScript.onerror = () => {
  console.error('[Mobile Context] Custom API config module failed to load');
};
document.head.appendChild(customAPIScript);

// Load MesID floor monitor module
const mesidFloorScript = document.createElement('script');
mesidFloorScript.src = './scripts/extensions/third-party/mobile/mesid-floor-monitor.js';
mesidFloorScript.onload = () => {
  console.log('[Mobile Context] MesID floor monitor module loaded');
  // Check whether floor monitor was created
  setTimeout(() => {
    if (window.mesidFloorMonitor) {
      console.log('[Mobile Context] ✅ MesID floor monitor created');
    } else {
      console.error('[Mobile Context] ❌ MesID floor monitor create failed');
    }
  }, 100);
};
mesidFloorScript.onerror = () => {
  console.error('[Mobile Context] MesID floor monitor module failed to load');
};
document.head.appendChild(mesidFloorScript);

// Load Weibo feature modules
// 1. Load Weibo manager
const weiboManagerScript = document.createElement('script');
weiboManagerScript.src = './scripts/extensions/third-party/mobile/app/weibo-app/weibo-manager.js';
weiboManagerScript.onload = () => {
  console.log('[Mobile Context] Weibo manager loaded');
  // Check whether Weibo manager was created
  setTimeout(() => {
    if (window.weiboManager) {
      console.log('[Mobile Context] ✅ Weibo manager created');
    } else {
      console.error('[Mobile Context] ❌ Weibo manager create failed');
    }
  }, 100);
};
weiboManagerScript.onerror = () => {
  console.error('[Mobile Context] Weibo manager failed to load');
};
document.head.appendChild(weiboManagerScript);

// 2. Load Weibo auto-listener
const weiboAutoListenerScript = document.createElement('script');
weiboAutoListenerScript.src = './scripts/extensions/third-party/mobile/app/weibo-app/weibo-auto-listener.js';
weiboAutoListenerScript.onload = () => {
  console.log('[Mobile Context] Weibo auto-listener loaded');
  // Check whether Weibo auto-listener was created
  setTimeout(() => {
    if (window.weiboAutoListener) {
      console.log('[Mobile Context] ✅ Weibo auto-listener created');
    } else {
      console.error('[Mobile Context] ❌ Weibo auto-listener create failed');
    }
  }, 100);
};
weiboAutoListenerScript.onerror = () => {
  console.error('[Mobile Context] Weibo auto-listener failed to load');
};
document.head.appendChild(weiboAutoListenerScript);

// Load forum feature modules
// 1. Load forum manager first
const forumManagerScript = document.createElement('script');
forumManagerScript.src = './scripts/extensions/third-party/mobile/app/forum-app/forum-manager.js';
forumManagerScript.onload = () => {
  console.log('[Mobile Context] Forum manager loaded');
  // Check whether forum manager was created
  setTimeout(() => {
    if (window.forumManager) {
      console.log('[Mobile Context] ✅ Forum manager created');
    } else {
      console.error('[Mobile Context] ❌ Forum manager create failed');
    }
  }, 100);
};
forumManagerScript.onerror = () => {
  console.error('[Mobile Context] Forum manager failed to load');
};
document.head.appendChild(forumManagerScript);

// 2. Load forum style definitions
const forumStylesScript = document.createElement('script');
forumStylesScript.src = './scripts/extensions/third-party/mobile/app/forum-app/forum-styles.js';
forumStylesScript.onload = () => {
  console.log('[Mobile Context] Forum styles module loaded');
  // Check whether forum styles were created
  setTimeout(() => {
    if (window.forumStyles) {
      console.log('[Mobile Context] ✅ Forum styles module created');
    } else {
      console.error('[Mobile Context] ❌ Forum styles module create failed');
    }
  }, 100);
};
forumStylesScript.onerror = () => {
  console.error('[Mobile Context] Forum styles module failed to load');
};
document.head.appendChild(forumStylesScript);

// 3. Load forum auto-listener
const forumAutoListenerScript = document.createElement('script');
forumAutoListenerScript.src = './scripts/extensions/third-party/mobile/app/forum-app/forum-auto-listener.js';
forumAutoListenerScript.onload = () => {
  console.log('[Mobile Context] Forum auto-listener loaded');
  // Check whether forum auto-listener was created
  setTimeout(() => {
    if (window.forumAutoListener) {
      console.log('[Mobile Context] ✅ Forum auto-listener created');
    } else {
      console.error('[Mobile Context] ❌ Forum auto-listener create failed');
    }
  }, 100);
};
forumAutoListenerScript.onerror = () => {
  console.error('[Mobile Context] Forum auto-listener failed to load');
};
document.head.appendChild(forumAutoListenerScript);

// Load phone UI stylesheet (styles first)
const phoneStyle = document.createElement('link');
phoneStyle.rel = 'stylesheet';
phoneStyle.type = 'text/css';
phoneStyle.href = './scripts/extensions/third-party/mobile/mobile-phone.css';
phoneStyle.onload = () => {
  console.log('[Mobile Context] Phone UI stylesheet loaded');
};
phoneStyle.onerror = () => {
  console.error('[Mobile Context] Phone UI stylesheet failed to load');
};
document.head.appendChild(phoneStyle);

// Load image-config modal stylesheet
const imageConfigStyle = document.createElement('link');
imageConfigStyle.rel = 'stylesheet';
imageConfigStyle.type = 'text/css';
imageConfigStyle.href = './scripts/extensions/third-party/mobile/app/image-config-modal.css';
imageConfigStyle.onload = () => {
  console.log('[Mobile Context] Image-config modal stylesheet loaded');
};
imageConfigStyle.onerror = () => {
  console.error('[Mobile Context] Image-config modal stylesheet failed to load');
};
document.head.appendChild(imageConfigStyle);

// Load phone UI script (after styles)
const phoneScript = document.createElement('script');
phoneScript.src = './scripts/extensions/third-party/mobile/mobile-phone.js';
phoneScript.onload = () => {
  console.log('[Mobile Context] Phone UI script loaded');
  // Check whether the button was created
  setTimeout(() => {
    const trigger = document.getElementById('mobile-phone-trigger');
    if (trigger) {
      console.log('[Mobile Context] ✅ Phone button created');
      // Add upload button to phone UI
      addUploadButtonToMobilePhone();
      // Apply phone visibility setting
      updatePhoneVisibility();
    } else {
      console.error('[Mobile Context] ❌ Phone button create failed');
    }
  }, 100);
};
phoneScript.onerror = () => {
  console.error('[Mobile Context] Phone UI script failed to load');
};
document.head.appendChild(phoneScript);

// Load voice-message handler script
const voiceMessageScript = document.createElement('script');
voiceMessageScript.src = './scripts/extensions/third-party/mobile/app/voice-message-handler.js';
voiceMessageScript.onload = () => {
  console.log('[Mobile Context] Voice-message handler loaded');
  // Check whether voice-message handler was created
  setTimeout(() => {
    if (window.voiceMessageHandler) {
      console.log('[Mobile Context] ✅ Voice-message handler created');
    } else {
      console.error('[Mobile Context] ❌ Voice-message handler create failed');
    }
  }, 100);
};
voiceMessageScript.onerror = () => {
  console.error('[Mobile Context] Voice-message handler failed to load');
};
document.head.appendChild(voiceMessageScript);

// Load image-config modal script
const imageConfigScript = document.createElement('script');
imageConfigScript.src = './scripts/extensions/third-party/mobile/app/image-config-modal.js';
imageConfigScript.onload = () => {
  console.log('[Mobile Context] Image-config modal loaded');
  // Check whether image-config modal was created
  setTimeout(() => {
    if (window.ImageConfigModal) {
      console.log('[Mobile Context] ✅ Image-config modal created');
    } else {
      console.error('[Mobile Context] ❌ Image-config modal create failed');
    }
  }, 100);
};
imageConfigScript.onerror = () => {
  console.error('[Mobile Context] Image-config modal failed to load');
};
document.head.appendChild(imageConfigScript);

// Init after page load
jQuery(async () => {
  // Wait for SillyTavern to fully load
  if (!window.SillyTavern) {
    console.log('[Mobile Context] Waiting for SillyTavern to start...');
    const waitForST = setInterval(() => {
      if (window.SillyTavern) {
        clearInterval(waitForST);
        initMobileContextPlugin();
      }
    }, 1000);
  } else {
    initMobileContextPlugin();
  }
});

// Globals
let contextMonitor = null;
let isInitialized = false;

// Default settings
const defaultSettings = {
  enabled: true,
  monitorChat: true,
  monitorCharacter: true,
  monitorEvents: true,
  logLevel: 'info',
  maxLogEntries: 100,
  historyLimit: 50,
  monitorInterval: 3000,
  enableEventLogging: true,
  enableContextLogging: true,
  enableAutoSave: false,
  // Upload feature settings
  uploadEnabled: true,
  maxUploadSize: 50 * 1024 * 1024, // 50MB
  showUploadNotifications: true,
  // Context editor settings
  contextEditorEnabled: true,
  // Custom API config settings
  customAPIEnabled: true,
  showAPIConfigButton: true,
  // MesID floor monitor settings
  mesidFloorEnabled: true,
  floorSelector: '.message',
  enableFloorNotifications: true,
  // Forum manager settings
  forumEnabled: true,
  forumAutoUpdate: true,
  forumThreshold: 10,
  forumStyle: 'Tieba Bro',
  // Phone interaction settings
  tavernCompatibilityMode: true,
  hidePhone: false,
  // Block story text setting
  disableBodyText: false,
};

// Plugin settings — merged into SillyTavern extension_settings on init
let extension_settings = {
  mobile_context: { ...defaultSettings },
};

// Wait for ContextMonitor class
function waitForContextMonitor() {
  return new Promise(resolve => {
    if (window.ContextMonitor) {
      resolve();
    } else {
      const checkInterval = setInterval(() => {
        if (window.ContextMonitor) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    }
  });
}

// Wait for all modules
function waitForAllModules() {
  return new Promise(resolve => {
    const checkModules = () => {
      const contextEditorReady = window.mobileContextEditor !== undefined;
      const customAPIReady = window.mobileCustomAPIConfig !== undefined;
      const uploadManagerReady = window.mobileUploadManager !== undefined;
      const mesidFloorReady = window.mesidFloorMonitor !== undefined;
      const forumStylesReady = window.forumStyles !== undefined;
      const forumAutoListenerReady = window.forumAutoListener !== undefined;
      const forumManagerReady = window.forumManager !== undefined;
      const voiceMessageReady = window.voiceMessageHandler !== undefined;

      console.log('[Mobile Context] Module load status:', {
        contextEditor: contextEditorReady,
        customAPI: customAPIReady,
        uploadManager: uploadManagerReady,
        mesidFloor: mesidFloorReady,
        forumStyles: forumStylesReady,
        forumAutoListener: forumAutoListenerReady,
        forumManager: forumManagerReady,
        voiceMessage: voiceMessageReady,
      });

      if (
        contextEditorReady &&
        customAPIReady &&
        uploadManagerReady &&
        mesidFloorReady &&
        forumStylesReady &&
        forumAutoListenerReady &&
        forumUIReady &&
        forumManagerReady &&
        voiceMessageReady
      ) {
        console.log('[Mobile Context] ✅ All modules loaded');
        resolve();
      } else {
        // Keep waiting
        setTimeout(checkModules, 200);
      }
    };

    // Start checking
    checkModules();
  });
}

/**
 * Main plugin init
 */
async function initMobileContextPlugin() {
  try {
    // Integrate SillyTavern extension_settings
    const context = SillyTavern.getContext();
    if (!context.extensionSettings.mobile_context) {
      context.extensionSettings.mobile_context = { ...defaultSettings };
      context.saveSettingsDebounced();
    } else {
      // Merge defaults so new keys exist
      for (const key of Object.keys(defaultSettings)) {
        if (context.extensionSettings.mobile_context[key] === undefined) {
          context.extensionSettings.mobile_context[key] = defaultSettings[key];
        }
      }
      context.saveSettingsDebounced();
    }

    // Use SillyTavern extension_settings
    extension_settings = context.extensionSettings;

    // Wait for ContextMonitor class
    await waitForContextMonitor();

    // Init context monitor
    contextMonitor = new window.ContextMonitor(extension_settings.mobile_context);

    // Create settings UI
    createSettingsUI();

    // Register console commands after all modules load
    await waitForAllModules();

    // Register console commands
    registerConsoleCommands();

    // Start monitoring
    if (extension_settings.mobile_context.enabled) {
      contextMonitor.start();
    }

    // Init upload feature
    if (extension_settings.mobile_context.uploadEnabled) {
      initUploadFeature();
    }

    // Init floor monitor
    if (extension_settings.mobile_context.mesidFloorEnabled) {
      initMesIDFloorMonitor();
    }

    // Init forum features
    initForumFeatures();

    // Init Weibo features
    initWeiboFeatures();

    // Apply phone visibility setting
    updatePhoneVisibility();

    isInitialized = true;
    console.log(
      '[Mobile Context] v2.4 plugin loaded (upload, context editor, Custom API config, MesID floor monitor, and forum manager; SillyTavern.getContext() API integration)',
    );
  } catch (error) {
    console.error('[Mobile Context] Plugin init failed:', error);
  }
}

/**
 * Init upload feature
 */
function initUploadFeature() {
  try {
    // Listen for upload-complete events
    document.addEventListener('mobile-upload-complete', function (event) {
      const detail = event.detail;
      console.log('[Mobile Context] File upload complete:', detail);

      // Log upload event if context monitor exists
      if (contextMonitor && contextMonitor.log) {
        contextMonitor.log('info', `File upload: ${detail.originalFilename} (${(detail.size / 1024).toFixed(1)} KB)`);
      }
    });

    console.log('[Mobile Context] Upload feature initialized');
  } catch (error) {
    console.error('[Mobile Context] Upload feature init failed:', error);
  }
}

/**
 * Init MesID floor monitor
 */
function initMesIDFloorMonitor() {
  try {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not ready, waiting...');
      // Wait for floor monitor to load
      setTimeout(initMesIDFloorMonitor, 1000);
      return;
    }

    // Set floor selector
    if (extension_settings.mobile_context.floorSelector) {
      window.mesidFloorMonitor.setFloorSelector(extension_settings.mobile_context.floorSelector);
    }

    // If notifications are on, add default floor-change listeners
    if (extension_settings.mobile_context.enableFloorNotifications) {
      window.mesidFloorMonitor.addEventListener('onFloorAdded', function (data) {
        console.log(`[MesIDFloor monitor] 🟢 Floors added: ${data.oldCount} -> ${data.newCount} (+${data.change})`);
        if (contextMonitor && contextMonitor.log) {
          contextMonitor.log('info', `Floors added: ${data.oldCount} -> ${data.newCount} (+${data.change})`);
        }
      });

      window.mesidFloorMonitor.addEventListener('onFloorRemoved', function (data) {
        console.log(`[MesIDFloor monitor] 🔴 Floors removed: ${data.oldCount} -> ${data.newCount} (${data.change})`);
        if (contextMonitor && contextMonitor.log) {
          contextMonitor.log('info', `Floors removed: ${data.oldCount} -> ${data.newCount} (${data.change})`);
        }
      });
    }

    // Start listening
    window.mesidFloorMonitor.start();

    console.log('[Mobile Context] MesID floor monitor initialized');
  } catch (error) {
    console.error('[Mobile Context] MesID floor monitor init failed:', error);
  }
}

/**
 * Init forum features
 */
function initForumFeatures() {
  try {
    console.log('[Mobile Context] Starting forum feature init...');

    if (!window.forumManager) {
      console.warn('[Mobile Context] Forum manager not ready, waiting...');
      // Wait for forum manager to load
      setTimeout(initForumFeatures, 1000);
      return;
    }

    // Init forum manager
    window.forumManager
      .initialize()
      .then(() => {
        console.log('[Mobile Context] ✅ Forum manager initialized');

        // Start auto-listener if forum auto-update is on
        if (window.forumAutoListener) {
          window.forumAutoListener.start();
          console.log('[Mobile Context] ✅ Forum auto-listener started');
        }

        // Log init event
        if (contextMonitor && contextMonitor.log) {
          contextMonitor.log('info', 'Forum manager started');
        }
      })
      .catch(error => {
        console.error('[Mobile Context] Forum manager init failed:', error);
      });

    console.log('[Mobile Context] Forum features initialized');
  } catch (error) {
    console.error('[Mobile Context] Forum features init failed:', error);
  }
}

/**
 * Init Weibo features
 */
function initWeiboFeatures() {
  try {
    console.log('[Mobile Context] Starting Weibo feature init...');

    if (!window.weiboManager) {
      console.warn('[Mobile Context] Weibo manager not ready, waiting...');
      // Wait for Weibo manager to load
      setTimeout(initWeiboFeatures, 1000);
      return;
    }

    // Init Weibo manager
    window.weiboManager
      .initialize()
      .then(() => {
        console.log('[Mobile Context] ✅ Weibo manager initialized');

        // Start auto-listener if Weibo auto-update is on
        if (window.weiboAutoListener) {
          window.weiboAutoListener.start();
          console.log('[Mobile Context] ✅ Weibo auto-listener started');
        }

        // Log init event
        if (contextMonitor && contextMonitor.log) {
          contextMonitor.log('info', 'Weibo manager started');
        }
      })
      .catch(error => {
        console.error('[Mobile Context] Weibo manager init failed:', error);
      });

    console.log('[Mobile Context] Weibo features initialized');
  } catch (error) {
    console.error('[Mobile Context] Weibo features init failed:', error);
  }
}

/**
 * Add upload button to phone UI
 */
function addUploadButtonToMobilePhone() {
  // Wait for phone UI to finish loading
  setTimeout(() => {
    const phoneContainer = document.querySelector('.mobile-phone-container');
    if (phoneContainer) {
      // Create upload button
      const uploadButton = document.createElement('button');
      uploadButton.id = 'mobile-upload-trigger';
      uploadButton.className = 'mobile-upload-btn';
      uploadButton.innerHTML = '📁';
      uploadButton.title = 'Upload file';
      uploadButton.style.cssText = `
                position: fixed;
                bottom: 140px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
                color: white;
                border: none;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                z-index: 9998;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

      // Hover effect
      uploadButton.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.1)';
        this.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
      });

      uploadButton.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      });

      // Click handler
      uploadButton.addEventListener('click', function () {
        if (window.mobileUploadManager) {
          window.mobileUploadManager.toggleMobileUploadUI();
        } else {
          console.warn('[Mobile Context] Upload manager not ready');
        }
      });

      document.body.appendChild(uploadButton);
      console.log('[Mobile Context] ✅ Upload button added to phone UI');
    } else {
      console.warn('[Mobile Context] Phone UI container not found');
    }
  }, 500);
}

/**
 * Create settings UI
 */
function createSettingsUI() {
  const settingsHtml = `
    <div id="mobile_context_settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>External Phone</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="flex-container" style='flex-wrap: wrap;flex-direction: row;'>
                    <label class="checkbox_label" for="mobile_tavern_compatibility_mode">
                        <input id="mobile_tavern_compatibility_mode" type="checkbox" />
                        <span>Tavern page compatible with phone controls</span>
                    </label>
                    <label class="checkbox_label" for="mobile_hide_phone">
                        <input id="mobile_hide_phone" type="checkbox" />
                        <span>Hide phone button</span>
                    </label>
                    <label class="checkbox_label" for="mobile_auto_send_enabled">
                        <input id="mobile_auto_send_enabled" type="checkbox" />
                        <span>Exclusive mode (one chat at a time)</span>
                    </label>
                    <label class="checkbox_label" for="mobile_disable_body_text">
                        <input id="mobile_disable_body_text" type="checkbox" />
                        <span>Block story text</span>
                    </label>
                    <div class="flex m-t-1" style='flex-wrap: wrap;'>
                        <button id="mobile_context_status_btn" class="menu_button" style='width: auto;background:#777;color:#fff;display:none'>View status</button>
                        <button id="mobile_context_clear_btn" class="menu_button" style='width: auto;background:#777;color:#fff'>Clear logs</button>
                        <button id="mobile_custom_api_show_btn" class="menu_button" style='width: auto;background:#777;color:#fff'>Custom API config</button>
                        <button id="mobile_mesid_floor_status_btn" class="menu_button" style='width: auto;background:#777;color:#fff;display:none'>Floor monitor status</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

  $('#extensions_settings').append(settingsHtml);

  // Bind settings controls
  bindSettingsControls();

  // Bind style configurator
  bindStyleConfigControls();
}

/**
 * Bind style-configurator controls
 */
function bindStyleConfigControls() {
  console.log('[Mobile Extension] Bind style-configurator controls');

  // Bind style-configurator button
  $('#mobile_style_config_btn').on('click', function () {
    console.log('[Mobile Extension] Style configurator button clicked');
    const container = $('#mobile_style_config_app_container');

    if (container.is(':visible')) {
      // If already visible, hide it
      container.slideUp(300);
      $(this).text('🎨 Open style configurator');
    } else {
      // If hidden, show and load content
      if (typeof window.getStyleConfigAppContent === 'function') {
        try {
          const content = window.getStyleConfigAppContent();
          container.html(content);
          container.slideDown(300);
          $(this).text('🎨 Close style configurator');

          // Bind events
          setTimeout(() => {
            if (typeof window.bindStyleConfigEvents === 'function') {
              window.bindStyleConfigEvents();
              console.log('[Mobile Extension] Style configurator events bound');
            }
          }, 100);
        } catch (error) {
          console.error('[Mobile Extension] Failed to load style configurator:', error);
          toastr.error('Failed to load style configurator — check the console');
        }
      } else {
        console.error('[Mobile Extension] Style configurator not loaded');
        toastr.error('Style configurator not loaded — make sure the related files loaded');
      }
    }
  });
}

/**
 * Bind settings controls
 */
function bindSettingsControls() {
  // Enable/disable monitoring
  $('#mobile_context_enabled')
    .prop('checked', extension_settings.mobile_context.enabled)
    .on('change', function () {
      extension_settings.mobile_context.enabled = $(this).prop('checked');
      saveSettings();

      if (contextMonitor) {
        if (extension_settings.mobile_context.enabled) {
          contextMonitor.start();
        } else {
          contextMonitor.stop();
        }
      }
    });

  // Monitor chat changes
  $('#mobile_context_monitor_chat')
    .prop('checked', extension_settings.mobile_context.monitorChat)
    .on('change', function () {
      extension_settings.mobile_context.monitorChat = $(this).prop('checked');
      saveSettings();

      if (contextMonitor) {
        contextMonitor.updateSettings(extension_settings.mobile_context);
      }
    });

  // Monitor character changes
  $('#mobile_context_monitor_character')
    .prop('checked', extension_settings.mobile_context.monitorCharacter)
    .on('change', function () {
      extension_settings.mobile_context.monitorCharacter = $(this).prop('checked');
      saveSettings();

      if (contextMonitor) {
        contextMonitor.updateSettings(extension_settings.mobile_context);
      }
    });

  // Monitor system events
  $('#mobile_context_monitor_events')
    .prop('checked', extension_settings.mobile_context.monitorEvents)
    .on('change', function () {
      extension_settings.mobile_context.monitorEvents = $(this).prop('checked');
      saveSettings();

      if (contextMonitor) {
        contextMonitor.updateSettings(extension_settings.mobile_context);
      }
    });

  // Log level
  $('#mobile_context_log_level')
    .val(extension_settings.mobile_context.logLevel)
    .on('change', function () {
      extension_settings.mobile_context.logLevel = $(this).val();
      saveSettings();

      if (contextMonitor) {
        contextMonitor.updateSettings(extension_settings.mobile_context);
      }
    });

  // Max log entries
  $('#mobile_context_max_log_entries')
    .val(extension_settings.mobile_context.maxLogEntries)
    .on('change', function () {
      extension_settings.mobile_context.maxLogEntries = parseInt($(this).val());
      saveSettings();

      if (contextMonitor) {
        contextMonitor.updateSettings(extension_settings.mobile_context);
      }
    });

  // Enable/disable upload
  $('#mobile_upload_enabled')
    .prop('checked', extension_settings.mobile_context.uploadEnabled)
    .on('change', function () {
      extension_settings.mobile_context.uploadEnabled = $(this).prop('checked');
      saveSettings();

      // Toggle upload button visibility
      const uploadButton = document.getElementById('mobile-upload-trigger');
      if (uploadButton) {
        uploadButton.style.display = extension_settings.mobile_context.uploadEnabled ? 'flex' : 'none';
      }
    });

  // Enable/disable upload notifications
  $('#mobile_upload_notifications')
    .prop('checked', extension_settings.mobile_context.showUploadNotifications)
    .on('change', function () {
      extension_settings.mobile_context.showUploadNotifications = $(this).prop('checked');
      saveSettings();
    });

  // Enable/disable context editor
  $('#mobile_context_editor_enabled')
    .prop('checked', extension_settings.mobile_context.contextEditorEnabled)
    .on('change', function () {
      extension_settings.mobile_context.contextEditorEnabled = $(this).prop('checked');
      saveSettings();

      // Toggle context-editor button visibility
      const editorButton = document.getElementById('mobile-context-editor-btn');
      if (editorButton) {
        editorButton.style.display = extension_settings.mobile_context.contextEditorEnabled ? 'flex' : 'none';
      }
    });

  // Enable/disable Custom API config
  $('#mobile_custom_api_enabled')
    .prop('checked', extension_settings.mobile_context.customAPIEnabled)
    .on('change', function () {
      extension_settings.mobile_context.customAPIEnabled = $(this).prop('checked');
      saveSettings();

      // Toggle API-config button visibility
      const apiButton = document.getElementById('mobile-api-config-trigger');
      if (apiButton) {
        apiButton.style.display = extension_settings.mobile_context.customAPIEnabled ? 'flex' : 'none';
      }
    });

  // Show/hide API-config button
  $('#mobile_show_api_config_button')
    .prop('checked', extension_settings.mobile_context.showAPIConfigButton)
    .on('change', function () {
      extension_settings.mobile_context.showAPIConfigButton = $(this).prop('checked');
      saveSettings();

      // Toggle API-config button visibility
      const apiButton = document.getElementById('mobile-api-config-trigger');
      if (apiButton) {
        apiButton.style.display =
          extension_settings.mobile_context.customAPIEnabled && extension_settings.mobile_context.showAPIConfigButton
            ? 'flex'
            : 'none';
      }
    });

  // Tavern page compat mode
  $('#mobile_tavern_compatibility_mode')
    .prop('checked', extension_settings.mobile_context.tavernCompatibilityMode)
    .on('change', function () {
      extension_settings.mobile_context.tavernCompatibilityMode = $(this).prop('checked');
      saveSettings();

      // Apply pointer-events setting
      updatePointerEventsSettings();
    });

  // Hide phone button
  $('#mobile_hide_phone')
    .prop('checked', extension_settings.mobile_context.hidePhone)
    .on('change', function () {
      extension_settings.mobile_context.hidePhone = $(this).prop('checked');
      saveSettings();

      // Apply hide setting
      updatePhoneVisibility();
    });

  // Button events
  $('#mobile_context_status_btn').on('click', function () {
    if (contextMonitor) {
      contextMonitor.showStatus();
    }
  });

  $('#mobile_context_clear_btn').on('click', function () {
    if (contextMonitor) {
      contextMonitor.clearLogs();
    }
  });

  $('#mobile_upload_show_btn').on('click', function () {
    if (window.mobileUploadManager) {
      window.mobileUploadManager.showMobileUploadUI();
    } else {
      console.warn('[Mobile Context] Upload manager not ready');
    }
  });

  $('#mobile_context_editor_show_btn').on('click', function () {
    if (window.mobileContextEditor) {
      window.mobileContextEditor.showEditor();
    } else {
      console.warn('[Mobile Context] Context editor not ready');
    }
  });

  $('#mobile_custom_api_show_btn').on('click', function () {
    if (window.mobileCustomAPIConfig) {
      window.mobileCustomAPIConfig.showConfigPanel();
    } else {
      console.warn('[Mobile Context] Custom API config module not ready');
    }
  });

  // MesID floor monitor settings
  $('#mobile_mesid_floor_enabled')
    .prop('checked', extension_settings.mobile_context.mesidFloorEnabled)
    .on('change', function () {
      extension_settings.mobile_context.mesidFloorEnabled = $(this).prop('checked');
      saveSettings();

      if (window.mesidFloorMonitor) {
        if (extension_settings.mobile_context.mesidFloorEnabled) {
          window.mesidFloorMonitor.start();
        } else {
          window.mesidFloorMonitor.stop();
        }
      }
    });

  $('#mobile_enable_floor_notifications')
    .prop('checked', extension_settings.mobile_context.enableFloorNotifications)
    .on('change', function () {
      extension_settings.mobile_context.enableFloorNotifications = $(this).prop('checked');
      saveSettings();
    });

  $('#mobile_floor_selector')
    .val(extension_settings.mobile_context.floorSelector)
    .on('change', function () {
      extension_settings.mobile_context.floorSelector = $(this).val();
      saveSettings();

      if (window.mesidFloorMonitor) {
        window.mesidFloorMonitor.setFloorSelector(extension_settings.mobile_context.floorSelector);
      }
    });

  $('#mobile_mesid_floor_status_btn').on('click', function () {
    if (window.mesidFloorMonitor) {
      const status = window.mesidFloorMonitor.getStatus();
      const debugInfo = window.mesidFloorMonitor.getDebugInfo();
      console.log('[Mobile Context] MesIDFloor monitor status:', status);
      console.log('[Mobile Context] MesID floor monitor debug info:', debugInfo);
      alert(
        `MesIDFloor monitor status:\nMonitoring: ${status.isMonitoring}\nCurrent floors: ${status.currentFloorCount}\nPrevious floors: ${status.lastFloorCount}\nCallback count: ${status.callbacks.onFloorChanged}`,
      );
    } else {
      console.warn('[Mobile Context] MesID floor monitor not ready');
      alert('MesID floor monitor not ready');
    }
  });

  // Forum manager settings
  $('#mobile_forum_enabled')
    .prop('checked', extension_settings.mobile_context.forumEnabled)
    .on('change', function () {
      extension_settings.mobile_context.forumEnabled = $(this).prop('checked');
      saveSettings();

      // Toggle forum button visibility
      const forumButton = document.getElementById('mobile-forum-trigger');
      if (forumButton) {
        forumButton.style.display = extension_settings.mobile_context.forumEnabled ? 'flex' : 'none';
      }
    });

  $('#mobile_forum_auto_update')
    .prop('checked', extension_settings.mobile_context.forumAutoUpdate)
    .on('change', function () {
      extension_settings.mobile_context.forumAutoUpdate = $(this).prop('checked');
      saveSettings();

      if (window.forumManager) {
        window.forumManager.currentSettings.autoUpdate = extension_settings.mobile_context.forumAutoUpdate;
        window.forumManager.saveSettings();
      }
    });

  $('#mobile_forum_threshold')
    .val(extension_settings.mobile_context.forumThreshold)
    .on('change', function () {
      extension_settings.mobile_context.forumThreshold = parseInt($(this).val());
      saveSettings();

      if (window.forumManager) {
        window.forumManager.currentSettings.threshold = extension_settings.mobile_context.forumThreshold;
        window.forumManager.saveSettings();
      }
    });

  $('#mobile_forum_style')
    .val(extension_settings.mobile_context.forumStyle)
    .on('change', function () {
      extension_settings.mobile_context.forumStyle = $(this).val();
      saveSettings();

      if (window.forumManager) {
        window.forumManager.currentSettings.selectedStyle = extension_settings.mobile_context.forumStyle;
        window.forumManager.saveSettings();
      }
    });

  $('#mobile_forum_show_btn').on('click', function () {
    if (window.forumManager) {
      window.forumManager.showForumPanel();
    } else {
      console.warn('[Mobile Context] Forum manager not ready');
    }
  });

  $('#mobile_forum_generate_btn').on('click', function () {
    if (window.forumManager) {
      window.forumManager.generateForumContent();
    } else {
      console.warn('[Mobile Context] Forum manager not ready');
    }
  });

  // Enable/disable auto-send
  $('#mobile_auto_send_enabled')
    .prop('checked', getAutoSendEnabled())
    .on('change', function () {
      const enabled = $(this).prop('checked');
      setAutoSendEnabled(enabled);
      console.log('[Mobile Context] Auto-send is now', enabled ? 'enabled' : 'disabled');
    });

  // Enable/disable Block story text
  $('#mobile_disable_body_text')
    .prop('checked', extension_settings.mobile_context.disableBodyText)
    .on('change', function () {
      extension_settings.mobile_context.disableBodyText = $(this).prop('checked');
      saveSettings();
      console.log('[Mobile Context] Block story text is now', extension_settings.mobile_context.disableBodyText ? 'enabled' : 'disabled');
    });
}

/**
 * Get auto-send enabled state
 */
function getAutoSendEnabled() {
  if (window.messageSender && typeof window.messageSender.isDelayClickEnabled === 'function') {
    return window.messageSender.isDelayClickEnabled();
  }
  // If MessageSender is not ready, read localStorage directly
  try {
    const settings = localStorage.getItem('messageSenderSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      // Use delayClickEnabled when set; otherwise default true
      return parsed.delayClickEnabled === undefined ? true : parsed.delayClickEnabled;
    }
    return true; // Enabled by default
  } catch (error) {
    console.warn('[Mobile Context] Failed to read auto-send setting:', error);
    return true; // Enabled by default
  }
}

/**
 * Set auto-send enabled state
 */
function setAutoSendEnabled(enabled) {
  if (window.messageSender && typeof window.messageSender.setDelayClickEnabled === 'function') {
    window.messageSender.setDelayClickEnabled(enabled);
  } else {
    // If MessageSender is not ready, write localStorage directly
    try {
      let settings = {};
      const existing = localStorage.getItem('messageSenderSettings');
      if (existing) {
        settings = JSON.parse(existing);
      }
      settings.delayClickEnabled = enabled;
      localStorage.setItem('messageSenderSettings', JSON.stringify(settings));
      console.log('[Mobile Context] Auto-send setting saved:', enabled);
    } catch (error) {
      console.error('[Mobile Context] Failed to save auto-send setting:', error);
    }
  }
}

/**
 * Save settings
 */
function saveSettings() {
  try {
    const context = SillyTavern.getContext();
    if (context && context.saveSettingsDebounced) {
      context.saveSettingsDebounced();
    } else if (window.saveSettingsDebounced) {
      window.saveSettingsDebounced();
    }
  } catch (error) {
    console.warn('[Mobile Context] Failed to save settings:', error);
    // Fall back to legacy save
    if (window.saveSettingsDebounced) {
      window.saveSettingsDebounced();
    }
  }
}

/**
 * Register console commands
 */
function registerConsoleCommands() {
  // Register commands on the global object
  if (!window.MobileContext) {
    window.MobileContext = {};
  }

  // Get current context
  window.MobileContext.getContext = function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return null;
    }
    return contextMonitor.getCurrentContext();
  };

  // Get context history
  window.MobileContext.getHistory = function (limit = 10) {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return [];
    }
    return contextMonitor.getHistory(limit);
  };

  // Get stats
  window.MobileContext.getStats = function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return null;
    }
    return contextMonitor.getStats();
  };

  // Show status
  window.MobileContext.showStatus = function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return;
    }
    contextMonitor.showStatus();
  };

  // Start monitoring
  window.MobileContext.start = function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return;
    }
    contextMonitor.start();
  };

  // Stop monitoring
  window.MobileContext.stop = function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return;
    }
    contextMonitor.stop();
  };

  // Get current chat JSONL
  window.MobileContext.getChatJsonl = async function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return null;
    }
    return await contextMonitor.getCurrentChatJsonl();
  };

  // Get current chat messages
  window.MobileContext.getChatMessages = async function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return null;
    }
    return await contextMonitor.getCurrentChatMessages();
  };

  // Download current chat JSONL
  window.MobileContext.downloadChatJsonl = async function () {
    try {
      const chatData = await window.MobileContext.getChatJsonl();
      if (!chatData) {
        console.error('[Mobile Context] Cannot get chat data');
        return;
      }

      const blob = new Blob([chatData.jsonlData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chatData.chatId}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log(`[Mobile Context] Downloaded chat file: ${a.download}`);
    } catch (error) {
      console.error('[Mobile Context] Download failed:', error);
    }
  };

  // Set log level
  window.MobileContext.setLogLevel = function (level) {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return;
    }
    contextMonitor.setLogLevel(level);
  };

  // Clear logs
  window.MobileContext.clearLogs = function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return;
    }
    contextMonitor.clearLogs();
  };

  // ===========================================
  // Data extractor console commands
  // ===========================================

  // List extractor formats
  window.MobileContext.listFormats = function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return;
    }
    return contextMonitor.listExtractorFormats();
  };

  // Extract from current chat messages
  window.MobileContext.extractFromChat = async function (formatName) {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return null;
    }
    if (!formatName) {
      console.warn('[Mobile Context] Pass a format name; use MobileContext.listFormats() for available formats');
      return null;
    }
    return await contextMonitor.extractFromCurrentChat(formatName);
  };

  // Extract from current chat JSONL
  window.MobileContext.extractFromJsonl = async function (formatName) {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return null;
    }
    if (!formatName) {
      console.warn('[Mobile Context] Pass a format name; use MobileContext.listFormats() for available formats');
      return null;
    }
    return await contextMonitor.extractFromCurrentChatJsonl(formatName);
  };

  // Extract from text (manual test)
  window.MobileContext.extractFromText = function (text, formatName) {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return [];
    }
    if (!text || !formatName) {
      console.warn('[Mobile Context] Pass text and a format name');
      return [];
    }
    return contextMonitor.extractDataFromText(text, formatName);
  };

  // Add a custom extract format
  window.MobileContext.addFormat = function (name, regex, fields, description) {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return false;
    }
    if (!name || !regex || !fields) {
      console.warn('[Mobile Context] Usage: MobileContext.addFormat(name, regex, fields, description)');
      console.log(
        "Example: MobileContext.addFormat('test', /\\[test\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^\\]]*)\\]/g, ['character', 'number', 'type', 'content'], 'test format')",
      );
      return false;
    }

    const format = {
      regex: regex,
      fields: Array.isArray(fields) ? fields : [fields],
      description: description,
    };

    return contextMonitor.addExtractorFormat(name, format);
  };

  // Quick extract
  window.MobileContext.quickExtract = async function (formatName, useJsonl = false) {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return;
    }

    console.log(`[Mobile Context] Starting extract from ${useJsonl ? 'JSONL' : 'chat messages'} for format  ${formatName} ...`);

    const result = useJsonl
      ? await window.MobileContext.extractFromJsonl(formatName)
      : await window.MobileContext.extractFromChat(formatName);

    if (result && result.extractedCount > 0) {
      console.log(`[Mobile Context] Extract OK. Found ${result.extractedCount}  records`);
      console.log('Extract result:', result);
      return result;
    } else {
      console.log('[Mobile Context] No matching data');
      return null;
    }
  };

  // Debug — test chat data fetch
  window.MobileContext.debugChatData = async function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return;
    }

    console.group('=== Chat data debug ===');

    // Inspect SillyTavern context
    console.log('1. SillyTavern global:', window.SillyTavern);

    const context = window.SillyTavern?.getContext();
    console.log('2. SillyTavern context:', context);

    if (context) {
      console.log('3. Current chat ID:', context.getCurrentChatId?.());
      console.log('4. Character ID:', context.characterId);
      console.log('5. Group ID:', context.groupId);
      console.log('6. Characters array:', context.characters);

      if (context.characterId && context.characters) {
        const char = context.characters[context.characterId];
        console.log('7. Current character:', char);
      }
    }

    // Test globals
    console.log('8. Global chat var:', window.chat);
    console.log('9. Global this_chid var:', window.this_chid);
    console.log('10. Global characters var:', window.characters);

    // Test API call
    try {
      const chatData = await contextMonitor.getCurrentChatMessages();
      console.log('11. API call result:', chatData);
    } catch (error) {
      console.error('12. API call error:', error);
    }

    console.groupEnd();
  };

  // Debug JSONL contents
  window.MobileContext.debugJsonlData = async function () {
    if (!contextMonitor) {
      console.warn('[Mobile Context] Monitor not initialized');
      return;
    }

    console.group('=== JSONL data debug ===');

    try {
      const jsonlData = await contextMonitor.getCurrentChatJsonl();
      console.log('JSONL data:', jsonlData);

      if (jsonlData && jsonlData.lines) {
        console.log(`Line count: ${jsonlData.lines.length}`);
        jsonlData.lines.forEach((line, index) => {
          console.log(`Line ${index + 1}:`, line);
          try {
            const parsed = JSON.parse(line);
            console.log(`Parsed:`, parsed);
            if (parsed.mes) {
              console.log(`Message text: "${parsed.mes}"`);
              // Test extract
              const myResult = contextMonitor.extractDataFromText(parsed.mes, 'myMessage');
              const otherResult = contextMonitor.extractDataFromText(parsed.mes, 'otherMessage');
              const universalResult = contextMonitor.extractDataFromText(parsed.mes, 'universalMessage');
              if (myResult.length > 0) {
                console.log(`✅ Own-message match:`, myResult);
              }
              if (otherResult.length > 0) {
                console.log(`✅ Other-message match:`, otherResult);
              }
              if (universalResult.length > 0) {
                console.log(`✅ Universal-message match:`, universalResult);
              }
            }
          } catch (e) {
            console.error(`Failed to parse line ${index + 1}:`, e);
          }
          console.log('---');
        });
      }
    } catch (error) {
      console.error('Failed to get JSONL data:', error);
    }

    console.groupEnd();
  };

  // ===========================================
  // Context editor console commands
  // ===========================================

  // Show context editor
  window.MobileContext.showContextEditor = function () {
    if (window.mobileContextEditor && typeof window.mobileContextEditor.showEditor === 'function') {
      window.mobileContextEditor.showEditor();
    } else {
      console.warn('[Mobile Context] Context editor not initialized or method missing');
      console.log('[Mobile Context] Editor status:', {
        exists: !!window.mobileContextEditor,
        hasMethod: !!(window.mobileContextEditor && window.mobileContextEditor.showEditor),
      });
    }
  };

  // Force-start editor even if SillyTavern is not ready
  window.MobileContext.forceShowEditor = function () {
    if (window.mobileContextEditor) {
      const success = window.mobileContextEditor.forceInitialize();
      if (success) {
        console.log('[Mobile Context] ✅ Force-start editor succeeded');
      } else {
        console.error('[Mobile Context] ❌ Force-start editor failed');
      }
    } else {
      console.warn('[Mobile Context] Context editor not initialized');
    }
  };

  // Load current chat into editor (v2.0 API)
  window.MobileContext.loadChatToEditor = function () {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return null;
    }

    try {
      return window.mobileContextEditor.getCurrentChatData();
    } catch (error) {
      console.error('[Mobile Context] Failed to load chat data:', error);
      return null;
    }
  };

  // Modify message (v2.0 API)
  window.MobileContext.modifyMessage = async function (messageIndex, newContent, newName = null) {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return false;
    }
    try {
      return await window.mobileContextEditor.modifyMessage(messageIndex, newContent, newName);
    } catch (error) {
      console.error('[Mobile Context] Failed to modify message:', error);
      return false;
    }
  };

  // Add message (v2.0 API)
  window.MobileContext.addMessage = async function (content, isUser = false, name = null) {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return -1;
    }
    try {
      return await window.mobileContextEditor.addMessage(content, isUser, name);
    } catch (error) {
      console.error('[Mobile Context] Failed to add message:', error);
      return -1;
    }
  };

  // Delete message (v2.0 API)
  window.MobileContext.deleteMessage = async function (messageIndex) {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return null;
    }
    try {
      return await window.mobileContextEditor.deleteMessage(messageIndex);
    } catch (error) {
      console.error('[Mobile Context] Failed to delete message:', error);
      return null;
    }
  };

  // Save edited chat (v2.0 API)
  window.MobileContext.saveEditedChat = async function () {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return false;
    }
    try {
      return await window.mobileContextEditor.saveChatData();
    } catch (error) {
      console.error('[Mobile Context] Save failed:', error);
      return false;
    }
  };

  // Refresh chat UI (replaces reset)
  window.MobileContext.refreshChatDisplay = async function () {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return false;
    }
    try {
      return await window.mobileContextEditor.refreshChatDisplay();
    } catch (error) {
      console.error('[Mobile Context] Failed to refresh UI:', error);
      return false;
    }
  };

  // Export edited JSONL (v2.0 API)
  window.MobileContext.exportEditedJsonl = function () {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return null;
    }
    try {
      return window.mobileContextEditor.exportToJsonl();
    } catch (error) {
      console.error('[Mobile Context] Export failed:', error);
      return null;
    }
  };

  // Get editor stats (v2.0 API)
  window.MobileContext.getEditorStats = function () {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return null;
    }
    return window.mobileContextEditor.getStatistics();
  };

  // Debug SillyTavern status (v2.0 API)
  window.MobileContext.debugSillyTavernStatus = function () {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return null;
    }
    return window.mobileContextEditor.debugSillyTavernStatus();
  };

  // Wait for SillyTavern ready (v2.0 API)
  window.MobileContext.waitForSillyTavernReady = async function (timeout = 30000) {
    if (!window.mobileContextEditor) {
      console.warn('[Mobile Context] Context editor not initialized');
      return false;
    }
    return await window.mobileContextEditor.waitForSillyTavernReady(timeout);
  };

  // ===========================================
  // Custom API config console commands
  // ===========================================

  // Show API config panel
  window.MobileContext.showAPIConfig = function () {
    if (window.mobileCustomAPIConfig && typeof window.mobileCustomAPIConfig.showConfigPanel === 'function') {
      window.mobileCustomAPIConfig.showConfigPanel();
    } else {
      console.warn('[Mobile Context] Custom API config not initialized or method missing');
      console.log('[Mobile Context] API config status:', {
        exists: !!window.mobileCustomAPIConfig,
        hasMethod: !!(window.mobileCustomAPIConfig && window.mobileCustomAPIConfig.showConfigPanel),
      });
    }
  };

  // Get current API config
  window.MobileContext.getAPIConfig = function () {
    if (!window.mobileCustomAPIConfig) {
      console.warn('[Mobile Context] Custom API config module not initialized');
      return null;
    }
    return window.mobileCustomAPIConfig.getCurrentConfig();
  };

  // Check whether API is available
  window.MobileContext.isAPIAvailable = function () {
    if (!window.mobileCustomAPIConfig) {
      console.warn('[Mobile Context] Custom API config module not initialized');
      return false;
    }
    return window.mobileCustomAPIConfig.isAPIAvailable();
  };

  // Test API connection
  window.MobileContext.testAPIConnection = async function () {
    if (!window.mobileCustomAPIConfig) {
      console.warn('[Mobile Context] Custom API config module not initialized');
      return false;
    }
    try {
      await window.mobileCustomAPIConfig.testConnection();
      return true;
    } catch (error) {
      console.error('[Mobile Context] API connection test failed:', error);
      return false;
    }
  };

  // Call custom API
  window.MobileContext.callCustomAPI = async function (messages, options = {}) {
    if (!window.mobileCustomAPIConfig) {
      console.warn('[Mobile Context] Custom API config module not initialized');
      return null;
    }
    try {
      return await window.mobileCustomAPIConfig.callAPI(messages, options);
    } catch (error) {
      console.error('[Mobile Context] Custom API call failed:', error);
      return null;
    }
  };

  // List supported API providers
  window.MobileContext.getSupportedProviders = function () {
    if (!window.mobileCustomAPIConfig) {
      console.warn('[Mobile Context] Custom API config module not initialized');
      return null;
    }
    return Object.keys(window.mobileCustomAPIConfig.supportedProviders);
  };

  // Get API debug info
  window.MobileContext.getAPIDebugInfo = function () {
    if (!window.mobileCustomAPIConfig) {
      console.warn('[Mobile Context] Custom API config module not initialized');
      return null;
    }
    return window.mobileCustomAPIConfig.getDebugInfo();
  };

  // Quick-setup API config
  window.MobileContext.quickSetupAPI = function (apiUrl, apiKey, model) {
    if (!window.mobileCustomAPIConfig) {
      console.warn('[Mobile Context] Custom API config module not initialized');
      return false;
    }

    if (!apiUrl || !model) {
      console.warn('[Mobile Context] Usage: MobileContext.quickSetupAPI(apiUrl, apiKey, model)');
      console.log("Example: MobileContext.quickSetupAPI('https://api.openai.com', 'sk-xxx', 'gpt-4o')");
      console.log("Example: MobileContext.quickSetupAPI('https://your-openai-compatible-host.example', 'sk-xxx', 'gpt-4o')");
      return false;
    }

    try {
      window.mobileCustomAPIConfig.currentSettings = {
        ...window.mobileCustomAPIConfig.currentSettings,
        enabled: true,
        provider: 'custom', // Always use custom
        apiUrl: apiUrl,
        apiKey: apiKey || '',
        model: model,
      };

      window.mobileCustomAPIConfig.saveSettings();
      console.log('[Mobile Context] ✅ API config updated');
      return true;
    } catch (error) {
      console.error('[Mobile Context] Quick setup failed:', error);
      return false;
    }
  };

  // Debug API config
  window.MobileContext.debugAPIConfig = function () {
    if (!window.mobileCustomAPIConfig) {
      console.warn('[Mobile Context] Custom API config module not initialized');
      return;
    }
    window.mobileCustomAPIConfig.debugConfig();
  };

  // Debug all module load status
  window.MobileContext.debugModuleStatus = function () {
    console.group('=== Mobile Context module status ===');

    // Check base modules
    console.log('1. Base plugin:', {
      pluginInitialized: isInitialized,
      contextMonitor: !!contextMonitor,
      extensionSettings: !!extension_settings,
    });

    // Check context monitor
    console.log('2. Context monitor:', {
      exists: !!window.ContextMonitor,
      instance: !!contextMonitor,
      running: contextMonitor ? contextMonitor.isRunning() : false,
    });

    // Check upload manager
    console.log('3. Upload manager:', {
      exists: !!window.mobileUploadManager,
      hasToggleUI: !!(window.mobileUploadManager && window.mobileUploadManager.toggleMobileUploadUI),
      hasShowUI: !!(window.mobileUploadManager && window.mobileUploadManager.showMobileUploadUI),
    });

    // Check context editor
    console.log('4. Context editor:', {
      exists: !!window.mobileContextEditor,
      hasShowEditor: !!(window.mobileContextEditor && window.mobileContextEditor.showEditor),
      hasForceInit: !!(window.mobileContextEditor && window.mobileContextEditor.forceInitialize),
    });

    // Check Custom API config
    console.log('5. Custom API config:', {
      exists: !!window.mobileCustomAPIConfig,
      hasShowPanel: !!(window.mobileCustomAPIConfig && window.mobileCustomAPIConfig.showConfigPanel),
      hasGetConfig: !!(window.mobileCustomAPIConfig && window.mobileCustomAPIConfig.getCurrentConfig),
    });

    // Check MesID floor monitor
    console.log('6. MesIDFloor monitor:', {
      exists: !!window.mesidFloorMonitor,
      hasStart: !!(window.mesidFloorMonitor && window.mesidFloorMonitor.start),
      hasStop: !!(window.mesidFloorMonitor && window.mesidFloorMonitor.stop),
      hasGetStatus: !!(window.mesidFloorMonitor && window.mesidFloorMonitor.getStatus),
      isMonitoring: window.mesidFloorMonitor ? window.mesidFloorMonitor.getStatus().isMonitoring : false,
    });

    // Check console commands
    console.log('7. Console commands:', {
      MobileContext: !!window.MobileContext,
      showContextEditor: !!(window.MobileContext && window.MobileContext.showContextEditor),
      showAPIConfig: !!(window.MobileContext && window.MobileContext.showAPIConfig),
      debugModuleStatus: !!(window.MobileContext && window.MobileContext.debugModuleStatus),
    });

    // Check UI elements
    console.log('8. UI elements:', {
      phoneButton: !!document.getElementById('mobile-phone-trigger'),
      uploadButton: !!document.getElementById('mobile-upload-trigger'),
      contextEditorButton: !!document.getElementById('mobile-context-editor-btn'),
      apiConfigButton: !!document.getElementById('mobile-api-config-trigger'),
    });

    console.groupEnd();
  };

  // Smart-load chat (v2.0 API, simplified)
  window.MobileContext.smartLoadChat = async function () {
    console.log('[Mobile Context] Starting smart-load chat (v2.0)...');

    if (!window.mobileContextEditor) {
      console.error('[Mobile Context] Context editor not initialized');
      return null;
    }

    // Check status first
    const status = window.MobileContext.debugSillyTavernStatus();
    if (!status || !status.ready) {
      console.log('[Mobile Context] SillyTavern not ready, waiting...');
      const isReady = await window.MobileContext.waitForSillyTavernReady();
      if (!isReady) {
        console.error('[Mobile Context] Wait timed out — check SillyTavern status');
        return null;
      }
    }

    // Load chat data directly
    try {
      const chatData = window.MobileContext.loadChatToEditor();
      if (chatData) {
        console.log(
          `[Mobile Context] ✅ Chat loaded. Messages: ${chatData.messages.length}  msgs (${chatData.characterName})`,
        );
        return chatData;
      } else {
        console.error('[Mobile Context] Cannot get chat data');
        return null;
      }
    } catch (error) {
      console.error('[Mobile Context] Load failed:', error);
      return null;
    }
  };

  // ===========================================
  // MesID floor monitor console commands
  // ===========================================

  // Start floor-change monitor
  window.MobileContext.startFloorMonitor = function () {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return false;
    }
    window.mesidFloorMonitor.start();
    return true;
  };

  // Stop floor-change monitor
  window.MobileContext.stopFloorMonitor = function () {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return false;
    }
    window.mesidFloorMonitor.stop();
    return true;
  };

  // Get floor monitor status
  window.MobileContext.getFloorStatus = function () {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return null;
    }
    return window.mesidFloorMonitor.getStatus();
  };

  // Get floor monitor debug info
  window.MobileContext.getFloorDebugInfo = function () {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return null;
    }
    return window.mesidFloorMonitor.getDebugInfo();
  };

  // Force floor check
  window.MobileContext.forceCheckFloor = function () {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return false;
    }
    window.mesidFloorMonitor.forceCheck();
    return true;
  };

  // Set floor selector
  window.MobileContext.setFloorSelector = function (selector) {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return false;
    }
    if (!selector) {
      console.warn('[Mobile Context] Provide a valid selector');
      return false;
    }
    window.mesidFloorMonitor.setFloorSelector(selector);
    return true;
  };

  // Add floor-change listener
  window.MobileContext.addFloorListener = function (eventType, callback) {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return false;
    }
    if (!eventType || !callback) {
      console.warn("[Mobile Context] Usage: MobileContext.addFloorListener('onFloorChanged', function(data) { ... })");
      console.log('Available events: onFloorAdded, onFloorRemoved, onFloorChanged');
      return false;
    }
    return window.mesidFloorMonitor.addEventListener(eventType, callback);
  };

  // Remove floor-change listener
  window.MobileContext.removeFloorListener = function (eventType, callback) {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return false;
    }
    if (!eventType || !callback) {
      console.warn("[Mobile Context] Usage: MobileContext.removeFloorListener('onFloorChanged', callbackFunction)");
      return false;
    }
    return window.mesidFloorMonitor.removeEventListener(eventType, callback);
  };

  // Quick-setup floor monitor
  window.MobileContext.quickSetupFloorMonitor = function (floorSelector = '.message') {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return false;
    }

    // Set selector
    window.mesidFloorMonitor.setFloorSelector(floorSelector);

    // Add default listeners
    window.mesidFloorMonitor.addEventListener('onFloorAdded', function (data) {
      console.log(`[Floor monitor] 🟢 Floors added: ${data.oldCount} -> ${data.newCount} (+${data.change})`);
      if (extension_settings.mobile_context.enableFloorNotifications) {
        // Notification hook
      }
    });

    window.mesidFloorMonitor.addEventListener('onFloorRemoved', function (data) {
      console.log(`[Floor monitor] 🔴 Floors removed: ${data.oldCount} -> ${data.newCount} (${data.change})`);
      if (extension_settings.mobile_context.enableFloorNotifications) {
        // Notification hook
      }
    });

    window.mesidFloorMonitor.addEventListener('onFloorChanged', function (data) {
      console.log(
        `[Floor monitor] 🔄 Floor change: ${data.oldCount} -> ${data.newCount} (${data.change > 0 ? '+' : ''}${data.change})`,
      );
    });

    // Start listening
    window.mesidFloorMonitor.start();

    console.log(`[Mobile Context] ✅ Floor monitor quick-setup done (selector: ${floorSelector})`);
    return true;
  };

  // Test floor monitor
  window.MobileContext.testFloorMonitor = function () {
    if (!window.mesidFloorMonitor) {
      console.warn('[Mobile Context] MesID floor monitor not initialized');
      return false;
    }

    console.group('=== MesID floor monitor test ===');

    // Check whether element exists
    const mesidElement = document.querySelector('[mesid="1"]');
    console.log('1. MesID element:', mesidElement);

    if (mesidElement) {
      console.log('2. MesID element HTML:', mesidElement.innerHTML.slice(0, 200) + '...');
      console.log('3. MesID child count:', mesidElement.children.length);

      // Test selector
      const floors = mesidElement.querySelectorAll('.message');
      console.log('4. Floors found with .message:', floors.length);

      // Try other selectors
      const divs = mesidElement.querySelectorAll('div');
      console.log('5. Elements found with div:', divs.length);

      const allChildren = mesidElement.children;
      console.log('6. Direct children:', allChildren.length);
    }

    // Check listener status
    const status = window.mesidFloorMonitor.getStatus();
    console.log('7. Listener status:', status);

    // Force check
    window.mesidFloorMonitor.forceCheck();

    console.groupEnd();
    return true;
  };

  console.log('[Mobile Context] Console commands registered:');
  console.log('=== Basics ===');
  console.log('  MobileContext.getContext()     - Get current context');
  console.log('  MobileContext.getHistory()     - Get context history');
  console.log('  MobileContext.getStats()       - Get stats');
  console.log('  MobileContext.showStatus()     - Show status');
  console.log('  MobileContext.start()          - Start monitoring');
  console.log('  MobileContext.stop()           - Stop monitoring');
  console.log('  MobileContext.setLogLevel(level) - Set log level');
  console.log('  MobileContext.clearLogs()      - Clear logs');
  console.log('');
  console.log('=== Chat data ===');
  console.log('  MobileContext.getChatJsonl()   - Get chat JSONL');
  console.log('  MobileContext.getChatMessages() - Get chat messages array');
  console.log('  MobileContext.downloadChatJsonl() - Download JSONL file');
  console.log('');
  console.log('=== Data extractor ===');
  console.log('  MobileContext.listFormats()    - List available formats');
  console.log('  MobileContext.extractFromChat(formatName) - Extract from chat messages — ');
  console.log('  MobileContext.extractFromJsonl(formatName) - Extract from JSONL — ');
  console.log('  MobileContext.extractFromText(text, formatName) - Extract from text — ');
  console.log('  MobileContext.addFormat(name, regex, fields, desc) - Add custom format');
  console.log('  MobileContext.quickExtract(formatName, useJsonl) - Quick extract');
  console.log('');
  console.log('=== Debug tools ===');
  console.log('  MobileContext.debugChatData()   - Debug chat data fetch');
  console.log('  MobileContext.debugJsonlData()  - Debug JSONL contents');
  console.log('  MobileContext.testExtraction()  - Test text extraction');
  console.log('');
  console.log('=== Context editor v2.0 (new API) ===');
  console.log('  MobileContext.showContextEditor() - Show context editor UI');
  console.log('  MobileContext.forceShowEditor()   - Force-start editor even if SillyTavern is not ready');
  console.log('  MobileContext.loadChatToEditor() - Load current chat into editor via SillyTavern.getContext()');
  console.log('  MobileContext.smartLoadChat()    - Smart-load chat and wait for SillyTavern');
  console.log('  MobileContext.modifyMessage(index, content, name) - Modify message (async, new API)');
  console.log('  MobileContext.addMessage(content, isUser, name) - Add message (async, new API)');
  console.log('  MobileContext.deleteMessage(index) - Delete message (async, new API)');
  console.log('  MobileContext.saveEditedChat()   - Save edited chat via context.saveChat()');
  console.log('  MobileContext.refreshChatDisplay() - Refresh chat UI via context.reloadCurrentChat()');
  console.log('  MobileContext.exportEditedJsonl() - Export edited JSONL');
  console.log('  MobileContext.getEditorStats()   - Get editor stats');
  console.log('');
  console.log('=== Editor debug tools v2.0 (new API) ===');
  console.log('  MobileContext.debugSillyTavernStatus() - SillyTavern status check (14 items, new API)');
  console.log('  MobileContext.waitForSillyTavernReady(timeout) - Wait for SillyTavern ready (30s timeout)');
  console.log('');
  console.log('=== Custom API config ===');
  console.log('  MobileContext.showAPIConfig()     - Show API config panel');
  console.log('  MobileContext.getAPIConfig()      - Get current API config');
  console.log('  MobileContext.isAPIAvailable()    - Check whether API is available');
  console.log('  MobileContext.testAPIConnection() - Test API connection');
  console.log('  MobileContext.callCustomAPI(messages, options) - Call custom API');
  console.log('  MobileContext.getSupportedProviders() - List supported API providers');
  console.log('  MobileContext.getAPIDebugInfo()   - Get API debug info');
  console.log('  MobileContext.quickSetupAPI(url, key, model) - Quick-setup API config');
  console.log('  MobileContext.debugAPIConfig()    - Debug API config');
  console.log('  MobileContext.debugModuleStatus() - Debug all module load status');
  console.log('');

  console.log('=== Context editor quick start v2.0 (new API) ===');
  console.log('Method 1 (recommended — wait until fully loaded):');
  console.log('1. MobileContext.debugSillyTavernStatus()  // Check SillyTavern status via new API');
  console.log('2. MobileContext.smartLoadChat()     // Smart-load chat via SillyTavern.getContext()');
  console.log('3. MobileContext.showContextEditor()  // Open editor UI');
  console.log('');
  console.log('Method 2 (use immediately if SillyTavern is still loading');
  console.log('1. MobileContext.forceShowEditor()    // Force-start editor immediately');
  console.log('2. In the editor click Recheck or wait for auto-retry');
  console.log('3. MobileContext.showContextEditor()  // Open editor UI');
  console.log("4. await MobileContext.modifyMessage(0, 'new content')  // Modify message 0 via context.saveChat()");
  console.log("5. await MobileContext.addMessage('new message', true)  // Add user message via context.addOneMessage()");
  console.log('6. await MobileContext.saveEditedChat()    // Save all edits via context.saveChat()');
  console.log('7. MobileContext.exportEditedJsonl()  // Export JSONL file');
  console.log('');
  console.log('Note: v2.0 uses SillyTavern.getContext(); edits save and refresh the UI immediately');
  console.log('');
  console.log('=== Custom API config quick start ===');
  console.log('Method 1 (GUI):');
  console.log('1. Click the 🔧 button on the right to open API config');
  console.log('2. Enter a custom API URL such as https://api.openai.com or https://your-openai-compatible-host.example');
  console.log('3. Enter API key');
  console.log('4. Click 📥 to fetch the model list');
  console.log('5. Pick a model');
  console.log('6. Click 🧪 Test connection');
  console.log('7. Click 💾 Save to finish');
  console.log('');
  console.log('Method 2 (console):');
  console.log("1. MobileContext.quickSetupAPI('https://api.openai.com', 'sk-xxx', 'gpt-4o')");
  console.log("   or MobileContext.quickSetupAPI('https://your-openai-compatible-host.example', 'sk-xxx', 'gpt-4o')");
  console.log('2. MobileContext.testAPIConnection()  // Test connection');
  console.log("3. MobileContext.callCustomAPI([{role: 'user', content: 'hello'}])  // Call API");
  console.log('');
  console.log('Debug commands:');
  console.log('  MobileContext.debugModuleStatus()  // Check all module load status (run this first)');
  console.log('  MobileContext.debugAPIConfig()     // Inspect current config and diagnose issues');
  console.log('  MobileContext.getAPIDebugInfo()    // Get detailed debug info');
  console.log('');
  console.log('If commands fail, run MobileContext.debugModuleStatus() first');
  console.log('Note: only OpenAI-compatible custom APIs with Bearer auth and /v1/models are supported');
  console.log('');
  console.log('=== MesIDFloor monitor ===');
  console.log('  MobileContext.startFloorMonitor()   - Start floor-change monitor');
  console.log('  MobileContext.stopFloorMonitor()    - Stop floor-change monitor');
  console.log('  MobileContext.getFloorStatus()      - Get floor monitor status');
  console.log('  MobileContext.getFloorDebugInfo()   - Get floor monitor debug info');
  console.log('  MobileContext.forceCheckFloor()     - Force floor check');
  console.log('  MobileContext.setFloorSelector(selector) - Set floor selector');
  console.log('  MobileContext.addFloorListener(eventType, callback) - Add floor-change listener');
  console.log('  MobileContext.removeFloorListener(eventType, callback) - Remove floor-change listener');
  console.log('  MobileContext.quickSetupFloorMonitor(selector) - Quick-setup floor monitor');
  console.log('  MobileContext.testFloorMonitor()    - Test floor monitor');
  console.log('');
  console.log('=== MesID floor monitor quick start ===');
  console.log('Method 1 (quick setup):');
  console.log("1. MobileContext.quickSetupFloorMonitor('.message')  // Quick-setup with .message selector");
  console.log('2. MobileContext.testFloorMonitor()   // Test whether the listener works');
  console.log('');
  console.log('Method 2 (manual):');
  console.log("1. MobileContext.setFloorSelector('.message')  // Set floor selector");
  console.log("2. MobileContext.addFloorListener('onFloorChanged', function(data) {");
  console.log("     console.log('Floor change:', data.oldCount, '->', data.newCount);");
  console.log('   });');
  console.log('3. MobileContext.startFloorMonitor()  // Start listening');
  console.log('');
  console.log('Debug commands:');
  console.log('  MobileContext.testFloorMonitor()    // Test floor monitor and print details');
  console.log('  MobileContext.getFloorDebugInfo()   // Get debug info');
  console.log('  MobileContext.getFloorStatus()      // View current status');
  console.log('');
  console.log('Events: onFloorAdded, onFloorRemoved, onFloorChanged');
  console.log('Note: the floor monitor watches the mesid="1" element');

  // ===========================================
  // Forum manager console commands
  // ===========================================

  // Show forum panel
  window.MobileContext.showForumPanel = function () {
    if (window.forumManager && typeof window.forumManager.showForumPanel === 'function') {
      window.forumManager.showForumPanel();
    } else {
      console.warn('[Mobile Context] Forum manager not initialized or method missing');
    }
  };

  // Generate forum content
  window.MobileContext.generateForum = function () {
    if (window.forumManager && typeof window.forumManager.generateForumContent === 'function') {
      window.forumManager.generateForumContent();
    } else {
      console.warn('[Mobile Context] Forum manager not initialized or method missing');
    }
  };

  // Clear forum content
  window.MobileContext.clearForum = function () {
    if (window.forumManager && typeof window.forumManager.clearForumContent === 'function') {
      window.forumManager.clearForumContent();
    } else {
      console.warn('[Mobile Context] Forum manager not initialized or method missing');
    }
  };

  // Get forum status
  window.MobileContext.getForumStatus = function () {
    if (!window.forumManager) {
      console.warn('[Mobile Context] Forum manager not initialized');
      return null;
    }
    return {
      isInitialized: window.forumManager.isInitialized,
      isProcessing: window.forumManager.isProcessing,
      settings: window.forumManager.currentSettings,
      lastProcessedCount: window.forumManager.lastProcessedCount,
    };
  };

  // Set forum style
  window.MobileContext.setForumStyle = function (styleName) {
    if (!window.forumManager) {
      console.warn('[Mobile Context] Forum manager not initialized');
      return false;
    }
    if (!styleName) {
      console.warn('[Mobile Context] Provide a style name');
      console.log(
        'Available styles:',
        window.forumStyles
          ? window.forumStyles.getAvailableStyles()
          : ['Tieba Bro', 'Zhihu Elite', 'Xiaohongshu Recs', 'Douyin Creator', 'Bilibili UP', 'Hajiao Veteran', 'Tabloid Reporter', 'Tianya Regular'],
      );
      return false;
    }
    window.forumManager.currentSettings.selectedStyle = styleName;
    window.forumManager.saveSettings();
    return true;
  };

  // Set forum threshold
  window.MobileContext.setForumThreshold = function (threshold) {
    if (!window.forumManager) {
      console.warn('[Mobile Context] Forum manager not initialized');
      return false;
    }
    if (typeof threshold !== 'number' || threshold < 1) {
      console.warn('[Mobile Context] Provide a valid threshold (integer > 0)');
      return false;
    }
    window.forumManager.currentSettings.threshold = threshold;
    window.forumManager.saveSettings();
    return true;
  };

  // Toggle forum auto-update
  window.MobileContext.toggleForumAutoUpdate = function () {
    if (!window.forumManager) {
      console.warn('[Mobile Context] Forum manager not initialized');
      return false;
    }
    window.forumManager.currentSettings.autoUpdate = !window.forumManager.currentSettings.autoUpdate;
    window.forumManager.saveSettings();
    console.log(`[Mobile Context] Forum auto-update is now${window.forumManager.currentSettings.autoUpdate ? 'enabled' : 'disabled'}`);
    return window.forumManager.currentSettings.autoUpdate;
  };

  // List forum styles
  window.MobileContext.getForumStyles = function () {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return [];
    }
    return window.forumStyles.getAvailableStyles();
  };

  // Start/stop forum auto-listener
  window.MobileContext.startForumListener = function () {
    if (!window.forumAutoListener) {
      console.warn('[Mobile Context] Forum auto-listener not initialized');
      return false;
    }
    window.forumAutoListener.start();
    return true;
  };

  window.MobileContext.stopForumListener = function () {
    if (!window.forumAutoListener) {
      console.warn('[Mobile Context] Forum auto-listener not initialized');
      return false;
    }
    window.forumAutoListener.stop();
    return true;
  };

  // Get forum listener status
  window.MobileContext.getForumListenerStatus = function () {
    if (!window.forumAutoListener) {
      console.warn('[Mobile Context] Forum auto-listener not initialized');
      return null;
    }
    return window.forumAutoListener.getStatus();
  };

  // Debug forum features
  window.MobileContext.debugForumFeatures = function () {
    console.group('=== Forum feature status ===');

    // Check forum modules
    console.log('1. Forum styles module:', {
      exists: !!window.forumStyles,
      availableStyles: window.forumStyles ? window.forumStyles.getAvailableStyles().length : 0,
      hasCustomPrefix: window.forumStyles ? window.forumStyles.getPrefixStatus().hasPrefix : false,
      hasGlobalPrefix: window.forumStyles ? window.forumStyles.getPrefixStatus().hasGlobalPrefix : false,
    });

    console.log('2. Forum auto-listener:', {
      exists: !!window.forumAutoListener,
      isListening: window.forumAutoListener ? window.forumAutoListener.isListening : false,
      lastMessageCount: window.forumAutoListener ? window.forumAutoListener.lastMessageCount : 0,
    });

    console.log('3. Forum manager:', {
      exists: !!window.forumManager,
      isInitialized: window.forumManager ? window.forumManager.isInitialized : false,
      isProcessing: window.forumManager ? window.forumManager.isProcessing : false,
      settings: window.forumManager ? window.forumManager.currentSettings : null,
    });

    // Check UI elements
    console.log('4. Forum UI elements:', {
      forumButton: !!document.getElementById('mobile-forum-trigger'),
      forumPanel: !!document.getElementById('forum-panel-overlay'),
    });

    // Show prefix status (detailed)
    if (window.forumStyles) {
      const prefixStatus = window.forumStyles.getPrefixStatus();
      console.log('5. Prefix details:', prefixStatus);

      // Show priority info
      const priorityInfo = window.forumStyles.getPrefixPriorityInfo();
      console.log('6. Prefix priority:', priorityInfo);
    }

    console.groupEnd();
  };

  // ===========================================
  // Forum prefix console commands
  // ===========================================

  // Set forum prefix
  window.MobileContext.setForumPrefix = function (text) {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return false;
    }
    window.forumStyles.setCustomPrefix(text);
    console.log(`[Mobile Context] ✅ Prefix set: ${text ? 'set' : 'cleared'}`);
    return true;
  };

  // Get current prefix
  window.MobileContext.getForumPrefix = function () {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return null;
    }
    const prefix = window.forumStyles.getCustomPrefix();
    console.log(`[Mobile Context] Current prefix: ${prefix || '(none)'}`);
    return prefix;
  };

  // Clear prefix
  window.MobileContext.clearForumPrefix = function () {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return false;
    }
    window.forumStyles.clearCustomPrefix();
    console.log('[Mobile Context] ✅ Prefix cleared');
    return true;
  };

  // Preview style prompt with prefix
  window.MobileContext.previewForumPrompt = function (styleName = 'Tieba Bro') {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return null;
    }
    const prompt = window.forumStyles.previewStyleWithPrefix(styleName);
    console.log(`[Mobile Context] ${styleName}  style preview:`);
    console.log(prompt);
    return prompt;
  };

  // Get prefix status
  window.MobileContext.getForumPrefixStatus = function () {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return null;
    }
    const status = window.forumStyles.getPrefixStatus();
    console.log('[Mobile Context] Prefix status:', status);
    return status;
  };

  // ===========================================
  // Global backend prefix console commands
  // ===========================================

  // View global backend prefix
  window.MobileContext.getGlobalForumPrefix = function () {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return null;
    }
    const globalPrefix = window.forumStyles.getGlobalBackendPrefix();
    console.log('[Mobile Context] Global backend prefix:');
    console.log(globalPrefix);
    return globalPrefix;
  };

  // Check whether a global backend prefix exists
  window.MobileContext.hasGlobalForumPrefix = function () {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return false;
    }
    const hasGlobal = window.forumStyles.hasGlobalBackendPrefix();
    console.log(`[Mobile Context] Global backend prefix status: ${hasGlobal ? 'set' : 'not set'}`);
    return hasGlobal;
  };

  // Get full prefix preview
  window.MobileContext.getFullForumPrefixPreview = function () {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return null;
    }
    const preview = window.forumStyles.getFullPrefixPreview();
    console.log('[Mobile Context] Full prefix preview:');
    console.log(preview);
    return preview;
  };

  // Get prefix priority info
  window.MobileContext.getForumPrefixPriority = function () {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return null;
    }
    const info = window.forumStyles.getPrefixPriorityInfo();
    console.log('[Mobile Context] Prefix priority info:');
    console.log(info);
    return info;
  };

  // Preview the full prompt sent to the model
  window.MobileContext.previewFullForumPrompt = function (styleName = 'Tieba Bro') {
    if (!window.forumStyles) {
      console.warn('[Mobile Context] Forum styles module not initialized');
      return null;
    }
    console.log(`[Mobile Context] Full prompt preview (${styleName} style):`);
    console.log('='.repeat(60));
    const fullPrompt = window.forumStyles.previewStyleWithPrefix(styleName);
    console.log(fullPrompt);
    console.log('='.repeat(60));
    return fullPrompt;
  };

  console.log('');
  console.log('=== Forum manager v1.0 ===');
  console.log('  MobileContext.showForumPanel() - Show forum panel');
  console.log('  MobileContext.generateForum() - Generate forum content now');
  console.log('  MobileContext.clearForum() - Clear forum content on floor 1');
  console.log('  MobileContext.getForumStatus() - Get forum manager status');
  console.log('  MobileContext.setForumStyle(styleName) - Set forum style');
  console.log('  MobileContext.setForumThreshold(number) - Set message threshold');
  console.log('  MobileContext.toggleForumAutoUpdate() - Toggle auto-update');
  console.log('  MobileContext.getForumStyles() - List forum styles');
  console.log('');
  console.log('=== Forum prefix settings ===');
  console.log('  MobileContext.setForumPrefix(text) - Set user prefix');
  console.log('  MobileContext.getForumPrefix() - Get current user prefix');
  console.log('  MobileContext.clearForumPrefix() - Clear user prefix');
  console.log('  MobileContext.previewForumPrompt(style) - Preview prompt with prefix');
  console.log('');
  console.log('=== Global backend prefix ===');
  console.log('  MobileContext.getGlobalForumPrefix() - View global backend prefix');
  console.log('  MobileContext.hasGlobalForumPrefix() - Check whether global prefix is set');
  console.log('  MobileContext.getFullForumPrefixPreview() - Preview all prefix layers');
  console.log('  MobileContext.getForumPrefixPriority() - View prefix priority');
  console.log('  MobileContext.previewFullForumPrompt(style) - Preview final full prompt');
  console.log('');
  console.log('=== Forum auto-listener ===');
  console.log('  MobileContext.startForumListener() - Start forum auto-listener');
  console.log('  MobileContext.stopForumListener() - Stop forum auto-listener');
  console.log('  MobileContext.getForumListenerStatus() - Get listener status');
  console.log('');
  console.log('=== Forum debug tools ===');
  console.log('  MobileContext.debugForumFeatures() - Debug forum features');
  console.log('');
  console.log('=== Forum quick start ===');
  console.log('Method 1 (GUI):');
  console.log('1. Click the 📰 button on the right to open the forum panel');
  console.log('2. Pick a forum style (8 community styles such as Tieba Bro, Zhihu Elite, Xiaohongshu)');
  console.log('3. Optional: set a user prefix (appended after the global prefix)');
  console.log('4. Set the message threshold (auto-generate when new messages hit it)');
  console.log('5. Toggle auto-generate');
  console.log("6. Click 'Generate forum now' for a manual run");
  console.log('7. Forum content is appended to floor 1 (original text kept)');
  console.log('');
  console.log('Method 2 (console):');
  console.log("1. MobileContext.setForumStyle('Zhihu Elite')  // Set style");
  console.log("2. MobileContext.setForumPrefix('your custom instructions')  // Optional: set user prefix");
  console.log('3. MobileContext.setForumThreshold(5)      // Set threshold');
  console.log('4. MobileContext.toggleForumAutoUpdate()   // Enable auto-update');
  console.log('5. MobileContext.generateForum()           // Generate forum content now');
  console.log('');
  console.log('=== Prefix system notes ===');
  console.log('Forum uses stacked prefixes, high to low priority:');
  console.log('1. 🔒 Global backend prefix (set in code by the developer; base rules)');
  console.log('2. 👤 User prefix (set in the UI or console)');
  console.log('3. 🎭 Forum style prompt (8 community styles)');
  console.log('4. 😊 Sticker usage guide');
  console.log('');
  console.log('View prefix status: MobileContext.getFullForumPrefixPreview()');
  console.log("Preview full prompt: MobileContext.previewFullForumPrompt('Tieba Bro')");
  console.log('');
  console.log('Note: forum needs API config first (Custom API config module)');
  console.log('Supported styles: Tieba Bro, Zhihu Elite, Xiaohongshu Recs, Douyin Creator, Bilibili UP, Hajiao Veteran, Tabloid Reporter, Tianya Regular');
  console.log('Generated forum text is appended to floor 1 inside special markers; clear removes only the forum block');
}

// Set global plugin flag
window.MobileContextPlugin = {
  version: '2.4.0',
  description:
    'Mobile Context Monitor with Upload & Editor & Custom API & MesID Floor Monitor & Forum Manager & Forum UI v2.4 (SillyTavern.getContext() API Integration)',
  isInitialized: () => isInitialized,
  getMonitor: () => contextMonitor,
  getContextEditor: () => window.mobileContextEditor,
  getCustomAPIConfig: () => window.mobileCustomAPIConfig,
  getMesIDFloorMonitor: () => window.mesidFloorMonitor,
  getForumManager: () => window.forumManager,
  getForumStyles: () => window.forumStyles,
  getForumAutoListener: () => window.forumAutoListener,
  getForumUI: () => window.forumUI,
  apiVersion: '2.4',
  updatePointerEventsSettings: () => updatePointerEventsSettings(),
  getSettings: () => extension_settings.mobile_context,
};

/**
 * Update pointer-events setting
 */
function updatePointerEventsSettings() {
  const container = document.querySelector('.mobile-phone-container');
  const frame = document.querySelector('.mobile-phone-frame');

  if (!container || !frame) {
    return;
  }

  if (extension_settings.mobile_context.tavernCompatibilityMode) {
    // Compat mode: pointer-events so phone and tavern page can both be used
    container.style.pointerEvents = 'none';
    frame.style.pointerEvents = 'auto';
  } else {
    // Non-compat: container receives clicks so tapping outside closes the phone
    container.style.pointerEvents = 'auto';
    frame.style.pointerEvents = 'auto';
  }
}

/**
 * Update phone-button visibility
 */
function updatePhoneVisibility() {
  const phoneTrigger = document.getElementById('mobile-phone-trigger');

  if (!phoneTrigger) {
    return;
  }

  if (extension_settings.mobile_context.hidePhone) {
    // Hide phone button
    phoneTrigger.style.display = 'none';
  } else {
    // Show phone button
    phoneTrigger.style.display = 'block';
  }
}
