// NHS Design System Colors
export const NHS_COLORS = {
  // Primary
  blue: '#005EB8',
  darkBlue: '#003087',
  brightBlue: '#0072CE',
  lightBlue: '#41B6E6',
  aqua: '#00A9CE',

  // Supporting
  green: '#007F3B',
  warmYellow: '#FFB81C',
  orange: '#ED8B00',
  pink: '#AE2573',
  red: '#DA291C',

  // Neutral
  black: '#231f20',
  darkGrey: '#425563',
  midGrey: '#768692',
  paleGrey: '#E8EDEE',
  white: '#FFFFFF',
} as const;

// Chart color palette (ordered for visual distinction)
export const CHART_COLORS = [
  NHS_COLORS.blue,
  NHS_COLORS.lightBlue,
  NHS_COLORS.green,
  NHS_COLORS.warmYellow,
  NHS_COLORS.pink,
  NHS_COLORS.aqua,
  NHS_COLORS.orange,
  NHS_COLORS.darkBlue,
] as const;

// Comparison colors
export const COMPARISON_COLORS = {
  primary: NHS_COLORS.blue,
  benchmark: NHS_COLORS.red,
  peer: NHS_COLORS.lightBlue,
  parent: NHS_COLORS.darkBlue,
} as const;

// Status colors for indicators
export const STATUS_COLORS = {
  better: NHS_COLORS.green,
  similar: NHS_COLORS.warmYellow,
  worse: NHS_COLORS.red,
} as const;
