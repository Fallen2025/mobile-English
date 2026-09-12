// ==Mobile Custom API Config==
// @name         Mobile Custom API Configuration
// @version      1.0.0
// @description  Mobile custom API config manager with multiple providers
// @author       cd
// @license      MIT

/**
 * Mobile custom API config manager
 * Ported from the forum app and real-time-status-bar plugin
 */
class MobileCustomAPIConfig {
    constructor() {
        this.isInitialized = false;
        this.currentSettings = this.getDefaultSettings();
        this.supportedProviders = this.getSupportedProviders();

        // Init Gemini's built-in URL
        this.geminiUrl = this.supportedProviders.gemini.defaultUrl;

        // Bind to window
        window.mobileCustomAPIConfig = this;

        console.log('[Mobile API Config] Custom API config manager created');
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            enabled: false,
            provider: 'openrouter',
            apiUrl: 'https://openrouter.ai/api/v1',
            apiKey: '',
            model: 'z-ai/glm-5.3-flash',
            temperature: 0.8,
            maxTokens: 30000,
            useProxy: false,
            proxyUrl: '',
            timeout: 30000,
            retryCount: 3,
            // Advanced settings
            customHeaders: {},
            systemPrompt: '',
            streamEnabled: false,
            availableModels: []
        };
    }

    /**
     * Supported API providers
     */
    getSupportedProviders() {
        return {
            openai: {
                name: 'OpenAI',
                defaultUrl: 'https://api.openai.com/v1',
                urlSuffix: 'chat/completions',
                modelsEndpoint: 'models',
                defaultModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'],
                authType: 'Bearer',
                requiresKey: true,
                icon: '🤖'
            },
            gemini: {
                name: 'Google Gemini',
                defaultUrl: 'https://generativelanguage.googleapis.com',
                urlSuffix: 'v1beta/models/{model}:generateContent',
                modelsEndpoint: 'v1beta/models',
                defaultModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'],
                authType: 'Key',
                requiresKey: true,
                icon: '💎'
            },
            openrouter: {
                name: 'OpenRouter',
                defaultUrl: 'https://openrouter.ai/api/v1',
                urlSuffix: 'chat/completions',
                modelsEndpoint: 'models',
                defaultModels: [
                    'z-ai/glm-5.3-flash',
                    'z-ai/glm-5.3',
                    'openai/gpt-4o',
                    'openai/gpt-4o-mini',
                    'anthropic/claude-3.5-sonnet',
                    'google/gemini-2.0-flash-001',
                    'deepseek/deepseek-chat',
                    'meta-llama/llama-3.3-70b-instruct'
                ],
                authType: 'Bearer',
                requiresKey: true,
                icon: '🛣️'
            },
            custom: {
                name: 'Custom API',
                defaultUrl: '',
                urlSuffix: 'chat/completions',
                modelsEndpoint: 'models',
                defaultModels: ['glm-5.3-flash', 'z-ai/glm-5.3-flash'],
                authType: 'Bearer',
                requiresKey: true,
                icon: '⚙️'
            }
        };
    }

    /**
     * Initialize API config manager
     */
    async initialize() {
        try {
            await this.loadSettings();
            this.createUI();
            this.bindEvents();
            this.isInitialized = true;

            console.log('[Mobile API Config] ✅ Custom API config manager initialized');
            console.log('[Mobile API Config] 📋 Current settings:', {
                provider: this.currentSettings.provider,
                enabled: this.currentSettings.enabled,
                apiUrl: this.currentSettings.apiUrl || '(not set)',
                hasApiKey: !!this.currentSettings.apiKey,
                model: this.currentSettings.model || '(not set)',
                supportedProviders: Object.keys(this.supportedProviders)
            });
            return true;
        } catch (error) {
            console.error('[Mobile API Config] ❌ Init failed:', error);
            return false;
        }
    }

    /**
     * Load settings
     */
    async loadSettings() {
        try {
            const savedSettings = localStorage.getItem('mobile_custom_api_settings');
            if (savedSettings) {
                this.currentSettings = { ...this.getDefaultSettings(), ...JSON.parse(savedSettings) };
            }
            if (!this.currentSettings.model) {
                this.currentSettings.model = 'z-ai/glm-5.3-flash';
            }

            console.log('[Mobile API Config] Settings loaded:', this.currentSettings);
        } catch (error) {
            console.error('[Mobile API Config] Failed to load settings:', error);
            this.currentSettings = this.getDefaultSettings();
        }
    }

    /**
     * Save settings
     */
    async saveSettings() {
        try {
            localStorage.setItem('mobile_custom_api_settings', JSON.stringify(this.currentSettings));
            console.log('[Mobile API Config] Settings saved');

            // Dispatch settings-updated event
            document.dispatchEvent(new CustomEvent('mobile-api-config-updated', {
                detail: this.currentSettings
            }));

            return true;
        } catch (error) {
            console.error('[Mobile API Config] Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Create API config UI
     */
    createUI() {
        // Create trigger button
        this.createTriggerButton();

        // Create config panel
        this.createConfigPanel();
    }

    /**
     * Create trigger button
     */
    createTriggerButton() {
        // Skip if button already exists
        if (document.getElementById('mobile-api-config-trigger')) {
            return;
        }

        const triggerButton = document.createElement('button');
        triggerButton.id = 'mobile-api-config-trigger';
        triggerButton.className = 'mobile-api-config-btn';
        triggerButton.innerHTML = '🔧';
        triggerButton.title = 'API config';
        triggerButton.style.cssText = `
            position: fixed;
            bottom: 200px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #8B5CF6, #EF4444);
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            z-index: 9997;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Hover
        triggerButton.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
        });

        triggerButton.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        });

        // Click
        triggerButton.addEventListener('click', () => {
            this.showConfigPanel();
        });

        document.body.appendChild(triggerButton);
        console.log('[Mobile API Config] ✅ Trigger button created');
    }

    /**
     * Create config panel
     */
    createConfigPanel() {
        if (document.getElementById('mobile-api-config-panel')) {
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'mobile-api-config-panel';
        panel.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none;
            backdrop-filter: blur(5px);
        `;

        const content = document.createElement('div');
        content.className = 'mobile-api-config-content';
        content.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 15px;
            padding: 20px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

        content.innerHTML = this.getConfigPanelHTML();
        panel.appendChild(content);
        document.body.appendChild(panel);

        console.log('[Mobile API Config] ✅ Config panel created');
    }

    /**
     * Config panel HTML
     */
    getConfigPanelHTML() {
        const providers = this.supportedProviders;
        const settings = this.currentSettings;

        return `
            <div class="mobile-api-config-header">
                <h3 style="margin: 0 0 20px 0; color: #333; text-align: center;">
                    ⚙️ API config
                </h3>
                <button id="close-api-config" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #666;
                ">×</button>
            </div>

            <div class="mobile-api-config-form">
                <!-- Enable toggle -->
                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; gap: 10px; font-weight: 500;">
                        <input type="checkbox" id="api-enabled" ${settings.enabled ? 'checked' : ''}>
                        Enable custom API
                    </label>
                </div>

                <!-- Provider select -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Provider:</label>
                    <select id="api-provider" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; background-color: #fff; color: #000;">
                        ${Object.entries(providers).map(([key, provider]) =>
                            `<option value="${key}" ${key === settings.provider ? 'selected' : ''}>${provider.icon} ${provider.name}</option>`
                        ).join('')}
                    </select>
                </div>

                <!-- API URL -->
                <div style="margin-bottom: 15px;" id="api-url-section">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">API URL:</label>
                    <input type="text" id="api-url" placeholder="https://api.openai.com"
                           value="${settings.apiUrl}"
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;background-color: #fff;color: #000;">
                    <small style="color: #666; font-size: 12px;">Leave blank to use the default URL</small>
                </div>

                <!-- API key -->
                <div style="margin-bottom: 15px;" id="api-key-section">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">API key:</label>
                    <div style="position: relative;">
                        <input type="password" id="api-key" placeholder="sk-... or AIza..."
                               value="${settings.apiKey}"
                               style="width: 100%; padding: 8px 35px 8px 8px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box;background-color: #fff;color: #000;">
                        <button type="button" id="toggle-api-key" style="
                            position: absolute;
                            right: 8px;
                            top: 50%;
                            transform: translateY(-50%);
                            background: none;
                            border: none;
                            cursor: pointer;
                            color: #666;
                        ">👁️</button>
                    </div>
                </div>

                <!-- Model select -->
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Model:</label>
                    <div style="display: flex; gap: 10px;">
                        <select id="api-model" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="">Select a model...</option>
                        </select>
                        <button type="button" id="refresh-models" style="
                            padding: 8px 15px;
                            background: #007bff;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                        ">📥</button>
                    </div>
                </div>

                <!-- Advanced settings -->
                <details style="margin-bottom: 15px;">
                    <summary style="cursor: pointer; font-weight: 500; margin-bottom: 10px;color: #000;">⚙️ Advanced settings</summary>

                    <div style="margin-left: 15px;">
                        <!-- Temperature -->
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;color: #000;">Temperature (0-2):</label>
                            <input type="range" id="api-temperature" min="0" max="2" step="0.1"
                                   value="${settings.temperature}"
                                   style="width: 100%;">
                            <span id="temperature-value" style="font-size: 12px; color: #666;">${settings.temperature}</span>
                        </div>

                        <!-- Max tokens -->
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">Max tokens:</label>
                            <input type="number" id="api-max-tokens" min="1" max="80000"
                                   value="${settings.maxTokens}"
                                   style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;background-color: #fff;color: #000;">
                        </div>

                        <!-- System prompt -->
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">System prompt:</label>
                            <textarea id="api-system-prompt" rows="3"
                                      placeholder="Optional system prompt..."
                                      style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px; resize: vertical; box-sizing: border-box;">${settings.systemPrompt}</textarea>
                        </div>
                    </div>
                </details>

                <!-- Buttons -->
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="button" id="test-api-connection" style="
                        flex: 1;
                        padding: 12px;
                        background: #28a745;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                    ">🧪 Test connection</button>

                    <button type="button" id="save-api-config" style="
                        flex: 1;
                        padding: 12px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                    ">💾 Save config</button>
                </div>

                <!-- Status -->
                <div id="api-config-status" style="
                    margin-top: 15px;
                    padding: 10px;
                    border-radius: 5px;
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    font-size: 14px;
                    display: none;
                "></div>
            </div>
        `;
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Close panel
        $(document).on('click', '#close-api-config', () => {
            this.hideConfigPanel();
        });

        // Click outside to close
        $(document).on('click', '#mobile-api-config-panel', (e) => {
            if (e.target.id === 'mobile-api-config-panel') {
                this.hideConfigPanel();
            }
        });

        // Provider changed
        $(document).on('change', '#api-provider', (e) => {
            this.onProviderChange(e.target.value);
        });

        // Toggle key visibility
        $(document).on('click', '#toggle-api-key', () => {
            const keyInput = document.getElementById('api-key');
            const isPassword = keyInput.type === 'password';
            keyInput.type = isPassword ? 'text' : 'password';
            document.getElementById('toggle-api-key').textContent = isPassword ? '🙈' : '👁️';
        });

        // Temperature slider
        $(document).on('input', '#api-temperature', (e) => {
            document.getElementById('temperature-value').textContent = e.target.value;
        });

        // Refresh model list
        $(document).on('click', '#refresh-models', () => {
            this.refreshModels();
        });

        // Test connection
        $(document).on('click', '#test-api-connection', () => {
            this.testConnection();
        });

        // Save config
        $(document).on('click', '#save-api-config', () => {
            this.saveConfigFromUI();
        });
    }

    /**
     * Show config panel
     */
    showConfigPanel() {
        const panel = document.getElementById('mobile-api-config-panel');
        if (panel) {
            panel.style.display = 'block';
            this.updateUIFromSettings();

            // Keep URL visibility in sync
            const currentProvider = this.currentSettings.provider;
            this.onProviderChange(currentProvider);
        }
    }

    // Alias used by forum control / index.js
    showAPIPanel() {
        this.showConfigPanel();
    }

    /**
     * Hide config panel
     */
    hideConfigPanel() {
        const panel = document.getElementById('mobile-api-config-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * On provider change
     */
    onProviderChange(providerKey) {
        const provider = this.supportedProviders[providerKey];
        if (!provider) return;

        console.log('[Mobile API Config] Provider switched:', providerKey, provider);

        // Show/hide URL field
        const urlSection = document.getElementById('api-url-section');
        const urlInput = document.getElementById('api-url');

        if (providerKey === 'gemini') {
            // Gemini: hide URL field, use built-in URL
            if (urlSection) {
                urlSection.style.display = 'none';
            }
            // Set Gemini URL internally; don't show it
            this.geminiUrl = provider.defaultUrl;
        } else {
            // OpenAI / OpenRouter / custom: show editable URL
            if (urlSection) {
                urlSection.style.display = 'block';
            }

            // Restore or set non-Gemini URL
            if (urlInput) {
                // Restore last saved URL for this provider, else use default
                const savedUrl = this.getNonGeminiUrl(providerKey);
                urlInput.value = savedUrl || provider.defaultUrl;
                urlInput.placeholder = provider.defaultUrl;
            }
        }

        // Update API key placeholder
        const keyInput = document.getElementById('api-key');
        if (keyInput) {
            if (providerKey === 'openai') {
                keyInput.placeholder = 'sk-...';
            } else if (providerKey === 'gemini') {
                keyInput.placeholder = 'AIza...';
            } else if (providerKey === 'openrouter') {
                keyInput.placeholder = 'sk-or-...';
            } else {
                keyInput.placeholder = 'Enter API key...';
            }
        }

        // Show/hide key field
        const keySection = document.getElementById('api-key-section');
        if (keySection) {
            keySection.style.display = provider.requiresKey ? 'block' : 'none';
        }

        const savedModels = (this.currentSettings.provider === providerKey && this.currentSettings.availableModels && this.currentSettings.availableModels.length)
            ? this.currentSettings.availableModels
            : provider.defaultModels;
        this.updateModelList(savedModels);
    }

    /**
     * Get saved URL for a non-Gemini provider
     */
    getNonGeminiUrl(providerKey) {
        const saved = localStorage.getItem(`mobile_api_url_${providerKey}`);
        return saved || '';
    }

    /**
     * Save URL for a non-Gemini provider
     */
    saveNonGeminiUrl(providerKey, url) {
        if (providerKey !== 'gemini') {
            localStorage.setItem(`mobile_api_url_${providerKey}`, url);
        }
    }


    /**
     * Extra headers for OpenRouter (recommended by their API docs)
     */
    getProviderHeaders(provider, apiKey) {
        const headers = { 'Content-Type': 'application/json' };
        if (provider !== 'gemini' && apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        if (provider === 'openrouter') {
            headers['HTTP-Referer'] = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://sillytavern.app';
            headers['X-Title'] = 'SillyTavern Mobile';
        }
        return headers;
    }

    /**
     * Update model list
     */
    updateModelList(models) {
        const modelSelect = document.getElementById('api-model');
        if (!modelSelect) return;

        modelSelect.innerHTML = '<option value="">Select a model...</option>';

        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            if (model === this.currentSettings.model) {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });
    }

    /**
     * Sync UI from settings
     */
    updateUIFromSettings() {
        const settings = this.currentSettings;

        // Update fields
        const elements = {
            'api-enabled': settings.enabled,
            'api-provider': settings.provider,
            'api-url': settings.apiUrl,
            'api-key': settings.apiKey,
            'api-model': settings.model,
            'api-temperature': settings.temperature,
            'api-max-tokens': settings.maxTokens,
            'api-system-prompt': settings.systemPrompt
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        // Update temperature label
        const tempValue = document.getElementById('temperature-value');
        if (tempValue) {
            tempValue.textContent = settings.temperature;
        }

        const provider = this.supportedProviders[settings.provider];
        const models = (settings.availableModels && settings.availableModels.length)
            ? settings.availableModels
            : (provider?.defaultModels || []);
        this.updateModelList(models);
        const modelSelect = document.getElementById('api-model');
        if (modelSelect && settings.model) {
            if (![...modelSelect.options].some(o => o.value === settings.model)) {
                const opt = document.createElement('option');
                opt.value = settings.model;
                opt.textContent = settings.model;
                modelSelect.appendChild(opt);
            }
            modelSelect.value = settings.model;
        }
    }

    /**
     * Save config from UI
     */
    async saveConfigFromUI() {
        try {
            const provider = document.getElementById('api-provider')?.value || 'openai';
            let apiUrl;

            if (provider === 'gemini') {
                // Gemini uses the built-in URL
                apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
            } else {
                // Other providers: read URL from the field and save it
                apiUrl = document.getElementById('api-url')?.value || '';
                this.saveNonGeminiUrl(provider, apiUrl);
            }

            // Collect form data
            const formData = {
                enabled: document.getElementById('api-enabled')?.checked || false,
                provider: provider,
                apiUrl: apiUrl,
                apiKey: document.getElementById('api-key')?.value || '',
                model: document.getElementById('api-model')?.value || '',
                temperature: parseFloat(document.getElementById('api-temperature')?.value || 0.8),
                maxTokens: parseInt(document.getElementById('api-max-tokens')?.value || 1500),
                systemPrompt: document.getElementById('api-system-prompt')?.value || '',
                availableModels: Array.from(document.getElementById('api-model')?.options || [])
                    .map(opt => opt.value)
                    .filter(v => v)
            };

            // Validate required fields
            const providerConfig = this.supportedProviders[formData.provider];
            if (providerConfig?.requiresKey && !formData.apiKey) {
                this.showStatus('❌ Enter an API key', 'error');
                return;
            }

            // Update settings
            this.currentSettings = { ...this.currentSettings, ...formData };

            // Save to localStorage
            const saved = await this.saveSettings();

            if (saved) {
                this.showStatus('✅ Config saved', 'success');
                setTimeout(() => {
                    this.hideConfigPanel();
                }, 1500);
            } else {
                this.showStatus('❌ Save failed', 'error');
            }

        } catch (error) {
            console.error('[Mobile API Config] Failed to save config:', error);
            this.showStatus('❌ Save failed: ' + error.message, 'error');
        }
    }

    /**
     * Refresh model list
     */
    async refreshModels() {
        const provider = document.getElementById('api-provider')?.value || this.currentSettings.provider;
        let apiUrl;

        if (provider === 'gemini') {
            // Gemini uses the built-in URL, not the input field
            apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
        } else {
            // Other providers read URL from the input
            apiUrl = document.getElementById('api-url')?.value || '';
        }

        const apiKey = document.getElementById('api-key')?.value || '';

        console.log('[Mobile API Config] Refreshing model list:', {
            provider,
            apiUrl: apiUrl ? 'set' : 'not set',
            apiKey: apiKey ? 'set' : 'not set',
            isGemini: provider === 'gemini'
        });

        if (!apiUrl) {
            this.showStatus('❌ Enter an API URL first', 'error');
            return;
        }

        if (!apiKey) {
            this.showStatus('❌ Enter an API key first', 'error');
            return;
        }

        this.showStatus('🔄 Fetching model list...', 'info');

        try {
            const models = await this.fetchModels(provider, apiUrl, apiKey);

            if (models && models.length > 0) {
                this.updateModelList(models);
                this.currentSettings.availableModels = models;
                this.showStatus(`✅ Fetched ${models.length} models`, 'success');
                console.log('[Mobile API Config] Model list fetched:', models);
            } else {
                // Using default model list
                const defaultModels = this.supportedProviders[provider]?.defaultModels || [];
                this.updateModelList(defaultModels);
                this.showStatus(`⚠️ Using default model list (${defaultModels.length} )`, 'warning');
                console.warn('[Mobile API Config] Using default model list:', defaultModels);
            }
        } catch (error) {
            console.error('[Mobile API Config] Failed to fetch models:', error);

            // Fall back to default model list
            const defaultModels = this.supportedProviders[provider]?.defaultModels || [];
            if (defaultModels.length > 0) {
                this.updateModelList(defaultModels);
                this.showStatus(`⚠️ Network request failed; using default model list (${defaultModels.length} )`, 'warning');
            } else {
                this.showStatus('❌ Failed to fetch models: ' + error.message, 'error');
            }
        }
    }

        /**
     * Fetch model list (same logic as real-time-status-bar)
     */
    async fetchModels(provider, apiUrl, apiKey) {
        const providerConfig = this.supportedProviders[provider];
        if (!providerConfig) {
            throw new Error('Unsupported provider');
        }

        let modelsUrl = this.buildModelsUrl(provider, apiUrl);

        // Build headers + auth
        const headers = this.getProviderHeaders(provider, apiKey);
        if (providerConfig.requiresKey && apiKey && provider === 'gemini') {
            modelsUrl += `?key=${apiKey}`;
        }

        console.log('[Mobile API Config] Requesting model list:', {
            provider: provider,
            url: modelsUrl.replace(apiKey || '', '[HIDDEN]'),
            headers: { ...headers, Authorization: headers.Authorization ? 'Bearer [HIDDEN]' : undefined }
        });

        try {
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: headers
                // No timeout option — some browsers reject it
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Mobile API Config] Model list request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('[Mobile API Config] Raw model list response:', data);

            // Parse response per provider
            let models = [];
            if (provider === 'gemini') {
                // Gemini response: { models: [{ name: "models/gemini-pro", ... }] }
                if (data.models && Array.isArray(data.models)) {
                    models = data.models
                        .filter(model => model.supportedGenerationMethods?.includes('generateContent'))
                        .map(model => model.name.replace('models/', ''));
                } else {
                    console.warn('[Mobile API Config] Unexpected Gemini response shape:', data);
                    // Unexpected shape — use default models
                    models = providerConfig.defaultModels;
                }
            } else {
                // OpenAI-compatible format
                if (data.data && Array.isArray(data.data)) {
                    // Standard OpenAI shape
                    models = data.data.map(model => model.id);
                } else if (Array.isArray(data)) {
                    // Bare array shape
                    models = data.map(model => model.id || model.name || model);
                } else {
                    console.warn('[Mobile API Config] Unexpected OpenAI-compatible response shape:', data);
                    models = providerConfig.defaultModels;
                }
            }

            const filteredModels = models.filter(model => typeof model === 'string' && model.length > 0);
            console.log('[Mobile API Config] Parsed model list:', filteredModels);

            return filteredModels.length > 0 ? filteredModels : providerConfig.defaultModels;

        } catch (fetchError) {
            console.error('[Mobile API Config] Network request failed:', fetchError);
            // On network failure, return default models
            return providerConfig.defaultModels;
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        const provider = document.getElementById('api-provider')?.value || this.currentSettings.provider;
        let apiUrl;

        if (provider === 'gemini') {
            // Gemini uses the built-in URL, not the input field
            apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
        } else {
            // Other providers read URL from the input
            apiUrl = document.getElementById('api-url')?.value || '';
        }

        const apiKey = document.getElementById('api-key')?.value || '';
        const model = document.getElementById('api-model')?.value || '';

        if (!apiUrl) {
            this.showStatus('❌ Enter an API URL first', 'error');
            return;
        }

        const providerConfig = this.supportedProviders[provider];
        if (providerConfig?.requiresKey && !apiKey) {
            this.showStatus('❌ Enter an API key first', 'error');
            return;
        }

        if (!model) {
            this.showStatus('❌ Select a model first', 'error');
            return;
        }

        this.showStatus('🧪 Testing connection...', 'info');

        try {
            const result = await this.testAPICall(provider, apiUrl, apiKey, model);
            if (result.success) {
                this.showStatus('✅ Connection test succeeded!', 'success');
            } else {
                this.showStatus('❌ Connection test failed: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('[Mobile API Config] Connection test failed:', error);
            this.showStatus('❌ Connection test failed: ' + error.message, 'error');
        }
    }

    /**
     * Run a test API call
     */
    async testAPICall(provider, apiUrl, apiKey, model) {
        const providerConfig = this.supportedProviders[provider];

        // Build request URL
        let requestUrl = apiUrl.trim();
        if (!requestUrl.endsWith('/')) {
            requestUrl += '/';
        }

        // Build URL per provider
        if (provider === 'gemini') {
            // Gemini uses a special URL and passes the key as a query param
            requestUrl += providerConfig.urlSuffix.replace('{model}', model);
            if (apiKey) {
                requestUrl += `?key=${apiKey}`;
            }
        } else {
            // OpenAI / OpenRouter / custom use the standard URL shape
            requestUrl += providerConfig.urlSuffix.replace('{model}', model);
        }

        // Build headers + auth (OpenRouter also gets HTTP-Referer / X-Title)
        const headers = this.getProviderHeaders(provider, apiKey);

        // Build request
        const requestBody = this.buildTestRequestBody(provider, model);

        console.log('[Mobile API Config] Test request:', {
            provider: provider,
            url: requestUrl.replace(apiKey || '', '[HIDDEN]'),
            headers: { ...headers, Authorization: headers.Authorization ? 'Bearer [HIDDEN]' : undefined },
            body: requestBody
        });

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            timeout: 15000
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        }

        const data = await response.json();
        console.log('[Mobile API Config] Test response:', data);

        return { success: true, data: data };
    }

    /**
     * Build test request body (OpenAI-compatible)
     */
    buildTestRequestBody(provider, model) {
        const testMessage = "Hello! This is a test message from Mobile API Config.";

        if (provider === 'gemini') {
            // Gemini API format
            return {
                contents: [{
                    parts: [{ text: testMessage }]
                }],
                generationConfig: {
                    maxOutputTokens: 50,
                    temperature: 0.7
                }
            };
        } else {
            // OpenAI-compatible format (OpenAI, OpenRouter, custom)
            return {
                model: model,
                messages: [{ role: 'user', content: testMessage }],
                max_tokens: 50,
                temperature: 0.7
            };
        }
    }

    /**
     * Show status
     */
    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('api-config-status');
        if (!statusDiv) return;

        const colors = {
            info: '#17a2b8',
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107'
        };

        statusDiv.style.display = 'block';
        statusDiv.style.color = colors[type] || colors.info;
        statusDiv.textContent = message;

        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Get current API config (for other modules)
     */
    getCurrentConfig() {
        return { ...this.currentSettings };
    }

    /**
     * Call the API (for other modules)
     */
    async callAPI(messages, options = {}) {
        if (!this.currentSettings.enabled) {
            throw new Error('Custom API is not enabled');
        }

        const provider = this.currentSettings.provider;
        let apiUrl;

        if (provider === 'gemini') {
            // Gemini uses the built-in URL
            apiUrl = this.geminiUrl || this.supportedProviders.gemini.defaultUrl;
        } else {
            // Other providers use the saved URL
            apiUrl = this.currentSettings.apiUrl || this.supportedProviders[provider]?.defaultUrl;
        }

        const apiKey = this.currentSettings.apiKey;
        const model = this.currentSettings.model;

        if (!apiUrl || !model) {
            throw new Error('API config is incomplete');
        }

        const providerConfig = this.supportedProviders[provider];
        if (providerConfig?.requiresKey && !apiKey) {
            throw new Error('API key is missing');
        }

        // CORS warning
        if (provider === 'gemini' && window.location.protocol === 'http:') {
            console.warn('⚠️ [Mobile API Config] CORS warning: calling Gemini from the browser may be blocked');
            console.warn('Use a backend proxy or HTTPS to avoid CORS issues');
        }

        // Build request
        let requestUrl = apiUrl.trim();
        if (!requestUrl.endsWith('/')) {
            requestUrl += '/';
        }

        // Build URL per provider
        if (provider === 'gemini') {
            // Gemini uses a special URL and passes the key as a query param
            requestUrl += providerConfig.urlSuffix.replace('{model}', model);
            if (apiKey) {
                requestUrl += `?key=${apiKey}`;
            }
        } else {
            // OpenAI / OpenRouter / custom use the standard URL shape
            requestUrl += providerConfig.urlSuffix.replace('{model}', model);
        }

        const headers = this.getProviderHeaders(provider, apiKey);

        const requestBody = this.buildRequestBody(provider, model, messages, options);

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            timeout: this.currentSettings.timeout || 30000
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed: HTTP ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return this.parseAPIResponse(provider, data);
    }

    /**
     * Build API request body (OpenAI-compatible)
     */
    buildRequestBody(provider, model, messages, options) {
        const settings = this.currentSettings;

        if (provider === 'gemini') {
            // Gemini API format
            const contents = [];

            // Convert message format
            messages.forEach(msg => {
                if (msg.role === 'system') {
                    // Prefix the first user message with the system text
                    if (contents.length === 0) {
                        contents.push({
                            parts: [{ text: msg.content + '\n\n' }]
                        });
                    }
                } else if (msg.role === 'user') {
                    const existingText = contents.length > 0 ? contents[contents.length - 1].parts[0].text : '';
                    if (contents.length > 0 && !contents[contents.length - 1].role) {
                        // Merge into the existing system message
                        contents[contents.length - 1].parts[0].text = existingText + msg.content;
                    } else {
                        contents.push({
                            parts: [{ text: msg.content }]
                        });
                    }
                } else if (msg.role === 'assistant') {
                    contents.push({
                        role: 'model',
                        parts: [{ text: msg.content }]
                    });
                }
            });

            // Add system prompt
            if (settings.systemPrompt && contents.length === 0) {
                contents.push({
                    parts: [{ text: settings.systemPrompt }]
                });
            }

            return {
                contents: contents,
                generationConfig: {
                    maxOutputTokens: options.maxTokens || settings.maxTokens,
                    temperature: options.temperature || settings.temperature,
                    ...options.customParams
                }
            };
        } else {
            // OpenAI-compatible format (OpenAI, OpenRouter, custom)
            const body = {
                model: model,
                messages: messages,
                max_tokens: options.maxTokens || settings.maxTokens,
                temperature: options.temperature || settings.temperature,
                ...options.customParams
            };

            // Add system prompt
            if (settings.systemPrompt) {
                body.messages = [
                    { role: 'system', content: settings.systemPrompt },
                    ...body.messages
                ];
            }

            return body;
        }
    }

    /**
     * Parse API response (OpenAI-compatible)
     */
    parseAPIResponse(provider, data) {
        if (provider === 'gemini') {
            // Gemini response format
            return {
                content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
                usage: data.usageMetadata
            };
        } else {
            // OpenAI-compatible format (OpenAI, OpenRouter, custom)
            return {
                content: data.choices?.[0]?.message?.content || '',
                usage: data.usage
            };
        }
    }

    /**
     * Check whether the API is ready
     */
    isAPIAvailable() {
        return this.currentSettings.enabled &&
               this.currentSettings.apiUrl &&
               this.currentSettings.model &&
               (
                   !this.supportedProviders[this.currentSettings.provider]?.requiresKey ||
                   this.currentSettings.apiKey
               );
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentSettings: { ...this.currentSettings, apiKey: this.currentSettings.apiKey ? '[HIDDEN]' : '' },
            supportedProviders: Object.keys(this.supportedProviders),
            isAPIAvailable: this.isAPIAvailable(),
            providerConfig: this.supportedProviders[this.currentSettings.provider] || null
        };
    }

    /**
     * Debug: inspect current config
     */
    debugConfig() {
        console.group('🔧 [Mobile API Config] Config debug');
        console.log('✅ Initialized:', this.isInitialized);
        console.log('📋 Current settings:', {
            provider: this.currentSettings.provider,
            enabled: this.currentSettings.enabled,
            apiUrl: this.currentSettings.apiUrl || '(not set)',
            hasApiKey: !!this.currentSettings.apiKey,
            model: this.currentSettings.model || '(not set)',
            temperature: this.currentSettings.temperature,
            maxTokens: this.currentSettings.maxTokens
        });
        console.log('🌐 Supported providers:', Object.keys(this.supportedProviders));
        console.log('⚙️ Current provider config:', this.supportedProviders[this.currentSettings.provider]);
        console.log('🔗 API available:', this.isAPIAvailable());

        // Read current UI values
        const currentProvider = document.getElementById('api-provider')?.value;
        const currentUrl = document.getElementById('api-url')?.value;
        const currentKey = document.getElementById('api-key')?.value;

        console.log('🔧 UI element state:', {
            'api-provider': currentProvider || '(not found)',
            'api-url': currentUrl || '(not found)',
            'api-key': document.getElementById('api-key') ? (currentKey ? 'filled' : 'empty') : '(not found)',
            'api-model': document.getElementById('api-model')?.value || '(not found)'
        });

        // Test URL build
        const provider = currentProvider || this.currentSettings.provider || 'gemini';
        const apiUrl = currentUrl || this.currentSettings.apiUrl || this.supportedProviders[provider]?.defaultUrl;
        if (apiUrl) {
            const modelsUrl = this.buildModelsUrl(provider, apiUrl);
            console.log('🔗 Current provider:', provider);
            console.log('🔗 Base URL:', apiUrl);
            console.log('🔗 Expected models URL:', modelsUrl);

            // Validate URL
            if (provider === 'gemini' && !modelsUrl.includes('v1beta')) {
                console.warn('⚠️ Warning: Gemini URL should include v1beta');
            }
        }

        console.groupEnd();
    }

    /**
     * Build GET /models URL.
     * OpenAI:     {base}/v1/models
     * OpenRouter: {base}/api/v1/models
     * Custom:     {base}/models  (or {base}/v1/models if the user already included /v1)
     */
    buildModelsUrl(provider, apiUrl) {
        let base = (apiUrl || '').trim().replace(/\/+$/, '');
        const providerConfig = this.supportedProviders[provider] || {};

        if (provider === 'gemini') {
            if (!base.includes('/v1beta/models')) {
                if (base.endsWith('/v1')) {
                    base = base.replace(/\/v1$/, '/v1beta/models');
                } else {
                    base += '/v1beta/models';
                }
            }
            return base;
        }

        if (provider === 'openai' && !/\/v1$/.test(base) && !base.includes('/models')) {
            base += '/v1';
        }
        if (provider === 'openrouter' && !base.includes('/api/v1') && !base.includes('/models')) {
            if (base === 'https://openrouter.ai' || base === 'https://openrouter.ai/') {
                base = 'https://openrouter.ai/api/v1';
            } else if (base === 'https://openrouter.ai/api') {
                base += '/v1';
            }
        }

        if (base.endsWith('/models')) {
            return base;
        }
        const endpoint = providerConfig.modelsEndpoint || 'models';
        return `${base}/${endpoint}`;
    }

    /**
     * Manual model-fetch test (debug)
     */
    async testModelFetch() {
        console.log('[Mobile API Config] 🧪 Starting manual model-fetch test...');

        const provider = document.getElementById('api-provider')?.value || this.currentSettings.provider;
        const apiUrl = document.getElementById('api-url')?.value || this.currentSettings.apiUrl;
        const apiKey = document.getElementById('api-key')?.value || this.currentSettings.apiKey;

        console.log('Test params:', { provider, apiUrl: apiUrl ? 'set' : 'not set', apiKey: apiKey ? 'set' : 'not set' });

        if (!apiUrl || !apiKey) {
            console.error('Missing required params');
            return;
        }

        try {
            const models = await this.fetchModels(provider, apiUrl, apiKey);
            console.log('✅ Test succeeded, models:', models);
            return models;
        } catch (error) {
            console.error('❌ Test failed:', error);
            return null;
        }
    }
}

// Auto-init
jQuery(document).ready(() => {
    // Wait briefly so other modules can load
    setTimeout(() => {
        if (!window.mobileCustomAPIConfig) {
            const apiConfig = new MobileCustomAPIConfig();
            apiConfig.initialize().then(success => {
                if (success) {
                    console.log('[Mobile API Config] ✅ Custom API config module ready');
                } else {
                    console.error('[Mobile API Config] ❌ Custom API config module failed to init');
                }
            });
            // Expose instance on window
            window.mobileCustomAPIConfig = apiConfig;
        }
    }, 1000);
});

// Export class and instance to window
window.MobileCustomAPIConfig = MobileCustomAPIConfig;

// Global helpers
window.fixGeminiConfig = function() {
    console.log('🔧 Fixing Gemini config...');

    const config = window.mobileCustomAPIConfig;
    if (!config) {
        console.error('❌ API config manager not initialized');
        return;
    }

    // Force the correct Gemini config
    const providerSelect = document.getElementById('api-provider');

    if (providerSelect) {
        providerSelect.value = 'gemini';
    }

    // Fire provider-change (hides URL field, sets built-in URL)
    config.onProviderChange('gemini');

    console.log('✅ Config fixed. Check that:');
    console.log('1. 💎 Google Gemini is selected');
    console.log('2. URL field is hidden (built-in URL)');
    console.log('3. API key starts with AIza (Google AI)');
    console.log('4. Click 📥 to fetch models');

    // Show debug info
    config.debugConfig();
};

// Console hint
console.log(`
🚀 [Mobile API Config] Debug commands:

   Inspect config: window.mobileCustomAPIConfig.debugConfig()
   Manual fetch test: await window.mobileCustomAPIConfig.testModelFetch()
   Fix Gemini config: window.fixGeminiConfig()
`);
