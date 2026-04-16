(function () {
  const VARIANTS = ['primary', 'secondary'];
  const STATES = ['default', 'hover', 'pressed', 'focus', 'disabled', 'loading'];
  const STATE_LABELS = {
    default: 'Default',
    hover: 'Hover',
    pressed: 'Pressed',
    focus: 'Focus',
    disabled: 'Disabled',
    loading: 'Loading',
  };
  const VARIANT_LABELS = {
    primary: 'Primary',
    secondary: 'Secondary',
    plain: 'Tertiary',
  };
  const SIZE_PRESETS = {
    small: { minSize: '36px', block: '6px', inline: '12px', compactInline: 'var(--spacing-small-200)', iconBlock: '36px', iconSize: '16px' },
    default: { minSize: '44px', block: '10px', inline: '16px', compactInline: 'var(--spacing-base)', iconBlock: '44px', iconSize: '18px' },
    large: { minSize: '48px', block: '12px', inline: '18px', compactInline: 'var(--spacing-large-100)', iconBlock: '48px', iconSize: '18px' },
    'extra-large': { minSize: '52px', block: '14px', inline: '20px', compactInline: 'var(--spacing-large-100)', iconBlock: '52px', iconSize: '20px' },
  };
  const DEFAULTS = {
    backgroundColor: '#FFFFFF',
    primaryColor: '#005BD3',
    primaryBorderColor: '#004DB1',
    secondaryColor: '#000000',
    secondaryBgOverride: null,
    secondaryBorderOverride: null,
    accentColor: '#005BD3',
    icon: 'None',
    sizePreset: 'default',
  };
  const PRESS_SPRING = {
    compactScale: 0.952,
    wideScale: 0.972,
    mass: 0.88,
    stiffness: 310,
    damping: 12,
  };
  const HOVER_SPRING = {
    compactScale: 1.034,
    wideScale: 1.018,
    plainCompactScale: 1.028,
    plainWideScale: 1.014,
    mass: 0.76,
    stiffness: 370,
    damping: 11.5,
  };

  const state = Object.assign({}, DEFAULTS);
  const prototypeEl = document.querySelector('.prototype');
  const variantsTable = document.getElementById('variants-table');
  const prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  let lastIconKey = null;
  let _hsluvUpdating = false;

  function getVariantLabel(variant) {
    return VARIANT_LABELS[variant] || 'Button';
  }

  function getButtonLabel(button) {
    return button && button.dataset.kind ? getVariantLabel(button.dataset.kind) : 'Button';
  }

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

  function hexToRgb(hex) {
    const value = parseInt(hex.replace('#', ''), 16);
    return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
  }

  // ── HSLUV ────────────────────────────────────────────────────────────────
  // Perceptually-uniform HSL colour space. https://www.hsluv.org
  // Inlined from the reference implementation (MIT licence).
  const _HM = [
    [3.240969941904521, -1.537383177570093, -0.498610760293],
    [-0.96924363628087, 1.87596750150772, 0.041555057407175],
    [0.055630079696993, -0.20397695888897, 1.056971514242878],
  ];
  const _HI = [
    [0.41239079926595, 0.35758433938387, 0.18048078840183],
    [0.21263900587151, 0.71516867876775, 0.072192315360733],
    [0.019330818715591, 0.11919477979462, 0.95053215224966],
  ];
  const _HRU = 0.19783000664283, _HRV = 0.46831999493879;
  const _HK = 903.2962962, _HE = 0.0088564516;

  function _hLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function _hDlin(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }

  function _hRgbXyz(rgb) {
    const r = _hLin(rgb[0] / 255), g = _hLin(rgb[1] / 255), b = _hLin(rgb[2] / 255);
    return [_HI[0][0]*r+_HI[0][1]*g+_HI[0][2]*b, _HI[1][0]*r+_HI[1][1]*g+_HI[1][2]*b, _HI[2][0]*r+_HI[2][1]*g+_HI[2][2]*b];
  }
  function _hXyzRgb(xyz) {
    return _HM.map(function(row) {
      return Math.max(0, Math.min(1, _hDlin(row[0]*xyz[0] + row[1]*xyz[1] + row[2]*xyz[2])));
    });
  }
  function _hXyzLuv(xyz) {
    const Y = xyz[1];
    const L = Y <= _HE ? _HK * Y : 116 * Math.pow(Y, 1/3) - 16;
    if (!L) return [0, 0, 0];
    const d = xyz[0] + 15*xyz[1] + 3*xyz[2];
    return [L, 13*L*(4*xyz[0]/d - _HRU), 13*L*(9*xyz[1]/d - _HRV)];
  }
  function _hLuvXyz(luv) {
    const L = luv[0];
    if (!L) return [0, 0, 0];
    const u = luv[1]/(13*L) + _HRU, v = luv[2]/(13*L) + _HRV;
    const Y = L <= 8 ? L/_HK : Math.pow((L+16)/116, 3);
    return [Y*9*u/(4*v), Y, Y*(12-3*u-20*v)/(4*v)];
  }
  function _hLuvLch(luv) {
    const C = Math.sqrt(luv[1]*luv[1] + luv[2]*luv[2]);
    const H = C < 1e-8 ? 0 : Math.atan2(luv[2], luv[1]) * 180 / Math.PI;
    return [luv[0], C, H < 0 ? H + 360 : H];
  }
  function _hLchLuv(lch) {
    const r = lch[2] * Math.PI / 180;
    return [lch[0], Math.cos(r)*lch[1], Math.sin(r)*lch[1]];
  }
  function _hBounds(L) {
    const s1 = Math.pow(L+16, 3) / 1560896;
    const s2 = s1 > _HE ? s1 : L/_HK;
    const out = [];
    for (let i = 0; i < 3; i++) {
      const [m1, m2, m3] = _HM[i];
      for (let t = 0; t < 2; t++) {
        const top1 = (284517*m1 - 94839*m3) * s2;
        const top2 = (838422*m3 + 769860*m2 + 731718*m1)*L*s2 - 769860*t*L;
        const bot  = (632260*m3 - 126452*m2)*s2 + 126452*t;
        out.push({ slope: top1/bot, intercept: top2/bot });
      }
    }
    return out;
  }
  function _hMaxC(L, H) {
    const hr = H * Math.PI / 180;
    let min = Infinity;
    _hBounds(L).forEach(function(b) {
      const len = b.intercept / (Math.sin(hr) - b.slope * Math.cos(hr));
      if (len >= 0) min = Math.min(min, len);
    });
    return min;
  }
  function hexToHsluv(hex) {
    const lch = _hLuvLch(_hXyzLuv(_hRgbXyz(hexToRgb(hex))));
    const [L, C, H] = lch;
    if (L > 99.9999999) return [H, 0, 100];
    if (L < 0.00000001) return [H, 0, 0];
    return [H, C / _hMaxC(L, H) * 100, L];
  }
  function hsluvToHex(hsl) {
    const [H, S, L] = hsl;
    const C = (L > 99.9999999 || L < 0.00000001) ? 0 : _hMaxC(L, H) / 100 * S;
    const rgb = _hXyzRgb(_hLuvXyz(_hLchLuv([L, C, H])));
    return '#' + rgb.map(function(c) { return ('0' + Math.round(c * 255).toString(16)).slice(-2); }).join('');
  }
  // ── end HSLUV ────────────────────────────────────────────────────────────

  function hexBrightness(hex) {
    const rgb = hexToRgb(hex);
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  }

  function mixBrightness(hex, mixHex, amount) {
    const a = hexToRgb(hex);
    const b = hexToRgb(mixHex);
    const t = amount / 100;
    const mixed = [
      a[0] * t + b[0] * (1 - t),
      a[1] * t + b[1] * (1 - t),
      a[2] * t + b[2] * (1 - t),
    ];
    return 0.299 * mixed[0] + 0.587 * mixed[1] + 0.114 * mixed[2];
  }

  function contrastColor(hex) {
    return hexBrightness(hex) > 128 ? '#000000' : '#f9f6f5';
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  function isDarkBackground() {
    return hexBrightness(state.backgroundColor) < 128;
  }

  function makeIconSvg(size) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  }

  function createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (content !== undefined) {
      element.textContent = content;
    }
    return element;
  }

  function createSpinner() {
    const spinner = createElement('span', 'spinner');
    spinner.setAttribute('aria-hidden', 'true');
    spinner.innerHTML = '<svg class="spinner__svg" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle class="spinner__circle" cx="16" cy="16" r="12" pathLength="100"></circle></svg>';
    return spinner;
  }

  function createLoadingIndicator() {
    const wrap = createElement('span', 'button__loading-wrap');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.appendChild(createSpinner());
    return wrap;
  }

  function getLoadingIndicator(button) {
    return button ? button.querySelector('.button__loading-wrap') : null;
  }

  function createButtonContent(label, iconPosition, iconSize, hidden) {
    const content = createElement('span', hidden ? 'button__label-invisible' : 'button__content');
    const showIcon = iconPosition !== 'None';
    const iconOnly = iconPosition === 'Only';

    if (hidden) {
      content.setAttribute('aria-hidden', 'true');
    }

    if (showIcon && iconPosition !== 'Right') {
      const icon = createElement('span', 'button__icon');
      icon.innerHTML = makeIconSvg(iconSize);
      content.appendChild(icon);
    }

    if (!iconOnly) {
      content.appendChild(createElement('span', 'button__text', label));
    }

    if (showIcon && iconPosition === 'Right') {
      const icon = createElement('span', 'button__icon');
      icon.innerHTML = makeIconSvg(iconSize);
      content.appendChild(icon);
    }

    return content;
  }

  function setButtonContent(button, options) {
    const config = Object.assign(
      { hidden: false, iconPosition: 'None', iconSize: null, label: getButtonLabel(button) },
      options || {}
    );
    const loadingWrap = getLoadingIndicator(button);
    const nextContent = createButtonContent(config.label, config.iconPosition, config.iconSize, config.hidden);

    Array.from(button.childNodes).forEach(function (child) {
      if (loadingWrap && child === loadingWrap) {
        return;
      }
      button.removeChild(child);
    });

    if (loadingWrap) {
      button.insertBefore(nextContent, loadingWrap);
    } else {
      button.appendChild(nextContent);
    }
  }

  function createPreviewButton(variant, stateName) {
    const button = createElement('button', 'button');
    button.type = 'button';
    button.dataset.kind = variant;

    if (stateName === 'hover' || stateName === 'pressed' || stateName === 'focus') {
      button.dataset.previewState = stateName;
    }

    if (stateName === 'disabled') {
      button.disabled = true;
    }

    setButtonContent(button, { label: getVariantLabel(variant) });

    if (stateName === 'loading') {
      button.setAttribute('aria-busy', 'true');
      button.appendChild(createLoadingIndicator());
    }

    return button;
  }

  function buildVariantsTable() {
    variantsTable.innerHTML = '';
    variantsTable.style.setProperty('--variants-columns', VARIANTS.length);
    variantsTable.appendChild(createElement('div', 'variants-table__cell variants-table__cell--corner', ''));

    VARIANTS.forEach(function (variant) {
      variantsTable.appendChild(createElement('div', 'variants-table__cell variants-table__cell--heading', getVariantLabel(variant)));
    });

    STATES.forEach(function (stateName) {
      variantsTable.appendChild(createElement('div', 'variants-table__cell variants-table__cell--state', STATE_LABELS[stateName]));

      VARIANTS.forEach(function (variant) {
        const cell = createElement('div', 'variants-table__cell variants-table__cell--demo');
        cell.appendChild(createPreviewButton(variant, stateName));
        variantsTable.appendChild(cell);
      });
    });
  }

  function getSpringConfig(kind, mode) {
    if (kind === 'hover') {
      if (mode === 'release') {
        return {
          stiffness: HOVER_SPRING.stiffness * 1.08,
          damping: HOVER_SPRING.damping * 0.92,
          mass: HOVER_SPRING.mass,
        };
      }

      return {
        stiffness: HOVER_SPRING.stiffness,
        damping: HOVER_SPRING.damping,
        mass: HOVER_SPRING.mass,
      };
    }

    if (mode === 'release') {
      return {
        stiffness: PRESS_SPRING.stiffness * 1.12,
        damping: PRESS_SPRING.damping * 0.9,
        mass: PRESS_SPRING.mass,
      };
    }

    return {
      stiffness: PRESS_SPRING.stiffness,
      damping: PRESS_SPRING.damping,
      mass: PRESS_SPRING.mass,
    };
  }

  function runSpring(button, springName, cssVariable, targetScale, mode) {
    if (!button) {
      return;
    }

    if (!button._springStates) {
      button._springStates = {};
    }

    if (!button._springStates[springName]) {
      button._springStates[springName] = { pos: 1, vel: 0, raf: null };
    }

    const springState = button._springStates[springName];

    if (prefersReducedMotion.matches) {
      if (springState.raf) {
        cancelAnimationFrame(springState.raf);
        springState.raf = null;
      }

      springState.pos = targetScale;
      springState.vel = 0;

      if (targetScale === 1) {
        button.style.removeProperty(cssVariable);
      } else {
        button.style.setProperty(cssVariable, String(targetScale));
      }

      return;
    }

    if (springState.raf) {
      cancelAnimationFrame(springState.raf);
    }

    let position = springState.pos;
    let velocity = springState.vel;
    let lastTick = null;
    const config = getSpringConfig(springName, mode);

    function tick(timestamp) {
      if (!lastTick) {
        lastTick = timestamp;
      }

      const deltaTime = Math.min((timestamp - lastTick) / 1000, 0.032);
      lastTick = timestamp;

      velocity += ((-config.stiffness * (position - targetScale) - config.damping * velocity) / config.mass) * deltaTime;
      position += velocity * deltaTime;

      if (springName === 'press' && targetScale === 1) {
        position = Math.min(position, 1.035);
      }

      springState.pos = position;
      springState.vel = velocity;
      button.style.setProperty(cssVariable, String(position));

      if (Math.abs(position - targetScale) < 0.00015 && Math.abs(velocity) < 0.001) {
        if (targetScale === 1) {
          button.style.removeProperty(cssVariable);
        } else {
          button.style.setProperty(cssVariable, String(targetScale));
        }

        springState.pos = targetScale;
        springState.vel = 0;
        springState.raf = null;
        return;
      }

      springState.raf = requestAnimationFrame(tick);
    }

    springState.raf = requestAnimationFrame(tick);
  }

  function getWidthFactor(button) {
    const width = button.getBoundingClientRect().width;
    return clamp((width - 44) / (220 - 44), 0, 1);
  }

  function getHoverScale(button) {
    const widthFactor = getWidthFactor(button);
    const compactScale = button.dataset.kind === 'plain' ? HOVER_SPRING.plainCompactScale : HOVER_SPRING.compactScale;
    const wideScale = button.dataset.kind === 'plain' ? HOVER_SPRING.plainWideScale : HOVER_SPRING.wideScale;
    return lerp(compactScale, wideScale, widthFactor);
  }

  function getPressScale(button) {
    return lerp(PRESS_SPRING.compactScale, PRESS_SPRING.wideScale, getWidthFactor(button));
  }

  function bindHoverAnimation() {
    document.addEventListener('pointerover', function (event) {
      const button = event.target.closest('.button');
      if (!button || button.disabled || button.contains(event.relatedTarget)) {
        return;
      }

      runSpring(button, 'hover', '--button-hover-scale', getHoverScale(button), 'press');
    });

    document.addEventListener('pointerout', function (event) {
      const button = event.target.closest('.button');
      if (!button || button.disabled || button.contains(event.relatedTarget)) {
        return;
      }

      runSpring(button, 'hover', '--button-hover-scale', 1, 'release');
    });
  }

  function bindPressAnimation() {
    function bindRelease(button) {
      function release() {
        runSpring(button, 'press', '--button-press-scale', 1, 'release');
        document.removeEventListener('pointerup', release);
        document.removeEventListener('pointercancel', release);
      }

      document.addEventListener('pointerup', release);
      document.addEventListener('pointercancel', release);
    }

    document.addEventListener('pointerdown', function (event) {
      const button = event.target.closest('.button');
      if (!button || button.disabled || prefersReducedMotion.matches) {
        return;
      }

      runSpring(button, 'press', '--button-press-scale', getPressScale(button), 'press');
      bindRelease(button);
    });

    document.addEventListener('keydown', function (event) {
      if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) {
        return;
      }

      const button = event.target.closest('.button');
      if (!button || button.disabled || prefersReducedMotion.matches) {
        return;
      }

      runSpring(button, 'press', '--button-press-scale', getPressScale(button), 'press');
    });

    document.addEventListener('keyup', function (event) {
      if (event.key !== ' ' && event.key !== 'Enter') {
        return;
      }

      const button = event.target.closest('.button');
      if (!button || button.disabled || prefersReducedMotion.matches) {
        return;
      }

      runSpring(button, 'press', '--button-press-scale', 1, 'release');
    });
  }

  function renderPage() {
    const darkBackground = isDarkBackground();

    document.body.style.backgroundColor = state.backgroundColor;
    prototypeEl.dataset.bgMode = darkBackground ? 'dark' : 'light';

    setVars(prototypeEl, {
      '--color-background': state.backgroundColor,
      '--color-text': darkBackground ? '#e5e5e5' : '#111111',
      '--color-text-subdued': darkBackground ? '#a3a3a3' : '#828282',
      '--demo-panel-bg': state.backgroundColor,
      '--demo-panel-outline': darkBackground ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
    });
  }


  function autoPrimaryBorder(step) {
    const s = (step != null && !isNaN(step)) ? step : 5;
    const hsl = hexToHsluv(state.primaryColor);
    const pageBright = hexBrightness(state.backgroundColor);
    const darkerHex  = hsluvToHex([hsl[0], hsl[1], Math.max(0,   hsl[2] - 13)]);
    const lighterHex = hsluvToHex([hsl[0], hsl[1], Math.min(100, hsl[2] + 13)]);
    const dir = Math.abs(hexBrightness(darkerHex) - pageBright)
             >= Math.abs(hexBrightness(lighterHex) - pageBright) ? -1 : 1;
    let borderL = Math.max(0, Math.min(100, hsl[2] + dir * s));
    const borderHex = hsluvToHex([hsl[0], hsl[1], borderL]);
    const borderBright = hexBrightness(borderHex);
    if (borderBright < 30)  borderL = Math.max(borderL, 40);
    if (borderBright > 225) borderL = Math.min(borderL, 80);
    return hsluvToHex([hsl[0], hsl[1], borderL]);
  }

  function syncHsluvInputs(prefix, hex) {
    if (_hsluvUpdating) return;
    const hsl = hexToHsluv(hex);
    ['h', 's', 'l'].forEach(function(axis, i) {
      const val = Math.round(hsl[i]);
      const range = document.getElementById('setting-' + prefix + '-' + axis);
      const num   = document.getElementById('setting-' + prefix + '-' + axis + '-num');
      if (range) range.value = val;
      if (num)   num.value   = val;
    });
  }

  function bindHsluvInputs(prefix, onHex) {
    function readHsl() {
      return ['h', 's', 'l'].map(function(axis) {
        return parseFloat(document.getElementById('setting-' + prefix + '-' + axis).value) || 0;
      });
    }
    ['h', 's', 'l'].forEach(function(axis) {
      const range = document.getElementById('setting-' + prefix + '-' + axis);
      const num   = document.getElementById('setting-' + prefix + '-' + axis + '-num');
      range.addEventListener('input', function() {
        num.value = range.value;
        _hsluvUpdating = true;
        onHex(hsluvToHex(readHsl()));
        _hsluvUpdating = false;
      });
      num.addEventListener('change', function() {
        const clamped = Math.max(parseFloat(range.min), Math.min(parseFloat(range.max), parseFloat(num.value) || 0));
        num.value = clamped;
        range.value = clamped;
        _hsluvUpdating = true;
        onHex(hsluvToHex(readHsl()));
        _hsluvUpdating = false;
      });
    });
  }

  function bindChevron(chevronId, panelId) {
    const chevron = document.getElementById(chevronId);
    const panel   = document.getElementById(panelId);
    chevron.addEventListener('click', function() {
      const isOpen = panel.classList.toggle('is-open');
      chevron.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  function readLInput(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback;
    var v = parseFloat(el.value);
    return isNaN(v) ? fallback : v;
  }

  function renderPrimary() {
    const hsl = hexToHsluv(state.primaryColor);
    const hoverLStep      = readLInput('setting-primary-hover-l',         5);
    const activeLStep     = readLInput('setting-primary-active-l',        10);
    const borderContrast  = readLInput('setting-primary-border-contrast', 5);
    const gradTopStep     = readLInput('setting-primary-grad-top-l',      20);
    const gradBotStep     = readLInput('setting-primary-grad-bottom-l',   10);
    const borderHex       = autoPrimaryBorder(borderContrast);
    const gradientTop     = hsluvToHex([hsl[0], hsl[1], Math.min(100, hsl[2] + gradTopStep)]);
    const gradientBottom  = hsluvToHex([hsl[0], hsl[1], Math.max(0,   hsl[2] - gradBotStep)]);
    const hoverDir        = hsl[2] > 50 ? -1 : 1;
    const hoverBg         = hsluvToHex([hsl[0], hsl[1], Math.max(0, Math.min(100, hsl[2] + hoverDir * hoverLStep))]);
    const activeBg        = hsluvToHex([hsl[0], hsl[1], Math.max(0,   hsl[2] - activeLStep)]);
    setVars(prototypeEl, {
      '--demo-primary-bg': state.primaryColor,
      '--demo-primary-fg': contrastColor(state.primaryColor),
      '--demo-primary-border-color': borderHex,
      '--demo-primary-border-gradient-top':    gradientTop,
      '--demo-primary-border-gradient-bottom': gradientBottom,
      '--demo-primary-hover-bg':  hoverBg,
      '--demo-primary-active-bg': activeBg,
    });
  }

  function renderSecondary() {
    const darkBackground = isDarkBackground();
    const customColor = state.secondaryColor.toLowerCase() !== '#000000';
    const foreground = customColor ? state.secondaryColor : contrastColor(state.backgroundColor);

    const bgHsl = hexToHsluv(state.backgroundColor);
    const bgL = bgHsl[2];

    let defaultL, hoverL, activeL, activeL23, borderL;
    if (darkBackground) {
      defaultL = Math.min(100, bgL + 8);
      hoverL   = Math.min(100, bgL + 14);
      activeL  = Math.min(100, bgL + 19);
      activeL23 = Math.min(100, bgL + 19);
      borderL  = Math.min(100, defaultL + 8);
    } else {
      const defaultLStep  = readLInput('setting-secondary-default-l',   -4);
      const hoverLStep    = readLInput('setting-secondary-hover-l',      -9);
      const activeLStep   = readLInput('setting-secondary-active-l',    -10);
      const active23LStep = readLInput('setting-secondary-active23-l',  -14);
      const borderLStep   = readLInput('setting-secondary-border-l',    -8);
      defaultL  = Math.max(0, bgL + defaultLStep);
      hoverL    = Math.max(0, bgL + hoverLStep);
      activeL   = Math.max(0, bgL + activeLStep);
      activeL23 = Math.max(0, bgL + active23LStep);
      borderL   = Math.max(0, bgL + borderLStep);
    }

    const autoBg = hsluvToHex([bgHsl[0], bgHsl[1], defaultL]);
    const background = state.secondaryBgOverride || autoBg;

    let hoverBg, activeBg, activeBg23;
    if (state.secondaryBgOverride) {
      const ov = hexToHsluv(state.secondaryBgOverride);
      hoverBg    = hsluvToHex([ov[0], ov[1], darkBackground ? Math.min(100, ov[2] + 6)  : Math.max(0, ov[2] - 5)]);
      activeBg   = hsluvToHex([ov[0], ov[1], darkBackground ? Math.min(100, ov[2] + 19) : Math.max(0, ov[2] - 10)]);
      activeBg23 = hsluvToHex([ov[0], ov[1], darkBackground ? Math.min(100, ov[2] + 19) : Math.max(0, ov[2] - 14)]);
    } else {
      hoverBg    = hsluvToHex([bgHsl[0], bgHsl[1], hoverL]);
      activeBg   = hsluvToHex([bgHsl[0], bgHsl[1], activeL]);
      activeBg23 = hsluvToHex([bgHsl[0], bgHsl[1], activeL23]);
    }

    const autoBorderHex = hsluvToHex([bgHsl[0], bgHsl[1], borderL]);

    setVars(prototypeEl, {
      '--demo-secondary-fg': foreground,
      '--demo-secondary-bg': background,
      '--demo-secondary-hover-bg': hoverBg,
      '--demo-secondary-active-bg': activeBg,
      '--demo-secondary-active-bg-23': activeBg23,
      '--demo-secondary-border-color': autoBorderHex,
    });

    if (!state.secondaryBgOverride) {
      document.getElementById('setting-secondary-bg').value = background;
      document.getElementById('setting-secondary-bg-hex').value = background.toUpperCase();
    }
  }

  function renderSecondary4() {
    const darkBackground = isDarkBackground();
    const bgHsl = hexToHsluv(state.backgroundColor);
    const bgL = bgHsl[2];

    // Base: 25% of the way from bgL toward white — matches color-mix(oklch, white 25%)
    const baseL = bgL + (100 - bgL) * 0.25;

    const hoverStep  = readLInput('setting-secondary4-hover-l',  5);
    const activeStep = readLInput('setting-secondary4-active-l', 8);

    const hoverL  = darkBackground
      ? Math.min(100, baseL + hoverStep)
      : Math.max(0,   baseL - hoverStep);
    const activeL = darkBackground
      ? Math.min(100, baseL + activeStep)
      : Math.max(0,   baseL - activeStep);

    setVars(prototypeEl, {
      '--demo-secondary-4-bg':        hsluvToHex([bgHsl[0], bgHsl[1], baseL]),
      '--demo-secondary-4-hover-bg':  hsluvToHex([bgHsl[0], bgHsl[1], hoverL]),
      '--demo-secondary-4-active-bg': hsluvToHex([bgHsl[0], bgHsl[1], activeL]),
    });
  }

  function renderPlain() {
    setVars(prototypeEl, {
      '--demo-focus-ring': state.accentColor,
      '--demo-plain-fg': isDarkBackground() ? '#ffffff' : state.secondaryColor,
    });
  }

  function renderSize() {
    const preset = SIZE_PRESETS[state.sizePreset];
    setVars(prototypeEl, {
      '--button-height': preset.minSize,
      '--button-padding-block': preset.block,
      '--button-padding-inline': preset.inline,
      '--button-padding-inline-compact': preset.compactInline,
      '--button-icon-padding-block': preset.iconBlock,
      '--button-icon-size': preset.iconSize,
      '--button-min-size': preset.minSize,
    });
  }

  function renderIcons() {
    const iconKey = state.icon + '|' + state.sizePreset;
    if (iconKey === lastIconKey) {
      return;
    }

    lastIconKey = iconKey;

    const iconPosition = state.icon;
    const iconSize = SIZE_PRESETS[state.sizePreset].iconSize;

    document.querySelectorAll('.button').forEach(function (button) {
      button.dataset.iconPosition = iconPosition.toLowerCase();
      setButtonContent(button, {
        hidden: button.querySelector('.button__label-invisible') !== null,
        iconPosition: iconPosition,
        iconSize: iconSize,
        label: getButtonLabel(button),
      });
    });
  }

  function saveVarsToStorage() {
    var params = {
      primaryHoverL:      readLInput('setting-primary-hover-l',         5),
      primaryActiveL:     readLInput('setting-primary-active-l',        10),
      primaryBorderStep:  readLInput('setting-primary-border-contrast', 5),
      primaryGradTopL:    readLInput('setting-primary-grad-top-l',      20),
      primaryGradBotL:    readLInput('setting-primary-grad-bottom-l',   10),
      secondaryDefaultL:  readLInput('setting-secondary-default-l',     -4),
      secondaryHoverL:    readLInput('setting-secondary-hover-l',       -9),
      secondaryActiveL:   readLInput('setting-secondary-active-l',      -10),
      secondaryActive23L: readLInput('setting-secondary-active23-l',    -14),
      secondaryBorderL:   readLInput('setting-secondary-border-l',      -8),
      secondary4HoverL:   readLInput('setting-secondary4-hover-l',       5),
      secondary4ActiveL:  readLInput('setting-secondary4-active-l',      8),
    };
    try { localStorage.setItem('btn-pg-params', JSON.stringify(params)); } catch(e) {}
  }

  function render() {
    renderPage();
    renderPrimary();
    renderSecondary();
    renderSecondary4();
    renderPlain();
    renderSize();
    renderIcons();
    saveVarsToStorage();
  }

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
      if (!value.startsWith('#')) {
        value = '#' + value;
      }

      if (/^#[0-9a-fA-F]{6}$/.test(value)) {
        state[stateKey] = value;
        colorInput.value = value;
        render();
      }
    });
  }

  function bindSelect(id, stateKey) {
    document.getElementById(id).addEventListener('change', function (event) {
      state[stateKey] = event.target.value;
      render();
    });
  }

  function syncControls() {
    document.getElementById('setting-background').value = state.backgroundColor;
    document.getElementById('setting-background-hex').value = state.backgroundColor;
    document.getElementById('setting-branded-bg').value = state.primaryColor;
    document.getElementById('setting-branded-bg-hex').value = state.primaryColor;
    document.getElementById('setting-branded-text').value = state.secondaryColor;
    document.getElementById('setting-branded-text-hex').value = state.secondaryColor;
    document.getElementById('setting-plain-color').value = state.accentColor;
    document.getElementById('setting-plain-color-hex').value = state.accentColor;
    document.getElementById('setting-icon').value = state.icon;
    document.getElementById('setting-size-preset').value = state.sizePreset;
  }

  buildVariantsTable();

  bindColorInput('setting-background', 'setting-background-hex', 'backgroundColor');
  bindColorInput('setting-branded-bg', 'setting-branded-bg-hex', 'primaryColor');
  bindColorInput('setting-branded-text', 'setting-branded-text-hex', 'secondaryColor');
  bindColorInput('setting-plain-color', 'setting-plain-color-hex', 'accentColor');
  bindSelect('setting-icon', 'icon');
  bindSelect('setting-size-preset', 'sizePreset');

  bindColorInput('setting-secondary-bg', 'setting-secondary-bg-hex', 'secondaryBgOverride');

  [
    'setting-primary-hover-l', 'setting-primary-active-l',
    'setting-primary-border-contrast', 'setting-primary-grad-top-l', 'setting-primary-grad-bottom-l',
    'setting-secondary-default-l', 'setting-secondary-hover-l', 'setting-secondary-active-l',
    'setting-secondary-active23-l', 'setting-secondary-border-l',
    'setting-secondary4-hover-l', 'setting-secondary4-active-l',
  ].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function() { render(); });
  });

  document.getElementById('setting-border-radius').addEventListener('change', function () {
    prototypeEl.style.setProperty('--button-radius', 'var(--' + this.value + ')');
  });
  // bindHoverAnimation();
  // bindPressAnimation();

  document.getElementById('global-reset-all').addEventListener('click', function () {
    Object.assign(state, DEFAULTS);
    lastIconKey = null;
    prototypeEl.style.removeProperty('--button-radius');
    document.getElementById('setting-border-radius').value = 'cornerradius-base';
    document.querySelectorAll('.settings-widget__l-num').forEach(function(el) {
      el.value = el.defaultValue;
    });
    // Reset page nav to Button overview
    if (pageSelect) pageSelect.value = 'button-overview';
    localStorage.removeItem('nav-page-type');
    localStorage.removeItem('nav-page-theme');
    localStorage.removeItem('nav-order-index-theme');
    localStorage.removeItem('nav-order-status-theme');
    localStorage.removeItem('nav-viewport');
    setViewportMode('desktop');
    applyPageSelection();
    syncControls();
    render();
  });

  function bindSection(btnId, contentId) {
    var btn = document.getElementById(btnId);
    var content = document.getElementById(contentId);
    if (!btn || !content) return;
    var storageKey = 'section-' + contentId;
    var saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      var collapsed = saved === 'collapsed';
      content.classList.toggle('is-collapsed', collapsed);
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    btn.addEventListener('click', function() {
      var collapsed = content.classList.toggle('is-collapsed');
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      localStorage.setItem(storageKey, collapsed ? 'collapsed' : 'expanded');
    });
  }

  bindSection('section-buttons-btn', 'section-buttons-content');
  bindSection('section-colours-btn', 'section-colours-content');
  bindSection('section-button-btn', 'section-button-content');

  syncControls();
  render();

  // ── Page navigation ──────────────────────────────────────────────────
  var THEME_PAGE_URLS = {
    'plain-goods': 'plain-goods.html',
    'pitch':       'pitch.html',
    'heritage':    'heritage.html',
    'ghia':        'ghia.html',
  };

  var STATIC_PAGE_URLS = {
    'order-index':  'order-index.html',
    'order-status': 'order-status.html',
  };

  var pageSelect             = document.getElementById('setting-page');
  var pageThemeSelect        = document.getElementById('setting-page-theme');
  var pageSubSection         = document.getElementById('page-sub-section');
  var orderIndexSubSection    = document.getElementById('order-index-sub-section');
  var orderIndexThemeSelect   = document.getElementById('setting-order-index-theme');
  var orderStatusSubSection   = document.getElementById('order-status-sub-section');
  var orderStatusThemeSelect  = document.getElementById('setting-order-status-theme');
  var themeFrame             = document.getElementById('theme-frame');
  var viewportArea           = document.getElementById('viewport-area');
  var viewportRow            = document.getElementById('setting-viewport-row');
  var viewportToggle         = document.getElementById('setting-viewport');
  var overviewOnlySections = [
    document.getElementById('section-buttons'),
    document.getElementById('section-colours'),
    document.getElementById('section-styles'),
    document.getElementById('settings-footer'),
  ];

  function updateVariantPills(containerId, activeV) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('[data-v]').forEach(function (btn) {
      btn.classList.toggle('is-active', parseInt(btn.dataset.v, 10) === activeV);
    });
    container.style.setProperty('--active-idx', activeV - 1);
  }

  function getThemeFrameUrl() {
    return THEME_PAGE_URLS[pageThemeSelect.value] || 'plain-goods.html';
  }

  function getOrderIndexUrl() {
    var theme = orderIndexThemeSelect ? orderIndexThemeSelect.value : 'plain-goods';
    var pv = localStorage.getItem('pay-btn-variant') || '1';
    var sv = localStorage.getItem('add-btn-variant') || '1';
    return 'order-index.html?theme=' + theme + '&pv=' + pv + '&sv=' + sv;
  }

  function getOrderStatusUrl() {
    var theme = orderStatusThemeSelect ? orderStatusThemeSelect.value : 'plain-goods';
    var pv = localStorage.getItem('pay-btn-variant') || '1';
    var sv = localStorage.getItem('add-btn-variant') || '1';
    return 'order-status.html?theme=' + theme + '&pv=' + pv + '&sv=' + sv;
  }

  function applyPageSelection() {
    var page = pageSelect.value;
    var isOverview = page === 'button-overview';
    var isCheckout = page === 'checkout';

    localStorage.setItem('nav-page-type', page);
    pageSubSection.hidden = !isCheckout;
    if (orderIndexSubSection)  orderIndexSubSection.hidden  = page !== 'order-index';
    if (orderStatusSubSection) orderStatusSubSection.hidden = page !== 'order-status';
    prototypeEl.hidden = !isOverview;
    overviewOnlySections.forEach(function (el) { if (el) el.hidden = !isOverview; });

    if (viewportRow) viewportRow.hidden = isOverview;

    if (!isOverview) {
      if (viewportArea) viewportArea.removeAttribute('hidden');
      var frameSrc;
      if (isCheckout) {
        frameSrc = getThemeFrameUrl();
      } else if (page === 'order-index') {
        frameSrc = getOrderIndexUrl();
      } else if (page === 'order-status') {
        frameSrc = getOrderStatusUrl();
      } else {
        frameSrc = STATIC_PAGE_URLS[page] || '';
      }
      themeFrame.src = frameSrc;
    } else {
      if (viewportArea) viewportArea.hidden = true;
      themeFrame.src = '';
      render();
    }
  }

  function reloadThemeFrame() {
    if (viewportArea && !viewportArea.hidden) {
      var page = pageSelect ? pageSelect.value : '';
      if (page === 'order-index') {
        themeFrame.src = getOrderIndexUrl();
      } else if (page === 'order-status') {
        themeFrame.src = getOrderStatusUrl();
      } else {
        themeFrame.src = getThemeFrameUrl();
      }
    }
  }

  // ── Viewport toggle ──────────────────────────────────────────────────
  function setViewportMode(v) {
    if (!viewportArea) return;
    viewportArea.classList.toggle('is-mobile', v === 'mobile');
    if (viewportToggle) {
      viewportToggle.querySelectorAll('[data-viewport]').forEach(function (btn) {
        var active = btn.dataset.viewport === v;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }
    localStorage.setItem('nav-viewport', v);
  }

  if (viewportToggle) {
    viewportToggle.querySelectorAll('[data-viewport]').forEach(function (btn) {
      btn.addEventListener('click', function () { setViewportMode(btn.dataset.viewport); });
    });
  }

  // Init page nav state from localStorage
  var savedPageType        = localStorage.getItem('nav-page-type')         || 'button-overview';
  var savedPageTheme       = localStorage.getItem('nav-page-theme')        || 'plain-goods';
  var savedOrderIndexTheme  = localStorage.getItem('nav-order-index-theme')  || 'plain-goods';
  var savedOrderStatusTheme = localStorage.getItem('nav-order-status-theme') || 'plain-goods';
  var savedPrimaryV  = parseInt(localStorage.getItem('pay-btn-variant'), 10) || 1;
  var savedSecondaryV = parseInt(localStorage.getItem('add-btn-variant'), 10) || 1;
  var savedViewport  = localStorage.getItem('nav-viewport') || 'desktop';

  if (pageSelect)             pageSelect.value             = savedPageType;
  if (pageThemeSelect)        pageThemeSelect.value        = savedPageTheme;
  if (orderIndexThemeSelect)   orderIndexThemeSelect.value   = savedOrderIndexTheme;
  if (orderStatusThemeSelect)  orderStatusThemeSelect.value  = savedOrderStatusTheme;
  setViewportMode(savedViewport);
  updateVariantPills('setting-primary-variant-pills',   savedPrimaryV);
  updateVariantPills('setting-secondary-variant-pills', savedSecondaryV);
  updateVariantPills('setting-oi-primary-variant-pills',   savedPrimaryV);
  updateVariantPills('setting-oi-secondary-variant-pills', savedSecondaryV);
  updateVariantPills('setting-os-primary-variant-pills',   savedPrimaryV);
  updateVariantPills('setting-os-secondary-variant-pills', savedSecondaryV);

  if (pageSelect) {
    pageSelect.addEventListener('change', applyPageSelection);
  }

  if (pageThemeSelect) {
    pageThemeSelect.addEventListener('change', function () {
      localStorage.setItem('nav-page-theme', pageThemeSelect.value);
      reloadThemeFrame();
    });
  }

  if (orderIndexThemeSelect) {
    orderIndexThemeSelect.addEventListener('change', function () {
      localStorage.setItem('nav-order-index-theme', orderIndexThemeSelect.value);
      if (pageSelect && pageSelect.value === 'order-index') {
        themeFrame.src = getOrderIndexUrl();
      }
    });
  }

  if (orderStatusThemeSelect) {
    orderStatusThemeSelect.addEventListener('change', function () {
      localStorage.setItem('nav-order-status-theme', orderStatusThemeSelect.value);
      if (pageSelect && pageSelect.value === 'order-status') {
        themeFrame.src = getOrderStatusUrl();
      }
    });
  }

  function setPrimaryVariant(v) {
    localStorage.setItem('pay-btn-variant', v);
    updateVariantPills('setting-primary-variant-pills',    v);
    updateVariantPills('setting-oi-primary-variant-pills', v);
    updateVariantPills('setting-os-primary-variant-pills', v);
    reloadThemeFrame();
  }

  function setSecondaryVariant(v) {
    localStorage.setItem('add-btn-variant', v);
    updateVariantPills('setting-secondary-variant-pills',    v);
    updateVariantPills('setting-oi-secondary-variant-pills', v);
    updateVariantPills('setting-os-secondary-variant-pills', v);
    reloadThemeFrame();
  }

  document.querySelectorAll('#setting-primary-variant-pills [data-v]').forEach(function (btn) {
    btn.addEventListener('click', function () { setPrimaryVariant(parseInt(btn.dataset.v, 10)); });
  });

  document.querySelectorAll('#setting-secondary-variant-pills [data-v]').forEach(function (btn) {
    btn.addEventListener('click', function () { setSecondaryVariant(parseInt(btn.dataset.v, 10)); });
  });

  document.querySelectorAll('#setting-oi-primary-variant-pills [data-v]').forEach(function (btn) {
    btn.addEventListener('click', function () { setPrimaryVariant(parseInt(btn.dataset.v, 10)); });
  });

  document.querySelectorAll('#setting-oi-secondary-variant-pills [data-v]').forEach(function (btn) {
    btn.addEventListener('click', function () { setSecondaryVariant(parseInt(btn.dataset.v, 10)); });
  });

  document.querySelectorAll('#setting-os-primary-variant-pills [data-v]').forEach(function (btn) {
    btn.addEventListener('click', function () { setPrimaryVariant(parseInt(btn.dataset.v, 10)); });
  });

  document.querySelectorAll('#setting-os-secondary-variant-pills [data-v]').forEach(function (btn) {
    btn.addEventListener('click', function () { setSecondaryVariant(parseInt(btn.dataset.v, 10)); });
  });

  applyPageSelection();
})();
