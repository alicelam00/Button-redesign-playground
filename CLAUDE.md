# Button Playground — Project Guidelines

## What this is

A static HTML/CSS/JS prototype for exploring button component designs. No build step, no framework — open `index.html` directly in a browser.

## Folder structure

```
buttons-playground-refactor/
├── index.html              # Entry point
├── styles.css              # Legacy root stylesheet (still referenced by index.html)
├── scripts/
│   └── app.js              # All JS: variant rendering, settings panel, live preview
├── styles/                 # Refactored CSS (modular structure)
│   ├── index.css           # Imports all modules below — add new files here
│   ├── tokens/             # Design tokens as CSS custom properties
│   │   ├── colors.css
│   │   ├── spacing.css
│   │   ├── borders.css
│   │   ├── typography.css
│   │   ├── motion.css
│   │   ├── shadows.css
│   │   └── button.css      # Button-specific token aliases (e.g. --button-primary-bg)
│   ├── components/         # Component styles
│   │   ├── button.css      # .button class and all variants/states
│   │   └── settings.css    # Settings panel widget
│   └── layout/             # Page/prototype layout styles
│       ├── prototype.css
│       └── prototype-button-preview.css
├── assets/                 # Production assets (images, icons)
└── _assets/                # Reference screenshots and design files (not used at runtime)
```

## Conventions

**CSS tokens:** All design values go in `styles/tokens/`. Component files consume tokens via `var(--token-name)` — never hardcode raw values like `#005BD3` in component files.

**Button tokens:** `styles/tokens/button.css` holds button-specific aliases (e.g. `--button-primary-bg`) that map to base tokens. Component styles use these aliases, not base tokens directly.

**HTML attributes:** Buttons use `data-kind` for variant (`primary`, `secondary`, `plain`) and `data-variant` for specific sub-variants (`primary-2`, etc.).

**Class naming:** BEM-style — `block__element--modifier` (e.g. `interactive-demo__row--core`, `settings-widget__header`).

**New CSS modules:** Add the file under the appropriate subfolder (`tokens/`, `components/`, or `layout/`) and add an `@import` line to `styles/index.css`.

**`_assets/`:** Prefix with `_` signals these are non-runtime reference files (design screenshots, etc.). Don't import them in HTML or CSS.