import type { Config } from "tailwindcss";
import { theme } from "./src/theme";

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: theme,
    },
    plugins: [],
} satisfies Config;
