(function () {
  var PRESS_SPRING = {
    compactScale: 0.965,
    wideScale: 0.982,
    mass: 0.75,
    stiffness: 400,
    damping: 16,
  };
  var PRESS_SPRING_56 = {
    compactScale: 0.968,
    wideScale: 0.984,
    mass: 0.7,
    stiffness: 430,
    damping: 17,
  };
  var RELEASE_SPRING_56 = {
    mass: 0.7,
    stiffness: 470,
    damping: 16,
  };
  var HOVER_SPRING = {
    compactScale: 1.016,
    wideScale: 1.008,
    plainCompactScale: 1.012,
    plainWideScale: 1.006,
    mass: 0.72,
    stiffness: 330,
    damping: 17,
  };
  var HOVER_RELEASE_SPRING = {
    mass: 0.72,
    stiffness: 320,
    damping: 18,
  };

  var prefersReducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function isVariant2(button) {
    return button && (button.dataset.variant === 'primary-2' || button.dataset.variant === 'secondary-2');
  }

  function isVariant56(button) {
    return button && (
      button.dataset.variant === 'primary-5' || button.dataset.variant === 'secondary-5' ||
      button.dataset.variant === 'primary-6' || button.dataset.variant === 'secondary-6'
    );
  }

  function getPressSpring(button) {
    return isVariant56(button) ? PRESS_SPRING_56 : PRESS_SPRING;
  }

  function getWidthFactor(button) {
    return clamp((button.getBoundingClientRect().width - 44) / (220 - 44), 0, 1);
  }

  function getHoverScale(button) {
    var f = getWidthFactor(button);
    var compact = button.dataset.kind === 'plain' ? HOVER_SPRING.plainCompactScale : HOVER_SPRING.compactScale;
    var wide    = button.dataset.kind === 'plain' ? HOVER_SPRING.plainWideScale    : HOVER_SPRING.wideScale;
    return lerp(compact, wide, f);
  }

  function getPressScale(button) {
    var spring = getPressSpring(button);
    return lerp(spring.compactScale, spring.wideScale, getWidthFactor(button));
  }

  function getSpringConfig(kind, mode, button) {
    if (kind === 'hover') {
      return mode === 'release'
        ? { stiffness: HOVER_RELEASE_SPRING.stiffness, damping: HOVER_RELEASE_SPRING.damping, mass: HOVER_RELEASE_SPRING.mass }
        : { stiffness: HOVER_SPRING.stiffness,         damping: HOVER_SPRING.damping,         mass: HOVER_SPRING.mass };
    }
    var spring = getPressSpring(button);
    if (mode === 'release') {
      return isVariant56(button)
        ? { stiffness: RELEASE_SPRING_56.stiffness, damping: RELEASE_SPRING_56.damping, mass: RELEASE_SPRING_56.mass }
        : { stiffness: 440, damping: 14, mass: 0.75 };
    }
    return { stiffness: spring.stiffness, damping: spring.damping, mass: spring.mass };
  }

  function runSpring(button, springName, cssVariable, targetScale, mode) {
    if (!button) return;
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
    var config = getSpringConfig(springName, mode, button);

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

  function bindHoverAnimation() {
    document.addEventListener('pointerover', function (event) {
      var button = event.target.closest('.button');
      if (!button || button.disabled || isVariant2(button) || button.contains(event.relatedTarget)) return;
      runSpring(button, 'hover', '--button-hover-scale', getHoverScale(button), 'press');
    });

    document.addEventListener('pointerout', function (event) {
      var button = event.target.closest('.button');
      if (!button || button.disabled || isVariant2(button) || button.contains(event.relatedTarget)) return;
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
      var button = event.target.closest('.button');
      if (!button || button.disabled || isVariant2(button) || prefersReducedMotion.matches) return;
      runSpring(button, 'press', '--button-press-scale', getPressScale(button), 'press');
      bindRelease(button);
    });

    document.addEventListener('keydown', function (event) {
      if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
      var button = event.target.closest('.button');
      if (!button || button.disabled || isVariant2(button) || prefersReducedMotion.matches) return;
      runSpring(button, 'press', '--button-press-scale', getPressScale(button), 'press');
    });

    document.addEventListener('keyup', function (event) {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      var button = event.target.closest('.button');
      if (!button || button.disabled || isVariant2(button) || prefersReducedMotion.matches) return;
      runSpring(button, 'press', '--button-press-scale', 1, 'release');
    });
  }

  bindHoverAnimation();
  bindPressAnimation();
})();
