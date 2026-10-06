import { useColorScheme } from 'react-native';

export type Palette = {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  track: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  danger: string;
  warning: string;
  tabBar: string;
  dark: boolean;
};

const light: Palette = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  cardAlt: '#ECEEF2',
  text: '#14161A',
  textSecondary: '#5B616B',
  textTertiary: '#8D939C',
  border: '#E2E5EA',
  track: '#E6E8EC',
  accent: '#3B6EF5',
  accentSoft: '#3B6EF51F',
  onAccent: '#FFFFFF',
  success: '#1E9E5A',
  danger: '#E0473E',
  warning: '#D9971E',
  tabBar: '#FFFFFF',
  dark: false,
};

const dark: Palette = {
  bg: '#0E0F12',
  card: '#17191D',
  cardAlt: '#22252B',
  text: '#F2F3F5',
  textSecondary: '#A9AFB8',
  textTertiary: '#6F7682',
  border: '#262A30',
  track: '#2A2E35',
  accent: '#5B86FF',
  accentSoft: '#5B86FF26',
  onAccent: '#FFFFFF',
  success: '#3CC57A',
  danger: '#FF6B61',
  warning: '#F0B13A',
  tabBar: '#131519',
  dark: true,
};

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function progressColor(p: Palette, ratio: number): string {
  if (ratio > 1) return p.danger;
  if (ratio >= 0.8) return p.warning;
  return p.success;
}

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };
