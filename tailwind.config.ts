import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // incident.io-inspired color palette
        background: {
          DEFAULT: "#FFFFFF",
          secondary: "#F9FAFB",
        },
        text: {
          primary: "#111827",
          secondary: "#6B7280",
        },
        border: {
          DEFAULT: "#E5E7EB",
        },
        status: {
          critical: "#EF4444",
          active: "#EF4444",
          warning: "#F59E0B",
          investigating: "#F59E0B",
          info: "#3B82F6",
          mitigated: "#3B82F6",
          success: "#10B981",
          resolved: "#10B981",
          closed: "#6B7280",
        },
        accent: {
          purple: "#8B5CF6",
        },
      },
      maxWidth: {
        'content': '1200px',
      },
      width: {
        'sidebar': '320px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
