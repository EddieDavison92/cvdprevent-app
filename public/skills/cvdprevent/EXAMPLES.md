# CVDPREVENT response examples

These abbreviated examples show the nesting used by common routes. Values and IDs are illustrative; resolve them from the live API for every answer. See `https://www.cvdprevent-explorer.app/api-reference.md` for the full field lists.

## Periods

`GET /timePeriod`

```json
{
  "timePeriodList": [
    {
      "TimePeriodID": 33,
      "TimePeriodName": "To March 2026",
      "StartDate": "Tue, 01 Apr 2025 00:00:00 GMT",
      "EndDate": "Tue, 31 Mar 2026 00:00:00 GMT",
      "IndicatorTypeID": 1,
      "IndicatorTypeName": "Standard"
    },
    {
      "TimePeriodID": 32,
      "TimePeriodName": "Jan 2025 - Dec 2025",
      "EndDate": "Tue, 31 Mar 2026 00:00:00 GMT",
      "IndicatorTypeName": "Outcomes"
    }
  ]
}
```

Filter by `IndicatorTypeName`, parse `EndDate`, and show `TimePeriodName` to the user.

## Organisation search

`GET /area/search?partialAreaName=North%20Central%20London&timePeriodID=33`

```json
{
  "foundAreaList": [
    {
      "AreaID": 8063,
      "AreaCode": "E54000028",
      "OdsCode": "QMJ",
      "AreaName": "NHS North Central London Integrated Care Board",
      "SystemLevelID": 7,
      "SystemLevelName": "ICB"
    },
    {
      "AreaID": 7951,
      "AreaCode": "93C",
      "AreaName": "NHS North Central London ICB - 93C",
      "SystemLevelID": 8,
      "SystemLevelName": "Sub-ICB"
    }
  ]
}
```

The shared name does not make these interchangeable. Check the level and code.

## Indicator catalogue

`GET /indicator/list?timePeriodID=33&systemLevelID=7`

```json
{
  "indicatorList": [
    {
      "IndicatorID": 58,
      "IndicatorCode": "CVDP003HF",
      "IndicatorShortName": "HF: Treatment with four pillar model",
      "IndicatorName": "Patients with GP recorded heart failure with reduced ejection fraction ...",
      "FormatDisplayName": "Proportion %",
      "AxisCharacter": "%"
    }
  ]
}
```

Use `IndicatorCode` as authoritative even if a code embedded in display text differs.

## Focused indicator and demographics

`GET /indicator/58/data?timePeriodID=33&areaID=8063`

```json
{
  "indicatorData": {
    "IndicatorID": 58,
    "IndicatorCode": "CVDP003HF",
    "TimePeriodID": 33,
    "TimePeriodName": "To March 2026",
    "FormatDisplayName": "Proportion %",
    "Categories": [
      {
        "MetricID": 1493,
        "MetricCategoryTypeName": "Sex",
        "MetricCategoryName": "Persons",
        "CategoryAttribute": "Persons",
        "AreaData": {
          "AreaID": 8063,
          "Value": 43.96,
          "Numerator": 1370,
          "Denominator": 3115,
          "LowerConfidenceLimit": 42.22,
          "UpperConfidenceLimit": 45.68,
          "ValueNote": null
        },
        "NationalData": {
          "AreaID": 1,
          "Value": 40.83,
          "Numerator": 222040,
          "Denominator": 543755,
          "ValueNote": null
        }
      },
      {
        "MetricCategoryTypeName": "Age group",
        "MetricCategoryName": "40-59",
        "CategoryAttribute": "Persons",
        "AreaData": { "Value": 59.89, "Denominator": 455 },
        "NationalData": { "Value": 55.15, "Denominator": 71775 }
      },
      {
        "MetricCategoryTypeName": "Age group",
        "MetricCategoryName": "40-59",
        "CategoryAttribute": "Male",
        "AreaData": { "Value": 62.82 },
        "NationalData": { "Value": 57.48 }
      },
      {
        "MetricCategoryTypeName": "Deprivation quintile",
        "MetricCategoryName": "4",
        "CategoryAttribute": "Persons",
        "AreaData": { "Value": 38.64 },
        "NationalData": { "Value": 40.47 }
      }
    ]
  }
}
```

The overall row is Sex / Persons. Age is crossed with sex; select `CategoryAttribute: Persons` for a persons-only age table.

## Compact two-organisation summary

`GET /api/cvdprevent/summary?timePeriodID=33&areaID=8063&comparisonAreaID=8038`

```json
{
  "TimePeriodID": 33,
  "SubjectArea": { "AreaID": 8063, "AreaName": "NHS North Central London Integrated Care Board" },
  "ComparisonArea": { "AreaID": 8038, "AreaName": "NHS North West London Integrated Care Board" },
  "Counts": {
    "subjectIndicators": 47,
    "comparable": 47,
    "favourable": 2,
    "similar": 10,
    "unfavourable": 28,
    "recordedPrevalence": { "higher": 1, "similar": 5, "lower": 1 }
  },
  "Indicators": [
    {
      "IndicatorCode": "CVDP003HF",
      "Polarity": "higher is better",
      "Subject": { "Value": 43.96 },
      "Comparison": { "Value": 42.16 },
      "Difference": 1.8,
      "DifferenceUnit": "percentage points",
      "Relation": "higher",
      "Assessment": "favourable"
    }
  ]
}
```

Counts can change with a later release. Confirm that directional counts plus recorded prevalence, unclassified, and missing categories reconcile with the returned subject indicators.

## Trend

`GET /indicator/timeSeriesByMetric/{metricId}?areaID={areaId}`

```json
{
  "Data": {
    "Areas": [
      {
        "AreaID": 8063,
        "AreaName": "NHS North Central London Integrated Care Board",
        "TimeSeriesData": [
          { "TimePeriodID": 17, "TimePeriodName": "To March 2024", "Value": 37.2 },
          { "TimePeriodID": 33, "TimePeriodName": "To March 2026", "Value": 43.96 }
        ]
      }
    ]
  }
}
```

Select the requested `AreaID` and sort periods by dates from `/timePeriod` before calculating change.
