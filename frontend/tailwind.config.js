/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#EFF8FF',
                    100: '#DCEEFF',
                    500: '#4EA8FF',
                    600: '#096FAD',
                    700: '#075A8D',
                    900: '#061524',
                },
                dark: {
                    800: '#061524',
                    900: '#0B0F19',
                    950: '#060A13',
                },
                nexus: {
                    midnight: '#0B0F19',
                    navy: '#061524',
                    cyan: '#00E0FF',
                    blue: '#4EA8FF',
                    lavender: '#8F9BFF',
                    violet: '#6E55C6',
                    silver: '#B9C5CE',
                },
            },
            fontFamily: {
                sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
