// ==Mobile Context Editor==
// @name         Mobile Context Editor
// @version      2.0.0
// @description  SillyTavern mobile context editor — native API
// @author       cd
// @license      MIT

/**
 * SillyTavern mobile context editor v2.2 — performance build
 * Uses SillyTavern.getContext() API and data
 * Adds paging, virtual scroll, and lazy load
 */
class MobileContextEditor {
  constructor() {
    this.initialized = false;
    this.currentChatData = null;
    this.isModified = false;

    // Performance settings
    this.pageSize = 20; // Messages per page
    this.currentPage = 0; // Current page
    this.totalPages = 0; // Total pages
    this.messageCache = new Map(); // Message cache
    this.renderCache = new Map(); // Render cache
    this.isLoading = false; // Loading flag
    this.virtualScrollEnabled = true; // Virtual-scroll toggle

    this.log('info', 'MobileContextEditor v2.2 starting — performance build');

    // Init immediately
    this.initialize();
  }

  /**
   * Wait for SillyTavern — listen for APP_READY
   */
  async waitForSillyTavern() {
    // Check whether APP_READY exists
    if (window.eventSource && window.event_types) {
      console.log('[Mobile Context Editor] Listening for APP_READY...');
      window.eventSource.on(window.event_types.APP_READY, () => {
        console.log('[Mobile Context Editor] ✅ APP_READY fired — initializing');
        this.initialize();
      });
    } else {
      // Fallback: wait for the event system
      const checkInterval = setInterval(() => {
        if (window.eventSource && window.event_types) {
          clearInterval(checkInterval);
          console.log('[Mobile Context Editor] Event system ready — listening for APP_READY...');
          window.eventSource.on(window.event_types.APP_READY, () => {
            console.log('[Mobile Context Editor] ✅ APP_READY fired — initializing');
            this.initialize();
          });
        } else if (this.isSillyTavernReady()) {
          // If SillyTavern is already up, init now
          clearInterval(checkInterval);
          console.log('[Mobile Context Editor] ✅ SillyTavern ready — initializing now');
          this.initialize();
        }
      }, 500);
    }
  }

  /**
   * Check whether SillyTavern is ready
   */
  isSillyTavernReady() {
    try {
      // Check the new SillyTavern API
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        return !!(context && context.chat && Array.isArray(context.chat));
      }

      // Fall back to old globals
      return !!(window.SillyTavern && window.chat && window.characters && window.this_chid !== undefined);
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize editor
   */
  initialize() {
    try {
      this.initialized = true;
      this.setupUI();
      this.bindEvents();
      console.log('[Mobile Context Editor] v2.0 init complete — native API');
    } catch (error) {
      console.error('[Mobile Context Editor] Init failed:', error);
    }
  }

  /**
   * Force-init — build UI even if SillyTavern is not ready
   */
  forceInitialize() {
    try {
      console.log('[Mobile Context Editor] 🔧 Force-initializing editor UI');
      this.setupUI();
      this.bindEvents();
      this.showEditor();
      return true;
    } catch (error) {
      console.error('[Mobile Context Editor] Force-init failed:', error);
      return false;
    }
  }

  /**
   * Get current chat — paging + cache
   */
  getCurrentChatData(useCache = true) {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern is not ready');
      }

      // Return cache when asked and present
      if (useCache && this.currentChatData) {
        return this.currentChatData;
      }

      let chatData;

      // Prefer the new SillyTavern API
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        const currentCharacter = context.characters[context.characterId];

        chatData = {
          header: {
            user_name: context.name1 || 'User',
            character_name: context.name2 || currentCharacter?.name || 'Assistant',
            create_date: context.chatCreateDate || Date.now(),
            chat_metadata: context.chatMetadata || {},
          },
          messages: context.chat, // Live reference to SillyTavern chat
          fileName: currentCharacter?.chat,
          characterName: currentCharacter?.name || 'Assistant',
          userName: context.name1 || 'User',
          avatarUrl: currentCharacter?.avatar,
        };
      } else {
        // Fall back to old globals
        const character = window.characters[window.this_chid];
        if (!character) {
          throw new Error('Current character not found');
        }

        chatData = {
          header: {
            user_name: window.name1 || 'User',
            character_name: window.name2 || character.name,
            create_date: window.chat_create_date || Date.now(),
            chat_metadata: window.chat_metadata || {},
          },
          messages: window.chat,
          fileName: character.chat,
          characterName: character.name,
          userName: window.name1 || 'User',
          avatarUrl: character.avatar,
        };
      }

      this.currentChatData = chatData;

      // Compute paging
      this.totalPages = Math.ceil(chatData.messages.length / this.pageSize);
      this.currentPage = Math.max(0, this.totalPages - 1); // Default to last page

      this.log('info', `Loaded chat: ${chatData.messages.length} messages (${chatData.characterName}), pages ${this.totalPages}`);

      return chatData;
    } catch (error) {
      this.log('error', 'Failed to get chat data', error);
      throw error;
    }
  }

  /**
   * Messages for one page
   */
  getPageMessages(pageIndex = this.currentPage) {
    if (!this.currentChatData) {
      return [];
    }

    const messages = this.currentChatData.messages;
    const startIndex = pageIndex * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, messages.length);

    return messages.slice(startIndex, endIndex).map((msg, index) => ({
      ...msg,
      globalIndex: startIndex + index, // Global index
      pageIndex: index // Index on this page
    }));
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.messageCache.clear();
    this.renderCache.clear();
    this.currentChatData = null;
    this.log('info', 'Cache cleared');
  }

  /**
   * Load via server paging API — large files
   */
  async loadChatDataWithPagination(page = 0, pageSize = this.pageSize, searchQuery = '') {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern is not ready');
      }

      let character, avatarUrl, fileName;

      // Get current character
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        character = context.characters[context.characterId];
        avatarUrl = character?.avatar;
        fileName = character?.chat;
      } else {
        character = window.characters[window.this_chid];
        avatarUrl = character?.avatar;
        fileName = character?.chat;
      }

      if (!character || !fileName) {
        throw new Error('Character or chat file not found');
      }

      this.log('info', `Paging API load: page ${page + 1}, pageSize ${pageSize}`);

      const response = await fetch('/api/chats/get-paginated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar_url: avatarUrl,
          file_name: fileName.replace('.jsonl', ''),
          page: page,
          pageSize: pageSize,
          searchQuery: searchQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Update paging fields
      this.currentPage = data.currentPage;
      this.totalPages = data.totalPages;
      this.pageSize = data.pageSize;

      this.log('info', `Paged load ok: ${data.messages.length} messages, total ${data.totalCount}, file size ${data.fileSize}`);

      return {
        messages: data.messages,
        totalCount: data.totalCount,
        totalPages: data.totalPages,
        currentPage: data.currentPage,
        pageSize: data.pageSize,
        hasMore: data.hasMore,
        fileSize: data.fileSize,
        characterName: character.name,
        userName: window.name1 || 'User',
      };
    } catch (error) {
      this.log('error', 'Paged chat load failed', error);
      throw error;
    }
  }

  /**
   * Pick memory vs paging from file size
   */
  async smartLoadChatData() {
    try {
      // Probe chat size first
      const basicData = this.getCurrentChatData(false);
      const messageCount = basicData.messages.length;

      // Use paging API past the threshold
      const LARGE_CHAT_THRESHOLD = 500; // 500+ messages counts as large

      if (messageCount > LARGE_CHAT_THRESHOLD) {
        this.log('info', `Large chat (${messageCount} messages) — paging mode`);
        this.usePaginationMode = true;

        // Load last page via paging API
        const lastPage = Math.max(0, Math.ceil(messageCount / this.pageSize) - 1);
        return await this.loadChatDataWithPagination(lastPage, this.pageSize);
      } else {
        this.log('info', `Normal chat (${messageCount} messages) — memory mode`);
        this.usePaginationMode = false;
        return basicData;
      }
    } catch (error) {
      this.log('error', 'Smart load failed — basic mode', error);
      this.usePaginationMode = false;
      return this.getCurrentChatData(false);
    }
  }

  /**
   * Edit a message (SillyTavern API)
   */
  async modifyMessage(messageIndex, newContent, newName = null) {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern is not ready');
      }

      const context = window.SillyTavern.getContext();
      const chat = context.chat;

      if (messageIndex < 0 || messageIndex >= chat.length) {
        throw new Error(`Invalid message index: ${messageIndex} (total ${chat.length} messages)`);
      }

      // Patch the chat array
      const message = chat[messageIndex];
      const oldContent = message.mes;

      message.mes = newContent;
      if (newName !== null) {
        message.name = newName;
      }

      // Save and refresh via context API
      await context.saveChat();
    //   await context.reloadCurrentChat(); // Reload current chat

      this.isModified = true;
      console.log(
        `[Mobile Context Editor] Edited message ${messageIndex}: "${oldContent.substring(
          0,
          30,
        )}..." → "${newContent.substring(0, 30)}..."`,
      );

      return true;
    } catch (error) {
      console.error('[Mobile Context Editor] Edit message failed:', error);
      throw error;
    }
  }

  /**
   * Add a message (native SillyTavern API)
   */
  async addMessage(content, isUser = false, name = null, extra = {}) {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern is not ready');
      }

      const context = window.SillyTavern.getContext();

      // Build a SillyTavern-shaped message
      const message = {
        name: name || (isUser ? context.name1 || 'User' : context.name2 || 'Assistant'),
        is_user: true,
        is_system: false,
        force_avatar: false,
        mes: content,
        send_date: Date.now(),
        extra: extra,
        ...(!isUser && { gen_started: Date.now(), gen_finished: Date.now() }),
      };

      // Add gen fields for non-user messages
      if (!isUser) {
        message.swipe_id = 0;
        message.swipes = [content];
      }

      // Push onto chat
      context.chat.push(message);

      // Add via context API
      context.addOneMessage(message);

      // Save chat
      await context.saveChat();

      this.isModified = true;
      console.log(`[Mobile Context Editor] Added ${isUser ? 'user' : 'assistant'} message: "${content.substring(0, 50)}..."`);

      return context.chat.length - 1; // New message index
    } catch (error) {
      console.error('[Mobile Context Editor] Add message failed:', error);
      throw error;
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(messageIndex) {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern is not ready');
      }

      let chatArray;

      // Get chat array
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        chatArray = context.chat;
      } else {
        chatArray = window.chat;
      }

      if (!chatArray || !Array.isArray(chatArray)) {
        throw new Error('Chat data unavailable');
      }

      if (messageIndex < 0 || messageIndex >= chatArray.length) {
        throw new Error(`Invalid message index: ${messageIndex}, total messages: ${chatArray.length}`);
      }

      const messageToDelete = chatArray[messageIndex];
      this.log(
        'info',
        `Deleting message ${messageIndex}: ${messageToDelete.name}: ${messageToDelete.mes.substring(0, 50)}...`,
      );

      // Splice out of the chat array
      const deletedMessage = chatArray.splice(messageIndex, 1)[0];
      this.isModified = true;

      this.log('info', `Message ${messageIndex} deleted`);

      // Save and refresh now
      await this.saveChatData();
      await this.refreshChatDisplay();

      return deletedMessage;
    } catch (error) {
      this.log('error', 'Delete message failed', error);
      throw error;
    }
  }

  /**
   * Save chat data
   */
  async saveChatData() {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern is not ready');
      }

      this.log('info', 'Saving chat...');

      // Method 1: context.saveChat (new API)
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        try {
          const context = window.SillyTavern.getContext();
          if (context && typeof context.saveChat === 'function') {
            this.log('info', 'Saving with context.saveChat...');
            await context.saveChat();
            this.log('info', 'context.saveChat succeeded');
            this.isModified = false;
            return true;
          }
        } catch (error) {
          this.log('warn', 'context.saveChat failed — trying next method', error);
        }
      }

      // Method 2: window.saveChat
      if (typeof window.saveChat === 'function') {
        this.log('info', 'Saving with window.saveChat...');
        await window.saveChat();
        this.log('info', 'window.saveChat succeeded');
        this.isModified = false;
        return true;
      }

      // Method 3: saveChatConditional
      if (typeof window.saveChatConditional === 'function') {
        this.log('info', 'Saving with window.saveChatConditional...');
        await window.saveChatConditional();
        this.log('info', 'window.saveChatConditional succeeded');
        this.isModified = false;
        return true;
      }

      // Method 4: manual API (legacy)
      let character, chatData, userName, characterName;

      // Get character and chat
      if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
        const context = window.SillyTavern.getContext();
        character = context.characters[context.characterId];
        chatData = context.chat;
        userName = context.name1 || 'User';
        characterName = context.name2 || character?.name || 'Assistant';
      } else {
        character = window.characters?.[window.this_chid];
        chatData = window.chat;
        userName = window.name1 || 'User';
        characterName = window.name2 || character?.name || 'Assistant';
      }

      if (character && chatData) {
        this.log('info', 'Saving via manual API...');

        const saveData = [
          {
            user_name: userName,
            character_name: characterName,
            create_date: window.chat_create_date || Date.now(),
            chat_metadata: window.chat_metadata || {},
          },
          ...chatData,
        ];

        const response = await fetch('/api/chats/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ch_name: character.name,
            file_name: character.chat,
            chat: saveData,
            avatar_url: character.avatar,
          }),
        });

        if (!response.ok) {
          throw new Error(`Save failed: ${response.status} ${response.statusText}`);
        }

        this.log('info', 'Manual API save succeeded');
        this.isModified = false;
        return true;
      }

      throw new Error('No save method available or character info missing');
    } catch (error) {
      this.log('error', 'Failed to save chat', error);
      throw error;
    }
  }

  /**
   * Refresh chat UI
   */
  async refreshChatDisplay() {
    try {
      if (typeof window.printMessages === 'function') {
        this.log('info', 'Refreshing chat UI...');
        await window.printMessages();
        this.log('info', 'Chat UI refreshed');
      } else {
        this.log('warn', 'printMessages unavailable');
      }
    } catch (error) {
      this.log('error', 'Failed to refresh chat UI', error);
    }
  }

  /**
   * Export chat as JSONL
   */
  exportToJsonl() {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern is not ready');
      }

      const context = window.SillyTavern.getContext();

      // Build SillyTavern-format JSONL
      const header = {
        user_name: context.name1 || 'User',
        character_name: context.name2 || 'Assistant',
        create_date: context.chat_create_date || Date.now(),
        chat_metadata: context.chatMetadata || {},
      };

      const saveData = [header, ...context.chat];
      const jsonlData = saveData.map(JSON.stringify).join('\n');

      // Download file
      const blob = new Blob([jsonlData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_edited_${Date.now()}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log('[Mobile Context Editor] JSONL export done');
      return jsonlData;
    } catch (error) {
      console.error('[Mobile Context Editor] Export failed:', error);
      throw error;
    }
  }

  /**
   * Get stats
   */
  getStatistics() {
    try {
      if (!this.isSillyTavernReady()) return null;

      const context = window.SillyTavern.getContext();
      const messages = context.chat;
      const userMessages = messages.filter(msg => msg.is_user);
      const botMessages = messages.filter(msg => !msg.is_user);
      const totalCharacters = messages.reduce((sum, msg) => sum + (msg.mes || '').length, 0);

      return {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        botMessages: botMessages.length,
        totalCharacters: totalCharacters,
        averageMessageLength: Math.round(totalCharacters / messages.length),
        characterName: context.characters[context.characterId]?.name || context.name2 || 'Unknown',
        isGroup: !!context.groupId,
        sillyTavernReady: this.isSillyTavernReady(),
      };
    } catch (error) {
      console.error('[Mobile Context Editor] Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Debug SillyTavern status
   */
  debugSillyTavernStatus() {
    console.log('=== SillyTavern status ===');
    console.log('SillyTavern object:', !!window.SillyTavern);
    console.log('chat array:', !!window.chat, window.chat?.length);
    console.log('characters array:', !!window.characters, window.characters?.length);
    console.log('this_chid:', window.this_chid);
    console.log('saveChat:', typeof window.saveChat);
    console.log('printMessages:', typeof window.printMessages);
    console.log('saveChatConditional:', typeof window.saveChatConditional);
    console.log('Ready:', this.isSillyTavernReady());
  }

  /**
   * Wait for SillyTavern
   */
  async waitForSillyTavernReady(timeout = 30000) {
    console.log('[Mobile Context Editor] Waiting for SillyTavern...');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.isSillyTavernReady()) {
        console.log('[Mobile Context Editor] ✅ SillyTavern ready');
        return true;
      }

      // Retry after 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.warn('[Mobile Context Editor] ⚠️ Timed out — SillyTavern may still be loading');
    return false;
  }

  /**
   * Mobile editor UI with paging controls
   */
  setupUI() {
    // Wait for jQuery
    if (typeof $ === 'undefined') {
      setTimeout(() => this.setupUI(), 1000);
      return;
    }

    // Editor button, bottom-right like the other mobile buttons
    const buttonHtml = `
            <button id="mobile-context-editor-btn" style="position: fixed; bottom: 80px; right: 20px; z-index: 9997; background: linear-gradient(135deg, #9C27B0, #673AB7); color: white; border: none; padding: 12px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.3); transition: all 0.3s ease; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                🛠️
            </button>
        `;

    $('body').append(buttonHtml);

    // Hover
    $('#mobile-context-editor-btn').hover(
      function () {
        $(this).css('transform', 'scale(1.1)');
      },
      function () {
        $(this).css('transform', 'scale(1)');
      },
    );

    // Editor modal
    const modalHtml = `
            <div id="mobile-context-editor-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 9999; overflow-y: auto;">

                <div style="background: linear-gradient(135deg, #9C27B0, #673AB7); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                    <h3 style="margin: 0; font-size: 18px;">🛠️ Context editor v2.2</h3>
                    <button id="mobile-context-editor-close" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 12px; border-radius: 15px; cursor: pointer; font-size: 14px;">✖️ Close</button>
                </div>

                <div style="padding: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <button id="mobile-load-chat-btn" style="background: #4CAF50; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;">📂 Load chat</button>
                        <button id="mobile-save-chat-btn" style="background: #2196F3; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>💾 Save</button>
                        <button id="mobile-add-message-btn" style="background: #FF9800; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>➕ Add</button>
                        <button id="mobile-stats-btn" style="background: #795548; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>📊 Stats</button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <button id="mobile-refresh-btn" style="background: #607D8B; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>🔄 Refresh</button>
                        <button id="mobile-export-btn" style="background: #E91E63; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>📤 Export</button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <button id="mobile-quick-edit-btn" style="background: #9C27B0; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>⚡ Quick edit</button>
                        <button id="mobile-test-api-btn" style="background: #00BCD4; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px;" disabled>🔧 Test API</button>
                    </div>

                    <!-- Paging controls -->
                    <div id="mobile-pagination-controls" style="display: none; margin-bottom: 15px; padding: 10px; background: #e8f5e8; border-radius: 8px; border: 1px solid #4CAF50;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span id="mobile-page-info" style="font-size: 14px; color: #333; font-weight: bold;">Page 1 of 1</span>
                            <div>
                                <label style="font-size: 12px; color: #666;">Per page:</label>
                                <select id="mobile-page-size" style="padding: 4px; border-radius: 4px; border: 1px solid #ddd; font-size: 12px;">
                                    <option value="10">10</option>
                                    <option value="20" selected>20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button id="mobile-first-page" style="padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">⏮️</button>
                            <button id="mobile-prev-page" style="padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">◀️</button>
                            <button id="mobile-next-page" style="padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">▶️</button>
                            <button id="mobile-last-page" style="padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">⏭️</button>
                        </div>
                    </div>

                    <div id="mobile-context-editor-status" style="margin-bottom: 15px; padding: 12px; background: #f5f5f5; border-radius: 8px; color: #333; min-height: 20px; font-size: 14px; border-left: 4px solid #2196F3;"></div>

                    <div id="mobile-context-editor-content" style="border: 1px solid #ddd; border-radius: 8px; background: #fafafa; min-height: 300px; max-height: 400px; overflow-y: auto;">
                        <p style="text-align: center; padding: 40px 20px; color: #666; margin: 0; font-size: 16px;">Click "Load chat" to start</p>
                    </div>

                    <!-- Loading indicator -->
                    <div id="mobile-loading-indicator" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; text-align: center; z-index: 10000;">
                        <div style="font-size: 24px; margin-bottom: 10px;">⏳</div>
                        <div>Loading...</div>
                    </div>
                </div>
            </div>
        `;

    $('body').append(modalHtml);
  }

  /**
   * Bind mobile events
   */
  bindEvents() {
    if (typeof $ === 'undefined') {
      setTimeout(() => this.bindEvents(), 1000);
      return;
    }

    // Toggle editor
    $(document).on('click', '#mobile-context-editor-btn', () => this.showEditor());
    $(document).on('click', '#mobile-context-editor-close', () => this.hideEditor());

    // Action buttons
    $(document).on('click', '#mobile-load-chat-btn', async () => {
      try {
        this.showLoadingIndicator(true);
        this.updateStatus('🔄 Checking SillyTavern...');

        // Wait for SillyTavern
        const isReady = await this.waitForSillyTavernReady(10000);
        if (!isReady) {
          this.updateStatus('❌ SillyTavern is not ready — wait for the page to finish loading');
          this.showLoadingIndicator(false);
          return;
        }

        this.updateStatus('🔄 Measuring chat size...');

        // Smart load
        const chatData = await this.smartLoadChatData();

        if (this.usePaginationMode) {
          // Paging mode
          this.currentChatData = {
            messages: [], // Do not cache every message in paging mode
            characterName: chatData.characterName,
            userName: chatData.userName,
          };
          this.totalPages = chatData.totalPages;
          this.currentPage = chatData.currentPage;

          this.updateStatus(`🔄 Rendering messages (paged)...`);
          await this.renderPaginatedMessages(chatData.messages);

          this.updateStatus(`✅ Large chat loaded: ${chatData.totalCount} messages (${chatData.characterName}) — paged [${chatData.fileSize}]`);
        } else {
          // Memory mode
          this.currentChatData = chatData;
          this.totalPages = Math.ceil(chatData.messages.length / this.pageSize);
          this.currentPage = Math.max(0, this.totalPages - 1);

          this.updateStatus(`🔄 Rendering messages (memory)...`);
          await this.renderMobileChatMessages();

          this.updateStatus(`✅ Chat loaded: ${chatData.messages.length} messages (${chatData.characterName}) — memory`);
        }

        // Show paging controls
        this.showPaginationControls(true);
        this.updatePaginationInfo();
        this.updateMobileButtonStates();
        this.showLoadingIndicator(false);

      } catch (error) {
        this.updateStatus(`❌ Load failed: ${error.message}`);
        this.showLoadingIndicator(false);
      }
    });

    $(document).on('click', '#mobile-save-chat-btn', async () => {
      try {
        await this.saveChatData();
        this.updateStatus('✅ Saved');
      } catch (error) {
        this.updateStatus(`❌ Save failed: ${error.message}`);
      }
    });

    $(document).on('click', '#mobile-add-message-btn', async () => {
      const content = prompt('New message text:');
      if (content) {
        const isUser = confirm('Is this a user message?\nOK = user\nCancel = character');
        try {
          await this.addMessage(content, isUser);
          this.renderMobileChatMessages();
          this.updateStatus(`➕ Added ${isUser ? 'user' : 'character'} message`);
          this.updateMobileButtonStates();
        } catch (error) {
          this.updateStatus(`❌ Add failed: ${error.message}`);
        }
      }
    });

    $(document).on('click', '#mobile-stats-btn', () => {
      const stats = this.getStatistics();
      if (stats) {
        const statsText = `📊 Total ${stats.totalMessages} | user ${stats.userMessages} | character ${stats.botMessages} | ${stats.totalCharacters} chars | ${stats.characterName}`;
        this.updateStatus(statsText);
      }
    });

    $(document).on('click', '#mobile-refresh-btn', async () => {
      try {
        await this.refreshChatDisplay();
        this.renderMobileChatMessages();
        this.updateStatus('🔄 UI refreshed');
      } catch (error) {
        this.updateStatus(`❌ Refresh failed: ${error.message}`);
      }
    });

    $(document).on('click', '#mobile-export-btn', () => {
      try {
        this.exportToJsonl();
        this.updateStatus('📤 JSONL exported');
      } catch (error) {
        this.updateStatus(`❌ Export failed: ${error.message}`);
      }
    });

    $(document).on('click', '#mobile-quick-edit-btn', async () => {
      try {
        this.updateStatus('⚡ Quick edit...');
        await this.quickEditLastMessage();
      } catch (error) {
        this.updateStatus(`❌ Quick edit failed: ${error.message}`);
      }
    });

    $(document).on('click', '#mobile-test-api-btn', async () => {
      try {
        this.updateStatus('🔧 Testing API...');
        await this.testApiConnection();
      } catch (error) {
        this.updateStatus(`❌ API test failed: ${error.message}`);
      }
    });

    // Paging events
    $(document).on('click', '#mobile-first-page', () => this.goToPage(0));
    $(document).on('click', '#mobile-prev-page', () => this.goToPage(this.currentPage - 1));
    $(document).on('click', '#mobile-next-page', () => this.goToPage(this.currentPage + 1));
    $(document).on('click', '#mobile-last-page', () => this.goToPage(this.totalPages - 1));

    $(document).on('change', '#mobile-page-size', async (e) => {
      const newPageSize = parseInt(e.target.value);
      await this.changePageSize(newPageSize);
    });

    // Message actions
    $(document).on('click', '.mobile-edit-message-btn', async e => {
      const messageIndex = parseInt($(e.target).data('index'));
      await this.editMobileMessage(messageIndex);
    });

    $(document).on('click', '.mobile-delete-message-btn', async e => {
      if (confirm('Delete this message?')) {
        const messageIndex = parseInt($(e.target).data('index'));
        try {
          await this.deleteMessage(messageIndex);

          // Recalculate pages and refresh
          this.clearCache();
          this.getCurrentChatData(false);
          this.updatePaginationInfo();
          await this.renderMobileChatMessages();

          this.updateStatus(`🗑️ Deleted message ${messageIndex}`);
          this.updateMobileButtonStates();
        } catch (error) {
          this.updateStatus(`❌ Delete failed: ${error.message}`);
        }
      }
    });
  }

  showEditor() {
    // Make sure UI exists
    if (!$('#mobile-context-editor-modal').length) {
      this.setupUI();
    }

    $('#mobile-context-editor-modal').show();

    // Show UI that matches SillyTavern state
    if (!this.isSillyTavernReady()) {
      this.showWaitingInterface();
    } else {
      const context = window.SillyTavern.getContext();
      if (context && context.chat && context.chat.length > 0) {
        this.renderMobileChatMessages();
        this.updateStatus('✅ Chat ready to edit');
      } else {
        this.updateStatus('⚠️ Load chat first');
      }
    }

    this.updateMobileButtonStates();
  }

  /**
   * Waiting-for-SillyTavern UI
   */
  showWaitingInterface() {
    const waitingHtml = `
            <div style="text-align: center; padding: 30px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
                <h3 style="margin: 0 0 15px 0; color: #333;">SillyTavern Loading...</h3>
                <p style="margin: 0 0 20px 0;">Wait until SillyTavern finishes loading before editing</p>

                <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left;">
                    <strong>📊 Loading flag：</strong><br>
                    <div id="waiting-status-details" style="margin-top: 10px; font-family: monospace; font-size: 12px;"></div>
                </div>

                <div style="margin: 20px 0;">
                    <button onclick="window.mobileContextEditor.checkAndRefresh()" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white; border: none; padding: 12px 24px; border-radius: 25px;
                        font-size: 16px; cursor: pointer; margin: 5px;
                    ">🔄 Recheck</button>

                    <button onclick="window.mobileContextEditor.forceMode()" style="
                        background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
                        color: white; border: none; padding: 12px 24px; border-radius: 25px;
                        font-size: 16px; cursor: pointer; margin: 5px;
                    ">🛠️ Forced mode</button>
                </div>

                <div style="margin: 20px 0; font-size: 14px; color: #888;">
                    <p>💡 First load can take 1–2 minutes</p>
                    <p>🔧 If it hangs, refresh the page</p>
                </div>
            </div>
        `;

    $('#mobile-context-editor-content').html(waitingHtml);
    this.updateStatus('⏳ Waiting for SillyTavern...');
    this.updateWaitingStatus();
  }

  /**
   * Recheck and refresh
   */
  checkAndRefresh() {
    console.log('[Mobile Context Editor] Rechecking SillyTavern...');

    if (this.isSillyTavernReady()) {
      this.updateStatus('✅ SillyTavern ready — loading chat...');
      this.renderMobileChatMessages();
      this.updateMobileButtonStates();
    } else {
      this.updateWaitingStatus();
      this.updateStatus('⏳ SillyTavern still loading...');
    }
  }

  /**
   * Waiting-status details
   */
  updateWaitingStatus() {
    const statusDetails = document.getElementById('waiting-status-details');
    if (statusDetails) {
      const status = this.debugSillyTavernStatus();
      const details = [
        `window.chat: ${status.chatLoaded ? '✅ loaded' : '❌ missing'}`,
        `window.characters: ${status.charactersLoaded ? '✅ loaded' : '❌ missing'}`,
        `window.this_chid: ${status.currentCharacter ? '✅ set' : '❌ unset'}`,
        `saveChatConditional: ${status.saveFunctionAvailable ? '✅ available' : '❌ missing'}`,
        `printMessages: ${status.renderFunctionAvailable ? '✅ available' : '❌ missing'}`,
      ];
      statusDetails.innerHTML = details.join('<br>');
    }
  }

  /**
   * Forced mode — basic UI if SillyTavern is not ready
   */
  forceMode() {
    const forceHtml = `
            <div style="padding: 20px; color: #333;">
                <h3 style="margin: 0 0 15px 0; color: #FF6B6B;">🛠️ Forced mode</h3>
                <p style="margin: 0 0 15px 0;">SillyTavern is still loading. You can still use:</p>

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <strong>⚠️ Note:</strong> Some features may fail in this mode. Wait for a full load when you can.
                </div>

                <div style="background: #e7f3ff; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <strong>📝 Console commands:</strong><br>
                    <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; display: block; margin: 8px 0; font-family: monospace;">
                        MobileContext.debugSillyTavernStatus() // check status<br>
                        MobileContext.smartLoadChat() // smart load<br>
                        MobileContext.showContextEditor() // reopen editor
                    </code>
                </div>

                <div style="background: #d1ecf1; border-radius: 8px; padding: 15px; margin: 15px 0;">
                    <strong>🔄 Auto-retry:</strong><br>
                    The editor rechecks SillyTavern every 30 seconds.
                </div>

                <div style="margin: 20px 0;">
                    <button onclick="window.mobileContextEditor.checkAndRefresh()" style="
                        background: #007bff; color: white; border: none; padding: 10px 20px;
                        border-radius: 20px; cursor: pointer; margin: 5px;
                    ">🔄 Retry now</button>

                    <button onclick="window.mobileContextEditor.hideEditor()" style="
                        background: #6c757d; color: white; border: none; padding: 10px 20px;
                        border-radius: 20px; cursor: pointer; margin: 5px;
                    ">❌ Close editor</button>
                </div>
            </div>
        `;

    $('#mobile-context-editor-content').html(forceHtml);
    this.updateStatus('🛠️ Forced mode — use console commands');

    // Start auto-retry
    this.startAutoRetry();
  }

  /**
   * Start auto-retry
   */
  startAutoRetry() {
    if (this.autoRetryInterval) {
      clearInterval(this.autoRetryInterval);
    }

    this.autoRetryInterval = setInterval(() => {
      if (this.isSillyTavernReady()) {
        console.log('[Mobile Context Editor] Auto-retry succeeded — SillyTavern ready');
        clearInterval(this.autoRetryInterval);
        this.checkAndRefresh();
      } else {
        console.log('[Mobile Context Editor] Auto-retry in progress...');
      }
    }, 30000); // Every 30 seconds
  }

  hideEditor() {
    $('#mobile-context-editor-modal').hide();
  }

  updateStatus(message) {
    $('#mobile-context-editor-status').html(message);
  }

  updateMobileButtonStates() {
    let hasData = false;
    if (this.isSillyTavernReady()) {
      const context = window.SillyTavern.getContext();
      hasData = context && context.chat && context.chat.length > 0;
    }

    $('#mobile-save-chat-btn').prop('disabled', !hasData);
    $('#mobile-add-message-btn').prop('disabled', !hasData);
    $('#mobile-stats-btn').prop('disabled', !hasData);
    $('#mobile-refresh-btn').prop('disabled', !hasData);
    $('#mobile-export-btn').prop('disabled', !hasData);
    $('#mobile-quick-edit-btn').prop('disabled', !hasData);
    $('#mobile-test-api-btn').prop('disabled', !this.isSillyTavernReady()); // API test only needs SillyTavern ready
  }

  /**
   * Render chat messages — paged / virtual scroll
   */
  async renderMobileChatMessages() {
    if (!this.isSillyTavernReady()) return;

    if (!this.currentChatData) {
      this.updateStatus('⚠️ Load chat first');
      return;
    }

    this.showLoadingIndicator(true);

    try {
      // Current page messages
      const pageMessages = this.getPageMessages();

      if (pageMessages.length === 0) {
        $('#mobile-context-editor-content').html(`
          <div style="text-align: center; padding: 40px 20px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
            <p style="margin: 0; font-size: 16px;">No messages on this page</p>
          </div>
        `);
        this.showLoadingIndicator(false);
        return;
      }

      let html = '<div style="padding: 10px;">';

      // Yield while rendering so the UI stays live
      for (let i = 0; i < pageMessages.length; i++) {
        const message = pageMessages[i];
        const messageHtml = this.renderSingleMessage(message);
        html += messageHtml;

        // Yield every 5 messages
        if (i % 5 === 4) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      html += '</div>';
      $('#mobile-context-editor-content').html(html);

      this.showLoadingIndicator(false);
    } catch (error) {
      this.log('error', 'Render failed', error);
      this.updateStatus(`❌ Render failed: ${error.message}`);
      this.showLoadingIndicator(false);
    }
  }

  /**
   * Render one message
   */
  renderSingleMessage(message) {
    const isUser = message.is_user;
    const name = message.name || (isUser ? 'User' : 'Assistant');
    const globalIndex = message.globalIndex;

    // Truncate long messages
    let content = message.mes || '';
    const maxLength = 200;
    let displayContent = content;

    if (content.length > maxLength) {
      displayContent = content.substring(0, maxLength) + '...';
    }

    // Escape HTML
    displayContent = this.escapeHtml(displayContent);

    return `
      <div style="margin-bottom: 15px; padding: 12px; border: 2px solid ${
        isUser ? '#4CAF50' : '#2196F3'
      }; border-radius: 10px; background: ${isUser ? '#f1f8e9' : '#e3f2fd'};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #333; font-size: 14px;">${
            isUser ? '👤' : '🤖'
          } ${this.escapeHtml(name)} (#${globalIndex})</strong>
          <div>
            <button class="mobile-edit-message-btn" data-index="${globalIndex}" style="margin-right: 5px; padding: 4px 8px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">✏️</button>
            <button class="mobile-delete-message-btn" data-index="${globalIndex}" style="padding: 4px 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">🗑️</button>
          </div>
        </div>
        <div style="color: #555; white-space: pre-wrap; background: white; padding: 8px; border-radius: 5px; border: 1px solid #ddd; font-size: 13px; line-height: 1.4;">${displayContent}</div>
        ${content.length > maxLength ? `<div style="margin-top: 8px;"><button class="mobile-expand-message-btn" data-index="${globalIndex}" style="padding: 4px 8px; background: #607D8B; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📖 Expand</button></div>` : ''}
      </div>
    `;
  }

  /**
   * Render paged messages
   */
  async renderPaginatedMessages(messages) {
    if (!messages || messages.length === 0) {
      $('#mobile-context-editor-content').html(`
        <div style="text-align: center; padding: 40px 20px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
          <p style="margin: 0; font-size: 16px;">No messages on this page</p>
        </div>
      `);
      return;
    }

    let html = '<div style="padding: 10px;">';

    // Yield while rendering so the UI stays live
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const messageHtml = this.renderSingleMessage({
        ...message,
        globalIndex: message.index, // Server-provided global index
        pageIndex: i
      });
      html += messageHtml;

      // Yield every 3 messages
      if (i % 3 === 2) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    html += '</div>';
    $('#mobile-context-editor-content').html(html);
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async editMobileMessage(messageIndex) {
    if (!this.isSillyTavernReady()) return;

    const context = window.SillyTavern.getContext();
    if (messageIndex >= context.chat.length) return;

    const message = context.chat[messageIndex];
    const newContent = prompt('Edit message:', message.mes);

    if (newContent !== null) {
      try {
        await this.modifyMessage(messageIndex, newContent);
        this.renderMobileChatMessages();
        this.updateStatus(`✏️ Edited message ${messageIndex}`);
        this.updateMobileButtonStates();
      } catch (error) {
        this.updateStatus(`❌ Edit failed: ${error.message}`);
      }
    }
  }

  /**
   * Quick-edit last message
   */
  async quickEditLastMessage() {
    try {
      if (!this.isSillyTavernReady()) {
        throw new Error('SillyTavern is not ready');
      }

      const context = window.SillyTavern.getContext();
      if (!context.chat || context.chat.length === 0) {
        throw new Error('No messages to edit');
      }

      const lastIndex = context.chat.length - 1;
      const lastMessage = context.chat[lastIndex];

      // Quick-edit UI
      const quickEditHtml = `
                <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">⚡ Quick-edit last message</h4>

                    <div style="margin-bottom: 15px;">
                        <strong>Sender:</strong> ${
                          lastMessage.name || (lastMessage.is_user ? 'User' : 'Character')
                        } <br>
                        <strong>Type:</strong> ${lastMessage.is_user ? 'User message' : 'Character reply'} <br>
                        <strong>Index:</strong> ${lastIndex}
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Content:</label>
                        <textarea id="quick-edit-content" style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical;">${
                          lastMessage.mes
                        }</textarea>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Sender name (optional):</label>
                        <input type="text" id="quick-edit-name" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Leave blank to keep" value="${
                          lastMessage.name || ''
                        }">
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.mobileContextEditor.executeQuickEdit(${lastIndex})" style="
                            background: #28a745; color: white; border: none; padding: 10px 20px;
                            border-radius: 5px; cursor: pointer; flex: 1;
                        ">✅ Save edit</button>

                        <button onclick="window.mobileContextEditor.renderMobileChatMessages()" style="
                            background: #6c757d; color: white; border: none; padding: 10px 20px;
                            border-radius: 5px; cursor: pointer; flex: 1;
                        ">❌ Cancel</button>
                    </div>
                </div>
            `;

      $('#mobile-context-editor-content').html(quickEditHtml);
      this.updateStatus('⚡ Quick-edit mode');
    } catch (error) {
      console.error('[Mobile Context Editor] Quick edit failed:', error);
      throw error;
    }
  }

  /**
   * Run quick edit
   */
  async executeQuickEdit(messageIndex) {
    try {
      const newContent = document.getElementById('quick-edit-content').value;
      const newName = document.getElementById('quick-edit-name').value.trim();

      if (!newContent.trim()) {
        alert('Message cannot be empty');
        return;
      }

      this.updateStatus('💾 Saving...');

      // Apply edit
      await this.modifyMessage(messageIndex, newContent, newName || null);

      // Re-render list
      this.renderMobileChatMessages();
      this.updateStatus('✅ Quick edit saved');
      this.updateMobileButtonStates();
    } catch (error) {
      console.error('[Mobile Context Editor] executeQuickEdit failed:', error);
      this.updateStatus(`❌ Save failed: ${error.message}`);
    }
  }

  /**
   * Test API
   */
  async testApiConnection() {
    try {
      this.updateStatus('🔧 Testing API...');

      // Test-results UI
      const testResultHtml = `
                <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">🔧 API connection test</h4>

                    <div id="api-test-results" style="font-family: monospace; font-size: 12px; background: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #ddd; max-height: 300px; overflow-y: auto;">
                        <div style="color: #007bff;">📊 Running tests...</div>
                    </div>

                    <div style="margin-top: 15px;">
                        <button onclick="window.mobileContextEditor.renderMobileChatMessages()" style="
                            background: #007bff; color: white; border: none; padding: 10px 20px;
                            border-radius: 5px; cursor: pointer; width: 100%;
                        ">🔙 Back to messages</button>
                    </div>
                </div>
            `;

      $('#mobile-context-editor-content').html(testResultHtml);

      // Run tests
      const results = [];
      const addResult = (test, result, details = '') => {
        results.push(`${result === 'PASS' ? '✅' : '❌'} ${test}: ${result} ${details}`);
        document.getElementById('api-test-results').innerHTML = results.join('<br>');
      };

      // Test 1: SillyTavern object
      addResult('SillyTavern object', window.SillyTavern ? 'PASS' : 'FAIL');

      // Test 2: getContext
      let context = null;
      try {
        context = window.SillyTavern.getContext();
        addResult('getContext', context ? 'PASS' : 'FAIL');
      } catch (error) {
        addResult('getContext', 'FAIL', `- ${error.message}`);
      }

      if (context) {
        // Test 3: chat
        addResult('chat', Array.isArray(context.chat) ? 'PASS' : 'FAIL', `- ${context.chat?.length || 0} messages`);

        // Test 4: characters
        addResult(
          'characters',
          Array.isArray(context.characters) ? 'PASS' : 'FAIL',
          `- ${context.characters?.length || 0} characters`,
        );

        // Test 5: current character
        addResult('characterId', context.characterId !== undefined ? 'PASS' : 'FAIL', `- ID: ${context.characterId}`);

        // Test 6: user name
        addResult('name1', context.name1 ? 'PASS' : 'FAIL', `- ${context.name1}`);

        // Test 7: character name
        addResult('name2', context.name2 ? 'PASS' : 'FAIL', `- ${context.name2}`);

        // Test 8: saveChat
        addResult('saveChat', typeof context.saveChat === 'function' ? 'PASS' : 'FAIL');

        // Test 9: reloadCurrentChat
        addResult('reloadCurrentChat', typeof context.reloadCurrentChat === 'function' ? 'PASS' : 'FAIL');

        // Test 10: addOneMessage
        addResult('addOneMessage', typeof context.addOneMessage === 'function' ? 'PASS' : 'FAIL');

        // Test 11: getCurrentChatData
        try {
          const chatData = this.getCurrentChatData();
          addResult('getCurrentChatData', chatData ? 'PASS' : 'FAIL', `- ${chatData?.messages?.length || 0} messages`);
        } catch (error) {
          addResult('getCurrentChatData', 'FAIL', `- ${error.message}`);
        }

        // Test 12: getStatistics
        try {
          const stats = this.getStatistics();
          addResult('Get stats', stats ? 'PASS' : 'FAIL', `- ${stats?.totalMessages || 0} messages`);
        } catch (error) {
          addResult('Get stats', 'FAIL', `- ${error.message}`);
        }
      }

      // Summary
      const passCount = results.filter(r => r.includes('✅')).length;
      const totalCount = results.length;
      results.push('');
      results.push(`📊 Summary: ${passCount}/${totalCount} passed`);
      results.push('');
      results.push('🔧 Failures usually mean SillyTavern is still loading');

      document.getElementById('api-test-results').innerHTML = results.join('<br>');
      this.updateStatus(`🔧 API test done — ${passCount}/${totalCount} passed`);
    } catch (error) {
      console.error('[Mobile Context Editor] API test failed:', error);
      this.updateStatus(`❌ API test failed: ${error.message}`);
    }
  }

  /**
   * Paging controls
   */

  /**
   * Go to page
   */
  async goToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= this.totalPages) {
      return;
    }

    this.showLoadingIndicator(true);
    this.currentPage = pageIndex;
    this.updatePaginationInfo();

    try {
      if (this.usePaginationMode) {
        // Paging: load that page from the server
        const chatData = await this.loadChatDataWithPagination(pageIndex, this.pageSize);
        await this.renderPaginatedMessages(chatData.messages);
      } else {
        // Memory: render locally
        await this.renderMobileChatMessages();
      }

      this.updateStatus(`📄 Jumped to page ${pageIndex + 1}`);
    } catch (error) {
      this.updateStatus(`❌ Jump failed: ${error.message}`);
    } finally {
      this.showLoadingIndicator(false);
    }
  }

  /**
   * Change page size
   */
  async changePageSize(newPageSize) {
    if (newPageSize === this.pageSize) return;

    this.showLoadingIndicator(true);
    this.pageSize = newPageSize;

    try {
      if (this.usePaginationMode) {
        // Paging: reload current page
        const chatData = await this.loadChatDataWithPagination(this.currentPage, newPageSize);
        this.totalPages = chatData.totalPages;
        this.currentPage = Math.min(this.currentPage, this.totalPages - 1);
        await this.renderPaginatedMessages(chatData.messages);
      } else {
        // Memory: recompute pages
        if (this.currentChatData) {
          this.totalPages = Math.ceil(this.currentChatData.messages.length / this.pageSize);
          this.currentPage = Math.min(this.currentPage, this.totalPages - 1);
        }
        await this.renderMobileChatMessages();
      }

      this.updatePaginationInfo();
      this.updateStatus(`📄 Page size is now ${newPageSize}`);
    } catch (error) {
      this.updateStatus(`❌ Page-size change failed: ${error.message}`);
    } finally {
      this.showLoadingIndicator(false);
    }
  }

  /**
   * Show/hide paging controls
   */
  showPaginationControls(show) {
    $('#mobile-pagination-controls').toggle(show);
  }

  /**
   * Update paging labels
   */
  updatePaginationInfo() {
    if (!this.currentChatData) return;

    const totalMessages = this.currentChatData.messages.length;
    const startIndex = this.currentPage * this.pageSize + 1;
    const endIndex = Math.min((this.currentPage + 1) * this.pageSize, totalMessages);

    $('#mobile-page-info').text(`Page ${this.currentPage + 1} of ${this.totalPages} (${startIndex}-${endIndex}/${totalMessages})`);

    // Update button state
    $('#mobile-first-page, #mobile-prev-page').prop('disabled', this.currentPage === 0);
    $('#mobile-next-page, #mobile-last-page').prop('disabled', this.currentPage === this.totalPages - 1);

    // Sync page-size select
    $('#mobile-page-size').val(this.pageSize);
  }

  /**
   * Show/hide loading indicator
   */
  showLoadingIndicator(show) {
    $('#mobile-loading-indicator').toggle(show);
  }

  /**
   * Logger
   */
  log(level, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[Mobile Context Editor v2.2] ${message}`;

    switch (level) {
      case 'info':
        // Info logs only when DEBUG_CONTEXT_EDITOR is on
        if (window.DEBUG_CONTEXT_EDITOR) {
          console.log(logMessage, data);
        }
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'error':
        console.error(logMessage, data);
        break;
      default:
        if (window.DEBUG_CONTEXT_EDITOR) {
          console.log(logMessage, data);
        }
    }
  }
}

// Global instance
window.mobileContextEditor = new MobileContextEditor();

// Expand-message click
$(document).on('click', '.mobile-expand-message-btn', function(e) {
  const messageIndex = parseInt($(e.target).data('index'));
  const editor = window.mobileContextEditor;

  if (editor.currentChatData && editor.currentChatData.messages[messageIndex]) {
    const message = editor.currentChatData.messages[messageIndex];
    const fullContent = message.mes || '';

    // Full-text modal
    const fullTextModal = `
      <div id="mobile-full-text-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; margin: 20px; padding: 20px; border-radius: 10px; max-width: 90%; max-height: 80%; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
            <h4 style="margin: 0; color: #333;">Full message (#${messageIndex})</h4>
            <button onclick="$('#mobile-full-text-modal').remove()" style="background: #f44336; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">✖️ Close</button>
          </div>
          <div style="white-space: pre-wrap; color: #333; line-height: 1.6; font-size: 14px; max-height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9;">${editor.escapeHtml(fullContent)}</div>
        </div>
      </div>
    `;

    $('body').append(fullTextModal);
  }
});

console.log('[Mobile Context Editor] v2.2 loaded — performance build');
