/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hydra: {
          bg: '#020816',
          panel: '#040d1a',
          border: '#0d2137',
          cyan: '#00f5ff',
          blue: '#0066ff',
          green: '#00ff88',
          red: '#ff2d55',
          yellow: '#ffcc00',
          orange: '#ff6b35',
          purple: '#8b5cf6',
          muted: '#1a2d45',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 2s linear infinite',
        'flicker': 'flicker 4s linear infinite',
        'data-stream': 'dataStream 1s linear infinite',
      },
      keyframes: {
        glow: {
          'from': { boxShadow: '0 0 10px #00f5ff, 0 0 20px #00f5ff40' },
          'to': { boxShadow: '0 0 20px #00f5ff, 0 0 40px #00f5ff60, 0 0 80px #00f5ff20' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 95%, 100%': { opacity: '1' },
          '96%': { opacity: '0.8' },
          '97%': { opacity: '1' },
          '98%': { opacity: '0.7' },
          '99%': { opacity: '1' },
        },
        dataStream: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)`,
        'radial-glow': 'radial-gradient(ellipse at center, #001233 0%, #020816 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'neon-cyan': '0 0 20px #00f5ff40, 0 0 40px #00f5ff20',
        'neon-green': '0 0 20px #00ff8840, 0 0 40px #00ff8820',
        'neon-red': '0 0 20px #ff2d5540, 0 0 40px #ff2d5520',
        'neon-blue': '0 0 20px #0066ff40, 0 0 40px #0066ff20',
        'panel': '0 0 0 1px #0d2137, 0 4px 32px #00000080',
      },
    },
  },
  plugins: [],
};
