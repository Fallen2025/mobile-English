# External Phone 3.0 — English fork

Upstream: [yexiaoxiaoye/mobile](https://github.com/yexiaoxiaoye/mobile) (外置手机 3.0) by 沉淀/夜宵宵夜.

This fork keeps the original engine and overlays an English UI. Console logs may still be Chinese. Generated Feed/Forum/Live posts follow whatever language the model writes.

## Install in SillyTavern

1. Extensions → Install Extension
2. Paste: `https://github.com/Fallen2025/mobile-English.git`
3. Reload ST
4. Enable the extension named **External Phone 3.0**
5. In the phone Settings app, turn on **Tavern compatibility** so clicks pass through to ST

You do **not** need to rename the folder to `mobile`. `english-boot.js` rewrites the old `third-party/mobile/` paths to this folder.

If you already installed upstream `yexiaoxiaoye/mobile`, disable that copy first. Two phones will fight.

## Language

Default is English (`localStorage.mobile_lang = en`).

Browser console:

```js
MobileI18n.setLang('en')  // English chrome
MobileI18n.setLang('zh')  // original Chinese chrome
```

## Linked mode + Megumin V10

Use the phone as an overlay only. Do not point a second Claude key at Unlinked/custom API unless you want a second generate that bypasses Megumin.

## What is translated

Home icons, common buttons (Back/Send/Save/Delete), Settings/API panel labels listed in `i18n.js`.

Not translated yet: every string inside each `app/*-app.js` screen. Add pairs to the `EN` map in `i18n.js` as you hit them.
