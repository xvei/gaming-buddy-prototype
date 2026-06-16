(function () {
  "use strict";

  const baseCommit = "865d1b0c046b0d599554787cab9d3e72c141c35e";
  const baseApp = `https://cdn.jsdelivr.net/gh/xvei/gaming-buddy-prototype@${baseCommit}/app.js`;

  function installRafThrottle() {
    if (window.__gbRafThrottleActive) {
      return;
    }

    const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
    const frameDelay = 1000 / 30;
    const handles = new Map();
    let tokenSeed = 1;
    let lastFrame = 0;

    window.requestAnimationFrame = function throttledRequestAnimationFrame(callback) {
      const token = tokenSeed;
      tokenSeed += 1;

      function tick(time) {
        if (!handles.has(token)) {
          return;
        }

        if (time - lastFrame >= frameDelay) {
          lastFrame = time;
          handles.delete(token);
          callback(time);
          return;
        }

        handles.set(token, nativeRequestAnimationFrame(tick));
      }

      handles.set(token, nativeRequestAnimationFrame(tick));
      return token;
    };

    window.cancelAnimationFrame = function throttledCancelAnimationFrame(token) {
      const handle = handles.get(token);
      if (handle) {
        nativeCancelAnimationFrame(handle);
      }
      handles.delete(token);
    };

    window.__gbRafThrottleActive = true;
  }

  function loadStyle(href) {
    if (document.querySelector(`link[href="${href}"]`)) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.append(link);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.append(script);
    });
  }

  installRafThrottle();
  loadStyle("/wire-hover.css");
  loadScript(baseApp)
    .then(() => loadScript("/interaction-fixes.js"))
    .catch((error) => {
      console.error("Gaming Buddy app loader failed", error);
    });
})();
