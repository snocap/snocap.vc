// Share button — sits next to the Download PDF button.
//
// Behavior:
//   - On mobile (navigator.share + touch UA): triggers the native share sheet.
//   - On desktop: opens a shadowboxed modal with the URL pre-selected in a
//     read-only textfield + a copy button. Includes a short instruction so
//     viewers understand the link is theirs (cookie-bound by the gate worker).
//
// The shared URL is the current location, dropping the fragment (slide hash)
// but keeping the querystring.

(() => {
  function shareUrl() {
    const u = new URL(window.location.href);
    u.hash = "";
    return u.toString();
  }

  function isMobileShare() {
    if (typeof navigator.share !== "function") return false;
    // Heuristic: only trust native share on touch-primary devices.
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    return coarse;
  }

  function track(event, props) {
    if (window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture(event, Object.assign({ deck_id: "snocap-us-ii-pitch" }, props || {}));
    }
  }

  // ---------- Button ----------
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Share this deck");
  btn.setAttribute("data-noncommentable", "");
  btn.className = "deck-share-btn export-hidden";
  btn.innerHTML = `
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
         stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12.25" cy="3.5" r="1.75"/>
      <circle cx="3.75" cy="8" r="1.75"/>
      <circle cx="12.25" cy="12.5" r="1.75"/>
      <path d="M5.3 7.05 10.7 4.45"/>
      <path d="M5.3 8.95l5.4 2.6"/>
    </svg>
    <span class="lbl">Share</span>
  `;

  // ---------- Modal ----------
  const overlay = document.createElement("div");
  overlay.className = "deck-share-overlay export-hidden";
  overlay.setAttribute("data-noncommentable", "");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "deck-share-title");
  overlay.innerHTML = `
    <div class="deck-share-modal" role="document">
      <button type="button" class="deck-share-close" aria-label="Close">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/>
        </svg>
      </button>
      <div class="deck-share-title" id="deck-share-title">Share this deck</div>
      <div class="deck-share-desc">
        This is your unique share link. It's tied to your email — anyone you send it to
        will be asked to verify their own email before viewing.
      </div>
      <div class="deck-share-row">
        <input class="deck-share-input" type="text" readonly aria-label="Deck URL" />
        <button type="button" class="deck-share-copy">Copy</button>
      </div>
    </div>
  `;

  const input = overlay.querySelector(".deck-share-input");
  const copyBtn = overlay.querySelector(".deck-share-copy");
  const closeBtn = overlay.querySelector(".deck-share-close");
  const modal = overlay.querySelector(".deck-share-modal");

  function openModal() {
    input.value = shareUrl();
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    // Defer selection until after the layout settles
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
    track("share_opened", { mode: "modal", href: input.value });
  }

  function closeModal() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    copyBtn.textContent = "Copy";
    copyBtn.classList.remove("copied");
  }

  async function copyLink() {
    const url = input.value;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        input.focus();
        input.select();
        document.execCommand("copy");
      }
      copyBtn.textContent = "Copied!";
      copyBtn.classList.add("copied");
      track("share_copied", { href: url });
      setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("copied");
      }, 1800);
    } catch (e) {
      copyBtn.textContent = "Copy failed";
      setTimeout(() => { copyBtn.textContent = "Copy"; }, 1800);
    }
  }

  copyBtn.addEventListener("click", copyLink);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
  });

  btn.addEventListener("click", async () => {
    const url = shareUrl();
    if (isMobileShare()) {
      track("share_opened", { mode: "native", href: url });
      try {
        await navigator.share({
          title: document.title || "SNØCAP US II",
          url: url,
        });
        track("share_completed", { mode: "native", href: url });
      } catch (e) {
        // User cancelled or share failed — silently fall back to modal.
        if (e && e.name !== "AbortError") openModal();
      }
    } else {
      openModal();
    }
  });

  // ---------- Styles ----------
  const style = document.createElement("style");
  style.textContent = `
    .deck-share-btn {
      position: fixed;
      top: 16px;
      right: 148px;
      z-index: 2147483500;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 32px;
      padding: 0 14px;
      border-radius: 999px;
      border: 0;
      background: rgba(0, 0, 0, 0.78);
      color: rgba(255, 255, 255, 0.92);
      font: 500 12px/1 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      letter-spacing: 0.01em;
      cursor: pointer;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: background 140ms ease, color 140ms ease, transform 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .deck-share-btn:hover { background: rgba(0,0,0,0.9); color: #fff; }
    .deck-share-btn:active { transform: scale(0.98); }
    .deck-share-btn:focus { outline: none; }
    @media print { .deck-share-btn { display: none !important; } }

    .deck-share-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483600;
      background: rgba(8, 9, 12, 0.62);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease;
    }
    .deck-share-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }
    .deck-share-modal {
      position: relative;
      width: min(520px, 100%);
      background: #fff;
      color: #111;
      border-radius: 14px;
      padding: 32px 32px 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.06);
      font: 400 15px/1.5 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      transform: translateY(8px) scale(0.98);
      transition: transform 180ms ease;
    }
    .deck-share-overlay.open .deck-share-modal {
      transform: translateY(0) scale(1);
    }
    .deck-share-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 0;
      border-radius: 8px;
      color: rgba(0,0,0,0.55);
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease;
    }
    .deck-share-close:hover { background: rgba(0,0,0,0.06); color: #111; }
    .deck-share-title {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-bottom: 8px;
    }
    .deck-share-desc {
      color: rgba(0,0,0,0.62);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 18px;
    }
    .deck-share-row {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }
    .deck-share-input {
      flex: 1 1 auto;
      min-width: 0;
      height: 40px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.15);
      background: #fafafa;
      color: #111;
      font: 400 13px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: 0;
    }
    .deck-share-input:focus {
      outline: none;
      border-color: rgba(0,0,0,0.45);
      background: #fff;
    }
    .deck-share-copy {
      flex: 0 0 auto;
      height: 40px;
      padding: 0 18px;
      border-radius: 8px;
      border: 0;
      background: #111;
      color: #fff;
      font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition: background 120ms ease, transform 120ms ease;
    }
    .deck-share-copy:hover { background: #000; }
    .deck-share-copy:active { transform: scale(0.98); }
    .deck-share-copy.copied { background: #0a7d3b; }

    @media (max-width: 520px) {
      .deck-share-btn { right: 124px; }
    }
  `;

  document.head.appendChild(style);
  const mount = () => {
    if (!document.body) return;
    document.body.appendChild(btn);
    document.body.appendChild(overlay);
  };
  if (document.readyState !== "loading") mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
