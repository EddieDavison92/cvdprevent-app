import { fetchApi } from './client';
import type {
  Indicator,
  IndicatorRawData,
  IndicatorRawDataResponse,
  IndicatorResponse,
  IndicatorDataResponse,
  TimeSeriesByMetricResponse,
  SiblingDataResponse,
  DataAvailabilityResponse,
  AllIndicatorsForAreaResponse,
  IndicatorWithData,
} from './types';

export async function getIndicators(timePeriodId: number, systemLevelId: number): Promise<Indicator[]> {
  const response = await fetchApi<IndicatorResponse>(
    `/indicator/list?timePeriodID=${timePeriodId}&systemLevelID=${systemLevelId}`
  );
  return response.indicatorList;
}

export async function getIndicatorData(
  indicatorId: number,
  timePeriodId: number,
  systemLevelId: number
): Promise<IndicatorRawData[]> {
  const response = await fetchApi<IndicatorRawDataResponse>(
    `/indicator/${indicatorId}/rawDataJSON?timePeriodID=${timePeriodId}&systemLevelID=${systemLevelId}`
  );
  return response.indicatorRawData;
}

export function filterByCategory(
  data: IndicatorRawData[],
  categoryType: string,
  categoryName: string
): IndicatorRawData[] {
  return data.filter((d) => d.MetricCategoryTypeName === categoryType && d.MetricCategoryName === categoryName);
}

export function getPersonsData(data: IndicatorRawData[]): IndicatorRawData[] {
  return filterByCategory(data, 'Sex', 'Persons');
}

export function getAreaData(data: IndicatorRawData[], areaCode: string): IndicatorRawData[] {
  return data.filter((d) => d.AreaCode === areaCode);
}

export function groupByArea(data: IndicatorRawData[]): Map<string, IndicatorRawData[]> {
  const grouped = new Map<string, IndicatorRawData[]>();

  for (const item of data) {
    const existing = grouped.get(item.AreaCode) || [];
    existing.push(item);
    grouped.set(item.AreaCode, existing);
  }

  return grouped;
}

export function getIndicatorCategories(): { type: string; categories: string[] }[] {
  return [
    { type: 'Sex', categories: ['Persons', 'Male', 'Female'] },
    { type: 'Age group', categories: ['18-39', '40-59', '60-79', '80+'] },
    {
      type: 'Deprivation quintile',
      categories: ['1 - most deprived', '2', '3', '4', '5 - least deprived'],
    },
    {
      type: 'Ethnicity',
      categories: ['Asian', 'Black', 'Mixed', 'Other', 'Unknown', 'White'],
    },
  ];
}

export function isOutcomeIndicator(indicator: Indicator): boolean {
  return indicator.IndicatorCode.includes('MORT') || indicator.IndicatorCode.includes('ADMN');
}

// Efficient single-area data fetch (returns area + England comparison)
export async function getIndicatorDataForArea(
  indicatorId: number,
  timePeriodId: number,
  areaId: number
): Promise<IndicatorDataResponse['indicatorData']> {
  const response = await fetchApi<IndicatorDataResponse>(
    `/indicator/${indicatorId}/data?timePeriodID=${timePeriodId}&areaID=${areaId}`
  );
  return response.indicatorData;
}

// Time series for a specific metric and area
export async function getTimeSeriesByMetric(
  metricId: number,
  areaId: number
): Promise<TimeSeriesByMetricResponse['Data']> {
  const response = await fetchApi<TimeSeriesByMetricResponse>(
    `/indicator/timeSeriesByMetric/${metricId}?areaID=${areaId}`
  );
  return response.Data;
}

// Peer/sibling data for comparison
export async function getSiblingData(
  timePeriodId: number,
  areaId: number,
  metricId: number
): Promise<SiblingDataResponse['siblingData']> {
  const response = await fetchApi<SiblingDataResponse>(
    `/indicator/siblingData?timePeriodID=${timePeriodId}&areaID=${areaId}&metricID=${metricId}`
  );
  return response.siblingData;
}

// Check data availability for demographics
export async function getDataAvailability(
  timePeriodId: number,
  systemLevelId: number,
  indicatorId?: number
): Promise<DataAvailabilityResponse['DataAvailability']> {
  let url = `/dataAvailability?timePeriodID=${timePeriodId}&systemLevelID=${systemLevelId}`;
  if (indicatorId) url += `&indicatorID=${indicatorId}`;
  const response = await fetchApi<DataAvailabilityResponse>(url);
  return response.DataAvailability;
}

// Most efficient endpoint: ALL indicators with time series for a single area
export async function getAllIndicatorsForArea(
  timePeriodId: number,
  areaId: number
): Promise<IndicatorWithData[]> {
  const response = await fetchApi<AllIndicatorsForAreaResponse>(
    `/indicator?timePeriodID=${timePeriodId}&areaID=${areaId}`
  );
  return response.indicatorList;
}

// Helper to get Persons data from the new response format
export function getPersonsCategory(indicator: IndicatorWithData) {
  return indicator.Categories.find(
    (c) => c.MetricCategoryTypeName === 'Sex' && c.MetricCategoryName === 'Persons'
  );
}

// Get child areas for an area
export async function getChildAreas(
  areaId: number,
  timePeriodId: number
): Promise<{ AreaID: number; AreaCode: string; AreaName: string; SystemLevelID: number }[]> {
  const response = await fetchApi<{
    areaDetails: {
      ChildAreaList?: { AreaID: number; AreaCode: string; AreaName: string; SystemLevelID: number }[];
    };
  }>(`/area/${areaId}/details?timePeriodID=${timePeriodId}`);
  return response.areaDetails.ChildAreaList ?? [];
}

// Get child data using the dedicated childData endpoint
export async function getChildData(
  timePeriodId: number,
  areaId: number,
  metricId: number
): Promise<SiblingDataResponse['siblingData']> {
  const response = await fetchApi<{ childData: SiblingDataResponse['siblingData'] }>(
    `/indicator/childData?timePeriodID=${timePeriodId}&areaID=${areaId}&metricID=${metricId}`
  );
  return response.childData;
}
