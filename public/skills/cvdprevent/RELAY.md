# CVDPREVENT Agent API relay fallback

Use this only when direct requests to `https://api.cvdprevent.nhs.uk` are blocked or a fetch tool refuses constructed URLs.

Start here and follow returned URLs exactly:

```text
https://www.cvdprevent-explorer.app/api/cvdprevent?agentVersion=5
```

Do not replace, shorten, decode, or reorder query strings. The version parameter avoids stale pre-link responses.

## Link sequence

1. Follow `_links.timePeriods`.
2. Filter `timePeriodList` by `IndicatorTypeName`, parse `EndDate`, and select the latest row.
3. Follow that row's `_links.navigation`.
4. Choose the needed organisation-level URL from `_links.areas`.
5. Select an area only after checking `AreaName`, `AreaCode`, and `SystemLevelID`.
6. Follow the area row's links for details, indicators, or an organisation summary.

Link locations:

- API index: `timePeriods`, `polarity`, `skill`, `responseExamples`, `relayGuide`, and `apiReference`.
- Period row: `navigation`.
- Period navigation: exact `areas`, `indicatorLists`, and `dataAvailability` URLs for each published level.
- Area row: `details`, `summaryVsEngland`, `indicatorList`, and `allIndicatorsLarge`.
- Parent row in area details: `summaryForSubject`.
- Indicator row: `details`, `data`, filtered raw Persons data, and availability.
- Metric category: trend, geographic peers, immediate children, area breakdown, system-level comparison, and national-and-area links.

The linked summary defaults to England. Its `comparisonAreaID` can instead be any resolved published organisation in the same period. It returns one Sex / Persons row per indicator and applies the explorer's machine-readable polarity rules.

## Focused indicator example

For “Compare an ICB's four-pillar heart-failure treatment with its region”:

1. Resolve the latest Standard period through the period links.
2. Select the ICB-level area list and resolve the ICB.
3. Follow the ICB's `details` link and select its Region parent.
4. Follow the ICB's `indicatorList`, match exact `IndicatorCode == CVDP003HF`, then follow `data`.
5. Select Sex / Persons and read `AreaData.Value`.
6. Follow the Region row's `indicatorList`, match the same `IndicatorCode`, follow `data`, and read its Sex / Persons `AreaData.Value`.
7. Report both values, their percentage-point difference, `TimePeriodName`, and the indicator code.

Never reuse IDs from an example or earlier answer.

## Large responses

Prefer focused `data` links. The all-indicator route is large. For an organisation overview, use `summaryVsEngland`, `summaryForSubject`, or the summary route with a resolved `comparisonAreaID`.

The relay's raw-data link can filter by exact `metricCategoryTypeName`, `metricCategoryName`, and `categoryAttribute`. Use its Sex / Persons link for all-organisation comparisons rather than fetching every demographic row.

The relay excludes CSV and XLSX downloads. Use the official API for file exports.
