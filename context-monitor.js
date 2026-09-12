
window.normalizePhoneProtocol = window.normalizePhoneProtocol || function normalizePhoneProtocol(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/\[(?:Live)\|(?:viewers?|viewerCount|view count)\|/gi, '[直播|本场人数|')
    .replace(/\[(?:Live)\|(?:content|title|stream)\|/gi, '[直播|直播内容|')
    .replace(/\[(?:Live)\|([^\]|]+)\|(?:chat|danmaku|comment)\|/gi, '[直播|$1|弹幕|')
    .replace(/\[(?:Live)\|([^\]|]+)\|(?:tip|gift|donate)\|/gi, '[直播|$1|打赏|')
    .replace(/\[(?:Live)\|(?:suggest(?:ed)?|prompt|cta)\|/gi, '[直播|推荐互动|')
    .replace(/\[(?:TheirMessage|OtherMessage|Reply|Incoming)\|/gi, '[对方消息|')
    .replace(/\[(?:MyMessage|Outgoing)\|/gi, '[我方消息|')
    .replace(/\[(?:GroupMessage|GroupChat)\|/gi, '[群聊消息|')
    .replace(/\[(?:MyGroupMessage)\|/gi, '[我方群聊消息|')
    .replace(/\[(?:FriendId|Friend)\|/gi, '[好友id|')
    .replace(/\[(对方消息|我方消息|群聊消息|我方群聊消息)\|([^|\]]+)\|([^|\]]+)\|(?:text|txt)\|/gi, '[$1|$2|$3|文字|')
    .replace(/\[(对方消息|我方消息|群聊消息|我方群聊消息)\|([^|\]]+)\|([^|\]]+)\|(?:sticker|emoji)\|/gi, '[$1|$2|$3|表情包|')
    .replace(/\[(对方消息|我方消息|群聊消息|我方群聊消息)\|([^|\]]+)\|([^|\]]+)\|(?:voice|audio)\|/gi, '[$1|$2|$3|语音|')
    .replace(/\[(对方消息|我方消息|群聊消息|我方群聊消息)\|([^|\]]+)\|([^|\]]+)\|(?:redpack|redpacket|hongbao)\|/gi, '[$1|$2|$3|红包|');
};

window.contentForPhoneParse = window.contentForPhoneParse || function contentForPhoneParse(text) {
  const norm = window.normalizePhoneProtocol(text);
  const stripped = norm.replace(/<think>[\s\S]*?<\/think>|<thinking>[\s\S]*?<\/thinking>/gi, '');
  if (/\[[^\]]+\|/.test(stripped)) return stripped;
  return norm;
};

/**
 * Live App - Live app
 * Same pattern as task-app.js — live UI for mobile-phone.js
 * Watch ST context, parse live tags, show danmaku and interactions
 */

// @ts-nocheck
// Avoid redefining
if (typeof window.LiveApp === 'undefined') {
  /**
   * Live event listener
   * Listen for ST message events and trigger parse
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
        // Checking SillyTavern APIs
        console.log('[Live App] Checking SillyTavern APIs:', {
          'window.SillyTavern': !!window?.SillyTavern,
          'window.SillyTavern.getContext': typeof window?.SillyTavern?.getContext,
          eventOn: typeof eventOn,
          tavern_events: typeof tavern_events,
          mobileContextEditor: !!window?.mobileContextEditor,
        });

        // 方法1: PreferSillyTavern.getContext().eventSource（preferred in iframe）
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

        // 方法2: 尝试使用全局eventOn函数（if present）
        if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined' && tavern_events.MESSAGE_RECEIVED) {
          console.log('[Live App] Listening MESSAGE_RECEIVED via eventOn');
          eventOn(tavern_events.MESSAGE_RECEIVED, this.messageReceivedHandler);
          this.isListening = true;
          console.log('[Live App] ✅ Listening (eventOn)');
          this.updateMessageCount();
          return;
        }

        // 方法3: Try parent windoweventSource
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

        // If every method fails，使用轮询fallback方案
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
        console.log(`[Live App] 🎯 MESSAGE_RECEIVED id: ${messageId}`);

        // Check whether live is active
        if (!this.liveApp || !this.liveApp.isLiveActive) {
          console.log('[Live App] Live inactive — skip');
          return;
        }

        // Check for new messages
        const currentMessageCount = this.getCurrentMessageCount();
        console.log(`[Live App] Message count now=${currentMessageCount}, 上次=${this.lastMessageCount}`);

        if (currentMessageCount <= this.lastMessageCount) {
          console.log('[Live App] No new message — skip parse');
          return;
        }

        console.log(`[Live App] ✅ New messages ${this.lastMessageCount} 增加到 ${currentMessageCount}`);
        this.lastMessageCount = currentMessageCount;

        // Kick off parse
        console.log('[Live App] Parsing new live data...');
        await this.liveApp.parseNewLiveData();
      } catch (error) {
        console.error('[Live App] MESSAGE_RECEIVED handler failed:', error);
      }
    }

    /**
     * Current message count
     */
    getCurrentMessageCount() {
      try {
        // 方法1: 使用SillyTavern.getContext().chat（correct API）
        if (
          typeof window !== 'undefined' &&
          window.SillyTavern &&
          typeof window.SillyTavern.getContext === 'function'
        ) {
          const context = window.SillyTavern.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const count = context.chat.length;
            console.log(`[Live App] SillyTavern.getContext().chat has ${count} 条消息`);
            return count;
          }
        }

        // 方法2: 使用mobileContextEditorfallback
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor && typeof mobileContextEditor.getCurrentChatData === 'function') {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && Array.isArray(chatData.messages)) {
            console.log(`[Live App] mobileContextEditor returned ${chatData.messages.length} 条消息`);
            return chatData.messages.length;
          }
        }

        // 方法3: parent chat
        if (typeof window !== 'undefined' && window.parent && window.parent.chat && Array.isArray(window.parent.chat)) {
          const count = window.parent.chat.length;
          console.log(`[Live App] Parent chat has ${count} 条消息`);
          return count;
        }

        // 方法4: 使用getContext()方法（if present）
        if (typeof window !== 'undefined' && window.getContext && typeof window.getContext === 'function') {
          const context = window.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const count = context.chat.length;
            console.log(`[Live App] getContext() chat has ${count} 条消息`);
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
        viewerCount: /\[(?:直播|Live)\|(?:本场人数|viewers?|viewerCount)\|([^\]]+)\]/gi,
        liveContent: /\[(?:直播|Live)\|(?:直播内容|content|title)\|([^\]]+)\]/gi,
        normalDanmaku: /\[(?:直播|Live)\|([^\|]+)\|(?:弹幕|chat|danmaku)\|([^\]]+)\]/gi,
        giftDanmaku: /\[(?:直播|Live)\|([^\|]+)\|(?:打赏|礼物|tip|gift)\|([^\]]+)\]/gi,
        recommendedInteraction: /\[(?:直播|Live)\|(?:推荐互动|suggest(?:ed)?|prompt)\|([^\]]+)\]/gi,
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
      content = window.contentForPhoneParse(content);

      // 1. Parse viewer count
      liveData.viewerCount = this.parseViewerCount(content);

      // 2. Parse live content
      liveData.liveContent = this.parseLiveContent(content);

      // 3. Parse all danmaku in source order
      const { danmakuList, giftList } = this.parseAllDanmaku(content);
      liveData.danmakuList = danmakuList;
      liveData.giftList = giftList;

      // 5. Parse recommended interactions
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
     * Parse live content
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
     * Parse recommended interactions
     */
    parseRecommendedInteractions(content) {
      const interactions = [];
      const matches = [...content.matchAll(this.patterns.recommendedInteraction)];

      console.log(`[Live App] Rec parse: ${matches.length}  matches`);

      // Keep the last 4 matches (newest recs)
      const recentMatches = matches.slice(-4);
      console.log(`[Live App] Using latest ${recentMatches.length}  recs`);

      recentMatches.forEach((match, index) => {
        const interactionContent = match[1].trim();
        console.log(`[Live App] 推荐互动 ${index + 1}: "${interactionContent}"`);
        if (!interactions.includes(interactionContent)) {
          interactions.push(interactionContent);
        }
      });

      console.log(`[Live App] Final rec list:`, interactions);
      return interactions;
    }

    /**
     * Get chat text
     */
    getChatContent() {
      try {
        // 方法1: 使用SillyTavern.getContext().chat（correct API）
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
              console.log(`[Live App] SillyTavern.getContext().chat has聊天内容，长度: ${content.length}`);
              return content;
            }
          }
        }

        // 方法2: 使用mobileContextEditorfallback
        const mobileContextEditor = window['mobileContextEditor'];
        if (mobileContextEditor && typeof mobileContextEditor.getCurrentChatData === 'function') {
          const chatData = mobileContextEditor.getCurrentChatData();
          if (chatData && chatData.messages && Array.isArray(chatData.messages)) {
            const content = chatData.messages.map(msg => msg.mes || '').join('\n');
            console.log(`[Live App] mobileContextEditor chat text length: ${content.length}`);
            return content;
          }
        }

        // 方法3: parent chat
        if (typeof window !== 'undefined' && window.parent && window.parent.chat && Array.isArray(window.parent.chat)) {
          const messages = window.parent.chat;
          if (messages && messages.length > 0) {
            const content = messages.map(msg => msg.mes || '').join('\n');
            console.log(`[Live App] Parent chat has聊天内容，长度: ${content.length}`);
            return content;
          }
        }

        // 方法4: 使用getContext()方法（if present）
        if (typeof window !== 'undefined' && window.getContext && typeof window.getContext === 'function') {
          const context = window.getContext();
          if (context && context.chat && Array.isArray(context.chat)) {
            const messages = context.chat;
            if (messages && messages.length > 0) {
              const content = messages.map(msg => msg.mes || '').join('\n');
              console.log(`[Live App] getContext() chat has聊天内容，长度: ${content.length}`);
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

      // Live content — latest only
      if (liveData.liveContent && liveData.liveContent.trim() !== '') {
        this.currentLiveContent = liveData.liveContent;
        console.log(`[Live App] Updated live content: ${this.currentLiveContent.substring(0, 50)}...`);
      }

      // Recs — latest only
      if (liveData.recommendedInteractions && liveData.recommendedInteractions.length > 0) {
        this.recommendedInteractions = liveData.recommendedInteractions;
        console.log(`[Live App] Updated recs: ${this.recommendedInteractions.length} 个`);
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
          console.log(`[Live App] 添加 ${newDanmaku.length}  danmaku, total ${this.danmakuList.length} 条`);

          // No danmaku cap — keep history
          console.log(`[Live App] Keeping all danmaku, total: ${this.danmakuList.length}`);
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
          console.log(`[Live App] 添加 ${newGifts.length}  gifts, total ${this.giftList.length}`);
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
      console.log('[Live App] Cleared all live data');
    }
  }

  /**
   * LiveApp main class
   * Orchestrates modules behind one API
   */
  class LiveApp {
    constructor() {
      this.eventListener = new LiveEventListener(this);
      this.dataParser = new LiveDataParser();
      this.stateManager = new LiveStateManager();
      this.currentView = 'start'; // 'start', 'live'
      this.isInitialized = false;
      this.lastRenderTime = 0;
      this.renderCooldown = 500; // render cooldown
      this.scrollTimeout = null; // scroll debounce timer
      this.typingTimer = null; // live-content typing timer
      this.isTyping = false; // typing effect active
      this.pendingAppearDanmakuSigs = new Set(); // danmaku sigs pending appear
      this.pendingAppearGiftSigs = new Set(); // gift sigs pending appear

      this.init();
    }

    /**
     * 初始化应用
     */
    init() {
      console.log('[Live App] Live app初始化开始');

      // Detect active live data
      this.detectActiveLive();

      this.isInitialized = true;
      console.log('[Live App] Live app ready');
    }

    /**
     * Detect active live data
     */
    detectActiveLive() {
      try {
        console.log('[Live App] Detecting active live data...');

        // Get chat text
        const chatContent = this.dataParser.getChatContent();
        if (!chatContent) {
          console.log('[Live App] 没有聊天内容，保持Start live状态');
          return;
        }

        // Check for active live tags（非历史格式）
        const hasActiveLive = this.hasActiveLiveFormats(chatContent);

        if (hasActiveLive) {
          console.log('[Live App] 🎯 Active live data found，Auto-enter live view');

          // Set live view
          this.stateManager.startLive();
          this.currentView = 'live';

          // Parse and load existing live data
          const liveData = this.dataParser.parseLiveData(chatContent);
          this.stateManager.updateLiveData(liveData);

          // Start listening for new messages
          this.eventListener.startListening();

          console.log('[Live App] ✅ Restored live state，数据:', {
            viewerCount: this.stateManager.currentViewerCount,
            liveContent: this.stateManager.currentLiveContent
              ? this.stateManager.currentLiveContent.substring(0, 50) + '...'
              : '',
            danmakuCount: this.stateManager.danmakuList.length,
            giftCount: this.stateManager.giftList.length,
            interactionCount: this.stateManager.recommendedInteractions.length,
          });
        } else {
          console.log('[Live App] No active live data，保持Start live状态');
        }
      } catch (error) {
        console.error('[Live App] Active-live detect failed:', error);
      }
    }

    /**
     * Check for active live tags
     */
    hasActiveLiveFormats(content) {
      if (!content || typeof content !== 'string') {
        return false;
      }

      // Any active (non-history) live tags?
      const activeLivePatterns = [
        /\[(?:直播|Live)\|(?:本场人数|viewers?|viewerCount)\|[^\]]+\]/i,
        /\[(?:直播|Live)\|(?:直播内容|content|title)\|[^\]]+\]/i,
        /\[(?:直播|Live)\|[^|]+\|(?:弹幕|chat|danmaku)\|[^\]]+\]/i,
        /\[(?:直播|Live)\|[^|]+\|(?:打赏|礼物|tip|gift)\|[^\]]+\]/i,
        /\[(?:直播|Live)\|(?:推荐互动|suggest(?:ed)?|prompt)\|[^\]]+\]/i,
      ];

      for (const pattern of activeLivePatterns) {
        if (pattern.test(content)) {
          console.log('[Live App] Found an active live tag:', pattern.toString());
          return true;
        }
      }

      return false;
    }

    /**
     * 获取直播状态
     */
    get isLiveActive() {
      return this.stateManager.isLiveActive;
    }

    /**
     * Start live
     * @param {string} initialInteraction - opening line
     */
    async startLive(initialInteraction) {
      try {
        console.log('[Live App] Start live，初始互动:', initialInteraction);

        // 更新状态
        this.stateManager.startLive();
        this.currentView = 'live';

        // 开始监听事件
        this.eventListener.startListening();

        // 发送Start live消息到SillyTavern
        const message = `用户开始直播，初始互动为（${initialInteraction}），请按照正确的直播格式要求生成本场人数，直播内容，弹幕，打赏和推荐互动。此次回复内仅生成一次本场人数和直播内容格式，直播内容需要简洁。最后需要生成四条推荐互动。禁止使用错误格式。
[直播|{{user}}|弹幕|${initialInteraction}]`;

        this.appendLocalUserChat(initialInteraction);
        await this.sendToSillyTavern(message);

        // 更新界面
        this.updateAppContent();

        console.log('[Live App] Live started');
      } catch (error) {
        console.error('[Live App] Start live失败:', error);
        this.showToast('Could not go live: ' + error.message, 'error');
      }
    }

    /**
     * End live
     */
    async endLive() {
      try {
        console.log('[Live App] End live');

        // Stop listening事件
        this.eventListener.stopListening();

        // Convert live tags to history tags
        await this.convertLiveToHistory();

        // 更新状态
        this.stateManager.endLive();
        this.currentView = 'start';

        // 更新界面
        this.updateAppContent();

        this.showToast('Stream ended', 'success');
        console.log('[Live App] 直播已结束');
      } catch (error) {
        console.error('[Live App] End live失败:', error);
        this.showToast('Could not end stream: ' + error.message, 'error');
      }
    }

    /**
     * 继续直播互动
     * @param {string} interaction - 互动内容
     */
    async continueInteraction(interaction) {
      try {
        console.log('[Live App] 继续直播互动:', interaction);

        if (!this.isLiveActive) {
          console.warn('[Live App] 直播未激活，无法继续互动');
          return;
        }

        // Send continue-live message toSillyTavern
        const message = `用户继续直播，互动为（${interaction}），请按照正确的直播格式要求生成本场人数，直播内容，弹幕，打赏和推荐互动。此次回复内仅生成一次本场人数和直播内容格式，直播内容需要简洁。最后需要生成四条推荐互动。禁止使用错误格式。
[直播|{{user}}|弹幕|${interaction}]`;

        this.appendLocalUserChat(interaction);
        await this.sendToSillyTavern(message);

        console.log('[Live App] Interaction sent');
      } catch (error) {
        console.error('[Live App] Continue interaction failed:', error);
        this.showToast('Could not send chat: ' + error.message, 'error');
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

        // 双通道：Snapshot existing chat signatures before update，用于识别"真正新增"
        const existingDanmakuSigs = new Set(
          (this.stateManager.danmakuList || []).map(item => this.createDanmakuSignature(item)),
        );

        // 单独解析"最新楼层"的内容（animation only）
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

        // 更新状态
        this.stateManager.updateLiveData(liveData);

        // Only latest-floor new chat/gifts get the appear animation
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

        // 更新界面（带防抖）
        this.updateAppContentDebounced();

        // If new chat arrived, jump-to-bottom after refresh
        setTimeout(() => {
          // Hide nodes that will animate in，do not scroll to empty space
          this.runAppearSequence();
          const danmakuContainer = document.getElementById('danmaku-container');
          if (danmakuContainer) {
            this.jumpToBottomIfNeeded(danmakuContainer);
          }
        }, 30);
      } catch (error) {
        console.error('[Live App] Parse live data失败:', error);
      }
    }

    /**
     * Debounced UI refresh
     */
    updateAppContentDebounced() {
      const currentTime = Date.now();
      if (currentTime - this.lastRenderTime < this.renderCooldown) {
        return;
      }

      this.lastRenderTime = currentTime;
      this.updateAppContent();
      this.updateHeader(); // 同时更新header
    }

    /**
     * 更新应用内容
     */
    updateAppContent() {
      const content = this.getAppContent();
      const appElement = document.getElementById('app-content');
      if (appElement) {
        appElement.innerHTML = content;
        // Delay bind until DOM is ready
        setTimeout(() => {
          this.bindEvents();
          this.updateHeader(); // 确保header也被更新
          // Start live-content typing after render
          if (this.currentView === 'live') {
            const state = this.stateManager.getCurrentState();
            const liveContentEl = document.querySelector('.live-content-text');
            if (liveContentEl) {
              this.applyTypingEffect(liveContentEl, state.liveContent || '');
            }
            // After render, run staggered appear (avoid dropped frames)
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
        case 'live':
          return this.renderLiveView();
        default:
          return this.renderStartView();
      }
    }

    /**
     * 渲染Start live界面
     */
    renderStartView() {
      return `
        <div class="live-app">
          <div class="live-main-container">
            <div class="live-main-header">
              <h2>Live</h2>
              <p>Go live or watch a stream</p>
            </div>

            <div class="live-options">
              <div class="live-option-card" id="start-streaming-option">
                <div class="option-icon">🎥</div>
                <div class="option-content">
                  <h3>Go Live</h3>
                  <p>Start streaming</p>
                </div>
                <div class="option-arrow">→</div>
              </div>

              <div class="live-option-card" id="watch-streaming-option">
                <div class="option-icon">📺</div>
                <div class="option-content">
                  <h3>Watch Live</h3>
                  <p>Watch other streamers</p>
                </div>
                <div class="option-arrow">→</div>
              </div>
            </div>
          </div>

          <!-- Start-live modal -->
          <div class="modal" id="start-live-modal" style="display: none;">
            <div class="modal-content">
              <div class="modal-header">
                <h3>Start stream</h3>
                <button class="modal-close-btn">&times;</button>
              </div>
              <div class="modal-body">
                <div class="custom-interaction-section">
                  <textarea
                    id="custom-interaction-input"
                    placeholder="What do you want to say..."
                    rows="3"
                  ></textarea>
                </div>

                <div class="preset-interactions">
                  <h4>Presets</h4>
                  <div class="preset-buttons">
                    <button class="preset-btn" data-interaction="Say hi to chat">
                      👋 Say hi to chat
                    </button>
                    <button class="preset-btn" data-interaction="Share how today feels">
                      😊 Share how today feels
                    </button>
                    <button class="preset-btn" data-interaction="Tell a recent story">
                      💬 Tell a recent story
                    </button>
                    <button class="preset-btn" data-interaction="Sing a song">
                      🎵 Sing a song
                    </button>
                  </div>
                </div>

                <button class="start-live-btn" id="start-custom-live">
                  Go Live
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Render live view
     */
    renderLiveView() {
      const state = this.stateManager.getCurrentState();

      // 渲染Suggested-chat buttons
      const recommendedButtons = state.recommendedInteractions
        .map(interaction => `<button class="rec-btn" data-interaction="${interaction}">${interaction}</button>`)
        .join('');

      // Render chat list
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
              <p class="live-content-text">${state.liveContent || 'Waiting for stream...'}</p>
              <div class="live-status-bottom">
                <div class="live-dot"></div>
                <span>LIVE</span>
              </div>
            </div>

            <!-- 推荐互动 -->
            <div class="interaction-panel">
              <div class="interaction-header">
                <h4>Suggested:</h4>
                <button class="interact-btn" id="custom-interact-btn">
                  <i class="fas fa-pen-nib"></i> Custom chat
                </button>
              </div>
              <div class="recommended-interactions">
                ${recommendedButtons || '<p class="no-interactions">Waiting for suggestions...</p>'}
              </div>
            </div>

            <!-- Chat container -->
            <div class="danmaku-container" id="danmaku-container">
              <div class="danmaku-list" id="danmaku-list">
                ${danmakuItems || '<div class="no-danmaku">Waiting for chat...</div>'}
              </div>
            </div>
          </div>

          <!-- Custom chat弹窗 -->
          <div id="interaction-modal" class="modal">
            <div class="modal-content">
              <div class="modal-header">
                <h3>Custom chat</h3>
                <button class="modal-close-btn">&times;</button>
              </div>
              <form id="interaction-form">
                <textarea id="custom-interaction-textarea" placeholder="Type what you want to say..." rows="4"></textarea>
                <button type="submit" class="submit-btn">发送</button>
              </form>
            </div>
          </div>

          <!-- 礼物列表弹窗 -->
          <div id="gift-modal" class="modal">
            <div class="modal-content">
              <div class="modal-header">
                <h3>礼物流水</h3>
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
                      }</span>送出 <span class="gift-name">${gift.gift}</span></li>`;
                    })
                    .join('') || '<li class="no-gifts">暂无礼物</li>'
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
      console.log('[Live App] 绑定事件...');

      const appContainer = document.getElementById('app-content');
      if (!appContainer) {
        console.error('[Live App] App container missing');
        return;
      }

      try {
        // Start live相关事件
        if (this.currentView === 'start') {
          // Go Live card
          const startStreamingOption = appContainer.querySelector('#start-streaming-option');
          if (startStreamingOption) {
            startStreamingOption.addEventListener('click', async () => {
              // 直接显示弹窗，不设置渲染权
              this.showModal('start-live-modal');
            });
          }

          // Watch Live card
          const watchStreamingOption = appContainer.querySelector('#watch-streaming-option');
          if (watchStreamingOption) {
            watchStreamingOption.addEventListener('click', async () => {
              // Jump straight to Watch LiveLive app，不设置渲染权
              if (window.mobilePhone && window.mobilePhone.openApp) {
                window.mobilePhone.openApp('watch-live');
              }
            });
          }

          // 自定义Start live按钮（在弹窗中）
          const customStartBtn = appContainer.querySelector('#start-custom-live');
          if (customStartBtn) {
            customStartBtn.addEventListener('click', () => {
              const input = appContainer.querySelector('#custom-interaction-input');
              const interaction = input ? input.value.trim() : '';
              if (interaction) {
                this.hideModal('start-live-modal');
                this.startLive(interaction);
              } else {
                this.showToast('Enter something to say', 'warning');
              }
            });
          }

          // 预设互动按钮（在弹窗中）
          appContainer.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const interaction = btn.dataset.interaction;
              if (interaction) {
                this.hideModal('start-live-modal');
                this.startLive(interaction);
              }
            });
          });
        }

        // Live-session events
        if (this.currentView === 'live') {
          // Suggested-chat buttons
          appContainer.querySelectorAll('.rec-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const interaction = btn.dataset.interaction;
              if (interaction) {
                this.continueInteraction(interaction);
              }
            });
          });

          // Custom chat按钮
          const customInteractBtn = appContainer.querySelector('#custom-interact-btn');
          if (customInteractBtn) {
            customInteractBtn.addEventListener('click', () => {
              this.showModal('interaction-modal');
            });
          }

          // Custom chat表单
          const interactionForm = appContainer.querySelector('#interaction-form');
          if (interactionForm) {
            interactionForm.addEventListener('submit', e => {
              e.preventDefault();
              const textarea = appContainer.querySelector('#custom-interaction-textarea');
              const interaction = textarea ? textarea.value.trim() : '';
              if (interaction) {
                this.continueInteraction(interaction);
                textarea.value = '';
                this.hideAllModals();
              } else {
                this.showToast('Enter something to say', 'warning');
              }
            });
          }

          // Auto-stick chat to bottom (instant, only when not already there)
          const danmakuContainer = appContainer.querySelector('#danmaku-container');
          if (danmakuContainer) {
            this.jumpToBottomIfNeeded(danmakuContainer);
          }
        }

        // 弹窗关闭按钮（all views）
        appContainer.querySelectorAll('.modal-close-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            this.hideAllModals();
          });
        });

        // Click backdrop to close（all views）
        appContainer.querySelectorAll('.modal').forEach(modal => {
          modal.addEventListener('click', e => {
            if (e.target === modal) {
              this.hideAllModals();
            }
          });
        });

        console.log('[Live App] 事件绑定完成');
      } catch (error) {
        console.error('[Live App] Event bind failed:', error);
        this.showToast('事件绑定失败: ' + error.message, 'error');
      }
    }

    // Stay put if already near the bottom；If not at bottom, jump there instantly
    jumpToBottomIfNeeded(container) {
      const threshold = 10; // px threshold
      const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      if (distanceToBottom > threshold) {
        // 瞬间跳转，无动画
        container.scrollTop = container.scrollHeight;
      }
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
     * Hide modal
     */
    hideModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    }

    /**
     * 隐藏所有弹窗
     */
    hideAllModals() {
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('active');
      });
    }

    /**
     * 设置渲染权
     */
    async setRenderingRight(type) {
      try {
        console.log(`[Live App] 设置渲染权为: ${type}`);

        if (!window.mobileContextEditor) {
          console.warn('[Live App] Context editor not ready，Cannot set render-right');
          return false;
        }

        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          console.warn('[Live App] 无聊天数据，Cannot set render-right');
          return false;
        }

        const firstMessage = chatData.messages[0];
        let originalContent = firstMessage.mes || '';

        // Check whether a render-right marker already exists
        const renderingRightRegex = /<!-- LIVE_RENDERING_RIGHT_START -->([\s\S]*?)<!-- LIVE_RENDERING_RIGHT_END -->/;
        const renderingRightSection = `<!-- LIVE_RENDERING_RIGHT_START -->\n[直播渲染权: ${type}]\n<!-- LIVE_RENDERING_RIGHT_END -->`;

        if (renderingRightRegex.test(originalContent)) {
          // Update existing render-right marker
          originalContent = originalContent.replace(renderingRightRegex, renderingRightSection);
        } else {
          // Prepend render-right marker
          originalContent = renderingRightSection + '\n\n' + originalContent;
        }

        // 更新第1楼层
        const success = await window.mobileContextEditor.modifyMessage(0, originalContent);
        if (success) {
          console.log(`[Live App] ✅ Render-right set to: ${type}`);
          return true;
        } else {
          console.error('[Live App] setRenderingRight failed');
          return false;
        }
      } catch (error) {
        console.error('[Live App] setRenderingRight failed:', error);
        return false;
      }
    }

    /**
     * Get current render-right
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
        console.error('[Live App] getRenderingRight failed:', error);
        return null;
      }
    }

    /**
     * 清除渲染权
     */
    async clearRenderingRight() {
      try {
        console.log('[Live App] 清除渲染权');

        if (!window.mobileContextEditor) {
          console.warn('[Live App] Context editor not ready，Cannot clear render-right');
          return false;
        }

        const chatData = window.mobileContextEditor.getCurrentChatData();
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
          console.warn('[Live App] 无聊天数据，Cannot clear render-right');
          return false;
        }

        const firstMessage = chatData.messages[0];
        let originalContent = firstMessage.mes || '';

        // Remove render-right marker
        const renderingRightRegex =
          /<!-- LIVE_RENDERING_RIGHT_START -->([\s\S]*?)<!-- LIVE_RENDERING_RIGHT_END -->\s*\n*/;
        if (renderingRightRegex.test(originalContent)) {
          originalContent = originalContent.replace(renderingRightRegex, '').trim();

          // 更新第1楼层
          const success = await window.mobileContextEditor.modifyMessage(0, originalContent);
          if (success) {
            console.log('[Live App] ✅ Render-right cleared');
            return true;
          } else {
            console.error('[Live App] clearRenderingRight failed');
            return false;
          }
        } else {
          console.log('[Live App] No render-right marker');
          return true;
        }
      } catch (error) {
        console.error('[Live App] clearRenderingRight failed:', error);
        return false;
      }
    }

    /**
     * 发送消息到SillyTavern
     */
    appendLocalUserChat(text) {
      try {
        if (!this.stateManager) return;
        const content = String(text || '').trim();
        if (!content) return;
        const item = {
          id: Date.now(),
          username: 'You',
          content,
          type: 'normal',
          timestamp: new Date().toLocaleString(),
        };
        const list = this.stateManager.danmakuList || [];
        const exists = list.some(d => d.username === item.username && d.content === item.content);
        if (!exists) this.stateManager.danmakuList = list.concat(item);
        if (typeof this.updateAppContent === 'function') this.updateAppContent();
      } catch (e) {
        console.warn('[Live App] local chat append failed:', e);
      }
    }

    async sendToSillyTavern(message) {
      try {
        const raw = message == null ? '' : String(message);
        if (!raw.trim() || raw.trim() === 'undefined') {
          console.error('[Live App] Refusing empty/undefined live prompt');
          throw new Error('Live prompt was empty (got undefined)');
        }

        const prefix =
          '[Live] Continue the current live / story. Do not restart Crossing or open a new prologue.\n\n';
        const packed = prefix + raw;
        console.log('[Live App] Sending to SillyTavern:', packed.slice(0, 400));

        const textarea = document.querySelector('#send_textarea');
        if (!textarea) {
          console.error('[Live App] Message box not found');
          throw new Error('Message box not found');
        }

        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (setter) setter.call(textarea, packed);
        else textarea.value = packed;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        textarea.focus();

        if (typeof window.mobileSendToSillyTavern === 'function') {
          const ok = await window.mobileSendToSillyTavern(packed);
          if (!ok) throw new Error('ST send helper failed');
          return true;
        }

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
     * Convert live tags to history tags
     */
    async convertLiveToHistory() {
      try {
        console.log('[Live App] Converting live tags to history tags');

        // Get current chat data
        const contextData = this.getChatData();
        if (!contextData || contextData.length === 0) {
          console.log('[Live App] No chat data');
          return;
        }

        // Find messages that contain live tags
        let hasLiveContent = false;
        let updatedCount = 0;
        const messagesToUpdate = []; // Collect messages to update

        // 第一遍：Collect messages that need conversion
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
          console.log('[Live App] No live content to convert');
          return;
        }

        // Pass 2: batch-update messages
        console.log(`[Live App] Batch-updating ${messagesToUpdate.length} 条消息`);

        // Temporarily disable autosave during the batch update
        const originalSaveChatDebounced = window.saveChatDebounced;
        const originalSaveChatConditional = window.saveChatConditional;

        // Temporarily replace with no-ops
        if (window.saveChatDebounced) {
          window.saveChatDebounced = () => {};
        }
        if (window.saveChatConditional) {
          window.saveChatConditional = () => Promise.resolve();
        }

        try {
          for (const messageUpdate of messagesToUpdate) {
            // Skip autosave during batch，避免频繁保存
            const success = await this.updateMessageContent(messageUpdate.index, messageUpdate.convertedContent, true);
            if (success) {
              updatedCount++;
              console.log(
                `[Live App] 已转换消息 ${messageUpdate.index}，原始长度: ${messageUpdate.originalContent.length}，转换后长度: ${messageUpdate.convertedContent.length}`,
              );
            }
          }
        } finally {
          // Restore original save functions
          if (originalSaveChatDebounced) {
            window.saveChatDebounced = originalSaveChatDebounced;
          }
          if (originalSaveChatConditional) {
            window.saveChatConditional = originalSaveChatConditional;
          }
        }

        console.log(`[Live App] Live-format conversion done, updated ${updatedCount} 条消息`);

        // Save chat once at the end，Avoid hitching from frequent saves
        if (updatedCount > 0) {
          await this.saveChatData();
          console.log('[Live App] 转换完成并已Save chat data');
        }
      } catch (error) {
        console.error('[Live App] Live-format conversion failed:', error);
        this.showToast('Live-format conversion failed: ' + error.message, 'error');
      }
    }

    /**
     * Convert live-format strings
     */
    convertLiveFormats(content) {
      let convertedContent = content;
      let conversionCount = 0;

      // Convert chat tags: [直播|用户|弹幕|content] -> [直播历史|用户|弹幕|content]
      const danmuMatches = convertedContent.match(/\[直播\|([^|]+)\|弹幕\|([^\]]+)\]/g);
      if (danmuMatches) {
        convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|弹幕\|([^\]]+)\]/g, '[直播历史|$1|弹幕|$2]');
        conversionCount += danmuMatches.length;
      }

      // Convert gift tags: [直播|用户|礼物|content] -> [直播历史|用户|礼物|content]
      // Convert tip tags: [直播|用户|打赏|content] -> [直播历史|用户|打赏|content]
      const giftMatches = convertedContent.match(/\[直播\|([^|]+)\|(?:礼物|打赏)\|([^\]]+)\]/g);
      if (giftMatches) {
        convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|礼物\|([^\]]+)\]/g, '[直播历史|$1|礼物|$2]');
        convertedContent = convertedContent.replace(/\[直播\|([^|]+)\|打赏\|([^\]]+)\]/g, '[直播历史|$1|打赏|$2]');
        conversionCount += giftMatches.length;
      }

      // Convert rec tags: [直播|推荐互动|content] -> [直播历史|推荐互动|content]
      const recommendMatches = convertedContent.match(/\[直播\|推荐互动\|([^\]]+)\]/g);
      if (recommendMatches) {
        convertedContent = convertedContent.replace(/\[直播\|推荐互动\|([^\]]+)\]/g, '[直播历史|推荐互动|$1]');
        conversionCount += recommendMatches.length;
      }

      // Convert viewer-count tags: [直播|本场人数|number] -> [直播历史|本场人数|number]
      const audienceMatches = convertedContent.match(/\[直播\|本场人数\|([^\]]+)\]/g);
      if (audienceMatches) {
        convertedContent = convertedContent.replace(/\[直播\|本场人数\|([^\]]+)\]/g, '[直播历史|本场人数|$1]');
        conversionCount += audienceMatches.length;
      }

      // Convert live-content tags: [直播|直播内容|content] -> [直播历史|直播内容|content]
      const contentMatches = convertedContent.match(/\[直播\|直播内容\|([^\]]+)\]/g);
      if (contentMatches) {
        convertedContent = convertedContent.replace(/\[直播\|直播内容\|([^\]]+)\]/g, '[直播历史|直播内容|$1]');
        conversionCount += contentMatches.length;
      }

      // Convert any remaining live tags (兼容旧格式)
      const otherMatches = convertedContent.match(/\[直播\|([^|]+)\|([^\]]+)\]/g);
      if (otherMatches) {
        // Skip formats already handled
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

      if (conversionCount > 0) {
        console.log(`[Live App] Converted ${conversionCount}  live formats`);
      }

      return convertedContent;
    }

    /**
     * 更新消息内容
     * @param {number} messageIndex - message index
     * @param {string} newContent - 新内容
     * @param {boolean} skipAutoSave - skip autosave（用于批量处理）
     */
    async updateMessageContent(messageIndex, newContent, skipAutoSave = false) {
      try {
        console.log(`[Live App] Updating message ${messageIndex}`);

        // 方法1: 使用与getChatDatasame methodchat数组（推荐，does not trigger autosave）
        let chat = null;

        // PreferSillyTavern.getContext().chat
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

        // If the methods above fail，Try the global chat var
        if (!chat) {
          chat = window['chat'];
        }

        if (chat && Array.isArray(chat)) {
          // 添加边界检查
          if (messageIndex < 0 || messageIndex >= chat.length) {
            console.warn(`[Live App] message index ${messageIndex} 超出范围，chat数组长度: ${chat.length}`);
            return false;
          }

          if (!chat[messageIndex]) {
            console.warn(`[Live App] message index ${messageIndex}  — no message there`);
            return false;
          }

          const originalContent = chat[messageIndex].mes || '';
          chat[messageIndex].mes = newContent;

          // 如果消息有swipes，也需要更新
          if (chat[messageIndex].swipes && chat[messageIndex].swipe_id !== undefined) {
            chat[messageIndex].swipes[chat[messageIndex].swipe_id] = newContent;
          }

          // Mark chat dirty
          if (window.chat_metadata) {
            window.chat_metadata.tainted = true;
          }

          console.log(
            `[Live App] Updated message ${messageIndex}，${originalContent.length}，→ ${newContent.length}`,
          );
          return true;
        }

        // Debug info
        console.warn(`[Live App] 无法访问chat数组，chat类型: ${typeof chat}, 是否为数组: ${Array.isArray(chat)}`);
        if (chat && Array.isArray(chat)) {
          console.warn(`[Live App] chat数组长度: ${chat.length}, 请求的message index: ${messageIndex}`);
        }

        // If the direct method fails，Try fallback（Try even during batch processing）
        // 方法2: Try updating via editor（may trigger autosave）
        if (window.mobileContextEditor && window.mobileContextEditor.modifyMessage) {
          try {
            await window.mobileContextEditor.modifyMessage(messageIndex, newContent);
            console.log(`[Live App] 已通过mobileContextEditor更新消息 ${messageIndex}`);
            return true;
          } catch (error) {
            console.warn(`[Live App] mobileContextEditor更新失败:`, error);
          }
        }

        // 方法3: 尝试通过context-editor更新（may trigger autosave）
        if (window.contextEditor && window.contextEditor.modifyMessage) {
          try {
            await window.contextEditor.modifyMessage(messageIndex, newContent);
            console.log(`[Live App] 已通过contextEditor更新消息 ${messageIndex}`);
            return true;
          } catch (error) {
            console.warn(`[Live App] contextEditor更新失败:`, error);
          }
        }

        console.warn('[Live App] No valid message-update method');
        return false;
      } catch (error) {
        console.error('[Live App] Update message failed:', error);
        return false;
      }
    }

    /**
     * Save chat data
     */
    async saveChatData() {
      try {
        console.log('[Live App] 开始Save chat data...');

        // 方法1: 使用SillyTavern的保存函数
        if (typeof window.saveChatConditional === 'function') {
          await window.saveChatConditional();
          console.log('[Live App] 已通过saveChatConditionalSave chat data');
          return true;
        }

        // 方法2: Debounced save
        if (typeof window.saveChatDebounced === 'function') {
          window.saveChatDebounced();
          console.log('[Live App] 已通过saveChatDebouncedSave chat data');
          // Wait for save to finish
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }

        // 方法3: Save via editor
        if (window.mobileContextEditor && typeof window.mobileContextEditor.saveChatData === 'function') {
          await window.mobileContextEditor.saveChatData();
          console.log('[Live App] 已通过mobileContextEditorSave chat data');
          return true;
        }

        // 方法4: 使用context-editor的保存功能
        if (window.contextEditor && typeof window.contextEditor.saveChatData === 'function') {
          await window.contextEditor.saveChatData();
          console.log('[Live App] 已通过contextEditorSave chat data');
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
            console.log('[Live App] 已通过手动AJAXSave chat data');
            return true;
          }
        } catch (ajaxError) {
          console.warn('[Live App] 手动AJAX保存失败:', ajaxError);
        }

        console.warn('[Live App] No valid save method');
        return false;
      } catch (error) {
        console.error('[Live App] Save chat data失败:', error);
        return false;
      }
    }

    /**
     * Get chat data
     */
    getChatData() {
      try {
        // PreferSillyTavern.getContext().chat
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

        // Try the global chat var
        const chat = window['chat'];
        if (chat && Array.isArray(chat)) {
          return chat;
        }

        return [];
      } catch (error) {
        console.error('[Live App] Get chat data失败:', error);
        return [];
      }
    }

    /**
     * 更新header
     */
    updateHeader() {
      if (window.mobilePhone && window.mobilePhone.updateAppHeader) {
        const state = {
          app: 'live',
          title: this.currentView === 'live' ? 'Live' : 'Live',
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
     * 打字机效果：type the text out，速度适中
     */
    applyTypingEffect(element, fullText) {
      // 若正在打字，先终止
      if (this.typingTimer) {
        clearInterval(this.typingTimer);
        this.typingTimer = null;
      }

      // Skip if the element already shows this text，则不重复打字
      if (element.getAttribute('data-full-text') === fullText && element.textContent === fullText) {
        return;
      }

      element.setAttribute('data-full-text', fullText);
      element.textContent = '';
      // Start visible from the top
      if (typeof element.scrollTop === 'number') {
        element.scrollTop = 0;
      }
      this.isTyping = true;

      const chars = Array.from(fullText);
      let index = 0;
      const stepMsHead = 35; // 前100字：逐字
      const stepMsTailChunk = 18; // 尾部：faster chunked display（非逐字）
      const tailChunkSize = 6; // chars per chunk（流畅但不突兀）

      // Fix scroll position before typing
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
          // Then append in chunks
          const end = Math.min(index + tailChunkSize, chars.length);
          const slice = chars.slice(index, end).join('');
          element.textContent += slice;
          index = end;
          // 动态调整节奏：Short pause so it still feels typed
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
     * 销毁应用，清理资源
     */
    destroy() {
      console.log('[Live App] 销毁应用，清理资源');

      // Stop listening
      this.eventListener.stopListening();

      // 清理定时器
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = null;
      }
      if (this.typingTimer) {
        clearInterval(this.typingTimer);
        this.typingTimer = null;
      }

      // Clear state
      this.stateManager.clearAllData();

      // 重置状态
      this.isInitialized = false;
      this.currentView = 'start';
    }

    /**
     * Latest-floor text (prefer getChatMessages)
     */
    getLatestFloorTextSafe() {
      try {
        const gm = (typeof window !== 'undefined' && (window.getChatMessages || globalThis.getChatMessages)) || null;
        if (typeof gm === 'function') {
          // 仅取最新楼层，优先 assistant
          const latestAssistant = gm(-1, { role: 'assistant' });
          if (Array.isArray(latestAssistant) && latestAssistant.length > 0 && latestAssistant[0]?.message) {
            return latestAssistant[0].message;
          }
          // fall back to any role
          const latestAny = gm(-1);
          if (Array.isArray(latestAny) && latestAny.length > 0 && latestAny[0]?.message) {
            return latestAny[0].message;
          }
        }
      } catch (e) {
        console.warn('[Live App] Latest-floor text failed（getChatMessages）:', e);
      }

      // 兜底：Last message in the context array
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
        console.warn('[Live App] Latest-floor text failed（chat兜底）:', e2);
      }
      return '';
    }

    /** Chat signature (stable, no timestamp) */
    createDanmakuSignature(item) {
      const username = (item && item.username) || '';
      const content = (item && item.content) || '';
      const type = (item && item.type) || '';
      return `${username}|${content}|${type}`;
    }

    /** Gift signature (stable, no timestamp) */
    createGiftSignature(item) {
      const username = (item && item.username) || '';
      const gift = (item && (item.gift || item.content)) || '';
      return `${username}|${gift}`;
    }

    /** Reveal pending chat and gifts in order */
    runAppearSequence() {
      try {
        const danmakuList = document.getElementById('danmaku-list');
        if (danmakuList) {
          const nodes = Array.from(danmakuList.querySelectorAll('.danmaku-item.need-appear'));
          // Hide appear-nodes on first paint（使用 display:none 避免空白）
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

        // Clear pending-appear sets
        this.pendingAppearDanmakuSigs.clear();
        this.pendingAppearGiftSigs.clear();
      } catch (e) {
        console.warn('[Live App] Staggered-appear failed:', e);
      }
    }

    /** Add classes to nodes appear-init → appear-show（带间隔） */
    sequentialReveal(nodes) {
      if (!nodes || nodes.length === 0) return;

      // Start hidden to avoid a jump, then CSS transition
      nodes.forEach(el => {
        el.classList.remove('need-appear', 'appear-show');
        el.classList.add('appear-init');
        // display:none so they do not take space
        el.style.display = 'none';
      });

      // 逐条显示：每条约 700ms 一条（更慢），单条过渡 ~300ms（参见CSS）
      const baseDelay = 150;
      const stepDelay = 700; // ≈ 0.7 s per item
      nodes.forEach((el, idx) => {
        setTimeout(() => {
          // Show and trigger transition
          el.style.display = '';
          // 强制触发一次 reflow，保证过渡生效
          // eslint-disable-next-line no-unused-expressions
          el.offsetHeight;
          el.classList.add('appear-show');
          // After each item, stick the container to the bottom (instant)
          const container = document.getElementById('danmaku-container');
          if (container && el?.scrollIntoView) {
            el.scrollIntoView({ block: 'end', inline: 'nearest' });
          }
        }, baseDelay + idx * stepDelay);
      });
    }
  }

  // Create global instance
  window.LiveApp = LiveApp;
  window.liveApp = new LiveApp();
} // end class-guard

// Global helpers
window.getLiveAppContent = function () {
  console.log('[Live App] Get Live content');

  if (!window.liveApp) {
    console.error('[Live App] liveApp实例不存在');
    return '<div class="error-message">Live app failed to load</div>';
  }

  try {
    // Re-detect active live each time content is requested
    window.liveApp.detectActiveLive();
    return window.liveApp.getAppContent();
  } catch (error) {
    console.error('[Live App] getAppContent failed:', error);
    return '<div class="error-message">Live app content failed to load</div>';
  }
};

window.bindLiveAppEvents = function () {
  console.log('[Live App] 绑定Live app事件');

  if (!window.liveApp) {
    console.error('[Live App] liveApp实例不存在');
    return;
  }

  try {
    // 延迟绑定，确保DOM完全加载
    setTimeout(() => {
      window.liveApp.bindEvents();
      window.liveApp.updateHeader();
    }, 100);
  } catch (error) {
    console.error('[Live App] 绑定事件失败:', error);
  }
};

// 其他全局函数
window.liveAppStartLive = function (interaction) {
  if (window.liveApp) {
    window.liveApp.startLive(interaction);
  }
};

window.liveAppEndLive = function () {
  if (window.liveApp) {
    window.liveApp.endLive();
  }
};

window.liveAppShowModal = function (modalId) {
  if (window.liveApp) {
    window.liveApp.showModal(modalId);
  }
};

window.liveAppHideModal = function (modalId) {
  if (window.liveApp) {
    window.liveApp.hideModal(modalId);
  }
};

window.liveAppDestroy = function () {
  if (window.liveApp) {
    window.liveApp.destroy();
    console.log('[Live App] 应用已销毁');
  }
};

window.liveAppDetectActive = function () {
  if (window.liveApp) {
    console.log('[Live App] 🔍 Manual active-live detect...');
    window.liveApp.detectActiveLive();

    // 更新界面
    if (typeof window.bindLiveAppEvents === 'function') {
      window.bindLiveAppEvents();
    }

    console.log('[Live App] ✅ Detect done, state:', {
      view: window.liveApp.currentView,
      isLiveActive: window.liveApp.isLiveActive,
    });
  } else {
    console.error('[Live App] liveApp实例不存在');
  }
};

window.liveAppForceReload = function () {
  console.log('[Live App] 🔄 force reload...');

  // 先销毁旧实例
  if (window.liveApp) {
    window.liveApp.destroy();
  }

  // 创建新实例
  window.liveApp = new LiveApp();
  console.log('[Live App] ✅ App reloaded');
};

// 测试转换功能
window.liveAppTestConversion = function () {
  console.log('[Live App] 🧪 Testing conversion...');

  if (!window.liveApp) {
    console.error('[Live App] liveApp实例不存在');
    return;
  }

  const testContent = `Test message
[直播|小明|弹幕|主播你好！今天吃的什么呀？]
[直播|小红|礼物|璀璨火箭*2]
[直播|推荐互动|回答小明的弹幕问题]
[直播|推荐互动|感谢小红的礼物]
[直播|本场人数|55535]
[直播|直播内容|你微笑着调整了一下耳机，准备开始今天的杂谈直播。]
End test`;

  console.log('Original text:', testContent);
  const converted = window.liveApp.convertLiveFormats(testContent);
  console.log('转换后内容:', converted);

  return converted;
};

// 测试布局高度
window.liveAppTestLayout = function () {
  console.log('[Live App] 📐 测试布局高度...');

  const appContent = document.getElementById('app-content');
  if (!appContent) {
    console.error('[Live App] app-content元素不存在');
    return;
  }

  const liveContainer = appContent.querySelector('.live-container');
  if (!liveContainer) {
    console.error('[Live App] live-container元素不存在');
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

  // Check overflow
  const hasOverflow = measurements.liveContainer.scrollHeight > measurements.liveContainer.clientHeight;
  const danmakuCanScroll =
    measurements.danmakuContainer &&
    measurements.danmakuContainer.scrollHeight > measurements.danmakuContainer.clientHeight;

  console.log('[Live App] 📐 布局检查:');
  console.log(`- 容器是否溢出: ${hasOverflow ? '❌ 是' : '✅ 否'}`);
  console.log(`- danmaku scrollable: ${danmakuCanScroll ? '✅ 是' : '❌ 否'}`);

  return measurements;
};

// 测试函数
window.liveAppTest = function () {
  console.log('[Live App] 🧪 开始测试Live app...');

  const tests = [
    {
      name: '检查LiveApp类是否存在',
      test: () => typeof window.LiveApp === 'function',
    },
    {
      name: '检查liveApp实例是否存在',
      test: () => window.liveApp instanceof window.LiveApp,
    },
    {
      name: 'Global helpers exist',
      test: () => typeof window.getLiveAppContent === 'function' && typeof window.bindLiveAppEvents === 'function',
    },
    {
      name: 'Data parser',
      test: () => {
        const parser = new window.LiveApp().dataParser;
        const testData = parser.parseLiveData('[直播|本场人数|1234][直播|直播内容|测试content][直播|用户1|弹幕|测试弹幕]');
        return (
          testData.viewerCount === '1.2K' && testData.liveContent === '测试内容' && testData.danmakuList.length === 1
        );
      },
    },
    {
      name: 'App content generates',
      test: () => {
        const content = window.getLiveAppContent();
        return typeof content === 'string' && content.includes('live-app');
      },
    },
    {
      name: 'Active-live detection',
      test: () => {
        const app = new window.LiveApp();
        const testContent1 = '[直播|本场人数|1234][直播|直播内容|测试content]';
        const testContent2 = '[直播历史|本场人数|1234][直播历史|直播内容|测试content]';
        const testContent3 = 'Plain chat with no live tags';

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
        console.log(`✅ ${test.name}: 通过`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: 失败`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: 错误 - ${error.message}`);
      failed++;
    }
  });

  console.log(`[Live App] 🧪 测试完成: ${passed} 通过, ${failed} 失败`);

  if (failed === 0) {
    console.log('[Live App] 🎉 所有测试通过！Live app已准备就绪');
  } else {
    console.log('[Live App] ⚠️ 部分测试失败，check the related feature');
  }

  return { passed, failed, total: tests.length };
};

console.log('[Live App] Live app模块加载完成');
console.log('[Live App] 💡 可用的函数:');
console.log('[Live App] - liveAppTest() 测试应用功能');
console.log('[Live App] - liveAppTestConversion() Test format conversion');
console.log('[Live App] - liveAppTestLayout() 测试布局高度');
console.log('[Live App] - liveAppDetectActive() Manual active-live detect');
console.log('[Live App] - liveAppForceReload() force reload');
