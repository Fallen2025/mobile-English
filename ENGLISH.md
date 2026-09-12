# External Phone 3.0 — English fork

Upstream: [yexiaoxiaoye/mobile](https://github.com/yexiaoxiaoye/mobile) (外置手机 3.0) by 沉淀/夜宵宵夜.

This fork keeps the original plugin and adds an English UI overlay. Console logs may still be Chinese. Feed / Forum / Live *content* follows whatever language the connected model writes.

No extra apps, presets, or character-specific hooks. Chrome translation only.

## Install

1. SillyTavern → Extensions → Install Extension
2. `https://github.com/Fallen2025/mobile-English.git`
3. Reload and enable **External Phone 3.0**
4. Phone Settings → turn on **Tavern compatibility** so the overlay does not eat clicks

Disable any install of upstream `yexiaoxiaoye/mobile` first. Two copies will conflict.

You do not need to rename the folder to `mobile`. `english-boot.js` rewrites the old `third-party/mobile/` script paths to this folder name.

## Language

Default is English (`localStorage.mobile_lang = en`).

```js
MobileI18n.setLang('en')  // English chrome
MobileI18n.setLang('zh')  // original Chinese chrome
```

## What is translated

Home icons, weather chip, common buttons (Back / Send / Save / Delete), and Settings / API panel labels listed in `i18n.js`.

Inner screens under `app/` are translated as strings are added to the `EN` map in `i18n.js`. PRs for missing labels are welcome — add `'Chinese': 'English'` pairs only. Do not bake in a specific character card, preset, or lorebook.
