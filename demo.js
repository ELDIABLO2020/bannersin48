(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get("force") === "desktop") {
    document.body.classList.add("force-desktop");
  }
  if (params.get("force") === "mobile") {
    document.body.classList.add("force-mobile");
  }

  const toast = document.querySelector(".toast");
  let toastTimer;

  function showToast() {
    if (!toast) return;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  }

  document.addEventListener("click", (event) => {
    const faqButton = event.target.closest(".faq-item");
    if (faqButton) {
      const expanded = faqButton.getAttribute("aria-expanded") === "true";
      faqButton.setAttribute("aria-expanded", String(!expanded));
      return;
    }

    const inertTarget = event.target.closest("a, .icon-button, .email-form button, .top-nav__actions .btn");
    if (inertTarget) {
      event.preventDefault();
      showToast();
    }
  });

  document.querySelector(".email-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    showToast();
  });

  function getOffsetMinutes(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit"
    }).formatToParts(date);
    const offset = parts.find((part) => part.type === "timeZoneName")?.value || "GMT-4";
    const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return -240;
    const sign = match[1] === "+" ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] || 0);
    return sign * (hours * 60 + minutes);
  }

  function getEtParts(date) {
    return Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short"
      })
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );
  }

  function etDateToUtc(parts, hour) {
    const utcGuess = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour));
    const offset = getOffsetMinutes(utcGuess, "America/New_York");
    return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hour) - offset * 60000);
  }

  function addEtDays(parts, days) {
    const base = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + days, 12));
    return getEtParts(base);
  }

  function getTargetCutoff(now) {
    const todayEt = getEtParts(now);
    let target = etDateToUtc(todayEt, 21);
    let targetParts = todayEt;
    if (target.getTime() <= now.getTime()) {
      targetParts = addEtDays(todayEt, 1);
      target = etDateToUtc(targetParts, 21);
    }
    return { target, targetParts };
  }

  function deliveryDayFromCutoff(cutoffParts) {
    const map = {
      Mon: 2,
      Tue: 2,
      Wed: 2,
      Thu: 4,
      Fri: 4,
      Sat: 3,
      Sun: 2
    };
    const deliveryParts = addEtDays(cutoffParts, map[cutoffParts.weekday] || 2);
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
      new Date(Date.UTC(Number(deliveryParts.year), Number(deliveryParts.month) - 1, Number(deliveryParts.day), 12))
    );
  }

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return { compact: `${hours}:${minutes}:${seconds}`, spaced: `${hours} : ${minutes} : ${seconds}` };
  }

  function updateCountdown() {
    const now = new Date();
    const { target, targetParts } = getTargetCutoff(now);
    const remaining = target.getTime() - now.getTime();
    const formatted = formatTime(remaining);
    document.querySelectorAll("[data-countdown-compact]").forEach((node) => {
      node.textContent = formatted.compact;
    });
    document.querySelectorAll("[data-countdown-main]").forEach((node) => {
      node.textContent = formatted.spaced;
    });
    document.querySelectorAll("[data-delivery-label]").forEach((node) => {
      node.textContent = `Delivery by ${deliveryDayFromCutoff(targetParts)} at 12:00 PM`;
    });
    document.querySelectorAll("[data-progress]").forEach((node) => {
      const elapsed = 1 - remaining / (24 * 60 * 60 * 1000);
      node.style.width = `${Math.max(4, Math.min(100, elapsed * 100))}%`;
    });
  }

  updateCountdown();
  window.setInterval(updateCountdown, 1000);
})();
