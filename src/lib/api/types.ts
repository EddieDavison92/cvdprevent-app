// CVDPREVENT API Response Types

export interface TimePeriod {
  TimePeriodID: number;
  TimePeriodName: string;
  StartDate: string;
  EndDate: string;
  IndicatorTypeID: number;
  IndicatorTypeName: string;
}

export interface TimePeriodResponse {
  timePeriodList: TimePeriod[];
}

export interface SystemLevel {
  SystemLevelID: number;
  SystemLevelName: string;
  IsVisible: 'Y' | 'N';
  NationalLevel: 'Y' | 'N';
  SystemLevelOrder: number;
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

/**
 * Normalised indicator data row used internally.
 * Note: the rawDataJSON endpoint returns `LowerConfidenceLimit`/`UpperConfidenceLimit`
 * but we map to `LowerCI`/`UpperCI` for brevity when constructing from other endpoints.
 */
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

/** Shape returned by /indicator/<id>/rawDataJSON — uses full field names from API */
export interface RawDataJSONItem {
  AreaCode: string;
  AreaName: string;
  CategoryAttribute: string;
  Denominator: number | null;
  Factor: number | null;
  IndicatorCode: string;
  IndicatorName: string;
  IndicatorShortName: string;
  LowerConfidenceLimit: number | null;
  MetricCategoryName: string;
  MetricCategoryTypeName: string;
  Numerator: number | null;
  TimePeriodName: string;
  UpperConfidenceLimit: number | null;
  Value: number | null;
  ValueNote: string | null;
  HighestPriorityNotificationType: string | null;
  NotificationCount: number;
}

export interface IndicatorRawDataResponse {
  indicatorRawData: RawDataJSONItem[];
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
  Count?: number | null;
  Numerator?: number | null;
  Denominator?: number | null;
  Factor?: number | null;
  HighestPriorityNotificationType?: string | null;
  NotificationCount?: number;
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
    TargetLabel: string | null;
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
  Count: number | null;
  DataID: number;
  Factor: number | null;
  Min: number | null;
  Max: number | null;
  Median: number | null;
  Q20: number | null;
  Q40: number | null;
  Q60: number | null;
  Q80: number | null;
  ValueNote: string | null;
  HighestPriorityNotificationType: string | null;
  NotificationCount: number;
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
    HighestPriorityNotificationType: string | null;
    NotificationCount: number;
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
    DataID: number;
    Factor: number | null;
    Min: number | null;
    Max: number | null;
    Q20: number | null;
    Q40: number | null;
    Q60: number | null;
    Q80: number | null;
    ValueNote: string | null;
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
  DataUpdateInterval: string | null;
  IndicatorStatus: string | null;
  HighestPriorityNotificationType: string | null;
  NotificationCount: number;
  Categories: IndicatorCategoryData[];
}

export interface AllIndicatorsForAreaResponse {
  indicatorList: IndicatorWithData[];
}
