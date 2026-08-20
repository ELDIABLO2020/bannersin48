type StepIllustrationKind = "size" | "upload" | "proof" | "delivery";

interface StepIllustrationProps {
  kind: StepIllustrationKind;
}

const ink = "var(--color-bg-darkest)";
const accent = "var(--color-bg-strong-accent)";
const tint = "var(--color-bg-accent-tint)";
const soft = "var(--color-bg-soft-accent)";
const surface = "var(--color-bg-surface)";

const commonProps = {
  viewBox: "0 0 220 150",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
  focusable: false,
} as const;

function SizeIllustration() {
  return (
    <svg {...commonProps}>
      <path d="M33 119h154" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".12" />
      <rect x="55" y="41" width="102" height="67" rx="7" fill={surface} stroke={ink} strokeWidth="4" />
      <path d="M65 51h82v47H65z" fill={tint} />
      <path d="M58 38c8-11 21-17 34-17h61a13 13 0 0 1 13 13v62" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <path d="M55 41c0-8 7-15 15-15h10v15H55Z" fill={accent} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <rect x="29" y="103" width="158" height="24" rx="12" fill={accent} stroke={ink} strokeWidth="4" />
      <path d="M45 104v10M58 104v6M71 104v10M84 104v6M97 104v10M110 104v6M123 104v10M136 104v6M149 104v10M162 104v6" stroke={ink} strokeWidth="3" />
      <path d="m87 68 10-8 11 7 12-10 16 17v15H76V79l11-11Z" fill={accent} opacity=".9" />
      <circle cx="84" cy="61" r="6" fill={surface} stroke={ink} strokeWidth="3" />
      <rect x="160" y="57" width="30" height="22" rx="5" fill={soft} stroke={ink} strokeWidth="4" />
      <path d="M167 64h16M167 71h10" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function UploadIllustration() {
  return (
    <svg {...commonProps}>
      <path d="M35 121h150" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".12" />
      <path d="M75 27h50l27 27v63a10 10 0 0 1-10 10H75a10 10 0 0 1-10-10V37a10 10 0 0 1 10-10Z" fill={surface} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M125 27v27h27" fill={soft} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <rect x="78" y="73" width="61" height="38" rx="5" fill={tint} />
      <path d="m86 101 13-14 10 9 9-11 13 16" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="91" cy="82" r="5" fill={accent} />
      <path d="M36 63c0-10 8-18 18-18 3 0 6 1 9 2 4-9 13-15 24-15 14 0 25 11 26 24 9 1 16 8 16 17H36c-8 0-14-6-14-14 0-7 6-13 14-14" fill={tint} stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M75 76v-25m0 0L65 61m10-10 10 10" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="169" cy="93" r="23" fill={accent} stroke={ink} strokeWidth="4" />
      <path d="M169 105V82m0 0-9 9m9-9 9 9" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProofIllustration() {
  return (
    <svg {...commonProps}>
      <path d="M36 124h151" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".12" />
      <rect x="48" y="21" width="105" height="111" rx="9" fill={surface} stroke={ink} strokeWidth="4" />
      <path d="M73 21v-8h55v8" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <rect x="67" y="38" width="67" height="44" rx="5" fill={tint} />
      <path d="m75 73 14-15 12 11 11-13 14 17" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="80" cy="49" r="5" fill={accent} />
      <path d="M67 96h48M67 108h35" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".55" />
      <circle cx="159" cy="102" r="28" fill={accent} stroke={ink} strokeWidth="4" />
      <path d="m146 102 9 9 18-21" stroke={ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m139 75 6 24 7-8 10 10 6-6-10-10 9-6-28-4Z" fill={surface} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M31 44h15M38 36v16" stroke={accent} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function DeliveryIllustration() {
  return (
    <svg {...commonProps}>
      <path d="M25 123h170" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".12" />
      <circle cx="163" cy="43" r="27" fill={tint} stroke={ink} strokeWidth="4" />
      <path d="M163 28v16l10 7" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M137 43h-13M202 43h-12M163 4v10" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <path d="M39 60h88v52H39z" fill={surface} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M127 76h30l22 23v13h-52V76Z" fill={accent} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M145 84h10l12 13h-22V84Z" fill={tint} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M48 69h70v34H48z" fill={tint} />
      <path d="M57 77h35M57 87h24" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <path d="M27 75h20M20 88h27M30 101h17" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <circle cx="66" cy="115" r="13" fill={ink} />
      <circle cx="66" cy="115" r="5" fill={surface} />
      <circle cx="151" cy="115" r="13" fill={ink} />
      <circle cx="151" cy="115" r="5" fill={surface} />
      <path d="M179 112h7" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function StepIllustration({ kind }: StepIllustrationProps) {
  return (
    <div className="mx-auto w-full max-w-[220px] shrink-0 md:mx-0" aria-hidden>
      {kind === "size" && <SizeIllustration />}
      {kind === "upload" && <UploadIllustration />}
      {kind === "proof" && <ProofIllustration />}
      {kind === "delivery" && <DeliveryIllustration />}
    </div>
  );
}
