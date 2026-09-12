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
        '多云转小雨': 'Cloudy, light rain',
        '多云': 'Cloudy',
        '晴': 'Clear',
        '晴朗': 'Sunny',
        '阴': 'Overcast',
        '小雨': 'Light rain',
        '中雨': 'Rain',
        '大雨': 'Heavy rain',
        '雨': 'Rain',
        '雪': 'Snow',
        '小雪': 'Light snow',
        '雾': 'Fog',
        '阴转多云': 'Overcast to cloudy',
        '多云转晴': 'Cloudy to clear',
        '晴转多云': 'Clear to cloudy',
        '多云转阴': 'Cloudy to overcast',
        '阴转小雨': 'Overcast, light rain',
        '雨转阴': 'Rain to overcast',

        '我的日记': 'My Diary',
        '📔 我的日记': 'My Diary',
        '暂无日记': 'No diary entries',
        '开始你的冒险，记录精彩瞬间': 'Start your adventure and record the moments',
        '日记应用加载失败': 'Failed to load diary',
        '获取内容失败': 'Failed to load content',
        '暂无内容': 'No content',
        '未知日期': 'Unknown date',
        '未知': 'Unknown',

        '我的状态': 'My Status',
        'NPC状态': 'NPC Status',
        '暂无状态数据': 'No status data',
        '状态应用加载失败': 'Failed to load status',
        '基本信息': 'Basic info',
        '性别': 'Gender',
        '年龄': 'Age',
        '身高': 'Height',
        '体重': 'Weight',
        '性格': 'Personality',
        '外貌': 'Appearance',
        '外貌描述': 'Appearance',
        '当前着装': 'Current outfit',
        '人物记忆': 'Memories',
        '好感度': 'Affection',
        '性经验': 'Experience',
        '内心想法': 'Inner thoughts',
        '头部': 'Head',
        '耳朵': 'Ears',
        '上衣': 'Top',
        '下装': 'Bottoms',
        '内衣': 'Underwear',
        '内裤': 'Underwear',
        '袜子': 'Socks',
        '鞋子': 'Shoes',
        '脱下': 'Remove',
        '脱下装备': 'Remove gear',
        '脱下装备失败': 'Failed to remove gear',

        '商品列表': 'Products',
        '购物车': 'Cart',
        '暂无商品': 'No products',
        '购物车为空': 'Cart is empty',
        '快去挑选你喜欢的商品吧': 'Go pick something you like',
        '加入购物车': 'Add to cart',
        '结算': 'Checkout',
        '订单确认': 'Confirm order',
        '订单详情': 'Order details',
        '返回购物车': 'Back to cart',
        '确认订单': 'Place order',
        '总计：': 'Total:',
        '品质': 'Quality',
        '库存': 'Stock',
        '货币': 'Currency',
        '普通': 'Common',
        '购物应用加载失败': 'Failed to load shop',
        '数码': 'Electronics',
        '服装': 'Clothes',
        '家居': 'Home',
        '美妆': 'Beauty',
        '运动': 'Sports',
        '图书': 'Books',
        '玩具': 'Toys',
        '音乐': 'Music',
        '食品': 'Food',
        '食物': 'Food',
        '饮料': 'Drinks',
        '装备': 'Gear',
        '材料': 'Materials',
        '道具': 'Items',
        '消耗品': 'Consumables',
        '其他': 'Other',

        '发新帖': 'New post',
        '请输入帖子标题...': 'Post title...',
        '分享你的想法...': 'Share your thoughts...',
        '暂无帖子': 'No posts yet',
        '点击右上角发帖按钮开始讨论吧～': 'Tap the post button to start a thread',
        '删除帖子': 'Delete post',
        '帖子不存在': 'Post not found',
        '帖子详情': 'Post',
        '全部回复': 'All replies',
        '留下你的想法吧': 'Leave a reply',
        '暂无回复，来抢沙发吧～': 'No replies yet — be first',
        '写下你的回复...': 'Write a reply...',
        '回复': 'Reply',
        '条回复': 'replies',
        '请输入回复内容': 'Enter a reply',
        '无法找到当前帖子信息': 'Could not find this post',
        '回复已发送': 'Reply sent',
        '发送回复失败，请重试': 'Failed to send reply',
        '回复功能不可用': 'Reply is unavailable',
        '回复功能不可用，请检查论坛管理器配置': 'Reply unavailable — check Forum manager',
        '请填写标题和内容': 'Title and body are required',
        '论坛管理器未初始化，请稍后再试': 'Forum manager is not ready',
        '帖子已发布': 'Post published',
        '发帖失败，请重试': 'Failed to publish',
        '发帖功能不可用': 'Posting is unavailable',
        '帖子已删除': 'Post deleted',
        '删除失败': 'Delete failed',
        '论坛设置': 'Forum settings',
        '选择论坛风格': 'Forum style',
        '自定义前缀': 'Custom prefix',
        '在此输入自定义前缀，将添加到风格提示词前面...': 'Custom prefix added in front of the style prompt...',
        '提示: 可以用来添加特殊指令、角色设定或生成要求': 'Tip: extra instructions, role notes, or generation rules',
        '消息阈值': 'Message threshold',
        '触发论坛生成的消息数量': 'Messages before auto-generate',
        '当新消息数量达到此值时自动生成论坛内容': 'Auto-generate forum when this many new messages arrive',
        '自动生成论坛内容': 'Auto-generate forum',
        '操作面板': 'Actions',
        'API设置': 'API settings',
        '状态信息': 'Status',
        '就绪': 'Ready',
        '生成中...': 'Generating...',
        '清除中...': 'Clearing...',
        '论坛管理器未加载，请刷新页面重试': 'Forum manager not loaded — refresh and retry',
        '确定要清除所有论坛内容吗？此操作不可恢复。': 'Clear all forum posts? This cannot be undone.',
        'API配置模块未加载': 'API module not loaded',
        '预设风格': 'Preset styles',
        '自定义风格': 'Custom styles',
        '贴吧老哥': 'Tieba veteran',
        '知乎精英': 'Zhihu elite',
        '小红书种草': 'Xiaohongshu recs',
        '抖音达人': 'Douyin creator',
        'B站UP主': 'Bilibili UP',
        '海角老司机': 'Old hand',
        '八卦小报记者': 'Gossip reporter',
        '天涯老涯友': 'Tianya old-timer',
        '校园论坛': 'Campus forum',

        '外置手机': 'External Phone',
        '酒馆页面与手机控制兼容': 'Tavern page compatible with phone controls',
        '隐藏手机按钮': 'Hide phone button',
        '专一模式（一次只和一人聊天）': 'Exclusive mode (one chat at a time)',
        '禁止正文': 'Block story text',
        '查看状态': 'View status',
        '清除日志': 'Clear logs',
        '自定义API配置': 'Custom API config',
        '楼层监听器状态': 'Floor monitor status',
    };

    const dict = lang === 'zh' ? {} : EN;

    function t(text) {
        if (text == null) return text;
        const raw = String(text).trim();
        if (dict[raw]) return dict[raw];

        var counted = raw.match(/^(.*?)(\s*\(\d+\))$/);
        if (counted && dict[counted[1].trim()]) {
            return dict[counted[1].trim()] + counted[2];
        }

        var labeled = raw.match(/^([一-鿿A-Za-z]+)\s*[：:]\s*(.*)$/);
        if (labeled && dict[labeled[1]]) {
            return dict[labeled[1]] + ': ' + labeled[2];
        }

        var floor = raw.match(/^(\d+)\s*楼$/);
        if (floor) return '#' + floor[1];

        var nReplies = raw.match(/^(\d+)\s*条回复$/);
        if (nReplies) return nReplies[1] + ' replies';

        var customStyle = raw.match(/^(.*)\s*\(自定义\)$/);
        if (customStyle) {
            var name = customStyle[1].trim();
            return (dict[name] || name) + ' (custom)';
        }

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
