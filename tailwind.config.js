/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-delay': 'float 7s ease-in-out 2s infinite',
        'slide-up': 'slideUp 0.8s ease-out',
        'slide-up-delay': 'slideUp 0.8s ease-out 0.2s both',
        'slide-up-delay-2': 'slideUp 0.8s ease-out 0.4s both',
        'fade-in': 'fadeIn 1s ease-out',
        'fade-in-delay': 'fadeIn 1s ease-out 0.3s both',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'bus-drive': 'busDrive 12s linear infinite',
        'bus-drive-reverse': 'busDriveReverse 15s linear infinite',
        'road-scroll': 'roadScroll 3s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'particle-rise': 'particleRise 4s ease-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'slide-in-left': 'slideInLeft 0.8s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-right': 'slideInRight 0.8s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'morph-blob': 'morphBlob 8s ease-in-out infinite',
        'morph-blob-2': 'morphBlob2 10s ease-in-out infinite',
        'glow-ring': 'glowRing 3s ease-in-out infinite',
        'orbit': 'orbit 20s linear infinite',
        'orbit-reverse': 'orbitReverse 25s linear infinite',
        'tilt-in': 'tiltIn 1s cubic-bezier(0.16,1,0.3,1) both',
        'stagger-1': 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both',
        'stagger-2': 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both',
        'stagger-3': 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both',
        'stagger-4': 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.4s both',
        'stagger-5': 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.5s both',
        'stagger-6': 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.6s both',
        'float-3d': 'float3D 6s ease-in-out infinite',
        'rotate-y': 'rotateY360 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
        },
        busDrive: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(calc(100vw + 100%))' },
        },
        busDriveReverse: {
          '0%': { transform: 'translateX(calc(100vw + 100%)) scaleX(-1)' },
          '100%': { transform: 'translateX(-100%) scaleX(-1)' },
        },
        roadScroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        particleRise: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0)' },
          '20%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-80px) scale(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-60px) rotateY(8deg)' },
          '100%': { opacity: '1', transform: 'translateX(0) rotateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(60px) rotateY(-8deg)' },
          '100%': { opacity: '1', transform: 'translateX(0) rotateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.85) rotateX(10deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotateX(0)' },
        },
        morphBlob: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '25%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '50%': { borderRadius: '50% 60% 30% 60% / 30% 50% 70% 50%' },
          '75%': { borderRadius: '60% 30% 60% 40% / 70% 40% 50% 60%' },
        },
        morphBlob2: {
          '0%, 100%': { borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' },
          '33%': { borderRadius: '70% 30% 50% 50% / 30% 70% 30% 70%' },
          '66%': { borderRadius: '30% 60% 40% 70% / 60% 30% 60% 40%' },
        },
        glowRing: {
          '0%, 100%': { boxShadow: '0 0 30px rgba(59,130,246,0.15), inset 0 0 30px rgba(59,130,246,0.05)' },
          '50%': { boxShadow: '0 0 60px rgba(59,130,246,0.25), inset 0 0 60px rgba(59,130,246,0.1)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(120px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(120px) rotate(-360deg)' },
        },
        orbitReverse: {
          '0%': { transform: 'rotate(0deg) translateX(80px) rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg) translateX(80px) rotate(360deg)' },
        },
        tiltIn: {
          '0%': { opacity: '0', transform: 'perspective(1000px) rotateX(15deg) rotateY(-10deg) translateZ(-50px)' },
          '100%': { opacity: '1', transform: 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)' },
        },
        float3D: {
          '0%, 100%': { transform: 'translateY(0) rotateX(0) rotateY(0)' },
          '25%': { transform: 'translateY(-10px) rotateX(2deg) rotateY(-2deg)' },
          '50%': { transform: 'translateY(-5px) rotateX(0) rotateY(2deg)' },
          '75%': { transform: 'translateY(-12px) rotateX(-2deg) rotateY(0)' },
        },
        rotateY360: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
      },
      backgroundSize: {
        '300%': '300% 300%',
      },
    },
  },
  plugins: [],
};
