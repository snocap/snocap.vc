// Download link — replaces in-browser PDF rendering with a simple
// hyperlink to ./download (resolved relative to the current document's
// folder). The user maps that URL to a static prerendered PDF.

(() => {
  const link = document.createElement("a");
  link.href = "./deck.pdf";
  link.setAttribute("aria-label", "Download deck as PDF");
  link.setAttribute("data-noncommentable", "");
  link.className = "deck-pdf-btn export-hidden";
  link.innerHTML = `
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
         stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8 1.75v9"/>
      <path d="M4.5 7.25 8 10.75l3.5-3.5"/>
      <path d="M2.5 12.5v.75A1.75 1.75 0 0 0 4.25 15h7.5A1.75 1.75 0 0 0 13.5 13.25v-.75"/>
    </svg>
    <span class="lbl">Download PDF</span>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .deck-pdf-btn {
      position: fixed;
      top: 16px;
      right: 16px;
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
      text-decoration: none;
      cursor: pointer;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: background 140ms ease, color 140ms ease, transform 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .deck-pdf-btn:hover { background: rgba(0,0,0,0.9); color: #fff; }
    .deck-pdf-btn:active { transform: scale(0.98); }
    .deck-pdf-btn:focus { outline: none; }
    .deck-pdf-btn:visited { color: rgba(255, 255, 255, 0.92); }
    @media print { .deck-pdf-btn { display: none !important; } }
  `;

  document.head.appendChild(style);
  const mount = () => document.body && document.body.appendChild(link);
  if (document.readyState !== "loading") mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
