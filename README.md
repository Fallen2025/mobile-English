# External Phone 3.0 (English UI fork)

SillyTavern floating-phone overlay. This is an English-UI fork of [外置手机 3.0](https://github.com/yexiaoxiaoye/mobile) by 沉淀/夜宵宵夜.

The original plugin is unchanged. This repo adds:

- `english-boot.js` — loads the plugin from any folder name (not only `mobile`)
- `i18n.js` — English labels on the home screen and common chrome

No character cards, presets, or extra apps. Translation layer only.

## Install

SillyTavern → Extensions → Install Extension →

```
https://github.com/Fallen2025/mobile-English.git
```

Enable **External Phone 3.0**. In the phone Settings app, turn on **Tavern compatibility**.

Do not run this and upstream `yexiaoxiaoye/mobile` at the same time.

## Language

Default: English. Console:

```js
MobileI18n.setLang('en')
MobileI18n.setLang('zh')
```

Details: [ENGLISH.md](ENGLISH.md)

Upstream feature list (Chinese): keep a copy of the original README if you need it; this page is install-only.

## License

Same as upstream. See [LICENSE](LICENSE).
