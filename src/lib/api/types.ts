// CVDPREVENT API Response Types

export interface TimePeriod {
  TimePeriodID: number;
  TimePeriodName: string;
  StartDate: string;
  EndDate: string;
}

export interface TimePeriodResponse {
  timePeriodList: TimePeriod[];
}

export interface SystemLevel {
  SystemLevelID: number;
  SystemLevelName: string;
  IsVisible: 'Y' | 'N';
  NationalLevel: 'Y' | 'N';
}

export interface SystemLevelResponse {
  systemLevels: SystemLevel[];
}

export interface Area {
  AreaCode: string;
  AreaID: number;
  AreaName: string;
  AreaOdsCode?: string;
  Parents: number[]; // Array of parent AreaIDs
  ParticipationRate?: number;
  PopulationRate?: number;
  SystemLevelID: number;
  SystemLevelName: string;
}

export interface AreaResponse {
  areaList: Area[];
}

export interface Indicator {
  IndicatorID: number;
  IndicatorCode: string;
  IndicatorName: string;
  IndicatorShortName: string;
  IndicatorOrder: number;
  IndicatorFormatID: number;
  FormatDisplayName: string;
  AxisCharacter: string;
  DataUpdateInterval: string | null;
  IndicatorStatus: string | null;
  HighestPriorityNotificationType: string | null;
  NotificationCount: number;
}

export interface IndicatorResponse {
  indicatorList: Indicator[];
}

export interface IndicatorRawData {
  IndicatorID: number;
  AreaCode: string;
  AreaName: string;
  TimePeriodID: number;
  TimePeriodName: string;
  MetricCategoryTypeName: string;
  MetricCategoryName: string;
  Numerator: number | null;
  Denominator: number | null;
  Value: number | null;
  LowerCI: number | null;
  UpperCI: number | null;
  ComparedToEnglandValue: number | null;
  ComparedToEnglandID: number | null;
}

export interface IndicatorRawDataResponse {
  indicatorRawData: IndicatorRawData[];
}

// System Level IDs
export const SYSTEM_LEVELS = {
  ENGLAND: 1,
  REGION: 6,
  ICB: 7,
  SUB_ICB: 8,
  PCN: 4,
  PRACTICE: 5,
} as const;

export type SystemLevelId = (typeof SYSTEM_LEVELS)[keyof typeof SYSTEM_LEVELS];

// Metric category types
export type MetricCategoryType =
  | 'Sex'
  | 'Sex - Age Standardised'
  | 'Age group'
  | 'Deprivation quintile'
  | 'Ethnicity'
  | 'Ethnicity (broad)';

// New efficient API response types

export interface IndicatorDataCategory {
  CategoryAttribute: string;
  MetricCategoryID: number;
  MetricCategoryName: string;
  MetricCategoryOrder: number;
  MetricCategoryTypeName: string;
  MetricID: number;
  AreaData: {
    AreaCode: string;
    AreaID: number;
    AreaName: string;
    Value: number | null;
    LowerConfidenceLimit: number | null;
    UpperConfidenceLimit: number | null;
    Numerator: number | null;
    Denominator: number | null;
    TimePeriodID: number;
  };
  NationalData: {
    AreaCode: string;
    AreaID: number;
    AreaName: string;
    Value: number | null;
    LowerConfidenceLimit: number | null;
    UpperConfidenceLimit: number | null;
    Numerator: number | null;
    Denominator: number | null;
    TimePeriodID: number;
  };
}

export interface IndicatorDataResponse {
  indicatorData: {
    IndicatorID: number;
    IndicatorCode: string;
    IndicatorName: string;
    IndicatorShortName: string;
    IndicatorOrder: number;
    FormatDisplayName: string;
    AxisCharacter: string;
    TimePeriodID: number;
    TimePeriodName: string;
    Categories: IndicatorDataCategory[];
  };
}

export interface TimeSeriesDataPoint {
  TimePeriodID: number;
  TimePeriodName: string;
  Value: number | null;
  Median?: number | null;
  TimeseriesNotificationCount?: number;
}

export interface TimeSeriesArea {
  AreaCode: string;
  AreaID: number;
  AreaName: string;
  TimeSeriesData: TimeSeriesDataPoint[];
}

export interface TimeSeriesByMetricResponse {
  Data: {
    Areas: TimeSeriesArea[];
    TargetValue: number | null;
  };
}

export interface SiblingDataItem {
  AreaCode: string;
  AreaID: number;
  AreaName: string;
  Value: number | null;
  LowerConfidenceLimit: number | null;
  UpperConfidenceLimit: number | null;
  Numerator: number | null;
  Denominator: number | null;
  SystemLevelID: number;
  SystemLevelName: string;
  TimePeriodID: number;
  TimePeriodName: string;
}

export interface SiblingDataResponse {
  siblingData: {
    IndicatorID: number;
    IndicatorCode: string;
    IndicatorName: string;
    IndicatorShortName: string;
    IndicatorOrder: number;
    MetricCategoryID: number;
    MetricCategoryName: string;
    MetricCategoryOrder: number;
    MetricCategoryTypeName: string;
    CategoryAttribute: string;
    Data: SiblingDataItem[];
  };
}

export interface DataAvailabilityItem {
  DataAvailabilityID: number;
  DataAvailabilityName: string;
  IndicatorID: number;
  IsAvailable: 'Y' | 'N' | null;
  MetricCategoryTypeID: number;
  MetricCategoryTypeName: string;
  SystemLevelID: number;
  TimePeriodID: number;
}

export interface DataAvailabilityResponse {
  DataAvailability: DataAvailabilityItem[];
}

// Efficient all-indicators-for-area endpoint response
export interface IndicatorTimeSeriesPoint {
  TimePeriodID: number;
  TimePeriodName: string;
  Value: number | null;
  Median: number | null;
  StartDate: string;
  EndDate: string;
}

export interface IndicatorCategoryData {
  CategoryAttribute: string;
  MetricCategoryID: number;
  MetricCategoryName: string;
  MetricCategoryOrder: number;
  MetricCategoryTypeName: string;
  MetricID: number;
  Data: {
    AreaID: number;
    Value: number | null;
    LowerConfidenceLimit: number | null;
    UpperConfidenceLimit: number | null;
    Numerator: number | null;
    Denominator: number | null;
    TimePeriodID: number;
    Count: number | null;
    Median: number | null;
  };
  TimeSeries: IndicatorTimeSeriesPoint[];
}

export interface IndicatorWithData {
  IndicatorID: number;
  IndicatorCode: string;
  IndicatorName: string;
  IndicatorShortName: string;
  IndicatorOrder: number;
  IndicatorFormatID: number;
  FormatDisplayName: string;
  AxisCharacter: string;
  IndicatorTypeID: number;
  IndicatorTypeName: string;
  Categories: IndicatorCategoryData[];
}

export interface AllIndicatorsForAreaResponse {
  indicatorList: IndicatorWithData[];
}
