(function () {
  // ── HSLUV (inlined, MIT licence) ─────────────────────────────────────────
  var _HM = [
    [3.240969941904521, -1.537383177570093, -0.498610760293],
    [-0.96924363628087, 1.87596750150772, 0.041555057407175],
    [0.055630079696993, -0.20397695888897, 1.056971514242878],
  ];
  var _HI = [
    [0.41239079926595, 0.35758433938387, 0.18048078840183],
    [0.21263900587151, 0.71516867876775, 0.072192315360733],
    [0.019330818715591, 0.11919477979462, 0.95053215224966],
  ];
  var _HRU = 0.19783000664283, _HRV = 0.46831999493879;
  var _HK = 903.2962962, _HE = 0.0088564516;

  function _hLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function _hDlin(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function hexToRgb(hex) { var v = parseInt(hex.replace('#', ''), 16); return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]; }
  function _hRgbXyz(rgb) {
    var r = _hLin(rgb[0]/255), g = _hLin(rgb[1]/255), b = _hLin(rgb[2]/255);
    return [_HI[0][0]*r+_HI[0][1]*g+_HI[0][2]*b, _HI[1][0]*r+_HI[1][1]*g+_HI[1][2]*b, _HI[2][0]*r+_HI[2][1]*g+_HI[2][2]*b];
  }
  function _hXyzRgb(xyz) {
    return _HM.map(function(row) { return Math.max(0, Math.min(1, _hDlin(row[0]*xyz[0]+row[1]*xyz[1]+row[2]*xyz[2]))); });
  }
  function _hXyzLuv(xyz) {
    var Y = xyz[1], L = Y <= _HE ? _HK*Y : 116*Math.pow(Y,1/3)-16;
    if (!L) return [0,0,0];
    var d = xyz[0]+15*xyz[1]+3*xyz[2];
    return [L, 13*L*(4*xyz[0]/d-_HRU), 13*L*(9*xyz[1]/d-_HRV)];
  }
  function _hLuvXyz(luv) {
    var L = luv[0]; if (!L) return [0,0,0];
    var u = luv[1]/(13*L)+_HRU, v = luv[2]/(13*L)+_HRV;
    var Y = L<=8 ? L/_HK : Math.pow((L+16)/116,3);
    return [Y*9*u/(4*v), Y, Y*(12-3*u-20*v)/(4*v)];
  }
  function _hLuvLch(luv) {
    var C = Math.sqrt(luv[1]*luv[1]+luv[2]*luv[2]);
    var H = C < 1e-8 ? 0 : Math.atan2(luv[2],luv[1])*180/Math.PI;
    return [luv[0], C, H < 0 ? H+360 : H];
  }
  function _hLchLuv(lch) { var r = lch[2]*Math.PI/180; return [lch[0], Math.cos(r)*lch[1], Math.sin(r)*lch[1]]; }
  function _hBounds(L) {
    var s1 = Math.pow(L+16,3)/1560896, s2 = s1>_HE ? s1 : L/_HK, out = [];
    for (var i = 0; i < 3; i++) {
      var m1=_HM[i][0], m2=_HM[i][1], m3=_HM[i][2];
      for (var t = 0; t < 2; t++) {
        var top1=(284517*m1-94839*m3)*s2, top2=(838422*m3+769860*m2+731718*m1)*L*s2-769860*t*L, bot=(632260*m3-126452*m2)*s2+126452*t;
        out.push({ slope: top1/bot, intercept: top2/bot });
      }
    }
    return out;
  }
  function _hMaxC(L, H) {
    var hr=H*Math.PI/180, min=Infinity;
    _hBounds(L).forEach(function(b) { var len=b.intercept/(Math.sin(hr)-b.slope*Math.cos(hr)); if (len>=0) min=Math.min(min,len); });
    return min;
  }
  function hexToHsluv(hex) {
    var lch = _hLuvLch(_hXyzLuv(_hRgbXyz(hexToRgb(hex)))), L=lch[0], C=lch[1], H=lch[2];
    if (L > 99.9999999) return [H, 0, 100];
    if (L < 0.00000001) return [H, 0, 0];
    return [H, C/_hMaxC(L,H)*100, L];
  }
  function hsluvToHex(hsl) {
    var H=hsl[0], S=hsl[1], L=hsl[2];
    var C = (L>99.9999999||L<0.00000001) ? 0 : _hMaxC(L,H)/100*S;
    var rgb = _hXyzRgb(_hLuvXyz(_hLchLuv([L,C,H])));
    return '#' + rgb.map(function(c) { return ('0'+Math.round(c*255).toString(16)).slice(-2); }).join('');
  }
  // ── end HSLUV ────────────────────────────────────────────────────────────

  // ── Spring constants (match app.js exactly) ──────────────────────────────
  var PRESS_SPRING = { scale: 0.972, mass: 0.88, stiffness: 310, damping: 12 };
  var HOVER_SPRING = { scale: 1.018, mass: 0.76, stiffness: 370, damping: 11.5 };
  var prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  // ── Colour setup ─────────────────────────────────────────────────────────
  function hexBrightness(hex) {
    var rgb = hexToRgb(hex);
    return 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  }

  function contrastColor(hex) {
    return hexBrightness(hex) > 128 ? '#000000' : '#f9f6f5';
  }

  function autoPrimaryBorder(accentHex, bgHex) {
    var MIN_CONTRAST = 18;
    var hsl = hexToHsluv(accentHex);
    var pageBright = hexBrightness(bgHex);
    var darkerHex  = hsluvToHex([hsl[0], hsl[1], Math.max(0,   hsl[2] - 13)]);
    var lighterHex = hsluvToHex([hsl[0], hsl[1], Math.min(100, hsl[2] + 13)]);
    var useDarker  = Math.abs(hexBrightness(darkerHex)  - pageBright)
                  >= Math.abs(hexBrightness(lighterHex) - pageBright);
    function findBorderL(dir) {
      var step = 13;
      var borderL = Math.max(0, Math.min(100, hsl[2] + dir * step));
      while (Math.abs(borderL - hsl[2]) < MIN_CONTRAST) {
        var next = Math.max(0, Math.min(100, hsl[2] + dir * (step + 1)));
        if (next === borderL) break;
        step++;
        borderL = next;
      }
      return borderL;
    }
    var preferred = useDarker ? -1 : 1;
    var borderL = findBorderL(preferred);
    if (Math.abs(borderL - hsl[2]) < MIN_CONTRAST) { borderL = findBorderL(-preferred); }
    return hsluvToHex([hsl[0], hsl[1], borderL]);
  }

  function initColours() {
    var styles = getComputedStyle(document.documentElement);
    var accentHex = styles.getPropertyValue('--color-accent').trim();
    if (!accentHex) return;
    var bgHex = styles.getPropertyValue('--color-bg-page').trim() || '#ffffff';
    var hoverL  = window.PRIMARY_CONFIG ? window.PRIMARY_CONFIG.HOVER_L  : 5;
    var activeL = window.PRIMARY_CONFIG ? window.PRIMARY_CONFIG.ACTIVE_L : 10;
    var hsl = hexToHsluv(accentHex);
    var hoverBg   = hsluvToHex([hsl[0], hsl[1], Math.min(100, hsl[2] + hoverL)]);
    var activeBg  = hsluvToHex([hsl[0], hsl[1], Math.max(0,   hsl[2] - activeL)]);
    var fgColor        = contrastColor(accentHex);
    var borderHex      = autoPrimaryBorder(accentHex, bgHex);
    var gradientTop    = hsluvToHex([hsl[0], hsl[1], Math.min(100, hsl[2] + 20)]);
    var gradientBottom = hsluvToHex([hsl[0], hsl[1], Math.max(0,   hsl[2] - 10)]);
    document.documentElement.style.setProperty('--demo-primary-fg',                     fgColor);
    document.documentElement.style.setProperty('--demo-primary-hover-bg',               hoverBg);
    document.documentElement.style.setProperty('--demo-primary-active-bg',              activeBg);
    document.documentElement.style.setProperty('--demo-primary-border-color',           borderHex);
    document.documentElement.style.setProperty('--demo-primary-border-gradient-top',    gradientTop);
    document.documentElement.style.setProperty('--demo-primary-border-gradient-bottom', gradientBottom);
  }

  // ── Spring ───────────────────────────────────────────────────────────────
  function getSpringConfig(kind, mode) {
    if (kind === 'hover') {
      return mode === 'release'
        ? { stiffness: HOVER_SPRING.stiffness * 1.08, damping: HOVER_SPRING.damping * 0.92, mass: HOVER_SPRING.mass }
        : { stiffness: HOVER_SPRING.stiffness, damping: HOVER_SPRING.damping, mass: HOVER_SPRING.mass };
    }
    return mode === 'release'
      ? { stiffness: PRESS_SPRING.stiffness * 1.12, damping: PRESS_SPRING.damping * 0.9, mass: PRESS_SPRING.mass }
      : { stiffness: PRESS_SPRING.stiffness, damping: PRESS_SPRING.damping, mass: PRESS_SPRING.mass };
  }

  function runSpring(button, springName, cssVariable, targetScale, mode) {
    if (!button._springStates) button._springStates = {};
    if (!button._springStates[springName]) button._springStates[springName] = { pos: 1, vel: 0, raf: null };

    var springState = button._springStates[springName];

    if (prefersReducedMotion.matches) {
      if (springState.raf) { cancelAnimationFrame(springState.raf); springState.raf = null; }
      springState.pos = targetScale;
      springState.vel = 0;
      if (targetScale === 1) button.style.removeProperty(cssVariable);
      else button.style.setProperty(cssVariable, String(targetScale));
      return;
    }

    if (springState.raf) cancelAnimationFrame(springState.raf);

    var position = springState.pos;
    var velocity = springState.vel;
    var lastTick = null;
    var config = getSpringConfig(springName, mode);

    function tick(timestamp) {
      if (!lastTick) lastTick = timestamp;
      var deltaTime = Math.min((timestamp - lastTick) / 1000, 0.032);
      lastTick = timestamp;

      velocity += ((-config.stiffness * (position - targetScale) - config.damping * velocity) / config.mass) * deltaTime;
      position += velocity * deltaTime;

      if (springName === 'press' && targetScale === 1) position = Math.min(position, 1.035);

      springState.pos = position;
      springState.vel = velocity;
      button.style.setProperty(cssVariable, String(position));

      if (Math.abs(position - targetScale) < 0.00015 && Math.abs(velocity) < 0.001) {
        if (targetScale === 1) button.style.removeProperty(cssVariable);
        else button.style.setProperty(cssVariable, String(targetScale));
        springState.pos = targetScale;
        springState.vel = 0;
        springState.raf = null;
        return;
      }

      springState.raf = requestAnimationFrame(tick);
    }

    springState.raf = requestAnimationFrame(tick);
  }

  // bindHoverAnimation();
  // bindPressAnimation();

  // ── Secondary colour setup ───────────────────────────────────────────────
  function applySecondaryTokens(el, bgHex) {
    var dark  = hexBrightness(bgHex) < 128;
    var bgHsl = hexToHsluv(bgHex);
    var bgL   = bgHsl[2];
    var defaultL   = dark ? Math.min(100, bgL +  8) : Math.max(0, bgL -  4);
    var hoverL     = dark ? Math.min(100, bgL + 14) : Math.max(0, bgL -  9);
    var activeL    = dark ? Math.min(100, bgL + 19) : Math.max(0, bgL - 10);
    var activeLm23 = dark ? Math.min(100, bgL + 19) : Math.max(0, bgL - 14);
    var borderL    = dark ? Math.min(100, defaultL + 8) : Math.max(0, defaultL - 10);
    el.style.setProperty('--demo-secondary-fg',           contrastColor(bgHex));
    el.style.setProperty('--demo-secondary-bg',           hsluvToHex([bgHsl[0], bgHsl[1], defaultL]));
    el.style.setProperty('--demo-secondary-hover-bg',     hsluvToHex([bgHsl[0], bgHsl[1], hoverL]));
    el.style.setProperty('--demo-secondary-active-bg',    hsluvToHex([bgHsl[0], bgHsl[1], activeL]));
    el.style.setProperty('--demo-secondary-active-bg-23', hsluvToHex([bgHsl[0], bgHsl[1], activeLm23]));
    el.style.setProperty('--demo-secondary-border-color', hsluvToHex([bgHsl[0], bgHsl[1], borderL]));
  }

  function initSecondaryColours() {
    var styles = getComputedStyle(document.documentElement);
    var pageBg = styles.getPropertyValue('--color-bg-page').trim() || '#ffffff';
    applySecondaryTokens(document.documentElement, pageBg);

    var summaryBg = styles.getPropertyValue('--color-bg-summary').trim();
    if (summaryBg) {
      var summaryEl = document.querySelector('.summary-column');
      if (summaryEl) applySecondaryTokens(summaryEl, summaryBg);
    }
  }

  // ── Primary variant selector ─────────────────────────────────────────────
  function injectVariantStyles() {
    var s = document.createElement('style');
    s.textContent = [
      '.proto-variant{display:flex;position:relative;background:rgba(255,255,255,.08);border-radius:8px;padding:3px;width:100%}',
      '.proto-variant__indicator{position:absolute;top:3px;left:3px;width:calc((100% - 6px) / 3);height:calc(100% - 6px);background:rgba(255,255,255,.18);border-radius:6px;transform:translateX(calc(var(--variant-index,0) * 100%));transition:transform 220ms cubic-bezier(0.35,1.3,0.45,1);pointer-events:none}',
      '.proto-variant__btn{flex:1;position:relative;z-index:1;background:transparent;border:none;color:rgba(255,255,255,.55);font-family:inherit;font-size:12px;font-weight:500;padding:3px 0;border-radius:6px;cursor:pointer;line-height:1;text-align:center}',
      '.proto-variant__btn.is-active{color:#fff}',
      '.proto-variant__btn:hover:not(.is-active){color:rgba(255,255,255,.85)}'
    ].join('');
    document.head.appendChild(s);
  }

  function setPayButtonVariant(n) {
    var payBtn = document.querySelector('.button[data-kind="primary"]:not(.apply-btn)');
    if (payBtn) {
      if (n === 1) payBtn.removeAttribute('data-variant');
      else payBtn.setAttribute('data-variant', 'primary-' + n);
    }
    localStorage.setItem('pay-btn-variant', n);
    var variantEl = document.getElementById('proto-primary-variant');
    if (variantEl) variantEl.style.setProperty('--variant-index', n - 1);
    document.querySelectorAll('#proto-primary-variant [data-variant-btn]').forEach(function(b) {
      b.classList.toggle('is-active', b.getAttribute('data-variant-btn') === String(n));
    });
  }

  function setAddButtonVariant(n) {
    document.querySelectorAll('.add-btn').forEach(function(btn) {
      if (n === 1) btn.removeAttribute('data-variant');
      else btn.setAttribute('data-variant', 'secondary-' + n);
    });
    localStorage.setItem('add-btn-variant', n);
    var variantEl = document.getElementById('proto-secondary-variant');
    if (variantEl) variantEl.style.setProperty('--variant-index', n - 1);
    document.querySelectorAll('#proto-secondary-variant [data-variant-btn]').forEach(function(b) {
      b.classList.toggle('is-active', b.getAttribute('data-variant-btn') === String(n));
    });
  }

  function initVariantSelector() {
    injectVariantStyles();
    var savedPrimary = parseInt(localStorage.getItem('pay-btn-variant'), 10) || 1;
    setPayButtonVariant(savedPrimary);
    var savedSecondary = parseInt(localStorage.getItem('add-btn-variant'), 10) || 1;
    setAddButtonVariant(savedSecondary);
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-variant-btn]');
      if (!btn) return;
      var n = parseInt(btn.getAttribute('data-variant-btn'), 10);
      if (btn.closest('#proto-primary-variant')) setPayButtonVariant(n);
      else if (btn.closest('#proto-secondary-variant')) setAddButtonVariant(n);
    });
  }

  function init() {
    initColours();
    initSecondaryColours();
    initVariantSelector();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
