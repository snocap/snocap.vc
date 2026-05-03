/**
 * deck-tracker.js — PostHog tracking for the SNØCAP pitch deck.
 *
 * Initializes PostHog and emits:
 *   - $pageview on load (default)
 *   - deck_loaded once on init
 *   - slide_viewed on every slidechange (via deck-stage's CustomEvent)
 *   - slide_dwell when leaving a slide, with seconds spent
 *   - deck_exit on pagehide, with totals
 *
 * Reads the slide title from the slide's data-screen-label (set by deck-stage).
 */
(function () {
  if (!window.posthog || !window.__POSTHOG_KEY) return;

  posthog.init(window.__POSTHOG_KEY, {
    api_host: "/track",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    capture_dead_clicks: false,
    autocapture: false,
    disable_session_recording: true,
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    advanced_disable_decide: true,
    enable_heatmaps: false,
  });

  var deckId = "snocap-us-ii-pitch";
  var loadedAt = Date.now();
  var slideEnteredAt = null;
  var currentIndex = -1;
  var currentLabel = null;
  var totalSlides = 0;
  var dwellByIndex = {};

  var viewerCookie = document.cookie
    .split("; ")
    .find(function (c) {
      return c.startsWith("snocap_viewer=");
    });
  if (viewerCookie) {
    try {
      var val = decodeURIComponent(viewerCookie.split("=")[1]);
      var dot = val.indexOf(".");
      if (dot > 0) {
        var email = atob(val.slice(0, dot));
        if (email) posthog.identify(email);
      }
    } catch (e) {}
  }

  posthog.register({ deck_id: deckId });
  posthog.capture("deck_loaded", { deck_id: deckId });

  function getStage() {
    return document.querySelector("deck-stage");
  }

  function labelFor(index) {
    var stage = getStage();
    if (!stage) return null;
    var slides = stage.querySelectorAll(":scope > *");
    var slide = slides[index];
    if (!slide) return null;
    return (
      slide.getAttribute("data-screen-label") ||
      slide.getAttribute("aria-label") ||
      slide.id ||
      null
    );
  }

  function flushDwell() {
    if (currentIndex < 0 || slideEnteredAt == null) return;
    var seconds = Math.round((Date.now() - slideEnteredAt) / 1000);
    if (seconds <= 0) return;
    dwellByIndex[currentIndex] = (dwellByIndex[currentIndex] || 0) + seconds;
    posthog.capture("slide_dwell", {
      deck_id: deckId,
      slide_index: currentIndex,
      slide_number: currentIndex + 1,
      slide_label: currentLabel,
      seconds: seconds,
    });
  }

  function onSlideChange(detail) {
    flushDwell();
    currentIndex = detail.index;
    totalSlides = detail.total || totalSlides;
    currentLabel = labelFor(currentIndex);
    slideEnteredAt = Date.now();

    posthog.capture("slide_viewed", {
      deck_id: deckId,
      slide_index: currentIndex,
      slide_number: currentIndex + 1,
      slide_label: currentLabel,
      total_slides: totalSlides,
      previous_index: detail.previousIndex,
    });
  }

  function attach() {
    var stage = getStage();
    if (!stage) {
      // deck-stage not upgraded yet — retry
      return false;
    }
    stage.addEventListener("slidechange", function (e) {
      onSlideChange(e.detail || {});
    });
    return true;
  }

  if (!attach()) {
    var tries = 0;
    var iv = setInterval(function () {
      if (attach() || ++tries > 40) clearInterval(iv);
    }, 100);
  }

  // Cross-frame fallback: deck-stage also posts {slideIndexChanged: N}
  // to window.parent. If this deck is hosted in an iframe, the parent gets
  // those messages. Inside the same window, slidechange is enough.

  window.addEventListener("pagehide", function () {
    flushDwell();
    var totalSeconds = Math.round((Date.now() - loadedAt) / 1000);
    var slidesViewed = Object.keys(dwellByIndex).length;
    posthog.capture("deck_exit", {
      deck_id: deckId,
      total_seconds: totalSeconds,
      slides_viewed: slidesViewed,
      total_slides: totalSlides,
      furthest_slide: Math.max.apply(
        null,
        Object.keys(dwellByIndex).map(Number).concat([-1])
      ),
    });
  });
})();
