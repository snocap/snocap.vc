// Slides 5-8: Scientific IP, Designed for Ownership, Fund I p1, Fund I p2

// ============= SLIDE 5: Early access to the best Scientific IP =============
const SCIENTIFIC_CARDS = [
{
  badge: "Creates the best viable fix",
  logo: "assets/portfolio/logo-sofab.png",
  logoH: 56,
  date: "Oct '24 Pre-Seed",
  body:
  <>
        IP-protected chemistries solved a critical bottleneck for solar
        panels — reducing manufacturing costs and increasing longevity.{" "}
        <strong>POs totaling over $30M, including the world's largest
        perovskite manufacturer.</strong>
      </>

},
{
  badge: "Fundamentally resets pricing",
  logo: "assets/portfolio/logo-revivbio.png",
  logoH: 64,
  date: "Oct '23 Seed",
  body:
  <>
        Biological development engine powered by AI and microfluidic validation
        unlocked an order-of-magnitude reduction in time and cost to develop
        enzymes. <strong>Over $10M in contracts with Bayer, Syngenta, and
        Corteva.</strong>
      </>

},
{
  badge: "Generates revenue from day one",
  logo: "assets/logo-sparxell.png",
  logoH: 60,
  date: "Nov '23 Seed",
  body:
  <>
        Developed novel colorant IP that was a "drop-in" to existing
        manufacturing, allowing them to generate revenue from day one.{" "}
        <strong>24 paid pilots including LVMH, Hugo Boss, and H&amp;M, and
        over $1M in revenue.</strong>
      </>

},
{
  badge: "Solves using first principles",
  logo: "assets/portfolio/logo-trimagnetix.png",
  logoH: 56,
  date: "Jun '25 First Check",
  body:
  <>
        Combined the promise of nanomagnetic IP with the demands of
        energy-hungry datacenters. The result is a novel chip architecture
        with a <strong>proven 40× reduction in energy draw, and a clear path
        to a 500× improvement.</strong>
      </>

}];


function ScientificCard({ badge, logo, logoH, date, body }) {
  return (
    <div style={{ width: 781, position: "relative", display: "flex", flexDirection: "column", gap: 19 }}>
      {/* orange badge */}
      <div style={{
        background: COLORS.orange,
        padding: "8px 16px",
        alignSelf: "flex-start",
        minWidth: 580
      }}>
        <span style={{
          fontFamily: FONT.mono,
          fontSize: 38,
          letterSpacing: "-0.06em",
          lineHeight: 1.0,
          color: COLORS.white
        }}>{badge}</span>
      </div>
      {/* logo + date row */}
      <div style={{
        border: `1px solid ${COLORS.ink}`,

        height: 100,
        padding: "0 36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between", background: "rgba(255, 255, 255, 0.4)"
      }}>
        <img src={logo} alt="" style={{ height: logoH, width: "auto", maxWidth: 320 }} />
        <span style={{
          fontFamily: FONT.mono,
          fontSize: 26,
          letterSpacing: "-0.06em",
          color: COLORS.ink
        }}>{date}</span>
      </div>
      {/* body */}
      <div style={{
        border: `1px solid ${COLORS.ink}`,
        borderTop: "none",

        marginTop: -19,
        padding: "20px 36px",
        minHeight: 170,
        fontFamily: FONT.sans,
        fontSize: 22,
        lineHeight: 1.45,
        color: COLORS.ink, opacity: "1", background: "rgba(255, 255, 255, 0.4)"
      }}>{body}</div>
    </div>);

}

function Slide05_ScientificIP() {
  return (
    <SlideFrame page={5} bg={COLORS.snow}>
      <div style={{
        position: "absolute",
        inset: 0,
        background: "url('assets/cloud-bg.jpg') center/cover no-repeat",
        opacity: 0.55
      }} />
      <SlideTitle>What makes scientific IP great</SlideTitle>
      <div style={{
        position: "absolute",
        left: 96,
        top: 200,
        right: 96,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "44px 60px"
      }}>
        {SCIENTIFIC_CARDS.map((c, i) =>
        <ScientificCard key={i} {...c} />
        )}
      </div>
      <div style={{
        position: "absolute",
        left: 96, right: 96,
        bottom: 56,
        textAlign: "center",
        fontFamily: FONT.sans,
        fontSize: 11,
        lineHeight: 1.4,
        color: COLORS.graphite
      }}>
        The case studies presented herein relate solely to investments made by Fund I and are included for illustrative purposes only.
        These investments may not be representative of the investments of Fund II, and no assurance can be given that Fund II will identify, access, or achieve investments or results comparable to those described herein.
        A complete list of all portfolio companies of Fund I, together with information similar to the information provided on this slide, will be made available upon request. Past performance is not indicative of future results.
      </div>
    </SlideFrame>);

}

// ============= SLIDE 6: Designed for Ownership =============
function FundColumn({ side, chipBg, chipColor, chipBorder, title, subtitle, rows, callout, calloutDark }) {
  const left = side === "left" ? 96 : 1024;
  return (
    <div style={{ position: "absolute", left, top: 248, width: 800 }}>
      {/* Title chip */}
      <div style={{
        display: "inline-block",
        background: chipBg,
        color: chipColor,
        border: chipBorder,
        fontFamily: FONT.mono,
        fontSize: 76,
        letterSpacing: "-0.05em",
        lineHeight: 1.0,
        padding: chipBg === "transparent" ? "6px 0" : "8px 20px"
      }}>{title}</div>
      <div style={{
        marginTop: 14,
        fontFamily: FONT.mono,
        fontSize: 28,
        letterSpacing: "-0.03em",
        color: COLORS.ink,
        opacity: 0.85
      }}>{subtitle}</div>

      {/* Spec rows — label + value with hairline dividers */}
      <div style={{
        marginTop: 44,
        borderTop: `1px solid ${COLORS.ink}`
      }}>
        {rows.map(([label, value]) =>
        <div key={label} style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "baseline",
          padding: "16px 0",
          borderBottom: `1px solid ${COLORS.ink}33`
        }}>
            <div style={{
            fontFamily: FONT.mono,
            fontSize: 18,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: COLORS.ink,
            opacity: 0.7
          }}>{label}</div>
            <div style={{
            fontFamily: FONT.mono,
            fontSize: 32,
            letterSpacing: "-0.03em",
            color: COLORS.ink,
            fontWeight: 500
          }}>{value}</div>
          </div>
        )}
      </div>

      {/* Callout */}
      <div style={{
        marginTop: 48,
        padding: "26px 30px",
        background: calloutDark ? COLORS.orange : "rgba(255,255,255,0.9)",
        border: calloutDark ? "none" : `1px solid ${COLORS.ink}33`,
        fontFamily: FONT.sans,
        fontSize: 25,
        lineHeight: 1.45,
        color: calloutDark ? COLORS.white : COLORS.ink,
        maxWidth: 760
      }}>
        {callout}
      </div>
    </div>);

}

function Slide06_DesignedForOwnership() {
  return (
    <SlideFrame page={6} bg={COLORS.snow}>
      {/* mountain background — Rainier */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "url('assets/hero-mountains.jpg') center/cover no-repeat",
        opacity: 0.30,
        filter: "grayscale(1) contrast(1.05)"
      }} />
      {/* white veil to keep text legible */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(245,242,237,0.55) 0%, rgba(245,242,237,0.78) 100%)"
      }} />
      <SlideTitle>Designed for ownership</SlideTitle>

      {/* center divider */}
      <div style={{
        position: "absolute",
        left: 960,
        top: 248,
        bottom: 168,
        width: 1,
        background: COLORS.ink,
        opacity: 0.35
      }} />

      {/* LEFT — Fund I */}
      <FundColumn
        side="left"
        chipBg="transparent"
        chipColor={COLORS.ink}
        chipBorder="none"
        title="$5M Fund I"
        subtitle="2023 vintage, 75% deployed"
        rows={[
        ["Investments", "15–20"],
        ["Check size", "$100K–$250K"],
        ["Avg. ownership", "3%"],
        ["Follow-on", "None"]]
        }
        callout={<>As of {currentQuarterLabel()}, <strong>60% of Fund I companies</strong> have markups or are currently raising up rounds.</>}
        calloutDark={false} />
      

      {/* RIGHT — Fund II */}
      <FundColumn
        side="right"
        chipBg={COLORS.orange}
        chipColor={COLORS.white}
        chipBorder="none"
        title="$50M Fund II"
        subtitle={`First close target: ${currentQuarterLabel()}`}
        rows={[
        ["Investments", "15–25"],
        ["Check size", "$250K–$1M"],
        ["Ownership target", "10–15%"],
        ["Follow-on reserve", "40%"]]
        }
        callout={<>Fund II will maintain portfolio size while <strong>increasing ownership</strong>. The check-size range ensures we can target ownership levels across sectors and markets.</>}
        calloutDark={true} />
      
    </SlideFrame>);

}

// ============= SLIDE 7: Fund I table (consolidated) =============
const FUND_I_HEADERS = ["Company", "Investment\nDate", "Investment\nAmount", "Entry Post-Money\nValuation", "MOIC", "Co-investors"];
const FUND_I_ROWS = [
["RevivBio Inc.", "AI-powered enzyme discovery and validation", "Oct '23", "$135K", "$13.3M", "1.2x†", "Intel, US NSF, Alumni Ventures, BioGenerator Ventures"],
["Sparxell Inc.", "Biodegradable colors and films", "Nov '23", "$240K", "$15.0M", "1.25x", "Circular Innovation Fund (L'Oréal), Katapult, Future Communities Capital"],
["Sironix Renewables", "Cost-competitive sustainable surfactants", "Oct '24", "$200K", "$9.65M", "1x", "Arosa Ventures, Oval Park Capital, EGB Capital"],
["SoFab Inks Inc.", "High-performance electrochemicals", "Oct '24", "$200K", "$6.0M", "1x†", "Keyhorse Capital, EGB Capital"],
["Cool Amps Corp", "Industry leading critical mineral recovery", "Feb '25", "$150K", "$7.0M", "1x", "SOSV HAX"],
["GRAIN Ecosystem", "Waste-to-energy enablement and reporting", "Mar '25", "$125K", "$8.5M", "—", "SE Ventures (Schneider Electric), Elevate Ventures"],
["Bloom Hold Co.", "Hardware supply chain as a service", "Apr '25", "$150K", "$12.0M", "1x†", "Detroit Venture Partners, Newlab"],
["TriMagnetix Corp.", "Ultra-low energy computer chips", "Jun '25", "$150K", "$1.5M", "1x†", "Actuate Ventures"],
["Mothership Materials", "Feedstock generation from waste biomass", "Sep '25", "$250K", "$10.0M", "1x", "SOSV/IndieBio, Mass Challenge, NewLab"],
["Nanomox", "Advanced materials and recycling", "Nov '25", "$250K", "$6.6M", "1.31x", "Intel, US NSF, Alumni Ventures, BioGenerator Ventures"],
["Applied Bioplastics Corp.", "Ultra-low cost organic plastic blends", "Feb '26", "$250K", "$7.0M", "1x", "Circular Innovation Fund (L'Oréal), Katapult, Future Communities Capital"],
["LazeraH", "Muon-catalyzed fusion reactors", "Mar '26", "$200K", "$4M", "1x†", "Valinor AB, Esmar AB, GU Ventures, Eight Plus Ventures, Anchorage Capital"]];


function FundITable({ rows }) {
  return (
    <div style={{ position: "absolute", left: 96, top: 222, right: 96 }}>
      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 0.75fr 0.8fr 0.9fr 0.5fr 1.7fr",
        background: COLORS.paper,
        border: `1px solid ${COLORS.fog}`,
        padding: "10px 18px",
        columnGap: 12
      }}>
        {FUND_I_HEADERS.map((h, i) =>
        <div key={i} style={{
          fontFamily: FONT.sans,
          fontSize: 14,
          color: COLORS.ink,
          fontWeight: 500,
          whiteSpace: "pre-line",
          lineHeight: 1.15,
          textTransform: "uppercase",
          letterSpacing: "0.04em"
        }}>{h}</div>
        )}
      </div>
      {/* Rows */}
      {rows.map((row, idx) =>
      <div key={idx} style={{
        display: "grid",
        gridTemplateColumns: "2fr 0.75fr 0.8fr 0.9fr 0.5fr 1.7fr",
        borderLeft: `1px solid ${COLORS.fog}`,
        borderRight: `1px solid ${COLORS.fog}`,
        borderBottom: `1px solid ${COLORS.fog}`,
        padding: "10px 18px",
        alignItems: "center",
        background: idx % 2 ? "rgba(224,225,235,0.5)" : "rgba(255,255,255,0.5)",
        columnGap: 12
      }}>
          {/* Company column has subtitle */}
          <div>
            <div style={{ fontFamily: FONT.sans, fontSize: 16, color: COLORS.ink, fontWeight: 600, lineHeight: 1.15 }}>{row[0]}</div>
            <div style={{ fontFamily: FONT.sans, fontSize: 13, color: COLORS.graphite, lineHeight: 1.2, marginTop: 2 }}>{row[1]}</div>
          </div>
          {row.slice(2).map((c, i) =>
        <div key={i} style={{
          fontFamily: FONT.sans,
          fontSize: i === 4 ? 13 : 16, // Co-investors column smaller
          color: COLORS.ink,
          lineHeight: 1.25
        }}>{c}</div>
        )}
        </div>
      )}
    </div>);

}

function Slide07_FundI() {
  return (
    <SlideFrame page={7} bg={COLORS.snow}>
      <div style={{
        position: "absolute",
        inset: 0,
        background: "url('assets/cloud-bg.jpg') center/cover no-repeat",
        opacity: 0.45
      }} />
      {/* title */}
      <SlideTitle style={{ fontSize: 72 }}>Fund I</SlideTitle>
      <div style={{
        position: "absolute",
        left: 96,
        top: 168,
        fontFamily: FONT.mono,
        fontSize: 18,
        letterSpacing: "-0.04em",
        color: COLORS.ink,
        textTransform: "uppercase"
      }}>Vintage: 2023</div>
      <div style={{
        position: "absolute",
        right: 96,
        top: 168,
        fontFamily: FONT.mono,
        fontSize: 18,
        letterSpacing: "-0.04em",
        color: COLORS.ink,
        textTransform: "uppercase"
      }}>Fund Size: $4.8M</div>

      <FundITable rows={FUND_I_ROWS} />

      {/* footer notes */}
      <div style={{
        position: "absolute",
        right: 96,
        bottom: 86,
        fontFamily: FONT.mono,
        fontSize: 14,
        letterSpacing: "-0.04em",
        color: COLORS.ink
      }}>† Currently raising</div>
      <div style={{
        position: "absolute",
        left: 96, right: 96, bottom: 40,
        textAlign: "center",
        fontFamily: FONT.sans,
        fontSize: 10,
        lineHeight: 1.4,
        color: COLORS.graphite
      }}>
        Past performance is provided for illustrative purposes only and is not necessarily indicative or a guarantee of future results.
        There can be no guarantee that Fund II will be able to achieve comparable returns or avoid losses.
        There can be no guarantee that any investment opportunities will be identified, sourced, or successfully executed by the Fund.
        The availability of such opportunities is subject to market conditions and other factors beyond the Fund's control.
      </div>
    </SlideFrame>);

}

function Slide08_FundI_Page2_REMOVED() {
  return null;
}
/* old slide 8 removed
function Slide08_FundI_Page2() {
  return (
    <SlideFrame page={8} bg={COLORS.snow}>
      <div style={{
        position: "absolute",
        inset: 0,
        background: "url('assets/cloud-bg.jpg') center/cover no-repeat",
        opacity: 0.45,
      }} />
      <SlideTitle style={{ fontSize: 90 }}>Fund I</SlideTitle>
      <div style={{
        position: "absolute", left: 96, top: 200,
        fontFamily: FONT.mono, fontSize: 22, letterSpacing: "-0.04em", color: COLORS.ink, textTransform: "uppercase",
      }}>Vintage: 2023</div>
      <div style={{
        position: "absolute", right: 96, top: 200,
        fontFamily: FONT.mono, fontSize: 22, letterSpacing: "-0.04em", color: COLORS.ink, textTransform: "uppercase",
      }}>Fund Size: $4.8M</div>

      <FundITable rows={FUND_I_PAGE2} totalRowsForBlanks={9} />

      <div style={{
        position: "absolute", left: 96, bottom: 110,
        fontFamily: FONT.mono, fontSize: 18, letterSpacing: "-0.04em", color: COLORS.ink,
      }}>Page 2 of 2</div>
      <div style={{
        position: "absolute", right: 96, bottom: 110,
        fontFamily: FONT.mono, fontSize: 18, letterSpacing: "-0.04em", color: COLORS.ink,
      }}>† Currently raising</div>
      <div style={{
        position: "absolute", left: 96, right: 96, bottom: 56,
        textAlign: "center",
        fontFamily: FONT.sans, fontSize: 11, lineHeight: 1.4, color: COLORS.graphite,
      }}>
        Past performance is provided for illustrative purposes only and is not necessarily indicative or a guarantee of future results.
        There can be no guarantee that Fund II will be able to achieve comparable returns or avoid losses.
        There can be no guarantee that any investment opportunities will be identified, sourced, or successfully executed by the Fund.
        The availability of such opportunities is subject to market conditions and other factors beyond the Fund's control.
      </div>
    </SlideFrame>
  );
}
*/

// ============= SLIDE 5b: Variant — focus on the 4 points =============
const SCIENTIFIC_POINTS_V2 = [
  {
    point: "Creates the best viable fix",
    logo: "assets/portfolio/logo-sofab.png",
    logoH: 40,
    name: "SoFab Inks",
    blurb: "IP-protected chemistries. $30M+ in POs from the world's largest perovskite manufacturer.",
  },
  {
    point: "Fundamentally resets pricing",
    logo: "assets/portfolio/logo-revivbio.png",
    logoH: 44,
    name: "RevivBio",
    blurb: "Order-of-magnitude reduction in enzyme dev cost. $10M+ contracts with Bayer, Syngenta, Corteva.",
  },
  {
    point: "Generates revenue from day one",
    logo: "assets/logo-sparxell.png",
    logoH: 40,
    name: "Sparxell",
    blurb: "Drop-in colorant IP. 24 paid pilots — LVMH, Hugo Boss, H&M — and $1M+ in revenue.",
  },
  {
    point: "Solves using first principles",
    logo: "assets/portfolio/logo-trimagnetix.png",
    logoH: 38,
    name: "TriMagnetix",
    blurb: "Nanomagnetic chip architecture. 40× energy reduction proven, 500× path validated.",
  },
];

function PointCard({ point, logo, logoH, name, blurb }) {
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
      {/* The point — hero */}
      <div style={{
        fontFamily: FONT.mono,
        fontSize: 56,
        lineHeight: 1.02,
        letterSpacing: "-0.05em",
        color: COLORS.ink,
        textTransform: "none",
      }}>
        <span style={{
          background: COLORS.orange,
          color: COLORS.white,
          padding: "0.04em 0.18em",
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
        }}>{point}</span>
      </div>

      {/* Compact callout — logo + 1-liner */}
      <div style={{
        marginTop: 28,
        border: `1px solid ${COLORS.ink}`,
        background: "rgba(255,255,255,0.7)",
        padding: "16px 20px",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 18,
        alignItems: "center",
      }}>
        <div style={{ height: logoH, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 110 }}>
          <img src={logo} alt={name} style={{ height: logoH, maxWidth: 150, objectFit: "contain" }} />
        </div>
        <div style={{
          fontFamily: FONT.sans,
          fontSize: 16,
          lineHeight: 1.35,
          color: COLORS.ink,
          borderLeft: `1px solid ${COLORS.ink}33`,
          paddingLeft: 18,
        }}>{blurb}</div>
      </div>
    </div>
  );
}

function Slide05b_ScientificIP_FourPoints() {
  return (
    <SlideFrame page={5} bg={COLORS.snow}>
      <div style={{
        position: "absolute",
        inset: 0,
        background: "url('assets/cloud-bg.jpg') center/cover no-repeat",
        opacity: 0.55,
      }} />
      <SlideTitle>The best IP does four things well</SlideTitle>

      <div style={{
        position: "absolute",
        left: 96, right: 96,
        top: 240, bottom: 140,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        columnGap: 80,
        rowGap: 56,
      }}>
        {SCIENTIFIC_POINTS_V2.map((p, i) => <PointCard key={i} {...p} />)}
      </div>

      <div style={{
        position: "absolute",
        left: 96, right: 96,
        bottom: 40,
        textAlign: "center",
        fontFamily: FONT.sans,
        fontSize: 11,
        lineHeight: 1.4,
        color: COLORS.graphite,
      }}>
        The case studies presented herein relate solely to investments made by Fund I and are included for illustrative purposes only.
        These investments may not be representative of the investments of Fund II, and no assurance can be given that Fund II will identify, access, or achieve investments or results comparable to those described herein.
        A complete list of all portfolio companies of Fund I, together with information similar to the information provided on this slide, will be made available upon request. Past performance is not indicative of future results.
      </div>
    </SlideFrame>
  );
}

window.Slide05b_ScientificIP_FourPoints = Slide05b_ScientificIP_FourPoints;
window.Slide05_ScientificIP = Slide05_ScientificIP;
window.Slide06_DesignedForOwnership = Slide06_DesignedForOwnership;
window.Slide07_FundI = Slide07_FundI;