import { NHS_COLORS, CHART_COLORS } from '@/lib/constants/colors';

export const nhsEChartsTheme = {
  color: CHART_COLORS,
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'var(--font-geist-sans), Arial, sans-serif',
    color: NHS_COLORS.darkGrey,
  },
  title: {
    textStyle: {
      color: NHS_COLORS.darkBlue,
      fontWeight: 600,
    },
    subtextStyle: {
      color: NHS_COLORS.midGrey,
    },
  },
  legend: {
    textStyle: {
      color: NHS_COLORS.darkGrey,
    },
  },
  tooltip: {
    backgroundColor: NHS_COLORS.white,
    borderColor: NHS_COLORS.paleGrey,
    textStyle: {
      color: NHS_COLORS.black,
    },
  },
  xAxis: {
    axisLine: {
      lineStyle: {
        color: NHS_COLORS.midGrey,
      },
    },
    axisTick: {
      lineStyle: {
        color: NHS_COLORS.midGrey,
      },
    },
    axisLabel: {
      color: NHS_COLORS.darkGrey,
    },
    splitLine: {
      lineStyle: {
        color: NHS_COLORS.paleGrey,
      },
    },
  },
  yAxis: {
    axisLine: {
      lineStyle: {
        color: NHS_COLORS.midGrey,
      },
    },
    axisTick: {
      lineStyle: {
        color: NHS_COLORS.midGrey,
      },
    },
    axisLabel: {
      color: NHS_COLORS.darkGrey,
    },
    splitLine: {
      lineStyle: {
        color: NHS_COLORS.paleGrey,
      },
    },
  },
};

type GridLayout = Partial<Record<'left' | 'right' | 'top' | 'bottom', number | string>>;

/** Grid sized to fit tick labels and axis names, so rotated axis titles are never clipped. */
export function chartGrid(layout: GridLayout) {
  return { ...layout, outerBoundsMode: 'same' as const, outerBoundsContain: 'all' as const };
}

/**
 * Category labels for phones: wrap each to its share of a ~270px plot so neighbours
 * don't collide (e.g. "Without learning disability" beside "With learning disability").
 */
export function narrowCategoryLabel(count: number) {
  return {
    fontSize: 10,
    width: Math.max(48, Math.floor(270 / Math.max(count, 1))),
    overflow: 'break' as const,
  };
}

/** Axis name gap, measured from the tick labels rather than the axis line. */
export const AXIS_NAME_GAP = 10;

export const defaultChartOptions = {
  grid: chartGrid({ left: '3%', right: '4%', bottom: '3%' }),
  animation: true,
  animationDuration: 300,
  animationDurationUpdate: 180,
  animationEasingUpdate: 'cubicOut' as const,
};
