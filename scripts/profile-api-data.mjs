const BASE_URL = 'https://api.cvdprevent.nhs.uk';

async function fetchJson(endpoint) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${endpoint}`);
  return response.json();
}

function latestPeriod(periods, type) {
  return periods
    .filter((period) => period.IndicatorTypeName.toLowerCase().startsWith(type))
    .sort((a, b) => b.TimePeriodID - a.TimePeriodID)[0];
}

function duplicates(rows, key) {
  const seen = new Set();
  const repeated = new Set();
  for (const row of rows) {
    if (seen.has(row[key])) repeated.add(row[key]);
    seen.add(row[key]);
  }
  return repeated.size;
}

function personsCategory(indicator) {
  return indicator.Categories?.find(
    (category) => category.MetricCategoryTypeName === 'Sex' && category.MetricCategoryName === 'Persons',
  );
}

async function profilePeriod(period) {
  const { systemLevels } = await fetchJson(`/area/systemLevel?timePeriodID=${period.TimePeriodID}`);
  const levelProfiles = await Promise.all(systemLevels.map(async (level) => {
    const [{ areaList }, { indicatorList }] = await Promise.all([
      fetchJson(`/area?timePeriodID=${period.TimePeriodID}&systemLevelID=${level.SystemLevelID}`),
      fetchJson(`/indicator/list?timePeriodID=${period.TimePeriodID}&systemLevelID=${level.SystemLevelID}`),
    ]);

    let areaIndicators = [];
    if (areaList.length > 0) {
      const response = await fetchJson(`/indicator?timePeriodID=${period.TimePeriodID}&areaID=${areaList[0].AreaID}`);
      areaIndicators = response.indicatorList ?? [];
    }

    const missingAreaFields = areaList.filter((area) => (
      !area.AreaID || !area.AreaCode || !area.AreaName || !area.SystemLevelID || !Array.isArray(area.Parents)
    )).length;
    const missingIndicatorFields = indicatorList.filter((indicator) => (
      !indicator.IndicatorID || !indicator.IndicatorCode || !indicator.IndicatorName || !indicator.IndicatorShortName
    )).length;
    const missingPersons = areaIndicators.filter((indicator) => !personsCategory(indicator)).length;
    const nullPersonsCodes = areaIndicators.filter((indicator) => {
      const category = personsCategory(indicator);
      return category && category.Data?.Value == null;
    }).map((indicator) => indicator.IndicatorCode);

    return {
      id: level.SystemLevelID,
      level: level.SystemLevelName,
      visible: level.IsVisible,
      areas: areaList,
      areaCount: areaList.length,
      duplicateAreaIds: duplicates(areaList, 'AreaID'),
      duplicateAreaCodes: duplicates(areaList, 'AreaCode'),
      missingAreaFields,
      indicatorCount: indicatorList.length,
      duplicateIndicatorCodes: duplicates(indicatorList, 'IndicatorCode'),
      missingIndicatorFields,
      representativeArea: areaList[0]?.AreaName ?? '—',
      representativeIndicatorCount: areaIndicators.length,
      missingPersons,
      nullPersonsValues: nullPersonsCodes.length,
      nullPersonsCodes,
      indicatorCodes: new Set(indicatorList.map((indicator) => indicator.IndicatorCode)),
    };
  }));

  const allAreaIds = new Set(levelProfiles.flatMap((profile) => profile.areas.map((area) => area.AreaID)));
  const unknownParents = levelProfiles.flatMap((profile) => profile.areas.flatMap(
    (area) => area.Parents.filter((parentId) => !allAreaIds.has(parentId)),
  ));
  const nationalCodes = levelProfiles.find((profile) => profile.id === 1)?.indicatorCodes ?? new Set();
  for (const profile of levelProfiles) {
    profile.missingVsNational = [...nationalCodes].filter((code) => !profile.indicatorCodes.has(code));
  }

  console.log(`\n${period.IndicatorTypeName}: ${period.TimePeriodName} (ID ${period.TimePeriodID}, ends ${period.EndDate})`);
  console.table(levelProfiles.map((profile) => ({
    ID: profile.id,
    Level: profile.level,
    Visible: profile.visible,
    Areas: profile.areaCount,
    'Duplicate IDs': profile.duplicateAreaIds,
    'Duplicate codes': profile.duplicateAreaCodes,
    'Missing area fields': profile.missingAreaFields,
    Indicators: profile.indicatorCount,
    'Missing vs national': profile.missingVsNational.length,
    'Area indicators': profile.representativeIndicatorCount,
    'No Persons': profile.missingPersons,
    'Null Persons': profile.nullPersonsValues,
  })));
  for (const profile of levelProfiles.filter((item) => item.missingVsNational.length > 0)) {
    console.log(`- ${profile.level} unavailable indicators: ${profile.missingVsNational.join(', ')}`);
  }
  for (const profile of levelProfiles.filter((item) => item.nullPersonsCodes.length > 0)) {
    console.log(`- ${profile.level} null Persons values in ${profile.representativeArea}: ${profile.nullPersonsCodes.join(', ')}`);
  }

  const issues = levelProfiles.flatMap((profile) => [
    profile.duplicateIndicatorCodes && `${profile.level}: ${profile.duplicateIndicatorCodes} duplicate indicator codes`,
    profile.missingIndicatorFields && `${profile.level}: ${profile.missingIndicatorFields} indicators missing required fields`,
    profile.nullPersonsValues && `${profile.level}: ${profile.nullPersonsValues} null Persons values in representative area ${profile.representativeArea}`,
  ].filter(Boolean));
  if (unknownParents.length) {
    issues.push(`${unknownParents.length} organisation parent references (${new Set(unknownParents).size} IDs) were not returned by the period's area lists`);
  }

  return { period, levelProfiles, issues };
}

const { timePeriodList } = await fetchJson('/timePeriod');
const periods = [latestPeriod(timePeriodList, 'standard'), latestPeriod(timePeriodList, 'outcome')].filter(Boolean);
const profiles = [];
for (const period of periods) profiles.push(await profilePeriod(period));

const issues = profiles.flatMap((profile) => profile.issues);
console.log(`\nProfile result: ${issues.length === 0 ? 'no structural gaps found' : `${issues.length} warning(s)`}`);
for (const issue of issues) console.log(`- ${issue}`);
