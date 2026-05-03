// Slides 9-12: Team, Who We Work With, Where Breakthroughs Happen, Case Study SoFab

// ============= SLIDE 9: The SNØCAP Team =============
const TEAM = [
  {
    name: "Shrina Kurani",
    role: "Portfolio and Middle Office",
    tagline: "Built companies, funds, and political campaigns",
    photo: "assets/team/headshot-shrina.jpeg",
    linkedin: "https://www.linkedin.com/in/shrina-kurani-94a88b56",
    bio: "Mechanical engineer and sustainability scientist with a decade of experience building, investing in, and advocating for frontier climate tech. Invested in early-stage, mission-driven companies on a $9B portfolio at Republic, and across the entire $135B in assets under management at the State of California. She has overseen approximately $1B in cumulative direct and fund investments.",
  },
  {
    name: "Nate Salpeter",
    role: "Fundraising and Diligence",
    tagline: "0 to 1 in nuclear, three times over",
    photo: "assets/team/headshot-nate.jpeg",
    linkedin: "https://www.linkedin.com/in/nate-salpeter-77145712/",
    bio: "Software engineering leader with over 15 years of experience across a wide array of sectors (social, gaming, real estate, fitness, logistics, fintech) and two notable exits in the past five years (Disney, Coinbase). He brings a deep understanding of building Silicon Valley companies, with two prior exits and IPOs at Zillow and Disney.",
  },
  {
    name: "Jonathan Azoff",
    role: "Sourcing and Operations",
    tagline: "20 years, 5 companies, 3 exits",
    photo: "assets/team/headshot-jon.jpeg",
    linkedin: "https://www.linkedin.com/in/jazoff/",
    bio: "Ph.D. Mechanical Engineer with 18 years experience in the climate tech space, including being the first fluid dynamicist at both TerraPower and KairosPower. Co-founder of Sweet Farm, a non-profit incubator that has launched companies with $700M in downstream value. Currently CTO of Quantum Leap Energy.",
  },
];

const TEAM_SPECIALTIES = [
  // rows: [label, [shrina, nate, jonathan]]  — true = focus, "depth" = supporting
  ["Materials science", [true, true, false]],
  ["Energy & climate", [true, true, false]],
  ["Software & platforms", [false, false, true]],
  ["Engineering R&D", [false, true, false]],
  ["Capital markets", [true, false, true]],
  ["Tech transfer", [false, true, false]],
  ["Operations & ops scale-up", [false, true, true]],
  ["Policy & government", [true, false, false]],
  ["Storytelling & brand", [true, false, true]],
];

function Slide09_Team() {
  return (
    <SlideFrame page={9} bg={COLORS.snow}>
      <SlideTitle>The SNØCAP team</SlideTitle>
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 200,
          fontFamily: FONT.mono,
          fontSize: 22,
          letterSpacing: "-0.04em",
          color: COLORS.graphite,
          textTransform: "uppercase",
        }}
      >
        Engineers, operators, capital allocators
      </div>

      {/* Team cards */}
      <div
        style={{
          position: "absolute",
          left: 96,
          top: 280,
          right: 96,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 32,
        }}
      >
        {TEAM.map((p) => (
          <div
            key={p.name}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: `url('${p.photo}') center/cover no-repeat ${COLORS.cloud}`,
                filter: "grayscale(0.15) contrast(1.02)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: FONT.mono,
                fontSize: 32,
                letterSpacing: "-0.04em",
                color: COLORS.ink,
                lineHeight: 1.05,
              }}
            >
              <span style={{ flex: 1 }}>{p.name}</span>
              <a
                href={p.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0A66C2",
                  textDecoration: "none",
                  flexShrink: 0,
                }}
                aria-label={`${p.name} on LinkedIn`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
                </svg>
              </a>
            </div>
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 18,
                letterSpacing: "-0.02em",
                background: COLORS.orange,
                color: COLORS.white,
                padding: "2px 8px",
                alignSelf: "flex-start",
                textTransform: "uppercase",
                marginTop: -8,
              }}
            >
              {p.role}
            </div>
            <div
              style={{
                fontFamily: FONT.sans,
                fontSize: 18,
                fontStyle: "italic",
                lineHeight: 1.4,
                color: COLORS.ink,
                marginTop: -4,
              }}
            >
              {p.tagline}
            </div>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

// ============= SLIDE 10: Who we work with =============
const VENTURE_PARTNERS = [
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/HBS_Shield.svg/200px-HBS_Shield.svg.png",
    alt: "Harvard Business School",
    label: "Harvard\nBusiness School",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Wharton_logo.svg/240px-Wharton_logo.svg.png",
    alt: "Wharton",
    label: "Wharton",
  },
];

function LogoCell({ children, h = 80 }) {
  return (
    <div
      style={{
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function TextLogo({
  children,
  color = COLORS.ink,
  size = 32,
  family = FONT.sans,
  weight = 600,
  italic = false,
}) {
  return (
    <div
      style={{
        fontFamily: family,
        fontSize: size,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        color,
        letterSpacing: "-0.01em",
        lineHeight: 1.05,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function Slide10_WhoWeWorkWith() {
  const Logo = ({ src, alt, h = 56, maxW = "100%" }) => (
    <div
      style={{
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <img
        src={`assets/logos/${src}`}
        alt={alt}
        style={{ maxHeight: h, maxWidth: maxW, objectFit: "contain" }}
      />
    </div>
  );

  return (
    <SlideFrame page={10} bg={COLORS.snow}>
      <SlideTitle>Who we work with</SlideTitle>

      {/* LEFT — academic */}
      <div style={{ position: "absolute", left: 96, top: 240, width: 800 }}>
        <Section title="Venture Partners">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              padding: "28px 32px",
              alignItems: "center",
            }}
          >
            <Logo h={72} alt="Harvard Business School" src="hbs.png" />
            <Logo h={72} alt="Wharton" src="wharton.png" />
          </div>
        </Section>

        <Section title="Fellows">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 16,
              padding: "24px 24px",
              alignItems: "center",
            }}
          >
            <Logo h={56} alt="Yale" src="yale.png" />
            <Logo h={48} alt="University of Michigan" src="michigan.png" />
            <Logo h={64} alt="UBC" src="ubc.png" />
            <Logo h={48} alt="Skidmore" src="skidmore.png" />
          </div>
        </Section>

        <Section title="University Relationships">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px 24px",
              padding: "24px 24px",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                flex: "0 0 calc(33.333% - 16px)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Logo h={56} alt="Cornell" src="cornell.png" />
            </div>
            <div
              style={{
                flex: "0 0 calc(33.333% - 16px)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Logo h={56} alt="RIT" src="rit.png" />
            </div>
            <div
              style={{
                flex: "0 0 calc(33.333% - 16px)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Logo h={56} alt="Cambridge Enterprise" src="cambridge.png" />
            </div>
            <div
              style={{
                flex: "0 0 calc(33.333% - 16px)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Logo h={48} alt="UC Davis" src="uc-davis.png" />
            </div>
            <div
              style={{
                flex: "0 0 calc(33.333% - 16px)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Logo h={56} alt="Penn State" src="penn-state.png" />
            </div>
            <div
              style={{
                flex: "0 0 calc(33.333% - 16px)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Logo h={48} alt="UC Riverside" src="uc-riverside.png" />
            </div>
          </div>
        </Section>
      </div>

      {/* RIGHT — co-investors & pilots */}
      <div style={{ position: "absolute", left: 928, top: 240, width: 880 }}>
        <Section title="Co-investors & Pilots">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px 24px",
              padding: "32px 32px",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {[
              {
                src: "schneider-electric.png",
                alt: "Schneider Electric",
                h: 84,
              },
              { src: "newlab.png", alt: "Newlab", h: 80 },
              { src: "anglo-american.png", alt: "Anglo American", h: 80 },
              { src: "loreal.png", alt: "L'Oréal", h: 84 },
              { src: "beiersdorf.png", alt: "Beiersdorf", h: 80 },
              { src: "pilot-chemical.png", alt: "Pilot Chemical", h: 88 },
              { src: "gener8tor.png", alt: "gener8tor", h: 80 },
              { src: "sweet-farm.png", alt: "Sweet Farm", h: 80 },
              { src: "ab-inbev.png", alt: "AB InBev", h: 80 },
              { src: "hax.png", alt: "HAX", h: 84 },
              { src: "biogenerator.png", alt: "BioGenerator", h: 80 },
              {
                src: "future-communities-capital.png",
                alt: "Future Communities Capital",
                h: 84,
              },
            ].map((logo) => (
              <div
                key={logo.src}
                style={{
                  flex: "0 0 calc(33.333% - 16px)",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Logo h={logo.h} alt={logo.alt} src={logo.src} />
              </div>
            ))}
          </div>
        </Section>
      </div>

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
        The logos and names of venture partners, fellows, and university
        relationships presented herein are for illustrative purposes only to
        reflect the Fund's broader network and ecosystem. The inclusion of such
        logos does not imply any formal partnership, endorsement, or
        affiliation, nor does it indicate that any such parties have committed
        capital to, will invest in, or will otherwise be involved in the Fund.
        These relationships are subject to change and may be informal or
        non-exclusive.
      </div>
    </SlideFrame>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          background: COLORS.paper,
          border: `1px solid ${COLORS.fog}`,
          borderBottom: "none",
          padding: "12px 24px",
          fontFamily: FONT.mono,
          fontSize: 18,
          letterSpacing: "-0.04em",
          color: COLORS.ink,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {title}
      </div>
      <div
        style={{ border: `1px solid ${COLORS.fog}`, background: COLORS.white }}
      >
        {children}
      </div>
    </div>
  );
}

// ============= SLIDE 11: Where the breakthroughs are happening =============
const BREAKTHROUGH_GRID = [
  // [label, x%, y%, fontSize, isPill]
  ["Computational\nBiology", 16, 30, 22, false],
  ["Enzymes", 28, 35, 22, false],
  ["Catalysis", 10, 41, 22, false],
  ["MOLECULES", 22, 49, 32, true],
  ["Coatings", 28, 56, 22, false],
  ["Proteins", 10, 56, 22, false],
  ["Surfactants", 14, 64, 22, false],
  ["Redox chemistry", 25, 70, 22, false],
  ["Electrochemistry", 17, 76, 22, false],

  ["Polymers", 46, 24, 22, false],
  ["Composites", 56, 30, 22, false],
  ["Biodegradables", 46, 36, 22, false],
  ["Photonics", 56, 44, 22, false],
  ["MATERIALS", 50, 49, 32, true],
  ["Surface chemistry", 54, 58, 22, false],
  ["Valorization", 45, 67, 22, false],
  ["Thermodynamics", 55, 72, 22, false],
  ["Coatings", 50, 76, 22, false],

  ["Magnetics", 74, 24, 22, false],
  ["Hardware systems", 86, 30, 22, false],
  ["Spintronics", 76, 38, 22, false],
  ["Supply-chain\ninformatics", 89, 43, 22, false],
  ["MACHINES", 78, 49, 32, true],
  ["Industrial automation", 84, 60, 22, false],
  ["Low-energy\ncompute", 83, 68, 22, false],
];

function Slide11_BreakthroughsHappening() {
  return (
    <SlideFrame page={11} dark={true} bg={COLORS.black}>
      {/* network background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "url('assets/slide8-bg.png') center/cover no-repeat",
          opacity: 0.4,
        }}
      />
      {/* dark gradient overlay for legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 80%)",
        }}
      />

      <SlideTitle style={{ color: COLORS.snow }}>
        Where breakthroughs are happening today
      </SlideTitle>

      {/* labels positioned across the slide */}
      <div style={{ position: "absolute", inset: 0 }}>
        {BREAKTHROUGH_GRID.map(([label, x, y, size, isPill], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              background: isPill ? COLORS.orange : "rgba(20,20,20,0.85)",
              color: COLORS.white,
              padding: isPill ? "12px 28px" : "8px 16px",
              fontFamily: isPill ? FONT.mono : FONT.sans,
              fontWeight: isPill ? 400 : 400,
              fontSize: size,
              letterSpacing: isPill ? "-0.04em" : "-0.005em",
              lineHeight: 1.15,
              whiteSpace: "pre-line",
              textAlign: "center",
              border: isPill ? "none" : "1px solid rgba(255,255,255,0.12)",
              textTransform: isPill ? "uppercase" : "none",
            }}
          >
            {label}
          </div>
        ))}
      </div>

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
          color: "rgba(255,255,255,0.6)",
        }}
      >
        The investment strategy of the Fund is subject to change without any
        prior notice to investors and there is no guarantee the Fund will
        achieve its investment objective.
      </div>
    </SlideFrame>
  );
}

// ============= SLIDE 12: Case Study — SoFab =============
function Slide12_CaseStudy_SoFab() {
  return (
    <SlideFrame page={12} bg={COLORS.snow}>
      {/* eyebrow */}
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

      {/* Title */}
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
        SoFab
      </div>

      <div
        style={{
          position: "absolute",
          left: 480,
          top: 188,
          fontFamily: FONT.sans,
          fontSize: 26,
          fontWeight: 500,
          color: COLORS.ink,
          lineHeight: 1.3,
          maxWidth: 1100,
        }}
      >
        High-performance electrochemical inputs
        <br />
        for next-gen solar and sensor applications
      </div>

      {/* Grid of journey cards + 2 photos */}
      <CaseStudyGrid
        stages={[
          {
            stage: "Discovery",
            body: "With industry experts highlighting perovskites as the next generation of solar materials, SoFab emerged from our research as the only company addressing key constraints in the emerging category.",
          },
          {
            stage: "Analysis",
            body: "Their chemicals unlock record-breaking efficiency and durability in perovskite solar while reducing cost pressures, with process technology adaptable to catalysts and advanced sensors.",
          },
          {
            stage: "Conviction",
            body: "Customer validation from leading perovskite developers testing SoFab on record-breaking lines. Reinforced by LOIs & MOUs from global manufacturers, with interest advancing to paid trials & POs.",
          },
          {
            stage: "Negotiation",
            body: "Without an existing technical or Silicon Valley seasoned investor on the cap table, we invested under the agreement that we had a board observer role. We invested at a $6M post-money valuation.",
          },
          {
            stage: "Syndication",
            body: "Supported strategic pre-seed fundraise decisions and seed round narrative.",
          },
        ]}
        photoTopRight="assets/case/sofab-top.png"
        photoBottomLeft="assets/case/sofab-bottom.png"
        placeholder="lab"
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

// Linear case-study flow: 5 stages → with arrows + photo strip below
function CaseStudyGrid({
  stages,
  photoTopRight,
  photoBottomLeft,
  placeholder,
}) {
  const Arrow = () => (
    <div
      style={{
        flex: "0 0 auto",
        width: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: COLORS.orange,
        fontFamily: FONT.mono,
        fontSize: 36,
        fontWeight: 400,
        lineHeight: 1,
      }}
    >
      <svg
        width="48"
        height="20"
        viewBox="0 0 48 20"
        fill="none"
        stroke={COLORS.orange}
        strokeWidth="2"
        strokeDasharray="6 4"
      >
        <line x1="0" y1="10" x2="38" y2="10" />
        <polyline points="32,4 42,10 32,16" fill="none" />
      </svg>
    </div>
  );

  const cell = (s, i) => (
    <div
      key={i}
      style={{
        flex: "1 1 0",
        minWidth: 0,
        border: `1px solid ${COLORS.ink}`,
        display: "flex",
        flexDirection: "column",
        background: COLORS.white,
      }}
    >
      <div
        style={{
          borderBottom: `1px solid ${COLORS.ink}`,
          padding: "12px 16px",
          fontFamily: FONT.mono,
          fontSize: 20,
          textAlign: "center",
          letterSpacing: "-0.04em",
          color: COLORS.ink,
          textTransform: "uppercase",
        }}
      >
        {s.stage}
      </div>
      <div
        style={{
          padding: "20px 22px",
          fontFamily: FONT.sans,
          fontSize: 16,
          lineHeight: 1.45,
          color: COLORS.ink,
        }}
      >
        {s.body}
      </div>
    </div>
  );

  const photo = (src, alt) => (
    <div
      style={{
        flex: "1 1 0",
        border: `2px solid ${COLORS.orange}`,
        background: src
          ? `url('${src}') center/cover no-repeat`
          : `repeating-linear-gradient(45deg, ${COLORS.cloud}, ${COLORS.cloud} 10px, ${COLORS.fog} 10px, ${COLORS.fog} 20px)`,
        minHeight: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: COLORS.graphite,
        fontFamily: FONT.mono,
        fontSize: 14,
      }}
    >
      {!src && (alt || "Photo")}
    </div>
  );

  return (
    <>
      {/* Stages row with arrows */}
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          top: 320,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          gap: 0,
        }}
      >
        {stages.flatMap((s, i) =>
          i === 0 ? [cell(s, i)] : [<Arrow key={`a${i}`} />, cell(s, i)],
        )}
      </div>

      {/* Photo strip below — sits close to stage cards above; widths align with
          stage cards (left photo spans stages 1-2 + arrow, right spans 3-5 + 2 arrows). */}
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          top: 640,
          display: "flex",
          flexDirection: "row",
          gap: 48,
          height: 300,
        }}
      >
        <div style={{ flex: "0 0 662px", display: "flex" }}>
          {photo(photoBottomLeft, placeholder)}
        </div>
        <div style={{ flex: "1 1 auto", display: "flex" }}>
          {photo(photoTopRight, placeholder)}
        </div>
      </div>
    </>
  );
}

// (legacy grid removed — superseded by linear flow above)

window.Slide09_Team = Slide09_Team;
window.Slide10_WhoWeWorkWith = Slide10_WhoWeWorkWith;
window.Slide11_BreakthroughsHappening = Slide11_BreakthroughsHappening;
window.Slide12_CaseStudy_SoFab = Slide12_CaseStudy_SoFab;
window.CaseStudyGrid = CaseStudyGrid;
