(function () {
  // ── HSLUV (MIT) ──────────────────────────────────────────────────────
  const _HM = [[3.240969941904521,-1.537383177570093,-0.498610760293],[-0.96924363628087,1.87596750150772,0.041555057407175],[0.055630079696993,-0.20397695888897,1.056971514242878]];
  const _HI = [[0.41239079926595,0.35758433938387,0.18048078840183],[0.21263900587151,0.71516867876775,0.072192315360733],[0.019330818715591,0.11919477979462,0.95053215224966]];
  const _HRU=0.19783000664283,_HRV=0.46831999493879,_HK=903.2962962,_HE=0.0088564516;
  function _hLin(c){return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
  function _hDlin(c){return c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055;}
  function _hRgbXyz(rgb){const r=_hLin(rgb[0]/255),g=_hLin(rgb[1]/255),b=_hLin(rgb[2]/255);return[_HI[0][0]*r+_HI[0][1]*g+_HI[0][2]*b,_HI[1][0]*r+_HI[1][1]*g+_HI[1][2]*b,_HI[2][0]*r+_HI[2][1]*g+_HI[2][2]*b];}
  function _hXyzRgb(xyz){return _HM.map(row=>Math.max(0,Math.min(1,_hDlin(row[0]*xyz[0]+row[1]*xyz[1]+row[2]*xyz[2]))));}
  function _hXyzLuv(xyz){const Y=xyz[1],L=Y<=_HE?_HK*Y:116*Math.pow(Y,1/3)-16;if(!L)return[0,0,0];const d=xyz[0]+15*xyz[1]+3*xyz[2];return[L,13*L*(4*xyz[0]/d-_HRU),13*L*(9*xyz[1]/d-_HRV)];}
  function _hLuvXyz(luv){const L=luv[0];if(!L)return[0,0,0];const u=luv[1]/(13*L)+_HRU,v=luv[2]/(13*L)+_HRV,Y=L<=8?L/_HK:Math.pow((L+16)/116,3);return[Y*9*u/(4*v),Y,Y*(12-3*u-20*v)/(4*v)];}
  function _hLuvLch(luv){const C=Math.sqrt(luv[1]*luv[1]+luv[2]*luv[2]),H=C<1e-8?0:Math.atan2(luv[2],luv[1])*180/Math.PI;return[luv[0],C,H<0?H+360:H];}
  function _hLchLuv(lch){const r=lch[2]*Math.PI/180;return[lch[0],Math.cos(r)*lch[1],Math.sin(r)*lch[1]];}
  function _hBounds(L){const s1=Math.pow(L+16,3)/1560896,s2=s1>_HE?s1:L/_HK,out=[];for(let i=0;i<3;i++){const[m1,m2,m3]=_HM[i];for(let t=0;t<2;t++){const top1=(284517*m1-94839*m3)*s2,top2=(838422*m3+769860*m2+731718*m1)*L*s2-769860*t*L,bot=(632260*m3-126452*m2)*s2+126452*t;out.push({slope:top1/bot,intercept:top2/bot});}}return out;}
  function _hMaxC(L,H){const hr=H*Math.PI/180;let min=Infinity;_hBounds(L).forEach(b=>{const len=b.intercept/(Math.sin(hr)-b.slope*Math.cos(hr));if(len>=0)min=Math.min(min,len);});return min;}
  function hexToRgb(hex){const v=parseInt(hex.replace('#',''),16);return[(v>>16)&0xff,(v>>8)&0xff,v&0xff];}
  function hexToHsluv(hex){const lch=_hLuvLch(_hXyzLuv(_hRgbXyz(hexToRgb(hex)))),[L,C,H]=lch;if(L>99.9999999)return[H,0,100];if(L<0.00000001)return[H,0,0];return[H,C/_hMaxC(L,H)*100,L];}
  function hsluvToHex(hsl){const[H,S,L]=hsl,C=(L>99.9999999||L<0.00000001)?0:_hMaxC(L,H)/100*S,rgb=_hXyzRgb(_hLuvXyz(_hLchLuv([L,C,H])));return'#'+rgb.map(c=>('0'+Math.round(c*255).toString(16)).slice(-2)).join('');}
  function hexBrightness(hex){const[r,g,b]=hexToRgb(hex);return 0.299*r+0.587*g+0.114*b;}
  // ─────────────────────────────────────────────────────────────────────

  var root = document.documentElement;
  var HEX  = /^#[0-9a-fA-F]{6}$/;

  function sync() {
    var p = {};
    try { var saved = localStorage.getItem('btn-pg-params'); if (saved) p = JSON.parse(saved); } catch (e) {}

    var cs = getComputedStyle(root);

    // ── Primary ───────────────────────────────────────────────────────────
    var accent = cs.getPropertyValue('--color-accent').trim();
    if (HEX.test(accent)) {
      var hsl      = hexToHsluv(accent);
      var bStep    = p.primaryBorderStep != null ? p.primaryBorderStep : 5;
      var pageBg   = cs.getPropertyValue('--color-bg-page').trim();
      var pageBrt  = HEX.test(pageBg) ? hexBrightness(pageBg) : 255;
      var dkHex    = hsluvToHex([hsl[0], hsl[1], Math.max(0,   hsl[2] - 13)]);
      var ltHex    = hsluvToHex([hsl[0], hsl[1], Math.min(100, hsl[2] + 13)]);
      var bDir     = Math.abs(hexBrightness(dkHex) - pageBrt) >= Math.abs(hexBrightness(ltHex) - pageBrt) ? -1 : 1;
      var borderL  = Math.max(0, Math.min(100, hsl[2] + bDir * bStep));
      var borderHex = hsluvToHex([hsl[0], hsl[1], borderL]);
      var bBrt     = hexBrightness(borderHex);
      if (bBrt < 30)  borderL = Math.max(borderL, 40);
      if (bBrt > 225) borderL = Math.min(borderL, 80);
      borderHex = hsluvToHex([hsl[0], hsl[1], borderL]);

      var gradTop  = hsluvToHex([hsl[0], hsl[1], Math.min(100, hsl[2] + (p.primaryGradTopL != null ? p.primaryGradTopL : 20))]);
      var gradBot  = hsluvToHex([hsl[0], hsl[1], Math.max(0,   hsl[2] - (p.primaryGradBotL != null ? p.primaryGradBotL : 10))]);
      var hDir     = hsl[2] > 50 ? -1 : 1;

      root.style.setProperty('--demo-primary-fg',                     hexBrightness(accent) > 128 ? '#000000' : '#f9f6f5');
      root.style.setProperty('--demo-primary-border-color',           borderHex);
      root.style.setProperty('--demo-primary-border-gradient-top',    gradTop);
      root.style.setProperty('--demo-primary-border-gradient-bottom', gradBot);

      // Per-variant primary hover/active (P1–P6 share same base color, different step inputs)
      for (var pi = 1; pi <= 6; pi++) {
        var pHovStep = p['p' + pi + 'HoverL']  != null ? p['p' + pi + 'HoverL']  : (p.primaryHoverL  != null ? p.primaryHoverL  : 3);
        var pActStep = p['p' + pi + 'ActiveL'] != null ? p['p' + pi + 'ActiveL'] : (p.primaryActiveL != null ? p.primaryActiveL : 5);
        var pHovBg   = hsluvToHex([hsl[0], hsl[1], Math.max(0, Math.min(100, hsl[2] + hDir * pHovStep))]);
        var pActBg   = hsluvToHex([hsl[0], hsl[1], Math.max(0, hsl[2] - pActStep)]);
        root.style.setProperty('--demo-primary-' + pi + '-hover-bg',  pHovBg);
        root.style.setProperty('--demo-primary-' + pi + '-active-bg', pActBg);
      }
      // Shared vars (P1 values) for backward compat
      root.style.setProperty('--demo-primary-hover-bg',  root.style.getPropertyValue('--demo-primary-1-hover-bg'));
      root.style.setProperty('--demo-primary-active-bg', root.style.getPropertyValue('--demo-primary-1-active-bg'));
    }

    // ── Secondary ─────────────────────────────────────────────────────────
    var bgHex = cs.getPropertyValue('--color-bg-page').trim();
    if (HEX.test(bgHex)) {
      var bgHsl = hexToHsluv(bgHex);
      var bgL   = bgHsl[2];
      var isDark = hexBrightness(bgHex) < 128;

      function tsStep(step) {
        return isDark ? Math.min(100, bgL - step) : Math.max(0, bgL + step);
      }

      // S1 — dark mode uses hardcoded steps for backward compat
      var s1Def, s1Hov, s1Act, s1Brd;
      if (isDark) {
        s1Def = Math.min(100, bgL + 8);
        s1Hov = Math.min(100, bgL + 14);
        s1Act = Math.min(100, bgL + 19);
        s1Brd = Math.min(100, s1Def + 8);
      } else {
        s1Def = Math.max(0, bgL + (p.s1DefaultL != null ? p.s1DefaultL : (p.secondaryDefaultL != null ? p.secondaryDefaultL : -4)));
        s1Hov = Math.max(0, bgL + (p.s1HoverL   != null ? p.s1HoverL   : (p.secondaryHoverL   != null ? p.secondaryHoverL   : -9)));
        s1Act = Math.max(0, bgL + (p.s1ActiveL  != null ? p.s1ActiveL  : (p.secondaryActiveL  != null ? p.secondaryActiveL  : -8)));
        s1Brd = Math.max(0, bgL + (p.s1BorderL  != null ? p.s1BorderL  : (p.secondaryBorderL  != null ? p.secondaryBorderL  : -8)));
      }
      root.style.setProperty('--demo-secondary-bg',           hsluvToHex([bgHsl[0], bgHsl[1], s1Def]));
      root.style.setProperty('--demo-secondary-hover-bg',     hsluvToHex([bgHsl[0], bgHsl[1], s1Hov]));
      root.style.setProperty('--demo-secondary-active-bg',    hsluvToHex([bgHsl[0], bgHsl[1], s1Act]));
      root.style.setProperty('--demo-secondary-border-color', hsluvToHex([bgHsl[0], bgHsl[1], s1Brd]));

      // S2
      root.style.setProperty('--demo-secondary-2-bg',           hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s2DefaultL != null ? p.s2DefaultL : -4)]));
      root.style.setProperty('--demo-secondary-2-hover-bg',     hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s2HoverL   != null ? p.s2HoverL   : -9)]));
      root.style.setProperty('--demo-secondary-2-active-bg',    hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s2ActiveL  != null ? p.s2ActiveL  : -14)]));
      root.style.setProperty('--demo-secondary-2-border-color', hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s2BorderL  != null ? p.s2BorderL  : -8)]));

      // S3
      root.style.setProperty('--demo-secondary-3-bg',           hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s3DefaultL != null ? p.s3DefaultL : -4)]));
      root.style.setProperty('--demo-secondary-3-hover-bg',     hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s3HoverL   != null ? p.s3HoverL   : -9)]));
      root.style.setProperty('--demo-secondary-3-active-bg',    hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s3ActiveL  != null ? p.s3ActiveL  : -14)]));
      root.style.setProperty('--demo-secondary-3-border-color', hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s3BorderL  != null ? p.s3BorderL  : -8)]));

      // S4
      root.style.setProperty('--demo-secondary-4-bg',           hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s4DefaultL != null ? p.s4DefaultL : 0)]));
      root.style.setProperty('--demo-secondary-4-hover-bg',     hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s4HoverL   != null ? p.s4HoverL   : 0)]));
      root.style.setProperty('--demo-secondary-4-active-bg',    hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s4ActiveL  != null ? p.s4ActiveL  : -5)]));
      root.style.setProperty('--demo-secondary-4-border-color', hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s4BorderL  != null ? p.s4BorderL  : -8)]));

      // S5
      root.style.setProperty('--demo-secondary-5-bg',           hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s5DefaultL != null ? p.s5DefaultL : -2)]));
      root.style.setProperty('--demo-secondary-5-hover-bg',     hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s5HoverL   != null ? p.s5HoverL   : -7)]));
      root.style.setProperty('--demo-secondary-5-active-bg',    hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s5ActiveL  != null ? p.s5ActiveL  : -10)]));
      root.style.setProperty('--demo-secondary-5-border-color', hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s5BorderL  != null ? p.s5BorderL  : -8)]));

      // S6
      root.style.setProperty('--demo-secondary-6-bg',           hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s6DefaultL != null ? p.s6DefaultL : 0)]));
      root.style.setProperty('--demo-secondary-6-hover-bg',     hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s6HoverL   != null ? p.s6HoverL   : 0)]));
      root.style.setProperty('--demo-secondary-6-active-bg',    hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s6ActiveL  != null ? p.s6ActiveL  : -5)]));
      root.style.setProperty('--demo-secondary-6-border-color', hsluvToHex([bgHsl[0], bgHsl[1], tsStep(p.s6BorderL  != null ? p.s6BorderL  : -8)]));
    }
  }

  sync();

  window.addEventListener('storage', function (e) {
    if (e.key === 'btn-pg-params') sync();
  });
})();
