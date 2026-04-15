---
name: component-playground
description: Scaffold a static HTML/CSS/JS prototype for exploring a UI component's variants, states, and live theming — the same pattern as the button playground in this repo.
---

# Component Playground Skill

Use this skill when asked to build a browser-based prototype that lets a designer or engineer explore a UI component's variants, interaction states, and visual settings (colors, size, etc.) without a build step.

The pattern: static `index.html` + modular CSS tokens + a single JS file that owns all rendering logic. No frameworks, no bundler.

---

## Step 1 — Gather requirements

Before generating any files, ask the user for:

1. **Component name** — e.g. "Badge", "Input", "Tag"
2. **Variants** — the distinct visual types, e.g. `success`, `warning`, `critical`, `info` (like `primary`, `secondary`, `plain` for buttons)
3. **States** — which interaction/display states to show in the grid, e.g. `default`, `hover`, `disabled`; omit states that don't apply (e.g. a badge probably has no `loading` state)
4. **Settings panel controls** — what the user should be able to tweak live:
   - Color pickers (e.g. background page color, accent color)
   - Select dropdowns (e.g. size preset, icon position)
   - Toggles (e.g. show icon, rtl mode)
5. **Interactive demo** — which variants to show at the top of the page for real pointer/keyboard interaction (vs. the static grid below)

If the user provides a Figma URL, call `get_design_context` first and infer answers from the design before asking.

---

## Step 2 — Folder structure

Create this structure (adjust component name throughout):

```
<project-root>/
├── index.html
├── scripts/
│   └── app.js
└── styles/
    ├── index.css          ← @import everything
    ├── tokens/
    │   ├── colors.css
    │   ├── spacing.css
    │   ├── borders.css
    │   ├── typography.css
    │   ├── motion.css
    │   ├── shadows.css
    │   └── <component>.css   ← component-specific token aliases
    ├── components/
    │   ├── <component>.css   ← .component class + variants/states
    │   └── settings.css      ← settings panel widget (reuse as-is)
    └── layout/
        ├── prototype.css
        └── prototype-<component>-preview.css
```

`index.html` references `styles/index.css` and `scripts/app.js` only. No inline styles or scripts.

---

## Step 3 — HTML structure (`index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>[Component] States Prototype</title>
  <link rel="stylesheet" href="styles/index.css">
</head>
<body>
  <!-- Main content -->
  <div class="prototype">
    <h1>[Component] component</h1>

    <!-- Interactive demo: real hover/focus/press interactions -->
    <div class="interactive-demo" aria-label="Interactive [component]s">
      <div class="interactive-demo__panel">
        <div class="interactive-demo__cluster">
          <div class="interactive-demo__row interactive-demo__row--core">
            <!-- One element per variant; use data-kind for variant -->
            <div class="[component]" data-kind="[variant-1]">Label</div>
            <div class="[component]" data-kind="[variant-2]">Label</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Variants × states grid -->
    <h2 class="section-title">Variants</h2>
    <div class="variants-table" id="variants-table"></div>
  </div>

  <!-- Settings panel -->
  <div class="settings-widget" id="settings-widget">
    <div class="settings-widget__header">
      <span class="settings-widget__title">Settings</span>
    </div>
    <div class="settings-widget__body">
      <div class="settings-widget__panel">
        <!-- Color rows: one per theming variable -->
        <div class="settings-widget__row">
          <span class="settings-widget__label">Background</span>
          <div class="settings-widget__color-wrap">
            <input type="color" class="settings-widget__color" id="setting-background" value="#FFFFFF">
            <input type="text" class="settings-widget__color-hex" id="setting-background-hex" value="#FFFFFF" maxlength="7" spellcheck="false">
          </div>
        </div>
        <!-- ... additional color/select rows ... -->

        <!-- Select rows: one per enum setting -->
        <div class="settings-widget__row">
          <span class="settings-widget__label">Size</span>
          <select class="settings-widget__select settings-widget__select--sm" id="setting-size">
            <option value="small">Small</option>
            <option value="medium" selected>Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <button type="button" class="settings-widget__reset-all-btn" id="global-reset-all">Reset all</button>
      </div>
    </div>
  </div>

  <script src="scripts/app.js"></script>
</body>
</html>
```

**Rules:**
- Use `data-kind` for variant (`primary`, `success`, etc.)
- Use `data-variant` for sub-variants within a kind
- Use `data-preview-state` to force a visual state in the grid (`hover`, `pressed`, `focus`) — CSS targets this attribute
- Disabled state: set `disabled` attribute (or `aria-disabled="true"` for non-button elements)

---

## Step 4 — CSS tokens (`styles/tokens/`)

### Base tokens (reuse the project's existing files if present, else create minimal versions)

`colors.css` — raw palette + semantic aliases:
```css
:root {
  /* Raw palette */
  --color-blue-600: #005BD3;
  /* ... */

  /* Semantic aliases */
  --color-background: #ffffff;
  --color-text: #111111;
}
```

`spacing.css`, `borders.css`, `typography.css`, `motion.css`, `shadows.css` — standard design token files. Keep them minimal; only define tokens you actually use.

### Component token aliases (`styles/tokens/<component>.css`)

Map semantic tokens to component-specific names. This is the layer that the settings panel overrides via `--demo-*` CSS variables.

```css
:root {
  /* Component geometry */
  --badge-height: 20px;
  --badge-padding-inline: 8px;
  --badge-radius: var(--cornerradius-small);

  /* Color aliases — overridden by settings panel via --demo-* vars */
  --badge-success-bg: var(--color-success);
  --badge-success-fg: var(--color-text-on-success);
  /* ... one set per variant ... */
}
```

---

## Step 5 — Component CSS (`styles/components/<component>.css`)

Structure:

```css
/* 1. Base class */
.badge {
  display: inline-flex;
  align-items: center;
  /* ... geometry, typography ... */
  /* Read from component tokens, not raw values */
  height: var(--badge-height);
  padding-inline: var(--badge-padding-inline);
  border-radius: var(--badge-radius);
}

/* 2. Per-variant colors — always use --demo-* with token fallback */
.badge[data-kind="success"] {
  background-color: var(--demo-success-bg, var(--badge-success-bg));
  color: var(--demo-success-fg, var(--badge-success-fg));
}

/* 3. States — use real CSS pseudo-classes + data-preview-state for the grid */
.badge[data-kind="success"]:hover,
.badge[data-kind="success"][data-preview-state="hover"] {
  background-color: color-mix(in srgb, var(--demo-success-bg, var(--badge-success-bg)) 85%, white);
}

/* 4. Disabled */
.badge:disabled,
.badge[aria-disabled="true"] {
  opacity: 0.3;
  cursor: not-allowed;
}
```

**Never hardcode raw hex values in component CSS.** Always go through `var(--demo-*)` → token alias → base token.

The `--demo-*` variables are the live theming hook: `app.js` sets them on the `.prototype` element in response to settings panel changes.

---

## Step 6 — JavaScript (`scripts/app.js`)

Wrap everything in an IIFE. Structure:

```js
(function () {
  // 1. Constants
  const VARIANTS = ['success', 'warning', 'critical', 'info'];
  const STATES = ['default', 'hover', 'focus', 'disabled'];
  const STATE_LABELS = { default: 'Default', hover: 'Hover', /* ... */ };
  const VARIANT_LABELS = { success: 'Success', /* ... */ };
  const SIZE_PRESETS = {
    small: { height: '20px', paddingInline: '6px' },
    medium: { height: '24px', paddingInline: '8px' },
    large: { height: '28px', paddingInline: '10px' },
  };
  const DEFAULTS = {
    backgroundColor: '#FFFFFF',
    accentColor: '#005BD3',
    size: 'medium',
  };

  // 2. State
  const state = Object.assign({}, DEFAULTS);
  const prototypeEl = document.querySelector('.prototype');
  const variantsTable = document.getElementById('variants-table');

  // 3. DOM helpers
  function setVars(element, vars) {
    Object.keys(vars).forEach(function (key) {
      const value = vars[key];
      if (value === undefined || value === null || value === '') {
        element.style.removeProperty(key);
      } else {
        element.style.setProperty(key, value);
      }
    });
  }

  function createElement(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }

  // 4. Grid builder
  function createPreviewComponent(variant, stateName) {
    const el = createElement('div', '[component]');
    el.dataset.kind = variant;
    if (stateName === 'hover' || stateName === 'pressed' || stateName === 'focus') {
      el.dataset.previewState = stateName;
    }
    if (stateName === 'disabled') {
      el.setAttribute('aria-disabled', 'true');
    }
    el.textContent = VARIANT_LABELS[variant];
    return el;
  }

  function buildVariantsTable() {
    variantsTable.innerHTML = '';
    variantsTable.style.setProperty('--variants-columns', VARIANTS.length);
    variantsTable.appendChild(createElement('div', 'variants-table__cell variants-table__cell--corner', ''));

    VARIANTS.forEach(function (variant) {
      variantsTable.appendChild(
        createElement('div', 'variants-table__cell variants-table__cell--heading', VARIANT_LABELS[variant])
      );
    });

    STATES.forEach(function (stateName) {
      variantsTable.appendChild(
        createElement('div', 'variants-table__cell variants-table__cell--state', STATE_LABELS[stateName])
      );
      VARIANTS.forEach(function (variant) {
        const cell = createElement('div', 'variants-table__cell variants-table__cell--demo');
        cell.appendChild(createPreviewComponent(variant, stateName));
        variantsTable.appendChild(cell);
      });
    });
  }

  // 5. Render functions — one per settings concern
  function renderPage() {
    document.body.style.backgroundColor = state.backgroundColor;
    const dark = hexBrightness(state.backgroundColor) < 128;
    setVars(prototypeEl, {
      '--color-background': state.backgroundColor,
      '--color-text': dark ? '#e5e5e5' : '#111111',
      '--color-text-subdued': dark ? '#a3a3a3' : '#828282',
    });
  }

  function renderSize() {
    const preset = SIZE_PRESETS[state.size];
    setVars(prototypeEl, {
      '--badge-height': preset.height,
      '--badge-padding-inline': preset.paddingInline,
    });
  }

  function render() {
    renderPage();
    renderSize();
    // ... call additional render functions as needed
  }

  // 6. Color utilities
  function hexToRgb(hex) {
    const value = parseInt(hex.replace('#', ''), 16);
    return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
  }
  function hexBrightness(hex) {
    const rgb = hexToRgb(hex);
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  }

  // 7. Settings bindings
  function bindColorInput(colorId, hexId, stateKey) {
    const colorInput = document.getElementById(colorId);
    const hexInput = document.getElementById(hexId);
    colorInput.addEventListener('input', function () {
      state[stateKey] = colorInput.value;
      hexInput.value = colorInput.value.toUpperCase();
      render();
    });
    hexInput.addEventListener('input', function () {
      let value = hexInput.value.trim();
      if (!value.startsWith('#')) value = '#' + value;
      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        state[stateKey] = value;
        colorInput.value = value;
        render();
      }
    });
  }

  function bindSelect(id, stateKey) {
    document.getElementById(id).addEventListener('change', function (e) {
      state[stateKey] = e.target.value;
      render();
    });
  }

  function syncControls() {
    // Set each input/select to match current state
    document.getElementById('setting-background').value = state.backgroundColor;
    document.getElementById('setting-background-hex').value = state.backgroundColor;
    document.getElementById('setting-size').value = state.size;
  }

  // 8. Init
  buildVariantsTable();
  bindColorInput('setting-background', 'setting-background-hex', 'backgroundColor');
  bindSelect('setting-size', 'size');

  document.getElementById('global-reset-all').addEventListener('click', function () {
    Object.assign(state, DEFAULTS);
    syncControls();
    render();
  });

  syncControls();
  render();
})();
```

**Key patterns:**
- `state` object holds all current settings; `render()` reads from it
- `setVars(prototypeEl, { '--demo-*': value })` pushes settings into CSS via custom properties
- `buildVariantsTable()` runs once on init; re-runs if variants change dynamically
- Each `bindColorInput` / `bindSelect` call maps a settings control to a `state` key
- Always implement "Reset all" by resetting `state` to `DEFAULTS` then calling `syncControls()` and `render()`

---

## Step 7 — Settings panel CSS (`styles/components/settings.css`)

The settings panel is **always dark** (`background: #0a0a0a`) regardless of the page background color setting — it's a fixed chrome element, not part of the theming canvas. Use white-on-dark text (`rgba(255,255,255,0.5)` for labels, `rgba(255,255,255,0.7)` for inputs).

Reuse the existing `settings.css` verbatim — it's generic and works for any component playground. Only modify it if a new control type is needed (e.g. a toggle switch).

Key rules to preserve:
```css
.settings-widget {
  position: fixed;
  top: 0;
  left: 0;           /* ← left sidebar, not bottom-right */
  width: 260px;
  height: 100vh;
  background: #0a0a0a;  /* ← always dark */
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}
```

---

## Step 8 — Layout CSS

### `styles/layout/prototype.css`

The `body` **must** have `padding-left: 260px` to offset content from the fixed sidebar. It also needs smooth transitions so the background color setting animates.

```css
* { box-sizing: border-box; }

body {
  margin: 0;
  padding-left: 260px;   /* ← matches settings panel width */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #ffffff;
  color: var(--color-text);
  transition: background-color 0.2s ease, color 0.2s ease;
}

.prototype {
  max-width: 920px;
  margin: 0 auto;
  padding: 48px 40px;
}

.prototype h1 {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 40px;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.section-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-subdued);
  margin: 0 0 12px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
```

### `styles/layout/prototype-<component>-preview.css`

The variants table uses **gap-based spacing** — no borders, no background color on the grid itself. Cells are transparent; the gaps create visual separation.

```css
.variants-table {
  display: grid;
  grid-template-columns: 88px repeat(var(--variants-columns, 3), minmax(148px, 1fr));
  grid-auto-rows: minmax(52px, auto);
  gap: 14px 20px;       /* ← gaps, not borders */
  margin-bottom: 24px;
  align-items: center;
  width: 100%;
  overflow-x: auto;
}

.variants-table__cell { min-width: 0; }

.variants-table__cell--state,
.variants-table__cell--heading {
  color: var(--color-text-subdued);
  font-family: inherit;
}

.variants-table__cell--state {
  display: flex;
  align-items: center;
  font-size: 11px;
}

.variants-table__cell--heading {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.variants-table__cell--demo {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

/* Freeze pointer events in the grid — states are visual only */
.variants-table__cell--demo .[component] {
  pointer-events: none;
}
```

The interactive demo panel:

```css
.interactive-demo { margin-bottom: 48px; }

.interactive-demo__panel {
  padding: 20px;
  border-radius: 20px;
  background: var(--demo-panel-bg, hsl(0deg 0% 100% / 20%));
  outline: 1px solid var(--demo-panel-outline, transparent);
}

.interactive-demo__cluster { display: flex; flex-direction: column; gap: 16px; }
.interactive-demo__row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.interactive-demo__row--core { align-items: stretch; flex-wrap: nowrap; }
```

Also define `[data-preview-state]` rules here for each variant — these freeze the visual appearance in the grid without JS:

```css
/* Example for a badge component */
.badge[data-kind="success"][data-preview-state="hover"] {
  /* paste the same styles as :hover */
  background-color: color-mix(in srgb, var(--demo-success-bg, var(--badge-success-bg)) 85%, white);
}

.badge[data-kind="success"][data-preview-state="focus"] {
  box-shadow: 0 0 0 1px var(--color-background), 0 0 0 3px var(--demo-focus-ring, var(--color-focus-ring));
}
```

Repeat for every variant × preview state combination.

---

## Step 9 — `styles/index.css`

```css
@import "./tokens/colors.css";
@import "./tokens/spacing.css";
@import "./tokens/borders.css";
@import "./tokens/typography.css";
@import "./tokens/motion.css";
@import "./tokens/shadows.css";
@import "./tokens/[component].css";
@import "./components/[component].css";
@import "./layout/prototype-[component]-preview.css";
@import "./layout/prototype.css";
@import "./components/settings.css";
```

---

## Checklist before finishing

- [ ] No hardcoded hex values in `components/` CSS — only `var(--token)` references
- [ ] `--demo-*` variables are the only way the settings panel talks to component CSS
- [ ] Every settings control has a matching `bind*` call in `app.js` and a case in `syncControls()`
- [ ] "Reset all" resets `state` to `DEFAULTS`, calls `syncControls()`, then `render()`
- [ ] The variants table grid uses CSS Grid with `--variants-columns` custom property so adding a variant is a one-line JS change
- [ ] `data-preview-state` forces hover/focus/pressed appearance in the grid without JS event simulation
- [ ] `prefers-reduced-motion` is respected for any animations (use `window.matchMedia`)
- [ ] The page opens directly in a browser (`open index.html`) — no server required