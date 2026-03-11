/**
 * API contract tests — verify CVDPREVENT API response shapes match our types.
 * These hit the real API so they double as smoke tests for upstream changes.
 * Run as part of build (`npm run test && next build`).
 */
import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'https://api.cvdprevent.nhs.uk';

async function fetchJSON<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${endpoint}`);
  return res.json() as Promise<T>;
}

/** Assert an object has all listed keys */
function expectKeys(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    expect(obj, `missing key: ${key}`).toHaveProperty(key);
  }
}

// Shared state — initialised once before all tests
let timePeriodId: number;

beforeAll(async () => {
  const periods = await fetchJSON<{ timePeriodList: { TimePeriodID: number; TimePeriodName: string }[] }>('/timePeriod');
  const standardPeriods = periods.timePeriodList.filter(p => p.TimePeriodName.startsWith('To '));
  timePeriodId = standardPeriods.sort((a, b) => b.TimePeriodID - a.TimePeriodID)[0].TimePeriodID;
});

// ---------- Time Periods ----------

describe('GET /timePeriod', () => {
  it('returns timePeriodList array with expected fields', async () => {
    const data = await fetchJSON<Record<string, unknown>>('/timePeriod');

    expect(data).toHaveProperty('timePeriodList');
    expect(Array.isArray(data.timePeriodList)).toBe(true);

    const period = (data.timePeriodList as Record<string, unknown>[])[0];
    expectKeys(period, [
      'TimePeriodID', 'TimePeriodName', 'StartDate', 'EndDate',
      'IndicatorTypeID', 'IndicatorTypeName',
    ]);
    expect(typeof period.TimePeriodID).toBe('number');
  });
});

// ---------- System Levels ----------

describe('GET /area/systemLevel', () => {
  it('returns systemLevels array with expected fields', async () => {
    const data = await fetchJSON<Record<string, unknown>>(
      `/area/systemLevel?timePeriodID=${timePeriodId}`
    );

    expect(data).toHaveProperty('systemLevels');
    const levels = data.systemLevels as Record<string, unknown>[];
    expect(levels.length).toBeGreaterThan(0);
    expectKeys(levels[0], [
      'SystemLevelID', 'SystemLevelName', 'IsVisible', 'NationalLevel', 'SystemLevelOrder',
    ]);
  });
});

// ---------- Areas ----------

describe('GET /area', () => {
  it('returns areaList for ICB level with expected fields', async () => {
    const data = await fetchJSON<Record<string, unknown>>(
      `/area?timePeriodID=${timePeriodId}&systemLevelID=7`
    );

    expect(data).toHaveProperty('areaList');
    const areas = data.areaList as Record<string, unknown>[];
    expect(areas.length).toBeGreaterThan(0);

    const area = areas[0];
    expectKeys(area, [
      'AreaCode', 'AreaID', 'AreaName', 'Parents', 'SystemLevelID', 'SystemLevelName',
    ]);
    expect(Array.isArray(area.Parents)).toBe(true);
  });
});

// ---------- Indicator List ----------

describe('GET /indicator/list', () => {
  it('returns indicatorList with expected fields', async () => {
    const data = await fetchJSON<Record<string, unknown>>(
      `/indicator/list?timePeriodID=${timePeriodId}&systemLevelID=1`
    );

    expect(data).toHaveProperty('indicatorList');
    const indicators = data.indicatorList as Record<string, unknown>[];
    expect(indicators.length).toBeGreaterThan(0);

    expectKeys(indicators[0], [
      'IndicatorID', 'IndicatorCode', 'IndicatorName', 'IndicatorShortName',
      'IndicatorOrder', 'IndicatorFormatID', 'FormatDisplayName', 'AxisCharacter',
      'DataUpdateInterval', 'IndicatorStatus',
      'HighestPriorityNotificationType', 'NotificationCount',
    ]);
  });
});

// ---------- Raw Data ----------

describe('GET /indicator/:id/rawDataJSON', () => {
  it('returns indicatorRawData array with expected fields', async () => {
    const data = await fetchJSON<Record<string, unknown>>(
      `/indicator/1/rawDataJSON?timePeriodID=${timePeriodId}&systemLevelID=1`
    );

    expect(data).toHaveProperty('indicatorRawData');
    const rawData = data.indicatorRawData as Record<string, unknown>[];
    expect(rawData.length).toBeGreaterThan(0);

    expectKeys(rawData[0], [
      'AreaCode', 'AreaName', 'CategoryAttribute',
      'Denominator', 'Factor',
      'IndicatorCode', 'IndicatorName', 'IndicatorShortName',
      'LowerConfidenceLimit', 'UpperConfidenceLimit',
      'MetricCategoryName', 'MetricCategoryTypeName',
      'Numerator', 'TimePeriodName', 'Value', 'ValueNote',
      'HighestPriorityNotificationType', 'NotificationCount',
    ]);
  });
});

// ---------- All Indicators for Area ----------

describe('GET /indicator (all for area)', () => {
  it('returns indicatorList with Categories, Data, and TimeSeries', async () => {
    const data = await fetchJSON<Record<string, unknown>>(
      `/indicator?timePeriodID=${timePeriodId}&areaID=1`
    );

    expect(data).toHaveProperty('indicatorList');
    const indicators = data.indicatorList as Record<string, unknown>[];
    expect(indicators.length).toBeGreaterThan(0);

    const ind = indicators[0];
    expectKeys(ind, [
      'IndicatorID', 'IndicatorCode', 'IndicatorName', 'IndicatorShortName',
      'IndicatorOrder', 'IndicatorFormatID', 'FormatDisplayName', 'AxisCharacter',
      'IndicatorTypeID', 'IndicatorTypeName', 'Categories',
      'HighestPriorityNotificationType', 'NotificationCount',
    ]);
    expect(Array.isArray(ind.Categories)).toBe(true);

    const cat = (ind.Categories as Record<string, unknown>[])[0];
    expectKeys(cat, [
      'CategoryAttribute', 'MetricCategoryID', 'MetricCategoryName',
      'MetricCategoryOrder', 'MetricCategoryTypeName', 'MetricID',
      'Data', 'TimeSeries',
    ]);

    // Data sub-object
    const catData = cat.Data as Record<string, unknown>;
    expectKeys(catData, [
      'AreaID', 'Value', 'LowerConfidenceLimit', 'UpperConfidenceLimit',
      'Numerator', 'Denominator', 'TimePeriodID',
      'Count', 'Median', 'DataID', 'Factor',
      'Min', 'Max', 'Q20', 'Q40', 'Q60', 'Q80', 'ValueNote',
    ]);

    // TimeSeries
    expect(Array.isArray(cat.TimeSeries)).toBe(true);
    const ts = (cat.TimeSeries as Record<string, unknown>[])[0];
    expectKeys(ts, ['TimePeriodID', 'TimePeriodName', 'Value', 'Median', 'StartDate', 'EndDate']);
  });
});

// ---------- Sibling Data ----------

describe('GET /indicator/siblingData', () => {
  it('returns siblingData with Data array for an ICB', async () => {
    const areaData = await fetchJSON<{ areaList: { AreaID: number }[] }>(
      `/area?timePeriodID=${timePeriodId}&systemLevelID=7`
    );
    const icbAreaId = areaData.areaList[0].AreaID;

    const allData = await fetchJSON<{ indicatorList: { Categories: { MetricID: number; MetricCategoryTypeName: string; MetricCategoryName: string }[] }[] }>(
      `/indicator?timePeriodID=${timePeriodId}&areaID=${icbAreaId}`
    );
    const personsMetric = allData.indicatorList[0].Categories.find(
      c => c.MetricCategoryTypeName === 'Sex' && c.MetricCategoryName === 'Persons'
    );
    expect(personsMetric).toBeDefined();

    const data = await fetchJSON<Record<string, unknown>>(
      `/indicator/siblingData?timePeriodID=${timePeriodId}&areaID=${icbAreaId}&metricID=${personsMetric!.MetricID}`
    );

    expect(data).toHaveProperty('siblingData');
    const sibling = data.siblingData as Record<string, unknown>;
    expectKeys(sibling, [
      'IndicatorID', 'IndicatorCode', 'IndicatorName', 'IndicatorShortName',
      'IndicatorOrder', 'MetricCategoryID', 'MetricCategoryName',
      'MetricCategoryOrder', 'MetricCategoryTypeName', 'CategoryAttribute',
      'HighestPriorityNotificationType', 'NotificationCount', 'Data',
    ]);
    expect(Array.isArray(sibling.Data)).toBe(true);
    expect((sibling.Data as unknown[]).length).toBeGreaterThan(0);

    const item = (sibling.Data as Record<string, unknown>[])[0];
    expectKeys(item, [
      'AreaCode', 'AreaID', 'AreaName', 'Value',
      'LowerConfidenceLimit', 'UpperConfidenceLimit',
      'Numerator', 'Denominator',
      'SystemLevelID', 'SystemLevelName',
      'TimePeriodID', 'TimePeriodName',
      'Count', 'DataID', 'Factor',
      'Min', 'Max', 'Median', 'Q20', 'Q40', 'Q60', 'Q80',
      'ValueNote', 'HighestPriorityNotificationType', 'NotificationCount',
    ]);
  });
});

// ---------- Time Series by Metric ----------

describe('GET /indicator/timeSeriesByMetric', () => {
  it('returns Data with Areas and TimeSeriesData', async () => {
    const areaData = await fetchJSON<{ areaList: { AreaID: number }[] }>(
      `/area?timePeriodID=${timePeriodId}&systemLevelID=7`
    );
    const icbAreaId = areaData.areaList[0].AreaID;

    const allData = await fetchJSON<{ indicatorList: { Categories: { MetricID: number; MetricCategoryTypeName: string; MetricCategoryName: string }[] }[] }>(
      `/indicator?timePeriodID=${timePeriodId}&areaID=${icbAreaId}`
    );
    const personsMetric = allData.indicatorList[0].Categories.find(
      c => c.MetricCategoryTypeName === 'Sex' && c.MetricCategoryName === 'Persons'
    );
    expect(personsMetric).toBeDefined();

    const data = await fetchJSON<Record<string, unknown>>(
      `/indicator/timeSeriesByMetric/${personsMetric!.MetricID}?areaID=${icbAreaId}`
    );

    expect(data).toHaveProperty('Data');
    const tsData = data.Data as Record<string, unknown>;
    expectKeys(tsData, ['Areas', 'TargetValue', 'TargetLabel']);
    expect(Array.isArray(tsData.Areas)).toBe(true);

    const area = (tsData.Areas as Record<string, unknown>[])[0];
    expectKeys(area, ['AreaCode', 'AreaID', 'AreaName', 'TimeSeriesData']);
    expect(Array.isArray(area.TimeSeriesData)).toBe(true);

    const point = (area.TimeSeriesData as Record<string, unknown>[])[0];
    expectKeys(point, [
      'TimePeriodID', 'TimePeriodName', 'Value',
      'Numerator', 'Denominator', 'Factor',
      'TimeseriesNotificationCount',
    ]);
  });
});

// ---------- Data Availability ----------

describe('GET /dataAvailability', () => {
  it('returns DataAvailability key as array', async () => {
    const data = await fetchJSON<Record<string, unknown>>(
      `/dataAvailability?timePeriodID=${timePeriodId}&systemLevelID=1`
    );

    expect(data).toHaveProperty('DataAvailability');
    expect(Array.isArray(data.DataAvailability)).toBe(true);
  });
});
