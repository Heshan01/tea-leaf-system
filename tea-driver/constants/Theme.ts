export const COLORS = {
  primary: "#22C55E", // Vibrant Green (Tea Leaf)
  primaryDark: "#15803D", // Darker Green for text/heavy elements
  primarySoft: "#DCFCE7", // Light Green background
  background: "#F3F4F6", // Light Gray app background
  card: "#FFFFFF",
  text: "#0F172A", // Slate 900
  textLight: "#64748B", // Slate 500
  border: "#E2E8F0", // Slate 200
  error: "#EF4444", // Red 500
  errorBg: "#FEE2E2", // Red 100
  warning: "#F59E0B", // Amber 500
  warningBg: "#FEF3C7", // Amber 100
  success: "#10B981", // Emerald 500
  white: "#FFFFFF",
  black: "#000000",
};

export const SHADOWS = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const SIZES = {
  radius: 16,
  padding: 16,
  h1: 24,
  h2: 20,
  h3: 18,
  body: 16,
  small: 14,
};

export default {
  COLORS,
  SHADOWS,
  SIZES,
};
