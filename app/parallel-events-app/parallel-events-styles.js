// ==Parallel Events style manager==
// @name         Parallel Events Styles
// @version      1.0.0
// @description  Style templates used to generate parallel events
// @author       Assistant

/**
 * Parallel Events style manager
 * Built-in templates + custom styles + optional global prefix
 */
class ParallelEventsStyles {
    constructor() {
        this.styles = this.initializeStyles();
        this.customStyles = new Map();
        this.customPrefix = '';
        this.loadPrefixSettings();
        this.loadCustomStyles();

        console.log('[Parallel Events Styles] Style manager created');
    }

    /**
     * Built-in style prompts
     * Keys are English. Chinese aliases still resolve in getStylePrompt.
     */
    initializeStyles() {
        return {
            'NTR': `You are a professional adult-fiction writer. From the current conversation, write a scene that is NOT in the current room: the character having sex or foreplay with someone who is not the protagonist.

Style:
- Precise physical action
- Rich interiority
- Guilt toward the protagonist, or another private reaction
- 1000-1400 words

Write the parallel event only. No preamble.`,

            "Master's task": `You are a professional adult-fiction writer. From the current conversation, write a scene in the current location where the other party is carrying out a secret task from an unknown master.

Style:
- Precise physical action
- Rich interiority
- Guilt toward the protagonist, or another private reaction
- 1000-1400 words

Possible texture: a hidden vibe, rope under clothes, no underwear, or orders to seduce the protagonist.

Write the parallel event only. No preamble.`,

            'Incoming message': `AI behavior and output format when another character DMs the user.

## I. Rules

1. Trigger
   - Force this rule when the user is in a one-to-one in-app chat with any character, or when a character messages the user first.
   - Does NOT apply to character-to-character DMs.
2. Role
   - Your only job is to play and generate the NON-user side.
3. Hard bans
   - Do not speak as the user. Do not repeat the user's message.
   - Do not output prefixes, suffixes, timestamps, narration, thoughts, scene notes, or comments outside the message format.
   - Do not output blank lines or extra line breaks.
   - Do not mix up friend names and IDs.
   - Do not omit any format segment. Do not omit "[Chat with {{name or group}}]".
   - Output MUST be one or more messages in the format below — nothing else.

## II. Output format
### 1. Wrapper
Every text message uses:
[和{char}的聊天]
{{message body}}

### 2. {{message body}}
[对方消息|{{their name}}|{{their friend id}}|{{type}}|{{content}}]

## III. Types

### 1. Text
* Type: 文字
* Content: the text they sent.
* Example:
[对方消息|Qin Juan|500002|文字|Kid, still up this late. What's on your mind]

### 2. Red packet
* Type: 红包
* Content: amount as a bare number.
* Example:
[对方消息|Huo Jin|400003|红包|52000]

### 3. Voice
* Type: 语音
* Content: transcript of the voice note.
* Example:
[对方消息|Xia Yang|300004|语音|I miss you. When are you coming back]

## IV. Cadence
* Dynamic count: 1 to 7 messages per reply, matching mood and pace. Do not always send the same count.
* Small, believable gaps between messages.
* Tone and frequency must match the character, their mood, and the relationship stage.

## V. Count
Generate at least 8-10 messages of mixed types.
`,

            'Parallel event': `You are a professional parallel-event writer. From the current conversation, write either world progress off-camera or an NPC's personal day / action that is not in the current scene.

Style:
- Stay inside the established setting
- The event should relate to the current conversation
- 600-800 words

Write the parallel event only. No preamble.`,

            'Succubus body': `You are a professional fiction writer. From the current conversation, write a NEW character who cannot help falling for the protagonist.

Style:
- Body vs mind in conflict
- Gesture and interiority in detail
- 600-800 words

Write the parallel event only. No preamble.`,

            'Random news': `You are a professional news writer. From the current world, generate a random news piece.

Style:
- Fits this world's tone
- 600-800 words
- Politics, military, entertainment, sports, finance, tech, society, education, culture, health, travel, food — any beat is fine

Write the piece only. No preamble.`,

            'Custom': `You are a professional parallel-event writer. From the current conversation and the user's custom instructions, write a matching parallel event.

Baseline:
- Related to the current talk, but do not hijack the main plot
- Background event, environment shift, or a related character acting
- Third person
- 100-200 words
- Interesting and in-setting

Adjust tone using the user's custom prefix. If there is no special request, write a small related parallel event.

Write the parallel event only. No preamble.`
        };
    }

    /**
     * Resolve a style name (English key or Chinese alias) to a prompt
     */
    getStylePrompt(styleName) {
        if (this.customStyles.has(styleName)) {
            return this.customStyles.get(styleName);
        }
        const aliases = {
            '被ntr': 'NTR',
            '主人的任务': "Master's task",
            '主动消息': 'Incoming message',
            '平行事件': 'Parallel event',
            '魅魔之体': 'Succubus body',
            '随机新闻': 'Random news',
            '自定义': 'Custom',
            '科幻未来': 'Parallel event',
            '现代都市': 'Parallel event',
            '奇幻魔法': 'Parallel event',
            '历史古代': 'Parallel event',
            '恐怖悬疑': 'Parallel event',
        };
        const key = this.styles[styleName] ? styleName : (aliases[styleName] || styleName);
        return this.styles[key] || this.styles['Parallel event'];
    }

    getAvailableStyles() {
        const builtinStyles = Object.keys(this.styles);
        const customStyleNames = Array.from(this.customStyles.keys());
        return [...builtinStyles, ...customStyleNames];
    }

    addCustomStyle(name, prompt) {
        this.customStyles.set(name, prompt);
        this.saveCustomStyles();
        console.log('[Parallel Events Styles] Added custom style:', name);
    }

    removeCustomStyle(name) {
        if (this.customStyles.has(name)) {
            this.customStyles.delete(name);
            this.saveCustomStyles();
            console.log('[Parallel Events Styles] Removed custom style:', name);
            return true;
        }
        return false;
    }

    isCustomStyle(styleName) {
        return this.customStyles.has(styleName);
    }

    getCustomPrefix() {
        return this.customPrefix;
    }

    setCustomPrefix(prefix) {
        this.customPrefix = prefix;
        this.savePrefixSettings();
        console.log('[Parallel Events Styles] Custom prefix updated');
    }

    buildFullPrompt(styleName, customPrefix = '') {
        let basePrompt = this.getStylePrompt(styleName);

        if (customPrefix) {
            basePrompt += `\n\nCustom request: ${customPrefix}`;
        }

        if (this.customPrefix) {
            basePrompt += `\n\nGlobal request: ${this.customPrefix}`;
        }

        return basePrompt;
    }

    loadPrefixSettings() {
        try {
            const saved = localStorage.getItem('parallelEventsCustomPrefix');
            if (saved) {
                this.customPrefix = saved;
            }
        } catch (error) {
            console.error('[Parallel Events Styles] Failed to load prefix:', error);
        }
    }

    savePrefixSettings() {
        try {
            localStorage.setItem('parallelEventsCustomPrefix', this.customPrefix);
        } catch (error) {
            console.error('[Parallel Events Styles] Failed to save prefix:', error);
        }
    }

    loadCustomStyles() {
        try {
            const saved = localStorage.getItem('parallelEventsCustomStyles');
            if (saved) {
                const customStylesData = JSON.parse(saved);
                this.customStyles = new Map(Object.entries(customStylesData));
                console.log('[Parallel Events Styles] Loaded custom styles:', this.customStyles.size);
            }
        } catch (error) {
            console.error('[Parallel Events Styles] Failed to load custom styles:', error);
        }
    }

    saveCustomStyles() {
        try {
            const customStylesData = Object.fromEntries(this.customStyles);
            localStorage.setItem('parallelEventsCustomStyles', JSON.stringify(customStylesData));
        } catch (error) {
            console.error('[Parallel Events Styles] Failed to save custom styles:', error);
        }
    }

    exportCustomStyles() {
        const exportData = {
            customStyles: Object.fromEntries(this.customStyles),
            customPrefix: this.customPrefix,
            exportTime: new Date().toISOString(),
            version: '1.0.0'
        };
        return JSON.stringify(exportData, null, 2);
    }

    importCustomStyles(jsonData) {
        try {
            const data = JSON.parse(jsonData);

            if (data.customStyles) {
                Object.entries(data.customStyles).forEach(([name, prompt]) => {
                    this.customStyles.set(name, prompt);
                });
                this.saveCustomStyles();
            }

            if (data.customPrefix) {
                this.customPrefix = data.customPrefix;
                this.savePrefixSettings();
            }

            console.log('[Parallel Events Styles] Import done');
            return true;
        } catch (error) {
            console.error('[Parallel Events Styles] Import failed:', error);
            return false;
        }
    }

    reset() {
        this.customStyles.clear();
        this.customPrefix = '';
        this.saveCustomStyles();
        this.savePrefixSettings();
        console.log('[Parallel Events Styles] Settings reset');
    }
}

window.parallelEventsStyles = new ParallelEventsStyles();

console.log('[Parallel Events Styles] Style manager loaded');
