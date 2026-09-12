/**
 * Message Sender - 消息发送处理器
 * 专门处理消息发送格式和逻辑，参考qq-app.js的发送功能
 */

// 避免重复定义
if (typeof window.MessageSender === 'undefined') {
  class MessageSender {
    constructor() {
      this.currentFriendId = null;
      this.currentFriendName = null;
      this.isGroup = false;
      this.contextEditor = null;
      this.init();
    }

    init() {
      console.log('[Message Sender] 消息发送器初始化完成');
      this.loadContextEditor();
    }

    /**
     * 检查是否启用延迟点击发送按钮
     */
    isDelayClickEnabled() {
      try {
        const settings = localStorage.getItem('messageSenderSettings');
        if (settings) {
          const parsed = JSON.parse(settings);
          // 如果明确设置了 delayClickEnabled，使用该值；否则默认为 true
          return parsed.delayClickEnabled === undefined ? true : parsed.delayClickEnabled;
        }
        return true; // 默认启用
      } catch (error) {
        console.warn('[Message Sender] 获取延迟点击设置失败:', error);
        return true; // 默认启用
      }
    }

    /**
     * 设置是否启用延迟点击发送按钮
     */
    setDelayClickEnabled(enabled) {
      try {
        let settings = {};
        const existing = localStorage.getItem('messageSenderSettings');
        if (existing) {
          settings = JSON.parse(existing);
        }
        settings.delayClickEnabled = enabled;
        localStorage.setItem('messageSenderSettings', JSON.stringify(settings));
        console.log('[Message Sender] 延迟点击设置已保存:', enabled);
      } catch (error) {
        console.error('[Message Sender] 保存延迟点击设置失败:', error);
      }
    }

    /**
     * 检查是否启用禁止正文功能
     */
    isDisableBodyTextEnabled() {
      try {
        // 尝试从SillyTavern的extension_settings中获取
        if (window.SillyTavern && window.SillyTavern.getContext) {
          const context = window.SillyTavern.getContext();
          if (context.extensionSettings && context.extensionSettings.mobile_context) {
            return context.extensionSettings.mobile_context.disableBodyText || false;
          }
        }

        // 回退到全局extension_settings
        if (window.extension_settings && window.extension_settings.mobile_context) {
          return window.extension_settings.mobile_context.disableBodyText || false;
        }

        return false; // 默认不启用
      } catch (error) {
        console.warn('[Message Sender] 获取禁止正文设置失败:', error);
        return false; // 默认不启用
      }
    }

    /**
     * 加载上下文编辑器
     */
    loadContextEditor() {
      // 检查mobile上下文编辑器是否可用
      if (window.mobileContextEditor) {
        this.contextEditor = window.mobileContextEditor;
        console.log('[Message Sender] Mobile上下文编辑器已连接');
      } else {
        console.warn('[Message Sender] Mobile上下文编辑器未找到，延迟重试...');
        setTimeout(() => this.loadContextEditor(), 1000);
      }
    }

    /**
     * 设置当前聊天对象
     */
    setCurrentChat(friendId, friendName, isGroup = false) {
      this.currentFriendId = friendId;
      this.currentFriendName = friendName;
      this.isGroup = isGroup;

      console.log(`[Message Sender] 设置当前聊天对象:`, {
        friendId,
        friendName,
        isGroup,
      });
    }

    /**
     * send message到SillyTavern
     * 参考qq-app.js的sendToChat方法
     */
    async sendToChat(message) {
      try {
        console.log('[Message Sender] Sending to SillyTavern:', message);

        // 方法1: 直接使用DOM元素
        const originalInput = document.getElementById('send_textarea');
        const sendButton = document.getElementById('send_but');

        if (!originalInput || !sendButton) {
          console.error('[Message Sender] Message box or send button not found');
          return await this.sendToChatBackup(message);
        }

        // 检查输入框是否可用
        if (originalInput.disabled) {
          console.warn('[Message Sender] Message box is disabled');
          return false;
        }

        // 检查发送按钮是否可用
        if (sendButton.classList.contains('disabled')) {
          console.warn('[Message Sender] Send button is disabled');
          return false;
        }

        if (message == null || String(message).trim() === '' || String(message).trim() === 'undefined') {
          console.error('[Message Sender] Refusing empty/undefined payload');
          return false;
        }

        // Write through the native setter so SillyTavern sees the value
        const existingValue = originalInput.value;
        const newValue = existingValue ? existingValue + '\n' + message : message;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (setter) setter.call(originalInput, newValue);
        else originalInput.value = newValue;
        console.log('[Message Sender] Appended text to the message box:', {
          原有内容: existingValue,
          新增内容: message,
          最终内容: newValue
        });

        // 触发输入事件
        originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        originalInput.dispatchEvent(new Event('change', { bubbles: true }));

        // 根据设置决定是否延迟点击发送按钮
        if (this.isDelayClickEnabled()) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        sendButton.click();
        console.log('[Message Sender] Clicked send');

        return true;
      } catch (error) {
        console.error('[Message Sender] Send failed:', error);
        return await this.sendToChatBackup(message);
      }
    }

    /**
     * Fallback send
     */
    async sendToChatBackup(message) {
      try {
        console.log('[Message Sender] 尝试Fallback send:', message);

        // 尝试查找其他可能的输入框
        const textareas = document.querySelectorAll('textarea');
        const inputs = document.querySelectorAll('input[type="text"]');

        if (textareas.length > 0) {
          const textarea = textareas[0];
          textarea.value = message;
          textarea.focus();

          // 模拟键盘事件
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return true;
        }

        return false;
      } catch (error) {
        console.error('[Message Sender] Fallback send失败:', error);
        return false;
      }
    }

    /**
     * 构建消息格式并发送
     * 参考qq-app.js的buildAndSendQQMessage方法
     */
    async buildAndSendMessage(message) {
      if (!this.currentFriendId || !this.currentFriendName) {
        throw new Error('No chat target set');
      }

      // 将消息按行分割，过滤空行
      const messageLines = message.split('\n').filter(line => line.trim());

      if (messageLines.length === 0) {
        throw new Error('Message is empty');
      }

      console.log(`[Message Sender] 处理${messageLines.length} messages:`, messageLines);

      // 🌟 新增：检查是否为已格式化的特殊消息（语音、红包、表情包）
      const voiceMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|语音\|[^\]]*\]$/;
      const redpackMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|红包\|[^\]]*\]$/;
      const stickerMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|表情包\|[^\]]*\]$/;
      const hasSpecialMessages = messageLines.some(line => {
        const trimmed = line.trim();
        return (
          voiceMessageRegex.test(trimmed) || redpackMessageRegex.test(trimmed) || stickerMessageRegex.test(trimmed)
        );
      });

      if (hasSpecialMessages) {
        // 如果包含已格式化的语音消息，需要对混合消息进行分别处理
        const processedMessages = [];

        messageLines.forEach((line, index) => {
          const trimmedLine = line.trim();

          if (voiceMessageRegex.test(trimmedLine)) {
            // 语音消息直接保留
            processedMessages.push(trimmedLine);
            console.log(`[Message Sender] 第${index + 1}条: 保留语音消息格式:`, trimmedLine);
          } else if (redpackMessageRegex.test(trimmedLine)) {
            // 红包消息直接保留
            processedMessages.push(trimmedLine);
            console.log(`[Message Sender] 第${index + 1}条: 保留红包消息格式:`, trimmedLine);
          } else if (stickerMessageRegex.test(trimmedLine)) {
            // 🌟 新增：表情包消息直接保留
            processedMessages.push(trimmedLine);
            console.log(`[Message Sender] 第${index + 1}条: 保留表情包消息格式:`, trimmedLine);
          } else if (trimmedLine) {
            // 普通文字需要格式化为正确的格式
            const formattedMessage = this.isGroup
              ? `[我方消息|我|${this.currentFriendId}|文字|${trimmedLine}]`
              : `[我方消息|我|${this.currentFriendId}|文字|${trimmedLine}]`;

            processedMessages.push(formattedMessage);
            console.log(`[Message Sender] 第${index + 1}条: 格式化文字消息:`, formattedMessage);
          }
        });

        const targetPrefix = this.isGroup
          ? `Send group chat to ${this.currentFriendName} (${this.currentFriendId})`
          : `Send a message to ${this.currentFriendName} (${this.currentFriendId})`;

        // 检查是否启用禁止正文功能
        let finalMessage;
        if (this.isDisableBodyTextEnabled()) {
          finalMessage = `<Request: If the user only sent in-app chat tags, reply with in-app chat tags only — no story prose.>\nUse the required format, ${targetPrefix}\n${processedMessages.join('\n')}`;
          console.log('[Message Sender] Body-text lock on — special prefix added');
        } else {
          finalMessage = `Use the required format, ${targetPrefix}\n${processedMessages.join('\n')}`;
        }

        console.log('[Message Sender] Sending mixed message (special formats):', finalMessage);

        const success = await this.sendToChat(finalMessage);

        if (success) {
          const voiceCount = processedMessages.filter(msg => voiceMessageRegex.test(msg)).length;
          const redpackCount = processedMessages.filter(msg => redpackMessageRegex.test(msg)).length;
          const stickerCount = processedMessages.filter(msg => stickerMessageRegex.test(msg)).length;
          const textCount = processedMessages.length - voiceCount - redpackCount - stickerCount;

          let summaryMessage = '';
          const parts = [];

          if (textCount > 0) parts.push(`${textCount}条文字`);
          if (voiceCount > 0) parts.push(`${voiceCount}条语音`);
          if (redpackCount > 0) parts.push(`${redpackCount}条红包`);
          if (stickerCount > 0) parts.push(`${stickerCount}条表情包`);

          if (parts.length > 1) {
            summaryMessage = parts.join(' + ');
          } else if (parts.length === 1) {
            summaryMessage = parts[0] + '消息';
          } else {
            summaryMessage = `${processedMessages.length}条消息`;
          }

          this.showSendSuccessToast(summaryMessage);
        }

        return success;
      }

      // 检查是否全为表情包消息
      const stickerRegex = /^\[表情包\|([^\|]+)\|([^\]]+)\]$/;
      const allStickers = messageLines.every(line => stickerRegex.test(line.trim()));

      if (allStickers && messageLines.length > 0) {
        return await this.sendStickerMessages(messageLines);
      }

      // 处理普通消息
      return await this.sendNormalMessages(messageLines);
    }

    /**
     * 发送表情包消息
     */
    async sendStickerMessages(messageLines) {
      const targetPrefix = this.isGroup
        ? `Send group chat to ${this.currentFriendName} (${this.currentFriendId})`
        : `Send a message to ${this.currentFriendName} (${this.currentFriendId})`;

      // 检查是否启用禁止正文功能
      let finalMessage;
      if (this.isDisableBodyTextEnabled()) {
        finalMessage = `<Request: If the user only sent in-app chat tags, reply with in-app chat tags only — no story prose.>\nUse the required format, ${targetPrefix}\n${messageLines.join('\n')}`;
        console.log('[Message Sender] Body-text lock on — special prefix added');
      } else {
        finalMessage = `Use the required format, ${targetPrefix}\n${messageLines.join('\n')}`;
      }

      console.log('[Message Sender] Sending sticker-only message:', finalMessage);

      const success = await this.sendToChat(finalMessage);

      if (success) {
        const summaryMessage = messageLines.length > 1 ? `${messageLines.length}个表情包` : '1个表情包';

        this.showSendSuccessToast(summaryMessage);
      }

      return success;
    }

    /**
     * 发送普通消息
     */
    async sendNormalMessages(messageLines) {
      const formattedMessages = [];

      messageLines.forEach((line, index) => {
        // 为每条消息生成独立的时间戳（间隔1秒）
        const messageTime = new Date(Date.now() + index * 1000);
        const currentTime = messageTime.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        let messageContent = line.trim();
        let singleMessage;

        // 检查是否包含特殊格式
        if (this.isSpecialFormat(messageContent)) {
          // 处理特殊格式消息
          singleMessage = this.formatSpecialMessage(messageContent, currentTime);
        } else {
          // 处理普通文本消息
          singleMessage = this.formatNormalMessage(messageContent, currentTime);
        }

        formattedMessages.push(singleMessage);
        console.log(`[Message Sender] 第${index + 1} message format:`, singleMessage);
      });

      // 验证消息格式
      const validatedMessages = this.validateMessages(formattedMessages);

      // 构建Final payload
      let targetPrefix;
      if (this.isGroup) {
        // 获取群聊成员列表
        const groupMembers = this.getCurrentGroupMembers();
        const membersText = groupMembers.length > 0 ? `, group members: ${groupMembers.join('、')}` : '';

        targetPrefix = `Send a group chat to ${this.currentFriendName} (${this.currentFriendId})${membersText}. Reply in the required group-chat format. Stay in character for every member and the current plot`;
      } else {
        targetPrefix = `Send a message to ${this.currentFriendName} (${this.currentFriendId}). Reply in the required private-chat format. Stay in character and the current plot`;
      }

      // 检查是否启用禁止正文功能
      let finalMessage;
      if (this.isDisableBodyTextEnabled()) {
        finalMessage = `<Request: If the user only sent in-app chat tags, reply with in-app chat tags only — no story prose.>\nUse the required format, ${targetPrefix}\n${validatedMessages.join('\n')}`;
        console.log('[Message Sender] Body-text lock on — special prefix added');
      } else {
        finalMessage = `Use the required format, ${targetPrefix}\n${validatedMessages.join('\n')}`;
      }

      console.log('[Message Sender] Final payload:', finalMessage);

      const success = await this.sendToChat(finalMessage);

      if (success) {
        const summaryMessage =
          messageLines.length > 1
            ? `${messageLines.length} messages: ${messageLines[0].substring(0, 10)}...`
            : messageLines[0];

        this.showSendSuccessToast(summaryMessage);
      }

      return success;
    }

    /**
     * 检查是否为特殊格式（表情包、语音、红包等）
     */
    isSpecialFormat(content) {
      const specialFormats = [
        /^\[表情包\|([^\|]+)\|([^\]]+)\]$/, // 旧表情包格式
        /^\[语音\|([^\|]+)\|([^\]]+)\]$/, // 旧语音格式
        /^\[红包\|([^\|]+)\|([^\]]+)\]$/, // 旧红包格式
        /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|语音\|[^\]]*\]$/, // 新语音消息格式
        /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|红包\|[^\]]*\]$/, // 新红包消息格式
        /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|表情包\|[^\]]*\]$/, // 新表情包消息格式
        /^语音：/, // 语音前缀
        /^红包：/, // 红包前缀
      ];

      return specialFormats.some(regex => regex.test(content));
    }

    /**
     * 格式化特殊消息
     */
    formatSpecialMessage(content, currentTime) {
      // 🌟 检查是否为已格式化的语音消息，如果是则直接返回，不再包装
      const voiceMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|语音\|[^\]]*\]$/;
      if (voiceMessageRegex.test(content)) {
        console.log(`[Message Sender] 检测到已格式化的语音消息，直接返回:`, content);
        return content; // 直接返回，不再包装
      }

      // 🌟 检查是否为已格式化的红包消息，如果是则直接返回，不再包装
      const redpackMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|红包\|[^\]]*\]$/;
      if (redpackMessageRegex.test(content)) {
        console.log(`[Message Sender] 检测到已格式化的红包消息，直接返回:`, content);
        return content; // 直接返回，不再包装
      }

      // 🌟 检查是否为已格式化的表情包消息，如果是则直接返回，不再包装
      const stickerMessageRegex = /^\[(?:我方消息\|我\|[^|]*|群聊消息\|[^|]*\|我)\|表情包\|[^\]]*\]$/;
      if (stickerMessageRegex.test(content)) {
        console.log(`[Message Sender] 检测到已格式化的表情包消息，直接返回:`, content);
        return content; // 直接返回，不再包装
      }

      // 如果已经是完整的特殊格式，直接包装
      if (content.startsWith('[') && content.endsWith(']')) {
        return this.isGroup
          ? `[我方消息|${this.currentFriendName}|${this.currentFriendId}|我|${content}|${currentTime}]`
          : `[我方消息|${this.currentFriendName}|${this.currentFriendId}|${content}|${currentTime}]`;
      }

      // 处理简单前缀格式
      if (content.startsWith('语音：')) {
        content = `语音：${content.substring(3)}`;
      } else if (content.startsWith('红包：')) {
        content = `红包：${content.substring(3)}`;
      }

      return this.isGroup
        ? `[我方消息|${this.currentFriendName}|${this.currentFriendId}|我|${content}|${currentTime}]`
        : `[我方消息|${this.currentFriendName}|${this.currentFriendId}|${content}|${currentTime}]`;
    }

    /**
     * 格式化普通消息
     */
    formatNormalMessage(content, currentTime) {
      return this.isGroup
        ? `[我方消息|我|${this.currentFriendId}|文字|${content}]`
        : `[我方消息|我|${this.currentFriendId}|文字|${content}]`;
    }

    /**
     * 验证消息格式
     */
    validateMessages(messages) {
      return messages.map((msg, index) => {
        if (!msg.trim().endsWith(']')) {
          console.warn(`[Message Sender] 第${index + 1} message format不完整:`, msg);
          return msg.trim() + ']';
        }
        return msg.trim();
      });
    }

    /**
     * 显示发送成功提示
     */
    showSendSuccessToast(message) {
      const toast = document.createElement('div');
      toast.className = 'send-status-toast success';
      toast.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">✅ 消息已发送</div>
            <div style="font-size: 12px; opacity: 0.9;">
                发送给: ${this.currentFriendName}<br>
                内容: ${message.length > 20 ? message.substring(0, 20) + '...' : message}
            </div>
        `;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 2000);
    }

    /**
     * 显示发送失败提示
     */
    showSendErrorToast(error) {
      const toast = document.createElement('div');
      toast.className = 'send-status-toast error';
      toast.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">❌ 发送失败</div>
            <div style="font-size: 12px; opacity: 0.9;">
                错误: ${error}
            </div>
        `;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3000);
    }

    /**
     * 处理回车发送
     */
    handleEnterSend(event, textareaElement) {
      if (event.key === 'Enter' && !event.shiftKey) {
        // 不再阻止默认行为，让回车键正常换行
        // event.preventDefault();

        // 换行后重新调整textarea高度
        setTimeout(() => {
          this.adjustTextareaHeight(textareaElement);
        }, 0);
      }
    }

    /**
     * send message的主要方法
     */
    async sendMessage(message) {
      if (!message.trim()) {
        this.showSendErrorToast('Message is empty');
        return false;
      }

      if (!this.currentFriendId) {
        this.showSendErrorToast('请选择一个聊天对象');
        return false;
      }

      try {
        // 显示发送中状态
        this.setSendingState(true);

        const success = await this.buildAndSendMessage(message);

        if (!success) {
          this.showSendErrorToast('发送失败，请重试');
        }

        return success;
      } catch (error) {
        console.error('[Message Sender] send message失败:', error);
        this.showSendErrorToast(error.message || '发送失败');
        return false;
      } finally {
        this.setSendingState(false);
      }
    }

    /**
     * 设置发送中状态
     */
    setSendingState(isSending) {
      const sendButton = document.getElementById('send-message-btn');
      const textareaElement = document.getElementById('message-send-input');

      if (sendButton) {
        if (isSending) {
          sendButton.classList.add('sending');
          sendButton.disabled = true;
          sendButton.textContent = 'Sending...';
        } else {
          sendButton.classList.remove('sending');
          sendButton.disabled = false;
          sendButton.textContent = '发送';
        }
      }

      if (textareaElement) {
        textareaElement.disabled = isSending;
      }
    }

    /**
     * 自动调整textarea高度
     */
    adjustTextareaHeight(textareaElement) {
      textareaElement.style.height = 'auto';
      textareaElement.style.height = Math.min(textareaElement.scrollHeight, 100) + 'px';
    }

    /**
     * 插入特殊格式到输入框
     */
    insertSpecialFormat(format, params) {
      const textareaElement = document.getElementById('message-send-input');
      if (!textareaElement) return;

      let specialText = '';

      switch (format) {
        case 'sticker':
          specialText = `[表情包|${params.filename}|${params.filepath}]`;
          break;
        case 'voice':
          specialText = `[语音|${params.duration}|${params.content}]`;
          break;
        case 'redpack':
          specialText = `[红包|${params.amount}|${params.message}]`;
          break;
        case 'emoji':
          specialText = params.emoji;
          break;
        default:
          return;
      }

      // 获取当前输入框的值和光标位置
      const currentValue = textareaElement.value;
      const cursorPosition = textareaElement.selectionStart;

      // 如果输入框不为空且光标前的字符不是换行符，Add换行
      let newValue;
      if (currentValue && cursorPosition > 0 && currentValue[cursorPosition - 1] !== '\n') {
        newValue = currentValue.slice(0, cursorPosition) + '\n' + specialText + currentValue.slice(cursorPosition);
      } else {
        newValue = currentValue.slice(0, cursorPosition) + specialText + currentValue.slice(cursorPosition);
      }

      // 设置新值
      textareaElement.value = newValue;

      // 调整高度
      this.adjustTextareaHeight(textareaElement);

      // 设置光标位置
      const newCursorPosition = cursorPosition + specialText.length + (newValue !== currentValue + specialText ? 1 : 0);
      textareaElement.setSelectionRange(newCursorPosition, newCursorPosition);
      textareaElement.focus();
    }

    /**
     * 获取当前聊天对象Messages
     */
    getCurrentChatInfo() {
      return {
        friendId: this.currentFriendId,
        friendName: this.currentFriendName,
        isGroup: this.isGroup,
      };
    }

    /**
     * 清空当前聊天对象
     */
    clearCurrentChat() {
      this.currentFriendId = null;
      this.currentFriendName = null;
      this.isGroup = false;
    }

    /**
     * 获取当前群聊的成员列表
     */
    getCurrentGroupMembers() {
      if (!this.isGroup || !this.currentFriendId) {
        return [];
      }

      try {
        // 方法1: 从聊天记录中查找最新的群聊Messages
        const messageElements = document.querySelectorAll('.mes_text, .mes_block');
        let latestGroupInfo = null;

        // 创建正则表达式匹配该群的Messages：[群聊|群名|群号|成员列表] 或 [Create group|群号|群名|成员列表]
        const groupRegex1 = new RegExp(`\\[群聊\\|([^\\|]+)\\|${this.currentFriendId}\\|([^\\]]+)\\]`, 'g');
        const groupRegex2 = new RegExp(`\\[Create group\\|${this.currentFriendId}\\|([^\\|]+)\\|([^\\]]+)\\]`, 'g');

        // 从最新消息开始查找
        for (let i = messageElements.length - 1; i >= 0; i--) {
          const messageText = messageElements[i].textContent || '';

          // 重置正则表达式索引
          groupRegex1.lastIndex = 0;
          groupRegex2.lastIndex = 0;

          // 尝试匹配第一种格式：[群聊|群名|群号|成员列表]
          let match = groupRegex1.exec(messageText);
          if (match) {
            latestGroupInfo = {
              groupName: match[1],
              members: match[2],
            };
            console.log('[Message Sender] 找到群聊Messages (格式1):', latestGroupInfo);
            break;
          }

          // 尝试匹配第二种格式：[Create group|群号|群名|成员列表]
          match = groupRegex2.exec(messageText);
          if (match) {
            latestGroupInfo = {
              groupName: match[1],
              members: match[2],
            };
            console.log('[Message Sender] 找到群聊Messages (格式2):', latestGroupInfo);
            break;
          }
        }

        if (latestGroupInfo) {
          // 解析成员列表
          const members = latestGroupInfo.members
            .split(/[、,，]/)
            .map(name => name.trim())
            .filter(name => name);

          console.log('[Message Sender] 解析到群聊Members:', members);
          return members;
        } else {
          console.log('[Message Sender] 未找到群聊成员Messages，返回空数组');
          return [];
        }
      } catch (error) {
        console.error('[Message Sender] 获取群聊成员失败:', error);
        return [];
      }
    }

    /**
     * 调试方法
     */
    debug() {
      console.log('[Message Sender] 调试Messages:', {
        currentFriendId: this.currentFriendId,
        currentFriendName: this.currentFriendName,
        isGroup: this.isGroup,
        contextEditor: !!this.contextEditor,
      });
    }
  }

  // 创建全局实例
  window.MessageSender = MessageSender;

  // 如果页面已加载，立即创建实例
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.messageSender = new MessageSender();
      console.log('[Message Sender] 全局实例已创建');
    });
  } else {
    window.messageSender = new MessageSender();
    console.log('[Message Sender] 全局实例已创建');
  }
} // 结束 if (typeof window.MessageSender === 'undefined') 检查
