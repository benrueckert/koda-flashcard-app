/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Professional Brand Colors - Sophisticated Learning Platform
        'koda': {
          'primary': '#588157',      // Main accent - keep existing
          'primary-light': '#6B9B6A', // Refined, less saturated
          'primary-dark': '#3E5A3D',  // Deeper, more authoritative
        },
        
        // Professional Neutral System
        'background': '#FAFBFC',     // Pure, clean white-gray
        'surface': '#FFFFFF',        // Crisp white for cards
        'surface-elevated': '#F8F9FA', // Subtle elevation
        'border': '#E5E8EB',         // Sophisticated gray borders
        'border-light': '#F1F3F5',   // Lighter borders
        
        // Professional Text Hierarchy
        'text': {
          'primary': '#1A202C',      // Rich, readable dark
          'secondary': '#4A5568',    // Professional gray
          'muted': '#718096',        // Subtle content
          'disabled': '#A0AEC0',     // Disabled states
        },
        
        // Sophisticated Semantic Colors
        'success': '#588157',        // Reuse primary for consistency
        'success-light': '#F0F9F0',  // Light success background
        'warning': '#D69E2E',        // Professional amber
        'warning-light': '#FFFBF0',  // Light warning background
        'error': '#E53E3E',          // Clear but not harsh
        'error-light': '#FDF2F2',    // Light error background
        'info': '#3182CE',           // Trustworthy blue
        'info-light': '#EBF8FF',     // Light info background
        
        // Extended palette for flexibility (keeping minimal set)
        'gray': {
          50: '#F7FAFC',
          100: '#EDF2F7',
          200: '#E2E8F0',
          300: '#CBD5E0',
          400: '#A0AEC0',
          500: '#718096',
          600: '#4A5568',
          700: '#2D3748',
          800: '#1A202C',
          900: '#171923',
        },
        
        // Deprecated colors (keep for backward compatibility during transition)
        'primary': '#588157',
        'neutral': {
          50: '#F7FAFC',
          100: '#EDF2F7',
          200: '#E2E8F0',
          300: '#CBD5E0',
          400: '#A0AEC0',
          500: '#718096',
          600: '#4A5568',
          700: '#2D3748',
          800: '#1A202C',
          900: '#171923',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px - small text
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px - captions, metadata
        'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px - body text
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px - important text
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px - small headings
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px - card titles (H3)
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px - section headers (H2)
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px - page titles (H1)
        '5xl': ['3rem', { lineHeight: '1' }],           // 48px - display text
        '6xl': ['3.75rem', { lineHeight: '1' }],        // 60px - hero text
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        // Golden ratio-based spacing system
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '24': '6rem',     // 96px
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-right': 'slideRight 1.5s ease-in-out infinite',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        bounceGentle: {
          '0%, 20%, 53%, 80%': { transform: 'translate3d(0,0,0)' },
          '40%, 43%': { transform: 'translate3d(0,-15px,0)' },
          '70%': { transform: 'translate3d(0,-7px,0)' },
          '90%': { transform: 'translate3d(0,-2px,0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        glow: {
          '0%': { 
            boxShadow: '0 0 5px rgba(88, 129, 87, 0.2), 0 0 10px rgba(88, 129, 87, 0.1), 0 0 15px rgba(88, 129, 87, 0.1)',
          },
          '100%': { 
            boxShadow: '0 0 10px rgba(88, 129, 87, 0.4), 0 0 20px rgba(88, 129, 87, 0.2), 0 0 30px rgba(88, 129, 87, 0.1)',
          },
        },
      },
      boxShadow: {
        // Sophisticated 3-layer shadow system
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'strong': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'button': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'button-hover': '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        'focus': '0 0 0 3px rgba(88, 129, 87, 0.1)',
        'inner': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // Add touch-specific breakpoints
        'touch': {'raw': '(hover: none) and (pointer: coarse)'},
        'no-touch': {'raw': '(hover: hover) and (pointer: fine)'},
      },
    },
  },
  plugins: [],
};