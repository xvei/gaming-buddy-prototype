(function () {
  "use strict";

  const root = document.documentElement;
  root.classList.add("gb-interactions-ready");

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function getActiveViewName() {
    return document.querySelector(".view.is-active")?.id.replace("view-", "") || "home";
  }

  function syncTopbarPresentation() {
    if (typeof window.syncTopbarPresentation === "function") {
      window.syncTopbarPresentation();
    }
  }

  function renderPeekAvatar() {
    const peek = document.querySelector("#topbar-peek");
    if (!peek) {
      return;
    }

    peek.querySelector(".icon")?.remove();
    if (!peek.querySelector(".player-avatar")) {
      const avatar = document.createElement("span");
      avatar.className = "player-avatar avatar-small";
      avatar.dataset.name = "Mantas";
      avatar.dataset.status = "online";
      avatar.setAttribute("aria-hidden", "true");
      peek.prepend(avatar);
    }

    const avatar = peek.querySelector(".player-avatar");
    if (avatar && avatar.dataset.rendered !== "true") {
      if (typeof window.renderAvatar === "function") {
        window.renderAvatar(avatar);
      } else {
        avatar.classList.add("avatar-online");
        avatar.innerHTML = '<span class="avatar-initials">M</span>';
      }
      avatar.dataset.rendered = "true";
    }
  }

  function installTopbarStability() {
    const topbar = document.querySelector(".topbar");
    const cluster = document.querySelector(".topbar-cluster");
    const peek = document.querySelector("#topbar-peek");
    const profileMenu = document.querySelector("#profile-menu");
    let hideTimer = 0;

    if (!topbar || !cluster || !peek) {
      return;
    }

    function isAutoHidden() {
      return window.scrollY > 120;
    }

    function hidePeek() {
      if (!isAutoHidden() || !profileMenu?.classList.contains("is-hidden")) {
        return;
      }
      topbar.classList.remove("is-peeking");
      peek.setAttribute("aria-expanded", "false");
      syncTopbarPresentation();
    }

    function scheduleHide(delay = 180) {
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        if (topbar.matches(":hover") || cluster.matches(":hover") || peek.matches(":hover")) {
          return;
        }
        hidePeek();
      }, delay);
    }

    function pointerIsInSafeZone(event) {
      const clusterBounds = cluster.getBoundingClientRect();
      const peekBounds = peek.getBoundingClientRect();
      const left = Math.min(clusterBounds.left, peekBounds.left) - 96;
      const right = Math.max(clusterBounds.right, peekBounds.right) + 96;
      const bottom = Math.max(clusterBounds.bottom, peekBounds.bottom) + 70;
      return event.clientX >= left && event.clientX <= right && event.clientY <= bottom;
    }

    topbar.addEventListener("mouseenter", () => clearTimeout(hideTimer), true);
    topbar.addEventListener("mouseleave", (event) => {
      event.stopImmediatePropagation();
      scheduleHide(160);
    }, true);

    document.addEventListener("pointermove", (event) => {
      if (!topbar.classList.contains("is-peeking") || !isAutoHidden() || !profileMenu?.classList.contains("is-hidden")) {
        return;
      }

      event.stopImmediatePropagation();
      if (pointerIsInSafeZone(event)) {
        clearTimeout(hideTimer);
        return;
      }

      scheduleHide(120);
    }, true);
  }

  function installBackButtonGuard() {
    const backButton = document.querySelector("#back-button");
    const mainArea = document.querySelector(".main-area");
    let depth = 0;

    if (!backButton) {
      return;
    }

    function syncBackButton() {
      const activeViewName = getActiveViewName();
      backButton.classList.toggle("is-hidden", activeViewName === "home" || depth <= 0);
    }

    const originalUpdateBackButton = window.updateBackButton;
    if (typeof originalUpdateBackButton === "function") {
      window.updateBackButton = function patchedUpdateBackButton() {
        originalUpdateBackButton();
        syncBackButton();
      };
    }

    document.addEventListener("click", (event) => {
      if (event.target.closest("#back-button")) {
        depth = Math.max(0, depth - 1);
        window.setTimeout(syncBackButton, 0);
        return;
      }

      const trigger = event.target.closest("[data-view-target]");
      if (!trigger) {
        return;
      }

      const target = trigger.dataset.viewTarget;
      if (target && target !== getActiveViewName()) {
        depth += 1;
      }
      window.setTimeout(syncBackButton, 0);
    }, true);

    if (mainArea) {
      const observer = new MutationObserver(syncBackButton);
      observer.observe(mainArea, { subtree: true, attributes: true, attributeFilter: ["class"] });
    }

    syncBackButton();
  }

  function installPointerTilt() {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tiltSelector = [
      "button[data-corner-runners]",
      ".action-card",
      ".game-cover",
      ".duel-option",
      ".friend-item",
      ".metric-panel",
      ".panel",
      ".profile-card",
      ".world-card",
    ].join(",");

    document.querySelectorAll(tiltSelector).forEach((surface) => {
      if (surface.matches(".topbar-peek") || surface.dataset.tiltReady === "true") {
        return;
      }

      surface.dataset.tiltReady = "true";
      surface.classList.add("tilt-surface");
      let tiltFrame = 0;

      function resetTilt() {
        surface.classList.remove("is-pointer-tilting");
        surface.style.setProperty("--tilt-x", "0deg");
        surface.style.setProperty("--tilt-y", "0deg");
        if (tiltFrame) {
          cancelAnimationFrame(tiltFrame);
          tiltFrame = 0;
        }
      }

      surface.addEventListener("pointermove", (event) => {
        if (motionQuery.matches) {
          return;
        }

        const bounds = surface.getBoundingClientRect();
        const normalizedX = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2;
        const normalizedY = ((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 2;
        const maxTilt = surface.matches(".panel, .metric-panel, .profile-card, .action-card, .game-cover, .world-card")
          ? 4.8
          : 3.2;

        surface.classList.add("is-pointer-tilting");
        if (tiltFrame) {
          cancelAnimationFrame(tiltFrame);
        }
        tiltFrame = requestAnimationFrame(() => {
          surface.style.setProperty("--tilt-x", `${(normalizedX * maxTilt).toFixed(2)}deg`);
          surface.style.setProperty("--tilt-y", `${(-normalizedY * maxTilt).toFixed(2)}deg`);
          tiltFrame = 0;
        });
      });

      surface.addEventListener("pointerleave", resetTilt);
      surface.addEventListener("pointercancel", resetTilt);
      surface.addEventListener("blur", resetTilt);
    });
  }

  onReady(() => {
    renderPeekAvatar();
    installTopbarStability();
    installBackButtonGuard();
    installPointerTilt();
  });
})();
