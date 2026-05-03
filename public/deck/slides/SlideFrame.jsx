// SlideFrame.jsx — 1920×1080 slide chrome matching the Figma deck
// Bracket corners + vertical-RL caption on left + bottom mono caption
// Compute the current quarter label dynamically (e.g. "2026 Q2").
// Re-evaluated each render so the deck stays current as it gets reused.
function currentQuarterLabel() {
  const d = new Date();
  return `${d.getFullYear()} Q${Math.floor(d.getMonth() / 3) + 1}`;
}

function SlideFrame({
  children,
  page = 1,
  totalPages = 16,
  dark = false,
  showFooter = true,
  showCorners = true,
  bg,
  pageLabel,           // override page mono label e.g. "FUND II"
  yearLabel = currentQuarterLabel(),
  showLeftCaption = true,
}) {
  const ink = dark ? "#FFFFFF" : "#181818";
  const subInk = dark ? "rgba(255,255,255,0.7)" : "#181818";
  return (
    <section
      data-screen-label={`${String(page).padStart(2, "0")} SNOCAP`}
      style={{
        position: "relative",
        width: 1920,
        height: 1080,
        overflow: "hidden",
        background: bg || (dark ? "#181818" : "#F9F9F9"),
        color: ink,
        fontFamily: "'Inter', sans-serif",
        boxShadow: "0 5px 20px rgba(0,0,0,0.10), 0 0 3px rgba(0,0,0,0.30)",
      }}
    >
      {children}

      {/* bracket corners */}
      {showCorners && <BracketCorners color={ink} />}

      {/* vertical-rl caption on the very left */}
      {showLeftCaption && (
        <div style={{
          position: "absolute",
          left: 24,
          top: 80,
          fontFamily: "'Fira Mono', monospace",
          fontSize: 12,
          letterSpacing: "-0.04em",
          color: subInk,
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          textTransform: "uppercase",
          lineHeight: 1.4,
        }}>
          HIGHLY PRIVATE & CONFIDENTIAL<br />
          NOT FOR FURTHER DISTRIBUTION
        </div>
      )}

      {/* bottom-left page label — bottom inset matches top caption's offset
          so the two captions are equidistant from their respective bracket corners */}
      {showFooter && (
        <div style={{
          position: "absolute",
          left: 24,
          bottom: 80,
          fontFamily: "'Fira Mono', monospace",
          fontSize: 12,
          letterSpacing: "-0.04em",
          color: subInk,
          textTransform: "uppercase",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          lineHeight: 1.4,
        }}>
          {pageLabel || "SNOCAP US II, LP"}<br />
          {yearLabel}
        </div>
      )}
    </section>
  );
}

function BracketCorners({ color = "#181818" }) {
  const len = 32;
  const inset = 28;
  const stroke = 1;
  const c = {
    position: "absolute",
    background: color,
  };
  return (
    <React.Fragment>
      {/* top-left */}
      <div style={{ ...c, left: inset, top: inset, width: len, height: stroke }} />
      <div style={{ ...c, left: inset, top: inset, width: stroke, height: len }} />
      {/* top-right */}
      <div style={{ ...c, right: inset, top: inset, width: len, height: stroke }} />
      <div style={{ ...c, right: inset, top: inset, width: stroke, height: len }} />
      {/* bottom-left */}
      <div style={{ ...c, left: inset, bottom: inset, width: len, height: stroke }} />
      <div style={{ ...c, left: inset, bottom: inset, width: stroke, height: len }} />
      {/* bottom-right */}
      <div style={{ ...c, right: inset, bottom: inset, width: len, height: stroke }} />
      <div style={{ ...c, right: inset, bottom: inset, width: stroke, height: len }} />
    </React.Fragment>
  );
}

// ------------- Shared atoms -------------
const SLIDE_TYPE = {
  // Sizes are in PX, working at 1920×1080
  title: 64,        // section/slide titles (Fira Mono)
  titleLg: 72,      // large case-study brand title
  titleXL: 96,      // hero
  h2: 48,
  h3: 36,
  h4: 30,
  body: 26,
  bodyLg: 32,
  small: 22,
  caption: 14,
  mono: 22,
};
const FONT = {
  mono: "'Fira Mono', 'Andale Mono', monospace",
  sans: "'Inter', sans-serif",
};
const COLORS = {
  ink: "#181818",
  black: "#000000",
  graphite: "#434343",
  stone: "#9F9F9F",
  mist: "#BDBDBD",
  fog: "#D9D9D9",
  cloud: "#E0E1EB",
  snow: "#F9F9F9",
  paper: "#F6F6F6",
  white: "#FFFFFF",
  orange: "#F15800",
  orangeDark: "#C24600",
};

// SlideTitle — the big mono headline used at top-left of every content slide
function SlideTitle({ children, dark = false, style }) {
  return (
    <h1 style={{
      position: "absolute",
      left: 96,
      top: 96,
      fontFamily: FONT.mono,
      fontSize: SLIDE_TYPE.title,
      fontWeight: 400,
      letterSpacing: "-0.04em",
      lineHeight: 1.0,
      color: dark ? COLORS.white : COLORS.ink,
      margin: 0,
      textTransform: "uppercase",
      ...style,
    }}>{children}</h1>
  );
}

// MonoLabel — small uppercase mono caption (chip / subtitle)
function MonoLabel({ children, color, bg, style, padding = "8px 16px" }) {
  return (
    <span style={{
      display: "inline-block",
      fontFamily: FONT.mono,
      fontSize: SLIDE_TYPE.mono,
      letterSpacing: "-0.04em",
      lineHeight: 1.2,
      textTransform: "none",
      color: color || COLORS.white,
      background: bg,
      padding: bg ? padding : 0,
      ...style,
    }}>{children}</span>
  );
}

// Highlight — small inline orange highlighter (background fill, white ink)
// Use anywhere we want to call out a phrase. Light vertical padding so it
// reads as a highlight bar rather than a button.
function Highlight({ children, dark = false, style }) {
  return (
    <span style={{
      background: COLORS.orange,
      color: COLORS.white,
      padding: "0.05em 0.2em",
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
      ...style,
    }}>{children}</span>
  );
}

window.Highlight = Highlight;
window.BracketCorners = BracketCorners;
window.SlideTitle = SlideTitle;
window.MonoLabel = MonoLabel;
window.SLIDE_TYPE = SLIDE_TYPE;
window.FONT = FONT;
window.COLORS = COLORS;
