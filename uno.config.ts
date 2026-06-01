import { defineConfig, presetWind, presetUno } from 'unocss'
import transformerDirectives from '@unocss/transformer-directives'

export default defineConfig({
  presets: [
    presetUno(),
    presetWind()
  ],
  transformers: [
    transformerDirectives()
  ],
  shortcuts: {
    // Glass surfaces
    'glass-panel': 'bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-[18px]',
    'glass-pill': 'bg-[var(--surface-2)] border border-[var(--line-soft)] backdrop-blur-[14px]',
    'glass-card': 'bg-[var(--bg-card)] border border-[var(--dominant-border)] rounded-20px backdrop-blur-[18px] shadow-[var(--dominant-glow)]',

    // Dominant color surfaces
    'dominant-surface': 'bg-[var(--dominant-tint-1)] border border-[var(--dominant-border)] rounded-20px',
    'dominant-glow': 'shadow-[var(--dominant-glow)]',
    'dominant-glow-strong': 'shadow-[var(--dominant-glow-strong)]',

    // Text hierarchy
    'text-primary': 'color-[var(--text-primary)]',
    'text-secondary': 'color-[var(--text-secondary)]',
    'text-tertiary': 'color-[var(--text-tertiary)]',

    // Interactive elements
    'icon-btn': 'inline-flex items-center justify-center border border-[var(--line-soft)] bg-[var(--surface-1)] color-[var(--text-primary)] rounded-50% transition-all duration-150 ease active:scale-94 active:bg-[var(--surface-3)]',
    'pill-btn': 'px-14px py-7px rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] color-[var(--text-primary)] text-13px font-600 cursor-pointer transition-all duration-150 ease active:scale-96',
    'primary-btn': 'px-14px py-10px rounded-full bg-[var(--brand-grad)] color-[var(--text-on-brand)] text-14px font-700 cursor-pointer transition-all duration-150 ease active:scale-96',

    // Page containers
    'page-container': 'flex flex-col h-[100%] bg-transparent',
    'page-scroll': 'flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]',

    // Track list items
    'track-card': 'bg-[var(--surface-1)] border border-[var(--line-soft)] rounded-20px overflow-hidden',

    // Section headers
    'section-title': 'text-18px font-700 color-[var(--text-primary)] tracking-tight',

    // Skeleton shimmer
    'skeleton': 'rounded bg-gradient-to-r from-white/8% via-white/14% to-white/8% bg-[length:200%_100%] animate-shimmer'
  },
  theme: {
    colors: {
      brand: {
        from: 'var(--brand-from)',
        to: 'var(--brand-to)',
        hot: 'var(--brand-hot)',
        gold: 'var(--brand-gold)',
        lime: 'var(--brand-lime)',
        cyan: 'var(--brand-cyan)'
      },
      dominant: {
        DEFAULT: 'var(--dominant-color)',
        soft: 'var(--dominant-soft)',
        muted: 'var(--dominant-muted)',
        bright: 'var(--dominant-bright)',
        accent: 'var(--dominant-accent)',
        text: 'var(--dominant-text)'
      },
      bg: {
        canvas: 'var(--bg-canvas)',
        base: 'var(--bg-base)',
        sheet: 'var(--bg-sheet)',
        card: 'var(--bg-card)',
        active: 'var(--bg-active)',
        input: 'var(--bg-input)',
        overlay: 'var(--bg-overlay)'
      },
      surface: {
        1: 'var(--surface-1)',
        2: 'var(--surface-2)',
        3: 'var(--surface-3)',
        elevated: 'var(--surface-elevated)',
        press: 'var(--surface-press)'
      },
      text: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        quaternary: 'var(--text-quaternary)',
        'on-brand': 'var(--text-on-brand)'
      },
      line: {
        soft: 'var(--line-soft)',
        strong: 'var(--line-strong)'
      },
      icon: {
        like: 'var(--icon-like)',
        download: 'var(--icon-download)',
        queue: 'var(--icon-queue)',
        volume: 'var(--icon-volume)'
      },
      src: {
        migu: 'var(--src-migu)',
        netease: 'var(--src-netease)',
        qq: 'var(--src-qq)',
        kuwo: 'var(--src-kuwo)'
      }
    },
    borderRadius: {
      sm: '10px',
      md: '18px',
      lg: '28px',
      xl: '36px'
    },
    animation: {
      keyframes: {
        shimmer: '{0%{background-position:200% 0}100%{background-position:-200% 0}}',
        'fade-in-up': '{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}',
        'fade-in': '{from{opacity:0}to{opacity:1}}',
        'scale-in': '{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}'
      },
      durations: {
        shimmer: '1.8s',
        'fade-in-up': '0.4s',
        'fade-in': '0.3s',
        'scale-in': '0.25s'
      },
      timingFns: {
        shimmer: 'linear',
        'fade-in-up': 'cubic-bezier(0.22,0.68,0.32,1)',
        'fade-in': 'ease',
        'scale-in': 'cubic-bezier(0.22,0.68,0.32,1)'
      }
    }
  }
})
