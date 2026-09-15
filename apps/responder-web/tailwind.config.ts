import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["IBM Plex Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        canvas: "#F5F6F8",
        surface: "#FFFFFF",
        line: "#E1E4EA",
        ink: {
          900: "#12161F",
          700: "#3A4152",
          500: "#5B6472",
          300: "#8A93A3",
        },
        action: {
          DEFAULT: "#1D4ED8",
          hover: "#1841B8",
          soft: "#EFF4FF",
        },
        danger: {
          DEFAULT: "#DC2626",
          hover: "#B91C1C",
          soft: "#FEE2E2",
        },
        success: {
          DEFAULT: "#16A34A",
          hover: "#0F7A38",
          soft: "#DCFCE7",
        },
        // Priority palette per spec: critical=red, high=orange, medium=yellow, low=green
        priority: {
          critical: "#DC2626",
          criticalBg: "#FEE2E2",
          high: "#EA580C",
          highBg: "#FFEDD5",
          medium: "#CA8A04",
          mediumBg: "#FEF9C3",
          low: "#16A34A",
          lowBg: "#DCFCE7",
          pending: "#64748B",
          pendingBg: "#F1F5F9",
        },
        status: {
          new: "#1D4ED8",
          newBg: "#EFF4FF",
          acknowledged: "#6D28D9",
          acknowledgedBg: "#F4EEFD",
          inProgress: "#EA580C",
          inProgressBg: "#FFEDD5",
          resolved: "#0F7A47",
          resolvedBg: "#E9F7EF",
          closed: "#5B6472",
          closedBg: "#F1F2F4",
        },
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgba(18, 22, 31, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
