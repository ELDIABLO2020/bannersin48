import type { Config } from "tailwindcss";
import { tailwindPreset } from "@bannersin48/design-tokens/tailwind-preset";

const config: Config = {
  presets: [tailwindPreset as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
