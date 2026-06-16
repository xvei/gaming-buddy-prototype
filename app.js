const viewButtons = document.querySelectorAll("[data-view-target]");
const views = document.querySelectorAll(".view");
const navItems = document.querySelectorAll(".nav-item");
const title = document.querySelector("#view-title");
const appShell = document.querySelector(".app-shell");
const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const categoryToggles = document.querySelectorAll(".nav-category-toggle");
const duelOptions = document.querySelectorAll(".duel-option");
const profileHub = document.querySelector(".profile-hub");
const profileMenuToggle = document.querySelector("#profile-menu-toggle");
const profileMenu = document.querySelector("#profile-menu");
const topbar = document.querySelector(".topbar");
const topbarCluster = document.querySelector(".topbar-cluster");
const topbarPeek = document.querySelector("#topbar-peek");
const backButton = document.querySelector("#back-button");
const wireframeCanvas = document.querySelector("#wireframe-canvas");
let currentViewName = document.querySelector(".view.is-active")?.id.replace("view-", "") || "home";
const viewHistory = [];

function initWireframeTerrain() {
  if (!wireframeCanvas) {
    return;
  }

  const ctx = wireframeCanvas.getContext("2d", { alpha: true });
  if (!ctx) {
    return;
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const startedAt = performance.now();
  let width = 0;
  let height = 0;
  let rows = 14;
  let cols = 22;
  let frameId = 0;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    rows = Math.max(13, Math.min(24, Math.round(height / 48)));
    cols = Math.max(18, Math.min(36, Math.round(width / 58)));
    wireframeCanvas.width = Math.max(1, Math.floor(width * dpr));
    wireframeCanvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTerrain(performance.now());
  }

  function getTerrainPoint(row, col, elapsed) {
    const depth = row / Math.max(1, rows - 1);
    const column = col / Math.max(1, cols - 1);
    const centerX = width / 2;
    const horizon = height * 0.36;
    const spread = width * (0.18 + depth * 1.12);
    const perspectiveY = Math.pow(depth, 1.58) * height * 0.62;
    const waveA = Math.sin(column * Math.PI * 5.4 + elapsed * 0.00065) * 28 * depth;
    const waveB = Math.cos((column - 0.5) * Math.PI * 8 + row * 0.45 + elapsed * 0.00045) * 18 * (0.25 + depth);
    const ridge = Math.sin((col - cols / 2) * 0.42 + elapsed * 0.00034) * 24 * (1 - Math.abs(depth - 0.42));
    const drift = Math.sin(row * 0.64 + col * 0.23 + elapsed * 0.0003) * 10 * depth;

    return {
      x: centerX + (column - 0.5) * spread + drift,
      y: horizon + perspectiveY + waveA + waveB + ridge,
      depth,
    };
  }

  function strokeSegment(from, to, color, widthValue) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = widthValue;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function drawTerrain(time) {
    const elapsed = time - startedAt;
    ctx.clearRect(0, 0, width, height);

    const horizon = height * 0.35;
    const fog = ctx.createLinearGradient(0, horizon, 0, height);
    fog.addColorStop(0, "rgba(230, 236, 239, 0)");
    fog.addColorStop(0.24, "rgba(230, 236, 239, 0.055)");
    fog.addColorStop(0.74, "rgba(222, 228, 232, 0.105)");
    fog.addColorStop(1, "rgba(255, 255, 255, 0.13)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, horizon, width, height - horizon);

    const points = [];
    for (let row = 0; row < rows; row += 1) {
      const rowPoints = [];
      for (let col = 0; col < cols; col += 1) {
        rowPoints.push(getTerrainPoint(row, col, elapsed));
      }
      points.push(rowPoints);
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(245, 250, 252, 0.28)";
    ctx.shadowBlur = 6;

    for (let row = 0; row < rows; row += 1) {
      const depth = row / Math.max(1, rows - 1);
      ctx.beginPath();
      points[row].forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.lineWidth = 0.45 + depth * 0.9;
      ctx.strokeStyle = `rgba(236, 244, 247, ${0.08 + depth * 0.34})`;
      ctx.stroke();
    }

    for (let col = 0; col < cols; col += 1) {
      ctx.beginPath();
      points.forEach((rowPoints, index) => {
        const point = rowPoints[col];
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.lineWidth = 0.42;
      ctx.strokeStyle = "rgba(236, 244, 247, 0.18)";
      ctx.stroke();
    }

    for (let row = 0; row < rows - 1; row += 1) {
      for (let col = 0; col < cols - 1; col += 1) {
        const depth = points[row + 1][col].depth;
        const alpha = 0.06 + depth * 0.2;
        const from = points[row][col];
        const to = (row + col) % 2 === 0 ? points[row + 1][col + 1] : points[row + 1][col];
        strokeSegment(from, to, `rgba(232, 241, 245, ${alpha})`, 0.35 + depth * 0.4);
      }
    }

    const pulseRow = Math.floor(((elapsed * 0.00018) % 1) * (rows - 3)) + 2;
    if (points[pulseRow]) {
      ctx.shadowColor = "rgba(156, 218, 216, 0.42)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      points[pulseRow].forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(156, 218, 216, 0.46)";
      ctx.stroke();
    }

    ctx.shadowBlur = 8;
    for (let row = 2; row < rows; row += 2) {
      for (let col = row % 4 === 0 ? 1 : 3; col < cols; col += 4) {
        const point = points[row][col];
        const radius = 0.9 + point.depth * 1.3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 250, 252, ${0.16 + point.depth * 0.32})`;
        ctx.fill();
      }
    }

    const sweepY = horizon + ((elapsed * 0.00008) % 1) * (height - horizon);
    const sweep = ctx.createLinearGradient(0, sweepY, width, sweepY);
    sweep.addColorStop(0, "rgba(156, 218, 216, 0)");
    sweep.addColorStop(0.5, "rgba(156, 218, 216, 0.3)");
    sweep.addColorStop(1, "rgba(156, 218, 216, 0)");
    ctx.shadowColor = "rgba(156, 218, 216, 0.38)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = sweep;
    ctx.fillRect(0, sweepY - 1, width, 2);
    ctx.restore();
  }

  function animate(time) {
    drawTerrain(time);
    if (!motionQuery.matches) {
      frameId = requestAnimationFrame(animate);
    }
  }

  function startTerrain() {
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
    if (motionQuery.matches) {
      drawTerrain(performance.now());
      return;
    }
    frameId = requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resizeCanvas);
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", startTerrain);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(startTerrain);
  }

  resizeCanvas();
  startTerrain();
}

initWireframeTerrain();

function closeCategoryPanels(exceptCategory = null) {
  document.querySelectorAll(".nav-category.is-open").forEach((openCategory) => {
    if (openCategory !== exceptCategory) {
      openCategory.classList.remove("is-open");
      openCategory.querySelector(".nav-category-toggle")?.setAttribute("aria-expanded", "false");
      if (openCategory.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    }
  });
}

categoryToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const category = toggle.closest(".nav-category");

    if (!category) {
      return;
    }

    if (appShell?.classList.contains("sidebar-collapsed")) {
      appShell.classList.remove("sidebar-collapsed");
      sidebarToggle?.setAttribute("aria-expanded", "true");
      sidebarToggle?.setAttribute("aria-label", "Collapse sidebar");
      sidebarToggle?.setAttribute("title", "Collapse sidebar");
    }

    setProfileMenuOpen(false);
    closeCategoryPanels(category);

    const isOpen = category.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen) {
      toggle.blur();
    }
  });
});

function isTopbarAutoHidden() {
  return window.scrollY > 120;
}

function updateTopbarVisibility() {
  if (!topbar) {
    return;
  }

  const shouldHide = isTopbarAutoHidden();
  topbar.classList.toggle("is-scrolled", shouldHide);
  if (!shouldHide) {
    topbar.classList.remove("is-peeking");
  }
  syncTopbarPresentation();
}

function syncTopbarPresentation() {
  if (!topbar || !topbarCluster || !topbarPeek) {
    return;
  }

  const isScrolled = topbar.classList.contains("is-scrolled");
  const shouldShowCluster = !isScrolled || topbar.classList.contains("is-peeking") || topbar.classList.contains("has-open-menu");
  topbarCluster.classList.toggle("is-hud-hidden", !shouldShowCluster);
  topbarPeek.classList.toggle("is-hud-peek-visible", isScrolled && !shouldShowCluster);
  topbarCluster.style.opacity = shouldShowCluster ? "1" : "0";
  topbarCluster.style.pointerEvents = shouldShowCluster ? "auto" : "none";
  topbarCluster.style.filter = shouldShowCluster ? "none" : "blur(6px)";
  topbarCluster.style.transform = shouldShowCluster ? "translateY(0)" : "translateY(-118%)";
  topbarPeek.style.opacity = isScrolled && !shouldShowCluster ? "1" : "0";
  topbarPeek.style.pointerEvents = isScrolled && !shouldShowCluster ? "auto" : "none";
  topbarPeek.style.transform = isScrolled && !shouldShowCluster ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-8px)";
  topbarPeek?.setAttribute("aria-expanded", String(!isScrolled || topbar.classList.contains("is-peeking")));
}

function revealTopbar() {
  if (!topbar || !isTopbarAutoHidden()) {
    return;
  }

  topbar.classList.add("is-peeking");
  syncTopbarPresentation();
  topbarPeek?.setAttribute("aria-expanded", "true");
}

function setProfileMenuOpen(isOpen) {
  if (!profileMenu || !profileMenuToggle || !profileHub) {
    return;
  }

  profileMenu.classList.toggle("is-hidden", !isOpen);
  profileHub.classList.toggle("is-open", isOpen);
  topbar?.classList.toggle("has-open-menu", isOpen);
  profileMenuToggle.setAttribute("aria-expanded", String(isOpen));
  if (!isOpen && isTopbarAutoHidden()) {
    topbar?.classList.remove("is-peeking");
  }
  syncTopbarPresentation();
}

if (profileMenuToggle && profileMenu) {
  profileMenuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    closeCategoryPanels();
    setProfileMenuOpen(profileMenu.classList.contains("is-hidden"));
  });

  profileMenu.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.target.closest("[data-view-target]")) {
      setProfileMenuOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!profileHub?.contains(event.target)) {
      setProfileMenuOpen(false);
    }
  });
}

if (topbar && topbarPeek) {
  topbarPeek.addEventListener("mouseenter", revealTopbar);
  topbarPeek.addEventListener("focus", revealTopbar);
  topbarPeek.addEventListener("click", (event) => {
    event.stopPropagation();
    revealTopbar();
  });

  topbar.addEventListener("mouseleave", () => {
    if (isTopbarAutoHidden() && profileMenu?.classList.contains("is-hidden")) {
      topbar.classList.remove("is-peeking");
      topbarPeek.setAttribute("aria-expanded", "false");
      syncTopbarPresentation();
    }
  });

  window.addEventListener("scroll", updateTopbarVisibility, { passive: true });
  updateTopbarVisibility();
}

document.addEventListener("click", (event) => {
  if (!sidebar?.contains(event.target)) {
    closeCategoryPanels();
  }
  if (topbar && !topbar.contains(event.target) && isTopbarAutoHidden() && profileMenu?.classList.contains("is-hidden")) {
    topbar.classList.remove("is-peeking");
    topbarPeek?.setAttribute("aria-expanded", "false");
    syncTopbarPresentation();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCategoryPanels();
    setProfileMenuOpen(false);
  }
});

document.addEventListener("pointermove", (event) => {
  if (!topbar?.classList.contains("is-peeking") || !isTopbarAutoHidden() || !profileMenu?.classList.contains("is-hidden")) {
    return;
  }

  const topbarBounds = topbar.getBoundingClientRect();
  if (event.clientY > topbarBounds.bottom + 18) {
    topbar.classList.remove("is-peeking");
    topbarPeek?.setAttribute("aria-expanded", "false");
    syncTopbarPresentation();
  }
});

if (sidebarToggle && appShell) {
  sidebarToggle.addEventListener("click", () => {
    const isCollapsed = appShell.classList.toggle("sidebar-collapsed");
    sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
    sidebarToggle.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
    sidebarToggle.setAttribute("title", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
    const label = sidebarToggle.querySelector(".nav-label");
    if (label) {
      label.textContent = isCollapsed ? "Expand" : "Collapse";
    }
    sidebar?.scrollTo({ top: 0, behavior: "smooth" });
  });
}

duelOptions.forEach((option) => {
  option.addEventListener("click", () => {
    duelOptions.forEach((item) => {
      item.classList.toggle("is-selected", item === option);
    });
  });
});

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function renderAvatar(avatar) {
  const name = avatar.dataset.name || "Player";
  const imageUrl = avatar.dataset.imageUrl;
  const status = avatar.dataset.status || "offline";
  const roleBadge = avatar.dataset.roleBadge;
  const verified = avatar.dataset.verified === "true";
  const size = avatar.dataset.size;
  const badgeLabels = {
    founder: "F",
    host: "H",
    trusted: "T",
  };

  if (size) {
    avatar.classList.add(`avatar-${size}`);
  }

  avatar.classList.add(`avatar-${status}`);
  avatar.setAttribute("aria-label", `${name}, ${status}`);
  avatar.textContent = "";

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    avatar.append(image);
  } else {
    const initials = document.createElement("span");
    initials.className = "avatar-initials";
    initials.textContent = getInitials(name);
    avatar.append(initials);
  }

  if (roleBadge && badgeLabels[roleBadge]) {
    const badge = document.createElement("span");
    badge.className = `avatar-role avatar-role-${roleBadge}`;
    badge.textContent = badgeLabels[roleBadge];
    avatar.append(badge);
  }

  if (verified) {
    const verifiedMark = document.createElement("span");
    verifiedMark.className = "avatar-verified";
    verifiedMark.textContent = "V";
    avatar.append(verifiedMark);
  }
}

function renderAllAvatars(root = document) {
  root.querySelectorAll(".player-avatar:not([data-rendered])").forEach((avatar) => {
    renderAvatar(avatar);
    avatar.dataset.rendered = "true";
  });
}

renderAllAvatars();

function addButtonCornerRunners(root = document) {
  root.querySelectorAll("button:not(.profile-orb):not(.nav-item):not(.profile-menu button):not([data-corner-runners])").forEach((button) => {
    button.dataset.cornerRunners = "true";
    const firstRunner = document.createElement("span");
    const secondRunner = document.createElement("span");
    firstRunner.className = "button-corner-runner runner-one";
    secondRunner.className = "button-corner-runner runner-two";
    firstRunner.setAttribute("aria-hidden", "true");
    secondRunner.setAttribute("aria-hidden", "true");
    button.append(firstRunner, secondRunner);
  });
}

addButtonCornerRunners();

function updateBackButton() {
  if (!backButton) {
    return;
  }

  placeBackButton();
  backButton.classList.toggle("is-hidden", currentViewName === "home");
}

function placeBackButton() {
  if (!backButton || !currentViewName) {
    return;
  }

  const activeHeader = document.querySelector(`#view-${currentViewName} .view-header`);
  if (activeHeader && backButton.parentElement !== activeHeader) {
    activeHeader.prepend(backButton);
  }
}

function setActiveView(viewName, options = {}) {
  const { trackHistory = true } = options;
  const nextView = document.querySelector(`#view-${viewName}`);

  if (!nextView) {
    return;
  }

  if (viewName === currentViewName) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    updateBackButton();
    return;
  }

  if (trackHistory && currentViewName) {
    viewHistory.push(currentViewName);
  }

  views.forEach((view) => {
    view.classList.toggle("is-active", view === nextView);
  });

  let activeNavAssigned = false;
  navItems.forEach((item) => {
    const isMatchingTarget = item.dataset.viewTarget === viewName;
    const shouldActivate = isMatchingTarget && !activeNavAssigned;
    item.classList.toggle("is-active", shouldActivate);
    if (isMatchingTarget && !activeNavAssigned) {
      activeNavAssigned = true;
    }
  });

  title.textContent = nextView.dataset.viewTitle || "Gaming Buddy";
  currentViewName = viewName;
  updateBackButton();
  window.location.hash = viewName;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  updateTopbarVisibility();
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.viewTarget);
    closeCategoryPanels();
  });
});

if (backButton) {
  backButton.addEventListener("click", () => {
    const previousView = viewHistory.pop() || "home";
    setActiveView(previousView, { trackHistory: false });
  });
}

const startingHash = window.location.hash.replace("#", "");
if (startingHash) {
  setActiveView(startingHash, { trackHistory: false });
}
updateBackButton();

const readyButton = document.querySelector("#ready-toggle");
const readyCount = document.querySelector("#ready-count");
const mantasReady = document.querySelector("#mantas-ready");

if (readyButton && readyCount && mantasReady) {
  readyButton.addEventListener("click", () => {
    const isReady = mantasReady.textContent === "Ready";
    mantasReady.textContent = isReady ? "Not ready" : "Ready";
    readyButton.textContent = isReady ? "Ready up" : "Cancel ready";
    readyCount.textContent = isReady ? "2/4 ready" : "3/4 ready";
  });
}

const warningButton = document.querySelector("#show-warning");
const warningPanel = document.querySelector("#existing-world-warning");

if (warningButton && warningPanel) {
  warningButton.addEventListener("click", () => {
    warningPanel.classList.toggle("is-hidden");
    warningButton.textContent = warningPanel.classList.contains("is-hidden")
      ? "Use existing world"
      : "Hide warning";
  });
}

const matchButton = document.querySelector("#mock-match-button");
const queueStatusPill = document.querySelector("#queue-status-pill");
const queueTitle = document.querySelector("#queue-title");
const searchTimer = document.querySelector("#search-timer");
const queueLines = [
  document.querySelector("#queue-line-1"),
  document.querySelector("#queue-line-2"),
  document.querySelector("#queue-line-3"),
  document.querySelector("#queue-line-4"),
  document.querySelector("#queue-line-5"),
];
const matchOverlay = document.querySelector("#match-found-overlay");
const noSessionOverlay = document.querySelector("#no-session-overlay");
const acceptMatch = document.querySelector("#accept-match");
const declineMatch = document.querySelector("#decline-match");
const matchCountdown = document.querySelector("#match-countdown");
const startNewSession = document.querySelector("#start-new-session");
const keepSearching = document.querySelector("#keep-searching");
const changeFilters = document.querySelector("#change-filters");
const cancelSearch = document.querySelector("#cancel-search");
const waitingSessionPanel = document.querySelector("#waiting-session-panel");
const waitingStatusPill = document.querySelector("#waiting-status-pill");
const waitingStatusText = document.querySelector("#waiting-status-text");
const waitingSessionType = document.querySelector("#waiting-session-type");
const waitingHostStatus = document.querySelector("#waiting-host-status");
const waitingPlayerCount = document.querySelector("#waiting-player-count");
const waitingHostWarning = document.querySelector("#waiting-host-warning");
const waitingSlots = document.querySelector("#waiting-slots");
const cancelWaitingSession = document.querySelector("#cancel-waiting-session");
const sessionTypeButtons = document.querySelectorAll("[data-session-type]");
const hostPreferenceButtons = document.querySelectorAll("[data-host-pref]");
let matchTimer;
let searchTimerId;
let waitingTimerIds = [];
let queueState = "idle";
let selectedSessionType = "fresh";
let selectedHostPreference = "can-host";

const sessionTypeLabels = {
  fresh: "Fresh Trial World",
  "host-owned": "Host-Owned Casual World",
  server: "Public/Dedicated Server",
};

function setQueueState(state) {
  queueState = state;
}

function formatElapsed(seconds) {
  return `00:${String(seconds).padStart(2, "0")}`;
}

function resetQueueLines() {
  queueLines.forEach((line) => {
    if (line) {
      line.classList.remove("is-complete");
    }
  });
}

function setQueueIdle() {
  setQueueState("idle");
  window.clearInterval(searchTimerId);
  waitingTimerIds.forEach((timerId) => window.clearTimeout(timerId));
  waitingTimerIds = [];
  resetQueueLines();
  if (searchTimer) {
    searchTimer.textContent = "00:00";
  }
  if (queueStatusPill) {
    queueStatusPill.textContent = "Idle";
  }
  if (queueTitle) {
    queueTitle.textContent = "Ready to scan";
  }
  if (matchButton) {
    matchButton.textContent = "Find or Start Session";
  }
  if (waitingSessionPanel) {
    waitingSessionPanel.classList.add("is-hidden");
  }
  if (waitingPlayerCount) {
    waitingPlayerCount.textContent = "1/4";
  }
  setWaitingSlots(1);
}

function startSearchTimer() {
  let elapsed = 0;
  if (searchTimer) {
    searchTimer.textContent = formatElapsed(elapsed);
  }
  window.clearInterval(searchTimerId);
  searchTimerId = window.setInterval(() => {
    elapsed += 1;
    if (searchTimer) {
      searchTimer.textContent = formatElapsed(elapsed);
    }
  }, 1000);
}

function runQueueScan({ foundExisting = false } = {}) {
  setQueueState("searchingExisting");
  startSearchTimer();
  resetQueueLines();
  if (queueStatusPill) {
    queueStatusPill.textContent = "Searching";
  }
  if (queueTitle) {
    queueTitle.textContent = "Searching compatible open sessions";
  }
  if (matchButton) {
    matchButton.textContent = "Searching open sessions...";
  }
  queueLines.forEach((line, index) => {
    if (!line) {
      return;
    }
    window.setTimeout(() => {
      line.classList.add("is-complete");
    }, 220 + index * 420);
  });

  window.setTimeout(() => {
    window.clearInterval(searchTimerId);
    if (foundExisting) {
      setQueueState("sessionFound");
      if (queueStatusPill) {
        queueStatusPill.textContent = "Found";
      }
      if (queueTitle) {
        queueTitle.textContent = "Compatible session found";
      }
      if (matchButton) {
        matchButton.textContent = "Session found - accept";
      }
      openMatchFound();
    } else {
      setQueueState("noSessionFound");
      if (queueStatusPill) {
        queueStatusPill.textContent = "No session";
      }
      if (queueTitle) {
        queueTitle.textContent = "No compatible session found yet";
      }
      if (matchButton) {
        matchButton.textContent = "Start or keep searching";
      }
      openNoSessionFound();
    }
  }, foundExisting ? 2400 : 3200);
}

function openMatchFound() {
  if (!matchOverlay || !matchCountdown) {
    return;
  }

  matchOverlay.classList.remove("is-hidden");
  setQueueState("acceptCountdown");
  let count = 18;
  matchCountdown.textContent = String(count);
  window.clearInterval(matchTimer);
  matchTimer = window.setInterval(() => {
    count -= 1;
    matchCountdown.textContent = String(Math.max(count, 0));
    if (count <= 0) {
      window.clearInterval(matchTimer);
    }
  }, 1000);
}

function closeMatchFound() {
  if (!matchOverlay) {
    return;
  }

  matchOverlay.classList.add("is-hidden");
  window.clearInterval(matchTimer);
}

function openNoSessionFound() {
  if (noSessionOverlay) {
    noSessionOverlay.classList.remove("is-hidden");
  }
}

function closeNoSessionFound() {
  if (noSessionOverlay) {
    noSessionOverlay.classList.add("is-hidden");
  }
}

function getHostLabel() {
  if (selectedHostPreference === "can-host") {
    return "You are Host Candidate";
  }
  if (selectedHostPreference === "prefer-joining") {
    return "Host needed";
  }
  return "App can assign host";
}

function getWaitingStatusText() {
  if (selectedHostPreference === "prefer-joining") {
    return "Session started. Waiting for compatible players and a host-capable player...";
  }
  return "Session started. Waiting for compatible players...";
}

function setWaitingSlots(count = 1) {
  if (!waitingSlots) {
    return;
  }

  const slots = [
    `<div class="slot is-ready"><span class="player-avatar avatar-small" data-name="Mantas" data-status="online" data-role-badge="${selectedHostPreference === "prefer-joining" ? "" : "host"}"></span><small>You</small></div>`,
    count >= 2
      ? `<div class="slot is-ready"><span class="player-avatar avatar-small" data-name="Rasa" data-status="online"></span><small>Joined</small></div>`
      : `<div class="slot is-empty"><span>+</span><small>Open</small></div>`,
    count >= 3
      ? `<div class="slot is-ready"><span class="player-avatar avatar-small" data-name="Nora" data-status="online" data-role-badge="trusted"></span><small>${selectedHostPreference === "prefer-joining" ? "Host" : "Joined"}</small></div>`
      : `<div class="slot is-empty"><span>+</span><small>${selectedHostPreference === "prefer-joining" ? "Host needed" : "Open"}</small></div>`,
    count >= 4
      ? `<div class="slot is-ready"><span class="player-avatar avatar-small" data-name="Eli" data-status="away"></span><small>Joined</small></div>`
      : `<div class="slot is-empty"><span>+</span><small>Open</small></div>`,
  ];

  waitingSlots.innerHTML = slots.join("");
  renderAllAvatars(waitingSlots);
}

function createWaitingSession() {
  closeNoSessionFound();
  setQueueState("creatingSession");
  if (waitingSessionPanel) {
    waitingSessionPanel.classList.remove("is-hidden");
  }
  if (waitingSessionType) {
    waitingSessionType.textContent = sessionTypeLabels[selectedSessionType];
  }
  if (waitingHostStatus) {
    waitingHostStatus.textContent = getHostLabel();
  }
  if (waitingStatusText) {
    waitingStatusText.textContent = getWaitingStatusText();
  }
  if (waitingStatusPill) {
    waitingStatusPill.textContent = "Waiting";
  }
  if (waitingPlayerCount) {
    waitingPlayerCount.textContent = "1/4";
  }
  if (waitingHostWarning) {
    waitingHostWarning.classList.toggle("is-hidden", selectedSessionType !== "host-owned");
  }
  if (queueTitle) {
    queueTitle.textContent = "Waiting session is visible";
  }
  if (queueStatusPill) {
    queueStatusPill.textContent = "Open";
  }
  if (matchButton) {
    matchButton.textContent = "Waiting for players...";
  }
  setWaitingSlots(1);
  setQueueState("waitingForPlayers");

  waitingTimerIds.forEach((timerId) => window.clearTimeout(timerId));
  waitingTimerIds = [];
  waitingTimerIds.push(window.setTimeout(() => {
    if (waitingPlayerCount) {
      waitingPlayerCount.textContent = "2/4";
    }
    if (waitingStatusText) {
      waitingStatusText.textContent = "Rasa joined. Still looking for the right fit...";
    }
    setWaitingSlots(2);
  }, 1100));

  waitingTimerIds.push(window.setTimeout(() => {
    if (waitingPlayerCount) {
      waitingPlayerCount.textContent = "3/4";
    }
    if (waitingStatusText) {
      waitingStatusText.textContent = selectedHostPreference === "prefer-joining"
        ? "Nora joined and can host. Preparing ready check..."
        : "Nora joined. Preparing ready check...";
    }
    setWaitingSlots(3);
  }, 2300));

  waitingTimerIds.push(window.setTimeout(() => {
    if (waitingPlayerCount) {
      waitingPlayerCount.textContent = "4/4";
    }
    if (waitingStatusText) {
      waitingStatusText.textContent = "Compatible group filled. Accept the session to enter the room.";
    }
    if (waitingStatusPill) {
      waitingStatusPill.textContent = "Filled";
    }
    setWaitingSlots(4);
    setQueueState("sessionFound");
    openMatchFound();
  }, 3600));
}

function selectButton(buttons, selectedButton) {
  buttons.forEach((button) => {
    button.classList.toggle("is-selected", button === selectedButton);
  });
}

sessionTypeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedSessionType = button.dataset.sessionType || "fresh";
    selectButton(sessionTypeButtons, button);
  });
});

hostPreferenceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedHostPreference = button.dataset.hostPref || "can-host";
    selectButton(hostPreferenceButtons, button);
  });
});

if (matchButton) {
  matchButton.addEventListener("click", () => {
    if (queueState === "sessionFound") {
      openMatchFound();
      return;
    }

    if (queueState === "searchingExisting" || queueState === "waitingForPlayers") {
      return;
    }

    runQueueScan({ foundExisting: false });
  });
}

if (acceptMatch) {
  acceptMatch.addEventListener("click", () => {
    closeMatchFound();
    setQueueState("roomReady");
    setActiveView("session");
  });
}

if (declineMatch) {
  declineMatch.addEventListener("click", () => {
    closeMatchFound();
    setQueueIdle();
  });
}

if (startNewSession) {
  startNewSession.addEventListener("click", createWaitingSession);
}

if (keepSearching) {
  keepSearching.addEventListener("click", () => {
    closeNoSessionFound();
    runQueueScan({ foundExisting: true });
  });
}

if (changeFilters) {
  changeFilters.addEventListener("click", () => {
    closeNoSessionFound();
    setQueueIdle();
  });
}

if (cancelSearch) {
  cancelSearch.addEventListener("click", () => {
    closeNoSessionFound();
    setQueueIdle();
  });
}

if (cancelWaitingSession) {
  cancelWaitingSession.addEventListener("click", setQueueIdle);
}
