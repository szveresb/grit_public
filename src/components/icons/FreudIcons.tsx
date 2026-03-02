import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

const defaults: React.SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const icon = (paths: React.ReactNode, displayName: string) => {
  const Icon = ({ className, ...props }: IconProps) => (
    <svg className={className} {...defaults} {...props}>{paths}</svg>
  );
  Icon.displayName = displayName;
  return Icon;
};

// ─── Navigation ──────────────────────────────────────

/** Home – rounded house with organic roof curve */
export const FHome = icon(
  <>
    <path d="M4 11.5c0-.5.2-1 .6-1.3L12 4l7.4 6.2c.4.3.6.8.6 1.3V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7.5z" />
    <path d="M9.5 21v-5a2.5 2.5 0 0 1 5 0v5" />
  </>,
  'FHome'
);

/** Dashboard – four rounded tiles */
export const FDashboard = icon(
  <>
    <rect x="3" y="3" width="7" height="7" rx="2.5" />
    <rect x="14" y="3" width="7" height="7" rx="2.5" />
    <rect x="3" y="14" width="7" height="7" rx="2.5" />
    <rect x="14" y="14" width="7" height="7" rx="2.5" />
  </>,
  'FDashboard'
);

/** Check-in / heart pulse – heart with a gentle pulse line */
export const FHeartPulse = icon(
  <>
    <path d="M12 20S4 14 4 9a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 9c0 5-8 11-8 11z" />
    <path d="M8 12h2l1-2 2 4 1-2h2" />
  </>,
  'FHeartPulse'
);

/** History / clock – round soft clock */
export const FClock = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6v6l3.5 3.5" />
  </>,
  'FClock'
);

/** Download – rounded tray with arrow */
export const FDownload = icon(
  <>
    <path d="M12 3v12" />
    <path d="M8 11l4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </>,
  'FDownload'
);

/** User / profile – soft head and shoulders */
export const FUser = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
  'FUser'
);

/** Library / book – open book with soft curves */
export const FLibrary = icon(
  <>
    <path d="M4 4c3-1 5 0 8 2 3-2 5-3 8-2v14c-3-1-5 0-8 2-3-2-5-3-8-2V4z" />
    <path d="M12 6v14" />
  </>,
  'FLibrary'
);

/** File / document */
export const FFileText = icon(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6" />
    <path d="M9 17h4" />
  </>,
  'FFileText'
);

/** Info – rounded circle with i */
export const FInfo = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4" />
    <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
  </>,
  'FInfo'
);

/** Lock – rounded padlock */
export const FLock = icon(
  <>
    <rect x="5" y="11" width="14" height="10" rx="3" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
  </>,
  'FLock'
);

/** Users / group – two overlapping soft heads */
export const FUsers = icon(
  <>
    <circle cx="9" cy="7" r="3.5" />
    <path d="M2 20a7 7 0 0 1 14 0" />
    <circle cx="17" cy="7" r="2.5" />
    <path d="M22 20a5.5 5.5 0 0 0-7-5.2" />
  </>,
  'FUsers'
);

/** Analytics / bar chart – rounded bars */
export const FBarChart = icon(
  <>
    <rect x="4" y="13" width="4" height="8" rx="1.5" />
    <rect x="10" y="7" width="4" height="14" rx="1.5" />
    <rect x="16" y="3" width="4" height="18" rx="1.5" />
  </>,
  'FBarChart'
);

// ─── Actions ─────────────────────────────────────────

/** Edit / pencil – soft pencil */
export const FPencil = icon(
  <>
    <path d="M17 3a2.83 2.83 0 0 1 4 4L8 20l-5 1 1-5L17 3z" />
  </>,
  'FPencil'
);

/** Pencil with page – for guest_editor */
export const FFileEdit = icon(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
    <path d="M14 3v5h5" />
    <path d="M17.5 11.5a2.12 2.12 0 0 1 3 3L15 20l-3.5.5.5-3.5 5.5-5.5z" />
  </>,
  'FFileEdit'
);

/** Trash / delete – rounded bin */
export const FTrash = icon(
  <>
    <path d="M4 7h16" />
    <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </>,
  'FTrash'
);

/** Save – rounded disk */
export const FSave = icon(
  <>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M7 3v5h8V3" />
    <circle cx="12" cy="14.5" r="2.5" />
  </>,
  'FSave'
);

/** Close / X – soft cross */
export const FClose = icon(
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </>,
  'FClose'
);

/** Menu / hamburger – three rounded lines */
export const FMenu = icon(
  <>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </>,
  'FMenu'
);

/** Chevron Down */
export const FChevronDown = icon(
  <path d="M6 9l6 6 6-6" />,
  'FChevronDown'
);

/** Chevron Up */
export const FChevronUp = icon(
  <path d="M6 15l6-6 6 6" />,
  'FChevronUp'
);

/** Arrow Left */
export const FArrowLeft = icon(
  <>
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </>,
  'FArrowLeft'
);

/** Check / tick */
export const FCheck = icon(
  <path d="M5 12l5 5L20 7" />,
  'FCheck'
);

// ─── Mental Health Metaphors ─────────────────────────

/** Sparkles / AI reflection – soft star burst */
export const FSparkles = icon(
  <>
    <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
    <path d="M17 14l.75 2.25L20 17l-2.25.75L17 20l-.75-2.25L14 17l2.25-.75L17 14z" />
    <circle cx="6" cy="17" r="1.5" />
  </>,
  'FSparkles'
);

/** Heart – simple rounded heart */
export const FHeart = icon(
  <path d="M12 20S4 14 4 9a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 9c0 5-8 11-8 11z" />,
  'FHeart'
);

/** Eye / observer – soft eye shape */
export const FEye = icon(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
  'FEye'
);

/** Shield – rounded shield */
export const FShield = icon(
  <path d="M12 2l8 4v5c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z" />,
  'FShield'
);

/** MessageCircle – speech bubble */
export const FMessageCircle = icon(
  <path d="M21 12a9 9 0 0 1-13.46 7.83L3 21l1.17-4.54A9 9 0 1 1 21 12z" />,
  'FMessageCircle'
);

/** Zap / energy – soft lightning */
export const FZap = icon(
  <path d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" />,
  'FZap'
);

/** Loader – for spinner (use with animate-spin) */
export const FLoader = icon(
  <>
    <path d="M12 2v4" />
    <path d="M12 18v4" opacity="0.3" />
    <path d="M4.93 4.93l2.83 2.83" opacity="0.9" />
    <path d="M16.24 16.24l2.83 2.83" opacity="0.2" />
    <path d="M2 12h4" opacity="0.7" />
    <path d="M18 12h4" opacity="0.3" />
    <path d="M4.93 19.07l2.83-2.83" opacity="0.5" />
    <path d="M16.24 7.76l2.83-2.83" opacity="0.4" />
  </>,
  'FLoader'
);

// ─── QuickPulse mood icons ───────────────────────────

/** Mood 1: Struggling – wilting/drooping form */
export const FMoodStruggling = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 15.5c1-1.5 2.5-2 4-2s3 .5 4 2" />
    <circle cx="9" cy="9.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9.5" r="1" fill="currentColor" stroke="none" />
    <path d="M9 8c.5-.8 1-1 1.5-.8" />
    <path d="M15 8c-.5-.8-1-1-1.5-.8" />
  </>,
  'FMoodStruggling'
);

/** Mood 2: Uneasy – uncertain face */
export const FMoodUneasy = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14.5c1.5 1 3 1 4 .5s2.5-1 3.5-.5" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
  </>,
  'FMoodUneasy'
);

/** Mood 3: Okay – calm neutral face */
export const FMoodOkay = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14h8" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
  </>,
  'FMoodOkay'
);

/** Mood 4: Good – gentle smile */
export const FMoodGood = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14c1 1.5 2.5 2 4 2s3-.5 4-2" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
  </>,
  'FMoodGood'
);

/** Mood 5: Strong – beaming face */
export const FMoodStrong = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M7 13c1.2 2.5 3 3.5 5 3.5s3.8-1 5-3.5" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
  </>,
  'FMoodStrong'
);

// ─── Additional icons ────────────────────────────────

/** Search – magnifying glass */
export const FSearch = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </>,
  'FSearch'
);

/** Plus – rounded plus */
export const FPlus = icon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
  'FPlus'
);

/** Log Out – door with arrow */
export const FLogOut = icon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </>,
  'FLogOut'
);

/** Arrow Right */
export const FArrowRight = icon(
  <>
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </>,
  'FArrowRight'
);

/** Chevron Left */
export const FChevronLeft = icon(
  <path d="M15 18l-6-6 6-6" />,
  'FChevronLeft'
);

/** Chevron Right */
export const FChevronRight = icon(
  <path d="M9 6l6 6-6 6" />,
  'FChevronRight'
);

/** Clipboard Check – completed task */
export const FClipboardCheck = icon(
  <>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1.5" />
    <path d="M9 14l2 2 4-4" />
  </>,
  'FClipboardCheck'
);

/** Book Open – open journal */
export const FBookOpen = icon(
  <>
    <path d="M2 5c2-1.5 4-2 6-2s4 .5 4 2v14c-2-1-4-1.5-4-1.5S4 18 2 19V5z" />
    <path d="M12 5c2-1.5 4-2 6-2s4 .5 4 2v14c-2-1-4-1.5-4-1.5s-4-.5-6 1.5V5z" />
  </>,
  'FBookOpen'
);

/** TrendingUp – rising trend line */
export const FTrendingUp = icon(
  <>
    <path d="M22 7l-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </>,
  'FTrendingUp'
);

/** Shield Alert – shield with exclamation */
export const FShieldAlert = icon(
  <>
    <path d="M12 2l8 4v5c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z" />
    <path d="M12 8v4" />
    <circle cx="12" cy="15" r="0.5" fill="currentColor" stroke="none" />
  </>,
  'FShieldAlert'
);
