/**
 * Forum Control App - forum control panel
 * Provides forum controls for mobile-phone.js
 */

class ForumControlApp {
  constructor() {
    this.currentView = 'control'; // 'control'
    this.init();
  }

  init() {
    console.log('[Forum Control App] forum control app init');
  }

  getAppContent() {
    switch (this.currentView) {
      case 'control':
        return this.renderForumControl();
      default:
        return this.renderForumControl();
    }
  }

  renderForumControl() {
    const currentSettings = window.forumManager
      ? window.forumManager.currentSettings
      : {
          selectedStyle: '贴吧老哥',
          threshold: 5,
          autoUpdate: true,
        };

    const customPrefix = window.forumStyles ? window.forumStyles.getCustomPrefix() : '';

    return `
            <div class="forum-control-app">
                <div class="control-section">
                    <h3 class="section-title">📰 Forum settings</h3>

                    <div class="form-group">
                        <label class="form-label">Forum style</label>
                        <select id="forum-style-select" class="form-select">
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Custom prefix</label>
                        <textarea id="forum-custom-prefix" class="form-textarea" placeholder="Custom prefix added in front of the style prompt...">${customPrefix}</textarea>
                        <div class="form-hint">Tip: extra instructions, role notes, or generation rules</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Message threshold</label>
                        <input type="number" id="forum-threshold" class="form-input" value="${
                          currentSettings.threshold
                        }" min="1" max="100" placeholder="Messages before auto-generate">
                        <div class="form-hint">Auto-generate forum when this many new messages arrive</div>
                    </div>

                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="forum-auto-update" ${
                              currentSettings.autoUpdate ? 'checked' : ''
                            }>
                            <span class="checkbox-label">Auto-generate forum</span>
                        </label>
                    </div>
                </div>

                <div class="control-section">
                    <h3 class="section-title">🔧 Actions</h3>

                    <div class="button-group">
                        <button id="generate-forum-now" class="control-btn primary">
                            <span class="btn-icon">🚀</span>
                            <span>Generate forum now</span>
                        </button>
                        <button id="clear-forum-content" class="control-btn danger">
                            <span class="btn-icon">🗑️</span>
                            <span>Clear forum</span>
                        </button>
                        <button id="forum-settings" class="control-btn secondary">
                            <span class="btn-icon">⚙️</span>
                            <span>API settings</span>
                        </button>
                    </div>
                </div>

                <div class="control-section">
                    <h3 class="section-title">📊 Status</h3>
                    <div id="forum-status" class="status-display">
                        Status: Ready
                    </div>
                </div>
            </div>
        `;
  }

  bindEvents() {
    this.initializeStyleSelector();

    const styleSelect = document.getElementById('forum-style-select');
    if (styleSelect) {
      styleSelect.addEventListener('change', e => {
        if (window.forumManager) {
          window.forumManager.currentSettings.selectedStyle = e.target.value;
          window.forumManager.saveSettings();
        }
      });
    }

    const customPrefixTextarea = document.getElementById('forum-custom-prefix');
    if (customPrefixTextarea) {
      customPrefixTextarea.addEventListener('input', e => {
        if (window.forumStyles) {
          window.forumStyles.setCustomPrefix(e.target.value);
        }
      });
    }

    const thresholdInput = document.getElementById('forum-threshold');
    if (thresholdInput) {
      thresholdInput.addEventListener('change', e => {
        if (window.forumManager) {
          window.forumManager.currentSettings.threshold = parseInt(e.target.value);
          window.forumManager.saveSettings();
        }
      });
    }

    const autoUpdateCheckbox = document.getElementById('forum-auto-update');
    if (autoUpdateCheckbox) {
      autoUpdateCheckbox.addEventListener('change', e => {
        if (window.forumManager) {
          window.forumManager.currentSettings.autoUpdate = e.target.checked;
          window.forumManager.saveSettings();
        }
      });
    }

    const generateBtn = document.getElementById('generate-forum-now');
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        try {
          generateBtn.disabled = true;
          generateBtn.textContent = 'Generating...';

          if (window.MobileContext && window.MobileContext.forceGenerateForum) {
            const result = await window.MobileContext.forceGenerateForum();
            if (!result) {
              console.warn('[Forum Control] forceGenerateForum returned false');
            }
          } else if (window.forumManager) {
            const result = await window.forumManager.generateForumContent(true);
            if (!result) {
              console.warn('[Forum Control] generateForumContent returned false');
            }
          } else {
            alert('Forum manager not loaded — refresh and retry');
          }
        } catch (error) {
          console.error('[Forum Control] generate error:', error);
          alert(`Generate failed: ${error.message}`);
        } finally {
          generateBtn.disabled = false;
          generateBtn.innerHTML = '<span class="btn-icon">🚀</span><span>Generate forum now</span>';
          setTimeout(() => {
            if (window.forumManager && window.forumManager.isProcessing) {
              window.forumManager.isProcessing = false;
            }
          }, 3000);
        }
      });
    }

    const clearBtn = document.getElementById('clear-forum-content');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        try {
          if (!confirm('Clear all forum posts? This cannot be undone.')) {
            return;
          }
          clearBtn.disabled = true;
          clearBtn.textContent = 'Clearing...';
          if (window.forumManager) {
            await window.forumManager.clearForumContent();
          } else {
            alert('Forum manager not loaded — refresh and retry');
          }
        } catch (error) {
          console.error('[Forum Control] clear error:', error);
          alert(`Clear failed: ${error.message}`);
        } finally {
          clearBtn.disabled = false;
          clearBtn.innerHTML = '<span class="btn-icon">🗑️</span><span>Clear forum</span>';
          setTimeout(() => {
            if (window.forumManager && window.forumManager.isProcessing) {
              window.forumManager.isProcessing = false;
            }
          }, 3000);
        }
      });
    }

    const settingsBtn = document.getElementById('forum-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (window.mobileCustomAPIConfig) {
          window.mobileCustomAPIConfig.showAPIPanel();
        } else {
          alert('API module not loaded');
        }
      });
    }
  }

  updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('forum-status');
    if (statusEl) {
      const colors = {
        info: '#3498db',
        success: '#27ae60',
        warning: '#f39c12',
        error: '#e74c3c',
      };
      statusEl.textContent = `Status: ${message}`;
      statusEl.style.color = colors[type] || colors.info;
    }
  }

  getStatus() {
    return {
      currentView: this.currentView,
      forumManagerAvailable: !!window.forumManager,
      forumStylesAvailable: !!window.forumStyles,
      apiConfigAvailable: !!window.mobileCustomAPIConfig,
    };
  }

  initializeStyleSelector() {
    const styleSelect = document.getElementById('forum-style-select');
    if (!styleSelect) return;

    try {
      const currentStyle = window.forumManager?.currentSettings?.selectedStyle || '贴吧老哥';
      styleSelect.innerHTML = '';

      if (window.forumStyles && window.forumStyles.styles) {
        const presetStyles = Object.keys(window.forumStyles.styles);
        if (presetStyles.length > 0) {
          const presetGroup = document.createElement('optgroup');
          presetGroup.label = 'Preset styles';
          const STYLE_LABELS = {
            '贴吧老哥': 'Tieba veteran',
            '知乎精英': 'Zhihu elite',
            '小红书种草': 'Xiaohongshu recs',
            '抖音达人': 'Douyin creator',
            'B站UP主': 'Bilibili UP',
            '海角老司机': 'Old hand',
            '八卦小报记者': 'Gossip reporter',
            '天涯老涯友': 'Tianya old-timer',
            '校园论坛': 'Campus forum',
            '微博': 'Weibo',
          };
          presetStyles.forEach(styleName => {
            const option = document.createElement('option');
            option.value = styleName;
            option.textContent = STYLE_LABELS[styleName] || styleName;
            if (styleName === currentStyle) {
              option.selected = true;
            }
            presetGroup.appendChild(option);
          });
          styleSelect.appendChild(presetGroup);
        }
      }

      if (window.forumStyles && window.forumStyles.getAllCustomStyles) {
        const customStyles = window.forumStyles.getAllCustomStyles();
        if (customStyles.length > 0) {
          const customGroup = document.createElement('optgroup');
          customGroup.label = 'Custom styles';
          customStyles.forEach(style => {
            const option = document.createElement('option');
            option.value = style.name;
            option.textContent = `${style.name} (custom)`;
            if (style.name === currentStyle) {
              option.selected = true;
            }
            customGroup.appendChild(option);
          });
          styleSelect.appendChild(customGroup);
        }
      }

      if (!styleSelect.value && styleSelect.options.length > 0) {
        styleSelect.selectedIndex = 0;
        if (window.forumManager) {
          window.forumManager.currentSettings.selectedStyle = styleSelect.value;
          window.forumManager.saveSettings();
        }
      }
    } catch (error) {
      console.error('[ForumControlApp] style selector init failed:', error);
      styleSelect.innerHTML = '<option value="贴吧老哥">Tieba veteran</option>';
      styleSelect.value = '贴吧老哥';
    }
  }

  refreshStyleSelector() {
    this.initializeStyleSelector();
  }
}

window.forumControlApp = new ForumControlApp();

window.getForumControlAppContent = function () {
  return window.forumControlApp.getAppContent();
};

window.bindForumControlEvents = function () {
  window.forumControlApp.bindEvents();
};

window.ForumControlApp = ForumControlApp;
window.forumControlApp = new ForumControlApp();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ForumControlApp;
}

console.log('[Forum Control App] forum control app loaded');
