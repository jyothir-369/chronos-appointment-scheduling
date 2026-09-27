/**
 * Stage B — Design System Foundation (§3.1)
 * Centralized token file; used by Tailwind theme config.
 */
export const tokens = {
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
  },
  radius: {
    sm: '0.25rem',  // 4px
    md: '0.5rem',   // 8px
    lg: '1rem',     // 16px
    xl: '1.5rem',   // 24px
    full: '9999px',
  },
  colors: {
    accent: '#2563eb',    // blue-600
    accentHover: '#1d4ed8', // blue-700
    success: '#059669',   // emerald-600
    successBg: '#ecfdf5', // emerald-50
    warning: '#d97706',   // amber-600
    warningBg: '#fffbeb', // amber-50
    error: '#dc2626',     // red-600
    errorBg: '#fef2f2',   // red-50
    info: '#2563eb',      // blue-600 (reused)
  },
  typography: {
    fontHeading: '"Instrument Serif", Georgia, serif',
    fontNumerals: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
    fontBody: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
};

export type DesignToken = typeof tokens;
