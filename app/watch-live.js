/**
 * Watch Live App - Watch Live应用
 * Watch-live UI for mobile-phone.js, same pattern as live-app.js
 * Watch ST context, parse live tags, show danmaku and interactions
 */

// @ts-nocheck
// Avoid redefining
if (typeof window.WatchLiveApp === 'undefined') {
  /**
   * Live event listener
   * Listen for ST message events and parse live data
   */
  class LiveEventListener {
    constructor(liveApp) {
      this.liveApp = liveApp;
      this.isListening = false;
      this.lastMessageCount = 0;
      this.pollingInterval = null;
      this.messageReceivedHandler = this.onMessageReceived.bind(this);
    }

    /**
     * Start listening to SillyTavern events
     */
    startListening() {
      if (this.isListening) {
        console.log('[Live App] Listener already running');
        return;
      }

      try {
        // Check SillyTavern APIs
        console.log('[Live App] Checking SillyTavern APIs:', {
          'window.SillyTavern': !!window?.SillyTavern,
          'window.SillyTavern.getContext': typeof window?.SillyTavern?.getContext,
          eventOn: typeof eventOn,
          tavern_events: typeof tavern_events,
          mobileContextEditor: !!window?.mobileContextEditor,
        });

        // Method 1: SillyTavern.getContext().eventSource (preferred in iframe)
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.eventSource && typeof context.eventSource.on === 'function' && context.event_types) {
            console.log('[Live App] Listening MESSAGE_RECEIVED via SillyTavern.getContext().eventSource');
            context.eventSource.on(context.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
            this.isListening = true;
            console.log('[Live App] ✅ Listening (context.eventSource)');
            this.updateMessageCount();
            return;
          }
        }

        // Method 2: global eventOn if present
        if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined' && tavern_events.MESSAGE_RECEIVED) {
          console.log('[Live App] Listening MESSAGE_RECEIVED via eventOn');
          eventOn(tavern_events.MESSAGE_RECEIVED, this.messageReceivedHandler);
          this.isListening = true;
          console.log('[Live App] ✅ Listening (eventOn)');
          this.updateMessageCount();
          return;
        }

        // Method 3: parent eventSource
        if (
          typeof window !== 'undefined' &&
          window.parent &&
          window.parent.eventSource &&
          typeof window.parent.eventSource.on === 'function'
        ) {
          console.log('[Live App] Listening MESSAGE_RECEIVED via parent eventSource');
          if (window.parent.event_types && window.parent.event_types.MESSAGE_RECEIVED) {
            window.parent.eventSource.on(window.parent.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
            this.isListening = true;
            console.log('[Live App] ✅ Listening (parent eventSource)');
            this.updateMessageCount();
            return;
          }
        }

        // If all hooks fail, poll
        console.warn('[Live App] Cannot hook events — polling');
        this.startPolling();
      } catch (error) {
        console.error('[Live App] Event listen setup failed:', error);
        this.startPolling();
      }
    }

    /**
     * Stop listening
     */
    stopListening() {
      if (!this.isListening) return;

      try {
        // Try to remove the listener
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.eventSource && typeof context.eventSource.off === 'function' && context.event_types) {
            context.eventSource.off(context.event_types.MESSAGE_RECEIVED, this.messageReceivedHandler);
          }
        }

        // Clear polling
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }

        this.isListening = false;
        console.log('[Live App] Stopped listening');
      } catch (error) {
        console.error('[Live App] stopListening failed:', error);
      }
    }

    /**
     * Start polling
     */
    startPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }

      this.updateMessageCount();
      this.pollingInterval = setInterval(() => {
        this.checkForNewMessages();
      }, 2000); // every 2s

      this.isListening = true;
      console.log('[Live App] ✅ Polling started');
    }

    /**
     * Check for new messages
     */
    checkForNewMessages() {
      const currentMessageCount = this.getCurrentMessageCount();
      if (currentMessageCount > this.lastMessageCount) {
        console.log(`[Live App] Poll saw new messages: ${this.lastMessageCount} → ${currentMessageCount}`);
        this.onMessageReceived(currentMessageCount);
      }
    }

    /**
     * Handle AI message-received
     * @param {number} messageId - received message id
     */
    async onMessageReceived(messageId) {
      try {
        console.log(`[Watch Live App] 🎯 MESSAGE_RECEIVED id=${messageId}`);

        // See if there is a new message
        const currentMessageCount = this.getCurrentMessageCount();
        console.log(`[Watch Live App] Message count now=${currentMessageCount} last=${this.lastMessageCount}`);

        if (currentMessageCount <= this.lastMessageCount) {
          console.log('[Watch Live App] No new message — skip parse');
          return;
        }

        console.log(
          `[Watch Live App] ✅ New messages ${this.lastMessageCount} → ${currentMessageCount}`,
        );
        this.lastMessageCount = currentMessageCount;

        // If waiting for the room list
        if (this.liveApp.isWaitingForLiveList) {
          console.log('[Watch Live App] Live-list reply — refreshing list');
          this.liveApp.isWaitingForLiveList = false;
          this.liveApp.updateAppContent();
          return;
        }

        // Check whether live is active
        if (!this.liveApp || !this.liveApp.isLiveActive) {
          console.log('[Watch Live App] Live inactive — skip');
          return;
        }

        // Kick off parse
        console.log('[Watch Live App] Parsing new live data...');
        await this.liveApp.parseNewLiveData();
      } catch (error) {
        console.error('[Watch Live App] MESSAGE_RECEIVED handler failed:', error);
      }
    }

    /**
     * Current message count
     */
    getCurrentMessageCount() {
      try {
        // Method 1: SillyTavern.getContext().chat
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const count = context.chat.length;
            console.log(`[Live App] SillyTavern.getContext().chat has ${count} messages`);
            return count;
          }
        }

        // Method 2: mobileContextEditor fallback
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor && typeof mobileContextEditor.getCurrentChatData === 'function') {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && Array.isArray(chatData.messages)) {
            console.log(`[Live App] mobileContextEditor returned ${chatData.messages.length} messages`);
            return chatData.messages.length;
          }
        }

        // Method 3: parent chat
        if (typeof window !== 'undefined' && window.parent && window.parent.chat && Array.isArray(window.parent.chat)) {
          const count = window.parent.chat.length;
          console.log(`[Live App] Parent chat has ${count} messages`);
          return count;
        }

        // Method 4: getContext() if present
        if (typeof window !== 'undefined' && window.getContext && typeof window.getContext === 'function') {
          const context = window.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const count = context.chat.length;
            console.log(`[Live App] getContext() chat has ${count} messages`);
            return count;
          }
        }

        console.warn('[Live App] Cannot read message count — using 0');
        return 0;
      } catch (error) {
        console.warn('[Live App] getCurrentMessageCount failed:', error);
        return 0;
      }
    }

    /**
     * Update message count
     */
    updateMessageCount() {
      this.lastMessageCount = this.getCurrentMessageCount();
      console.log(`[Live App] Message count init: ${this.lastMessageCount}`);
    }
  }

  /**
   * Live data parser
   * Parse live-format tags out of ST messages
   */
  class LiveDataParser {
    constructor() {
      // Regex patterns
      this.patterns = {
        viewerCount: /\[直播\|本场人数\|([^\]]+)\]/g,
        liveContent: /\[直播\|直播内容\|([^\]]+)\]/g,
        normalDanmaku: /\[直播\|([^\|]+)\|弹幕\|([^\]]+)\]/g,
        giftDanmaku: /\[直播\|([^\|]+)\|打赏\|([^\]]+)\]/g,
        recommendedInteraction: /\[直播\|推荐互动\|([^\]]+)\]/g,
      };
    }

    /**
     * Parse live data
     * @param {string} content - Text to parse
     * @returns {Object} Parsed live payload
     */
    parseLiveData(content) {
      const liveData = {
        viewerCount: 0,
        liveContent: '',
        danmakuList: [],
        giftList: [],
        recommendedInteractions: [],
      };

      if (!content || typeof content !== 'string') {
        return liveData;
      }

      // 1. Parse viewer count
      liveData.viewerCount = this.parseViewerCount(content);

      // 2. 解析直播内容
      liveData.liveContent = this.parseLiveContent(content);

      // 3. Parse all danmaku in source order
      const { danmakuList, giftList } = this.parseAllDanmaku(content);
      liveData.danmakuList = danmakuList;
      liveData.giftList = giftList;

      // 5. 解析推荐互动
      liveData.recommendedInteractions = this.parseRecommendedInteractions(content);

      return liveData;
    }

    /**
     * Parse viewer count
     */
    parseViewerCount(content) {
      const matches = [...content.matchAll(this.patterns.viewerCount)];
      if (matches.length === 0) return 0;

      // Use the last match (latest count)
      const lastMatch = matches[matches.length - 1];
      const viewerStr = lastMatch[1].trim();

      return this.formatViewerCount(viewerStr);
    }

    /**
     * Format viewer count
     */
    formatViewerCount(viewerStr) {
      // Keep digits and letters only
      const cleanStr = viewerStr.replace(/[^\d\w]/g, '');

      // Parse the number
      const num = parseInt(cleanStr);
      if (isNaN(num)) return 0;

      // Format large numbers
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'W';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }

      return num.toString();
    }

    /**
     * 解析直播内容
     */
    parseLiveContent(content) {
      const matches = [...content.matchAll(this.patterns.liveContent)];
      if (matches.length === 0) return '';

      // Use the last match (latest content)
      const lastMatch = matches[matches.length - 1];
      return lastMatch[1].trim();
    }

    /**
     * Parse all danmaku in source order
     */
    parseAllDanmaku(content) {
      const danmakuList = [];
      const giftList = [];
      const allMatches = [];

      // Collect normal danmaku matches
      const normalMatches = [...content.matchAll(this.patterns.normalDanmaku)];
      normalMatches.forEach(match => {
        allMatches.push({
          type: 'normal',
          match: match,
          index: match.index, // index in source text
        });
      });

      // Collect gift danmaku matches
      const giftMatches = [...content.matchAll(this.patterns.giftDanmaku)];
      giftMatches.forEach(match => {
        allMatches.push({
          type: 'gift',
          match: match,
          index: match.index, // index in source text
        });
      });

      // Sort by source index
      allMatches.sort((a, b) => a.index - b.index);

      // Walk danmaku in order
      allMatches.forEach((item, index) => {
        const match = item.match;
        const username = match[1].trim();
        const content = match[2].trim();
        const timestamp = new Date().toLocaleString();

        if (item.type === 'normal') {
          // Normal danmaku
          danmakuList.push({
            id: Date.now() + index,
            username: username,
            content: content,
            type: 'normal',
            timestamp: timestamp,
          });
        } else if (item.type === 'gift') {
          // Gift danmaku
          danmakuList.push({
            id: Date.now() + index + 10000, // Avoid id clashes
            username: username,
            content: content,
            type: 'gift',
            timestamp: timestamp,
          });

          // Push onto gift list
          giftList.push({
            username: username,
            gift: content,
            timestamp: timestamp,
          });
        }
      });

      return { danmakuList, giftList };
    }

    /**
     * Parse normal danmaku (compat)
     */
    parseNormalDanmaku(content) {
      const danmakuList = [];
      const matches = [...content.matchAll(this.patterns.normalDanmaku)];

      matches.forEach((match, index) => {
        const username = match[1].trim();
        const danmakuContent = match[2].trim();

        danmakuList.push({
          id: Date.now() + index,
          username: username,
          content: danmakuContent,
          type: 'normal',
          timestamp: new Date().toLocaleString(),
        });
      });

      return danmakuList;
    }

    /**
     * Parse tip danmaku
     */
    parseGiftDanmaku(content) {
      const danmakuList = [];
      const giftList = [];
      const matches = [...content.matchAll(this.patterns.giftDanmaku)];

      matches.forEach((match, index) => {
        const username = match[1].trim();
        const giftContent = match[2].trim();
        const timestamp = new Date().toLocaleString();

        // Push onto danmaku list
        danmakuList.push({
          id: Date.now() + index + 10000, // Avoid id clashes
          username: username,
          content: giftContent,
          type: 'gift',
          timestamp: timestamp,
        });

        // Push onto gift list
        giftList.push({
          username: username,
          gift: giftContent,
          timestamp: timestamp,
        });
      });

      return { danmakuList, giftList };
    }

    /**
     * 解析推荐互动
     */
    parseRecommendedInteractions(content) {
      const interactions = [];
      const matches = [...content.matchAll(this.patterns.recommendedInteraction)];

      console.log(`[Live App] Rec parse: ${matches.length} matches`);

      // Keep the last 4 matches (newest recs)
      const recentMatches = matches.slice(-4);
      console.log(`[Live App] Using latest ${recentMatches.length} 推荐互动`);

      recentMatches.forEach((match, index) => {
        const interactionContent = match[1].trim();
        console.log(`[Live App] Rec ${index + 1}: "${interactionContent}"`);
        if (!interactions.includes(interactionContent)) {
          interactions.push(interactionContent);
        }
      });

      console.log(`[Live App] Final 推荐互动 list:`, interactions);
      return interactions;
    }

    /**
     * Get chat text
     */
    getChatContent() {
      try {
        // Method 1: SillyTavern.getContext().chat
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const messages = context.chat;
            if (messages && messages.length > 0) {
              const content = messages.map(msg => msg.mes || '').join('\n');
              console.log(`[Live App] Got chat text via SillyTavern.getContext().chat, length ${content.length}`);
              return content;
            }
          }
        }

        // Method 2: mobileContextEditor fallback
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor && typeof mobileContextEditor.getCurrentChatData === 'function') {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && Array.isArray(chatData.messages)) {
            const content = chatData.messages.map(msg => msg.mes || '').join('\n');
            console.log(`[Live App] Got chat text via mobileContextEditor, length ${content.length}`);
            return content;
          }
        }

        // Method 3: parent chat
        if (typeof window !== 'undefined' && window.parent && window.parent.chat && Array.isArray(window.parent.chat)) {
          const messages = window.parent.chat;
          if (messages && messages.length > 0) {
            const content = messages.map(msg => msg.mes || '').join('\n');
            console.log(`[Live App] Parent chat text length ${content.length}`);
            return content;
          }
        }

        // Method 4: getContext() if present
        if (typeof window !== 'undefined' && window.getContext && typeof window.getContext === 'function') {
          const context = window.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const messages = context.chat;
            if (messages && messages.length > 0) {
              const content = messages.map(msg => msg.mes || '').join('\n');
              console.log(`[Live App] getContext() chat text length ${content.length}`);
              return content;
            }
          }
        }

        console.warn('[Live App] Cannot get chat text');
        return '';
      } catch (error) {
        console.warn('[Live App] getChatContent failed:', error);
        return '';
      }
    }
  }

  /**
   * Live state manager
   * Hold live state
   */
  class LiveStateManager {
    constructor() {
      this.isLiveActive = false;
      this.currentViewerCount = 0;
      this.currentLiveContent = '';
      this.danmakuList = [];
      this.giftList = [];
      this.recommendedInteractions = [];
      // No danmaku cap — show history
    }

    /**
     * Start live
     */
    startLive() {
      this.isLiveActive = true;
      this.currentViewerCount = 0;
      this.currentLiveContent = '';
      this.danmakuList = [];
      this.giftList = [];
      this.recommendedInteractions = [];
      console.log('[Live App] Live state active');
    }

    /**
     * End live
     */
    endLive() {
      this.isLiveActive = false;
      console.log('[Live App] Live state stopped');
    }

    /**
     * Update live data
     * @param {Object} liveData - Parsed live payload
     */
    updateLiveData(liveData) {
      if (!this.isLiveActive) return;

      // Viewer count — latest only
      if (liveData.viewerCount !== undefined && liveData.viewerCount !== 0) {
        this.currentViewerCount = liveData.viewerCount;
        console.log(`[Live App] Viewer count: ${this.currentViewerCount}`);
      }

      // 直播内容 — latest only
      if (liveData.liveContent && liveData.liveContent.trim() !== '') {
        this.currentLiveContent = liveData.liveContent;
        console.log(`[Live App] Updated 直播内容: ${this.currentLiveContent.substring(0, 50)}...`);
      }

      // 推荐互动 — latest only
      if (liveData.recommendedInteractions && liveData.recommendedInteractions.length > 0) {
        this.recommendedInteractions = liveData.recommendedInteractions;
        console.log(`[Live App] Updated 推荐互动: ${this.recommendedInteractions.length}`);
      }

      // Append new danmaku (keep history)
      if (liveData.danmakuList && liveData.danmakuList.length > 0) {
        // Skip danmaku already stored (user+text)
        const newDanmaku = liveData.danmakuList.filter(newItem => {
          return !this.danmakuList.some(
            existingItem =>
              existingItem.username === newItem.username &&
              existingItem.content === newItem.content &&
              existingItem.type === newItem.type,
          );
        });

        if (newDanmaku.length > 0) {
          this.danmakuList = this.danmakuList.concat(newDanmaku);
          console.log(`[Watch Live App] Added ${newDanmaku.length} danmaku, total ${this.danmakuList.length}`);

          // No danmaku cap — keep history
          console.log(`[Watch Live App] Keeping all danmaku, total ${this.danmakuList.length}`);
        }
      }

      // Append new gifts (keep history)
      if (liveData.giftList && liveData.giftList.length > 0) {
        // Skip gifts already stored
        const newGifts = liveData.giftList.filter(newGift => {
          return !this.giftList.some(
            existingGift =>
              existingGift.username === newGift.username &&
              existingGift.gift === newGift.gift &&
              existingGift.timestamp === newGift.timestamp,
          );
        });

        if (newGifts.length > 0) {
          this.giftList = this.giftList.concat(newGifts);
          console.log(`[Live App] Added ${newGifts.length} gifts, total ${this.giftList.length}`);
        }
      }
    }

    /**
     * Current live state
     */
    getCurrentState() {
      return {
        isLiveActive: this.isLiveActive,
        viewerCount: this.currentViewerCount,
        liveContent: this.currentLiveContent,
        danmakuList: [...this.danmakuList], // return a copy
        giftList: [...this.giftList], // return a copy
        recommendedInteractions: [...this.recommendedInteractions], // return a copy
      };
    }

    /**
     * Clear all data
     */
    clearAllData() {
      this.currentViewerCount = 0;
      this.currentLiveContent = '';
      this.danmakuList = [];
      this.giftList = [];
      this.recommendedInteractions = [];
      console.log('[Live App] Cleared live state');
    }
  }

  /**
   * Watch Live app
   * Wires the modules together
   */
  class WatchLiveApp {
    constructor() {
      this.eventListener = new LiveEventListener(this);
      this.dataParser = new LiveDataParser();
      this.stateManager = new LiveStateManager();
      this.currentView = 'start'; // 'start', 'live'
      this.isInitialized = false;
      this.lastRenderTime = 0;
      this.renderCooldown = 500; // render cooldown
      this.scrollTimeout = null; // scroll debounce timer
      this.typingTimer = null; // 直播内容 typewriter timer
      this.isTyping = false; // typewriter running
      this.pendingAppearDanmakuSigs = new Set(); // danmaku signatures pending stagger
      this.pendingAppearGiftSigs = new Set(); // gift signatures pending stagger
      this.saveTimeout = null;
      this.saveDebounceMs = 2000; // 2s debounce

      this.init();
    }

    /**
     * Init app
     */
    init() {
      console.log('[Watch Live App] Watch Live init starting');

      // Check render-right
      const renderingRight = this.getRenderingRight();
      console.log('[Watch Live App] Current render-right:', renderingRight);

      // Skip detect unless render-right is watch or end
      if (renderingRight && renderingRight !== 'watch' && renderingRight !== 'end') {
        console.log('[Watch Live App] Render-right mismatch — skip init detect');
        this.isInitialized = true;
        return;
      }

      // Detect active live data
      this.detectActiveLive();

      this.isInitialized = true;
      console.log('[Watch Live App] Watch Live init done');
    }

    /**
     * Detect active live data
     */
    detectActiveLive() {
      try {
        console.log('[Watch Live App] Detecting active live data...');

        // Check render-right
        const renderingRight = this.getRenderingRight();
        if (renderingRight && renderingRight !== 'watch' && renderingRight !== 'end') {
          console.log(`[Watch Live App] Render-right held by ${renderingRight} — skip detect`);
          return;
        }

        // Get chat text
        const chatContent = this.dataParser.getChatContent();
        if (!chatContent) {
          console.log('[Watch Live App] No chat text — stay on picker');
          return;
        }

        // Look for active (non-history) live tags
        const hasActiveLive = this.hasActiveLiveFormats(chatContent);

        if (hasActiveLive && renderingRight === 'watch') {
          console.log('[Watch Live App] 🎯 Active live data — entering watch view');

          // Switch to live view
          this.stateManager.startLive();
          this.currentView = 'live';

          // Parse and load existing live data
          const liveData = this.dataParser.parseLiveData(chatContent);
          this.stateManager.updateLiveData(liveData);

          // Listen for new messages
          this.eventListener.startListening();

          console.log('[Watch Live App] ✅ Restored watch state:', {
            viewerCount: this.stateManager.currentViewerCount,
            liveContent: this.stateManager.currentLiveContent
              ? this.stateManager.currentLiveContent.substring(0, 50) + '...'
              : '',
            danmakuCount: this.stateManager.danmakuList.length,
            giftCount: this.stateManager.giftList.length,
            interactionCount: this.stateManager.recommendedInteractions.length,
          });
        } else {
          console.log('[Watch Live App] No active live data or render-right mismatch — stay on picker');
        }
      } catch (error) {
        console.error('[Watch Live App] Active-live detect failed:', error);
      }
    }

    /**
     * Has active live tags?
     */
    hasActiveLiveFormats(content) {
      if (!content || typeof content !== 'string') {
        return false;
      }

      // Any active (non-history) live tags?
      const activeLivePatterns = [
        /\[直播\|本场人数\|[^\]]+\]/,
        /\[直播\|直播内容\|[^\]]+\]/,
        /\[直播\|[^|]+\|弹幕\|[^\]]+\]/,
        /\[直播\|[^|]+\|(?:打赏|礼物)\|[^\]]+\]/,
        /\[直播\|推荐互动\|[^\]]+\]/,
      ];

      for (const pattern of activeLivePatterns) {
        if (pattern.test(content)) {
          console.log('[Live App] Found active live tags:', pattern.toString());
          return true;
        }
      }

      return false;
    }

    /**
     * Get live state
     */
    get isLiveActive() {
      return this.stateManager.isLiveActive;
    }

    /**
     * End live
     */
    async endLive() {
      try {
        console.log('[Watch Live App] Stop watching');

        // Set render-right to end so the user can pick again
        await this.setRenderingRight('end');

        // Stop listening
        this.eventListener.stopListening();

        // Convert live tags to history tags
        await this.convertLiveToHistory();

        // Full reset so the next visit starts clean
        this.stateManager.endLive();
        this.stateManager.clearAllData(); // Clear all data
        this.currentView = 'start';

        // Reset other flags
        this.isInitialized = false; // Reset initialized flag
        this.lastRenderTime = 0;

        // Clear timers
        if (this.scrollTimeout) {
          clearTimeout(this.scrollTimeout);
          this.scrollTimeout = null;
        }
        if (this.typingTimer) {
          clearInterval(this.typingTimer);
          this.typingTimer = null;
        }

        // Refresh UI
        this.updateAppContent();

        this.showToast('Left the room', 'success');
        console.log('[Watch Live App] Left the room — state reset');
      } catch (error) {
        console.error('[Watch Live App] Leave room failed:', error);
        this.showToast('Could not leave room: ' + error.message, 'error');
      }
    }

    /**
     * Continue live interaction
     * @param {string} interaction - interaction text
     */
    async continueInteraction(interaction) {
      try {
        console.log('[Live App] Continue live interaction:', interaction);

        if (!this.isLiveActive) {
          console.warn('[Live App] Live inactive — cannot interact');
          return;
        }

        // Send continue-live message to ST
        const message = `The user is still watching. Their action: (${interaction}). Generate live data in the required format: 本场人数, 直播内容, danmaku, tips, and 推荐互动. Emit 本场人数 and 直播内容 exactly once. Keep 直播内容 short. End with four 推荐互动 lines. Do not use any other format.`;

        await this.sendToSillyTavern(message);

        console.log('[Live App] Interaction sent');
      } catch (error) {
        console.error('[Live App] Continue interaction failed:', error);
        this.showToast('Could not send action: ' + error.message, 'error');
      }
    }

    /**
     * Parse new live data
     */
    async parseNewLiveData() {
      try {
        console.log('[Live App] Parsing new live data');

        // Get chat text
        const chatContent = this.dataParser.getChatContent();
        if (!chatContent) {
          console.warn('[Live App] Cannot get chat text');
          return;
        }

        // Snapshot signatures before update so we know what is new
        const existingDanmakuSigs = new Set(
          (this.stateManager.danmakuList || []).map(item => this.createDanmakuSignature(item)),
        );

        // Parse latest floor only to decide animations
        const latestFloorText = this.getLatestFloorTextSafe();
        let latestNewDanmaku = [];
        let latestNewGifts = [];
        if (latestFloorText) {
          const { danmakuList: latestDanmakuList, giftList: latestGiftList } =
            this.dataParser.parseAllDanmaku(latestFloorText);
          latestNewDanmaku = latestDanmakuList || [];
          latestNewGifts = latestGiftList || [];
        }

        // Parse live data
        const liveData = this.dataParser.parseLiveData(chatContent);
        console.log('[Live App] Parsed live data:', {
          viewerCount: liveData.viewerCount,
          liveContent: liveData.liveContent ? liveData.liveContent.substring(0, 50) + '...' : '',
          danmakuCount: liveData.danmakuList.length,
          giftCount: liveData.giftList.length,
          interactionCount: liveData.recommendedInteractions.length,
        });

        // Update state
        this.stateManager.updateLiveData(liveData);

        // Animate only new danmaku/gifts from the latest floor
        if (latestNewDanmaku.length > 0) {
          latestNewDanmaku.forEach(item => {
            const sig = this.createDanmakuSignature(item);
            if (!existingDanmakuSigs.has(sig)) {
              this.pendingAppearDanmakuSigs.add(sig);
            }
          });
        }

        if (latestNewGifts.length > 0) {
          const existingGiftSigs = new Set(
            (this.stateManager.giftList || []).map(item => this.createGiftSignature(item)),
          );
          latestNewGifts.forEach(item => {
            const sig = this.createGiftSignature(item);
            if (!existingGiftSigs.has(sig)) {
              this.pendingAppearGiftSigs.add(sig);
            }
          });
        }

        // Debounced UI update
        this.updateAppContentDebounced();

        // If new danmaku, jump to bottom after refresh
        setTimeout(() => {
          // Hide pending-animate nodes so we do not scroll to empty space
          this.runAppearSequence();
          const danmakuContainer = document.getElementById('danmaku-container');
          if (danmakuContainer) {
            this.jumpToBottomIfNeeded(danmakuContainer);
          }
        }, 30);
      } catch (error) {
        console.error('[Live App] Parse live data failed:', error);
      }
    }

    /**
     * Debounced content update
     */
    updateAppContentDebounced() {
      const currentTime = Date.now();
      if (currentTime - this.lastRenderTime < this.renderCooldown) {
        return;
      }

      this.lastRenderTime = currentTime;
      this.updateAppContent();
      this.updateHeader(); // Also update header
    }

    /**
     * Update app content
     */
    updateAppContent() {
      const content = this.getAppContent();
      const appElement = document.getElementById('app-content');
      if (appElement) {
        appElement.innerHTML = content;
        // 延迟绑定事件，确保DOM已更新
        setTimeout(() => {
          this.bindEvents();
          this.updateHeader(); // 确保header也被更新
          // 渲染后启动直播内容打字机效果
          if (this.currentView === 'live') {
            const state = this.stateManager.getCurrentState();
            const liveContentEl = document.querySelector('.live-content-text');
            if (liveContentEl) {
              this.applyTypingEffect(liveContentEl, state.liveContent || '');
            }
            // 渲染后尝试触发逐条出现动画（避免丢帧）
            this.runAppearSequence();
          }
        }, 50);
      }
    }

    /**
     * 获取应用内容
     */
    getAppContent() {
      switch (this.currentView) {
        case 'start':
          return this.renderStartView();
        case 'list':
          return this.renderListView();
        case 'live':
          return this.renderLiveView();
        default:
          return this.renderStartView();
      }
    }

    /**
     * 渲染Watch Live界面
     */
    renderStartView() {
      return `
        <div class="live-app">
          <div class="watch-live-container">
            <div class="watch-live-header">
              <h2>Watch Live</h2>
              <p>Pick how you want to watch</p>
            </div>

            <div class="watch-options">
              <button class="watch-option-btn" id="current-live-list">
                <div class="option-icon">📺</div>
                <div class="option-title">Live now</div>
                <div class="option-desc">See who is live</div>
              </button>

              <button class="watch-option-btn" id="specific-live-room">
                <div class="option-icon">🔍</div>
                <div class="option-title">Open a specific room</div>
                <div class="option-desc">Enter a streamer name</div>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * 渲染Live rooms界面
     */
    renderListView() {
      // 解析Live rooms数据（无论是否在等待，都先解析现有数据）
      const liveRooms = this.parseLiveRoomList();

      const roomsHtml = liveRooms
        .map(
          room => `
        <div class="live-room-item">
          <div class="room-info">
            <div class="room-name">${room.name}</div>
            <div class="room-details">
              <span class="streamer-name">Host: ${room.streamer}</span>
              <span class="room-category">Category: ${room.category}</span>
              <span class="viewer-count">Viewers: ${room.viewers}</span>
            </div>
          </div>
          <button class="watch-room-btn" data-room='${JSON.stringify(room)}'>Watch Live</button>
        </div>
      `,
        )
        .join('');

      // 构建列表内容
      let listContent = '';

      // 如果有现有直播间，显示它们
      if (roomsHtml) {
        listContent = roomsHtml;
      }

      // 如果正在等待新的Live rooms，添加加载提示
      if (this.isWaitingForLiveList) {
        const loadingHtml = `
          <div class="live-loading-update">
            <div class="loading-spinner"></div>
            <span>Loading more rooms...</span>
          </div>
        `;
        listContent = listContent ? listContent + loadingHtml : '<div class="live-loading">Loading room list...</div>';
      } else if (!roomsHtml) {
        // 如果没有现有数据且不在等待，显示无数据提示
        listContent = '<div class="no-rooms">No rooms yet — try again later</div>';
      }

      return `
        <div class="live-app">
          <div class="live-list-container">
            <div class="live-list-header">
              <button class="back-btn" id="back-to-watch-options">← Back</button>
              <h2>Live now</h2>
            </div>

            <div class="live-rooms-list">
              ${listContent}
            </div>
          </div>
        </div>
      `;
    }

    /**
     * 渲染直播中界面
     */
    renderLiveView() {
      const state = this.stateManager.getCurrentState();

      // 渲染推荐互动按钮
      const recommendedButtons = state.recommendedInteractions
        .map(interaction => `<button class="rec-btn" data-interaction="${interaction}">${interaction}</button>`)
        .join('');

      // 渲染弹幕列表
      const danmakuItems = state.danmakuList
        .map(danmaku => {
          const sig = this.createDanmakuSignature(danmaku);
          const needAppearClass = this.pendingAppearDanmakuSigs.has(sig) ? ' need-appear' : '';
          if (danmaku.type === 'gift') {
            return `
            <div class="danmaku-item gift${needAppearClass}" data-sig="${sig}">
              <i class="fas fa-gift"></i>
              <span class="username">${danmaku.username}</span>
              <span class="content">sent ${danmaku.content}</span>
            </div>
          `;
          } else {
            return `
            <div class="danmaku-item normal${needAppearClass}" data-sig="${sig}">
              <span class="username">${danmaku.username}:</span>
              <span class="content">${danmaku.content}</span>
            </div>
          `;
          }
        })
        .join('');

      return `
        <div class="live-app">
          <div class="live-container">
            <!-- Video box -->
            <div class="video-placeholder">
              <p class="live-content-text">${state.liveContent || 'Waiting for 直播内容...'}</p>
              <div class="live-status-bottom">
                <div class="live-dot"></div>
                <span>LIVE</span>
              </div>
            </div>

            <!-- Watch Live actions -->
            <div class="interaction-panel">
              <div class="interaction-header">
                <h4>Suggested chats:</h4>
                <div class="watch-actions">
                  <button class="interact-btn" id="send-danmaku-btn">
                    <i class="fas fa-comment"></i> Send chat
                  </button>
                  <button class="interact-btn" id="send-gift-btn">
                    <i class="fas fa-gift"></i> Send gift
                  </button>
                </div>
              </div>
              <div class="recommended-interactions">
                ${recommendedButtons || '<p class="no-interactions">Waiting for suggested chats...</p>'}
              </div>
            </div>

            <!-- Danmaku -->
            <div class="danmaku-container" id="danmaku-container">
              <div class="danmaku-list" id="danmaku-list">
                ${danmakuItems || '<div class="no-danmaku">Waiting for chat...</div>'}
              </div>
            </div>
          </div>

          <!-- Send-chat modal -->
          <div id="danmaku-modal" class="modal">
            <div class="modal-content">
              <div class="modal-header">
                <h3>Send chat</h3>
                <button class="modal-close-btn">&times;</button>
              </div>
              <form id="danmaku-form">
                <textarea id="custom-danmaku-textarea" placeholder="Chat message..." rows="4"></textarea>
                <button type="submit" class="submit-btn">Send chat</button>
              </form>
            </div>
          </div>

          <!-- Gift modal -->
          <div id="gift-send-modal" class="modal">
            <div class="gift-modal-container">
              <div class="gift-modal-header">
                <div class="gift-modal-title">✨ Send a gift</div>
                <button class="gift-modal-close" onclick="watchLiveAppHideModal('gift-send-modal')">&times;</button>
              </div>

              <div class="gift-modal-body">
                <div class="gift-list-container">
                    <!-- Gifts sorted by price, one column -->
                    <div class="gift-card" data-gift="Support Mic" data-price="1">
                      <div class="gift-icon">🎤</div>
                      <div class="gift-info">
                        <div class="gift-name">Support Mic</div>
                        <div class="gift-price">¥1</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Light Stick" data-price="3">
                      <div class="gift-icon">💡</div>
                      <div class="gift-info">
                        <div class="gift-name">Light Stick</div>
                        <div class="gift-price">¥3</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Heart Hands" data-price="5">
                      <div class="gift-icon">💖</div>
                      <div class="gift-info">
                        <div class="gift-name">Heart Hands</div>
                        <div class="gift-price">¥5</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Ticket" data-price="6">
                      <div class="gift-icon">🎟️</div>
                      <div class="gift-info">
                        <div class="gift-name">Ticket</div>
                        <div class="gift-price">¥6</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Little Gold Statue" data-price="9">
                      <div class="gift-icon">🏆</div>
                      <div class="gift-info">
                        <div class="gift-name">Little Gold Statue</div>
                        <div class="gift-price">¥9</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Victory Bouquet" data-price="18">
                      <div class="gift-icon">💐</div>
                      <div class="gift-info">
                        <div class="gift-name">Victory Bouquet</div>
                        <div class="gift-price">¥18</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Secret Letter" data-price="28">
                      <div class="gift-icon">💌</div>
                      <div class="gift-info">
                        <div class="gift-name">Secret Letter</div>
                        <div class="gift-price">¥28</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift=""stuck!"" data-price="38">
                      <div class="gift-icon">🎬</div>
                      <div class="gift-info">
                        <div class="gift-name">"stuck!"</div>
                        <div class="gift-price">¥38</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Shining Star" data-price="58">
                      <div class="gift-icon">🌟</div>
                      <div class="gift-info">
                        <div class="gift-name">Shining Star</div>
                        <div class="gift-price">¥58</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Brilliant Diamond" data-price="88">
                      <div class="gift-icon">💎</div>
                      <div class="gift-info">
                        <div class="gift-name">Brilliant Diamond</div>
                        <div class="gift-price">¥88</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Red-carpet Lipstick" data-price="128">
                      <div class="gift-icon">💄</div>
                      <div class="gift-info">
                        <div class="gift-name">Red-carpet Lipstick</div>
                        <div class="gift-price">¥128</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Coronation Crown" data-price="188">
                      <div class="gift-icon">👑</div>
                      <div class="gift-info">
                        <div class="gift-name">Coronation Crown</div>
                        <div class="gift-price">¥188</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift=""Film Roll"" data-price="288">
                      <div class="gift-icon">📸</div>
                      <div class="gift-info">
                        <div class="gift-name">"Film Roll"</div>
                        <div class="gift-price">¥288</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Platinum Record" data-price="388">
                      <div class="gift-icon">🎶</div>
                      <div class="gift-info">
                        <div class="gift-name">Platinum Record</div>
                        <div class="gift-price">¥388</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Victory Champagne" data-price="488">
                      <div class="gift-icon">🥂</div>
                      <div class="gift-info">
                        <div class="gift-name">Victory Champagne</div>
                        <div class="gift-price">¥488</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Star Shades" data-price="588">
                      <div class="gift-icon">🕶️</div>
                      <div class="gift-info">
                        <div class="gift-name">Star Shades</div>
                        <div class="gift-price">¥588</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Pop Rocket" data-price="666">
                      <div class="gift-icon">🚀</div>
                      <div class="gift-info">
                        <div class="gift-name">Pop Rocket</div>
                        <div class="gift-price">¥666</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Starship" data-price="888">
                      <div class="gift-icon">🚁</div>
                      <div class="gift-info">
                        <div class="gift-name">Starship</div>
                        <div class="gift-price">¥888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Walk of Fame" data-price="999">
                      <div class="gift-icon">📢</div>
                      <div class="gift-info">
                        <div class="gift-name">Walk of Fame</div>
                        <div class="gift-price">¥999</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Oracle Script" data-price="1288">
                      <div class="gift-icon">📜</div>
                      <div class="gift-info">
                        <div class="gift-name">Oracle Script</div>
                        <div class="gift-price">¥1288</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Castle in the Sky" data-price="1888">
                      <div class="gift-icon">🏰</div>
                      <div class="gift-info">
                        <div class="gift-name">Castle in the Sky</div>
                        <div class="gift-price">¥1888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Light-speed Car" data-price="2888">
                      <div class="gift-icon">🏎️</div>
                      <div class="gift-info">
                        <div class="gift-name">Light-speed Car</div>
                        <div class="gift-price">¥2888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Universe Tour" data-price="3888">
                      <div class="gift-icon">🌍</div>
                      <div class="gift-info">
                        <div class="gift-name">Universe Tour</div>
                        <div class="gift-price">¥3888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Dream Cruise" data-price="4888">
                      <div class="gift-icon">🛳️</div>
                      <div class="gift-info">
                        <div class="gift-name">Dream Cruise</div>
                        <div class="gift-price">¥4888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Galaxy Fleet" data-price="5888">
                      <div class="gift-icon">🌌</div>
                      <div class="gift-info">
                        <div class="gift-name">Galaxy Fleet</div>
                        <div class="gift-price">¥5888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Private Planet" data-price="6888">
                      <div class="gift-icon">🪐</div>
                      <div class="gift-info">
                        <div class="gift-name">Private Planet</div>
                        <div class="gift-price">¥6888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Miracle Factory" data-price="7888">
                      <div class="gift-icon">✨</div>
                      <div class="gift-info">
                        <div class="gift-name">Miracle Factory</div>
                        <div class="gift-price">¥7888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Eternal Star" data-price="8888">
                      <div class="gift-icon">🌠</div>
                      <div class="gift-info">
                        <div class="gift-name">Eternal Star</div>
                        <div class="gift-price">¥8888</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Star Sovereign" data-price="9999">
                      <div class="gift-icon">🔱</div>
                      <div class="gift-info">
                        <div class="gift-name">Star Sovereign</div>
                        <div class="gift-price">¥9999</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                    <div class="gift-card" data-gift="Named After You" data-price="10000">
                      <div class="gift-icon">🔭</div>
                      <div class="gift-info">
                        <div class="gift-name">Named After You</div>
                        <div class="gift-price">¥10000</div>
                      </div>
                      <div class="gift-controls">
                        <button class="qty-btn minus">-</button>
                        <input type="number" class="qty-input" value="0" min="0" max="999">
                        <button class="qty-btn plus">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="gift-message-section">
                  <div class="message-label">💬 Gift message</div>
                  <textarea id="gift-message-input" placeholder="Say something..."></textarea>
                </div>

                <div class="gift-summary">
                  <div class="total-amount">
                    <span class="amount-label">Total</span>
                    <span class="amount-value">¥<span id="gift-total-amount">0</span></span>
                  </div>
                  <button class="send-gift-btn" id="confirm-send-gift">
                    <span class="btn-icon">🎁</span>
                    <span class="btn-text">Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Gift log modal -->
          <div id="gift-modal" class="modal">
            <div class="modal-content">
              <div class="modal-header">
                <h3>Gift log</h3>
                <button class="modal-close-btn">&times;</button>
              </div>
              <ul class="gift-list">
                ${
                  state.giftList
                    .map(gift => {
                      const gsig = this.createGiftSignature(gift);
                      const needAppearClass = this.pendingAppearGiftSigs.has(gsig) ? ' need-appear' : '';
                      return `<li class="${needAppearClass.trim()}" data-sig="${gsig}"><span class="username">${
                        gift.username
                      }</span>sent <span class="gift-name">${gift.gift}</span></li>`;
                    })
                    .join('') || '<li class="no-gifts">No gifts yet</li>'
                }
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
      console.log('[Live App] Binding events...');

      const appContainer = document.getElementById('app-content');
      if (!appContainer) {
        console.error('[Live App] App container missing');
        return;
      }

      try {
        // Watch Live相关事件
        if (this.currentView === 'start') {
          // Live now按钮
          const currentLiveListBtn = appContainer.querySelector('#current-live-list');
          if (currentLiveListBtn) {
            currentLiveListBtn.addEventListener('click', () => {
              this.requestCurrentLiveList();
            });
          }

          // Open a specific room按钮
          const specificLiveRoomBtn = appContainer.querySelector('#specific-live-room');
          if (specificLiveRoomBtn) {
            specificLiveRoomBtn.addEventListener('click', () => {
              this.showSpecificLiveRoomModal();
            });
          }
        }

        // Live rooms相关事件
        if (this.currentView === 'list') {
          // 返回按钮
          const backBtn = appContainer.querySelector('#back-to-watch-options');
          if (backBtn) {
            backBtn.addEventListener('click', () => {
              // Stop listening并重置状态
              this.eventListener.stopListening();
              this.isWaitingForLiveList = false;
              this.currentView = 'start';
              this.updateAppContent();
            });
          }

          // Watch Live间按钮
          appContainer.querySelectorAll('.watch-room-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const roomData = JSON.parse(btn.dataset.room);
              this.watchSelectedRoom(roomData);
            });
          });
        }

        // 直播中相关事件
        if (this.currentView === 'live') {
          // 推荐弹幕按钮
          appContainer.querySelectorAll('.rec-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const danmaku = btn.dataset.interaction;
              if (danmaku) {
                this.sendDanmaku(danmaku);
              }
            });
          });

          // 发送弹幕按钮
          const sendDanmakuBtn = appContainer.querySelector('#send-danmaku-btn');
          if (sendDanmakuBtn) {
            sendDanmakuBtn.addEventListener('click', () => {
              this.showModal('danmaku-modal');
            });
          }

          // 打赏礼物按钮
          const sendGiftBtn = appContainer.querySelector('#send-gift-btn');
          if (sendGiftBtn) {
            sendGiftBtn.addEventListener('click', () => {
              this.showModal('gift-send-modal');
              this.initGiftModal();
            });
          }

          // 发送弹幕表单
          const danmakuForm = appContainer.querySelector('#danmaku-form');
          if (danmakuForm) {
            danmakuForm.addEventListener('submit', e => {
              e.preventDefault();
              const textarea = appContainer.querySelector('#custom-danmaku-textarea');
              const danmaku = textarea ? textarea.value.trim() : '';
              if (danmaku) {
                this.sendCustomDanmaku(danmaku);
                textarea.value = '';
                this.hideAllModals();
              } else {
                this.showToast('Enter a chat message', 'warning');
              }
            });
          }

          // 打赏礼物表单
          const giftSubmitBtn = appContainer.querySelector('#confirm-send-gift');
          if (giftSubmitBtn) {
            giftSubmitBtn.addEventListener('click', () => {
              this.sendGifts();
            });
          }

          // 弹窗关闭按钮
          appContainer.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              this.hideAllModals();
            });
          });

          // 点击弹窗背景关闭
          appContainer.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', e => {
              if (e.target === modal) {
                this.hideAllModals();
              }
            });
          });

          // 自动"jump"弹幕到底部（瞬时、仅在未在底部时触发）
          const danmakuContainer = appContainer.querySelector('#danmaku-container');
          if (danmakuContainer) {
            this.jumpToBottomIfNeeded(danmakuContainer);
          }
        }

        console.log('[Live App] Events bound');
      } catch (error) {
        console.error('[Live App] Bind events error:', error);
        this.showToast('Event bind failed: ' + error.message, 'error');
      }
    }

    // 若接近底部则保持不动；若不在底部则瞬时跳到底部
    jumpToBottomIfNeeded(container) {
      const threshold = 10; // px判定阈值
      const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      if (distanceToBottom > threshold) {
        // 瞬间jump，无动画
        container.scrollTop = container.scrollHeight;
      }
    }

    /**
     * 请求Live now
     */
    async requestCurrentLiveList() {
      try {
        console.log('[Watch Live App] Requesting live list...');

        // 先切换到列表视图
        this.currentView = 'list';
        this.isWaitingForLiveList = false; // 先设为false，立即解析现有内容

        // 立即解析并渲染现有的Live rooms
        console.log('[Watch Live App] Parsing existing rooms now...');
        this.updateAppContent();

        // 检查是否已有直播间数据
        const existingRooms = this.parseLiveRoomList();
        if (existingRooms.length > 0) {
          console.log(`[Watch Live App] Rendered ${existingRooms.length} existing rooms`);
        } else {
          console.log('[Watch Live App] No existing rooms');
        }

        // 然后发送请求获取新的Live rooms
        const message =
          'The user wants to watch live streams. Generate 5–10 rooms that could be live now. Each room MUST use exactly this format: [直播|room name|streamer username|category|viewer count]. Streamers may be characters, NPCs, or bystanders. Put one room per line';

        // 设置等待状态，准备接收新回复
        this.isWaitingForLiveList = true;

        // 开始监听AI回复
        this.eventListener.startListening();

        await this.sendToSillyTavern(message);

        console.log('[Watch Live App] Live-list request sent — waiting for reply...');
      } catch (error) {
        console.error('[Watch Live App] Live-list request failed:', error);
        this.showToast('Could not load live list: ' + error.message, 'error');
        this.isWaitingForLiveList = false;
      }
    }

    /**
     * 显示指定直播间弹窗
     */
    showSpecificLiveRoomModal() {
      // 创建弹窗HTML
      const modalHtml = `
        <div class="modal-overlay" id="specific-live-modal" style="display: flex;">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Open a specific room</h3>
              <button class="modal-close" onclick="watchLiveAppHideModal('specific-live-modal')">&times;</button>
            </div>
            <div class="modal-body">
              <div class="input-section">
                <label for="streamer-name-input">Streamer to watch:</label>
                <input type="text" id="streamer-name-input" placeholder="Streamer name..." />
              </div>
              <button class="watch-live-btn" id="watch-specific-live">Watch Live</button>
            </div>
          </div>
        </div>
      `;

      // 添加到页面
      const appContainer = document.getElementById('app-content');
      if (appContainer) {
        appContainer.insertAdjacentHTML('beforeend', modalHtml);

        // 绑定Watch Live按钮事件
        const watchBtn = document.getElementById('watch-specific-live');
        if (watchBtn) {
          watchBtn.addEventListener('click', () => {
            const input = document.getElementById('streamer-name-input');
            const streamerName = input ? input.value.trim() : '';
            if (streamerName) {
              this.watchSpecificLive(streamerName);
            } else {
              this.showToast('Enter a streamer name', 'warning');
            }
          });
        }
      }
    }

    /**
     * 观看指定直播
     */
    async watchSpecificLive(streamerName) {
      try {
        console.log('[Watch Live App] Open named room:', streamerName);

        // 设置渲染权为watch
        await this.setRenderingRight('watch');

        const message = `The user is watching ${streamerName}. Generate live data in the required format: 本场人数, 直播内容, danmaku, tips, and 推荐互动. Emit 本场人数 and 直播内容 exactly once. Keep 直播内容 short. End with four 推荐互动 lines. Do not use any other format. 推荐互动 items must be chat messages the viewer might send.`;

        // 隐藏弹窗
        this.hideModal('specific-live-modal');

        // 切换到直播间视图
        this.currentView = 'live';
        this.stateManager.startLive();
        this.eventListener.startListening();

        await this.sendToSillyTavern(message);
        this.updateAppContent();

        console.log('[Watch Live App] Opened specific room');
      } catch (error) {
        console.error('[Watch Live App] Open named room failed:', error);
        this.showToast('Could not join room: ' + error.message, 'error');
      }
    }

    /**
     * 解析Live rooms数据
     * 参考live-app的解析方式，支持解析多个直播间格式
     */
    parseLiveRoomList() {
      try {
        // 获取最新的聊天内容
        const chatContent = this.dataParser.getChatContent();
        if (!chatContent) {
          console.log('[Watch Live App] No chat text to parse');
          return [];
        }

        console.log('[Watch Live App] Parsing rooms, content length:', chatContent.length);

        // 匹配直播间格式：[直播|直播间名称|主播用户名|直播类别|观看人数]
        // 使用更严格的正则表达式，确保正确匹配
        const liveRoomRegex = /\[直播\|([^|\]]+)\|([^|\]]+)\|([^|\]]+)\|([^|\]]+)\]/g;
        const rooms = [];
        let match;
        let matchCount = 0;

        // 重置正则表达式的lastIndex
        liveRoomRegex.lastIndex = 0;

        while ((match = liveRoomRegex.exec(chatContent)) !== null) {
          matchCount++;
          const roomData = {
            name: match[1].trim(),
            streamer: match[2].trim(),
            category: match[3].trim(),
            viewers: match[4].trim(),
          };

          // 验证数据有效性
          if (roomData.name && roomData.streamer && roomData.category && roomData.viewers) {
            rooms.push(roomData);
            console.log(`[Watch Live App] Parsed room ${matchCount}:`, roomData);
          } else {
            console.warn('[Watch Live App] Skipping invalid room:', roomData);
          }

          // 防止无限循环
          if (matchCount > 50) {
            console.warn('[Watch Live App] Hit parse cap — stopping');
            break;
          }
        }

        console.log(`[Watch Live App] Parsed ${rooms.length} valid rooms`);
        return rooms;
      } catch (error) {
        console.error('[Watch Live App] Parse rooms failed:', error);
        return [];
      }
    }

    /**
     * 观看选中的直播间
     */
    async watchSelectedRoom(roomData) {
      try {
        console.log('[Watch Live App] Opening selected room:', roomData);

        // 设置渲染权为watch
        await this.setRenderingRight('watch');

        const message = `The user opened a room: name ${roomData.name}, streamer ${roomData.streamer}, category ${roomData.category}, viewers ${roomData.viewers}. Generate live data in the required format: 本场人数, 直播内容, danmaku, tips, and 推荐互动. Emit 本场人数 and 直播内容 exactly once. Keep 直播内容 short. The stream may have just started or already been live. End with four 推荐互动 lines. Do not use any other format. 推荐互动 items must be chat messages the viewer might send.`;

        // 切换到直播间视图
        this.currentView = 'live';
        this.stateManager.startLive();
        this.eventListener.startListening();

        await this.sendToSillyTavern(message);
        this.updateAppContent();

        console.log('[Watch Live App] Entered selected room');
      } catch (error) {
        console.error('[Watch Live App] Open selected room failed:', error);
        this.showToast('Could not join room: ' + error.message, 'error');
      }
    }

    /**
     * 发送推荐弹幕
     */
    async sendDanmaku(danmaku) {
      try {
        console.log('[Watch Live App] Sending suggested chat:', danmaku);

        const message = `用户正在Watch Live，并发送弹幕"${danmaku}"，请勿重复或替用户发送弹幕。请按照正确的直播格式要求生成本场人数，直播内容，其余弹幕，打赏和推荐互动。此次回复内仅生成一次本场人数和直播内容格式，直播内容需要简洁。最后需要生成四条推荐互动，内容为用户可能会发送的弹幕。禁止使用错误格式。
[直播|{{user}}|弹幕|${danmaku}]`;

        await this.sendToSillyTavern(message);
        console.log('[Watch Live App] Suggested chat sent');
      } catch (error) {
        console.error('[Watch Live App] Suggested chat send failed:', error);
        this.showToast('Could not send chat: ' + error.message, 'error');
      }
    }

    /**
     * 发送自定义弹幕
     */
    async sendCustomDanmaku(danmaku) {
      try {
        console.log('[Watch Live App] Sending custom chat:', danmaku);

        const message = `用户正在Watch Live，并发送弹幕"${danmaku}"，请勿重复或替用户发送弹幕。请按照正确的直播格式要求生成本场人数，直播内容，其余弹幕，打赏和推荐互动。此次回复内仅生成一次本场人数和直播内容格式，直播内容需要简洁。最后需要生成四条推荐互动，内容为用户可能会发送的弹幕。禁止使用错误格式。
[直播|{{user}}|弹幕|${danmaku}]`;

        await this.sendToSillyTavern(message);
        console.log('[Watch Live App] Custom chat sent');
      } catch (error) {
        console.error('[Watch Live App] Custom chat send failed:', error);
        this.showToast('Could not send chat: ' + error.message, 'error');
      }
    }

    /**
     * 初始化礼物弹窗
     */
    initGiftModal() {
      // 绑定礼物数量调整按钮
      const giftCards = document.querySelectorAll('.gift-card');
      giftCards.forEach(card => {
        const minusBtn = card.querySelector('.qty-btn.minus');
        const plusBtn = card.querySelector('.qty-btn.plus');
        const quantityInput = card.querySelector('.qty-input');

        if (minusBtn && plusBtn && quantityInput) {
          minusBtn.addEventListener('click', () => {
            let quantity = parseInt(quantityInput.value) || 0;
            if (quantity > 0) {
              quantity--;
              quantityInput.value = quantity;
              this.updateGiftTotal();
              this.updateGiftCardState(card, quantity);
            }
          });

          plusBtn.addEventListener('click', () => {
            let quantity = parseInt(quantityInput.value) || 0;
            quantity++;
            quantityInput.value = quantity;
            this.updateGiftTotal();
            this.updateGiftCardState(card, quantity);
          });

          // 监听输入框变化
          quantityInput.addEventListener('input', () => {
            let quantity = parseInt(quantityInput.value) || 0;
            if (quantity < 0) {
              quantity = 0;
              quantityInput.value = quantity;
            }
            if (quantity > 999) {
              quantity = 999;
              quantityInput.value = quantity;
            }
            this.updateGiftTotal();
            this.updateGiftCardState(card, quantity);
          });
        }
      });

      // 初始化Total
      this.updateGiftTotal();
    }

    /**
     * 更新礼物卡片状态
     */
    updateGiftCardState(card, quantity) {
      if (quantity > 0) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    }

    /**
     * 更新礼物Total
     */
    updateGiftTotal() {
      let total = 0;
      const giftCards = document.querySelectorAll('.gift-card');

      giftCards.forEach(card => {
        const quantity = parseInt(card.querySelector('.qty-input').value) || 0;
        const price = parseInt(card.dataset.price);
        total += quantity * price;
      });

      const totalAmountSpan = document.getElementById('gift-total-amount');
      if (totalAmountSpan) {
        totalAmountSpan.textContent = total;
      }
    }

    /**
     * 发Send物
     */
    async sendGifts() {
      try {
        const selectedGifts = [];
        const giftCards = document.querySelectorAll('.gift-card');

        giftCards.forEach(card => {
          const quantity = parseInt(card.querySelector('.qty-input').value) || 0;
          if (quantity > 0) {
            const giftName = card.dataset.gift;
            const price = parseInt(card.dataset.price);
            selectedGifts.push({
              name: giftName,
              quantity: quantity,
              price: price,
              total: quantity * price,
            });
          }
        });

        if (selectedGifts.length === 0) {
          this.showToast('Pick a gift to send', 'warning');
          return;
        }

        const totalAmount = selectedGifts.reduce((sum, gift) => sum + gift.total, 0);
        const giftMessage = document.getElementById('gift-message-input')?.value.trim() || '';

        console.log('[Watch Live App] Sending gift:', selectedGifts);

        // 构建礼物描述
        const giftDescriptions = selectedGifts
          .map(gift => (gift.quantity === 1 ? gift.name : `${gift.name}*${gift.quantity}`))
          .join('，');

        // 构建消息
        let message = `The user is watching and tipped "${giftDescriptions}" for "${totalAmount}"`;
        if (giftMessage) {
          message += `, tip message: "${giftMessage}"`;
        }
        message += `，请勿重复或替用户发送弹幕。请按照正确的直播格式要求生成本场人数，直播内容，其余弹幕，打赏和推荐互动。此次回复内仅生成一次本场人数和直播内容格式，直播内容需要简洁。最后需要生成四条推荐互动，内容为用户可能会发送的弹幕。禁止使用错误格式。
`;

        // 添加打赏格式 - 每种礼物一条记录
        selectedGifts.forEach(gift => {
          const giftFormat = gift.quantity === 1 ? gift.name : `${gift.name}*${gift.quantity}`;
          message += `[直播|{{user}}|打赏|${giftFormat}]\n`;
        });

        // 如果有留言，添加弹幕格式
        if (giftMessage) {
          message += `[直播|{{user}}|弹幕|${giftMessage}]`;
        }

        await this.sendToSillyTavern(message);

        // 重置礼物选择
        this.resetGiftModal();
        this.hideAllModals();

        console.log('[Watch Live App] Gift sent');
        this.showToast('Gift sent', 'success');
      } catch (error) {
        console.error('[Watch Live App] Send gift failed:', error);
        this.showToast('Could not send gift: ' + error.message, 'error');
      }
    }

    /**
     * 重置礼物弹窗
     */
    resetGiftModal() {
      const giftCards = document.querySelectorAll('.gift-card');
      giftCards.forEach(card => {
        const quantityInput = card.querySelector('.qty-input');
        if (quantityInput) {
          quantityInput.value = '0';
        }
        card.classList.remove('selected');
      });

      // 清空留言
      const messageInput = document.getElementById('gift-message-input');
      if (messageInput) {
        messageInput.value = '';
      }

      this.updateGiftTotal();
    }

    /**
     * 显示弹窗
     */
    showModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
      }
    }

    /**
     * 隐藏弹窗
     */
    hideModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
        // 如果是动态创建的弹窗，移除它
        if (modalId === 'specific-live-modal') {
          modal.remove();
        }
      }
    }

    /**
     * 隐藏所有弹窗
     */
    hideAllModals() {
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => {
        modal.classList.remove('active');
      });
    }

    /**
     * 设置渲染权
     */
    async setRenderingRight(type) {
      try {
        console.log(`[Watch Live App] Set render-right: ${type}`);

        if (!window.mobileContextEditor) {
          console.warn('[Watch Live App] Context editor not ready — cannot set render-right');
          return false;
        }

        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          console.warn('[Watch Live App] No chat — cannot set render-right');
          return false;
        }

        const firstMessage = chatData.messages[0];
        let originalContent = firstMessage.mes || '';

        // 检查是否已经包含渲染权标记
        const renderingRightRegex = /<!-- LIVE_RENDERING_RIGHT_START -->([\s\S]*?)<!-- LIVE_RENDERING_RIGHT_END -->/;
        const renderingRightSection = `<!-- LIVE_RENDERING_RIGHT_START -->\n[直播渲染权: ${type}]\n<!-- LIVE_RENDERING_RIGHT_END -->`;

        if (renderingRightRegex.test(originalContent)) {
          // 更新现有的渲染权标记
          originalContent = originalContent.replace(renderingRightRegex, renderingRightSection);
        } else {
          // 在内容开头添加渲染权标记
          originalContent = renderingRightSection + '\n\n' + originalContent;
        }

        // 更新第1楼层
        const success = await window.mobileContextEditor.modifyMessage(0, originalContent);
        if (success) {
          console.log(`[Watch Live App] ✅ Render-right set: ${type}`);
          return true;
        } else {
          console.error('[Watch Live App] Set render-right failed');
          return false;
        }
      } catch (error) {
        console.error('[Watch Live App] Set render-right error:', error);
        return false;
      }
    }

    /**
     * 获取当前渲染权
     */
    getRenderingRight() {
      try {
        if (!window.mobileContextEditor) {
          return null;
        }

        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          return null;
        }

        const firstMessage = chatData.messages[0];
        const content = firstMessage.mes || '';

        const renderingRightRegex =
          /<!-- LIVE_RENDERING_RIGHT_START -->\s*\[直播渲染权:\s*(\w+)\]\s*<!-- LIVE_RENDERING_RIGHT_END -->/;
        const match = content.match(renderingRightRegex);

        return match ? match[1] : null;
      } catch (error) {
        console.error('[Watch Live App] Get render-right error:', error);
        return null;
      }
    }

    /**
     * Clear render-right
     */
    async clearRenderingRight() {
      try {
        console.log('[Watch Live App] Clear render-right');

        if (!window.mobileContextEditor) {
          console.warn('[Watch Live App] Context editor not ready — cannot clear render-right');
          return false;
        }

        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          console.warn('[Watch Live App] No chat — cannot clear render-right');
          return false;
        }

        const firstMessage = chatData.messages[0];
        let originalContent = firstMessage.mes || '';

        // 移除渲染权标记
        const renderingRightRegex =
          /<!-- LIVE_RENDERING_RIGHT_START -->([\s\S]*?)<!-- LIVE_RENDERING_RIGHT_END -->\s*\n*/;
        if (renderingRightRegex.test(originalContent)) {
          originalContent = originalContent.replace(renderingRightRegex, '').trim();

          // 更新第1楼层
          const success = await window.mobileContextEditor.modifyMessage(0, originalContent);
          if (success) {
            console.log('[Watch Live App] ✅ Render-right cleared');
            return true;
          } else {
            console.error('[Watch Live App] Clear render-right failed');
            return false;
          }
        } else {
          console.log('[Watch Live App] No render-right marker');
          return true;
        }
      } catch (error) {
        console.error('[Watch Live App] Clear render-right error:', error);
        return false;
      }
    }

    /**
     * 发送消息到SillyTavern
     */
    async sendToSillyTavern(message) {
      try {
        console.log('[Live App] Sending to SillyTavern:', message);

        // 尝试找到文本输入框
        const textarea = document.querySelector('#send_textarea');
        if (!textarea) {
          console.error('[Live App] Message box not found');
          throw new Error('Message box not found');
        }

        // 设置消息内容
        textarea.value = message;
        textarea.focus();

        // 触发输入事件
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // 触发发送按钮点击
        const sendButton = document.querySelector('#send_but');
        if (sendButton) {
          sendButton.click();
          console.log('[Live App] Clicked send');
          return true;
        }

        throw new Error('Send button not found');
      } catch (error) {
        console.error('[Live App] sendToSillyTavern error:', error);
        throw error;
      }
    }

    /**
     * 将直播格式转换为直播历史格式
     */
    async convertLiveToHistory() {
      try {
        console.log('[Watch Live App] Converting live tags to history tags');

        // 获取当前聊天数据
        const contextData = this.getChatData();
        if (!contextData || contextData.length === 0) {
          console.log('[Watch Live App] No chat data');
          return;
        }

        // 查找包含直播内容的消息
        let hasLiveContent = false;
        let updatedCount = 0;
        const messagesToUpdate = []; // 收集需要更新的消息

        // 第一遍：收集所有需要转换的消息
        for (let i = 0; i < contextData.length; i++) {
          const message = contextData[i];
          const content = message.mes || message.content || '';

          if (content.includes('[直播|')) {
            hasLiveContent = true;
            // 转换格式
            const convertedContent = this.convertLiveFormats(content);

            if (convertedContent !== content) {
              messagesToUpdate.push({
                index: i,
                originalContent: content,
                convertedContent: convertedContent
              });
            }
          }
        }

        if (!hasLiveContent) {
          console.log('[Watch Live App] No 直播内容 to convert');
          return;
        }

        // 第二遍：批量更新消息，减少频繁的DOM操作和保存
        console.log(`[Watch Live App] Batch-updating ${messagesToUpdate.length} messages`);

        // 临时禁用自动保存机制，避免每次更新都触发保存
        const originalSaveChatDebounced = window.saveChatDebounced;
        const originalSaveChatConditional = window.saveChatConditional;

        // 临时替换为空函数
        if (window.saveChatDebounced) {
          window.saveChatDebounced = () => {};
        }
        if (window.saveChatConditional) {
          window.saveChatConditional = () => Promise.resolve();
        }

        try {
          for (const messageUpdate of messagesToUpdate) {
            // 批量处理时跳过自动保存，避免频繁保存
            const success = await this.updateMessageContent(messageUpdate.index, messageUpdate.convertedContent, true);
            if (success) {
              updatedCount++;
              console.log(
                `[Watch Live App] Converted message ${messageUpdate.index}, ${messageUpdate.originalContent.length} → ${messageUpdate.convertedContent.length} chars`,
              );
            }
          }
        } finally {
          // 恢复原始的保存函数
          if (originalSaveChatDebounced) {
            window.saveChatDebounced = originalSaveChatDebounced;
          }
          if (originalSaveChatConditional) {
            window.saveChatConditional = originalSaveChatConditional;
          }
        }

        console.log(`[Watch Live App] Format conversion updated ${updatedCount} messages`);

        // 只在最后保存一次聊天数据，避免频繁保存导致卡顿
        if (updatedCount > 0) {
          await this.saveChatData();
          console.log('[Watch Live App] Converted and saved chat');
        }
      } catch (error) {
        console.error('[Watch Live App] Live-format convert failed:', error);
        this.showToast('Format conversion failed: ' + error.message, 'error');
      }
    }

    /**
     * 转换直播格式字符串
     */
    convertLiveFormats(content) {
      let convertedContent = content;
      let conversionCount = 0;

      // 转换弹幕格式: [直播|用户|弹幕|内容] -> [直播历史|用户|弹幕|内容]
      const danmuMatches = convertedContent.match(/\[直播\|([^|]+)\|弹幕\|([^\]]+)\]/g);
      if (danmuMatches) {
        convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|弹幕\|([^\]]+)\]/g, '[直播历史|$1|弹幕|$2]');
        conversionCount += danmuMatches.length;
      }

      // 转换礼物格式: [直播|用户|礼物|内容] -> [直播历史|用户|礼物|内容]
      // 转换打赏格式: [直播|用户|打赏|内容] -> [直播历史|用户|打赏|内容]
      const giftMatches = convertedContent.match(/\[直播\|([^|]+)\|(?:礼物|打赏)\|([^\]]+)\]/g);
      if (giftMatches) {
        convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|礼物\|([^\]]+)\]/g, '[直播历史|$1|礼物|$2]');
        convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|打赏\|([^\]]+)\]/g, '[直播历史|$1|打赏|$2]');
        conversionCount += giftMatches.length;
      }

      // 转换推荐互动格式: [直播|推荐互动|内容] -> [直播历史|推荐互动|内容]
      const recommendMatches = convertedContent.match(/\[直播\|推荐互动\|([^\]]+)\]/g);
      if (recommendMatches) {
        convertedContent = convertedContent.replace(/\[直播\|推荐互动\|([^\]]+)\]/g, '[直播历史|推荐互动|$1]');
        conversionCount += recommendMatches.length;
      }

      // 转换本场人数格式: [直播|本场人数|数字] -> [直播历史|本场人数|数字]
      const audienceMatches = convertedContent.match(/\[直播\|本场人数\|([^\]]+)\]/g);
      if (audienceMatches) {
        convertedContent = convertedContent.replace(/\[直播\|本场人数\|([^\]]+)\]/g, '[直播历史|本场人数|$1]');
        conversionCount += audienceMatches.length;
      }

      // 转换直播内容格式: [直播|直播内容|内容] -> [直播历史|直播内容|内容]
      const contentMatches = convertedContent.match(/\[直播\|直播内容\|([^\]]+)\]/g);
      if (contentMatches) {
        convertedContent = convertedContent.replace(/\[直播\|直播内容\|([^\]]+)\]/g, '[直播历史|直播内容|$1]');
        conversionCount += contentMatches.length;
      }

      // 转换其他可能的直播格式 (兼容旧格式)
      const otherMatches = convertedContent.match(/\[直播\|([^|]+)\|([^\]]+)\]/g);
      if (otherMatches) {
        // 排除已经处理过的格式
        const filteredMatches = otherMatches.filter(
          match =>
            !match.includes('弹幕|') &&
            !match.includes('礼物|') &&
            !match.includes('打赏|') &&
            !match.includes('推荐互动|') &&
            !match.includes('本场人数|') &&
            !match.includes('直播内容|'),
        );
        if (filteredMatches.length > 0) {
          convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|([^\]]+)\]/g, (match, p1, p2) => {
            if (
              !match.includes('弹幕|') &&
              !match.includes('礼物|') &&
              !match.includes('打赏|') &&
              !match.includes('推荐互动|') &&
              !match.includes('本场人数|') &&
              !match.includes('直播内容|')
            ) {
              return `[直播历史|${p1}|${p2}]`;
            }
            return match;
          });
          conversionCount += filteredMatches.length;
        }
      }

      // 移除单个消息转换的日志，避免批量处理时重复输出
      // if (conversionCount > 0) {
      //   console.log(`[Watch Live App] Converted ${conversionCount} live tags`);
      // }

      return convertedContent;
    }

    /**
     * 更新消息内容
     * @param {number} messageIndex - 消息索引
     * @param {string} newContent - 新内容
     * @param {boolean} skipAutoSave - 是否跳过自动保存（用于批量处理）
     */
    async updateMessageContent(messageIndex, newContent, skipAutoSave = false) {
      try {
        // 简化日志输出，避免批量处理时过多日志
        console.log(`[Watch Live App] Updating message ${messageIndex}`);

        // 方法1: 使用与getChatData相同的方法获取chat数组（推荐，不会触发自动保存）
        let chat = null;

        // 优先使用SillyTavern.getContext().chat
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            chat = context.chat;
          }
        }

        // 如果上面的方法失败，尝试从全局变量获取
        if (!chat) {
          chat = window['chat'];
        }

        if (chat && Array.isArray(chat)) {
          // 添加边界检查
          if (messageIndex < 0 || messageIndex >= chat.length) {
            console.warn(`[Watch Live App] Message index ${messageIndex} out of range, chat length ${chat.length}`);
            return false;
          }

          if (!chat[messageIndex]) {
            console.warn(`[Watch Live App] No message at index ${messageIndex}`);
            return false;
          }

          const originalContent = chat[messageIndex].mes || '';
          chat[messageIndex].mes = newContent;

          // 如果消息有swipes，也需要更新
          if (chat[messageIndex].swipes && chat[messageIndex].swipe_id !== undefined) {
            chat[messageIndex].swipes[chat[messageIndex].swipe_id] = newContent;
          }

          // 标记聊天数据已被修改
          if (window.chat_metadata) {
            window.chat_metadata.tainted = true;
          }

          console.log(
            `[Watch Live App] Updated message ${messageIndex}, ${originalContent.length} → ${newContent.length} chars`,
          );
          return true;
        }

        // 添加调试信息
        console.warn(`[Watch Live App] Cannot access chat array, type=${typeof chat}, isArray=${Array.isArray(chat)}`);
        if (chat && Array.isArray(chat)) {
          console.warn(`[Watch Live App] chat length ${chat.length}, requested index ${messageIndex}`);
        }

        // 如果直接方法失败，尝试备用方法（即使在批量处理时也要尝试）
        // 方法2: 尝试通过编辑器功能更新（可能会触发自动保存）
        if (window.mobileContextEditor && window.mobileContextEditor.modifyMessage) {
          try {
            await window.mobileContextEditor.modifyMessage(messageIndex, newContent);
            console.log(`[Watch Live App] Updated message ${messageIndex} via mobileContextEditor`);
            return true;
          } catch (error) {
            console.warn(`[Watch Live App] mobileContextEditor update failed:`, error);
          }
        }

        // 方法3: 尝试通过context-editor更新（可能会触发自动保存）
        if (window.contextEditor && window.contextEditor.modifyMessage) {
          try {
            await window.contextEditor.modifyMessage(messageIndex, newContent);
            console.log(`[Watch Live App] Updated message ${messageIndex} via contextEditor`);
            return true;
          } catch (error) {
            console.warn(`[Watch Live App] contextEditor update failed:`, error);
          }
        }

        console.warn('[Watch Live App] No valid message-update method');
        return false;
      } catch (error) {
        console.error('[Watch Live App] Update message failed:', error);
        return false;
      }
    }

    /**
     * 保存聊天数据
     */
    async saveChatData() {
      try {
        console.log('[Live App] Saving chat...');

        // 方法1: 使用SillyTavern的保存函数
        if (typeof window.saveChatConditional === 'function') {
          await window.saveChatConditional();
          console.log('[Live App] Saved via saveChatConditional');
          return true;
        }

        // 方法2: 使用延迟保存
        if (typeof window.saveChatDebounced === 'function') {
          window.saveChatDebounced();
          console.log('[Live App] Saved via saveChatDebounced');
          // 等待一下确保保存完成
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }

        // 方法3: 使用编辑器的保存功能
        if (window.mobileContextEditor && typeof window.mobileContextEditor.saveChatData === 'function') {
          await window.mobileContextEditor.saveChatData();
          console.log('[Live App] Saved via mobileContextEditor');
          return true;
        }

        // 方法4: 使用context-editor的保存功能
        if (window.contextEditor && typeof window.contextEditor.saveChatData === 'function') {
          await window.contextEditor.saveChatData();
          console.log('[Live App] Saved via contextEditor');
          return true;
        }

        // 方法5: 尝试手动保存
        try {
          if (window.jQuery && window.chat && window.this_chid) {
            const response = await window.jQuery.ajax({
              type: 'POST',
              url: '/api/chats/save',
              data: JSON.stringify({
                ch_name: window.characters[window.this_chid]?.name || 'unknown',
                file_name: window.chat_metadata?.file_name || 'default',
                chat: window.chat,
                avatar_url: window.characters[window.this_chid]?.avatar || 'none',
              }),
              cache: false,
              dataType: 'json',
              contentType: 'application/json',
            });
            console.log('[Live App] Saved via manual AJAX');
            return true;
          }
        } catch (ajaxError) {
          console.warn('[Live App] Manual AJAX save failed:', ajaxError);
        }

        console.warn('[Live App] No valid save method');
        return false;
      } catch (error) {
        console.error('[Live App] saveChatData failed:', error);
        return false;
      }
    }

    /**
     * 获取聊天数据
     */
    getChatData() {
      try {
        // 优先使用SillyTavern.getContext().chat
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            return context.chat;
          }
        }

        // 尝试从全局变量获取
        const chat = window['chat'];
        if (chat && Array.isArray(chat)) {
          return chat;
        }

        return [];
      } catch (error) {
        console.error('[Live App] getChatData failed:', error);
        return [];
      }
    }

    /**
     * 更新header
     */
    updateHeader() {
      if (window.mobilePhone && window.mobilePhone.updateAppHeader) {
        const state = {
          app: 'watch-live', // 修复：使用正确的应用名称
          title: this.currentView === 'live' ? 'Watching live' : 'Watch Live',
          view: this.currentView,
          viewerCount: this.stateManager.currentViewerCount,
        };
        window.mobilePhone.updateAppHeader(state);
      }
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `live-toast ${type}`;
      toast.textContent = message;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('show');
      }, 100);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, 3000);
    }

    /**
     * 打字机效果：将文本逐字显示，速度适中
     */
    applyTypingEffect(element, fullText) {
      // 若正在打字，先终止
      if (this.typingTimer) {
        clearInterval(this.typingTimer);
        this.typingTimer = null;
      }

      // 若内容相同且元素已经显示完整文本，则不重复打字
      if (element.getAttribute('data-full-text') === fullText && element.textContent === fullText) {
        return;
      }

      element.setAttribute('data-full-text', fullText);
      element.textContent = '';
      // 确保从顶部开始可见
      if (typeof element.scrollTop === 'number') {
        element.scrollTop = 0;
      }
      this.isTyping = true;

      const chars = Array.from(fullText);
      let index = 0;
      const stepMsHead = 35; // 前100字：逐字
      const stepMsTailChunk = 18; // 尾部：较快的块状显示（非逐字）
      const tailChunkSize = 6; // 每次追加的字符数（流畅但不突兀）

      // 在开始打字前确保滚动位置合理
      const danmakuContainer = document.getElementById('danmaku-container');
      if (danmakuContainer) {
        this.jumpToBottomIfNeeded(danmakuContainer);
      }

      this.typingTimer = setInterval(() => {
        if (index >= chars.length) {
          clearInterval(this.typingTimer);
          this.typingTimer = null;
          this.isTyping = false;
          return;
        }

        if (index < 100) {
          // 前100字逐字
          element.textContent += chars[index++];
        } else {
          // 之后采用块状追加
          const end = Math.min(index + tailChunkSize, chars.length);
          const slice = chars.slice(index, end).join('');
          element.textContent += slice;
          index = end;
          // 动态调整节奏：短暂停顿营造流畅感
          clearInterval(this.typingTimer);
          this.typingTimer = setInterval(() => {
            if (index >= chars.length) {
              clearInterval(this.typingTimer);
              this.typingTimer = null;
              this.isTyping = false;
              return;
            }
            const end2 = Math.min(index + tailChunkSize, chars.length);
            const slice2 = chars.slice(index, end2).join('');
            element.textContent += slice2;
            index = end2;
            if (index >= chars.length) {
              clearInterval(this.typingTimer);
              this.typingTimer = null;
              this.isTyping = false;
            }
          }, stepMsTailChunk);
        }
      }, stepMsHead);
    }

    /**
     * Destroy app, free resources
     */
    destroy() {
      console.log('[Live App] Destroy app, free resources');

      // Stop listening
      this.eventListener.stopListening();

      // Clear timers
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = null;
      }
      if (this.typingTimer) {
        clearInterval(this.typingTimer);
        this.typingTimer = null;
      }

      // 清空状态
      this.stateManager.clearAllData();

      // 重置状态
      this.isInitialized = false;
      this.currentView = 'start';
    }

    /**
     * 从Latest floor提取文本（优先使用 getChatMessages 接口）
     */
    getLatestFloorTextSafe() {
      try {
        const gm = (typeof window !== 'undefined' && (window.getChatMessages || globalThis.getChatMessages)) || null;
        if (typeof gm === 'function') {
          // 仅取Latest floor，优先 assistant
          const latestAssistant = gm(-1, { role: 'assistant' });
          if (Array.isArray(latestAssistant) && latestAssistant.length > 0 && latestAssistant[0]?.message) {
            return latestAssistant[0].message;
          }
          // 退化为任意角色
          const latestAny = gm(-1);
          if (Array.isArray(latestAny) && latestAny.length > 0 && latestAny[0]?.message) {
            return latestAny[0].message;
          }
        }
      } catch (e) {
        console.warn('[Live App] Latest-floor text failed (getChatMessages):', e);
      }

      // 兜底：从上下文数组拿最后一条
      try {
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && Array.isArray(context.chat) && context.chat.length > 0) {
            const last = context.chat[context.chat.length - 1];
            return last?.mes || '';
          }
        }
      } catch (e2) {
        console.warn('[Live App] Latest-floor text failed (chat fallback):', e2);
      }
      return '';
    }

    /** 生成弹幕签名（稳定，不含时间） */
    createDanmakuSignature(item) {
      const username = (item && item.username) || '';
      const content = (item && item.content) || '';
      const type = (item && item.type) || '';
      return `${username}|${content}|${type}`;
    }

    /** 生成礼物签名（稳定，不含时间） */
    createGiftSignature(item) {
      const username = (item && item.username) || '';
      const gift = (item && (item.gift || item.content)) || '';
      return `${username}|${gift}`;
    }

    /** 按顺序逐条显示需要动画的弹幕与礼物 */
    runAppearSequence() {
      try {
        const danmakuList = document.getElementById('danmaku-list');
        if (danmakuList) {
          const nodes = Array.from(danmakuList.querySelectorAll('.danmaku-item.need-appear'));
          // 初始渲染时先隐藏这些需要动画的节点（使用 display:none 避免空白）
          nodes.forEach(el => {
            el.style.display = 'none';
          });
          this.sequentialReveal(nodes);
        }

        const giftList = document.querySelector('.gift-list');
        if (giftList) {
          const giftNodes = Array.from(giftList.querySelectorAll('li.need-appear'));
          giftNodes.forEach(el => {
            el.style.display = 'none';
          });
          this.sequentialReveal(giftNodes);
        }

        // 清空待动画集合，避免重复动画
        this.pendingAppearDanmakuSigs.clear();
        this.pendingAppearGiftSigs.clear();
      } catch (e) {
        console.warn('[Live App] Staggered-appear failed:', e);
      }
    }

    /** 依次为节点添加 appear-init → appear-show（带间隔） */
    sequentialReveal(nodes) {
      if (!nodes || nodes.length === 0) return;

      // 初始状态（先隐藏，避免"jump"），随后统一交由 CSS 过渡
      nodes.forEach(el => {
        el.classList.remove('need-appear', 'appear-show');
        el.classList.add('appear-init');
        // 使用 display:none 避免占位
        el.style.display = 'none';
      });

      // 逐条显示：每条约 700ms 一条（更慢），单条过渡 ~300ms（参见CSS）
      const baseDelay = 150;
      const stepDelay = 700; // ≈ 0.7 秒/条
      nodes.forEach((el, idx) => {
        setTimeout(() => {
          // 显示并触发过渡
          el.style.display = '';
          // 强制触发一次 reflow，保证过渡生效
          // eslint-disable-next-line no-unused-expressions
          el.offsetHeight;
          el.classList.add('appear-show');
          // 每条出现后，若容器存在则将其滚动到可见底部（瞬时，无动画）
          const container = document.getElementById('danmaku-container');
          if (container && el?.scrollIntoView) {
            el.scrollIntoView({ block: 'end', inline: 'nearest' });
          }
        }, baseDelay + idx * stepDelay);
      });
    }

    async debouncedSave() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }

      this.saveTimeout = setTimeout(async () => {
        await this.saveChatData();
        this.saveTimeout = null;
      }, this.saveDebounceMs);
    }
  }

  // 创建全局实例
  window.WatchLiveApp = WatchLiveApp;
  window.watchLiveApp = new WatchLiveApp();
} // 结束类定义检查

// 全局函数供调用
window.getWatchLiveAppContent = function () {
  console.log('[Watch Live App] Get Watch Live content');

  if (!window.watchLiveApp) {
    console.error('[Watch Live App] watchLiveApp instance missing');
    return '<div class="error-message">Watch Live failed to load</div>';
  }

  try {
    // 每次获取内容时都重新检测活跃直播状态
    window.watchLiveApp.detectActiveLive();
    return window.watchLiveApp.getAppContent();
  } catch (error) {
    console.error('[Watch Live App] getAppContent failed:', error);
    return '<div class="error-message">Watch Live content failed to load</div>';
  }
};

window.bindWatchLiveAppEvents = function () {
  console.log('[Watch Live App] Bind Watch Live events');

  if (!window.watchLiveApp) {
    console.error('[Watch Live App] watchLiveApp instance missing');
    return;
  }

  try {
    // 延迟绑定，确保DOM完全加载
    setTimeout(() => {
      window.watchLiveApp.bindEvents();
      window.watchLiveApp.updateHeader();
    }, 100);
  } catch (error) {
    console.error('[Watch Live App] Bind events failed:', error);
  }
};

// 其他全局函数
window.watchLiveAppEndLive = function () {
  if (window.watchLiveApp) {
    window.watchLiveApp.endLive();
  }
};

window.watchLiveAppShowModal = function (modalId) {
  if (window.watchLiveApp) {
    window.watchLiveApp.showModal(modalId);
  }
};

window.watchLiveAppHideModal = function (modalId) {
  if (window.watchLiveApp) {
    window.watchLiveApp.hideModal(modalId);
  }
};

window.watchLiveAppDestroy = function () {
  if (window.watchLiveApp) {
    window.watchLiveApp.destroy();
    console.log('[Watch Live App] App destroyed');
  }
};

window.watchLiveAppDetectActive = function () {
  if (window.watchLiveApp) {
    console.log('[Watch Live App] 🔍 Manual active-live detect...');
    window.watchLiveApp.detectActiveLive();

    // Refresh UI
    if (typeof window.bindWatchLiveAppEvents === 'function') {
      window.bindWatchLiveAppEvents();
    }

    console.log('[Watch Live App] ✅ Detect done, state:', {
      view: window.watchLiveApp.currentView,
      isLiveActive: window.watchLiveApp.isLiveActive,
    });
  } else {
    console.error('[Watch Live App] watchLiveApp instance missing');
  }
};

window.watchLiveAppForceReload = function () {
  console.log('[Watch Live App] 🔄 Force-reloading...');

  // 先销毁旧实例
  if (window.watchLiveApp) {
    window.watchLiveApp.destroy();
  }

  // 创建新实例
  window.watchLiveApp = new WatchLiveApp();
  console.log('[Watch Live App] ✅ App reloaded');
};

// 测试转换功能
window.watchLiveAppTestConversion = function () {
  console.log('[Watch Live App] 🧪 Testing conversion...');

  if (!window.watchLiveApp) {
    console.error('[Watch Live App] watchLiveApp instance missing');
    return;
  }

  const testContent = `这是一条测试消息
[直播|小明|弹幕|主播你好！今天吃的什么呀？]
[直播|小红|礼物|Brilliant Rocket*2]
[直播|推荐互动|回答小明的弹幕问题]
[直播|推荐互动|感谢小红的礼物]
[直播|本场人数|55535]
[直播|直播内容|你微笑着调整了一下耳机，准备开始今天的杂谈直播。]
测试结束`;

  console.log('Original text:', testContent);
  const converted = window.watchLiveApp.convertLiveFormats(testContent);
  console.log('Converted text:', converted);

  return converted;
};

// 测试布局高度
window.watchLiveAppTestLayout = function () {
  console.log('[Watch Live App] 📐 Testing layout heights...');

  const appContent = document.getElementById('app-content');
  if (!appContent) {
    console.error('[Watch Live App] app-content missing');
    return;
  }

  const liveContainer = appContent.querySelector('.live-container');
  if (!liveContainer) {
    console.error('[Live App] live-container missing');
    return;
  }

  const videoBox = liveContainer.querySelector('.video-placeholder');
  const interactionPanel = liveContainer.querySelector('.interaction-panel');
  const danmakuContainer = liveContainer.querySelector('.danmaku-container');

  const measurements = {
    appContent: {
      height: appContent.offsetHeight,
      scrollHeight: appContent.scrollHeight,
      clientHeight: appContent.clientHeight,
    },
    liveContainer: {
      height: liveContainer.offsetHeight,
      scrollHeight: liveContainer.scrollHeight,
      clientHeight: liveContainer.clientHeight,
    },
    videoBox: videoBox
      ? {
          height: videoBox.offsetHeight,
          scrollHeight: videoBox.scrollHeight,
          clientHeight: videoBox.clientHeight,
        }
      : null,
    interactionPanel: interactionPanel
      ? {
          height: interactionPanel.offsetHeight,
          scrollHeight: interactionPanel.scrollHeight,
          clientHeight: interactionPanel.clientHeight,
        }
      : null,
    danmakuContainer: danmakuContainer
      ? {
          height: danmakuContainer.offsetHeight,
          scrollHeight: danmakuContainer.scrollHeight,
          clientHeight: danmakuContainer.clientHeight,
        }
      : null,
  };

  console.log('[Live App] 📐 Layout measurements:', measurements);

  // 检查是否有溢出
  const hasOverflow = measurements.liveContainer.scrollHeight > measurements.liveContainer.clientHeight;
  const danmakuCanScroll =
    measurements.danmakuContainer &&
    measurements.danmakuContainer.scrollHeight > measurements.danmakuContainer.clientHeight;

  console.log('[Watch Live App] 📐 Layout check:');
  console.log(`- container overflow: ${hasOverflow ? '❌ yes' : '✅ no'}`);
  console.log(`- danmaku scrollable: ${danmakuCanScroll ? '✅ yes' : '❌ no'}`);

  return measurements;
};

// 测试函数
window.watchLiveAppTest = function () {
  console.log('[Watch Live App] 🧪 Starting Watch Live tests...');

  const tests = [
    {
      name: 'WatchLiveApp class exists',
      test: () => typeof window.WatchLiveApp === 'function',
    },
    {
      name: 'watchLiveApp instance exists',
      test: () => window.watchLiveApp instanceof window.WatchLiveApp,
    },
    {
      name: 'Global helpers exist',
      test: () =>
        typeof window.getWatchLiveAppContent === 'function' && typeof window.bindWatchLiveAppEvents === 'function',
    },
    {
      name: 'Data parser',
      test: () => {
        const parser = new window.WatchLiveApp().dataParser;
        const testData = parser.parseLiveData('[直播|本场人数|1234][直播|直播内容|test content][直播|user1|弹幕|test chat]');
        return (
          testData.viewerCount === '1.2K' && testData.liveContent === 'test content' && testData.danmakuList.length === 1
        );
      },
    },
    {
      name: 'App content generates',
      test: () => {
        const content = window.getWatchLiveAppContent();
        return typeof content === 'string' && content.includes('live-app');
      },
    },
    {
      name: 'Active-live detection',
      test: () => {
        const app = new window.WatchLiveApp();
        const testContent1 = '[直播|本场人数|1234][直播|直播内容|test content]';
        const testContent2 = '[直播历史|本场人数|1234][直播历史|直播内容|test content]';
        const testContent3 = 'Plain chat with no 直播内容';

        return (
          app.hasActiveLiveFormats(testContent1) === true &&
          app.hasActiveLiveFormats(testContent2) === false &&
          app.hasActiveLiveFormats(testContent3) === false
        );
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      const result = test.test();
      if (result) {
        console.log(`✅ ${test.name}: pass`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: fail`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: error - ${error.message}`);
      failed++;
    }
  });

  console.log(`[Watch Live App] 🧪 Tests done: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('[Watch Live App] 🎉 All tests passed');
  } else {
    console.log('[Watch Live App] ⚠️ Some tests failed');
  }

  return { passed, failed, total: tests.length };
};

console.log('[Watch Live App] Watch Live module loaded');
console.log('[Watch Live App] 💡 Helpers:');
console.log('[Watch Live App] - watchLiveAppTest() run tests');
console.log('[Watch Live App] - watchLiveAppTestConversion() test format conversion');
console.log('[Watch Live App] - watchLiveAppTestLayout() layout heights');
console.log('[Watch Live App] - watchLiveAppDetectActive() detect active live');
console.log('[Watch Live App] - watchLiveAppForceReload() force reload');
