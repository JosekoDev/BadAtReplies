(function () {
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && Math.min(window.innerWidth, window.innerHeight) < 900);

  function ensureViewport() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content =
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
  }

  function focusKeyboardAssist() {
    const el = document.getElementById("keyboard-input-assist");
    if (!el) return false;
    el.removeAttribute("aria-hidden");
    el.removeAttribute("readonly");
    el.setAttribute("inputmode", "text");
    el.setAttribute("autocomplete", "off");
    el.setAttribute("autocorrect", "on");
    el.setAttribute("autocapitalize", "sentences");
    try {
      el.value = "";
      el.focus({ preventScroll: true });
    } catch (_) {
      el.focus();
    }
    return true;
  }

  function isUiChrome(t) {
    if (!t || !t.closest) return false;
    return !!t.closest(
      'input, textarea, select, button, a, [contenteditable="true"], .allow-native-input, #mobile-kb-fab, #mobile-type-toggle'
    );
  }

  function attachAutoKeyboard() {
    if (!isMobile) return;
    let typingMode = true; // default ON for phones
    const toggle = document.getElementById("mobile-type-toggle");
    if (toggle) {
      toggle.setAttribute("aria-pressed", "true");
      toggle.textContent = "Type: On";
      toggle.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          typingMode = !typingMode;
          toggle.setAttribute("aria-pressed", typingMode ? "true" : "false");
          toggle.textContent = typingMode ? "Type: On" : "Type: Off";
          if (typingMode) focusKeyboardAssist();
        },
        true
      );
    }

    const openKb = (ev) => {
      if (!typingMode) return;
      if (isUiChrome(ev.target)) return;
      // Keep this inside the gesture turn as much as possible for iOS
      focusKeyboardAssist();
      setTimeout(focusKeyboardAssist, 30);
      setTimeout(focusKeyboardAssist, 120);
    };

    document.body.addEventListener("touchend", openKb, { passive: true });
    document.body.addEventListener("pointerup", openKb, { passive: true });
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      html, body { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; }
      html { height: 100dvh; width: 100dvw; }
      body { touch-action: manipulation; overscroll-behavior: none; overflow: hidden; }
      #app, #root { width: 100%; height: 100%; }
      video, canvas {
        max-width: 100vw !important;
        max-height: 100dvh !important;
        object-fit: contain !important;
      }
      #keyboard-input-assist {
        position: fixed !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 16px !important;
        opacity: 0.02 !important;
        z-index: 2147483646 !important;
        border: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        font-size: 16px !important; /* prevent iOS zoom */
      }
      #mobile-kb-fab, #mobile-type-toggle {
        position: fixed;
        z-index: 2147483647;
        border: 0;
        border-radius: 999px;
        padding: 12px 16px;
        font: 600 13px/1.1 system-ui, -apple-system, sans-serif;
        color: #fff;
        background: rgba(15, 15, 15, 0.82);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        box-shadow: 0 6px 24px rgba(0,0,0,0.35);
      }
      #mobile-kb-fab {
        right: max(12px, env(safe-area-inset-right));
        bottom: max(16px, env(safe-area-inset-bottom));
      }
      #mobile-type-toggle {
        left: max(12px, env(safe-area-inset-left));
        bottom: max(16px, env(safe-area-inset-bottom));
      }
      #mobile-type-toggle[aria-pressed="true"] {
        background: rgba(0, 122, 255, 0.88);
      }
    `;
    document.head.appendChild(style);
  }

  function addControls() {
    if (!isMobile) return;
    if (!document.getElementById("mobile-kb-fab")) {
      const btn = document.createElement("button");
      btn.id = "mobile-kb-fab";
      btn.type = "button";
      btn.textContent = "Keyboard";
      btn.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          focusKeyboardAssist();
        },
        true
      );
      document.body.appendChild(btn);
    }
    if (!document.getElementById("mobile-type-toggle")) {
      const toggle = document.createElement("button");
      toggle.id = "mobile-type-toggle";
      toggle.type = "button";
      toggle.textContent = "Type: On";
      toggle.setAttribute("aria-pressed", "true");
      document.body.appendChild(toggle);
    }
  }

  function boot() {
    ensureViewport();
    addStyles();
    addControls();
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const ready = document.getElementById("keyboard-input-assist");
      if (ready || tries > 100) {
        clearInterval(timer);
        addControls();
        attachAutoKeyboard();
        if (isMobile) focusKeyboardAssist();
      }
    }, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
