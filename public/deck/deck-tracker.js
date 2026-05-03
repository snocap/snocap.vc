(() => {
  const POSTHOG_KEY = window.__POSTHOG_KEY;
  if (!POSTHOG_KEY) return;

  function getViewerEmail() {
    const match = document.cookie.match(/(?:^|;\s*)snocap_viewer=([^;]+)/);
    if (!match) return null;
    try {
      const value = decodeURIComponent(match[1]);
      const dot = value.indexOf(".");
      if (dot === -1) return null;
      return atob(value.slice(0, dot));
    } catch {
      return null;
    }
  }

  const email = getViewerEmail();

  posthog.init(POSTHOG_KEY, {
    api_host: "https://us.i.posthog.com",
    autocapture: true,
    capture_pageview: true,
    enable_heatmaps: true,
    session_recording: { recordCrossOriginIframes: true },
    loaded: function (ph) {
      if (email) ph.identify(email);
      ph.capture("deck_opened", { viewer_email: email || "anonymous" });
    },
  });

  let lastSlideTime = Date.now();
  let lastSlideIndex = 0;

  const stage = document.querySelector("deck-stage");
  if (!stage) return;

  stage.addEventListener("slidechange", (e) => {
    const now = Date.now();
    const detail = e.detail;

    if (detail.previousIndex >= 0) {
      posthog.capture("slide_dwell", {
        slide_index: detail.previousIndex,
        slide_number: detail.previousIndex + 1,
        dwell_time_ms: now - lastSlideTime,
        viewer_email: email || "anonymous",
      });
    }

    posthog.capture("slide_viewed", {
      slide_index: detail.index,
      slide_number: detail.index + 1,
      total_slides: detail.total,
      previous_slide: detail.previousIndex,
      reason: detail.reason,
      viewer_email: email || "anonymous",
    });

    lastSlideTime = now;
    lastSlideIndex = detail.index;
  });
})();
