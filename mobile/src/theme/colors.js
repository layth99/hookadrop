// ─────────────────────────────────────────────────────────────────────────────
//  HookaDrop Premium Design Tokens
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // ── Deep dark backgrounds ──────────────────────────────────────────────────
  bg:           '#080808',   // near-true black — main screen bg
  bgCard:       '#101010',   // card surfaces
  bgCardLight:  '#161616',   // elevated card / input fill
  bgSurface:    '#131313',   // subtle elevation
  bgModal:      '#0C0C0C',   // modal/sheet backgrounds
  bgOverlay:    '#1A1A1A',   // hover / pressed state

  // ── Gold palette ─────────────────────────────────────────────────────────
  gold:         '#FFD000',   // primary gold — CTAs, active states
  goldWarm:     '#C9A227',   // warm secondary gold — accents, borders
  goldLight:    '#FFE066',   // light highlight
  goldDim:      '#997B1A',   // muted gold — subtle details
  goldBg:       '#1A1500',   // very dark gold tint — active bg fills

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary:  '#FFFFFF',
  textSecondary:'#A0A0A0',
  textMuted:    '#555555',
  textGold:     '#FFD000',

  // ── Borders / dividers ────────────────────────────────────────────────────
  border:       '#222222',
  borderSubtle: '#1A1A1A',
  borderGold:   '#FFD00030',   // 18 % alpha gold
  borderGoldMd: '#FFD00055',   // 33 % — focus ring
  borderActive: '#FFD000',

  // ── Status ────────────────────────────────────────────────────────────────
  success:  '#22C55E',
  error:    '#EF4444',
  warning:  '#F59E0B',
  info:     '#3B82F6',

  // ── Legacy / main-app compat ─────────────────────────────────────────────
  orange:       '#FFA500',
  orangeDark:   '#CC7A00',
  neonBlue:     '#00D9FF',
  neonBlueDark: '#0099CC',
  cyan:         '#00BFFF',
  borderBlue:   '#00D9FF25',

  // ── Misc ─────────────────────────────────────────────────────────────────
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  overlay:     'rgba(0,0,0,0.72)',
};

export const gradients = {
  // Auth / premium
  goldBtn:    ['#FFD000', '#C9A227'],
  goldBtnPrs: ['#C9A227', '#997B1A'],
  bgSplash:   ['#080808', '#110D00', '#080808'],
  bgAuth:     ['#0C0C0C', '#0E0C00', '#0C0C0C'],
  cardAuth:   ['#131300', '#0F0F0F'],

  // Main app (kept for non-auth screens)
  gold:     ['#FFD700', '#FFA500'],
  goldDark: ['#CC9900', '#996600'],
  blue:     ['#00D9FF', '#0099CC'],
  dark:     ['#1A1A1A', '#0A0A0A'],
  darkCard: ['#1E1E1E', '#111111'],
  hero:     ['#0A0A0A', '#1A1200', '#0A0A0A'],
  neon:     ['#FFD700', '#00D9FF'],
};

export const shadows = {
  goldGlow: {
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 14,
  },
  goldSubtle: {
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  goldBtn: {
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  // Legacy
  gold: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  goldSm: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  blue: {
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
};
