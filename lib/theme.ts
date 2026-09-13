import { useColorScheme } from 'react-native';

// Every value here was read directly off the live PWA's rendered DOM
// (computed classNames via a headless inspection pass, 2026-09-13) — not
// inferred from globals.css or guessed. See individual component files for
// which exact PWA element each style block mirrors.

const palette = {
  white: '#ffffff',
  indigo50: '#eef2ff',
  indigo100: '#e0e7ff',
  indigo300: '#a5b4fc',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',
  indigo900: '#312e81',
  indigo950: '#1e1b4b',
  violet50: '#f5f3ff',
  violet950: '#2e1065',
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
  red500: '#ef4444',
  red600: '#dc2626',
  amber50: '#fffbeb',
  amber700: '#b45309',
  amber300: '#fcd34d',
  amber950: '#451a03',
} as const;

export type Theme = {
  scheme: 'light' | 'dark';
  color: {
    background: string; // page bg — PWA: bg-neutral-50 / dark:bg-neutral-950
    headerBg: string; // header/nav bars — PWA: bg-neutral-50 / dark:bg-neutral-900
    surface: string; // card bg — PWA: bg-white / dark:bg-neutral-900
    surfaceMuted: string; // progress-bar track, secondary chips — neutral-100/800
    border: string; // neutral-200 / neutral-800
    borderDashed: string; // neutral-300 / neutral-700
    text: string; // neutral-900 / neutral-100
    textMuted: string; // neutral-400 / neutral-500
    textItem: string; // checklist item label — neutral-700 / neutral-300
    textFaint: string; // item attribution, timestamps — neutral-300 / neutral-600 (light) — see chat timestamp variant below
    primary: string; // indigo-600, same both modes
    primaryHover: string; // indigo-700
    onPrimary: string; // white
    primarySoftBg: string; // indigo-50 / indigo-950 — time badge, "+Baru" button
    primarySoftBgMid: string; // indigo-100 / indigo-900 — avatar, "Besok" badge
    primarySoftText: string; // indigo-600 / indigo-300
    primarySoftTextStrong: string; // indigo-700 / indigo-300 — date group header
    destructive: string;
    checkboxBorder: string; // neutral-300 / neutral-700
    chevron: string; // neutral-300 / neutral-600
    warningBg: string;
    warningText: string;
  };
};

const light: Theme = {
  scheme: 'light',
  color: {
    background: palette.neutral50,
    headerBg: palette.neutral50,
    surface: palette.white,
    surfaceMuted: palette.neutral100,
    border: palette.neutral200,
    borderDashed: palette.neutral300,
    text: palette.neutral900,
    textMuted: palette.neutral400,
    textItem: palette.neutral700,
    textFaint: palette.neutral300,
    primary: palette.indigo600,
    primaryHover: palette.indigo700,
    onPrimary: palette.white,
    primarySoftBg: palette.indigo50,
    primarySoftBgMid: palette.indigo100,
    primarySoftText: palette.indigo600,
    primarySoftTextStrong: palette.indigo700,
    destructive: palette.red600,
    checkboxBorder: palette.neutral300,
    chevron: palette.neutral300,
    warningBg: palette.amber50,
    warningText: palette.amber700,
  },
};

const dark: Theme = {
  scheme: 'dark',
  color: {
    background: palette.neutral950,
    headerBg: palette.neutral900,
    surface: palette.neutral900,
    surfaceMuted: palette.neutral800,
    border: palette.neutral800,
    borderDashed: palette.neutral700,
    text: palette.neutral100,
    textMuted: palette.neutral500,
    textItem: palette.neutral300,
    textFaint: palette.neutral600,
    primary: palette.indigo600,
    primaryHover: palette.indigo700,
    onPrimary: palette.white,
    primarySoftBg: palette.indigo950,
    primarySoftBgMid: palette.indigo900,
    primarySoftText: palette.indigo300,
    primarySoftTextStrong: palette.indigo300,
    destructive: palette.red500,
    checkboxBorder: palette.neutral700,
    chevron: palette.neutral600,
    warningBg: palette.amber950,
    warningText: palette.amber300,
  },
};

// Assistant chat bubble gradient — PWA: bg-gradient-to-br from-indigo-50
// via-indigo-50 to-violet-50 (light) / dark:from-indigo-950
// dark:via-indigo-950 dark:to-violet-950.
export const assistantBubbleGradient = {
  light: [palette.indigo50, palette.indigo50, palette.violet50] as const,
  dark: [palette.indigo950, palette.indigo950, palette.violet950] as const,
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

// PWA radius scale: rounded-md=6 rounded-lg=8 rounded-xl=12 rounded-2xl=16 rounded-full=pill
export const radius = { badge: 6, button: 8, card: 12, sheet: 16, pill: 9999 } as const;

// PWA type scale actually observed: text-[10px]/text-xs(12)/text-sm(14)/text-lg(18)
export const fontSize = { tiny: 10, xs: 12, sm: 14, lg: 18 } as const;

export const iconSize = { sm: 14, md: 16, lg: 22 } as const;
