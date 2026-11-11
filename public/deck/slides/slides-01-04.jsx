// Slides 1-4: Cover, Disclaimer, Intro/Section, Homegrown Advantages

// ============= SLIDE 1: Cover =============
function Slide01_Cover() {
  return (
    <SlideFrame
      page={1}
      label="Cover"
      totalPages={16}
      bg={COLORS.snow}
      showLeftCaption={false}
      showFooter={false}
      showCorners={false}
    >
      {/* mountain bg */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "url('assets/hero-mountains.jpg') center/cover no-repeat",
          filter: "grayscale(1)",
          opacity: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(249,249,249,0.0) 0%, rgba(249,249,249,0.85) 70%, rgba(249,249,249,1) 100%)",
        }}
      />

      {/* big SNOCAP wordmark */}
      <img
        src="assets/branding/logo-snocap-text.svg"
        alt="SNØCAP"
        style={{
          position: "absolute",
          left: 96,
          bottom: 220,
          width: 1100,
          height: "auto",
          zIndex: 2,
        }}
      />

      {/* fund tag */}
      <div
        style={{
          position: "absolute",
          left: 100,
          bottom: 160,
          fontFamily: FONT.mono,
          fontSize: 30,
          letterSpacing: "-0.04em",
          color: COLORS.ink,
          textTransform: "uppercase",
        }}
      >
        Fund II · {currentQuarterLabel()}
      </div>

      {/* top-right caption */}
      <div
        style={{
          position: "absolute",
          right: 96,
          top: 96,
          fontFamily: FONT.mono,
          fontSize: 16,
          letterSpacing: "-0.04em",
          color: COLORS.ink,
          textTransform: "uppercase",
          textAlign: "right",
        }}
      >
        SNOCAP US II, LP
        <br />
        Highly private &amp; confidential
      </div>

      {/* bottom-right tagline */}
      <div
        style={{
          position: "absolute",
          right: 96,
          bottom: 160,
          fontFamily: FONT.sans,
          fontWeight: 300,
          fontSize: 26,
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
          color: COLORS.graphite,
          textAlign: "right",
          maxWidth: 540,
        }}
      >
        <br />
        <br />
      </div>

      {/* small horizontal rule */}
      {false && (
        <div
          style={{
            position: "absolute",
            left: 96,
            right: 96,
            bottom: 100,
            height: 1,
            background: COLORS.ink,
            opacity: 0.3,
          }}
        />
      )}
    </SlideFrame>
  );
}

// ============= SLIDE 2: Disclaimer =============
const DISCLAIMER_TEXT = `The information in this document is provided for informational and discussion purposes only and is not, and may not be relied on in any manner as, legal, tax or investment advice. It is not an offer to sell or a solicitation of an offer to purchase a limited partner interest in SNOCAP US II, LP, including any of its parallel funds and co-investment vehicles (collectively, the "Fund") or any successors thereto launched in the future by Sno Management LLC or its affiliates (the "Firm"). There is no guarantee that the Firm will offer limited partner interests of any future fund advised by the Firm upon the terms described herein. A private offering of a limited partner interest in the Fund will be furnished to qualified investors at their request for consideration in connection with such offering. The Fund's risk factors and conflicts of interest disclosed in a disclosure supplement (the "Disclosure Supplement") will contain a more detailed description of the material terms of an investment in the Fund, including discussions of certain specific risk factors, conflicts (or potential conflicts) of interest, tax considerations, fees, liquidity rights, restrictions on sales in particular jurisdictions, and other matters relevant to prospective investors. If there are any conflicts between this document and the Disclosure Supplement or other definitive documentation, the Disclosure Supplement or other definitive documentation shall control. An investment in the Fund will be suitable only for certain sophisticated investors who have no need for immediate liquidity in their investment and who understand and are prepared to bear the associated risks. Investment losses may occur and investors could lose some or all of their investment. Nothing herein is intended to imply that an investment in the Fund may be considered "conservative," "safe," or "risk-free". No regulatory authority has endorsed these materials or reviewed or approved the merits of an investment the Fund. The Fund will not register as an investment company under the U.S. Investment Company Act of 1940, as amended. This presentation contains confidential information and should not be disclosed to any person other than the original recipient. It is not intended for distribution to, or use by, any person or entity in any jurisdiction or country where such distribution or use is contrary to local law. Any unauthorized copying, disclosure or distribution of these materials is strictly prohibited. Notwithstanding the foregoing, each recipient may disclose to any and all persons, without limitation of any kind (i) the tax treatment and tax structure of the Fund and any of their transactions and (ii) all materials of any kind (including opinions or other tax analyses) that are provided to the recipient relating to such tax treatment and tax structure. Nothing in this presentation shall prohibit or limit the original recipient from voluntarily communicating with or providing information to any national, federal, state or local governmental agency or regulator regarding any potential violations of law or regulation, and the original recipient is not required to seek consent from or provide notice to the Firm in connection with any such communication with a national, federal, state or local governmental agency or regulator. Product and company names appearing herein may be trademarks of their respective owners. The companies named herein have not sponsored or endorsed any of these materials, the Fund or any future fund advised by the Firm, or any of their respective affiliates. This presentation is intended to describe, in a general manner, certain practices and organizational dynamics of the Firm. It is not intended to be complete and omits certain material information about the Fund, including important disclosures and risk factors associated with an investment therein. There is no guarantee that the Firm will operate the Fund or any other fund advised by the Firm in the manner or on the terms described herein. No representation or warranty is made, whether express or implied, by the Firm or any of its partners, employees, members, or agents as to the accuracy or completeness of the information provided herein. These materials do not confer any rights on the recipients thereof or impose any obligations on the Firm. You should not rely on the information contained herein in connection with any investment decision. The actual investment portfolio of the Fund or any successor fund may differ materially from the types of expected investments provided in this presentation. These materials have been prepared by the Firm based on information available to it, and frequently reflect unaudited and internally prepared estimates that are subject to change. Information throughout this presentation provided by sources other than the Firm has not been independently verified and the Firm does not assume responsibility for the accuracy of such information. Except where otherwise indicated herein, the information provided herein is based on matters as they exist as of the date of preparation and not as of any future date, and will not be updated or otherwise revised. Unless otherwise indicated, all figures are calculated in U.S. dollars. In furnishing these materials, the Firm does not undertake to update any of the information contained herein or to correct any inaccuracies or notify investors of a variance or breach of any of the policies described. The information contained herein is subject to change without notice. Certain information contained in this presentation constitutes "forward-looking statements," which can be identified by the use of forward-looking terminology such as "may," "will," "should," "would," "could," "expect," "anticipate," "target," "project," "estimate," "intend," "continue," or "believe," or the negatives thereof or other variations thereon or comparable terminology. Due to various risks and uncertainties, actual events or results or the actual performance of the Fund may differ materially from those reflected or contemplated in such forward-looking statements. None of the Fund, the Firm or any of their respective affiliates (or any of their respective directors, officers, employees, members, managers, partners, shareholders or agents) (i) assumes responsibility for the accuracy or completeness of these forward-looking statements or (ii) undertakes any obligation to update or revise any forward-looking statements for any reason after the date of this document to conform the statements to actual results or to changes in expectations. Forward-looking information contained in the materials, including all statements of opinion and/or belief, are based on a variety of estimates, assumptions, projections and predictions by the Firm. These estimates and assumptions are inherently uncertain and are subject to numerous business, industry, market, regulatory, competitive and financial risks that are outside of the Firm's control. There can be no assurance that the assumptions made will prove accurate. The targeted performance shown herein has been included for illustrative purposes only, and is not necessarily, and does not purport to be, indicative, or a guarantee, of future results. The preparation of such information is based on underlying assumptions and is subject to various risks and limitations that are not applicable to other performance presentations. For example, because the target performance is cumulative of the Fund, it reflects that the Fund may be managed through various economic cycles, and potentially various fee and expense structures. Therefore, it is not, nor is it intended to be representative of, the anticipated experience of a particular investor in the Fund. Any preparation of targeted performance involves subjective judgments. Although the Firm believes that the performance calculations described herein are based on reasonable assumptions, the use of different assumptions would produce different (and potentially lower) results, including if a different fee and expense structure were used. For the foregoing and other similar reasons, the comparability of this target performance to the future actual performance of the Fund or the performance of any future potential fund advised by the Firm is limited, and recipients of this document should not rely on any such information in making an investment decision. The Firm is not registered as an investment adviser with the U.S. Securities and Exchange Commission ("SEC"). This presentation is for use only in one-on-one selected investor presentations and is not, and is not intended to be, marketing material or advertising within the meaning of the Investment Advisers Act of 1940, the rules and guidance of the SEC or the Conduct Rules of the Financial Industry Regulatory Authority, and is for informational use only. The information in these materials has not been approved or verified by the SEC or by any state securities authority.

PAST PERFORMANCE IS NOT INDICATIVE OF, OR A GUARANTEE OF, FUTURE PERFORMANCE. AN INVESTMENT IN THE FUND INVOLVES SUBSTANTIAL RISKS. BEFORE MAKING A DECISION TO INVEST IN THE FUND, PROSPECTIVE INVESTORS SHOULD CAREFULLY REVIEW THE FUND'S DISCLOSURE SUPPLEMENT, INCLUDING THE DESCRIPTION OF THE RISKS, FEES, EXPENSES, LIQUIDITY RESTRICTIONS AND OTHER TERMS OF INVESTING IN THE FUND, AND THE FUND'S OTHER DEFINITIVE DOCUMENTATION.`;

function Slide02_Disclaimer() {
  return (
    <SlideFrame page={2} label="Disclaimer" bg={COLORS.snow}>
      {/* faint cloud bg */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "url('assets/cloud-bg-opt.jpg') center/cover no-repeat",
          opacity: 0.5,
        }}
      />
      <SlideTitle style={{ left: 168, top: 108 }}>
        General Disclaimers and Confidentiality
      </SlideTitle>
      <div
        style={{
          position: "absolute",
          left: 168,
          top: 216,
          width: 1584,
          height: 820,
          fontFamily: FONT.sans,
          fontSize: 14,
          lineHeight: "19px",
          color: COLORS.graphite,
          fontWeight: 400,
          whiteSpace: "pre-wrap",
        }}
      >
        {DISCLAIMER_TEXT}
      </div>
    </SlideFrame>
  );
}

// ============= SLIDE 3: Our Unique Advantages =============
function Slide03_Manifesto() {
  const photos = [
    {
      src: "assets/slide3-field-opt.jpg",
      alt: "On-site at a portfolio company",
    },
    { src: "assets/slide3-beaker-opt.jpg", alt: "Lab work — beaker" },
    { src: "assets/slide3-team-opt.jpg", alt: "Mars Materials team" },
  ];

  return (
    <SlideFrame page={3} label="Manifesto" dark={true} bg={COLORS.black}>
      {/* full-bleed dark contour */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "url('assets/contour-appalachia-opt.jpg') center/cover no-repeat",
          opacity: 0.55,
        }}
      />
      {/* small label top-right */}
      <div
        style={{
          position: "absolute",
          right: 96,
          top: 108,
          fontFamily: FONT.mono,
          fontSize: 22,
          letterSpacing: "-0.04em",
          color: "rgba(255,255,255,0.55)",
          textTransform: "uppercase",
        }}
      >
        Our Mission
      </div>

      {/* Big manifesto sentence — top right, leaves room for photos below */}
      <div
        style={{
          position: "absolute",
          right: 96,
          left: 96,
          top: 220,
          textAlign: "right",
          fontFamily: FONT.mono,
          fontSize: 50,
          fontWeight: 400,
          lineHeight: 1.35,
          letterSpacing: "-0.04em",
          color: COLORS.snow,
          textTransform: "uppercase",
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 40 }}>
          <Highlight>Less than 1%</Highlight> of academic breakthroughs make it
          out of the lab
          <sup
            style={{
              fontSize: "0.5em",
              marginLeft: 2,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            1
          </sup>
        </div>
        <div style={{ marginTop: 28, color: COLORS.snow }}>
          We've <Highlight>filtered out</Highlight> the science projects
          <br />
          and invested <Highlight>before the market</Highlight> saw potential
        </div>
      </div>

      {/* Footnote */}
      <div
        style={{
          position: "absolute",
          right: 96,
          bottom: 64,
          fontFamily: FONT.mono,
          fontSize: 13,
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,0.45)",
          textTransform: "none",
        }}
      >
        <sup style={{ fontSize: "0.85em", marginRight: 4 }}>1</sup>AUAUTM FY2022
        Licensing Activity Survey
      </div>

      {/* Photo strip — bottom, three cards with bracket corners */}
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          bottom: 120,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 28,
        }}
      >
        {photos.map((p) => (
          <PhotoCorners key={p.src} src={p.src} alt={p.alt} height={345} />
        ))}
      </div>
    </SlideFrame>
  );
}

// PhotoCorners — image card with bracket corners hugging the photo
function PhotoCorners({ src, alt, height = 280, color = COLORS.snow }) {
  const len = 22;
  const stroke = 2;
  const c = { position: "absolute", background: color };
  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div
        role="img"
        aria-label={alt}
        style={{
          position: "absolute",
          inset: 0,
          background: `url('${src}') center/cover no-repeat`,
        }}
      />

      {/* corner brackets — flush to the photo edges */}
      <div style={{ ...c, left: 0, top: 0, width: len, height: stroke }} />
      <div style={{ ...c, left: 0, top: 0, width: stroke, height: len }} />
      <div style={{ ...c, right: 0, top: 0, width: len, height: stroke }} />
      <div style={{ ...c, right: 0, top: 0, width: stroke, height: len }} />
      <div style={{ ...c, left: 0, bottom: 0, width: len, height: stroke }} />
      <div style={{ ...c, left: 0, bottom: 0, width: stroke, height: len }} />
      <div style={{ ...c, right: 0, bottom: 0, width: len, height: stroke }} />
      <div style={{ ...c, right: 0, bottom: 0, width: stroke, height: len }} />
    </div>
  );
}

// ============= SLIDE 4: Our Homegrown Advantages =============
// Where Fund I's dealflow came from, share of deals, from the appendix deck.
// Founder referrals plus direct applications are the 48% in box 2's title.
const DEALFLOW_SOURCES = [
  { label: "Investor referral", pct: 36 },
  { label: "Direct application", pct: 31, highlight: true },
  { label: "Founder referral", pct: 17, highlight: true },
  { label: "Incubator", pct: 12 },
  { label: "Market intelligence", pct: 2 },
];
const DEALFLOW_PULLED = "Q3 2026";

const ADVANTAGES = [
  {
    n: "1",
    title: "Partner incubator fostered\n$800M+ in value creation",
    img: "assets/result-1-incubator-opt.jpg",
    objectPosition: "center 18%",
  },
  {
    n: "2",
    title: "Brand value: 48% of new deals\ncome from founders or directs",
    chart: DEALFLOW_SOURCES,
  },
  {
    n: "3",
    title: "Direct political connections\nand real campaign experience",
    img: "assets/result-3-political-crop-opt.jpg",
    // Shifted up 20px from the centred 27% crop to keep more of the chin in frame.
    objectPosition: "center calc(27% - 20px)",
  },
  {
    n: "4",
    title:
      "Launched private professional networks\nin 3 major US metros, 30%/mo growth",
    img: "assets/result-4-talent-crop-opt.jpg",
    objectPosition: "center",
  },
  {
    n: "5",
    title: "10+ university partners, 4 cohorts\nand 16+ venture fellows",
    img: "assets/result-5-bench-opt.jpg",
    objectPosition: "center",
  },
  {
    n: "6",
    title: "Narrative support through\nglobal film and prize festivals",
    img: "assets/result-6-festival-award-opt.jpg",
    // A portrait photo: shown whole (hair to the cheque's amount) on black
    // pillars, since the landscape box cannot hold both his face and the
    // cheque in a cover crop. The pillars are drawn as a film strip (below),
    // in the photo's own backdrop blue.
    objectPosition: "center",
    fit: "contain",
  },
];

// Box 6's panel: the photo on two pillars, each carrying a column of sprocket
// holes so the pair reads as a film strip. The holes stand still and are spread
// evenly over the pillar's height, whatever height the grid gives it. Pure
// JSX, no image asset and no animation. The pillar colour is the photo's own
// stage backdrop (the mean of its top-left corner), the holes a lighter tint
// of it, so the strip reads as part of the picture rather than a frame on it.
const FILM_HOLE = 24; // px, each square hole
const FILM_HOLE_COUNT = 7;
const FILM_BAR = "#242f44";
const FILM_HOLE_COLOR = "#3d4e6b";

function FilmPillar() {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-evenly",
      }}
    >
      {Array.from({ length: FILM_HOLE_COUNT }, (_, i) => (
        <span
          key={i}
          style={{
            display: "block",
            width: FILM_HOLE,
            height: FILM_HOLE,
            borderRadius: 4,
            background: FILM_HOLE_COLOR,
          }}
        />
      ))}
    </div>
  );
}

function FilmStrip({ src, objectPosition }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "stretch",
        background: FILM_BAR,
      }}
    >
      <FilmPillar />
      <img
        src={src}
        alt=""
        style={{
          flex: "0 0 auto",
          height: "100%",
          width: "auto",
          maxWidth: "100%",
          objectFit: "contain",
          objectPosition,
          display: "block",
          filter: "grayscale(0.15)",
        }}
      />
      <FilmPillar />
    </div>
  );
}

// Box 2's panel: the dealflow chart drawn in the slide's own type, on an
// off-white card so it stands apart from the dark slide.
function DealflowChart({ rows, pulled }) {
  const max = Math.max(...rows.map((r) => r.pct));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: "22px 26px 18px",
        background: COLORS.snow,
        color: COLORS.ink,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT.mono,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: COLORS.graphite,
        }}
      >
        Where our dealflow comes from
      </div>
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "auto 1fr 48px",
          alignItems: "center",
          columnGap: 18,
          marginTop: 10,
        }}
      >
        {rows.map((r) => {
          const color = r.highlight ? COLORS.orange : COLORS.ink;
          return (
            <React.Fragment key={r.label}>
              <span style={{ fontSize: 16, color }}>{r.label}</span>
              <span
                style={{
                  display: "block",
                  height: 12,
                  background: COLORS.fog,
                }}
              >
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${(r.pct / max) * 100}%`,
                    background: r.highlight ? COLORS.orange : COLORS.graphite,
                  }}
                />
              </span>
              <span style={{ fontSize: 16, color, textAlign: "right" }}>
                {r.pct}%
              </span>
            </React.Fragment>
          );
        })}
      </div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: COLORS.stone,
          textAlign: "right",
        }}
      >
        Last pulled: {pulled}
      </div>
    </div>
  );
}

function Slide04_HomegrownAdvantages() {
  return (
    <SlideFrame
      page={4}
      label="Homegrown Advantages"
      dark={true}
      bg={COLORS.black}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "url('assets/contour-appalachia-opt.jpg') center/cover no-repeat",
          opacity: 0.45,
        }}
      />
      <SlideTitle style={{ color: COLORS.snow }}>
        Our Unique Advantages
      </SlideTitle>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 200,
          bottom: 46,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "24px 24px",
        }}
      >
        {ADVANTAGES.map((a) => (
          <div
            key={a.n}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              color: COLORS.snow,
              height: "100%",
              minHeight: 0,
            }}
          >
            <div
              style={{
                border: `1px solid ${COLORS.mist}`,
                padding: "14px 24px",
                display: "grid",
                gridTemplateColumns: "48px 1fr",
                alignItems: "center",
                gap: 16,
                // Fixed to fit the two title lines every box has, so the
                // image boxes in a row line up and get the rest of the row.
                height: 82,
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 42,
                  lineHeight: 1,
                  fontWeight: 400,
                  color: COLORS.snow,
                }}
              >
                {a.n}
              </span>
              <span
                style={{
                  fontFamily: FONT.mono,
                  // 20px at -0.04em so the longest title line (box 4's
                  // "Launched private professional networks", 38 characters)
                  // holds on one line in the 449px the title column has.
                  fontSize: 20,
                  lineHeight: 1.1,
                  letterSpacing: "-0.04em",
                  color: COLORS.snow,
                  whiteSpace: "pre-line",
                  textTransform: "uppercase",
                  borderLeft: `1px solid ${COLORS.mist}`,
                  paddingLeft: 14,
                }}
              >
                {a.title}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                border: `1px solid ${COLORS.mist}`,
              }}
            >
              {a.chart ? (
                <DealflowChart rows={a.chart} pulled={DEALFLOW_PULLED} />
              ) : a.fit === "contain" ? (
                <FilmStrip src={a.img} objectPosition={a.objectPosition} />
              ) : (
                <img
                  src={a.img}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: a.objectPosition,
                    display: "block",
                    filter: "grayscale(0.15)",
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

window.Slide01_Cover = Slide01_Cover;
window.Slide02_Disclaimer = Slide02_Disclaimer;
window.Slide03_Manifesto = Slide03_Manifesto;
window.Slide04_HomegrownAdvantages = Slide04_HomegrownAdvantages;
