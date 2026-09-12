/**
 * External Phone 3.0 — English UI overlay (fork).
 * Does not rewrite upstream logic. Relabels visible chrome after render.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'mobile_lang';
    const lang = localStorage.getItem(STORAGE_KEY) || 'en';

    const EN = {
        '信息': 'Messages',
        '消息': 'Messages',
        '购物': 'Shop',
        '任务': 'Tasks',
        '论坛': 'Forum',
        '微博': 'Feed',
        '直播': 'Live',
        '背包': 'Bag',
        '档案': 'Profile',
        '设置': 'Settings',
        '状态': 'Status',
        '日记': 'Diary',
        '邮件': 'Mail',
        '返回': 'Back',
        '发送': 'Send',
        '首页': 'Home',
        '未读': 'Unread',
        '好友': 'Friends',
        '添加好友': 'Add friend',
        '搜索': 'Search',
        '确认': 'OK',
        '取消': 'Cancel',
        '保存': 'Save',
        '删除': 'Delete',
        '刷新': 'Refresh',
        '加载中': 'Loading',
        '加载中...': 'Loading...',
        '暂无消息': 'No messages',
        '暂无数据': 'No data',
        '输入消息': 'Type a message',
        '请输入': 'Enter text',
        '酒馆兼容模式': 'Tavern compatibility',
        '自定义API': 'Custom API',
        '立即生成论坛': 'Generate forum now',
        '清除论坛内容': 'Clear forum',
        '立即生成微博': 'Generate feed now',
        '清除微博内容': 'Clear feed',
        '测试生成': 'Test generate',
        '打开API配置面板': 'Open API panel',
        '刷新状态': 'Refresh status',
        '重置所有设置': 'Reset all settings',
        '创建自定义风格': 'Create custom style',
        '导出风格': 'Export styles',
        '导入风格': 'Import styles',
        '保存风格': 'Save style',
        '重新生成': 'Regenerate',
        '格式化内容': 'Format',
        '验证格式': 'Validate',
        '观看直播': 'Watch live',
        '平行事件': 'Side events',
        '档案管理': 'Profiles',
        '统一API设置应用': 'API settings',
        '论坛风格': 'Forum style',
        '事件风格': 'Event style',
        '所有设置已重置为默认值': 'All settings reset to defaults',
        '样式配置管理器': 'Style config',
        '黑': 'Blk',
        '白': 'Wht',
    };

    const ZH = {};
    Object.keys(EN).forEach(function (k) { ZH[EN[k]] = k; });

    const dict = lang === 'zh' ? {} : EN;

    function t(text) {
        if (text == null) return text;
        const raw = String(text).trim();
        if (dict[raw]) return dict[raw];
        return text;
    }

    window.MobileI18n = {
        lang: lang,
        t: t,
        setLang: function (next) {
            localStorage.setItem(STORAGE_KEY, next);
            location.reload();
        },
    };

    function translateNode(node) {
        if (!node || node.nodeType !== 1) return;
        if (node.dataset && node.dataset.i18nSkip === '1') return;

        const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
        const texts = [];
        while (walk.nextNode()) texts.push(walk.currentNode);
        texts.forEach(function (tn) {
            const next = t(tn.nodeValue);
            if (next !== tn.nodeValue) tn.nodeValue = next;
        });

        ['title', 'placeholder', 'aria-label'].forEach(function (attr) {
            if (node.getAttribute && node.hasAttribute(attr)) {
                const v = node.getAttribute(attr);
                const n = t(v);
                if (n !== v) node.setAttribute(attr, n);
            }
        });
    }

    function translateTree(root) {
        if (!root) return;
        translateNode(root);
        if (root.querySelectorAll) {
            root.querySelectorAll('*').forEach(translateNode);
        }
    }

    function bootObserver() {
        const obs = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                m.addedNodes.forEach(function (n) {
                    if (n.nodeType === 1) translateTree(n);
                });
                if (m.type === 'characterData' && m.target && m.target.parentElement) {
                    translateNode(m.target.parentElement);
                }
            });
        });
        obs.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        translateTree(document.body);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootObserver);
    } else {
        bootObserver();
    }
})();
