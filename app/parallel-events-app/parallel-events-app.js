// ==Parallel Events App==
// @name         Parallel Events App
// @version      1.0.0
// @description  Parallel events app for monitoring floor changes and generating parallel event content
// @author       Assistant

/**
 * Parallel Events App Class
 * Manages parallel event generation, monitoring, and queue processing
 */
class ParallelEventsApp {
    constructor() {
        this.isInitialized = false;
        this.isListening = false;
        this.currentSettings = this.getDefaultSettings();
        this.eventQueue = [];
        this.isProcessing = false;
        this.floorMonitor = null;
        this.lastFloorCount = 0;

        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.startListening = this.startListening.bind(this);
        this.stopListening = this.stopListening.bind(this);
        this.generateParallelEvent = this.generateParallelEvent.bind(this);
        this.onFloorChange = this.onFloorChange.bind(this);

        console.log('[Parallel Events App] Parallel events app created');
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            enabled: true,
            selectedStyle: 'Parallel event',
            customPrefix: '',
            threshold: 5,
            autoGenerate: true,
            maxQueueSize: 10
        };
    }

    /**
     * Initialize the app
     */
    async initialize() {
        try {
            console.log('[Parallel Events App] Starting initialization...');

            // Load settings
            this.loadSettings();

            // Wait for dependencies
            await this.waitForDependencies();

            // Initialize floor monitor
            this.initializeFloorMonitor();

            // Setup phone container monitor
            this.setupPhoneContainerMonitor();

            this.isInitialized = true;
            console.log('[Parallel Events App] ✅ Initialization complete');

        } catch (error) {
            console.error('[Parallel Events App] Initialization failed:', error);
        }
    }

    /**
     * Wait for dependency modules to load
     */
    async waitForDependencies() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20; // Wait up to 10 seconds

            const checkDeps = () => {
                attempts++;
                const contextEditorReady = window.mobileContextEditor !== undefined;
                const customAPIReady = window.mobileCustomAPIConfig !== undefined;
                const stylesReady = window.parallelEventsStyles !== undefined;

                console.log(`[Parallel Events App] Dependency check ${attempts}/${maxAttempts}:`, {
                    contextEditor: contextEditorReady,
                    customAPI: customAPIReady,
                    styles: stylesReady
                });

                if (contextEditorReady && customAPIReady && stylesReady) {
                    console.log('[Parallel Events App] Dependencies ready');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('[Parallel Events App] Dependency wait timeout, continuing initialization');
                    resolve(); // Continue even if dependencies are not fully ready to avoid blocking
                } else {
                    setTimeout(checkDeps, 500);
                }
            };
            checkDeps();
        });
    }

    /**
     * Initialize floor monitor
     */
    initializeFloorMonitor() {
        console.log('[Parallel Events App] Initializing floor monitor...');

        // Use simple interval-based monitoring
        this.floorMonitor = {
            start: () => {
                if (this.monitorInterval) {
                    clearInterval(this.monitorInterval);
                }

                this.monitorInterval = setInterval(() => {
                    this.checkFloorChanges();
                }, 2000); // Check every 2 seconds

                console.log('[Parallel Events App] Floor monitoring started');
            },

            stop: () => {
                if (this.monitorInterval) {
                    clearInterval(this.monitorInterval);
                    this.monitorInterval = null;
                }
                console.log('[Parallel Events App] Floor monitoring stopped');
            }
        };
    }

    /**
     * Setup phone container monitor
     */
    setupPhoneContainerMonitor() {
        console.log('[Parallel Events App] Setting up phone container monitor...');

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const container = mutation.target;
                    if (container.id === 'mobile-phone-container') {
                        const isVisible = container.style.display !== 'none' &&
                                        container.classList.contains('active');

                        // Listen follows the enabled flag, not whether the phone UI is visible
                        if (this.currentSettings.enabled && !this.isListening) {
                            console.log('[Parallel Events App] Monitoring enabled, starting listening');
                            this.startListening();
                        } else if (!this.currentSettings.enabled && this.isListening) {
                            console.log('[Parallel Events App] Monitoring disabled, stopping listening');
                            this.stopListening();
                        }
                    }
                }
            });
        });

        const container = document.getElementById('mobile-phone-container');
        if (container) {
            observer.observe(container, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            console.log('[Parallel Events App] Phone container monitor setup complete');
        } else {
            console.warn('[Parallel Events App] Mobile phone container not found');
        }
    }

    /**
     * Check for floor changes
     */
    checkFloorChanges() {
        try {
            const messages = document.querySelectorAll('#chat .mes');
            const currentCount = messages.length;

            // Extra debug
            console.log(`[Parallel Events App] Floor check — now: ${currentCount}, last: ${this.lastFloorCount}, threshold: ${this.currentSettings.threshold}`);

            if (this.lastFloorCount === 0) {
                console.log(`[Parallel Events App] Init floor count: ${currentCount}`);
                this.lastFloorCount = currentCount;
                return;
            }

            const changeCount = currentCount - this.lastFloorCount;

            if (changeCount > 0) {
                console.log(`[Parallel Events App] Floor change: +${changeCount}  messages (need ${this.currentSettings.threshold}  to fire)`);
            }

            if (changeCount >= this.currentSettings.threshold) {
                console.log(`[Parallel Events App] 🎯 Threshold hit — generate: ${changeCount} >= ${this.currentSettings.threshold}`);
                this.onFloorChange(changeCount);
                this.lastFloorCount = currentCount;
            } else if (changeCount > 0) {
                console.log(`[Parallel Events App] Change below threshold — wait`);
            }
        } catch (error) {
            console.error('[Parallel Events App] Error checking floor changes:', error);
        }
    }

    /**
     * Handle floor change event
     */
    onFloorChange(changeCount) {
        if (!this.currentSettings.enabled || !this.currentSettings.autoGenerate) {
            return;
        }

        console.log(`[Parallel Events App] Processing floor change: ${changeCount} messages`);

        // Add event to queue
        const event = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            style: this.currentSettings.selectedStyle,
            customPrefix: this.currentSettings.customPrefix,
            timestamp: new Date(),
            status: 'pending',
            changeCount: changeCount
        };

        this.addToQueue(event);
    }

    /**
     * Add event to queue
     */
    addToQueue(event) {
        if (this.eventQueue.length >= this.currentSettings.maxQueueSize) {
            console.warn('[Parallel Events App] Queue is full, removing oldest event');
            this.eventQueue.shift();
        }

        this.eventQueue.push(event);
        console.log(`[Parallel Events App] Event added to queue: ${event.id}`);

        this.updateUI();
        this.processQueue();
    }

    /**
     * Process event queue
     */
    async processQueue() {
        if (this.isProcessing || this.eventQueue.length === 0) {
            return;
        }

        // Check for pending events
        const pendingEvent = this.eventQueue.find(e => e.status === 'pending');
        if (!pendingEvent) {
            return;
        }

        // Check if SillyTavern is generating content
        if (this.checkSillyTavernGenerating()) {
            console.log('[Parallel Events App] SillyTavern is generating content, waiting...');
            setTimeout(() => this.processQueue(), 2000);
            return;
        }

        this.isProcessing = true;

        try {
            pendingEvent.status = 'processing';
            pendingEvent.startTime = new Date();
            this.updateUI();

            console.log('[Parallel Events App] Starting event processing:', pendingEvent.id);

            await this.generateParallelEvent(pendingEvent);

            pendingEvent.status = 'completed';
            pendingEvent.completedTime = new Date();
            console.log('[Parallel Events App] Event processing complete:', pendingEvent.id);

        } catch (error) {
            console.error('[Parallel Events App] Event processing failed:', error);
            pendingEvent.status = 'failed';
            pendingEvent.error = error.message;
            pendingEvent.failedTime = new Date();
        } finally {
            this.isProcessing = false;
            this.updateUI();

            // Continue processing other events in queue
            setTimeout(() => this.processQueue(), 1000);
        }
    }

    /**
     * Check if SillyTavern is generating content
     */
    checkSillyTavernGenerating() {
        try {
            // Check send button status
            const sendButton = document.getElementById('send_but');
            if (sendButton && sendButton.style.display === 'none') {
                return true;
            }

            // Check if stop button is visible
            const stopButton = document.getElementById('mes_stop');
            if (stopButton && stopButton.style.display !== 'none') {
                return true;
            }

            // Check for generating message
            const generatingMessage = document.querySelector('.mes.last_mes .mes_text.generating');
            if (generatingMessage) {
                return true;
            }

            return false;
        } catch (error) {
            console.warn('[Parallel Events App] Error checking generation status:', error);
            return false;
        }
    }

    /**
     * Generate parallel event content
     */
    async generateParallelEvent(event = null) {
        try {
            console.log('[Parallel Events App] Generating parallel event...');

            // If no event is provided, create a temporary one using current settings
            if (!event) {
                event = {
                    style: this.currentSettings.selectedStyle,
                    customPrefix: this.currentSettings.customPrefix,
                    manual: true
                };
                console.log('[Parallel Events App] Using current settings for manual generation:', event);
            }

            const prompt = this.buildEventPrompt(event.style, event.customPrefix);
            const content = await this.callCustomAPI(prompt);

            if (content && content.trim()) {
                await this.insertEventToFloor(content);
                console.log('[Parallel Events App] Event content inserted successfully');
            } else {
                throw new Error('Generated content is empty');
            }

        } catch (error) {
            console.error('[Parallel Events App] Event generation failed:', error);
            throw error;
        }
    }

    /**
     * Build event generation prompt
     */
    buildEventPrompt(style, customPrefix) {
        console.log(`[Parallel Events App] Build prompt — style: ${style}, custom prefix length: ${customPrefix?.length || 0}`);

        // Custom style: prefix-only when set
        if (style === 'Custom' || style === '自定义') {
            if (customPrefix && customPrefix.trim()) {
                console.log('[Parallel Events App] Custom style — send prefix only');
                return customPrefix.trim();
            } else {
                console.log('[Parallel Events App] Custom style with empty prefix — default prompt');
                return `You are a professional parallel-event writer. From the current conversation, write an interesting parallel event.

Requirements:
- Related to the talk, but do not hijack the main plot
- Background event, environment shift, or a related character acting
- Third person
- 100-200 words
- Interesting and in-setting

Write the parallel event only. No preamble.`;
            }
        }

        // Built-in styles go through the style manager
        if (window.parallelEventsStyles) {
            console.log('[Parallel Events App] Using a built-in style via the style manager');
            return window.parallelEventsStyles.buildFullPrompt(style, customPrefix);
        }

        // Fallback if the style manager is missing
        console.log('[Parallel Events App] Style manager missing — fallback prompt');
        let basePrompt = `You are a professional parallel event generator. Please generate a ${style} style parallel event related to the current conversation content.

Requirements:
1. The event should be related to the current conversation content but not directly interfere with the main storyline
2. Use ${style} style and setting
3. Content should be concise and interesting, 100-200 words
4. Use third-person perspective
5. Can be background events, environmental changes, or actions of related characters

Please generate event content directly without other explanations.`;

        if (customPrefix) {
            basePrompt += `\n\nCustom requirements: ${customPrefix}`;
        }

        return basePrompt;
    }

    /**
     * Insert event content to floor
     */
    async insertEventToFloor(content) {
        try {
            if (!window.mobileContextEditor) {
                throw new Error('Context editor not available');
            }

            // Use message app's method to create new floor
            if (window.addFriendMessage) {
                await window.addFriendMessage(content, 'Parallel Event', 'system');
                console.log('[Parallel Events App] Event inserted using addFriendMessage');
            } else {
                // Fallback method
                await window.mobileContextEditor.addMessage(content, 'system');
                console.log('[Parallel Events App] Event inserted using context editor');
            }

        } catch (error) {
            console.error('[Parallel Events App] Failed to insert event:', error);
            throw error;
        }
    }

    /**
     * Call custom API
     */
    async callCustomAPI(prompt) {
        try {
            if (!window.mobileCustomAPIConfig) {
                throw new Error('Custom API config not available');
            }

            const config = window.mobileCustomAPIConfig.getCurrentConfig();
            if (!config || !config.enabled) {
                throw new Error('Custom API not configured or disabled');
            }

            console.log('[Parallel Events App] Calling custom API...');

            // Get current conversation context (like forum app)
            let contextInfo = '';
            if (window.mobileContextEditor) {
                const chatData = window.mobileContextEditor.getCurrentChatData();
                if (chatData && chatData.messages && chatData.messages.length > 0) {
                    // Get recent 5 floors for context (like forum app)
                    const recentMessages = chatData.messages.slice(-5);

                    console.log('[Parallel Events App] 📋 Taking the last 5 floors:');
                    console.log(`[Parallel Events App] total messages: ${chatData.messages.length}, using last: ${recentMessages.length}`);

                    contextInfo = recentMessages.map((msg, index) => {
                        const floorNumber = chatData.messages.length - recentMessages.length + index + 1;
                        const sender = msg.is_user ? 'User' : (msg.name || 'Character');
                        const content = msg.mes || '';

                        console.log(`[Parallel Events App] Floor ${floorNumber} — ${sender}: ${content.substring(0, 100)}...`);

                        return `[Floor ${floorNumber}] ${sender}: ${content}`;
                    }).join('\n\n');

                    console.log('[Parallel Events App] 📝 Context length:', contextInfo.length);
                }
            }

            // Build API request messages
            const userContent = contextInfo ?
                `🎯 Write a parallel event from the last 5 floors:\n\n${contextInfo}` :
                '🎯 Write a parallel event.';

            const messages = [
                {
                    role: 'system',
                    content: prompt
                },
                {
                    role: 'user',
                    content: userContent
                }
            ];

            console.log('📡 [Parallel Events API] Full API request:');
            console.log('📋 [Parallel Events API] System prompt:');
            console.log(prompt);
            console.log('\n📝 [Parallel Events API] User message:');
            console.log(userContent);
            console.log('\n📦 [Parallel Events API] Full message payload:');
            console.log(JSON.stringify(messages, null, 2));

            const response = await window.mobileCustomAPIConfig.callAPI(messages, {
                temperature: 0.8,
                max_tokens: 500
            });

            console.log('[Parallel Events App] API response received:', response);
            console.log('[Parallel Events App] Response type:', typeof response);
            console.log('[Parallel Events App] Response keys:', response ? Object.keys(response) : 'null');
            console.log('[Parallel Events App] Response content:', response?.content);
            console.log('[Parallel Events App] Content type:', typeof response?.content);

            if (!response) {
                throw new Error('API response is null or undefined');
            }

            if (!response.content) {
                throw new Error(`API response missing content field. Response: ${JSON.stringify(response)}`);
            }

            if (typeof response.content !== 'string' || response.content.trim() === '') {
                throw new Error(`API response content is invalid. Content: ${JSON.stringify(response.content)}`);
            }

            console.log('[Parallel Events App] API call successful, content length:', response.content.length);
            return response.content;

        } catch (error) {
            console.error('[Parallel Events App] API call failed:', error);
            throw error;
        }
    }

    /**
     * Start listening for floor changes
     */
    startListening() {
        if (this.isListening) {
            return;
        }

        console.log('[Parallel Events App] Starting floor monitoring...');

        if (this.floorMonitor) {
            this.floorMonitor.start();
        }

        this.isListening = true;
        this.updateUI();

        if (window.showMobileToast) {
            window.showMobileToast('🎯 Parallel event monitoring started', 'success');
        }
    }

    /**
     * Stop listening for floor changes
     */
    stopListening() {
        if (!this.isListening) {
            return;
        }

        console.log('[Parallel Events App] Stopping floor monitoring...');

        if (this.floorMonitor) {
            this.floorMonitor.stop();
        }

        this.isListening = false;
        this.updateUI();

        if (window.showMobileToast) {
            window.showMobileToast('⏹️ Parallel event monitoring stopped', 'info');
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('parallelEventsSettings');
            if (saved) {
                this.currentSettings = { ...this.getDefaultSettings(), ...JSON.parse(saved) };
                console.log('[Parallel Events App] Settings loaded:', this.currentSettings);
            }
        } catch (error) {
            console.warn('[Parallel Events App] Failed to load settings:', error);
            this.currentSettings = this.getDefaultSettings();
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('parallelEventsSettings', JSON.stringify(this.currentSettings));
            console.log('[Parallel Events App] Settings saved');
        } catch (error) {
            console.warn('[Parallel Events App] Failed to save settings:', error);
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        try {
            // Update status displays
            const listeningStatus = document.getElementById('listening-status');
            if (listeningStatus) {
                listeningStatus.textContent = this.isListening ? 'Monitoring' : 'Stopped';
                listeningStatus.className = 'status-value ' + (this.isListening ? 'active' : 'inactive');
            }

            const currentFloor = document.getElementById('current-floor');
            if (currentFloor) {
                currentFloor.textContent = this.lastFloorCount.toString();
            }

            const queueLength = document.getElementById('queue-length');
            if (queueLength) {
                queueLength.textContent = this.eventQueue.length.toString();
            }

            const processingStatus = document.getElementById('processing-status');
            if (processingStatus) {
                processingStatus.textContent = this.isProcessing ? 'Processing' : 'Idle';
                processingStatus.className = 'status-value ' + (this.isProcessing ? 'processing' : 'idle');
            }

            // Update queue display
            this.updateQueueDisplay();

        } catch (error) {
            console.warn('[Parallel Events App] UI update failed:', error);
        }
    }

    /**
     * Update queue display
     */
    updateQueueDisplay() {
        const queueContainer = document.getElementById('event-queue-display');
        if (!queueContainer) return;

        if (this.eventQueue.length === 0) {
            queueContainer.innerHTML = '<div class="queue-empty">No events in queue</div>';
            return;
        }

        const queueHTML = this.eventQueue.map(event => {
            const duration = event.startTime ?
                `Duration: ${Math.round((new Date() - event.startTime) / 1000)}s` : '';
            const completedDuration = event.completedTime && event.startTime ?
                `Duration: ${Math.round((event.completedTime - event.startTime) / 1000)}s` : '';

            return `
                <div class="queue-item" data-event-id="${event.id}">
                    <div class="queue-item-header">
                        <span>Event #${event.id.slice(-6)}</span>
                        <div class="queue-item-actions">
                            <span class="queue-item-status ${event.status}">${getStatusText(event.status)}</span>
                            ${event.status === 'failed' ?
                                '<button class="retry-btn" onclick="retryEvent(\'' + event.id + '\')">🔄</button>' : ''}
                            ${event.status !== 'processing' ?
                                '<button class="remove-btn" onclick="removeEvent(\'' + event.id + '\')">❌</button>' : ''}
                        </div>
                    </div>
                    <div class="queue-item-content">
                        <div>Style: ${event.style}</div>
                        <div>Created: ${event.timestamp.toLocaleTimeString()}</div>
                        ${event.status === 'processing' && duration ? '<div>' + duration + '</div>' : ''}
                        ${event.status === 'completed' && completedDuration ? '<div>' + completedDuration + '</div>' : ''}
                        ${event.error ? '<div class="error-text">Error: ' + event.error + '</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        queueContainer.innerHTML = queueHTML;
    }

    /**
     * Clear event queue
     */
    clearQueue() {
        this.eventQueue = [];
        this.updateUI();
        console.log('[Parallel Events App] Event queue cleared');

        if (window.showMobileToast) {
            window.showMobileToast('🗑️ Event queue cleared', 'info');
        }
    }

    /**
     * Retry failed event
     */
    retryEvent(eventId) {
        const event = this.eventQueue.find(e => e.id === eventId);
        if (event && event.status === 'failed') {
            event.status = 'pending';
            event.error = null;
            event.startTime = null;
            event.completedTime = null;
            event.failedTime = null;

            this.updateUI();
            this.processQueue();

            console.log('[Parallel Events App] Event retry requested:', eventId);
        }
    }

    /**
     * Remove event from queue
     */
    removeEvent(eventId) {
        const index = this.eventQueue.findIndex(e => e.id === eventId);
        if (index !== -1) {
            this.eventQueue.splice(index, 1);
            this.updateUI();
            console.log('[Parallel Events App] Event removed from queue:', eventId);
        }
    }

    /**
     * Manual event generation
     */
    async manualGenerate() {
        try {
            const event = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                style: this.currentSettings.selectedStyle,
                customPrefix: this.currentSettings.customPrefix,
                timestamp: new Date(),
                status: 'pending',
                changeCount: 0,
                manual: true
            };

            this.addToQueue(event);

            if (window.showMobileToast) {
                window.showMobileToast('✨ Manual event generation requested', 'info');
            }

        } catch (error) {
            console.error('[Parallel Events App] Manual generation failed:', error);
            if (window.showMobileToast) {
                window.showMobileToast('❌ Manual generation failed: ' + error.message, 'error');
            }
        }
    }
}

// Global functions for UI interaction
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pending',
        'processing': 'Processing',
        'completed': 'Completed',
        'failed': 'Failed'
    };
    return statusMap[status] || status;
}

function loadStyleOptions() {
    const selectElement = document.getElementById('event-style-select');
    if (!selectElement) return;

    if (!window.parallelEventsStyles) {
        // If style manager is not available, use default options
        const defaultStyles = ['Sci-Fi Future', 'Fantasy Magic', 'Modern Urban', 'Historical Ancient', 'Horror Suspense'];
        selectElement.innerHTML = defaultStyles.map(style =>
            `<option value="${style}">${style}</option>`
        ).join('');
        return;
    }

    // Load styles from style manager
    const availableStyles = window.parallelEventsStyles.getAvailableStyles();
    selectElement.innerHTML = availableStyles.map(style =>
        `<option value="${style}">${style}</option>`
    ).join('');
}

function retryEvent(eventId) {
    if (window.parallelEventsManager) {
        window.parallelEventsManager.retryEvent(eventId);
    }
}

function removeEvent(eventId) {
    if (window.parallelEventsManager) {
        window.parallelEventsManager.removeEvent(eventId);
    }
}

/**
 * Get parallel events app content HTML
 */
function getParallelEventsAppContent() {
    return `
        <div class="parallel-events-app">
            <div class="app-header">
                <h3>🌟 Parallel Events</h3>
                <p>Monitor floor changes and generate parallel events</p>
            </div>

            <div class="status-panel">
                <h4>📊 Status</h4>
                <div class="status-grid">
                    <div class="status-item">
                        <span class="status-label">Monitoring Status</span>
                        <span class="status-value" id="listening-status">Stopped</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Current Floor</span>
                        <span class="status-value" id="current-floor">-</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Queue Length</span>
                        <span class="status-value" id="queue-length">0</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Processing Status</span>
                        <span class="status-value" id="processing-status">Idle</span>
                    </div>
                </div>
            </div>

            <div class="controls-panel">
                <h4>⚙️ Settings</h4>
                <div class="controls-grid">
                    <div class="control-group">
                        <label class="control-label">Event Style</label>
                        <select class="control-select" id="event-style-select">
                            <!-- Style options will be loaded dynamically -->
                        </select>
                    </div>

                    <div class="control-group">
                        <label class="control-label">Custom Prefix</label>
                        <textarea class="control-textarea" id="event-custom-prefix"
                                placeholder="Enter custom event generation requirements..."></textarea>
                    </div>

                    <div class="control-group">
                        <label class="control-label">Trigger Threshold</label>
                        <input type="number" class="control-input" id="event-threshold"
                               min="1" max="50" value="5">
                    </div>

                    <div class="control-group">
                        <div class="toggle-switch">
                            <div class="toggle-input" id="event-enabled-toggle">
                                <div class="toggle-slider"></div>
                            </div>
                            <label class="toggle-label">Enable Auto Generation</label>
                        </div>
                    </div>

                    <div class="button-group">
                        <button class="btn btn-primary" id="start-listening-btn">🎯 Start Monitoring</button>
                        <button class="btn btn-secondary" id="stop-listening-btn">⏹️ Stop Monitoring</button>
                        <button class="btn btn-primary" id="generate-event-btn">✨ Generate Now</button>
                        <button class="btn btn-danger" id="clear-queue-btn">🗑️ Clear Queue</button>
                    </div>
                </div>
            </div>

            <div class="queue-panel">
                <h4>📋 Event Queue</h4>
                <div class="queue-stats">
                    <span>Total: <span id="queue-total">0</span></span>
                    <span>Pending: <span id="queue-pending">0</span></span>
                    <span>Processing: <span id="queue-processing">0</span></span>
                    <span>Completed: <span id="queue-completed">0</span></span>
                    <span>Failed: <span id="queue-failed">0</span></span>
                </div>
                <div class="queue-display" id="event-queue-display">
                    <div class="queue-empty">No events in queue</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Bind parallel events app events
 */
async function bindParallelEventsAppEvents() {
    try {
        console.log('[Parallel Events App] Binding events...');

        // Create manager if it doesn't exist
        if (!window.parallelEventsManager) {
            console.log('[Parallel Events App] Creating manager...');
            window.parallelEventsManager = new ParallelEventsApp();
        }

        // Initialize manager if not already initialized
        if (!window.parallelEventsManager.isInitialized) {
            console.log('[Parallel Events App] Initializing manager...');
            await window.parallelEventsManager.initialize();
        }

        // Load style options
        setTimeout(() => {
            loadStyleOptions();
        }, 100);

        // Bind control events
        const startBtn = document.getElementById('start-listening-btn');
        const stopBtn = document.getElementById('stop-listening-btn');
        const generateBtn = document.getElementById('generate-event-btn');
        const clearBtn = document.getElementById('clear-queue-btn');
        const styleSelect = document.getElementById('event-style-select');
        const customPrefix = document.getElementById('event-custom-prefix');
        const threshold = document.getElementById('event-threshold');
        const enabledToggle = document.getElementById('event-enabled-toggle');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                window.parallelEventsManager.startListening();
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                window.parallelEventsManager.stopListening();
            });
        }

        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                window.parallelEventsManager.manualGenerate();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the event queue?')) {
                    window.parallelEventsManager.clearQueue();
                }
            });
        }

        if (styleSelect) {
            styleSelect.addEventListener('change', (e) => {
                window.parallelEventsManager.currentSettings.selectedStyle = e.target.value;
                window.parallelEventsManager.saveSettings();
            });
        }

        if (customPrefix) {
            customPrefix.addEventListener('input', (e) => {
                window.parallelEventsManager.currentSettings.customPrefix = e.target.value;
                window.parallelEventsManager.saveSettings();
            });
        }

        if (threshold) {
            threshold.addEventListener('change', (e) => {
                window.parallelEventsManager.currentSettings.threshold = parseInt(e.target.value);
                window.parallelEventsManager.saveSettings();
            });
        }

        if (enabledToggle) {
            enabledToggle.addEventListener('click', () => {
                const isEnabled = !window.parallelEventsManager.currentSettings.enabled;
                window.parallelEventsManager.currentSettings.enabled = isEnabled;
                enabledToggle.classList.toggle('active', isEnabled);
                window.parallelEventsManager.saveSettings();
            });
        }

        // Load saved settings
        const manager = window.parallelEventsManager;
        if (styleSelect && manager.currentSettings.selectedStyle) {
            styleSelect.value = manager.currentSettings.selectedStyle;
        }
        if (customPrefix && manager.currentSettings.customPrefix) {
            customPrefix.value = manager.currentSettings.customPrefix;
        }
        if (threshold && manager.currentSettings.threshold) {
            threshold.value = manager.currentSettings.threshold;
        }
        if (enabledToggle && manager.currentSettings.enabled) {
            enabledToggle.classList.toggle('active', manager.currentSettings.enabled);
        }

        // Initial UI update
        manager.updateUI();

        console.log('[Parallel Events App] Events bound successfully');

        if (window.showMobileToast) {
            window.showMobileToast('✅ Parallel Events App Ready', 'success');
        }
    } catch (error) {
        console.error('[Parallel Events App] Event binding failed:', error);
        if (window.showMobileToast) {
            window.showMobileToast('❌ Parallel Events App initialization failed: ' + error.message, 'error');
        }
    }
}

/**
 * Debug function for troubleshooting
 */
function debugParallelEventsApp() {
    console.log('=== Parallel Events App Debug Info ===');

    console.log('1. Manager Status:');
    if (window.parallelEventsManager) {
        console.log('   ✅ Manager created');
        console.log('   - Initialized:', window.parallelEventsManager.isInitialized);
        console.log('   - Listening:', window.parallelEventsManager.isListening);
        console.log('   - Processing:', window.parallelEventsManager.isProcessing);
        console.log('   - Queue length:', window.parallelEventsManager.eventQueue.length);
        console.log('   - Settings:', window.parallelEventsManager.currentSettings);
    } else {
        console.log('   ❌ Manager not created');
    }

    console.log('2. Global Functions:');
    console.log('   - ParallelEventsApp:', typeof window.ParallelEventsApp);
    console.log('   - getParallelEventsAppContent:', typeof window.getParallelEventsAppContent);
    console.log('   - bindParallelEventsAppEvents:', typeof window.bindParallelEventsAppEvents);
    console.log('   - debugParallelEventsApp:', typeof window.debugParallelEventsApp);

    console.log('3. Dependencies:');
    console.log('   - mobileContextEditor:', typeof window.mobileContextEditor);
    console.log('   - mobileCustomAPIConfig:', typeof window.mobileCustomAPIConfig);
    console.log('   - parallelEventsStyles:', typeof window.parallelEventsStyles);

    console.log('=== Debug Info End ===');
}

// Export to global scope
window.ParallelEventsApp = ParallelEventsApp;

// Create global functions (similar to forum app)
window.getParallelEventsAppContent = getParallelEventsAppContent;
window.bindParallelEventsAppEvents = bindParallelEventsAppEvents;
window.debugParallelEventsApp = debugParallelEventsApp;

console.log('[Parallel Events App] ✅ Parallel Events App module loaded successfully');
console.log('[Parallel Events App] 💡 Use debugParallelEventsApp() to view debug info');
