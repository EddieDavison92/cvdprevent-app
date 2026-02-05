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

export const defaultChartOptions = {
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true,
  },
  animation: true,
  animationDuration: 300,
};
