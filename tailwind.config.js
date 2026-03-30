/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/react-tailwindcss-datepicker/dist/**/*.{js,ts}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                gym: {
                    dark: '#1a1a2e',
                    darker: '#16213e',
                    accent: '#e94560',
                    light: '#0f3460',
                }
            },
            sher: {
                gold: '#C9A236',
                'gold-light': '#E2C372',
                'gold-dark': '#8B6914',
                red: '#E31B24',
                teal: '#1D4E5F',
                'teal-dark': '#0D2E38',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
