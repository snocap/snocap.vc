// Slides 13-16: TriMagnetix case, Sparxell case, At-a-glance key terms, Thank You

// ============= SLIDE 13: Case Study — TriMagnetix =============
function Slide13_CaseStudy_TriMagnetix() {
  return (
    <SlideFrame page={13} bg={COLORS.snow}>
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 96,
          fontFamily: FONT.mono,
          fontSize: 22,
          letterSpacing: "-0.04em",
          background: COLORS.orange,
          color: COLORS.white,
          padding: "4px 12px",
          textTransform: "uppercase",
        }}
      >
        Case Study
      </div>

      <div
        style={{
          position: "absolute",
          left: 96,
          top: 160,
          fontFamily: FONT.mono,
          fontSize: 96,
          fontWeight: 400,
          lineHeight: 1.0,
          letterSpacing: "-0.05em",
          color: COLORS.ink,
          textTransform: "uppercase",
        }}
      >
        TriMagnetix
      </div>

      <div
        style={{
          position: "absolute",
          left: 940,
          top: 188,
          fontFamily: FONT.sans,
          fontSize: 26,
          fontWeight: 500,
          color: COLORS.ink,
          lineHeight: 1.3,
          maxWidth: 800,
        }}
      >
        Ultra low-energy computer chips,
        <br />
        replacing the transistor with magnets.
      </div>

      <CaseStudyGrid
        stages={[
          {
            stage: "Discovery",
            body: "Due to our unique position as the key deep tech investor in Seattle, we were referred a lead from co-investor Actuate Ventures. Initial direction was space tech.",
          },
          {
            stage: "Analysis",
            body: "We quickly discovered the energy saving potential of the chips, but also the wide range of applications, such as radiation resistant compute.",
          },
          {
            stage: "Conviction",
            body: "When we realized we had an opportunity to get the business into the lab, and to develop the chips at a fraction of what the team was projecting, we moved.",
          },
          {
            stage: "Negotiation",
            body: "We reduced the valuation from $10M+ to $1.5M by addressing key cost drivers like equipment costs, focusing instead on proving out viability of the design first.",
          },
          {
            stage: "Syndication",
            body: "Once we invested, we brought in several firms and angel investors that helped to smooth operating capital for lab work.",
          },
        ]}
        photoTopRight="assets/case/trimag-right.png"
        photoBottomLeft="assets/case/trimag-bottom.jpg"
        placeholder="chip"
      />

      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          bottom: 56,
          textAlign: "center",
          fontFamily: FONT.sans,
          fontSize: 11,
          lineHeight: 1.4,
          color: COLORS.graphite,
        }}
      >
        The case study presented herein relates solely to an investment made by
        Fund I and is included for illustrative purposes only. This investment
        may not be representative of the investments of Fund II, and no
        assurance can be given that Fund II will identify, access, or achieve
        investments or results comparable to those described herein. A complete
        list of all portfolio companies of Fund I, together with information
        similar to the information provided on this slide, will be made
        available upon request. Past performance is not indicative of future
        results.
      </div>
    </SlideFrame>
  );
}

// ============= SLIDE 14: Case Study — Sparxell =============
function Slide14_CaseStudy_Sparxell() {
  return (
    <SlideFrame page={14} bg={COLORS.snow}>
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 96,
          fontFamily: FONT.mono,
          fontSize: 22,
          letterSpacing: "-0.04em",
          background: COLORS.orange,
          color: COLORS.white,
          padding: "4px 12px",
          textTransform: "uppercase",
        }}
      >
        Case Study
      </div>

      <div
        style={{
          position: "absolute",
          left: 96,
          top: 160,
          fontFamily: FONT.mono,
          fontSize: 96,
          fontWeight: 400,
          lineHeight: 1.0,
          letterSpacing: "-0.05em",
          color: COLORS.ink,
          textTransform: "uppercase",
        }}
      >
        Sparxell
      </div>

      <div
        style={{
          position: "absolute",
          left: 720,
          top: 188,
          fontFamily: FONT.sans,
          fontSize: 26,
          fontWeight: 500,
          color: COLORS.ink,
          lineHeight: 1.3,
          maxWidth: 1000,
        }}
      >
        Plant-based, biodegradable colors and films,
        <br />
        with a drop-in fit into existing manufacturing.
      </div>

      <CaseStudyGrid
        stages={[
          {
            stage: "Discovery",
            body: "Sparxell was sent to us when peer investors realized they were unable to value the company. From here, we developed a key relationship with founder Ben.",
          },
          {
            stage: "Analysis",
            body: "Our analysis showed the technology's applicability across cosmetics, textiles, automotive, and industrial coatings — all categories where regulators are forcing exits.",
          },
          {
            stage: "Conviction",
            body: "Founder Ben demonstrated talent attraction, off-the-shelf manufacturing, and Cambridge IP. Customer pull from LVMH, Hugo Boss, and H&M validated the technology.",
          },
          {
            stage: "Negotiation",
            body: "We secured a board observer seat alongside L'Oréal's strategic Circular Innovation Fund. Invested at a $15M post-money valuation in the seed round.",
          },
          {
            stage: "Syndication",
            body: "We brought in Future Communities Capital for the round, supplementing existing strategic investors with patient growth capital.",
          },
        ]}
        photoTopRight="assets/case/sparxell-rainbow.jpg"
        photoBottomLeft="assets/case/sparxell-tile.png"
        placeholder="iridescence"
      />

      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          bottom: 56,
          textAlign: "center",
          fontFamily: FONT.sans,
          fontSize: 11,
          lineHeight: 1.4,
          color: COLORS.graphite,
        }}
      >
        The case study presented herein relates solely to an investment made by
        Fund I and is included for illustrative purposes only. This investment
        may not be representative of the investments of Fund II, and no
        assurance can be given that Fund II will identify, access, or achieve
        investments or results comparable to those described herein. A complete
        list of all portfolio companies of Fund I, together with information
        similar to the information provided on this slide, will be made
        available upon request. Past performance is not indicative of future
        results.
      </div>
    </SlideFrame>
  );
}

// ============= SLIDE 15: At a Glance / Key Terms =============
const KEY_TERMS = [
  ["Fund Target", "$50M target, $75M cap"],
  ["Portfolio", "15-25 investments"],
  ["Initial Check Size", "$250K - $1M"],
  ["Ownership Target", "10-15%"],
  ["Reserves", "40% reserved for follow-on"],
  ["Management Fee", "2.0%"],
  ["Carried Interest", "20%"],
  ["GP Commit", "1%"],
  ["LP Minimum", "$500K (subject to GP discretion)"],
  ["Investment Period", "5 years"],
  ["Fund Term", "10 years (+2-year extension at GP option)"],
  ["Fund Counsel", "Perkins Coie"],
];

function Slide15_AtAGlance() {
  // Card field component
  const Field = ({ label, value, mono = true }) => (
    <div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 16,
          letterSpacing: "-0.03em",
          color: "rgba(255,255,255,0.6)",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? FONT.mono : FONT.sans,
          fontSize: 36,
          letterSpacing: "-0.04em",
          color: COLORS.snow,
          lineHeight: 1.0,
        }}
      >
        {value}
      </div>
    </div>
  );

  const SectionHeading = ({ children }) => (
    <div
      style={{
        fontFamily: FONT.mono,
        fontSize: 32,
        letterSpacing: "-0.04em",
        color: COLORS.snow,
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );

  const Card = ({ children, style = {} }) => (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        padding: "32px 40px",
        ...style,
      }}
    >
      {children}
    </div>
  );

  return (
    <SlideFrame page={15} dark={true} bg={COLORS.black}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "url('assets/contour-appalachia.png') center/cover no-repeat",
          opacity: 0.45,
        }}
      />
      <SlideTitle style={{ color: COLORS.snow }}>At a glance</SlideTitle>

      {/* LEFT COLUMN — Portfolio Construction + Back Office */}
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 240,
          width: 720,
          display: "flex",
          flexDirection: "column",
          gap: 36,
        }}
      >
        <div>
          <SectionHeading>Portfolio Construction</SectionHeading>
          <Card>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                rowGap: 32,
                columnGap: 40,
              }}
            >
              <Field label="Total Investments" value="15-25" />
              <Field label="Target Ownership" value="10-15%" />
              <Field label="Check Size" value="$250K-$1M" />
              <Field label="Reserves" value="40%" />
            </div>
          </Card>
        </div>

        <div>
          <SectionHeading>Back Office</SectionHeading>
          <Card>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 40,
                rowGap: 28,
              }}
            >
              <Field label="Legal" value="Perkins Coie" mono={true} />
              <Field label="Tax & Audit" value="Sensiba" mono={true} />
              <Field label="Banking" value="Stifel Bank" mono={true} />
            </div>
          </Card>
        </div>
      </div>

      {/* RIGHT COLUMN — Key Terms */}
      <div
        style={{
          position: "absolute",
          left: 856,
          top: 240,
          right: 96,
        }}
      >
        <SectionHeading>Key Terms</SectionHeading>
        <Card>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              rowGap: 36,
              columnGap: 56,
            }}
          >
            <Field label="Fund Name" value="SNOCAP US II, LP" />
            <Field label="Carried Interest" value="20%" />
            <Field label="Target Commitment" value="$50M" />
            <Field label="Management Fee" value="2%" />
            <Field label="GP Contribution" value="1%" />
            <Field label="Investment Period" value="5 Years" />
            <Field
              label="LP Minimums"
              value={
                <>
                  $500K
                  <sup style={{ fontSize: 18, color: COLORS.orange }}>*</sup>
                </>
              }
            />
            <Field label="Fund Term" value="10 Years" />
          </div>
        </Card>
        <div
          style={{
            marginTop: 14,
            fontFamily: FONT.sans,
            fontSize: 14,
            color: "rgba(255,255,255,0.55)",
            textAlign: "right",
          }}
        >
          <span style={{ color: COLORS.orange }}>*</span> Subject to GP
          Discretion
        </div>
      </div>
    </SlideFrame>
  );
}

// ============= SLIDE 16: Thank You =============
function Slide16_ThankYou() {
  return (
    <SlideFrame
      page={16}
      dark={true}
      bg={COLORS.black}
      pageLabel="FUND II"
      yearLabel="2026"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "url('assets/contour-appalachia.png') center/cover no-repeat",
          opacity: 0.45,
        }}
      />

      {/* big THANK YOU block — bottom left */}
      <div
        style={{
          position: "absolute",
          left: 96,
          bottom: 220,
          right: 96,
        }}
      >
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 160,
            fontWeight: 400,
            lineHeight: 0.95,
            letterSpacing: "-0.06em",
            color: COLORS.snow,
            textTransform: "uppercase",
          }}
        >
          Ready to
          <br />
          learn more?
        </div>

        <div
          style={{
            marginTop: 36,
            maxWidth: 1100,
            fontFamily: FONT.sans,
            fontSize: 30,
            fontWeight: 300,
            lineHeight: 1.4,
            color: "rgba(255,255,255,0.9)",
          }}
        >
          Access to disclosures, data room and more by emailing{" "}
          <a
            href="mailto:gps@snocap.vc"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <Highlight>gps@snocap.vc</Highlight>
          </a>
          .
        </div>
      </div>

      {/* small wordmark top-right */}
      <img
        src="assets/branding/logo-snocap-text.svg"
        alt="SNØCAP"
        style={{
          position: "absolute",
          right: 96,
          top: 80,
          height: 56,
          width: "auto",
        }}
      />
    </SlideFrame>
  );
}

window.Slide13_CaseStudy_TriMagnetix = Slide13_CaseStudy_TriMagnetix;
window.Slide14_CaseStudy_Sparxell = Slide14_CaseStudy_Sparxell;
window.Slide15_AtAGlance = Slide15_AtAGlance;
window.Slide16_ThankYou = Slide16_ThankYou;
