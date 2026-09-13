import { useColorScheme } from 'react-native';

// Mirrors the PWA's actual design language (Tailwind indigo-600 primary,
// neutral gray scale, dark: variants) instead of inventing a new palette —
// the whole point is visual parity between the two apps. Values below are
// the stock Tailwind color scale the PWA's className strings reference
// directly (bg-indigo-600, text-neutral-500, dark:bg-neutral-900, etc.).

const palette = {
  white: '#ffffff',
  black: '#000000',
  indigo50: '#eef2ff',
  indigo100: '#e0e7ff',
  indigo200: '#c7d2fe',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',
  indigo900: '#312e81',
  indigo950: '#1e1b4b',
  neutral50: '#fafafa',
  neutral100: '#f5f5f5',
  neutral200: '#e5e5e5',
  neutral300: '#d4d4d4',
  neutral400: '#a3a3a3',
  neutral500: '#737373',
  neutral600: '#525252',
  neutral700: '#404040',
  neutral800: '#262626',
  neutral900: '#171717',
  neutral950: '#0a0a0a',
  red600: '#dc2626',
  red400: '#f87171',
  amber50: '#fffbeb',
  amber700: '#b45309',
  amber300: '#fcd34d',
  amber950: '#451a03',
} as const;

export type Theme = {
  scheme: 'light' | 'dark';
  color: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryText: string;
    onPrimary: string;
    destructive: string;
    warningBg: string;
    warningText: string;
  };
};

const light: Theme = {
  scheme: 'light',
  color: {
    background: palette.white,
    surface: palette.neutral50,
    surfaceAlt: palette.neutral100,
    border: palette.neutral200,
    text: palette.neutral900,
    textMuted: palette.neutral500,
    primary: palette.indigo600,
    primaryText: palette.indigo600,
    onPrimary: palette.white,
    destructive: palette.red600,
    warningBg: palette.amber50,
    warningText: palette.amber700,
  },
};

const dark: Theme = {
  scheme: 'dark',
  color: {
    background: palette.neutral950,
    surface: palette.neutral900,
    surfaceAlt: palette.neutral800,
    border: palette.neutral800,
    text: palette.neutral100,
    textMuted: palette.neutral400,
    primary: palette.indigo600,
    primaryText: palette.indigo200,
    onPrimary: palette.white,
    destructive: palette.red400,
    warningBg: palette.amber950,
    warningText: palette.amber300,
  },
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

// 4/8pt rhythm — used for every padding/gap/margin instead of ad-hoc numbers.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

// Matches the PWA's rounded-lg/xl/2xl/full usage.
export const radius = { sm: 8, md: 10, lg: 12, xl: 16, pill: 999 } as const;

export const fontSize = { xs: 12, sm: 13, base: 14, md: 15, lg: 18, xl: 22 } as const;

export const iconSize = { sm: 16, md: 20, lg: 24 } as const;
