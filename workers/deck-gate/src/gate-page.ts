export function renderGatePage(error?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SNØCAP US II, LP — Pitch Deck</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Fira+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    @font-face {
      font-family: "NB Akademie Mono Std";
      src: url("https://snocap.vc/deck/fonts/NB%20Akademie%20Mono%20Std/NB%20Akademie%20Mono%20Std.woff2") format("woff2");
      font-weight: 100 900;
      font-display: swap;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      height: 100%;
      font-family: "Inter", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background: #0a0a0a;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .bg {
      position: absolute;
      inset: 0;
      background: url("https://snocap.vc/deck/assets/hero-mountains.jpg") center/cover no-repeat;
      filter: grayscale(0.6) brightness(0.3);
    }

    .bg::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.95) 100%);
    }

    .card {
      position: relative;
      z-index: 1;
      max-width: 420px;
      width: 100%;
      padding: 48px 40px;
      text-align: center;
    }

    .logo {
      width: 180px;
      margin: 0 auto 12px;
      opacity: 0.9;
    }

    .subtitle {
      font-family: "NB Akademie Mono Std", "Fira Mono", monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #9f9f9f;
      margin-bottom: 48px;
    }

    .prompt {
      font-size: 15px;
      font-weight: 300;
      color: #bdbdbd;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    form { display: flex; flex-direction: column; gap: 12px; }

    input[type="email"] {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 0;
      color: #fff;
      font-family: "Inter", system-ui, sans-serif;
      font-size: 15px;
      font-weight: 300;
      outline: none;
      transition: border-color 150ms ease;
    }

    input[type="email"]::placeholder { color: #666; }
    input[type="email"]:focus { border-color: #F15800; }

    button {
      width: 100%;
      padding: 14px 20px;
      background: #F15800;
      color: #fff;
      border: none;
      border-radius: 0;
      font-family: "NB Akademie Mono Std", "Fira Mono", monospace;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 120ms ease;
    }

    button:hover { background: #c24600; }

    .fine-print {
      font-size: 12px;
      color: #666;
      margin-top: 24px;
      line-height: 1.5;
    }

    .error {
      color: #F15800;
      font-size: 13px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="bg"></div>
  <div class="card">
    <svg class="logo" viewBox="0 0 885 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M71.08 139.32C55.42 139.32 42.66 135.55 32.8 128C22.94 120.45 17.45 110.38 16.33 97.78H47.7C48.26 103.94 50.92 108.93 55.66 112.77C60.4 116.6 66.42 118.52 73.58 118.52C80.73 118.52 86.2 117.04 90.01 114.07C93.81 111.1 95.71 107.2 95.71 102.37C95.71 98.15 94.23 94.76 91.27 92.2C88.3 89.64 84.65 87.56 80.31 85.96C75.98 84.36 69.96 82.51 62.25 80.4C51.98 77.55 43.66 74.71 37.31 71.87C30.96 69.03 25.51 64.72 20.96 58.95C16.41 53.18 14.14 45.59 14.14 36.19C14.14 27.41 16.48 19.83 21.16 13.44C25.84 7.05 32.32 2.18 40.59 -1.17C48.86 -4.52 58.33 -6.2 68.98 -6.2C84.45 -6.2 96.89 -2.53 106.31 5.82C115.73 14.16 120.87 24.87 121.74 37.97H89.39C89.01 32.19 86.6 27.47 82.17 23.83C77.74 20.18 71.97 18.36 64.88 18.36C58.53 18.36 53.49 19.78 49.76 22.62C46.03 25.46 44.16 29.49 44.16 34.72C44.16 38.56 45.57 41.76 48.4 44.33C51.23 46.89 54.75 48.97 58.96 50.57C63.17 52.17 69.06 54.02 76.64 56.13C86.99 59.1 95.34 62.08 101.69 65.05C108.04 68.01 113.5 72.39 118.05 78.16C122.6 83.93 124.87 91.32 124.87 100.34C124.87 108.37 122.67 115.75 118.27 122.48C113.87 129.21 107.47 134.52 99.07 138.43C90.67 142.33 80.79 139.32 71.08 139.32Z" fill="white"/>
      <path d="M211.01 -6.2L267.08 139.32H234.58L222.14 105.21H171.3L158.86 139.32H126.36L182.43 -6.2H211.01ZM213.33 82.02L196.72 33.52L180.11 82.02H213.33Z" fill="white"/>
      <path d="M382.8 26.43C392.35 36.17 397.12 49.91 397.12 67.66C397.12 85.41 392.35 99.07 382.8 108.63C373.26 118.19 360.64 122.97 344.95 122.97C329.26 122.97 316.64 118.19 307.1 108.63C297.55 99.07 292.78 85.41 292.78 67.66C292.78 49.91 297.55 36.17 307.1 26.43C316.64 16.69 329.26 11.82 344.95 11.82C360.64 11.82 373.26 16.69 382.8 26.43ZM326.45 46.45C322.05 52.34 319.85 59.35 319.85 67.66C319.85 75.97 322.05 82.91 326.45 88.49C330.86 94.07 337.03 96.86 344.95 96.86C352.87 96.86 359.05 94.07 363.45 88.49C367.85 82.91 370.05 75.97 370.05 67.66C370.05 59.35 367.85 52.34 363.45 46.45C359.05 40.56 352.87 37.62 344.95 37.62C337.03 37.62 330.86 40.56 326.45 46.45Z" fill="white"/>
      <path d="M479.15 122.97C464.68 122.97 452.61 118.19 442.94 108.63C433.27 99.07 428.44 85.72 428.44 68.58C428.44 51.07 433.27 37.41 442.94 27.61C452.61 17.81 464.68 12.91 479.15 12.91C489.62 12.91 498.65 15.5 506.25 20.68C513.85 25.87 519.19 32.71 522.27 41.21H493.54C491.6 37.93 489 35.34 485.76 33.42C482.51 31.51 478.95 30.55 475.07 30.55C467.71 30.55 461.54 33.67 456.57 39.89C451.6 46.12 449.12 55.01 449.12 66.57C449.12 78.13 451.6 87.02 456.57 93.25C461.54 99.47 467.71 102.59 475.07 102.59C478.95 102.59 482.51 101.64 485.76 99.72C489 97.8 491.6 95.22 493.54 91.93H522.27C519.19 100.43 513.85 107.28 506.25 112.46C498.65 117.64 489.62 122.97 479.15 122.97Z" fill="white"/>
      <path d="M584.85 11.82L546.77 121.79H521.62L559.7 11.82H584.85Z" fill="white"/>
      <path d="M678.65 121.79L665.05 91.44H622.04L608.43 121.79H582.29L631.3 11.82H656.78L705.79 121.79H678.65ZM643.54 38.36L629.62 70.47H657.47L643.54 38.36Z" fill="white"/>
      <path d="M736.38 11.82C751.82 11.82 763.82 15.37 772.38 22.46C780.95 29.55 785.23 39.64 785.23 52.72C785.23 65.98 780.88 76.14 772.18 83.2C763.47 90.26 751.55 93.79 736.38 93.79H725.1V121.79H700.1V11.82H736.38ZM736.38 72.07C743.39 72.07 748.84 70.47 752.75 67.25C756.66 64.04 758.61 59.22 758.61 52.8C758.61 46.76 756.66 42.07 752.75 38.73C748.84 35.39 743.39 33.72 736.38 33.72H725.1V72.07H736.38Z" fill="white"/>
    </svg>
    <div class="subtitle">US II, LP — Pitch Deck</div>
    ${error ? `<div class="error">${error}</div>` : ""}
    <div class="prompt">Enter your email to view the deck.</div>
    <form method="POST" action="/deck">
      <input type="email" name="email" placeholder="you@company.com" required autofocus />
      <button type="submit">View Deck</button>
    </form>
    <div class="fine-print">Your information is kept confidential and will not be shared.</div>
  </div>
</body>
</html>`;
}
