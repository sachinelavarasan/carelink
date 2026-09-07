const carelinkPreset = require('@carelink/theme/preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), carelinkPreset],
  darkMode: 'class',
};
