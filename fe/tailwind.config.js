/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./src/app/**/*.{js,ts,jsx,tsx}",
		"./src/components/**/*.{js,ts,jsx,tsx}",
		"./src/**/*.{js,ts,jsx,tsx}", // 추가: alias(@/) 대응용
		"./node_modules/@h001/ui/dist/**/*.{js,ts,jsx,tsx,mjs}"
	],
	theme: {
		extend: {},
	},
	plugins: [],
};
