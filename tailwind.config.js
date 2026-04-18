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
                slate: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                    950: '#f5f7fa',
                },
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
                },
                sher: {
                    gold: '#C9A236',
                    'gold-light': '#E2C372',
                    'gold-dark': '#8B6914',
                    red: '#E31B24',
                    'red-dark': '#B01218',
                    teal: '#1D4E5F',
                    'teal-dark': '#0D2E38',
                    green: '#3BAA6E',
                    'green-dark': '#267A4F',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
