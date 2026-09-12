/**
 * Style Config Manager - Mobile style config manager
 * Stores mobile UI styles in SillyTavern Data Bank (global)
 */

// Import SillyTavern Data Bank API
let getDataBankAttachmentsForSource, getFileAttachment, uploadFileAttachmentToServer, deleteAttachment;
let sillyTavernCoreImported = false;

// Config filename (Data Bank)
const STYLE_CONFIG_FILE_NAME = 'mobile_style_config.json';

// Default style config
const DEFAULT_STYLE_CONFIG = {
  homeScreen: {
    backgroundImage: '',
    backgroundImageUrl: '',
    description: 'Home screen background image',
  },
  messageDetailApp: {
    backgroundImage: '',
    backgroundImageUrl: '',
    description: 'Message-detail app background',
  },
  messagesApp: {
    backgroundImage: '',
    backgroundImageUrl: '',
    backgroundPosition: 'center center',
    description: 'Messages app background',
  },
  messageSentAvatar: {
    backgroundImage: '',
    backgroundImageUrl: '',
    backgroundPosition: 'center center',
    rotation: '0',
    scale: '1',
    description: 'Sent-message avatar background',
  },
  messageReceivedAvatars: [
    {
      id: 'default',
      backgroundImage: '',
      backgroundImageUrl: '',
      backgroundPosition: 'center center',
      rotation: '0',
      scale: '1',
      friendId: '',
      name: 'Default friend avatar',
      description: 'Received-message avatar background',
    },
  ],
  // Per-friend backgrounds
  friendBackgrounds: [
    {
      id: 'default',
      friendId: '',
      name: 'Default friend background',
      backgroundImage: '',
      backgroundImageUrl: '',
      backgroundPosition: 'center center',
      rotation: '0',
      scale: '1',
      description: 'Per-friend chat background',
    },
  ],
  customStyles: {
    cssText: '',
    description: 'Custom CSS',
  },
};

// Avoid redefining
// @ts-ignore - StyleConfigManager global
if (typeof window.StyleConfigManager === 'undefined') {
  class StyleConfigManager {
    constructor() {
      this.currentConfig = { ...DEFAULT_STYLE_CONFIG };
      this.configLoaded = false;
      this.styleElement = null;
      this.isReady = false;

      console.log('[Style Config Manager] Style config manager starting');

      // Init
      this.init();
    }

    async init() {
      try {
        // Import SillyTavern core
        await this.importSillyTavernCore();

        // Create style element
        this.createStyleElement();

        // Clean duplicate default configs
        await this.cleanupDuplicateDefaultConfigs();

        // Auto-load config
        await this.loadConfig();

        // Apply config
        this.applyStyles();

        this.isReady = true;
        console.log('[Style Config Manager] ✅ Style config manager ready');

        // Fire ready event
        this.dispatchReadyEvent();

        // Keep the global ref
        // @ts-ignore - Window global property
        window.styleConfigManager = this;
      } catch (error) {
        console.error('[Style Config Manager] Init failed:', error);
      }
    }

    // Import SillyTavern core
    async importSillyTavernCore() {
      if (sillyTavernCoreImported) {
        return;
      }

      try {
        console.log('[Style Config Manager] 🔍 Importing SillyTavern Data Bank API...');

        // Dynamic-import chats.js
        const chatsModule = await import('../../../../chats.js');

        getDataBankAttachmentsForSource = chatsModule.getDataBankAttachmentsForSource;
        getFileAttachment = chatsModule.getFileAttachment;
        uploadFileAttachmentToServer = chatsModule.uploadFileAttachmentToServer;
        deleteAttachment = chatsModule.deleteAttachment;

        sillyTavernCoreImported = true;
        console.log('[Style Config Manager] ✅ SillyTavern Data Bank API imported');
      } catch (error) {
        console.warn('[Style Config Manager] ⚠️ SillyTavern import failed — using localStorage:', error);
        // Fall back to localStorage if import fails
      }
    }

    // Create style element
    createStyleElement() {
      // Remove old style element
      const oldStyleElement = document.getElementById('mobile-style-config');
      if (oldStyleElement) {
        oldStyleElement.remove();
      }

      // Create style element
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'mobile-style-config';
      this.styleElement.type = 'text/css';
      document.head.appendChild(this.styleElement);

      console.log('[Style Config Manager] Style element created');
    }

    // Clean duplicate default configs
    async cleanupDuplicateDefaultConfigs() {
      try {
        if (!sillyTavernCoreImported) {
          console.log('[Style Config Manager] SillyTavern not imported — skip cleanup');
          return;
        }

        console.log('[Style Config Manager] 🧹 Cleaning duplicate default configs...');

        // List config files
        const globalAttachments = getDataBankAttachmentsForSource('global', true);
        const defaultConfigs = globalAttachments.filter(att => att.name === STYLE_CONFIG_FILE_NAME);

        if (defaultConfigs.length > 1) {
          console.log(`[Style Config Manager] Found ${defaultConfigs.length} duplicate default configs — cleaning...`);

          // Keep the first, delete the rest
          for (let i = 1; i < defaultConfigs.length; i++) {
            try {
              console.log(`[Style Config Manager] Deleting duplicate config: ${defaultConfigs[i].name}`);
              await deleteAttachment(defaultConfigs[i], 'global', () => {}, false);
              console.log(`[Style Config Manager] ✅ Deleted duplicate config: ${defaultConfigs[i].name}`);
            } catch (error) {
              console.warn(`[Style Config Manager] Failed to delete duplicate: ${defaultConfigs[i].name}`, error);
            }
          }

          console.log('[Style Config Manager] ✅ Duplicate default configs cleaned');
        } else {
          console.log('[Style Config Manager] No duplicate default configs');
        }
      } catch (error) {
        console.warn('[Style Config Manager] Error cleaning duplicate configs:', error);
      }
    }

    // Clean old default configs (including timestamped)
    async cleanupOldDefaultConfigs() {
      try {
        if (!sillyTavernCoreImported) {
          console.log('[Style Config Manager] SillyTavern not imported — skip cleanup');
          return;
        }

        console.log('[Style Config Manager] 🧹 Cleaning old default configs...');

        // List config files
        const globalAttachments = getDataBankAttachmentsForSource('global', true);

        // Find default-config related files
        const defaultRelatedConfigs = globalAttachments.filter(
          att =>
            att.name === STYLE_CONFIG_FILE_NAME ||
            (att.name.startsWith('mobile_config_') && att.name.includes('_mobile_style_config.json')),
        );

        if (defaultRelatedConfigs.length > 0) {
          console.log(`[Style Config Manager] Found ${defaultRelatedConfigs.length} default-config files — cleaning...`);

          // Delete related files
          for (const config of defaultRelatedConfigs) {
            try {
              console.log(`[Style Config Manager] Deleting old config: ${config.name}`);
              await deleteAttachment(config, 'global', () => {}, false);
              console.log(`[Style Config Manager] ✅ Deleted old config: ${config.name}`);
            } catch (error) {
              console.warn(`[Style Config Manager] Failed to delete old config: ${config.name}`, error);
            }
          }

          console.log('[Style Config Manager] ✅ Old default configs cleaned');
        } else {
          console.log('[Style Config Manager] No old default configs to clean');
        }
      } catch (error) {
        console.warn('[Style Config Manager] Error cleaning old default configs:', error);
      }
    }

    // Load config from Data Bank
    async loadConfig() {
      try {
        console.log('[Style Config Manager] 🔄 Loading styles from Data Bank...');

        if (sillyTavernCoreImported && getDataBankAttachmentsForSource && getFileAttachment) {
          // Use native SillyTavern API
          const result = await this.loadConfigFromDataBank();
          if (result) {
            this.configLoaded = true;
            return;
          }
        }

        // Fallback: load from localStorage
        await this.loadConfigFromLocalStorage();
        this.configLoaded = true;
      } catch (error) {
        console.warn('[Style Config Manager] Load failed — using defaults:', error);
        this.configLoaded = true;
      }
    }

    // Load config from Data Bank
    async loadConfigFromDataBank() {
      try {
        console.log('[Style Config Manager] 🔍 Loading config from Data Bank...');

        // List global attachments
        const globalAttachments = getDataBankAttachmentsForSource('global', true);
        console.log('[Style Config Manager] Global attachment count:', globalAttachments.length);

        // Find config — standard name first, then timestamped JSON
        let configAttachment = globalAttachments.find(att => att.name === STYLE_CONFIG_FILE_NAME);

        if (!configAttachment) {
          console.log('[Style Config Manager] No standard config file — looking for timestamped ones...');
          // Find newest mobile_config_*.json
          const mobileConfigs = globalAttachments
            .filter(att => att.name.startsWith('mobile_config_') && att.name.endsWith('.json'))
            .sort((a, b) => {
              // Sort by filename timestamp, newest first
              const timeA = parseInt(a.name.match(/mobile_config_(\d+)_/)?.[1] || '0');
              const timeB = parseInt(b.name.match(/mobile_config_(\d+)_/)?.[1] || '0');
              return timeB - timeA;
            });

          console.log(
            '[Style Config Manager] Timestamped config files:',
            mobileConfigs.map(c => c.name),
          );

          if (mobileConfigs.length > 0) {
            configAttachment = mobileConfigs[0]; // Use the newest
            console.log('[Style Config Manager] Using newest config file:', configAttachment.name);
          }
        }

        if (configAttachment) {
          console.log('[Style Config Manager] 📁 Found config file:', configAttachment.name);
          console.log('[Style Config Manager] Config file URL:', configAttachment.url);

          // Validate URL
          if (configAttachment.url.endsWith('.txt')) {
            console.error('[Style Config Manager] ❌ Config was saved as TXT — cannot load');
            return false;
          }

          // Download file contents
          console.log('[Style Config Manager] 🔄 Downloading file...');
          const configContent = await getFileAttachment(configAttachment.url);
          console.log('[Style Config Manager] Downloaded length:', configContent ? configContent.length : 0);

          if (configContent && configContent.trim()) {
            try {
              const parsedConfig = JSON.parse(configContent);
              console.log('[Style Config Manager] ✅ JSON parsed');

              // Merge configs (keep defaults, override existing)
              this.currentConfig = this.mergeConfigs(DEFAULT_STYLE_CONFIG, parsedConfig);

              console.log('[Style Config Manager] ✅ Loaded config from Data Bank:', this.currentConfig);
              return true;
            } catch (parseError) {
              console.error('[Style Config Manager] ❌ JSON parse failed:', parseError);
              console.log('[Style Config Manager] Invalid JSON:', configContent.substring(0, 200));
              return false;
            }
          }
        }

        console.log('[Style Config Manager] 📄 No valid Data Bank config — using defaults');
        return false;
      } catch (error) {
        console.error('[Style Config Manager] ❌ Failed to load from Data Bank:', error);
        return false;
      }
    }

    // Load config from localStorage
    async loadConfigFromLocalStorage() {
      try {
        const storageKey = `sillytavern_mobile_${STYLE_CONFIG_FILE_NAME}`;
        const stored = localStorage.getItem(storageKey);

        if (stored) {
          const parsedConfig = JSON.parse(stored);
          this.currentConfig = this.mergeConfigs(DEFAULT_STYLE_CONFIG, parsedConfig);
          console.log('[Style Config Manager] ✅ Loaded config from localStorage');
        } else {
          console.log('[Style Config Manager] 📄 No localStorage config — using defaults');
        }
      } catch (error) {
        console.warn('[Style Config Manager] Failed to load from localStorage:', error);
      }
    }

    // Save config to Data Bank
    async saveConfig() {
      try {
        console.log('[Style Config Manager] 💾 Saving styles...');
        console.log('[Style Config Manager] sillyTavernCoreImported:', sillyTavernCoreImported);
        console.log('[Style Config Manager] uploadFileAttachmentToServer:', !!uploadFileAttachmentToServer);

        if (sillyTavernCoreImported && uploadFileAttachmentToServer) {
          console.log('[Style Config Manager] 🔄 Trying Data Bank save...');
          // Prefer native SillyTavern API
          const success = await this.saveConfigToDataBank();
          console.log('[Style Config Manager] Data Bank save result:', success);

          if (success) {
            console.log('[Style Config Manager] ✅ Saved to Data Bank and localStorage backup');
            // Also save to localStorage as backup
            await this.saveConfigToLocalStorage();
            this.applyStyles();
            return true;
          } else {
            console.warn('[Style Config Manager] ⚠️ Data Bank save failed — using localStorage');
          }
        } else {
          console.log('[Style Config Manager] ⚠️ SillyTavern API unavailable — using localStorage');
        }

        // Fallback: save to localStorage
        console.log('[Style Config Manager] 🔄 Saving to localStorage...');
        await this.saveConfigToLocalStorage();
        this.applyStyles();
        console.log('[Style Config Manager] ✅ localStorage save done');
        return true;
      } catch (error) {
        console.error('[Style Config Manager] ❌ Failed to save config:', error);
        return false;
      }
    }

    // Save config to Data Bank
    async saveConfigToDataBank() {
      try {
        console.log('[Style Config Manager] 🔄 Saving to Data Bank...');
        console.log('[Style Config Manager] Filename:', STYLE_CONFIG_FILE_NAME);

        const configJson = JSON.stringify(this.currentConfig, null, 2);
        console.log('[Style Config Manager] Config JSON length:', configJson.length);

        // Clean old default configs first
        await this.cleanupOldDefaultConfigs();

        // Use the standard filename, no timestamp
        const safeFileName = STYLE_CONFIG_FILE_NAME;
        console.log('[Style Config Manager] Using standard filename:', safeFileName);

        const file = new File([configJson], safeFileName, { type: 'application/json' });
        console.log('[Style Config Manager] Created file object:', {
          name: file.name,
          type: file.type,
          size: file.size,
        });

        // Upload to global Data Bank
        console.log('[Style Config Manager] 🔄 Calling uploadFileAttachmentToServer...');
        const fileUrl = await uploadFileAttachmentToServer(file, 'global');
        console.log('[Style Config Manager] Upload URL:', fileUrl);

        // Check that the returned URL is JSON
        const isValidJsonUrl =
          fileUrl && (fileUrl.endsWith('.json') || fileUrl.includes(safeFileName.replace('.json', '')));

        if (fileUrl && isValidJsonUrl) {
          console.log('[Style Config Manager] ✅ Saved to Data Bank (JSON):', fileUrl);

          // Verify the file saved correctly
          console.log('[Style Config Manager] 🔍 Verifying save...');
          setTimeout(async () => {
            try {
              const globalAttachments = getDataBankAttachmentsForSource('global', true);
              const savedConfig = globalAttachments.find(att => att.name === STYLE_CONFIG_FILE_NAME);
              console.log('[Style Config Manager] Verify — file saved:', !!savedConfig);
              if (savedConfig) {
                console.log('[Style Config Manager] Saved file info:', savedConfig);
              }
            } catch (verifyError) {
              console.warn('[Style Config Manager] Verify failed:', verifyError);
            }
          }, 500);

          return true;
        } else if (fileUrl && fileUrl.endsWith('.txt')) {
          console.error('[Style Config Manager] ❌ File was saved as TXT:', fileUrl);
          console.error(
            '[Style Config Manager] uploadFileAttachmentToServer saved the JSON as TXT',
          );
          return false;
        }

        console.warn('[Style Config Manager] ⚠️ uploadFileAttachmentToServer returned an empty or invalid URL');
        return false;
      } catch (error) {
        console.error('[Style Config Manager] ❌ Failed to save to Data Bank:', error);
        return false;
      }
    }

    // Save config to localStorage
    async saveConfigToLocalStorage() {
      try {
        const storageKey = `sillytavern_mobile_${STYLE_CONFIG_FILE_NAME}`;
        const configJson = JSON.stringify(this.currentConfig, null, 2);
        localStorage.setItem(storageKey, configJson);
        console.log('[Style Config Manager] ✅ Saved to localStorage');
      } catch (error) {
        console.warn('[Style Config Manager] Failed to save to localStorage:', error);
      }
    }

    // Apply styles to the page
    applyStyles() {
      if (!this.styleElement) {
        console.warn('[Style Config Manager] Style element missing');
        return;
      }

      const css = this.generateCSS();
      this.styleElement.textContent = css;

      console.log('[Style Config Manager] ✅ Styles applied');
      console.log('[Style Config Manager] Current config:', JSON.stringify(this.currentConfig, null, 2));

      // Validate image URLs
      Object.keys(this.currentConfig).forEach(key => {
        const config = this.currentConfig[key];
        if (config && config.backgroundImage) {
          console.log(`[Style Config Manager] ${key} background URL:`, config.backgroundImage);

          // If http(s), probe the image
          if (config.backgroundImage.startsWith('http')) {
            const img = new Image();
            img.onload = () => console.log(`[Style Config Manager] ✅ ${key} image loaded`);
            img.onerror = () => console.warn(`[Style Config Manager] ❌ ${key} image failed:`, config.backgroundImage);
            img.src = config.backgroundImage;
          }
        }
      });

      // Fire styles-applied event
      this.dispatchStyleAppliedEvent();
    }

    // Build CSS string
    generateCSS() {
      const config = this.currentConfig;

      // Normalize URLs
      const formatImageUrl = url => {
        if (!url) return '';

        // Return base64 as-is
        if (url.startsWith('data:')) {
          return url;
        }

        // Return plain URLs as-is (do not reject .txt)
        // Quote the URL if needed
        if (!url.startsWith('"') && !url.startsWith("'")) {
          return `"${url}"`;
        }

        return url;
      };

      // Build avatar background CSS
      const generateAvatarCSS = (avatarConfig, selector) => {
        if (!avatarConfig || typeof avatarConfig === 'string') {
          // Handle old-format configKey
          const oldConfig = config[avatarConfig];
          if (!oldConfig) return '';

          const backgroundImage = oldConfig.backgroundImage || oldConfig.backgroundImageUrl;
          if (!backgroundImage) return '';

          const rotation = parseFloat(oldConfig.rotation) || 0;
          const scale = parseFloat(oldConfig.scale) || 1;
          const backgroundPosition = oldConfig.backgroundPosition || 'center center';

          return `
${selector} {
    background-image: url(${formatImageUrl(backgroundImage)}) !important;
    background-size: ${scale * 100}% !important;
    background-position: ${backgroundPosition} !important;
    background-repeat: no-repeat !important;
    transform: rotate(${rotation}deg) !important;
    transform-origin: center center !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    max-width: 40px !important;
    min-height: 40px !important;
    max-height: 40px !important;
}`;
        }

        // Handle new-format avatar object
        const backgroundImage = avatarConfig.backgroundImage || avatarConfig.backgroundImageUrl;
        if (!backgroundImage) return '';

        const rotation = parseFloat(avatarConfig.rotation) || 0;
        const scale = parseFloat(avatarConfig.scale) || 1;
        const backgroundPosition = avatarConfig.backgroundPosition || 'center center';

        return `
${selector} {
    background-image: url(${formatImageUrl(backgroundImage)}) !important;
    background-size: ${scale * 100}% !important;
    background-position: ${backgroundPosition} !important;
    background-repeat: no-repeat !important;
    transform: rotate(${rotation}deg) !important;
    transform-origin: center center !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    max-width: 40px !important;
    min-height: 40px !important;
    max-height: 40px !important;
}`;
      };

      let css = `
/* Mobile styles — generated by StyleConfigManager */
.home-screen {
    ${
      config.homeScreen.backgroundImage
        ? `background-image: url(${formatImageUrl(config.homeScreen.backgroundImage)}) !important;
         background-size: cover !important;
         background-position: center !important;
         background-repeat: no-repeat !important;`
        : config.homeScreen.backgroundImageUrl
        ? `background-image: url(${formatImageUrl(config.homeScreen.backgroundImageUrl)}) !important;
         background-size: cover !important;
         background-position: center !important;
         background-repeat: no-repeat !important;`
        : `background: `
    }
}

.message-detail-app {
    ${
      config.messageDetailApp.backgroundImage
        ? `background-image: url(${formatImageUrl(config.messageDetailApp.backgroundImage)}) !important;
         background-size: cover !important;
         background-position: center !important;
         background-repeat: no-repeat !important;`
        : config.messageDetailApp.backgroundImageUrl
        ? `background-image: url(${formatImageUrl(config.messageDetailApp.backgroundImageUrl)}) !important;
         background-size: cover !important;
         background-position: center !important;
         background-repeat: no-repeat !important;`
        : `background: #;`
    }
}

.messages-app {
    ${
      config.messagesApp.backgroundImage
        ? `background-image: url(${formatImageUrl(config.messagesApp.backgroundImage)}) !important;
         background-size: cover !important;
         background-position: ${config.messagesApp.backgroundPosition || 'center center'} !important;
         background-repeat: no-repeat !important;`
        : config.messagesApp.backgroundImageUrl
        ? `background-image: url(${formatImageUrl(config.messagesApp.backgroundImageUrl)}) !important;
         background-size: cover !important;
         background-position: ${config.messagesApp.backgroundPosition || 'center center'} !important;
         background-repeat: no-repeat !important;`
        : `background: #;`
    }
}

/* Hide emoji text in avatars — show the background image only */
.message-avatar {
    font-size: 0 !important;
    color: transparent !important;
    text-indent: -9999px !important;
    overflow: hidden !important;
}

/* Avatar background styles */
${(() => {
  const sentAvatarCSS = generateAvatarCSS(config.messageSentAvatar, '.message-sent > .message-avatar');
  console.log(`[Style Config Manager] Sent-avatar config:`, config.messageSentAvatar);
  console.log(`[Style Config Manager] Sent-avatar CSS:`, sentAvatarCSS);
  return sentAvatarCSS;
})()}
${
  config.messageReceivedAvatars
    ? config.messageReceivedAvatars
        .map((avatar, index) => {
          if (avatar.friendId && avatar.friendId.trim()) {
            console.log(
              `[Style Config Manager] ✅ Generated received-avatar CSS: ${avatar.name || `Avatar ${index + 1}`} (ID: ${
                avatar.friendId
              })`,
            );
            console.log(`[Style Config Manager] Avatar config:`, avatar);
            // Emit two selectors for both page layouts
            const css1 = generateAvatarCSS(
              avatar,
              `.message-item[data-friend-id="${avatar.friendId}"] .message-avatar`,
            );
            const css2 = generateAvatarCSS(avatar, `.message-received #message-avatar-${avatar.friendId}`);
            console.log(`[Style Config Manager] CSS 1:`, css1);
            console.log(`[Style Config Manager] CSS 2:`, css2);
            return css1 + '\n' + css2;
          } else {
            console.warn(
              `[Style Config Manager] ⚠️ Skipping invalid avatar config: ${avatar.name || `Avatar ${index + 1}`} — missing friend ID`,
            );
            return '';
          }
        })
        .join('\n')
    : ''
}
        `.trim();

      // Add per-friend background CSS
      if (config.friendBackgrounds && config.friendBackgrounds.length > 0) {
        css += '\n\n/* Per-friend chat background */\n';
        config.friendBackgrounds.forEach(friendBg => {
          if (friendBg.friendId && friendBg.friendId.trim()) {
            const backgroundImage = friendBg.backgroundImage || friendBg.backgroundImageUrl;
            if (backgroundImage) {
              const backgroundPosition = friendBg.backgroundPosition || 'center center';
              const rotation = parseFloat(friendBg.rotation) || 0;
              const scale = parseFloat(friendBg.scale) || 1;

              css += `
.message-detail-content[data-background-id="${friendBg.friendId}"] {
    background-image: url(${formatImageUrl(backgroundImage)}) !important;
    background-size: cover !important;
    background-position: ${backgroundPosition} !important;
    background-repeat: no-repeat !important;
    transform: rotate(${rotation}deg) scale(${scale}) !important;
    transform-origin: center center !important;
}
`;
              console.log(`[Style Config Manager] ✅ Generated per-friend background CSS: ${friendBg.name || friendBg.friendId}`);
            }
          }
        });
      }

      // Add custom CSS
      if (config.customStyles && config.customStyles.cssText) {
        css += '\n\n/* User custom CSS */\n' + config.customStyles.cssText;
      }

      console.log('[Style Config Manager] Generated CSS:', css);
      return css;
    }

    // Get current config
    getConfig() {
      return JSON.parse(JSON.stringify(this.currentConfig));
    }

    // Update a config field
    updateConfig(key, property, value) {
      // Handle array configs (messageReceivedAvatars, friendBackgrounds)
      if ((key === 'messageReceivedAvatars' || key === 'friendBackgrounds') && property === null) {
        this.currentConfig[key] = value;
        console.log(`[Style Config Manager] Array config updated: ${key} = `, value);
        return true;
      }

      // Handle object configs
      if (this.currentConfig[key] && this.currentConfig[key].hasOwnProperty(property)) {
        this.currentConfig[key][property] = value;
        console.log(`[Style Config Manager] Config updated: ${key}.${property} = ${value}`);
        return true;
      }

      console.warn(`[Style Config Manager] Invalid config key: ${key}.${property}`);
      return false;
    }

    // Batch-update config
    updateMultipleConfigs(updates) {
      let hasChanges = false;

      for (const update of updates) {
        if (this.updateConfig(update.key, update.property, update.value)) {
          hasChanges = true;
        }
      }

      return hasChanges;
    }

    // Merge config objects
    mergeConfigs(defaultConfig, userConfig) {
      const merged = JSON.parse(JSON.stringify(defaultConfig));

      for (const key in userConfig) {
        if (userConfig.hasOwnProperty(key) && merged.hasOwnProperty(key)) {
          // Handle array configs (messageReceivedAvatars)
          if (Array.isArray(userConfig[key])) {
            merged[key] = userConfig[key];
          } else if (typeof userConfig[key] === 'object' && userConfig[key] !== null) {
            merged[key] = { ...merged[key], ...userConfig[key] };
          } else {
            merged[key] = userConfig[key];
          }
        }
      }

      // Migrate old single messageReceivedAvatar to an array
      if (userConfig.messageReceivedAvatar && !userConfig.messageReceivedAvatars) {
        console.log('[Style Config Manager] Old avatar format detected — migrating...');
        merged.messageReceivedAvatars = [
          {
            id: 'migrated_default',
            ...userConfig.messageReceivedAvatar,
            name: 'Migrated friend avatar',
            description: 'Received-message avatar migrated from old config',
          },
        ];
      }

      return merged;
    }

    // List all style config files
    async getAllStyleConfigs() {
      try {
        if (sillyTavernCoreImported && getDataBankAttachmentsForSource) {
          // List Data Bank config files
          const globalAttachments = getDataBankAttachmentsForSource('global', true);
          const styleConfigs = globalAttachments.filter(att => att.name.endsWith('_style_config.json'));

          // Drop timestamped old default files
          const validConfigs = styleConfigs.filter(att => {
            // Keep the standard default config file
            if (att.name === STYLE_CONFIG_FILE_NAME) {
              return true;
            }
            // Drop timestamped default files
            if (att.name.startsWith('mobile_config_') && att.name.includes('_mobile_style_config.json')) {
              console.log('[Style Config Manager] Filtered timestamped old defaults:', att.name);
              return false;
            }
            // Keep other user config files
            return true;
          });

          // Show the default config once, first
          const defaultConfigs = validConfigs.filter(att => att.name === STYLE_CONFIG_FILE_NAME);
          const userConfigs = validConfigs.filter(att => att.name !== STYLE_CONFIG_FILE_NAME);

          // If several default configs exist, keep one
          const finalConfigs = [];
          if (defaultConfigs.length > 0) {
            finalConfigs.push(defaultConfigs[0]); // Keep only the first default config
          }
          finalConfigs.push(...userConfigs);

          console.log(
            '[Style Config Manager] Found valid config file:',
            finalConfigs.map(c => c.name),
          );
          return finalConfigs;
        }

        // Fallback: read localStorage
        const configs = [];
        const configKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sillytavern_mobile_') && key.endsWith('_style_config.json')) {
            configKeys.push(key);
          }
        }

        // Handle default config
        const defaultKey = `sillytavern_mobile_${STYLE_CONFIG_FILE_NAME}`;
        const userKeys = configKeys.filter(key => key !== defaultKey);

        if (configKeys.includes(defaultKey)) {
          configs.push({
            name: STYLE_CONFIG_FILE_NAME,
            url: `localStorage://${defaultKey}`,
            source: 'localStorage',
            created: Date.now(),
          });
        }

        // Add user configs
        userKeys.forEach(key => {
          const fileName = key.replace('sillytavern_mobile_', '');
          configs.push({
            name: fileName,
            url: `localStorage://${key}`,
            source: 'localStorage',
            created: Date.now(),
          });
        });

        return configs;
      } catch (error) {
        console.warn('[Style Config Manager] Failed to get config list:', error);
        return [];
      }
    }

    // Load a named config file
    async loadConfigFromFile(fileName) {
      try {
        if (sillyTavernCoreImported && getDataBankAttachmentsForSource && getFileAttachment) {
          // Load from Data Bank
          const globalAttachments = getDataBankAttachmentsForSource('global', true);
          const configAttachment = globalAttachments.find(att => att.name === fileName);

          if (configAttachment) {
            const configContent = await getFileAttachment(configAttachment.url);
            if (configContent && configContent.trim()) {
              const parsedConfig = JSON.parse(configContent);
              this.currentConfig = this.mergeConfigs(DEFAULT_STYLE_CONFIG, parsedConfig);
              this.applyStyles();
              console.log('[Style Config Manager] ✅ Loaded config:', fileName);
              return true;
            }
          }
        }

        // Fallback: load from localStorage
        const storageKey = `sillytavern_mobile_${fileName}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsedConfig = JSON.parse(stored);
          this.currentConfig = this.mergeConfigs(DEFAULT_STYLE_CONFIG, parsedConfig);
          this.applyStyles();
          console.log('[Style Config Manager] ✅ Loaded from localStorage:', fileName);
          return true;
        }

        return false;
      } catch (error) {
        console.error('[Style Config Manager] Failed to load config file:', error);
        return false;
      }
    }

    // Save config under a given name
    async saveConfigWithName(configName) {
      try {
        // Validate config name
        if (!configName || configName.trim() === '') {
          throw new Error('Config name cannot be empty');
        }

        // Avoid clashing with the default config
        const cleanName = configName.trim();
        if (cleanName === 'mobile' || cleanName === 'default' || cleanName === 'Default') {
          throw new Error('Cannot use "mobile", "default", or "Default" as a config name — those are reserved');
        }

        // Normalize the filename
        const fileName = cleanName.endsWith('.json') ? cleanName : `${cleanName}_style_config.json`;

        // Check for a default-config filename clash
        if (fileName === STYLE_CONFIG_FILE_NAME) {
          throw new Error('That name conflicts with the default config — pick another');
        }

        if (sillyTavernCoreImported && uploadFileAttachmentToServer) {
          // Save to Data Bank
          const configJson = JSON.stringify(this.currentConfig, null, 2);
          const file = new File([configJson], fileName, { type: 'application/json' });

          const fileUrl = await uploadFileAttachmentToServer(file, 'global');
          if (fileUrl) {
            console.log('[Style Config Manager] ✅ Saved as:', fileName);

            // Also save to localStorage
            const storageKey = `sillytavern_mobile_${fileName}`;
            localStorage.setItem(storageKey, configJson);

            return true;
          }
        }

        // Fallback: save to localStorage
        const storageKey = `sillytavern_mobile_${fileName}`;
        const configJson = JSON.stringify(this.currentConfig, null, 2);
        localStorage.setItem(storageKey, configJson);
        console.log('[Style Config Manager] ✅ Saved to localStorage:', fileName);
        return true;
      } catch (error) {
        console.error('[Style Config Manager] Failed to save config:', error);
        throw error; // Re-throw so the caller can handle it
      }
    }

    // Delete a config file
    async deleteConfigFile(fileName) {
      try {
        if (sillyTavernCoreImported && getDataBankAttachmentsForSource && deleteAttachment) {
          // Delete from Data Bank
          const globalAttachments = getDataBankAttachmentsForSource('global', true);
          const configAttachment = globalAttachments.find(att => att.name === fileName);

          if (configAttachment) {
            console.log('[Style Config Manager] 🗑️ Deleting from Data Bank:', fileName);
            // Use deleteAttachment with confirm=false to skip the dialog
            await deleteAttachment(configAttachment, 'global', () => {}, false);
            console.log('[Style Config Manager] ✅ Deleted from Data Bank:', fileName);
          }
        }

        // Delete from localStorage
        const storageKey = `sillytavern_mobile_${fileName}`;
        localStorage.removeItem(storageKey);
        console.log('[Style Config Manager] ✅ Deleted from localStorage:', fileName);
        return true;
      } catch (error) {
        console.error('[Style Config Manager] Failed to delete config:', error);
        return false;
      }
    }

    // Build config-list HTML
    async generateConfigListSection() {
      const configs = await this.getAllStyleConfigs();

      let configListHTML = '';

      if (configs.length === 0) {
        configListHTML = `
                <div class="no-configs">
                    <p>No saved configs</p>
                    <small>Saved configs will show up here</small>
                </div>
            `;
      } else {
        configListHTML = configs
          .map(config => {
            // Format display name
            let displayName;
            const isDefault = config.name === STYLE_CONFIG_FILE_NAME;

            if (isDefault) {
              displayName = 'Default config';
            } else if (config.name.startsWith('mobile_config_') && config.name.includes('_mobile_style_config.json')) {
              // Handle timestamped default files: mobile_config_timestamp_mobile_style_config.json
              const match = config.name.match(/mobile_config_(\d+)_mobile_style_config\.json/);
              if (match) {
                const timestamp = match[1];
                const date = new Date(parseInt(timestamp));
                displayName = `Default config (${date.toLocaleString()})`;
              } else {
                displayName = config.name.replace('_style_config.json', '');
              }
            } else {
              // Handle normal user config files
              displayName = config.name.replace('_style_config.json', '');
            }

            const createTime = config.created ? new Date(config.created).toLocaleString() : 'Unknown';

            return `
                    <div class="config-item" data-config-file="${config.name}">
                        <div class="config-info">
                            <div class="config-name">
                                ${isDefault ? '🏠' : '📄'} ${displayName}
                                ${isDefault ? '<span class="default-badge">Default</span>' : ''}
                            </div>
                            <div class="config-meta">
                                <small>Created: ${createTime}</small>
                                ${config.source ? `<small>Source: ${config.source}</small>` : ''}
                            </div>
                        </div>
                        <div class="config-actions">
                            <button class="config-action-btn load-config" data-config-file="${
                              config.name
                            }" title="Load this config">
                                📥 Load
                            </button>
                            ${
                              !isDefault
                                ? `
                                <button class="config-action-btn delete-config" data-config-file="${config.name}" title="Delete this config">
                                    🗑️ Delete
                                </button>
                            `
                                : ''
                            }
                        </div>
                    </div>
                `;
          })
          .join('');
      }

      return `
            <div class="config-list-section">
                <div class="section-header">
                    <h3>📋 Saved configs</h3>
                    <p>Manage your saved style files</p>
                </div>

                <div class="save-new-config">
                    <div class="save-config-input">
                        <input type="text" id="new-config-name" placeholder="Config name..." maxlength="50">
                        <button id="save-new-config-btn" class="config-btn save-btn">
                            <span class="btn-icon">💾</span>
                            <span>Save As</span>
                        </button>
                    </div>
                </div>

                <div class="config-list">
                    ${configListHTML}
                </div>

                <div class="config-list-actions">
                    <button id="refresh-config-list" class="config-btn">
                        <span class="btn-icon">🔄</span>
                        <span>Refresh list</span>
                    </button>
                </div>
            </div>
        `;
    }

    // Reset to default config
    resetToDefault() {
      this.currentConfig = JSON.parse(JSON.stringify(DEFAULT_STYLE_CONFIG));
      console.log('[Style Config Manager] Config reset to defaults');
    }

    // Build settings-app HTML
    getSettingsAppContent() {
      const config = this.getConfig(); // getConfig() so we use the latest values

      return `
            <div class="style-config-app">
                <div class="style-config-header">
                    <h2>🎨 Mobile UI styles</h2>
                    <p>Customize mobile backgrounds and styles. Config is stored in the global Data Bank.</p>
                </div>

                <div class="style-config-tabs">
                    <div class="tab-headers">
                        <button class="tab-header active" data-tab="editor">
                            ✏️ Style editor
                        </button>
                        <button class="tab-header" data-tab="manager">
                            📋 Config manager
                        </button>
                    </div>

                    <div class="m-tab-content">
                        <div class="tab-panel active" data-tab="editor">
                <div class="style-config-settings">
                    <div class="image-upload-settings">
                        <h4>🔧 Image upload</h4>
                        <div class="setting-item">
                            <label>
                                <input type="radio" name="imageUploadMode" value="auto" checked>
                                <span>Auto</span>
                                <small>Data Bank first, base64 if that fails</small>
                            </label>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="radio" name="imageUploadMode" value="base64">
                                <span>Base64</span>
                                <small>Store as base64 — larger file, more reliable</small>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="style-config-content">
                    ${this.generateConfigSection('homeScreen', 'Home screen background', config.homeScreen)}
                    ${this.generateFriendBackgroundsSection(config.friendBackgrounds || [])}
                    ${this.generateConfigSection('messagesApp', 'Messages app background', config.messagesApp)}
                                ${this.generateAvatarConfigSection(
                                  'messageSentAvatar',
                                  'Sent-message avatar background',
                                  config.messageSentAvatar,
                                )}
            ${this.generateReceivedAvatarsSection(config.messageReceivedAvatars)}
                    ${this.generateCustomStylesSection('customStyles', 'Custom CSS', config.customStyles)}
                            </div>
                        </div>

                        <div class="tab-panel" data-tab="manager">
                            <div class="config-list-section">
                                <div class="section-header">
                                    <h3>📋 Saved configs</h3>
                                    <p>Manage saved style files. Use Save As at the bottom of the editor to create one.</p>
                                </div>



                                <div class="config-list" id="config-list-container">
                                    <div class="loading-configs">
                                        <div class="loading-icon">⏳</div>
                                        <div class="loading-text">Loading config list...</div>
                                    </div>
                                </div>

                                <div class="config-list-actions">
                                    <button id="refresh-config-list" class="config-btn">
                                        <span>Refresh</span>
                                    </button>
                                    <button id="export-config" class="config-btn preview-btn">
                                        <span>Export</span>
                                    </button>
                                    <button id="import-config" class="config-btn save-btn">
                                        <span>Import</span>
                                    </button>
                                </div>

                                <input type="file" id="config-import-input" accept=".json" style="display: none;">
                            </div>
                        </div>


                    </div>
                </div>

                <div class="style-config-footer">
                    <div class="config-actions">
                        <button class="config-btn preview-btn" id="preview-styles">
                            <span>Preview styles</span>
                        </button>
                        <button class="config-btn save-btn" id="save-new-config-btn">
                            <span>Save As</span>
                        </button>
                        <button class="config-btn reset-btn" id="reset-styles">
                            <span>Reset default</span>
                        </button>
                    </div>

                    <div class="config-status" id="config-status">
                        <span class="status-icon">ℹ️</span>
                        <span class="status-text">Click Save As when you are done</span>
                    </div>
                </div>

                <style>
                /* Styles scoped to data-app="settings" */
                [data-app="settings"] {
                    padding: 0 !important;
                    margin: 0 !important;
                    max-height: 100vh !important;
                }

                [data-app="settings"] .style-config-app {
                    margin: 0 !important;
                    padding: 0 !important;
                    max-width: 100% !important;
                    background: transparent !important;
                }

                /* Style-config app chrome */
                .style-config-app {
                    max-width: 1200px;
                    margin: 0 auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    border-radius: 12px;
                }

                /* Header inside data-app="settings" */
                [data-app="settings"] .style-config-header {
                    margin-bottom: 12px !important;
                    padding: 12px 16px !important;
                    border-radius: 8px !important;
                }

                [data-app="settings"] .style-config-header h2 {
                    font-size: 16px !important;
                    margin: 0 0 4px 0 !important;
                }

                [data-app="settings"] .style-config-header p {
                    font-size: 12px !important;
                    margin: 0 !important;
                }

                .style-config-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                }

                .style-config-header h2 {
                    margin: 0 0 10px 0;
                    color: #2d3748;
                    font-size: 17px;
                    font-weight: 600;
                }

                .style-config-header p {
                    margin: 0;
                    color: #718096;
                    font-size: 14px;
                }

                /* Tabs inside data-app="settings" */
                [data-app="settings"] .style-config-tabs {
                    border-radius: 8px !important;
                }

                [data-app="settings"] .tab-header {
                    padding: 10px 16px !important;
                    font-size: 14px !important;
                    border-bottom: 2px solid transparent !important;
                }

                [data-app="settings"] .m-tab-content {
                    min-height: auto !important;
                    padding: 0 !important;
                }

                /* Tab styles */
                .style-config-tabs {
                    border-radius: 12px;
                    overflow: hidden;
                }

                .tab-headers {
                    display: flex;
                    background: #f7fafc;
                    border-bottom: 1px solid #e2e8f0;
                }

                .tab-header {
                    flex: 1;
                    padding: 16px 24px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                    color: #718096;
                    transition: all 0.3s ease;
                    border-bottom: 3px solid transparent;
                }

                .tab-header:hover {
                    background: #edf2f7;
                    color: #4a5568;
                }

                .tab-header.active {
                    background: white;
                    color: #3182ce;
                    border-bottom-color: #3182ce;
                }

                .m-tab-content {
                    min-height: 500px;
                }

                .tab-panel {
                    display: none;
                    animation: fadeIn 0.3s ease;
                }

                .tab-panel.active {
                    display: block;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Settings area inside data-app="settings" */
                [data-app="settings"] .style-config-settings {
                    margin-bottom: 16px !important;
                }

                [data-app="settings"] .image-upload-settings {
                    padding: 12px !important;
                    margin-bottom: 12px !important;
                    border-radius: 8px !important;
                }

                [data-app="settings"] .image-upload-settings h4 {
                    font-size: 14px !important;
                    margin: 0 0 8px 0 !important;
                }

                /* Settings-area styles */
                .style-config-settings {
                    margin-bottom: 30px;
                }

                .image-upload-settings {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                }

                .image-upload-settings h4 {
                    margin: 0 0 16px 0;
                    color: #856404;
                    font-size: 16px;
                    font-weight: 600;
                }

                .setting-item {
                    margin-bottom: 12px;
                }

                .setting-item label {
                    display: flex;
                    align-items: flex-start;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    transition: background-color 0.2s;
                }

                .setting-item label:hover {
                    background: rgba(133, 100, 4, 0.1);
                }

                .setting-item input[type="radio"] {
                    margin-right: 12px;
                    margin-top: 2px;
                }

                .setting-item span {
                    font-weight: 500;
                    color: #856404;
                    margin-bottom: 4px;
                }

                .setting-item small {
                    display: block;
                    color: #6c757d;
                    font-size: 13px;
                    line-height: 1.4;
                }

                /* Config sections inside data-app="settings" */
                [data-app="settings"] .config-section {
                    margin-bottom: 12px !important;
                    border-radius: 8px !important;
                    padding: 0 !important;
                }

                [data-app="settings"] .section-header {
                    padding: 12px 16px !important;
                }

                [data-app="settings"] .section-header h3 {
                    font-size: 16px !important;
                    margin: 0 0 4px 0 !important;
                }

                [data-app="settings"] .section-header p {
                    font-size: 12px !important;
                    margin: 0 0 8px 0 !important;
                }

                [data-app="settings"] .section-fields {
                    padding: 12px 16px !important;
                }

                /* Section styles */
                .config-section {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 0;
                    margin-bottom: 24px;
                    border: 1px solid #e2e8f0;
                }

                .section-header h3 {
                    margin: 0 0 8px 0;
                    color: #2d3748;
                    font-size: 20px;
                    font-weight: 600;
                }

                .section-header p {
                    margin: 0 0 20px 0;
                    color: #718096;
                    font-size: 14px;
                }

                /* Image-upload fields inside data-app="settings" */
                [data-app="settings"] .image-upload-field {
                    margin-bottom: 16px !important;
                }

                [data-app="settings"] .image-upload-field label {
                    margin-bottom: 8px !important;
                    font-size: 13px !important;
                }

                [data-app="settings"] .image-upload-container {
                    padding: 12px !important;
                    border-radius: 8px !important;
                }

                [data-app="settings"] .image-preview {
                    min-height: 80px !important;
                    margin-bottom: 8px !important;
                }

                [data-app="settings"] .image-preview img {
                    max-height: 80px !important;
                }

                [data-app="settings"] .upload-btn,
                [data-app="settings"] .remove-btn {
                    padding: 6px 12px !important;
                    font-size: 12px !important;
                }

                /* Image-upload field styles */
                .image-upload-field {
                    margin-bottom: 24px;
                }

                .image-upload-field label {
                    display: block;
                    margin-bottom: 12px;
                    font-weight: 600;
                    color: #4a5568;
                }

                .image-upload-container {
                    border: 2px dashed #cbd5e0;
                    border-radius: 12px;
                    padding: 20px;
                    background: white;
                    transition: all 0.3s ease;
                }

                .image-upload-container:hover {
                    border-color: #3182ce;
                    background: #f7fafc;
                }

                .image-preview {
                    margin-bottom: 16px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #f7fafc;
                    min-height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .image-preview img {
                    max-width: 100%;
                    max-height: 120px;
                    object-fit: cover;
                    border-radius: 8px;
                }

                .no-image {
                    color: #a0aec0;
                    font-size: 18px;
                    padding: 40px;
                    text-align: center;
                }

                .image-upload-controls {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .upload-btn, .remove-btn {
                    padding: 10px 16px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }

                .upload-btn {
                    background: #3182ce;
                    color: white;
                }

                .upload-btn:hover {
                    background: #2c5aa0;
                    transform: translateY(-1px);
                }

                .remove-btn {
                    background: #e53e3e;
                    color: white;
                }

                .remove-btn:hover {
                    background: #c53030;
                    transform: translateY(-1px);
                }

                /* Custom CSS area */
                .custom-css-field {
                    margin-bottom: 24px;
                }

                .custom-css-container {
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                    background: white;
                }

                .custom-css-textarea {
                    width: 100%;
                    padding: 16px;
                    border: none;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    background: #1a202c;
                    color: #e2e8f0;
                    resize: vertical;
                    min-height: 200px;
                    border-radius: 0;
                    outline: none;
                }

                .custom-css-textarea:focus {
                    background: #2d3748;
                    box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
                }

                .css-help {
                    padding: 12px 16px;
                    background: #f7fafc;
                    border-top: 1px solid #e2e8f0;
                    color: #4a5568;
                }

                /* Buttons inside data-app="settings" */
                [data-app="settings"] .config-btn {
                    padding: 8px 16px !important;
                    font-size: 12px !important;
                    margin-right: 8px !important;
                    border-radius: 6px !important;
                }

                [data-app="settings"] .style-config-footer {
                    padding: 12px 16px !important;
                    position: static !important;
                }

                [data-app="settings"] .config-actions {
                    margin-bottom: 8px !important;
                    gap: 0 !important;
                }

                [data-app="settings"] .config-status {
                    padding: 8px 12px !important;
                    font-size: 12px !important;
                    margin-top: 8px !important;
                }

                /* Button styles */
                .config-btn {
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.3s ease;
                    margin-right: 12px;
                }

                .config-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }

                .save-btn {
                    background: #38a169;
                    color: white;
                }

                .save-btn:hover {
                    background: #2f855a;
                }

                .preview-btn {
                    background: #3182ce;
                    color: white;
                }

                .preview-btn:hover {
                    background: #2c5aa0;
                }

                .reset-btn {
                    background: #ed8936;
                    color: white;
                }

                .reset-btn:hover {
                    background: #dd6b20;
                }

                .danger-btn {
                    background: #e53e3e;
                    color: white;
                }

                .danger-btn:hover {
                    background: #c53030;
                }

                /* Status */
                .config-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    margin-top: 16px;
                }

                .config-status.info {
                    background: #bee3f8;
                    color: #2c5aa0;
                    border: 1px solid #90cdf4;
                }

                .config-status.success {
                    background: #c6f6d5;
                    color: #2f855a;
                    border: 1px solid #9ae6b4;
                }

                .config-status.error {
                    background: #fed7d7;
                    color: #c53030;
                    border: 1px solid #feb2b2;
                }

                .config-status.loading {
                    background: #fefcbf;
                    color: #d69e2e;
                    border: 1px solid #faf089;
                }

                /* Config-list styles */
                .config-item {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.3s ease;
                }

                .no-configs {
                    text-align: center;
                    padding: 40px;
                    color: #718096;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }

                .config-item:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    transform: translateY(-1px);
                }

                .config-name {
                    font-weight: 600;
                    color: #2d3748;
                    margin-bottom: 4px;
                    word-break: break-all;
                }

                .default-badge {
                    background: #3182ce;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    margin-left: 8px;
                }

                .config-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                    margin-top:20px
                }

                .config-action-btn {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                }

                .config-action-btn.load-config {
                    background: #3182ce;
                    color: white;
                }

                .config-action-btn.delete-config {
                    background: #e53e3e;
                    color: white;
                }

                .config-action-btn:hover {
                    transform: translateY(-1px);
                }

                /* Loading animation */
                .loading-configs {
                    text-align: center;
                    padding: 40px;
                    color: #718096;
                }

                .loading-icon {
                    font-size: 24px;
                    margin-bottom: 12px;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Avatar fields inside data-app="settings" */
                [data-app="settings"] .avatar-config-section {
                    border-left: 3px solid #8b5cf6 !important;
                }

                [data-app="settings"] .avatar-control-field {
                    margin-bottom: 12px !important;
                }

                [data-app="settings"] .avatar-card {
                    margin-bottom: 12px !important;
                }

                [data-app="settings"] .avatar-card-header {
                    padding: 12px 16px !important;
                }

                [data-app="settings"] .avatar-card-content {
                    padding: 12px 16px !important;
                    gap: 12px !important;
                }

                [data-app="settings"] .avatar-preview-circle {
                    width: 32px !important;
                    height: 32px !important;
                }

                [data-app="settings"] .avatar-input,
                [data-app="settings"] .avatar-number {
                    padding: 6px 8px !important;
                    font-size: 12px !important;
                }

                [data-app="settings"] .add-avatar-btn {
                    padding: 8px 16px !important;
                    font-size: 12px !important;
                }

                /* Avatar-section styles */
                .avatar-config-section {
                    border-left: 4px solid #8b5cf6;
                    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                }

                .avatar-control-field {
                    margin-bottom: 20px;
                }

                .control-input-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-top: 8px;
                }

                .control-range {
                    flex: 1;
                    height: 6px;
                    border-radius: 3px;
                    background: #e2e8f0;
                    outline: none;
                    cursor: pointer;
                }

                .control-range::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #8b5cf6;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .control-range::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #8b5cf6;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .control-number {
                    width: 80px;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    text-align: center;
                    font-weight: 500;
                }

                .avatar-preview-field {
                    background: #ffffff;
                    border: 2px dashed #8b5cf6;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    margin-top: 20px;
                }

                .avatar-preview-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                }

                .avatar-preview {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 60px;
                    height: 60px;
                    background: #f8fafc;
                    border-radius: 50%;
                    border: 2px solid #e2e8f0;
                    overflow: hidden;
                    position: relative;
                }

                .avatar-preview-circle {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #f0f0f0;
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    transition: all 0.3s ease;
                    border: 1px solid #d1d5db;
                }

                .preview-info {
                    color: #6b7280;
                    font-size: 12px;
                    margin-top: 8px;
                }

                /* Avatar-card styles */
                .avatars-section {
                    background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
                    border: 2px solid #7c3aed;
                }

                .avatars-container {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .avatar-card {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .avatar-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(139, 92, 246, 0.15);
                }

                .avatar-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border-bottom: 1px solid #e2e8f0;
                }

                .avatar-card-title {
                    flex: 1;
                    margin-right: 12px;
                }

                .avatar-name-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    background: white;
                    transition: border-color 0.2s;
                }

                .avatar-name-input:focus {
                    outline: none;
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
                }

                .avatar-card-actions {
                    display: flex;
                    gap: 8px;
                }

                .avatar-action-btn {
                    padding: 6px 8px;
                    border: none;
                    border-radius: 6px;
                    background: #f3f4f6;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }

                .avatar-action-btn:hover {
                    background: #e5e7eb;
                    transform: scale(1.05);
                }

                .avatar-action-btn.delete-btn:hover {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .avatar-card-content {
                    padding: 20px;
                    display: flex;
                    gap: 20px;
                }

                .avatar-preview-section {
                    flex-shrink: 0;
                    text-align: center;
                }

                .avatar-preview {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .avatar-preview-circle {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #f0f0f0;
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    border: 2px solid #e2e8f0;
                    transition: all 0.3s ease;
                }

                .avatar-preview-label {
                    font-size: 12px;
                    color: #6b7280;
                    font-weight: 500;
                }

                .avatar-fields {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                /* Friend-background styles */
                .friend-backgrounds-section {
                    border-left: 4px solid #10b981;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                }

                .backgrounds-container {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .background-card {
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .background-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
                }

                .background-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border-bottom: 1px solid #e2e8f0;
                }

                .background-card-title {
                    flex: 1;
                    margin-right: 12px;
                }

                .background-name-input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .background-name-input:focus {
                    outline: none;
                    border-color: #10b981;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                }

                .background-card-actions {
                    display: flex;
                    gap: 8px;
                }

                .background-action-btn {
                    padding: 6px 8px;
                    border: none;
                    border-radius: 6px;
                    background: #f3f4f6;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .background-action-btn:hover {
                    background: #e5e7eb;
                }

                .background-action-btn.delete-btn:hover {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .background-card-content {
                    padding: 20px;
                    display: flex;
                    gap: 20px;
                }

                .background-preview-section {
                    flex-shrink: 0;
                    text-align: center;
                }

                .background-preview {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .background-preview-rect {
                    width: 80px;
                    height: 60px;
                    border-radius: 8px;
                    background: #f0f0f0;
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    border: 2px solid #e2e8f0;
                    transition: all 0.3s ease;
                }

                .background-preview-label {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 4px;
                }

                .background-fields {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .background-input, .background-range, .background-number {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .background-input:focus, .background-number:focus {
                    outline: none;
                    border-color: #10b981;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                }

                .background-range {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 6px;
                    background: #e2e8f0;
                    border-radius: 3px;
                    outline: none;
                }

                .background-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #10b981;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .background-range::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    background: #10b981;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .background-file-input {
                    display: none;
                }

                .background-remove-btn {
                    padding: 6px 8px;
                    background: #fee2e2;
                    color: #dc2626;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }

                .background-remove-btn:hover {
                    background: #fecaca;
                }

                .background-actions {
                    text-align: center;
                    margin-top: 20px;
                }

                .add-background-btn {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .add-background-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                }

                .empty-backgrounds {
                    text-align: center;
                    padding: 40px 20px;
                    color: #6b7280;
                }

                .empty-icon {
                    font-size: 48px;
                    margin-bottom: 16px;
                }

                .empty-text {
                    font-size: 16px;
                    font-weight: 500;
                    margin-bottom: 8px;
                }

                .empty-hint {
                    font-size: 14px;
                    opacity: 0.8;
                }

                .avatar-input, .avatar-range, .avatar-number {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .avatar-input:focus, .avatar-number:focus {
                    outline: none;
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
                }

                .avatar-range {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 6px;
                    background: #e2e8f0;
                    border-radius: 3px;
                    outline: none;
                }

                .avatar-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #8b5cf6;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .avatar-range::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    background: #8b5cf6;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .avatar-file-input {
                    display: none;
                }

                .avatar-remove-btn {
                    padding: 6px 8px;
                    border: none;
                    border-radius: 4px;
                    background: #fee2e2;
                    color: #dc2626;
                    cursor: pointer;
                    font-size: 12px;
                    transition: background-color 0.2s;
                }

                .avatar-remove-btn:hover {
                    background: #fecaca;
                }

                .avatar-actions {
                    margin-top: 20px;
                    text-align: center;
                }

                .add-avatar-btn {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .add-avatar-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                }

                /* Config status indicator */
                .field-status {
                    display: block;
                    margin-top: 4px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 500;
                }

                .field-status.valid {
                    background: #d1fae5;
                    color: #065f46;
                    border: 1px solid #10b981;
                }

                .field-status.invalid {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 1px solid #ef4444;
                }

                .config-field input[required]:invalid {
                    border-color: #ef4444;
                    box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.2);
                }

                .config-field input[required]:valid {
                    border-color: #10b981;
                    box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2);
                }

                /* Compact styles inside data-app="settings" */
                [data-app="settings"] .config-field {
                    margin-bottom: 12px !important;
                }

                [data-app="settings"] .config-field label {
                    margin-bottom: 6px !important;
                    font-size: 13px !important;
                }

                [data-app="settings"] .config-input {
                    padding: 8px 12px !important;
                    font-size: 13px !important;
                    border-radius: 6px !important;
                }

                [data-app="settings"] .custom-css-textarea {
                    min-height: 120px !important;
                    padding: 12px !important;
                    font-size: 12px !important;
                }

                [data-app="settings"] .css-help {
                    padding: 8px 12px !important;
                    font-size: 11px !important;
                }

                [data-app="settings"] .config-item {
                    padding: 12px !important;
                    margin-bottom: 8px !important;
                }

                [data-app="settings"] .config-name {
                    font-size: 13px !important;
                    margin-bottom: 2px !important;
                }

                [data-app="settings"] .config-action-btn {
                    padding: 4px 8px !important;
                    font-size: 11px !important;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .style-config-app {
                        margin: 10px;
                    }

                    /* Mobile tweaks inside data-app="settings" */
                    [data-app="settings"] .style-config-app {
                        margin: 0 !important;
                    }

                    [data-app="settings"] .tab-headers {
                        flex-direction: row !important;
                    }

                    [data-app="settings"] .tab-header {
                        padding: 8px 12px !important;
                        font-size: 12px !important;
                    }

                    [data-app="settings"] .config-actions {
                        flex-direction: row !important;
                        flex-wrap: wrap !important;
                    }

                    [data-app="settings"] .config-btn {
                        flex: 1 1 auto !important;
                        min-width: 80px !important;
                        margin-right: 0 !important;
                    }

                    .tab-headers {
                        flex-direction: column;
                    }

                    .config-actions {
                        flex-direction: column;
                        gap: 12px;
                    }

                    .config-btn {
                        width: 100%;
                        justify-content: center;
                        margin-right: 0;
                        margin-bottom: 10px;
                    }

                    .control-input-container {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .control-number {
                        width: 100%;
                    }

                    .avatar-card-content {
                        flex-direction: column;
                        gap: 16px;
                    }

                    .avatar-preview-section {
                        align-self: center;
                    }

                    .avatar-card-header {
                        flex-direction: column;
                        gap: 12px;
                        align-items: stretch;
                    }

                    .avatar-card-actions {
                        justify-content: center;
                    }

                    .background-card-content {
                        flex-direction: column;
                        gap: 16px;
                    }

                    .background-preview-section {
                        align-self: center;
                    }

                    .background-card-header {
                        flex-direction: column;
                        gap: 12px;
                        align-items: stretch;
                    }

                    .background-card-actions {
                        justify-content: center;
                    }
                }

                /* Scrollbar inside data-app="settings" */
                [data-app="settings"]::-webkit-scrollbar {
                    width: 6px !important;
                }

                [data-app="settings"]::-webkit-scrollbar-track {
                    background: #f1f1f1 !important;
                    border-radius: 3px !important;
                }

                [data-app="settings"]::-webkit-scrollbar-thumb {
                    background: #c1c1c1 !important;
                    border-radius: 3px !important;
                }

                [data-app="settings"]::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8 !important;
                }

                /* Keep settings content from overflowing */
                [data-app="settings"] * {
                    box-sizing: border-box !important;
                }

                [data-app="settings"] .style-config-app * {
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                    max-width:100%
                }
                    .config-list-actions button{margin-bottom:10px}
                </style>
            </div>
        `;
    }

    // Load config-list content async
    async loadConfigListContent() {
      try {
        const configListContainer = document.getElementById('config-list-container');
        if (!configListContainer) return;

        const configs = await this.getAllStyleConfigs();

        let configListHTML = '';

        if (configs.length === 0) {
          configListHTML = `
                    <div class="no-configs">
                        <p>No saved configs</p>
                        <small>Saved configs will show up here</small>
                    </div>
                `;
        } else {
          configListHTML = configs
            .map(config => {
              // Format display name
              let displayName;
              const isDefault = config.name === STYLE_CONFIG_FILE_NAME;

              if (isDefault) {
                displayName = 'Default config';
              } else if (
                config.name.startsWith('mobile_config_') &&
                config.name.includes('_mobile_style_config.json')
              ) {
                // Handle timestamped default files: mobile_config_timestamp_mobile_style_config.json
                const match = config.name.match(/mobile_config_(\d+)_mobile_style_config\.json/);
                if (match) {
                  const timestamp = match[1];
                  const date = new Date(parseInt(timestamp));
                  displayName = `Default config (${date.toLocaleString()})`;
                } else {
                  displayName = config.name.replace('_style_config.json', '');
                }
              } else {
                // Handle normal user config files
                displayName = config.name.replace('_style_config.json', '');
              }

              const createTime = config.created ? new Date(config.created).toLocaleString() : 'Unknown';

              return `
                        <div class="config-item" data-config-file="${config.name}">
                            <div class="config-info">
                                <div class="config-name">
                                    ${isDefault ? '🏠' : '📄'} ${displayName}
                                    ${isDefault ? '<span class="default-badge">Default</span>' : ''}
                                </div>
                                <div class="config-meta">
                                    <small>Created: ${createTime}</small>
                                    ${config.source ? `<small>Source: ${config.source}</small>` : ''}
                                </div>
                            </div>
                            <div class="config-actions">
                                <button class="config-action-btn load-config" data-config-file="${
                                  config.name
                                }" title="Load this config">
                                    📥 Load
                                </button>
                                ${
                                  !isDefault
                                    ? `
                                    <button class="config-action-btn delete-config" data-config-file="${config.name}" title="Delete this config">
                                        🗑️ Delete
                                    </button>
                                `
                                    : ''
                                }
                            </div>
                        </div>
                    `;
            })
            .join('');
        }

        configListContainer.innerHTML = configListHTML;

        // Rebind config-list events
        this.bindConfigListEvents();

        console.log('[Style Config Manager] Config list loaded');
      } catch (error) {
        console.error('[Style Config Manager] Failed to load config list:', error);
        const configListContainer = document.getElementById('config-list-container');
        if (configListContainer) {
          configListContainer.innerHTML = `
                    <div class="error-configs">
                        <p>❌ Failed to load config list</p>
                        <small>Click Refresh and try again</small>
                    </div>
                `;
        }
      }
    }

    // Build section HTML
    generateConfigSection(key, title, configObject) {
      let fieldsHTML = '';

      for (const property in configObject) {
        if (property === 'description') continue;

        const value = configObject[property];
        const fieldId = `${key}_${property}`;
        const fieldTitle = this.getFieldTitle(property);

        if (property === 'backgroundImage') {
          // Image-upload field
          fieldsHTML += `
                    <div class="config-field image-upload-field">
                        <label for="${fieldId}">${fieldTitle}:</label>
                        <div class="image-upload-container">
                            <div class="image-preview" data-field-id="${fieldId}">
                                ${
                                  value
                                    ? `<img src="${value}" alt="Background preview" />`
                                    : '<div class="no-image">📷 No image</div>'
                                }
                            </div>
                            <div class="image-upload-controls">
                                <input type="file" id="${fieldId}_file" class="image-file-input" accept="image/*" data-target="${fieldId}" style="display: none;">
                                <button type="button" class="upload-btn" onclick="document.getElementById('${fieldId}_file').click()">
                                    📤 Choose image
                                </button>
                                ${
                                  value
                                    ? `<button type="button" class="remove-btn" data-target="${fieldId}">🗑️ Remove</button>`
                                    : ''
                                }
                            </div>
                            <input
                                type="hidden"
                                id="${fieldId}"
                                class="config-input"
                                value="${value}"
                                data-config-key="${key}"
                                data-config-property="${property}"
                            >
                        </div>
                    </div>
                `;
        } else if (property === 'backgroundImageUrl') {
          // Image-URL field
          fieldsHTML += `
                    <div class="config-field">
                        <label for="${fieldId}">${fieldTitle}:</label>
                        <input
                            type="url"
                            id="${fieldId}"
                            class="config-input"
                            value="${value}"
                            data-config-key="${key}"
                            data-config-property="${property}"
                            placeholder="Image URL..."
                        >
                    </div>
                `;
        } else {
          // Plain text field
          fieldsHTML += `
                    <div class="config-field">
                        <label for="${fieldId}">${fieldTitle}:</label>
                        <input
                            type="text"
                            id="${fieldId}"
                            class="config-input"
                            value="${value}"
                            data-config-key="${key}"
                            data-config-property="${property}"
                            placeholder="Enter ${fieldTitle}..."
                        >
                    </div>
                `;
        }
      }

      return `
            <div class="config-section">
                <div class="section-header">
                    <h3>${title}</h3>
                    <p>${configObject.description || ''}</p>
                </div>
                <div class="section-fields">
                    ${fieldsHTML}
                </div>
            </div>
        `;
    }

    // Build avatar-section HTML
    generateAvatarConfigSection(key, title, configObject) {
      let fieldsHTML = '';

      for (const property in configObject) {
        if (property === 'description') continue;

        const value = configObject[property];
        const fieldId = `${key}_${property}`;
        const fieldTitle = this.getFieldTitle(property);

        if (property === 'backgroundImage') {
          // Image-upload field
          fieldsHTML += `
                    <div class="config-field image-upload-field">
                        <label for="${fieldId}">${fieldTitle}:</label>
                        <div class="image-upload-container">
                            <div class="image-preview" data-field-id="${fieldId}">
                                ${
                                  value
                                    ? `<img src="${value}" alt="Background preview" />`
                                    : '<div class="no-image">📷 No image</div>'
                                }
                            </div>
                            <div class="image-upload-controls">
                                <input type="file" id="${fieldId}_file" class="image-file-input" accept="image/*" data-target="${fieldId}" style="display: none;">
                                <button type="button" class="upload-btn" onclick="document.getElementById('${fieldId}_file').click()">
                                    📤 Choose image
                                </button>
                                ${
                                  value
                                    ? `<button type="button" class="remove-btn" data-target="${fieldId}">🗑️ Remove</button>`
                                    : ''
                                }
                            </div>
                            <input
                                type="hidden"
                                id="${fieldId}"
                                class="config-input"
                                value="${value}"
                                data-config-key="${key}"
                                data-config-property="${property}"
                            >
                        </div>
                    </div>
                `;
        } else if (property === 'backgroundImageUrl') {
          // Image-URL field
          fieldsHTML += `
                    <div class="config-field">
                        <label for="${fieldId}">${fieldTitle}:</label>
                        <input
                            type="url"
                            id="${fieldId}"
                            class="config-input"
                            value="${value}"
                            data-config-key="${key}"
                            data-config-property="${property}"
                            placeholder="Image URL..."
                        >
                    </div>
                `;
        } else if (property === 'rotation') {
          // Rotation control
          fieldsHTML += `
                    <div class="config-field avatar-control-field">
                        <label for="${fieldId}">${fieldTitle} (deg):</label>
                        <div class="control-input-container">
                            <input
                                type="range"
                                id="${fieldId}_range"
                                min="0"
                                max="360"
                                step="1"
                                value="${value}"
                                class="control-range"
                                oninput="document.getElementById('${fieldId}').value = this.value; document.getElementById('${fieldId}').dispatchEvent(new Event('input'));"
                            >
                            <input
                                type="number"
                                id="${fieldId}"
                                class="config-input control-number"
                                value="${value}"
                                data-config-key="${key}"
                                data-config-property="${property}"
                                min="0"
                                max="360"
                                step="1"
                                oninput="document.getElementById('${fieldId}_range').value = this.value;"
                            >
                        </div>
                    </div>
                `;
        } else if (property === 'scale') {
          // Scale control
          fieldsHTML += `
                    <div class="config-field avatar-control-field">
                        <label for="${fieldId}">${fieldTitle}:</label>
                        <div class="control-input-container">
                            <input
                                type="range"
                                id="${fieldId}_range"
                                min="0.1"
                                max="3"
                                step="0.1"
                                value="${value}"
                                class="control-range"
                                oninput="document.getElementById('${fieldId}').value = this.value; document.getElementById('${fieldId}').dispatchEvent(new Event('input'));"
                            >
                            <input
                                type="number"
                                id="${fieldId}"
                                class="config-input control-number"
                                value="${value}"
                                data-config-key="${key}"
                                data-config-property="${property}"
                                min="0.1"
                                max="3"
                                step="0.1"
                                oninput="document.getElementById('${fieldId}_range').value = this.value;"
                            >
                        </div>
                    </div>
                `;
        } else if (property === 'friendId') {
          // Friend ID field
          fieldsHTML += `
                    <div class="config-field">
                        <label for="${fieldId}">${fieldTitle}:</label>
                        <input
                            type="text"
                            id="${fieldId}"
                            class="config-input"
                            value="${value}"
                            data-config-key="${key}"
                            data-config-property="${property}"
                            placeholder="Friend ID (e.g. 22333)"
                        >
                        <small>💡 This ID is used to build the CSS selector .message-received > .message-avatar#message-avatar-{ID}</small>
                    </div>
                `;
        } else {
          // Plain text field
          fieldsHTML += `
                    <div class="config-field">
                        <label for="${fieldId}">${fieldTitle}:</label>
                        <input
                            type="text"
                            id="${fieldId}"
                            class="config-input"
                            value="${value}"
                            data-config-key="${key}"
                            data-config-property="${property}"
                            placeholder="Enter ${fieldTitle}..."
                        >
                    </div>
                `;
        }
      }

      // Live preview
      const previewHTML = `
            <div class="config-field avatar-preview-field">
                <label>Preview:</label>
                <div class="avatar-preview-container">
                    <div class="avatar-preview" id="${key}_preview">
                        <div class="avatar-preview-circle"></div>
                    </div>
                    <div class="preview-info">
                        <small>40×40px circle preview</small>
                    </div>
                </div>
            </div>
        `;

      return `
            <div class="config-section avatar-config-section">
                <div class="section-header">
                    <h3>${title}</h3>
                    <p>${configObject.description || ''}</p>
                </div>
                <div class="section-fields">
                    ${fieldsHTML}
                    ${previewHTML}
                </div>
            </div>
        `;
    }

    // Build per-friend background section HTML
    generateFriendBackgroundsSection(backgroundsArray) {
      if (!backgroundsArray || !Array.isArray(backgroundsArray)) {
        backgroundsArray = [];
      }

      const backgroundCards = backgroundsArray
        .map((background, index) => {
          return this.generateSingleBackgroundCard(background, index, backgroundsArray.length);
        })
        .join('');

      return `
            <div class="config-section friend-backgrounds-section">
                <div class="section-header">
                    <h3>🎨 Per-friend chat background</h3>
                    <p>Per-friend chat backgrounds via data-background-id</p>
                </div>

                <div class="backgrounds-container">
                    ${backgroundCards}
                    ${
                      backgroundsArray.length === 0
                        ? `
                        <div class="empty-backgrounds">
                            <div class="empty-icon">🖼️</div>
                            <div class="empty-text">No per-friend backgrounds</div>
                            <div class="empty-hint">Set a background from the friend dialog</div>
                        </div>
                    `
                        : ''
                    }
                </div>

                <div class="background-actions">
                    <button class="config-btn add-background-btn" onclick="window.styleConfigManager.addNewFriendBackground()">
                        <span class="btn-icon">➕</span>
                        <span>Add background manually</span>
                    </button>
                </div>
            </div>
        `;
    }

    // Build received-avatar section HTML (multi-avatar)
    generateReceivedAvatarsSection(avatarsArray) {
      if (!avatarsArray || !Array.isArray(avatarsArray)) {
        return '';
      }

      const avatarCards = avatarsArray
        .map((avatar, index) => {
          return this.generateSingleAvatarCard(avatar, index, avatarsArray.length);
        })
        .join('');

      return `
            <div class="config-section avatars-section">
                <div class="section-header">
                    <h3>🎭 Received-message avatar background</h3>
                    <p>Per-friend avatar background images</p>
                </div>

                <div class="avatars-container">
                    ${avatarCards}
                </div>

                <div class="avatar-actions">
                    <button class="config-btn add-avatar-btn" onclick="window.styleConfigManager.addNewAvatar()">
                        <span class="btn-icon">➕</span>
                        <span>Add avatar</span>
                    </button>
                </div>
            </div>
        `;
    }

    // Build one friend-background card
    generateSingleBackgroundCard(background, index, backgroundsLength) {
      const friendId = background.friendId || '';
      const name = background.name || `Friend background ${index + 1}`;
      const backgroundImage = background.backgroundImage || background.backgroundImageUrl || '';
      const rotation = background.rotation || '0';
      const scale = background.scale || '1';
      const backgroundPosition = background.backgroundPosition || 'center center';

      const previewImageUrl = backgroundImage ? `url(${backgroundImage})` : 'none';
      const previewTransform = `rotate(${rotation}deg) scale(${scale})`;

      return `
            <div class="background-card" data-background-index="${index}">
                <div class="background-card-header">
                    <div class="background-card-title">
                        <input type="text" class="background-name-input"
                               data-background-index="${index}"
                               data-property="name"
                               value="${name}"
                               placeholder="Background name">
                    </div>
                    <div class="background-card-actions">
                        <button class="background-action-btn collapse-btn" onclick="window.styleConfigManager.toggleBackgroundCard(${index})" title="Collapse / expand">
                            <span>📁</span>
                        </button>
                        ${
                          backgroundsLength > 1
                            ? `
                        <button class="background-action-btn delete-btn" onclick="window.styleConfigManager.deleteFriendBackground(${index})" title="Delete">
                            <span>🗑️</span>
                        </button>
                        `
                            : ''
                        }
                    </div>
                </div>

                <div class="background-card-content">
                    <div class="background-preview-section">
                        <div class="background-preview" data-background-index="${index}">
                            <div class="background-preview-rect"
                                 style="background-image: ${previewImageUrl}; background-position: ${backgroundPosition}; transform: ${previewTransform};">
                            </div>
                        </div>
                        <div class="background-preview-label">Chat background preview</div>
                    </div>

                    <div class="background-fields">
                        <div class="config-field">
                            <label>Friend ID (required):</label>
                            <input type="text"
                                   class="config-input background-input"
                                   data-background-index="${index}"
                                   data-property="friendId"
                                   value="${friendId}"
                                   placeholder="558778"
                                   required>
                            <small>⚠️ <strong>Friend ID is required for this to apply</strong> - Matches the data-background-id attribute</small>
                            ${
                              friendId
                                ? `<small class="field-status valid">✅ Valid — CSS: .message-detail-content[data-background-id="${friendId}"]</small>`
                                : `<small class="field-status invalid">❌ Invalid — enter a friend ID</small>`
                            }
                        </div>

                        <div class="config-field">
                            <label>Background image:</label>
                            <div class="image-input-container">
                                <input type="file"
                                       class="image-file-input background-file-input"
                                       data-background-index="${index}"
                                       data-property="backgroundImage"
                                       accept="image/*">
                                <button class="upload-btn" onclick="this.previousElementSibling.click()">
                                    <span>📁</span>
                                    <span>Choose image</span>
                                </button>
                                ${
                                  backgroundImage
                                    ? `
                                <button class="remove-btn background-remove-btn"
                                        data-background-index="${index}"
                                        data-property="backgroundImage">
                                    <span>🗑️</span>
                                </button>
                                `
                                    : ''
                                }
                            </div>
                        </div>

                        <div class="config-field">
                            <label>Image URL:</label>
                            <input type="text"
                                   class="config-input background-input"
                                   data-background-index="${index}"
                                   data-property="backgroundImageUrl"
                                   value="${background.backgroundImageUrl || ''}"
                                   placeholder="https://example.com/image.jpg">
                        </div>

                        <div class="config-field">
                            <label>Background position:</label>
                            <input type="text"
                                   class="config-input background-input"
                                   data-background-index="${index}"
                                   data-property="backgroundPosition"
                                   value="${backgroundPosition}"
                                   placeholder="center center">
                            <small>e.g. center center, top left, 50% 25%</small>
                        </div>

                        <div class="config-field range-field">
                            <label>Rotation: <span class="range-value">${rotation}°</span></label>
                            <div class="range-container">
                                <input type="range"
                                       class="config-range background-range"
                                       data-background-index="${index}"
                                       data-property="rotation"
                                       min="0" max="360" step="1" value="${rotation}">
                                <input type="number"
                                       class="range-number background-number"
                                       data-background-index="${index}"
                                       data-property="rotation"
                                       min="0" max="360" step="1" value="${rotation}">
                            </div>
                        </div>

                        <div class="config-field range-field">
                            <label>Scale: <span class="range-value">${scale}x</span></label>
                            <div class="range-container">
                                <input type="range"
                                       class="config-range background-range"
                                       data-background-index="${index}"
                                       data-property="scale"
                                       min="0.1" max="3" step="0.1" value="${scale}">
                                <input type="number"
                                       class="range-number background-number"
                                       data-background-index="${index}"
                                       data-property="scale"
                                       min="0.1" max="3" step="0.1" value="${scale}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Build one avatar card
    generateSingleAvatarCard(avatar, index, avatarsLength) {
      const friendId = avatar.friendId || '';
      const name = avatar.name || `Friend avatar ${index + 1}`;
      const backgroundImage = avatar.backgroundImage || avatar.backgroundImageUrl || '';
      const rotation = avatar.rotation || '0';
      const scale = avatar.scale || '1';

      const previewImageUrl = backgroundImage ? `url(${backgroundImage})` : 'none';
      const previewTransform = `rotate(${rotation}deg) scale(${scale})`;

      return `
            <div class="avatar-card" data-avatar-index="${index}">
                <div class="avatar-card-header">
                    <div class="avatar-card-title">
                        <input type="text" class="avatar-name-input"
                               data-avatar-index="${index}"
                               data-property="name"
                               value="${name}"
                               placeholder="Avatar name">
                    </div>
                    <div class="avatar-card-actions">
                        <button class="avatar-action-btn collapse-btn" onclick="window.styleConfigManager.toggleAvatarCard(${index})" title="Collapse / expand">
                            <span>📁</span>
                        </button>
                        ${
                          avatarsLength > 1
                            ? `
                        <button class="avatar-action-btn delete-btn" onclick="window.styleConfigManager.deleteAvatar(${index})" title="Delete">
                            <span>🗑️</span>
                        </button>
                        `
                            : ''
                        }
                    </div>
                </div>

                <div class="avatar-card-content">
                    <div class="avatar-preview-section">
                        <div class="avatar-preview" data-avatar-index="${index}">
                            <div class="avatar-preview-circle"
                                 style="background-image: ${previewImageUrl}; transform: ${previewTransform};">
                            </div>
                        </div>
                        <div class="avatar-preview-label">40×40px preview</div>
                    </div>

                    <div class="avatar-fields">
                        <div class="config-field">
                            <label>Friend ID (required):</label>
                            <input type="text"
                                   class="config-input avatar-input"
                                   data-avatar-index="${index}"
                                   data-property="friendId"
                                   value="${friendId}"
                                   placeholder="558778"
                                   required>
                            <small>⚠️ <strong>Friend ID is required for this to apply</strong> - Matches that friend's avatar element</small>
                                                         ${
                                                           friendId
                                                             ? `<small class="field-status valid">✅ Valid — CSS: [data-friend-id="${friendId}"] and #message-avatar-${friendId}</small>`
                                                             : `<small class="field-status invalid">❌ Invalid — enter a friend ID</small>`
                                                         }
                        </div>

                        <div class="config-field">
                            <label>Background image:</label>
                            <div class="image-input-container">
                                <input type="file"
                                       class="image-file-input avatar-file-input"
                                       data-avatar-index="${index}"
                                       data-property="backgroundImage"
                                       accept="image/*">
                                <button class="upload-btn" onclick="this.previousElementSibling.click()">
                                    <span>📁</span>
                                    <span>Choose image</span>
                                </button>
                                ${
                                  backgroundImage
                                    ? `
                                <button class="remove-btn avatar-remove-btn"
                                        data-avatar-index="${index}"
                                        data-property="backgroundImage">
                                    <span>🗑️</span>
                                </button>
                                `
                                    : ''
                                }
                            </div>
                        </div>

                        <div class="config-field">
                            <label>Image URL:</label>
                            <input type="text"
                                   class="config-input avatar-input"
                                   data-avatar-index="${index}"
                                   data-property="backgroundImageUrl"
                                   value="${avatar.backgroundImageUrl || ''}"
                                   placeholder="https://example.com/image.jpg">
                        </div>

                        <div class="config-field range-field">
                            <label>Rotation: <span class="range-value">${rotation}°</span></label>
                            <div class="range-container">
                                <input type="range"
                                       class="config-range avatar-range"
                                       data-avatar-index="${index}"
                                       data-property="rotation"
                                       min="0" max="360" step="1" value="${rotation}">
                                <input type="number"
                                       class="range-number avatar-number"
                                       data-avatar-index="${index}"
                                       data-property="rotation"
                                       min="0" max="360" step="1" value="${rotation}">
                            </div>
                        </div>

                        <div class="config-field range-field">
                            <label>Scale: <span class="range-value">${scale}x</span></label>
                            <div class="range-container">
                                <input type="range"
                                       class="config-range avatar-range"
                                       data-avatar-index="${index}"
                                       data-property="scale"
                                       min="0.1" max="3" step="0.1" value="${scale}">
                                <input type="number"
                                       class="range-number avatar-number"
                                       data-avatar-index="${index}"
                                       data-property="scale"
                                       min="0.1" max="3" step="0.1" value="${scale}">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Build custom-CSS section HTML
    generateCustomStylesSection(key, title, configObject) {
      const value = configObject.cssText || '';
      const fieldId = `${key}_cssText`;

      return `
            <div class="config-section">
                <div class="section-header">
                    <h3>${title}</h3>
                    <p>${configObject.description || ''}</p>
                </div>
                <div class="section-fields">
                    <div class="config-field custom-css-field">
                        <label for="${fieldId}">Custom CSS:</label>
                        <div class="custom-css-container">
                            <textarea
                                id="${fieldId}"
                                class="config-input custom-css-textarea"
                                data-config-key="${key}"
                                data-config-property="cssText"
                                placeholder="/* Paste custom CSS here */&#10;.your-custom-class {&#10;    /* your rules */&#10;}"
                                rows="8"
                            >${value}</textarea>
                            <div class="css-help">
                                <small>💡 This CSS is saved with the config and applied automatically</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Add an avatar config
    addNewAvatar() {
      const config = this.getConfig();
      if (!config.messageReceivedAvatars) {
        config.messageReceivedAvatars = [];
      }

      const newAvatar = {
        id: 'avatar_' + Date.now(),
        backgroundImage: '',
        backgroundImageUrl: '',
        rotation: '0',
        scale: '1',
        friendId: '',
        name: `Friend avatar ${config.messageReceivedAvatars.length + 1}`,
        description: 'Received-message avatar background',
      };

      config.messageReceivedAvatars.push(newAvatar);
      this.updateConfig('messageReceivedAvatars', null, config.messageReceivedAvatars);

      // Rerender UI
      this.refreshEditorInterface();
      this.updateStatus('Avatar added — click Save As', 'info');
    }

    // Delete avatar config
    deleteAvatar(index) {
      const config = this.getConfig();
      if (!config.messageReceivedAvatars || config.messageReceivedAvatars.length <= 1) {
        this.updateStatus('Keep at least one avatar config', 'warning');
        return;
      }

      if (confirm('Delete this avatar config?')) {
        config.messageReceivedAvatars.splice(index, 1);
        this.updateConfig('messageReceivedAvatars', null, config.messageReceivedAvatars);

        // Rerender UI
        this.refreshEditorInterface();
        this.updateStatus('Avatar removed — click Save As', 'info');
      }
    }

    // Add a friend-background config
    addNewFriendBackground() {
      const config = this.getConfig();
      if (!config.friendBackgrounds) {
        config.friendBackgrounds = [];
      }

      const newBackground = {
        id: 'friend_bg_' + Date.now(),
        friendId: '',
        name: `Friend background ${config.friendBackgrounds.length + 1}`,
        backgroundImage: '',
        backgroundImageUrl: '',
        backgroundPosition: 'center center',
        rotation: '0',
        scale: '1',
        description: 'Per-friend chat background',
      };

      config.friendBackgrounds.push(newBackground);
      this.updateConfig('friendBackgrounds', null, config.friendBackgrounds);

      // Rerender UI
      this.refreshEditorInterface();
      this.updateStatus('Friend background added — click Save As', 'info');
    }

    // Delete friend-background config
    deleteFriendBackground(index) {
      const config = this.getConfig();
      if (!config.friendBackgrounds || config.friendBackgrounds.length === 0) {
        this.updateStatus('No background config to delete', 'warning');
        return;
      }

      if (confirm('Delete this friend-background config?')) {
        config.friendBackgrounds.splice(index, 1);
        this.updateConfig('friendBackgrounds', null, config.friendBackgrounds);

        // Rerender UI
        this.refreshEditorInterface();
        this.updateStatus('Friend background removed — click Save As', 'info');
      }
    }

    // Toggle friend-background card open/closed
    toggleBackgroundCard(index) {
      const card = document.querySelector(`[data-background-index="${index}"]`);
      if (card) {
        const content = card.querySelector('.background-card-content');
        const button = card.querySelector('.collapse-btn span');

        if (content.style.display === 'none') {
          content.style.display = 'block';
          button.textContent = '📁';
        } else {
          content.style.display = 'none';
          button.textContent = '📂';
        }
      }
    }

    // Collapse / expand avatar card
    toggleAvatarCard(index) {
      const card = document.querySelector(`[data-avatar-index="${index}"]`);
      if (card) {
        // @ts-ignore - HTMLElement style access
        const content = card.querySelector('.avatar-card-content');
        const btn = card.querySelector('.collapse-btn span');

        if (content && btn) {
          // @ts-ignore - HTMLElement style access
          if (content.style.display === 'none') {
            // @ts-ignore - HTMLElement style access
            content.style.display = 'block';
            btn.textContent = '📁';
          } else {
            // @ts-ignore - HTMLElement style access
            content.style.display = 'none';
            btn.textContent = '📂';
          }
        }
      }
    }

    // Field title
    getFieldTitle(property) {
      const titleMap = {
        background: 'Background',
        backgroundImage: 'Background image',
        backgroundImageUrl: 'Background image URL',
        borderRadius: 'Radius',
        color: 'Color',
        fontSize: 'Font size',
        padding: 'Padding',
        margin: 'Margin',
        rotation: 'Rotation',
        scale: 'Scale',
        friendId: 'Friend ID',
      };

      return titleMap[property] || property;
    }

    // Bind settings-app events
    bindSettingsEvents() {
      // Tab-switch events
      document.querySelectorAll('.tab-header').forEach(tab => {
        tab.addEventListener('click', e => {
          this.handleTabSwitch(e.target);
        });
      });

      // Input-change events
      document.querySelectorAll('.config-input').forEach(input => {
        input.addEventListener('input', e => {
          this.handleInputChange(e.target);
        });
      });

      // Image-upload events
      document.querySelectorAll('.image-file-input').forEach(input => {
        input.addEventListener('change', e => {
          this.handleImageUpload(e.target);
        });
      });

      // Image-remove events
      document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          this.handleImageRemove(e.target);
        });
      });

      // Preview button
      const previewBtn = document.getElementById('preview-styles');
      if (previewBtn) {
        previewBtn.addEventListener('click', () => {
          this.previewStyles();
        });
      }

      // Save As (was Save)
      const saveNewBtn = document.getElementById('save-new-config-btn');
      if (saveNewBtn) {
        saveNewBtn.addEventListener('click', async () => {
          await this.handleSaveNewConfigWithPrompt();
        });
      }

      // Reset button
      const resetBtn = document.getElementById('reset-styles');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.resetStyles();
        });
      }

      // Save As is already bound above — do not bind twice

      // Refresh-list button
      const refreshBtn = document.getElementById('refresh-config-list');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
          await this.handleRefreshConfigList();
        });
      }

      // Export button
      const exportBtn = document.getElementById('export-config');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          this.handleExportConfig();
        });
      }

      // Import button
      const importBtn = document.getElementById('import-config');
      const importInput = document.getElementById('config-import-input');
      if (importBtn && importInput) {
        importBtn.addEventListener('click', () => {
          importInput.click();
        });

        importInput.addEventListener('change', e => {
          this.handleImportConfig(e.target);
        });
      }

      // Save As input was removed from this panel

      // Bind initial config-list events if present
      this.bindConfigListEvents();

      // Custom CSS textarea events
      document.querySelectorAll('.custom-css-textarea').forEach(textarea => {
        textarea.addEventListener('input', e => {
          this.handleInputChange(e.target);
        });
      });

      // Avatar-preview update events
      this.bindAvatarPreviewEvents();

      // Load config list after DOM paint
      setTimeout(() => {
        this.loadConfigListContent();
        this.updateAllAvatarPreviews(); // Update all avatar previews
      }, 100);
    }

    // Handle tab switch
    handleTabSwitch(tabHeader) {
      // @ts-ignore - EventTarget getAttribute
      const targetTab = tabHeader.getAttribute('data-tab');

      // Update tab state
      document.querySelectorAll('.tab-header').forEach(header => {
        header.classList.remove('active');
      });
      document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
      });

      tabHeader.classList.add('active');
      document.querySelector(`[data-tab="${targetTab}"].tab-panel`).classList.add('active');

      // Load the list when switching to Config manager
      if (targetTab === 'manager') {
        this.loadConfigListContent();
      }
    }

    // Save a new named config (with prompt)
    async handleSaveNewConfigWithPrompt() {
      const configName = prompt('Config name:', '');

      if (!configName) {
        this.updateStatus('Save cancelled', 'info');
        return;
      }

      const trimmedName = configName.trim();

      if (!trimmedName) {
        this.updateStatus('Enter a valid config name', 'error');
        return;
      }

      if (trimmedName.length > 50) {
        this.updateStatus('Config name is too long (50 characters max)', 'error');
        return;
      }

      this.updateStatus('Saving config...', 'loading');

      try {
        const success = await this.saveConfigWithName(trimmedName);
        if (success) {
          this.updateStatus('Config saved', 'success');
          // Refresh the list if that tab is open
          const activeTab = document.querySelector('.tab-header.active');
          if (activeTab && activeTab.getAttribute('data-tab') === 'manager') {
            await this.handleRefreshConfigList();
          }
        }
      } catch (error) {
        console.error('[Style Config Manager] Failed to save config:', error);
        this.updateStatus(`Save failed: ${error.message}`, 'error');
      }
    }

    // Handle load config
    async handleLoadConfig(fileName) {
      if (!fileName) return;

      this.updateStatus('Loading config...', 'loading');

      const success = await this.loadConfigFromFile(fileName);
      if (success) {
        // Refresh editor UI
        await this.refreshEditorInterface();

        // Check whether this is the default config
        const isDefaultConfig = fileName === STYLE_CONFIG_FILE_NAME;

        if (isDefaultConfig) {
          this.updateStatus('Default config loaded', 'success');
        } else {
          // For non-default configs, ask whether to set as default
          const loadChoice = await this.showLoadOptionsDialog(fileName);

          if (loadChoice === 'setDefault') {
            this.updateStatus('Setting as default config...', 'loading');

            console.log('[Style Config Manager] 🔄 Starting save-as-default');
            console.log('[Style Config Manager] Current config contents:', JSON.stringify(this.currentConfig, null, 2));

            // Save as default config
            const saveSuccess = await this.saveConfig();

            console.log('[Style Config Manager] Save result:', saveSuccess);

            if (saveSuccess) {
              this.updateStatus('Loaded and set as default — survives refresh', 'success');
              console.log('[Style Config Manager] ✅ Config loaded and saved as default');

              // Verify the save
              console.log('[Style Config Manager] 🔍 Verifying save...');
              if (sillyTavernCoreImported && getDataBankAttachmentsForSource) {
                const globalAttachments = getDataBankAttachmentsForSource('global', true);
                const defaultConfig = globalAttachments.find(att => att.name === 'mobile_style_config.json');
                console.log('[Style Config Manager] Default config file exists:', !!defaultConfig);
                if (defaultConfig) {
                  console.log('[Style Config Manager] Default config file info:', defaultConfig);
                }
              }
            } else {
              this.updateStatus('Loaded, but setting as default failed', 'error');
              console.error('[Style Config Manager] ❌ Failed to save as default');
            }
          } else {
            this.updateStatus('Loaded for this session only — a refresh restores the previous config', 'success');
          }
        }
      } else {
        this.updateStatus('Failed to load config', 'error');
      }
    }

    // Handle delete config
    async handleDeleteConfig(fileName) {
      if (!fileName) return;

      if (!confirm(`Delete config "${fileName}"? This cannot be undone.`)) {
        return;
      }

      this.updateStatus('Deleting config...', 'loading');

      const success = await this.deleteConfigFile(fileName);
      if (success) {
        this.updateStatus('Config deleted', 'success');
        // Refresh config list
        await this.handleRefreshConfigList();
      } else {
        this.updateStatus('Failed to delete config', 'error');
      }
    }

    // Handle refresh list
    async handleRefreshConfigList() {
      await this.loadConfigListContent();
      console.log('[Style Config Manager] Config list refreshed');
    }

    // Handle export config
    handleExportConfig() {
      try {
        const configData = {
          version: '1.0',
          timestamp: new Date().toISOString(),
          config: this.currentConfig,
          description: 'Mobile style config file',
        };

        const configJson = JSON.stringify(configData, null, 2);
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `mobile-style-config-${new Date().toISOString().split('T')[0]}.json`;
        downloadLink.style.display = 'none';

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Revoke object URL
        URL.revokeObjectURL(url);

        this.updateStatus('Config exported', 'success');
        console.log('[Style Config Manager] Config exported:', configData);
      } catch (error) {
        console.error('[Style Config Manager] Failed to export config:', error);
        this.updateStatus('Failed to export config', 'error');
      }
    }

    // Handle import config
    async handleImportConfig(fileInput) {
      try {
        // @ts-ignore - HTMLInputElement files property
        const file = fileInput.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
          this.updateStatus('Pick a JSON config file', 'error');
          return;
        }

        this.updateStatus('Importing config...', 'loading');

        const fileContent = await this.fileToText(file);
        const importData = JSON.parse(fileContent);

        // Validate config file format
        if (!importData.config) {
          // No config field — treat the object itself as the config
          if (typeof importData === 'object' && importData.mobilePhoneFrame) {
            this.currentConfig = this.mergeConfigs(DEFAULT_STYLE_CONFIG, importData);
          } else {
            throw new Error('Invalid config file format');
          }
        } else {
          // Standard-format config file
          this.currentConfig = this.mergeConfigs(DEFAULT_STYLE_CONFIG, importData.config);
        }

        // Apply the new config
        this.applyStyles();

        // Refresh editor UI
        await this.refreshEditorInterface();

        // Ask how to handle the imported config
        const importChoice = await this.showImportOptionsDialog();

        if (importChoice === 'default') {
          this.updateStatus('Saving as default config...', 'loading');

          // Save as default config
          const saveSuccess = await this.saveConfig();

          if (saveSuccess) {
            this.updateStatus('Imported and set as default — survives refresh', 'success');
            console.log('[Style Config Manager] Config imported and saved as default');
          } else {
            this.updateStatus('Imported, but saving as default failed', 'error');
          }
        } else if (importChoice === 'named') {
          // Save as named config
          const configName = prompt('Config name:', 'Imported config');
          if (configName && configName.trim()) {
            this.updateStatus('Saving named config...', 'loading');

            try {
              const saveSuccess = await this.saveConfigWithName(configName.trim());

              if (saveSuccess) {
                this.updateStatus(`Saved as "${configName.trim()}" — load it from config management`, 'success');
                // Refresh config list
                setTimeout(() => {
                  this.loadConfigListContent();
                }, 1000);
              }
            } catch (error) {
              this.updateStatus(`Save failed: ${error.message}`, 'error');
            }
          } else {
            this.updateStatus('Imported for this session only', 'success');
          }
        } else {
          this.updateStatus('Imported for this session only — a refresh restores the previous config', 'success');
        }

        console.log('[Style Config Manager] Config imported:', this.currentConfig);

        // Clear the file input
        // @ts-ignore - HTMLInputElement value property
        fileInput.value = '';
      } catch (error) {
        console.error('[Style Config Manager] Import failed:', error);
        this.updateStatus('Import failed: ' + error.message, 'error');

        // Clear the file input
        // @ts-ignore - HTMLInputElement value property
        fileInput.value = '';
      }
    }

    // File to text
    fileToText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    // Show load-options dialog
    async showLoadOptionsDialog(fileName) {
      const displayName = fileName.replace('_style_config.json', '');

      return new Promise(resolve => {
        // Build dialog HTML
        const dialogHtml = `
                <div class="load-options-dialog" id="load-options-dialog">
                    <div class="load-options-overlay"></div>
                    <div class="load-options-content">
                        <div class="load-options-header">
                            <h3>📥 Config loaded</h3>
                            <p>Loaded: "${displayName}"</p>
                            <p style="color: #f59e0b; font-size: 13px; margin-top: 8px;">💡 How should this config be saved?</p>
                        </div>
                        <div class="load-options-body">
                            <div class="load-option recommended" data-choice="setDefault">
                                <div class="option-icon">🏠</div>
                                <div class="option-content">
                                    <div class="option-title">Set as default <span class="recommended-badge">Recommended</span></div>
                                    <div class="option-desc">Replace the current default config, <strong>survives a page refresh</strong></div>
                                </div>
                            </div>
                            <div class="load-option" data-choice="temp">
                                <div class="option-icon">⚡</div>
                                <div class="option-content">
                                    <div class="option-title">Apply for this session only</div>
                                    <div class="option-desc">Valid for this session，<strong style="color: #dc2626;">A refresh restores the previous config</strong></div>
                                </div>
                            </div>
                        </div>
                        <div class="load-options-footer">
                            <button class="load-cancel-btn" data-choice="temp">Keep temporary</button>
                        </div>
                    </div>
                </div>
                <style>
                .load-options-dialog {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .load-options-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(5px);
                    cursor: pointer;
                }
                .load-options-content {
                    position: relative;
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    max-width: 480px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                    animation: dialogSlideIn 0.3s ease-out;
                }
                .load-options-header {
                    text-align: center;
                    margin-bottom: 24px;
                }
                .load-options-header h3 {
                    margin: 0 0 8px 0;
                    color: #1f2937;
                    font-size: 20px;
                    font-weight: 600;
                }
                .load-options-header p {
                    margin: 0;
                    color: #6b7280;
                    font-size: 14px;
                }
                .load-options-body {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .load-option {
                    display: flex;
                    align-items: center;
                    padding: 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: white;
                }
                .load-option:hover {
                    border-color: #3b82f6;
                    background: #f8fafc;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
                }
                .load-option.recommended {
                    border-color: #10b981;
                    background: linear-gradient(135deg, #f0fff4 0%, #ecfdf5 100%);
                }
                .load-option.recommended:hover {
                    border-color: #059669;
                    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
                }
                .recommended-badge {
                    background: #10b981;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    margin-left: 8px;
                }
                .option-icon {
                    font-size: 24px;
                    margin-right: 16px;
                    flex-shrink: 0;
                }
                .option-content {
                    flex: 1;
                }
                .option-title {
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 4px;
                }
                .option-desc {
                    font-size: 13px;
                    color: #6b7280;
                    line-height: 1.4;
                }
                .load-options-footer {
                    margin-top: 24px;
                    text-align: center;
                }
                .load-cancel-btn {
                    padding: 8px 16px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: white;
                    color: #6b7280;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                .load-cancel-btn:hover {
                    background: #f9fafb;
                    border-color: #9ca3af;
                }
                </style>
            `;

        // Append dialog to the page
        document.body.insertAdjacentHTML('beforeend', dialogHtml);

        // Bind events after the DOM updates
        setTimeout(() => {
          const dialog = document.getElementById('load-options-dialog');
          console.log('[Load Dialog] Dialog:', dialog);

          if (!dialog) {
            console.error('[Load Dialog] Could not find dialog');
            resolve('temp');
            return;
          }

          // Close helper
          const closeDialog = choice => {
            console.log('[Load Dialog] Closing dialog, choice:', choice);
            if (dialog && dialog.parentNode) {
              dialog.remove();
            }
            resolve(choice);
          };

          // Click overlay to close
          const overlay = dialog.querySelector('.load-options-overlay');
          console.log('[Load Dialog] Overlay:', overlay);
          if (overlay) {
            overlay.addEventListener('click', e => {
              console.log('[Load Dialog] Clicked overlay');
              e.preventDefault();
              e.stopPropagation();
              closeDialog('temp');
            });
          } else {
            console.error('[Load Dialog] Could not find overlay');
          }

          // Click an option
          const options = dialog.querySelectorAll('.load-option');
          console.log('[Load Dialog] Option button count:', options.length);
          options.forEach((option, index) => {
            const choice = option.getAttribute('data-choice');
            console.log(`[Load Dialog] Bound option ${index}:`, choice);
            option.addEventListener('click', e => {
              console.log('[Load Dialog] Clicked option:', choice);
              e.preventDefault();
              e.stopPropagation();
              if (choice) {
                closeDialog(choice);
              }
            });
          });

          // Clicked cancel
          const cancelBtn = dialog.querySelector('.load-cancel-btn');
          console.log('[Load Dialog] Cancel button:', cancelBtn);
          if (cancelBtn) {
            const choice = cancelBtn.getAttribute('data-choice') || 'temp';
            console.log('[Load Dialog] Cancel button value:', choice);
            cancelBtn.addEventListener('click', e => {
              console.log('[Load Dialog] Clicked cancel');
              e.preventDefault();
              e.stopPropagation();
              closeDialog(choice);
            });
          } else {
            console.error('[Load Dialog] Could not find cancel button');
          }

          // Stop dialog clicks from hitting the overlay
          const content = dialog.querySelector('.load-options-content');
          if (content) {
            content.addEventListener('click', e => {
              e.stopPropagation();
            });
          }

          console.log('[Load Dialog] Events bound');
        }, 100);
      });
    }

    // Show import-options dialog
    async showImportOptionsDialog() {
      return new Promise(resolve => {
        // Build dialog HTML
        const dialogHtml = `
                <div class="import-options-dialog" id="import-options-dialog">
                    <div class="import-options-overlay"></div>
                    <div class="import-options-content">
                        <div class="import-options-header">
                            <h3>📥 Config imported</h3>
                            <p>What should we do with this config?</p>
                        </div>
                        <div class="import-options-body">
                            <div class="import-option" data-choice="default">
                                <div class="option-icon">🏠</div>
                                <div class="option-content">
                                    <div class="option-title">Set as default</div>
                                    <div class="option-desc">Replace the default — applies after refresh</div>
                                </div>
                            </div>
                            <div class="import-option" data-choice="named">
                                <div class="option-icon">📄</div>
                                <div class="option-content">
                                    <div class="option-title">Save as named config</div>
                                    <div class="option-desc">Save as a new config without touching the default</div>
                                </div>
                            </div>
                            <div class="import-option" data-choice="temp">
                                <div class="option-icon">⚡</div>
                                <div class="option-content">
                                    <div class="option-title">Apply for this session only</div>
                                    <div class="option-desc">This session only — a refresh restores the previous config</div>
                                </div>
                            </div>
                        </div>
                        <div class="import-options-footer">
                            <button class="import-cancel-btn" data-choice="cancel">Cancel</button>
                        </div>
                    </div>
                </div>
                <style>
                .import-options-dialog {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .import-options-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(5px);
                    cursor: pointer;
                }
                .import-options-content {
                    position: relative;
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    max-width: 480px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                    animation: dialogSlideIn 0.3s ease-out;
                }
                @keyframes dialogSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                .import-options-header {
                    text-align: center;
                    margin-bottom: 24px;
                }
                .import-options-header h3 {
                    margin: 0 0 8px 0;
                    color: #1f2937;
                    font-size: 20px;
                    font-weight: 600;
                }
                .import-options-header p {
                    margin: 0;
                    color: #6b7280;
                    font-size: 14px;
                }
                .import-options-body {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .import-option {
                    display: flex;
                    align-items: center;
                    padding: 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: white;
                }
                .import-option:hover {
                    border-color: #3b82f6;
                    background: #f8fafc;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
                }
                .option-icon {
                    font-size: 24px;
                    margin-right: 16px;
                    flex-shrink: 0;
                }
                .option-content {
                    flex: 1;
                }
                .option-title {
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 4px;
                }
                .option-desc {
                    font-size: 13px;
                    color: #6b7280;
                    line-height: 1.4;
                }
                .import-options-footer {
                    margin-top: 24px;
                    text-align: center;
                }
                .import-cancel-btn {
                    padding: 8px 16px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background: white;
                    color: #6b7280;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                .import-cancel-btn:hover {
                    background: #f9fafb;
                    border-color: #9ca3af;
                }
                </style>
            `;

        // Append dialog to the page
        document.body.insertAdjacentHTML('beforeend', dialogHtml);

        // Bind events after the DOM updates
        setTimeout(() => {
          const dialog = document.getElementById('import-options-dialog');
          console.log('[Import Dialog] Dialog:', dialog);

          if (!dialog) {
            console.error('[Import Dialog] Could not find dialog');
            resolve('cancel');
            return;
          }

          // Close helper
          const closeDialog = choice => {
            console.log('[Import Dialog] Closing dialog, choice:', choice);
            if (dialog && dialog.parentNode) {
              dialog.remove();
            }
            resolve(choice);
          };

          // Click overlay to close
          const overlay = dialog.querySelector('.import-options-overlay');
          console.log('[Import Dialog] Overlay:', overlay);
          if (overlay) {
            overlay.addEventListener('click', e => {
              console.log('[Import Dialog] Clicked overlay');
              e.preventDefault();
              e.stopPropagation();
              closeDialog('cancel');
            });
          } else {
            console.error('[Import Dialog] Could not find overlay');
          }

          // Click an option
          const options = dialog.querySelectorAll('.import-option');
          console.log('[Import Dialog] Option button count:', options.length);
          options.forEach((option, index) => {
            const choice = option.getAttribute('data-choice');
            console.log(`[Import Dialog] Bound option ${index}:`, choice);
            option.addEventListener('click', e => {
              console.log('[Import Dialog] Clicked option:', choice);
              e.preventDefault();
              e.stopPropagation();
              if (choice) {
                closeDialog(choice);
              }
            });
          });

          // Clicked cancel
          const cancelBtn = dialog.querySelector('.import-cancel-btn');
          console.log('[Import Dialog] Cancel button:', cancelBtn);
          if (cancelBtn) {
            const choice = cancelBtn.getAttribute('data-choice') || 'cancel';
            console.log('[Import Dialog] Cancel button value:', choice);
            cancelBtn.addEventListener('click', e => {
              console.log('[Import Dialog] Clicked cancel');
              e.preventDefault();
              e.stopPropagation();
              closeDialog(choice);
            });
          } else {
            console.error('[Import Dialog] Could not find cancel button');
          }

          // Stop dialog clicks from hitting the overlay
          const content = dialog.querySelector('.import-options-content');
          if (content) {
            content.addEventListener('click', e => {
              e.stopPropagation();
            });
          }

          console.log('[Import Dialog] Events bound');
        }, 100);
      });
    }

    // Bind config-list events
    bindConfigListEvents() {
      // Load-config button
      document.querySelectorAll('.load-config').forEach(btn => {
        // Drop old listeners if any
        btn.removeEventListener('click', this.loadConfigHandler);
        // Bind new listeners
        this.loadConfigHandler = async e => {
          // @ts-ignore - EventTarget getAttribute
          const fileName = e.target.getAttribute('data-config-file');
          await this.handleLoadConfig(fileName);
        };
        btn.addEventListener('click', this.loadConfigHandler);
      });

      // Delete-config button
      document.querySelectorAll('.delete-config').forEach(btn => {
        // Drop old listeners if any
        btn.removeEventListener('click', this.deleteConfigHandler);
        // Bind new listeners
        this.deleteConfigHandler = async e => {
          // @ts-ignore - EventTarget getAttribute
          const fileName = e.target.getAttribute('data-config-file');
          await this.handleDeleteConfig(fileName);
        };
        btn.addEventListener('click', this.deleteConfigHandler);
      });
    }

    // Refresh editor UI
    async refreshEditorInterface() {
      try {
        // Rebuild the UI so data stays in sync
        const container = document.querySelector('.style-config-app');
        if (container) {
          container.innerHTML = this.getSettingsAppContent();

          // Rebind all events
          this.bindSettingsEvents();
          return;
        }
        // Refresh all inputs including textareas
        document.querySelectorAll('.config-input').forEach(input => {
          const key = input.getAttribute('data-config-key');
          const property = input.getAttribute('data-config-property');

          if (key && property && this.currentConfig[key]) {
            // @ts-ignore - HTMLInputElement value property
            input.value = this.currentConfig[key][property] || '';

            // Sync slider values when a slider exists
            const rangeId = `${key}_${property}_range`;
            const rangeInput = document.getElementById(rangeId);
            if (rangeInput) {
              // @ts-ignore - HTMLInputElement value property
              rangeInput.value = this.currentConfig[key][property] || '';
            }
          }
        });

        // Update received-avatar inputs
        document.querySelectorAll('.avatar-input, .avatar-range, .avatar-number, .avatar-name-input').forEach(input => {
          // @ts-ignore - Event target
          const avatarIndex = input.getAttribute('data-avatar-index');
          // @ts-ignore - Event target
          const property = input.getAttribute('data-property');

          if (avatarIndex !== null && property && this.currentConfig.messageReceivedAvatars) {
            const avatar = this.currentConfig.messageReceivedAvatars[parseInt(avatarIndex)];
            if (avatar) {
              // @ts-ignore - HTMLInputElement value property
              input.value = avatar[property] || '';
            }
          }
        });

        // Also update the image preview
        Object.keys(this.currentConfig).forEach(key => {
          const config = this.currentConfig[key];
          if (config && config.backgroundImage) {
            const fieldId = `${key}_backgroundImage`;
            this.updateImagePreview(fieldId, config.backgroundImage);
          }
        });

        // Update avatar preview
        this.updateAllAvatarPreviews();

        // Rebind avatar events
        this.bindAvatarPreviewEvents();

        console.log('[Style Config Manager] Editor UI refreshed');
      } catch (error) {
        console.error('[Style Config Manager] Failed to refresh editor UI:', error);
      }
    }

    // Handle input changes
    handleInputChange(input) {
      const key = input.getAttribute('data-config-key');
      const property = input.getAttribute('data-config-property');
      const value = input.value;

      if (key && property) {
        this.updateConfig(key, property, value);
        this.updateStatus('Config changed — click Save As to keep it', 'info');

        // If this is an avatar field, refresh the preview
        if (key === 'messageSentAvatar' || key === 'messageReceivedAvatar') {
          this.updateAvatarPreview(key);
        }
      }
    }

    // Bind avatar-preview events
    bindAvatarPreviewEvents() {
      // Sent-message avatar controls
      document.querySelectorAll('[data-config-key="messageSentAvatar"]').forEach(input => {
        input.addEventListener('input', () => {
          this.updateAvatarPreview('messageSentAvatar');
        });
      });

      // Received-avatar controls (multiple)
      document.querySelectorAll('.avatar-input, .avatar-range, .avatar-number').forEach(input => {
        input.addEventListener('input', e => {
          // @ts-ignore - Event target
          const avatarIndex = e.target.getAttribute('data-avatar-index');
          // @ts-ignore - Event target
          const property = e.target.getAttribute('data-property');
          // @ts-ignore - Event target
          const value = e.target.value;

          if (avatarIndex !== null && property) {
            this.updateAvatarProperty(parseInt(avatarIndex), property, value);

            // Keep slider and number input in sync
            if (property === 'rotation' || property === 'scale') {
              const relatedInputs = document.querySelectorAll(
                `[data-avatar-index="${avatarIndex}"][data-property="${property}"]`,
              );
              relatedInputs.forEach(relatedInput => {
                // @ts-ignore - HTMLElement value property
                if (relatedInput !== e.target) {
                  // @ts-ignore - HTMLElement value property
                  relatedInput.value = value;
                }
              });

              // Update the label
              const label = document.querySelector(`[data-avatar-index="${avatarIndex}"] .range-value`);
              if (label && (property === 'rotation' || property === 'scale')) {
                const unit = property === 'rotation' ? '°' : 'x';
                label.textContent = `${value}${unit}`;
              }
            }
          }
        });
      });

      // Avatar-name input
      document.querySelectorAll('.avatar-name-input').forEach(input => {
        input.addEventListener('input', e => {
          // @ts-ignore - Event target
          const avatarIndex = e.target.getAttribute('data-avatar-index');
          // @ts-ignore - Event target
          const property = e.target.getAttribute('data-property');
          // @ts-ignore - Event target
          const value = e.target.value;

          if (avatarIndex !== null && property) {
            this.updateAvatarProperty(parseInt(avatarIndex), property, value);
          }
        });
      });

      // Avatar file upload
      document.querySelectorAll('.avatar-file-input').forEach(input => {
        input.addEventListener('change', e => {
          this.handleAvatarFileUpload(e.target);
        });
      });

      // Avatar remove button
      document.querySelectorAll('.avatar-remove-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          this.handleAvatarImageRemove(e.target);
        });
      });

      // Friend-background controls (multiple)
      document.querySelectorAll('.background-input, .background-range, .background-number').forEach(input => {
        input.addEventListener('input', e => {
          // @ts-ignore - Event target
          const backgroundIndex = e.target.getAttribute('data-background-index');
          // @ts-ignore - Event target
          const property = e.target.getAttribute('data-property');
          // @ts-ignore - Event target
          const value = e.target.value;

          if (backgroundIndex !== null && property) {
            this.updateBackgroundProperty(parseInt(backgroundIndex), property, value);

            // Keep slider and number input in sync
            if (property === 'rotation' || property === 'scale') {
              const relatedInputs = document.querySelectorAll(
                `[data-background-index="${backgroundIndex}"][data-property="${property}"]`,
              );
              relatedInputs.forEach(relatedInput => {
                // @ts-ignore - HTMLInputElement value property
                if (relatedInput !== e.target) relatedInput.value = value;
              });

              // Update range-value label
              const rangeValueSpan = document.querySelector(
                `[data-background-index="${backgroundIndex}"] .range-value`,
              );
              if (rangeValueSpan && property === 'rotation') {
                rangeValueSpan.textContent = `${value}°`;
              } else if (rangeValueSpan && property === 'scale') {
                rangeValueSpan.textContent = `${value}x`;
              }
            }

            // Update preview
            this.updateBackgroundPreview(parseInt(backgroundIndex));
          }
        });
      });

      // Friend-background name input
      document.querySelectorAll('.background-name-input').forEach(input => {
        input.addEventListener('input', e => {
          // @ts-ignore - Event target
          const backgroundIndex = e.target.getAttribute('data-background-index');
          // @ts-ignore - Event target
          const property = e.target.getAttribute('data-property');
          // @ts-ignore - Event target
          const value = e.target.value;

          if (backgroundIndex !== null && property) {
            this.updateBackgroundProperty(parseInt(backgroundIndex), property, value);
          }
        });
      });

      // Friend-background file upload
      document.querySelectorAll('.background-file-input').forEach(input => {
        input.addEventListener('change', e => {
          this.handleBackgroundFileUpload(e.target);
        });
      });

      // Friend-background remove button
      document.querySelectorAll('.background-remove-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          this.handleBackgroundImageRemove(e.target);
        });
      });
    }

    // Update all avatar previews
    updateAllAvatarPreviews() {
      this.updateAvatarPreview('messageSentAvatar');

      // Update all received-avatar previews
      const config = this.getConfig();
      if (config.messageReceivedAvatars) {
        config.messageReceivedAvatars.forEach((_, index) => {
          this.updateReceivedAvatarPreview(index);
        });
      }
    }

    // Update avatar preview
    updateAvatarPreview(configKey) {
      const config = this.currentConfig[configKey];
      if (!config) return;

      const previewElement = document.getElementById(`${configKey}_preview`);
      if (!previewElement) return;

      const circle = previewElement.querySelector('.avatar-preview-circle');
      if (!circle) return;

      // Read background image
      const backgroundImage = config.backgroundImage || config.backgroundImageUrl;

      // Read transform values
      const rotation = parseFloat(config.rotation) || 0;
      const scale = parseFloat(config.scale) || 1;

      // Apply styles
      if (backgroundImage) {
        // @ts-ignore - HTMLElement style property
        circle.style.backgroundImage = `url(${backgroundImage})`;
        // @ts-ignore - HTMLElement style property
        circle.style.backgroundSize = 'cover';
        // @ts-ignore - HTMLElement style property
        circle.style.backgroundPosition = 'center';
        // @ts-ignore - HTMLElement style property
        circle.style.backgroundRepeat = 'no-repeat';
      } else {
        // @ts-ignore - HTMLElement style property
        circle.style.backgroundImage = '';
        // @ts-ignore - HTMLElement style property
        circle.style.background = '#f0f0f0';
      }

      // Apply transform
      // @ts-ignore - HTMLElement style property
      circle.style.transform = `rotate(${rotation}deg) scale(${scale})`;
      // @ts-ignore - HTMLElement style property
      circle.style.transformOrigin = 'center center';
    }

    // Update received-avatar preview
    updateReceivedAvatarPreview(avatarIndex) {
      const config = this.getConfig();
      if (!config.messageReceivedAvatars || !config.messageReceivedAvatars[avatarIndex]) {
        console.warn(`[Avatar Preview] Avatar config missing: index=${avatarIndex}`);
        return;
      }

      const avatar = config.messageReceivedAvatars[avatarIndex];
      const previewElement = document.querySelector(`[data-avatar-index="${avatarIndex}"] .avatar-preview-circle`);
      if (!previewElement) {
        console.warn(`[Avatar Preview] Preview element missing: [data-avatar-index="${avatarIndex}"] .avatar-preview-circle`);
        return;
      }

      // Same URL formatter as generateCSS
      const formatImageUrl = url => {
        if (!url) return '';
        if (url.startsWith('data:')) return url;
        return url; // Return the URL unquoted (style attrs do not want quotes)
      };

      // Read background image
      const backgroundImage = avatar.backgroundImage || avatar.backgroundImageUrl;
      const formattedUrl = formatImageUrl(backgroundImage);

      console.log(`[Avatar Preview] Updating avatar preview ${avatarIndex}:`, {
        name: avatar.name,
        originalUrl: backgroundImage,
        formattedUrl: formattedUrl,
        rotation: avatar.rotation,
        scale: avatar.scale,
      });

      // Read transform values
      const rotation = parseFloat(avatar.rotation) || 0;
      const scale = parseFloat(avatar.scale) || 1;

      // Apply styles
      if (formattedUrl) {
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundImage = `url(${formattedUrl})`;
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundSize = 'cover';
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundPosition = 'center';
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundRepeat = 'no-repeat';
      } else {
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundImage = '';
        // @ts-ignore - HTMLElement style property
        previewElement.style.background = '#f0f0f0';
      }

      // Apply transform
      // @ts-ignore - HTMLElement style property
      previewElement.style.transform = `rotate(${rotation}deg) scale(${scale})`;
      // @ts-ignore - HTMLElement style property
      previewElement.style.transformOrigin = 'center center';
    }

    // Update avatar property
    updateAvatarProperty(avatarIndex, property, value) {
      const config = this.getConfig();
      if (!config.messageReceivedAvatars || !config.messageReceivedAvatars[avatarIndex]) return;

      config.messageReceivedAvatars[avatarIndex][property] = value;
      this.updateConfig('messageReceivedAvatars', null, config.messageReceivedAvatars);

      // Update preview
      if (
        property === 'backgroundImage' ||
        property === 'backgroundImageUrl' ||
        property === 'rotation' ||
        property === 'scale'
      ) {
        this.updateReceivedAvatarPreview(avatarIndex);
      }

      // If friend ID changed, refresh the status indicator
      if (property === 'friendId') {
        this.updateAvatarStatusIndicator(avatarIndex, value);
      }

      // Prompt the user to save
      this.updateStatus('Config changed — click Save As to keep it', 'info');
    }

    // Update avatar status indicator
    updateAvatarStatusIndicator(avatarIndex, friendId) {
      const statusElement = document.querySelector(`[data-avatar-index="${avatarIndex}"] .field-status`);
      if (statusElement) {
        if (friendId && friendId.trim()) {
          statusElement.className = 'field-status valid';
          statusElement.innerHTML = `✅ Valid — CSS: [data-friend-id="${friendId}"] and #message-avatar-${friendId}`;
        } else {
          statusElement.className = 'field-status invalid';
          statusElement.innerHTML = `❌ Invalid — enter a friend ID`;
        }
      }
    }

    // Update friend-background property
    updateBackgroundProperty(backgroundIndex, property, value) {
      const config = this.getConfig();
      if (!config.friendBackgrounds || !config.friendBackgrounds[backgroundIndex]) return;

      config.friendBackgrounds[backgroundIndex][property] = value;
      this.updateConfig('friendBackgrounds', null, config.friendBackgrounds);

      // Update preview
      if (
        property === 'backgroundImage' ||
        property === 'backgroundImageUrl' ||
        property === 'rotation' ||
        property === 'scale' ||
        property === 'backgroundPosition'
      ) {
        this.updateBackgroundPreview(backgroundIndex);
      }

      // If friend ID changed, refresh the status indicator
      if (property === 'friendId') {
        this.updateBackgroundStatusIndicator(backgroundIndex, value);
      }

      // Prompt the user to save
      this.updateStatus('Config changed — click Save As to keep it', 'info');
    }

    // Update friend-background status indicator
    updateBackgroundStatusIndicator(backgroundIndex, friendId) {
      const statusElement = document.querySelector(`[data-background-index="${backgroundIndex}"] .field-status`);
      if (statusElement) {
        if (friendId && friendId.trim()) {
          statusElement.className = 'field-status valid';
          statusElement.innerHTML = `✅ Valid — CSS: .message-detail-content[data-background-id="${friendId}"]`;
        } else {
          statusElement.className = 'field-status invalid';
          statusElement.innerHTML = `❌ Invalid — enter a friend ID`;
        }
      }
    }

    // Update friend-background preview
    updateBackgroundPreview(backgroundIndex) {
      const config = this.getConfig();
      if (!config.friendBackgrounds || !config.friendBackgrounds[backgroundIndex]) return;

      const background = config.friendBackgrounds[backgroundIndex];
      const previewElement = document.querySelector(
        `[data-background-index="${backgroundIndex}"] .background-preview-rect`,
      );

      if (!previewElement) return;

      const backgroundImage = background.backgroundImage || background.backgroundImageUrl || '';
      const formattedUrl = formatImageUrl(backgroundImage);

      console.log(`[Background Preview] Updating friend-background preview ${backgroundIndex}:`, {
        name: background.name,
        originalUrl: backgroundImage,
        formattedUrl: formattedUrl,
        rotation: background.rotation,
        scale: background.scale,
        position: background.backgroundPosition,
      });

      // Read transform values
      const rotation = parseFloat(background.rotation) || 0;
      const scale = parseFloat(background.scale) || 1;
      const backgroundPosition = background.backgroundPosition || 'center center';

      // Apply styles
      if (formattedUrl) {
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundImage = `url(${formattedUrl})`;
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundSize = 'cover';
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundPosition = backgroundPosition;
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundRepeat = 'no-repeat';
      } else {
        // @ts-ignore - HTMLElement style property
        previewElement.style.backgroundImage = '';
        // @ts-ignore - HTMLElement style property
        previewElement.style.background = '#f0f0f0';
      }

      // Apply transform
      // @ts-ignore - HTMLElement style property
      previewElement.style.transform = `rotate(${rotation}deg) scale(${scale})`;
      // @ts-ignore - HTMLElement style property
      previewElement.style.transformOrigin = 'center center';
    }

    // Handle avatar file upload
    async handleAvatarFileUpload(fileInput) {
      const file = fileInput.files[0];
      if (!file) return;

      // @ts-ignore - Event target
      const avatarIndex = parseInt(fileInput.getAttribute('data-avatar-index'));
      const property = fileInput.getAttribute('data-property');

      if (avatarIndex === null || property === null) return;

      console.log('[Style Config Manager] Starting avatar upload:', {
        name: file.name,
        type: file.type,
        size: file.size,
        avatarIndex: avatarIndex,
        property: property,
      });

      // Check file type
      if (!file.type.startsWith('image/')) {
        this.updateStatus('Pick an image file', 'error');
        console.warn('[Style Config Manager] Unsupported file type:', file.type);
        return;
      }

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.updateStatus('Avatar image is too large — use one under 5MB', 'error');
        return;
      }

      // Validate extension
      const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

      if (!validImageExtensions.includes(fileExtension)) {
        this.updateStatus('Unsupported avatar format — use JPG, PNG, GIF, or WebP', 'error');
        return;
      }

      try {
        this.updateStatus('Uploading avatar...', 'loading');

        let imageUrl;
        if (sillyTavernCoreImported && uploadFileAttachmentToServer) {
          try {
            // Normalize the filename
            let fileName = file.name;

            // Infer extension from MIME if missing
            if (!fileName.includes('.')) {
              const mimeToExt = {
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'image/webp': '.webp',
                'image/bmp': '.bmp',
                'image/svg+xml': '.svg',
              };
              const extension = mimeToExt[file.type] || '.jpg';
              fileName = `${fileName}${extension}`;
            }

            // Timestamp prefix to avoid name clashes
            const timestamp = Date.now();
            const safeName = `avatar_${timestamp}_${fileName}`;

            console.log('[Style Config Manager] Preparing avatar upload:', {
              originalName: file.name,
              processedName: safeName,
              type: file.type,
              size: file.size,
            });

            // New File with the right name and type
            const imageFile = new File([file], safeName, {
              type: file.type,
              lastModified: file.lastModified,
            });

            // Upload to SillyTavern Data Bank
            imageUrl = await uploadFileAttachmentToServer(imageFile, 'global');

            console.log('[Style Config Manager] Data Bank avatar URL:', imageUrl);

            // Returned URL must look like an image
            const isValidImageUrl =
              imageUrl &&
              (imageUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
                imageUrl.includes(safeName.replace(/\.[^.]+$/, ''))); // Must include our filename prefix

            if (!isValidImageUrl) {
              console.warn('[Style Config Manager] ❌ Data Bank returned a bad avatar URL (maybe TXT):', imageUrl);
              console.warn('[Style Config Manager] Expected filename to contain:', safeName);
              // Force the base64 fallback
              imageUrl = null;
            } else {
              console.log('[Style Config Manager] ✅ Data Bank avatar upload OK');
            }
          } catch (uploadError) {
            console.warn('[Style Config Manager] Avatar Data Bank upload failed — using base64:', uploadError);
            imageUrl = null;
          }
        }

        if (!imageUrl) {
          console.log('[Style Config Manager] Using base64 for avatar');
          imageUrl = await this.fileToBase64(file);
        }

        // Update avatar config
        this.updateAvatarProperty(avatarIndex, property, imageUrl);
        this.updateStatus('Avatar uploaded — click Save As', 'info');
      } catch (error) {
        console.error('[Style Config Manager] Avatar upload failed:', error);
        this.updateStatus('Avatar upload failed', 'error');
      }
    }

    // Handle avatar image remove
    handleAvatarImageRemove(removeBtn) {
      // @ts-ignore - Event target
      const avatarIndex = parseInt(removeBtn.getAttribute('data-avatar-index'));
      const property = removeBtn.getAttribute('data-property');

      if (avatarIndex !== null && property) {
        this.updateAvatarProperty(avatarIndex, property, '');
        this.updateStatus('Avatar removed — click Save As', 'info');

        // Rerender so button state matches
        this.refreshEditorInterface();
      }
    }

    // Handle friend-background file upload
    async handleBackgroundFileUpload(fileInput) {
      const file = fileInput.files[0];
      if (!file) return;

      // @ts-ignore - Event target
      const backgroundIndex = parseInt(fileInput.getAttribute('data-background-index'));
      const property = fileInput.getAttribute('data-property');

      if (backgroundIndex === null || !property) return;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.updateStatus('Unsupported background format — use JPG, PNG, GIF, or WebP', 'error');
        return;
      }

      try {
        this.updateStatus('Uploading friend background...', 'loading');

        let imageUrl;
        // Use base64 for the background image
        console.log('[Style Config Manager] Using base64 for friend background');
        imageUrl = await this.fileToBase64(file);

        // Update background config
        this.updateBackgroundProperty(backgroundIndex, property, imageUrl);
        this.updateStatus('Friend background uploaded — click Save As', 'info');
      } catch (error) {
        console.error('[Style Config Manager] Friend background upload failed:', error);
        this.updateStatus('Friend background upload failed', 'error');
      }
    }

    // Handle friend-background image remove
    handleBackgroundImageRemove(removeBtn) {
      // @ts-ignore - Event target
      const backgroundIndex = parseInt(removeBtn.getAttribute('data-background-index'));
      const property = removeBtn.getAttribute('data-property');

      if (backgroundIndex !== null && property) {
        this.updateBackgroundProperty(backgroundIndex, property, '');
        this.updateStatus('Friend background removed — click Save As', 'info');

        // Rerender so button state matches
        this.refreshEditorInterface();
      }
    }

    // Handle image upload
    async handleImageUpload(fileInput) {
      const file = fileInput.files[0];
      if (!file) return;

      console.log('[Style Config Manager] Starting image upload:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Check file type
      if (!file.type.startsWith('image/')) {
        this.updateStatus('Pick an image file', 'error');
        console.warn('[Style Config Manager] Unsupported file type:', file.type);
        return;
      }

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.updateStatus('Image is too large — use one under 5MB', 'error');
        return;
      }

      // Validate extension
      const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

      if (!validImageExtensions.includes(fileExtension)) {
        this.updateStatus('Unsupported image format — use JPG, PNG, GIF, or WebP', 'error');
        return;
      }

      try {
        this.updateStatus('Uploading image...', 'loading');

        let imageUrl;

        // Read the chosen upload mode
        const uploadModeInput = document.querySelector('input[name="imageUploadMode"]:checked');
        // @ts-ignore - HTMLInputElement value property
        const uploadMode = uploadModeInput ? uploadModeInput.value : 'auto';

        console.log('[Style Config Manager] Upload mode:', uploadMode);

        if (uploadMode === 'auto' && sillyTavernCoreImported && uploadFileAttachmentToServer) {
          try {
            // Normalize the filename
            let fileName = file.name;

            // Infer extension from MIME if missing
            if (!fileName.includes('.')) {
              const mimeToExt = {
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'image/webp': '.webp',
                'image/bmp': '.bmp',
                'image/svg+xml': '.svg',
              };
              const extension = mimeToExt[file.type] || '.jpg';
              fileName = `${fileName}${extension}`;
            }

            // Timestamp prefix to avoid name clashes
            const timestamp = Date.now();
            const safeName = `mobile_bg_${timestamp}_${fileName}`;

            console.log('[Style Config Manager] Preparing upload:', {
              originalName: file.name,
              processedName: safeName,
              type: file.type,
              size: file.size,
            });

            // New File with the right name and type
            const imageFile = new File([file], safeName, {
              type: file.type,
              lastModified: file.lastModified,
            });

            // Upload to SillyTavern Data Bank
            imageUrl = await uploadFileAttachmentToServer(imageFile, 'global');

            console.log('[Style Config Manager] Data Bank URL:', imageUrl);

            // Returned URL must look like an image
            const isValidImageUrl =
              imageUrl &&
              (imageUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
                imageUrl.includes(safeName.replace(/\.[^.]+$/, ''))); // Must include our filename prefix

            if (!isValidImageUrl) {
              console.warn('[Style Config Manager] ❌ Data Bank returned a bad URL (maybe TXT):', imageUrl);
              console.warn('[Style Config Manager] Expected filename to contain:', safeName);
              // Force the base64 fallback
              imageUrl = null;
            } else {
              console.log('[Style Config Manager] ✅ Data Bank upload OK');
            }
          } catch (uploadError) {
            console.warn('[Style Config Manager] Data Bank upload failed:', uploadError);
            imageUrl = null;
          }
        }

        if (!imageUrl) {
          // Fallback / user choice: convert to base64
          if (uploadMode === 'base64') {
            console.log('[Style Config Manager] User chose base64 — converting directly');
          } else {
            console.log('[Style Config Manager] Data Bank upload failed or bad format — using base64');
          }
          imageUrl = await this.fileToBase64(file);
          console.log('[Style Config Manager] base64 length:', imageUrl.length);
        }

        // Final validate and write config
        const targetFieldId = fileInput.getAttribute('data-target');
        const targetInput = document.getElementById(targetFieldId);

        if (targetInput && imageUrl) {
          // Last URL validity check
          const isFinalValidUrl =
            imageUrl.startsWith('data:') || // base64
            imageUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) || // image extension
            (imageUrl.startsWith('/user/files/') && !imageUrl.endsWith('.txt')); // not a txt file

          if (!isFinalValidUrl) {
            console.error('[Style Config Manager] ❌ Final URL check failed — not saving:', imageUrl);
            this.updateStatus('Invalid image URL — try again', 'error');
            return;
          }

          // @ts-ignore - HTMLInputElement value property
          targetInput.value = imageUrl;

          const key = targetInput.getAttribute('data-config-key');
          const property = targetInput.getAttribute('data-config-property');

          if (key && property) {
            this.updateConfig(key, property, imageUrl);
            this.updateImagePreview(targetFieldId, imageUrl);

            if (imageUrl.startsWith('data:')) {
              this.updateStatus('Image saved as base64', 'success');
              console.log('[Style Config Manager] ✅ Saved image as base64');
            } else {
              this.updateStatus('Image uploaded', 'success');
              console.log('[Style Config Manager] ✅ Saved image via file URL:', imageUrl);
            }
          }
        }
      } catch (error) {
        console.error('[Style Config Manager] Image upload failed:', error);
        this.updateStatus('Image upload failed', 'error');
      }
    }

    // Handle image remove
    handleImageRemove(removeBtn) {
      const targetFieldId = removeBtn.getAttribute('data-target');
      const targetInput = document.getElementById(targetFieldId);

      if (targetInput) {
        // @ts-ignore - HTMLInputElement value property
        targetInput.value = '';

        const key = targetInput.getAttribute('data-config-key');
        const property = targetInput.getAttribute('data-config-property');

        if (key && property) {
          this.updateConfig(key, property, '');
          this.updateImagePreview(targetFieldId, '');
          this.updateStatus('Background image removed', 'info');
        }
      }
    }

    // File to base64
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Update image preview
    updateImagePreview(fieldId, imageUrl) {
      const previewContainer = document.querySelector(`[data-field-id="${fieldId}"]`);
      if (previewContainer) {
        if (imageUrl) {
          previewContainer.innerHTML = `<img src="${imageUrl}" alt="Background preview" />`;

          // Update remove button
          const controlsContainer = previewContainer.nextElementSibling;
          if (controlsContainer && !controlsContainer.querySelector('.remove-btn')) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '🗑️ Remove';
            removeBtn.setAttribute('data-target', fieldId);
            removeBtn.addEventListener('click', e => {
              this.handleImageRemove(e.target);
            });
            controlsContainer.appendChild(removeBtn);
          }
        } else {
          previewContainer.innerHTML = '<div class="no-image">📷 No image</div>';

          // Remove the remove button
          const controlsContainer = previewContainer.nextElementSibling;
          if (controlsContainer) {
            const removeBtn = controlsContainer.querySelector('.remove-btn');
            if (removeBtn) {
              removeBtn.remove();
            }
          }
        }
      }
    }

    // Preview styles
    previewStyles() {
      this.applyStyles();
      this.updateStatus('Preview applied — click Save to keep it', 'success');
    }

    // Reset styles
    resetStyles() {
      if (confirm('Reset to default styles? This clears all custom settings.')) {
        this.resetToDefault();

        // Refresh form inputs
        document.querySelectorAll('.config-input').forEach(input => {
          const key = input.getAttribute('data-config-key');
          const property = input.getAttribute('data-config-property');

          if (key && property && this.currentConfig[key]) {
            // @ts-ignore - HTMLInputElement value property
            input.value = this.currentConfig[key][property] || '';
          }
        });

        this.applyStyles();
        this.updateStatus('Reset to default styles', 'info');
      }
    }

    // Update status
    updateStatus(message, type = 'info') {
      const statusElement = document.getElementById('config-status');
      if (!statusElement) return;

      const iconMap = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        loading: '⏳',
      };

      const statusIcon = statusElement.querySelector('.status-icon');
      const statusText = statusElement.querySelector('.status-text');

      if (statusIcon) statusIcon.textContent = iconMap[type] || 'ℹ️';
      if (statusText) statusText.textContent = message;

      statusElement.className = `config-status ${type}`;

      // Auto-clear success/error status
      if (type === 'success' || type === 'error') {
        setTimeout(() => {
          this.updateStatus('Click Save As when you are done', 'info');
        }, 3000);
      }
    }

    // Dispatch ready event
    dispatchReadyEvent() {
      const event = new CustomEvent('styleConfigManagerReady', {
        detail: {
          manager: this,
          config: this.currentConfig,
        },
      });
      window.dispatchEvent(event);
    }

    // Dispatch styles-applied event
    dispatchStyleAppliedEvent() {
      const event = new CustomEvent('mobileStylesApplied', {
        detail: {
          config: this.currentConfig,
          timestamp: Date.now(),
        },
      });
      window.dispatchEvent(event);
    }

    // Get stylesheet
    getStyleSheet() {
      return this.generateCSS();
    }

    // Check ready
    isConfigReady() {
      return this.isReady && this.configLoaded;
    }

    // Wait until config is loaded
    async waitForReady() {
      if (this.isConfigReady()) {
        return;
      }

      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (this.isConfigReady()) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
  }

  // Create global instance
  // @ts-ignore - Global constructor
  window.StyleConfigManager = StyleConfigManager;

  // Settings-app API
  // @ts-ignore - Add global functions
  window.getStyleConfigAppContent = function () {
    console.log('[Style Config Manager] Getting style config app content');

    // @ts-ignore - Window global
    if (!window.styleConfigManager) {
      console.log('[Style Config Manager] Creating style config manager');
      // @ts-ignore - Window global
      window.styleConfigManager = new StyleConfigManager();
    }

    // Always return the full UI; internals handle loading
    // @ts-ignore - Window global
    return window.styleConfigManager.getSettingsAppContent();
  };

  // @ts-ignore - Add global functions
  window.bindStyleConfigEvents = function () {
    console.log('[Style Config Manager] Binding style config events');

    // @ts-ignore - Window global
    if (!window.styleConfigManager) {
      console.log('[Style Config Manager] Creating style config manager');
      // @ts-ignore - Window global
      window.styleConfigManager = new StyleConfigManager();
    }

    // Bind events even if not fully ready
    // @ts-ignore - Window global
    window.styleConfigManager.bindSettingsEvents();
    console.log('[Style Config Manager] Events bound');

    // If not ready, wait then bind again
    // @ts-ignore - Window global
    if (!window.styleConfigManager.isConfigReady()) {
      console.log('[Style Config Manager] Manager not ready — waiting...');
      // @ts-ignore - Window global
      window.styleConfigManager
        .waitForReady()
        .then(() => {
          console.log('[Style Config Manager] Manager ready — rebinding events');
          // @ts-ignore - Window global
          window.styleConfigManager.bindSettingsEvents();
        })
        .catch(error => {
          console.error('[Style Config Manager] waitForReady failed:', error);
        });
    }
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // @ts-ignore - Window global
      window.styleConfigManager = new StyleConfigManager();
    });
  } else {
    // DOM already ready
    setTimeout(() => {
      // @ts-ignore - Window global
      if (!window.styleConfigManager) {
        // @ts-ignore - Window global
        window.styleConfigManager = new StyleConfigManager();
      }
    }, 1000);
  }

  console.log('[Style Config Manager] Style config manager module loaded');
} // End StyleConfigManager guard
