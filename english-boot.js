/**
 * English fork bootstrap.
 * 1. Rewrites hardcoded third-party/mobile paths so this repo can live as mobile-English.
 * 2. Loads i18n.js, then original index.js.
 */
(function () {
    'use strict';

    const SCRIPT = document.currentScript;
    const EXT_DIR = SCRIPT && SCRIPT.src
        ? SCRIPT.src.replace(/\/[^/]+\.js(\?.*)?$/, '')
        : '/scripts/extensions/third-party/mobile-English';
    const FOLDER = EXT_DIR.split('/').filter(Boolean).pop();

    window.MOBILE_EXT_FOLDER = FOLDER;
    window.MOBILE_EXT_BASE = EXT_DIR;

    function rewrite(url) {
        if (!url) return url;
        return String(url).replace(
            /scripts\/extensions\/third-party\/mobile(?!-[A-Za-z])/g,
            'scripts/extensions/third-party/' + FOLDER
        );
    }

    function wrapSetter(proto, prop) {
        const desc = Object.getOwnPropertyDescriptor(proto, prop);
        if (!desc || !desc.set) return;
        Object.defineProperty(proto, prop, {
            configurable: true,
            enumerable: desc.enumerable,
            get() { return desc.get.call(this); },
            set(v) { desc.set.call(this, rewrite(v)); },
        });
    }

    wrapSetter(HTMLScriptElement.prototype, 'src');
    wrapSetter(HTMLLinkElement.prototype, 'href');

    function load(src) {
        return new Promise(function (resolve, reject) {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    load(EXT_DIR + '/i18n.js')
        .then(function () { return load(EXT_DIR + '/index.js'); })
        .catch(function (err) {
            console.error('[Mobile English] boot failed', err);
        });
})();
