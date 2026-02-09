/** Gardenus Design Tokens */

export const color = {
  /** 메인 민트/그린 팔레트 */
  mint50: "#e6f9f1",
  mint100: "#b3f0d6",
  mint200: "#80e6bb",
  mint300: "#4ddda0",
  mint400: "#26d68b",
  mint500: "#00cc76",
  mint600: "#00b368",
  mint700: "#009957",
  mint800: "#008048",
  mint900: "#005a32",

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
  danger: "#e53935",
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
  button: "0 2px 8px rgba(0,204,118,0.25)",
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
