# CVDPREVENT response examples

These abbreviated examples show the nesting used by common routes. Values and IDs are illustrative; resolve them from the live API for every answer. Fields not needed to explain the nesting are omitted. See `https://www.cvdprevent-explorer.app/api-reference.md` for every observed field.

Read the sections for the routes you will use. Do not transfer an `AreaID`, `IndicatorID`, `MetricID`, or period from an example into a live answer.

## Contents

- Periods and organisation levels
- Organisation search and relationships
- Indicator catalogue, all-indicator data, and focused data
- Metadata and demographic rows
- Geographic peers, child areas, system comparisons, and raw data
- Compact summary and trend data

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

## Organisation levels

`GET /area/systemLevel?timePeriodID=33`

```json
{
  "systemLevels": [
    {
      "SystemLevelID": 7,
      "SystemLevelName": "ICB",
      "SystemLevelOrder": 7,
      "NationalLevel": false,
      "IsVisible": true
    },
    {
      "SystemLevelID": 8,
      "SystemLevelName": "Sub-ICB",
      "SystemLevelOrder": 8,
      "NationalLevel": false,
      "IsVisible": true
    }
  ]
}
```

Use only levels returned for the selected period.

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

## Organisation relationships

`GET /area/8063/details?timePeriodID=33`

```json
{
  "areaDetails": {
    "AreaID": 8063,
    "AreaCode": "E54000028",
    "AreaOdsCode": "QMJ",
    "AreaName": "NHS North Central London Integrated Care Board",
    "SystemLevelID": 7,
    "SystemLevelName": "ICB",
    "ParticipationRate": null,
    "PopulationRate": null,
    "ParentAreaList": [
      {
        "AreaID": 7669,
        "AreaCode": "E40000003",
        "AreaName": "London",
        "SystemLevelID": 6,
        "SystemLevelName": "Region"
      }
    ],
    "ChildAreaList": [
      {
        "AreaID": 7951,
        "AreaCode": "E38000240",
        "AreaName": "NHS North Central London ICB - 93C",
        "SystemLevelID": 8,
        "SystemLevelName": "Sub-ICB"
      }
    ]
  }
}
```

Choose a parent or child by its returned level and identity. Do not infer hierarchy from a name or assume the first numeric parent ID is the requested benchmark.

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

## All indicators for one organisation

`GET /indicator?timePeriodID=33&areaID=8063`

```json
{
  "indicatorList": [
    {
      "IndicatorID": 58,
      "IndicatorCode": "CVDP003HF",
      "IndicatorShortName": "HF: Treatment with four pillar model",
      "IndicatorName": "Patients with GP recorded heart failure with reduced ejection fraction ...",
      "IndicatorTypeID": 1,
      "IndicatorTypeName": "Standard",
      "FormatDisplayName": "Proportion %",
      "AxisCharacter": "%",
      "Categories": [
        {
          "MetricID": 1493,
          "MetricCategoryID": 30,
          "MetricCategoryTypeName": "Sex",
          "MetricCategoryName": "Persons",
          "CategoryAttribute": "Persons",
          "Data": {
            "AreaID": 8063,
            "TimePeriodID": 33,
            "Value": 43.96,
            "Numerator": 1370,
            "Denominator": 3115,
            "Count": 42,
            "Min": 26.1,
            "Median": 40.5,
            "Max": 54.9,
            "Q20": 34.2,
            "Q40": 39.1,
            "Q60": 42.4,
            "Q80": 46.8,
            "LowerConfidenceLimit": 42.22,
            "UpperConfidenceLimit": 45.68,
            "ValueNote": null
          },
          "TimeSeries": [
            {
              "TimePeriodID": 33,
              "TimePeriodName": "To March 2026",
              "EndDate": "Tue, 31 Mar 2026 00:00:00 GMT",
              "Value": 43.96,
              "Numerator": 1370,
              "Denominator": 3115,
              "Median": 40.5
            }
          ]
        }
      ]
    }
  ]
}
```

This route can be large because it returns every category and its embedded time series. The current result is `Categories[].Data`; it is not `AreaData`. `Count`, distribution bounds, median, and quintiles describe the same-level organisation distribution, not patients.

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

The full `AreaData` and `NationalData` objects can also contain:

```json
{
  "AreaCode": "E54000028",
  "AreaID": 8063,
  "AreaName": "NHS North Central London Integrated Care Board",
  "Count": 42,
  "DataID": 16823456,
  "Denominator": 3115,
  "Factor": null,
  "HighestPriorityNotificationType": null,
  "LowerConfidenceLimit": 42.22,
  "Max": 54.9,
  "Median": 40.5,
  "Min": 26.1,
  "NotificationCount": 0,
  "Numerator": 1370,
  "Q20": 34.2,
  "Q40": 39.1,
  "Q60": 42.4,
  "Q80": 46.8,
  "TimePeriodID": 33,
  "TimePeriodName": "To March 2026",
  "UpperConfidenceLimit": 45.68,
  "Value": 43.96,
  "ValueNote": null
}
```

These distribution fields belong to the organisation level in context. Do not report `Count` as the number of patients.

## Suppressed and age-standardised rows

Do not replace a missing value with zero:

```json
{
  "MetricCategoryTypeName": "Learning Disability",
  "MetricCategoryName": "With diagnosed learning disability",
  "CategoryAttribute": "Persons",
  "AreaData": {
    "Value": null,
    "Numerator": null,
    "Denominator": null,
    "ValueNote": "Value suppressed due to disclosure control"
  }
}
```

Age-standardised rows may publish a value without counts:

```json
{
  "MetricCategoryTypeName": "Deprivation quintile - Age Standardised",
  "MetricCategoryName": "4",
  "CategoryAttribute": "Persons",
  "AreaData": {
    "Value": 2.04,
    "Numerator": null,
    "Denominator": null,
    "ValueNote": "Numerators and Denominators are not provided for Age Standardisation."
  }
}
```

Do not pool an age-standardised value from numerator and denominator fields.

## Indicator metadata

`GET /indicator/58/details`

```json
{
  "indicatorDetails": {
    "IndicatorID": 58,
    "IndicatorCode": "CVDP003HF",
    "IndicatorShortName": "HF: Treatment with four pillar model",
    "IndicatorName": "Patients with GP recorded heart failure with reduced ejection fraction ...",
    "IndicatorStatus": null,
    "DataUpdateInterval": null,
    "MetaData": {
      "Section 1: Indicator Overview & Rationale": [
        {
          "MetaDataCategoryID": 1,
          "CategoryName": "Section 1: Indicator Overview & Rationale",
          "MetaDataTitle": "Definition",
          "MetaData": "The percentage of patients aged 18 and over ...",
          "AgeStandardised": "N"
        },
        {
          "MetaDataCategoryID": 1,
          "CategoryName": "Section 1: Indicator Overview & Rationale",
          "MetaDataTitle": "Rationale",
          "MetaData": "Monitoring the four pillar model for HFrEF ...",
          "AgeStandardised": "N"
        }
      ],
      "Section 2: Data and Construction": [
        {
          "MetaDataTitle": "Definition of numerator",
          "MetaData": "Patients in the denominator treated ..."
        },
        {
          "MetaDataTitle": "Definition of denominator",
          "MetaData": "Patients aged 18 and over ..."
        }
      ],
      "Section 4: Interpretation and risks": [
        {
          "MetaDataTitle": "Disclosure control",
          "MetaData": "Suppressed sub-national counts between 1 and 7."
        }
      ]
    }
  }
}
```

`MetaData` is an object keyed by section name, not one flat array. Read every section because construction, disclosure, rounding, and interpretation can appear separately.

## Geographic peers

`GET /indicator/siblingData?timePeriodID=33&areaID=8063&metricID=1493`

```json
{
  "siblingData": {
    "IndicatorID": 58,
    "IndicatorCode": "CVDP003HF",
    "MetricCategoryTypeName": "Sex",
    "MetricCategoryName": "Persons",
    "CategoryAttribute": "Persons",
    "Data": [
      {
        "AreaID": 8063,
        "AreaCode": "E54000028",
        "AreaName": "NHS North Central London Integrated Care Board",
        "SystemLevelID": 7,
        "TimePeriodID": 33,
        "TimePeriodName": "To March 2026",
        "Value": 43.96,
        "Numerator": 1370,
        "Denominator": 3115,
        "ValueNote": null
      }
    ]
  }
}
```

The selected organisation is included. These are same-level areas sharing a parent, not matched statistical peers.

## Immediate child areas

`GET /indicator/childData?timePeriodID=33&areaID=8063&metricID=1493`

```json
{
  "childData": {
    "IndicatorID": 58,
    "IndicatorCode": "CVDP003HF",
    "MetricCategoryTypeName": "Sex",
    "MetricCategoryName": "Persons",
    "Data": [
      {
        "AreaID": 7951,
        "AreaName": "NHS North Central London ICB - 93C",
        "SystemLevelID": 8,
        "Value": 43.91,
        "Numerator": 1365,
        "Denominator": 3110,
        "ValueNote": null
      }
    ]
  }
}
```

Use this for immediate children only. Use the area-breakdown route for deeper descendant levels.

## Same-level system comparison

`GET /indicator/metricSystemLevelComparison/1493?timePeriodID=33&areaID=8063`

```json
{
  "Data": {
    "TargetLabel": null,
    "TargetValue": null,
    "SystemLevels": [
      {
        "SystemLevelID": 7,
        "SystemLevelName": "ICB",
        "SystemLevelOrder": 7,
        "NationalLevel": false,
        "SystemLevelMedian": 40.5,
        "ComparisonData": [
          {
            "AreaID": 8063,
            "AreaCode": "E54000028",
            "AreaName": "NHS North Central London Integrated Care Board",
            "Value": 43.96,
            "Numerator": 1370,
            "Denominator": 3115,
            "Factor": null
          }
        ]
      }
    ]
  }
}
```

Select the returned system level rather than assuming the first level is the one requested. `SystemLevelMedian` is the middle published area value at that level; it is not England and is not a pooled patient result.

## Descendant area breakdown

`GET /indicator/metricAreaBreakdown/1493?timePeriodID=33&areaID=8063`

```json
{
  "Data": {
    "SystemLevels": [
      {
        "SystemLevelID": 4,
        "SystemLevelName": "PCN",
        "SystemLevelMedian": 41.2,
        "ComparisonData": [
          {
            "AreaID": 1234,
            "AreaCode": "ABC PCN",
            "AreaName": "Example PCN",
            "ParentAreaID": 7951,
            "Value": 40.71,
            "Numerator": 45,
            "Denominator": 115
          }
        ]
      }
    ]
  }
}
```

The response may contain several descendant levels. Select by `SystemLevelID`, remove null values before ranking, and keep the parent identity when supplied.

## Raw data across one organisation level

`GET /indicator/58/rawDataJSON?timePeriodID=33&systemLevelID=7`

```json
{
  "indicatorRawData": [
    {
      "AreaCode": "E54000028",
      "AreaName": "NHS North Central London Integrated Care Board",
      "IndicatorCode": "CVDP003HF",
      "IndicatorName": "Patients with GP recorded heart failure with reduced ejection fraction ...",
      "IndicatorShortName": "HF: Treatment with four pillar model",
      "MetricCategoryTypeName": "Sex",
      "MetricCategoryName": "Persons",
      "CategoryAttribute": "Persons",
      "TimePeriodName": "To March 2026",
      "Value": 43.96,
      "Numerator": 1370,
      "Denominator": 3115,
      "LowerConfidenceLimit": 42.22,
      "UpperConfidenceLimit": 45.68,
      "Factor": null,
      "ValueNote": null
    }
  ]
}
```

The official route can return every demographic row for every area. Filter locally to the intended category. The relay supports category filters so constrained fetch tools can request Sex / Persons only.

## Data availability

`GET /dataAvailability?timePeriodID=33&systemLevelID=7&indicatorID=58`

```json
{
  "DataAvailability": [
    {
      "DataAvailabilityID": 123,
      "DataAvailabilityName": "Age group",
      "IndicatorID": 58,
      "IsAvailable": "Y",
      "MetricCategoryTypeID": 2,
      "MetricCategoryTypeName": "Age group",
      "SystemLevelID": 7,
      "TimePeriodID": 33
    }
  ]
}
```

Treat availability as discovery metadata. Verify the focused response because the availability array can be empty or disagree with published category rows.

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
