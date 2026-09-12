/**
 * Context Monitor Integration
 * Helps other components get and use ContextMonitor safely
 */

class ContextMonitorIntegration {
    constructor() {
        this.isReady = false;
        this.contextMonitor = null;
        this.readyPromise = null;

        console.log('[Context Monitor Integration] helper created');
        this.init();
    }

    async init() {
        console.log('[Context Monitor Integration] initializing...');

        this.readyPromise = this.waitForContextMonitor();

        try {
            this.contextMonitor = await this.readyPromise;
            this.isReady = true;
            console.log('[Context Monitor Integration] ✅ ContextMonitor ready');

            this.notifyComponents();
        } catch (error) {
            console.error('[Context Monitor Integration] ❌ ContextMonitor init failed:', error);
        }
    }

    async waitForContextMonitor() {
        if (window.contextMonitor && !window.contextMonitor.isTemporary) {
            return window.contextMonitor;
        }

        return new Promise((resolve, reject) => {
            const handleReady = (event) => {
                window.removeEventListener('contextMonitorReady', handleReady);
                resolve(event.detail.contextMonitor);
            };

            window.addEventListener('contextMonitorReady', handleReady);

            setTimeout(() => {
                window.removeEventListener('contextMonitorReady', handleReady);
                reject(new Error('ContextMonitor wait timed out'));
            }, 15000);

            const checkInterval = setInterval(() => {
                if (window.contextMonitor && !window.contextMonitor.isTemporary) {
                    clearInterval(checkInterval);
                    window.removeEventListener('contextMonitorReady', handleReady);
                    resolve(window.contextMonitor);
                }
            }, 500);
        });
    }

    notifyComponents() {
        console.log('[Context Monitor Integration] notifying other components...');

        if (window.messageRenderer) {
            try {
                window.messageRenderer.contextMonitor = this.contextMonitor;
                console.log('[Context Monitor Integration] MessageRenderer.contextMonitor updated');
            } catch (error) {
                console.error('[Context Monitor Integration] failed to update MessageRenderer:', error);
            }
        }

        this.updateGlobalReferences();

        window.dispatchEvent(new CustomEvent('contextMonitorIntegrationReady', {
            detail: {
                contextMonitor: this.contextMonitor,
                integration: this
            }
        }));
    }

    updateGlobalReferences() {
        window.contextMonitor = this.contextMonitor;
        window.globalContextMonitor = this.contextMonitor;
        window.mobileContextMonitor = this.contextMonitor;

        console.log('[Context Monitor Integration] global refs updated');
    }

    async getContextMonitor() {
        if (this.isReady && this.contextMonitor) {
            return this.contextMonitor;
        }

        await this.readyPromise;
        return this.contextMonitor;
    }

    isContextMonitorReady() {
        return this.isReady && this.contextMonitor && !this.contextMonitor.isTemporary;
    }

    async safeCall(methodName, ...args) {
        try {
            const monitor = await this.getContextMonitor();
            if (monitor && typeof monitor[methodName] === 'function') {
                return await monitor[methodName](...args);
            } else {
                console.warn(`[Context Monitor Integration] method ${methodName} does not exist`);
                return null;
            }
        } catch (error) {
            console.error(`[Context Monitor Integration] ${methodName} failed:`, error);
            return null;
        }
    }

    async extractFromCurrentChat() {
        return await this.safeCall('extractFromCurrentChat');
    }

    async getCurrentChatMessages() {
        return await this.safeCall('getCurrentChatMessages');
    }

    async extractMessagesForFriend(friendId, friendName) {
        return await this.safeCall('extractMessagesForFriend', friendId, friendName);
    }

    parseMessageFormat(messageContent) {
        if (this.isReady && this.contextMonitor) {
            return this.contextMonitor.parseMessageFormat(messageContent);
        }
        return null;
    }
}

window.contextMonitorIntegration = new ContextMonitorIntegration();

window.getContextMonitorSafe = async function() {
    return await window.contextMonitorIntegration.getContextMonitor();
};

window.isContextMonitorAvailable = function() {
    return window.contextMonitorIntegration.isContextMonitorReady();
};

window.ensureContextMonitor = async function() {
    try {
        return await window.contextMonitorIntegration.getContextMonitor();
    } catch (error) {
        console.error('[Context Monitor Integration] ensureContextMonitor failed:', error);
        return null;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Context Monitor Integration] DOM ready');
    });
} else {
    console.log('[Context Monitor Integration] helper ready');
}

console.log('[Context Monitor Integration] module loaded');
