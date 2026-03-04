/** Gardenus Design Tokens */

export const color = {
  /** 메인 포인트 팔레트 (black & white) */
  mint50: "#f7f7f7",
  mint100: "#eeeeee",
  mint200: "#e2e2e2",
  mint300: "#d0d0d0",
  mint400: "#b8b8b8",
  mint500: "#1f1f1f",
  mint600: "#171717",
  mint700: "#111111",
  mint800: "#0a0a0a",
  mint900: "#000000",

  /** 그레이 팔레트 */
  gray50: "#fafafa",
  gray100: "#f5f5f5",
  gray200: "#eeeeee",
  gray300: "#e0e0e0",
  gray400: "#bdbdbd",
  gray500: "#9e9e9e",
  gray600: "#757575",
  gray700: "#616161",
  gray800: "#424242",
  gray900: "#212121",

  white: "#ffffff",
  black: "#000000",
  backdrop: "rgba(0, 0, 0, 0.45)",
  danger: "#2f2f2f",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  xxl: "28px",
  full: "9999px",
} as const;

export const shadow = {
  card: "0 2px 12px rgba(0,0,0,0.08)",
  modal: "0 8px 32px rgba(0,0,0,0.18)",
  button: "0 2px 8px rgba(0,0,0,0.22)",
} as const;

export const typo = {
  fontFamily: "'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif",
  heading: {
    fontSize: "20px",
    fontWeight: 700,
    lineHeight: "28px",
  },
  subheading: {
    fontSize: "16px",
    fontWeight: 600,
    lineHeight: "24px",
  },
  body: {
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "22px",
  },
  caption: {
    fontSize: "12px",
    fontWeight: 400,
    lineHeight: "18px",
  },
  button: {
    fontSize: "16px",
    fontWeight: 600,
    lineHeight: "24px",
  },
} as const;
