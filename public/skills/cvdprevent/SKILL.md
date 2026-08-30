---
name: cvdprevent-data-explorer
description: Look up and compare public aggregate CVDPREVENT cardiovascular prevention indicators for NHS organisations in England, including regions, ICBs, sub-ICBs, PCNs, and practices. Use for questions about values, trends, comparisons, pathways, inequalities, metadata, or organisation performance.
---

# CVDPREVENT data explorer

Answer questions about aggregate cardiovascular prevention data in England using the public CVDPREVENT API. The API needs no authentication and returns JSON.

## Sources

- Explorer: https://cvdprevent-explorer.app
- Skill: https://cvdprevent-explorer.app/skill.md
- API field and route reference: https://cvdprevent-explorer.app/api-reference.md
- Agent API index: https://cvdprevent-explorer.app/api/cvdprevent?agentVersion=4
- Agent API route prefix: https://cvdprevent-explorer.app/api/cvdprevent
- Official API origin: https://api.cvdprevent.nhs.uk
- Official CVDPREVENT site: https://www.cvdprevent.nhs.uk
- Official API documentation: https://bmchealthdocs.atlassian.net/wiki/spaces/CP/pages/317882369/CVDPREVENT+API+Documentation

Use the official API directly whenever the environment provides a shell, code execution, or an HTTP client that accepts constructed URLs. Treat route templates below as relative to `https://api.cvdprevent.nhs.uk`. Field names are case-sensitive.

Use `curl`, Python, or the environment's native HTTP client. Fetch large responses into a file or variable and parse them locally rather than printing megabytes of JSON into the conversation. For example:

```bash
curl -fsS "https://api.cvdprevent.nhs.uk/timePeriod"
curl -fsS --get "https://api.cvdprevent.nhs.uk/area/search" \
  --data-urlencode "partialAreaName=North West London" \
  --data-urlencode "timePeriodID=33"
```

The Agent API relay is a compatibility fallback for assistants that cannot run commands or whose fetch tool blocks URLs not seen in an earlier response. In that case, open this exact URL and follow its `_links`:

```text
https://cvdprevent-explorer.app/api/cvdprevent?agentVersion=4
```

Do not use the relay merely for convenience when direct access works. When using it, follow returned URLs exactly without replacing, shortening, decoding, or re-ordering their query strings.

Read the API field and route reference when a question needs metadata, organisation hierarchy, exports, targets, availability, pathway/group definitions, system-level comparisons, or a response field not explained in this file. It lists every route in the official API documentation and all fields observed in the live JSON responses.

## What the IDs mean

- `TimePeriodID` identifies a release period.
- `AreaID` is the API's numeric organisation ID. Do not substitute an ODS code.
- `IndicatorID` identifies an indicator within catalogue and data endpoints.
- `IndicatorCode` is the stable display code, such as `CVDP003HF`. Match indicators between organisations by this code.
- `MetricID` identifies one indicator breakdown, such as Persons or an age band. It is needed for trend, peer, and child-organisation endpoints.

Organisation system levels:

| Level | `systemLevelID` |
|---|---:|
| England | 1 |
| STP (historic periods) | 2 |
| CCG (historic periods) | 3 |
| PCN | 4 |
| Practice | 5 |
| Region | 6 |
| ICB | 7 |
| Sub-ICB | 8 |

Do not assume every level exists in every period. Direct clients call `/area/systemLevel` for the chosen period; relay clients follow the period's `_links.navigation`. Use only the returned `systemLevels`.

## Choose the route

For direct API access, use this sequence and construct the query parameters from IDs returned by the preceding call:

| Task | Official API route |
|---|---|
| List periods | `/timePeriod` |
| List valid organisation levels | `/area/systemLevel?timePeriodID={periodId}` |
| Find an organisation | `/area/search?partialAreaName={encodedName}&timePeriodID={periodId}` |
| List a level when search is ambiguous | `/area?timePeriodID={periodId}&systemLevelID={levelId}` |
| Find parents and children | `/area/{areaId}/details?timePeriodID={periodId}` |
| Find indicators | `/indicator/list?timePeriodID={periodId}&systemLevelID={levelId}` |
| Get one indicator | `/indicator/{indicatorId}/data?timePeriodID={periodId}&areaID={areaId}` |
| Get every indicator for one area | `/indicator?timePeriodID={periodId}&areaID={areaId}` |

Start with `/timePeriod`, resolve IDs rather than guessing them, and then use the focused route that answers the question. For an organisation-wide comparison, fetch `/indicator` once for the subject and once for the comparison, select Sex / Persons categories, and join on `IndicatorCode`.

### Linked relay fallback

Use this only when direct API requests are unavailable or blocked. Open the Agent API index, follow `_links.timePeriods`, choose the period, and then follow the exact link named below.

| User question | Linked route sequence |
|---|---|
| Find an organisation | period `_links.navigation` -> `_links.areas` -> requested level -> filter `areaList` by name |
| Find its parent | area row `_links.details` -> `ParentAreaList` |
| Summarise all indicators against England | area row `_links.summaryVsEngland` |
| Summarise all indicators against a parent | area row `_links.details` -> parent `_links.summaryForSubject` |
| Compare indicators with England or a parent | each area row `_links.indicatorList` -> match `IndicatorCode` -> `_links.data` |
| Compare with geographic peers | Persons category `_links.geographicPeers` |
| Rank one ICB against all ICBs | matched indicator `_links.rawPersonsDataAtSystemLevel` |
| Compare immediate child organisations | Persons category `_links.immediateChildren` |
| Find PCNs or practices below an ICB | Persons category `_links.areaBreakdown` |
| Get a trend | category `_links.trend` |
| Compare demographic groups | each area row `_links.indicatorList` -> indicator `_links.data` -> match category fields |
| Combine organisations into a calculated value | each area row `_links.indicatorList` -> indicator `_links.data` -> aggregation rules below |
| Read definition or construction notes | indicator `_links.details` |
| Check whether a breakdown is published | indicator `_links.dataAvailability` |

The area row's `indicatorList` link includes its `AreaID`, so every catalogue row has an exact `data` link for that organisation. This is the preferred relay route for URL-constrained assistants. The `allIndicatorsLarge` link returns every value and breakdown in one response, but it is several megabytes and may exceed assistant fetch limits.

## Organisation resolver

Resolve organisations before fetching indicator data. Never guess an `AreaID` from an ODS code or reuse an ID from another period.

1. Fetch `/timePeriod` from the official API and select the requested period.
2. Fetch `/area/search` with the name and period. If needed, fetch `/area/systemLevel` and then `/area` for the requested level.
3. Read candidates from `foundAreaList` or `areaList`. Each candidate provides `AreaID`, `AreaName`, `AreaCode`, `AreaOdsCode`, `SystemLevelID`, and `SystemLevelName`.
4. Match the requested level as well as the name. Prefer an exact case-insensitive name after removing generic words such as `NHS`, `Integrated Care Board`, `Sub-ICB Location`, `Primary Care Network`, and `Practice`.
5. If two candidates at the requested level remain plausible, show their names and ODS codes and ask the user to choose.

URL-constrained clients may instead follow the equivalent relay links. Direct clients can call:

   ```text
   GET /area/search?partialAreaName={URL-encoded name}&timePeriodID={periodId}
   ```

Read its candidates from `foundAreaList`. If it returns no clear match, use the linked area list and filter locally.

Common London ICB abbreviations are: NCL = North Central London, NWL = North West London, NEL = North East London, SEL = South East London, and SWL = South West London. Expand these before searching. Do not interpret `North London` as either NCL or NWL without clarification.

Example:

```text
GET /area/search?partialAreaName=North%20West%20London&timePeriodID=33
-> foundAreaList[]
-> choose the row whose SystemLevelID is 7
-> use that row's AreaID in later calls
```

### Resolve the requested comparison

- `England`: use `AreaID=1`.
- `parent`, `region`, or a named parent such as `London`: fetch the subject area's details, read `areaDetails.ParentAreaList`, and select by `SystemLevelID` or `AreaName`. Relay users follow `_links.details`.
- another named organisation: run the organisation resolver separately for that name and level.
- `peers`: clarify whether the user means geographic siblings or every organisation at the same level. Use the recipes below accordingly.

For a London ICB, `compare with London` normally means its parent Region row (`SystemLevelID=6`) from `ParentAreaList`, not another ICB and not a text-only assumption.

## Response shapes

### Periods

`GET /timePeriod` returns:

```json
{
  "timePeriodList": [
    {
      "TimePeriodID": 33,
      "TimePeriodName": "To March 2026",
      "EndDate": "Tue, 31 Mar 2026 00:00:00 GMT",
      "IndicatorTypeName": "Standard",
      "_links": {
        "navigation": "https://cvdprevent-explorer.app/api/cvdprevent/period/33?agentVersion=4"
      }
    }
  ]
}
```

Select the latest `Standard` and `Outcomes` rows independently by parsed `EndDate`. Do not assume the greatest ID is the latest or that both indicator types use the same period.

Follow `navigation` to get only the system levels published for that period and their exact links:

```json
{
  "TimePeriodID": 33,
  "systemLevels": [
    { "SystemLevelID": 7, "SystemLevelName": "ICB" }
  ],
  "_links": {
    "areas": [
      {
        "systemLevelID": 7,
        "systemLevelName": "ICB",
        "href": "https://cvdprevent-explorer.app/api/cvdprevent/area?agentVersion=4&timePeriodID=33&systemLevelID=7"
      }
    ],
    "indicatorLists": [
      {
        "systemLevelID": 7,
        "systemLevelName": "ICB",
        "href": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/list?agentVersion=4&timePeriodID=33&systemLevelID=7"
      }
    ]
  }
}
```

### Organisations

`GET /area?timePeriodID={periodId}&systemLevelID={levelId}` returns:

```json
{
  "areaList": [
    {
      "AreaID": 8038,
      "AreaCode": "E54000027",
      "AreaOdsCode": "QRV",
      "AreaName": "NHS North West London Integrated Care Board",
      "SystemLevelID": 7,
      "SystemLevelName": "ICB",
      "Parents": [7669],
      "_links": {
        "details": "https://cvdprevent-explorer.app/api/cvdprevent/area/8038/details?agentVersion=4&timePeriodID=33",
        "summaryVsEngland": "https://cvdprevent-explorer.app/api/cvdprevent/summary?agentVersion=4&timePeriodID=33&areaID=8038&comparisonAreaID=1",
        "indicatorList": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/list?agentVersion=4&timePeriodID=33&systemLevelID=7&areaID=8038",
        "allIndicatorsLarge": "https://cvdprevent-explorer.app/api/cvdprevent/indicator?agentVersion=4&timePeriodID=33&areaID=8038"
      }
    }
  ]
}
```

Resolve names case-insensitively against `AreaName`. NHS prefixes and organisation suffixes may be present. If more than one match is plausible, show the matches and ask the user to choose. Follow the area's `details` link for named parent information; use the bare `Parents` IDs only as a fallback. England is `areaID=1`.

### Indicator catalogue

`GET /indicator/list?timePeriodID={periodId}&systemLevelID={levelId}&areaID={areaId}` returns `indicatorList`. `areaID` is relay-only and optional; when supplied, each row's `_links.data` points to that organisation. Useful fields are:

```json
{
  "IndicatorID": 58,
  "IndicatorCode": "CVDP003HF",
  "IndicatorShortName": "HF: Treatment with four pillar model",
  "IndicatorName": "Full indicator definition",
  "FormatDisplayName": "Proportion %",
  "AxisCharacter": "%",
  "IndicatorTypeName": "Standard",
  "_links": {
    "details": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/58/details?agentVersion=4",
    "data": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/58/data?agentVersion=4&timePeriodID=33&areaID=8038",
    "rawPersonsDataAtSystemLevel": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/58/rawDataJSON?agentVersion=4&timePeriodID=33&systemLevelID=7&metricCategoryTypeName=Sex&metricCategoryName=Persons",
    "dataAvailability": "https://cvdprevent-explorer.app/api/cvdprevent/dataAvailability?agentVersion=4&timePeriodID=33&systemLevelID=7&indicatorID=58"
  }
}
```

Use `IndicatorShortName` in prose, `IndicatorName` when the user asks for the definition, and `FormatDisplayName` or `AxisCharacter` to format the value. Some short names already end with the indicator code in parentheses; remove that duplicate when also displaying `IndicatorCode`. Do not assume every indicator is a percentage.

### Organisation summary

When direct access works, fetch `/indicator?timePeriodID={periodId}&areaID={areaId}` for the subject and comparison. Select each indicator's Sex / Persons category, join on `IndicatorCode`, and calculate `subject - comparison`. Treat an absolute difference of `0.5` or less as similar, apply polarity only to directional measures, and keep recorded prevalence separate.

When direct access is blocked, use the relay's compact summary. Follow the area row's `_links.summaryVsEngland`, or follow `_links.details` and then the chosen parent row's `_links.summaryForSubject`.

The relay summary returns one Sex / Persons row per indicator. `Counts` separates directional performance from recorded prevalence. `Indicators[]` contains the full indicator descriptor, the subject and comparison metric data, `Difference`, neutral `Relation` (`higher`, `lower`, or `similar`), and polarity-aware `Assessment` (`favourable`, `unfavourable`, `similar`, or null). Recorded prevalence has a null assessment and is counted under `Counts.recordedPrevalence`; describe it as higher or lower recording. Direct clients calculate the same fields from the two official responses.

For a useful overview:

1. Resolve the latest Standard period and obtain both organisations' all-indicator data, directly or through the summary link.
2. Report the comparable, missing-comparison, and unclassified counts.
3. Summarise favourable, similar, and unfavourable directional indicators.
4. Show the largest unfavourable percentage-point gaps. Do not rank percentage gaps with rates or counts on one scale.
5. Report recorded prevalence separately as higher, similar, or lower recording.
6. Resolve the latest Outcomes period separately and repeat when the user asks for all CVDPREVENT indicators. Label each period; do not merge their counts as though they were one release.
7. Call the focused official routes, or use each relay result's `_links`, when the user asks for a trend, breakdown, definition, or validation.

The linked summary covers England and named parents. For an unrelated comparison organisation, resolve both areas and use the `Any two organisations` recipe below.

### All indicators for one organisation

`GET /indicator?timePeriodID={periodId}&areaID={areaId}` returns `indicatorList`. Each indicator contains a `Categories` array:

```json
{
  "IndicatorID": 58,
  "IndicatorCode": "CVDP003HF",
  "IndicatorShortName": "HF: Treatment with four pillar model",
  "IndicatorName": "Full indicator definition",
  "FormatDisplayName": "Proportion %",
  "AxisCharacter": "%",
  "Categories": [
    {
      "MetricID": 1493,
      "MetricCategoryTypeName": "Sex",
      "MetricCategoryName": "Persons",
      "CategoryAttribute": "Persons",
      "Data": {
        "Value": 42.16,
        "Numerator": 2715,
        "Denominator": 6445,
        "LowerConfidenceLimit": 40.96,
        "UpperConfidenceLimit": 43.36,
        "TimePeriodID": 33,
        "ValueNote": null
      },
      "TimeSeries": [],
      "_links": {
        "trend": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/timeSeriesByMetric/1493?agentVersion=4&areaID=8038",
        "geographicPeers": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/siblingData?agentVersion=4&timePeriodID=33&areaID=8038&metricID=1493",
        "areaBreakdown": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/metricAreaBreakdown/1493?agentVersion=4&timePeriodID=33&areaID=8038"
      }
    }
  ]
}
```

The headline category is exactly:

```text
MetricCategoryTypeName == "Sex" AND MetricCategoryName == "Persons"
```

Read the current value from `Categories[].Data.Value`, not from the catalogue. `Numerator` and `Denominator` describe the eligible indicator population; they are not the organisation's total population. In focused data, `Count` is normally the number of organisations in the comparison distribution, while `Min`, `Max`, `Median`, and `Q20` through `Q80` describe that distribution. They are not patient values; confirm their context before reporting them.

Other category types include `Age group`, `Ethnicity`, `Deprivation quintile`, `Mental Health`, and `Learning Disability`. Enumerate the category types returned by the API rather than treating that list as exhaustive. Compare the same breakdown between organisations by `MetricCategoryTypeName`, `MetricCategoryName`, and `CategoryAttribute`; state when either side is missing.

## Query workflow

1. Identify the organisation level, organisation name, indicator or condition, comparison geography, and requested period. If the organisation level is omitted, infer it only when the name is unambiguous.
2. Fetch `/timePeriod` and select the needed period by `IndicatorTypeName` and latest parsed `EndDate`.
3. Use the organisation resolver, then fetch `/indicator/list?timePeriodID={periodId}&systemLevelID={levelId}`.
4. Find the indicator by exact `IndicatorCode` first, then exact or distinctive words in `IndicatorShortName` and `IndicatorName`. If several match, show them rather than choosing silently.
5. Fetch `/indicator/{indicatorId}/data?timePeriodID={periodId}&areaID={areaId}`, select the Persons category, and read `AreaData.Value`. Its `NationalData.Value` is the England comparison.
6. For a parent or another organisation, resolve its ID and level, find the same `IndicatorCode`, make its focused data request, and read `AreaData.Value`.
7. Retain the Persons category's `MetricID` for trends, peers, ranks, and lower-level comparisons.
8. Confirm both results have the same indicator code, period, category type, category name, and category attribute before comparing them.
9. Calculate `subject value - comparison value`. For percentage measures, report this as percentage points (`pp`). Keep enough precision to avoid turning a small non-zero difference into a misleading `0.0pp`.
10. State missing, suppressed, null, or differently dated data. Never estimate a missing value.

Focused comparison response paths:

```text
indicatorData.IndicatorCode
indicatorData.IndicatorShortName
indicatorData.FormatDisplayName
indicatorData.TimePeriodName
indicatorData.Categories[]
  -> MetricID
  -> MetricCategoryTypeName
  -> MetricCategoryName
  -> CategoryAttribute
  -> AreaData.Value
  -> AreaData.Numerator
  -> AreaData.Denominator
  -> AreaData.ValueNote
  -> NationalData.Value
  -> NationalData.Numerator
  -> NationalData.Denominator
  -> NationalData.ValueNote
```

`AreaData` is the requested `areaID`; `NationalData` is England. For a parent or another organisation, make the second focused call and subtract its `AreaData.Value`. Do not use its `NationalData` as though it represented that parent.

## Common response examples

These are abridged live response shapes; unneeded fields are omitted.

Focused indicator data:

```json
{
  "indicatorData": {
    "IndicatorID": 58,
    "IndicatorCode": "CVDP003HF",
    "IndicatorShortName": "HF: Treatment with four pillar model",
    "FormatDisplayName": "Proportion %",
    "Categories": [
      {
        "MetricID": 1493,
        "MetricCategoryTypeName": "Sex",
        "MetricCategoryName": "Persons",
        "CategoryAttribute": "Persons",
        "AreaData": {
          "AreaID": 8038,
          "AreaName": "NHS North West London Integrated Care Board",
          "Value": 42.16,
          "Numerator": 2715,
          "Denominator": 6445,
          "TimePeriodID": 33,
          "TimePeriodName": "To March 2026",
          "ValueNote": null
        },
        "NationalData": {
          "AreaID": 1,
          "AreaName": "England",
          "Value": 40.83,
          "Numerator": 51265,
          "Denominator": 125546,
          "TimePeriodID": 33,
          "ValueNote": null
        },
        "_links": {
          "trend": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/timeSeriesByMetric/1493?agentVersion=4&areaID=8038",
          "geographicPeers": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/siblingData?agentVersion=4&timePeriodID=33&areaID=8038&metricID=1493",
          "immediateChildren": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/childData?agentVersion=4&timePeriodID=33&areaID=8038&metricID=1493",
          "areaBreakdown": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/metricAreaBreakdown/1493?agentVersion=4&timePeriodID=33&areaID=8038",
          "systemLevelComparison": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/metricSystemLevelComparison/1493?agentVersion=4&timePeriodID=33&areaID=8038",
          "nationalAndArea": "https://cvdprevent-explorer.app/api/cvdprevent/indicator/nationalVsAreaMetricData/1493?agentVersion=4&timePeriodID=33&areaID=8038"
        }
      }
    ]
  }
}
```

Parent lookup:

```json
{
  "areaDetails": {
    "AreaID": 8038,
    "AreaName": "NHS North West London Integrated Care Board",
    "ParentAreaList": [
      {
        "AreaID": 7669,
        "AreaName": "London",
        "SystemLevelID": 6,
        "SystemLevelName": "Region"
      }
    ]
  }
}
```

Sibling or geographic-peer data:

```json
{
  "siblingData": {
    "IndicatorCode": "CVDP003HF",
    "MetricCategoryTypeName": "Sex",
    "MetricCategoryName": "Persons",
    "Data": [
      {
        "AreaID": 8059,
        "AreaName": "NHS South East London Integrated Care Board",
        "SystemLevelID": 7,
        "Value": 54.89,
        "TimePeriodName": "To March 2026"
      }
    ]
  }
}
```

All-ICB raw data:

```json
{
  "indicatorRawData": [
    {
      "AreaCode": "E54000040",
      "AreaName": "NHS Bath and North East Somerset, Swindon and Wiltshire Integrated Care Board",
      "IndicatorCode": "CVDP003HF",
      "MetricCategoryTypeName": "Sex",
      "MetricCategoryName": "Persons",
      "CategoryAttribute": "Persons",
      "Value": 43.43,
      "TimePeriodName": "To March 2026"
    }
  ]
}
```

Lower-level area breakdown:

```json
{
  "Data": {
    "SystemLevels": [
      {
        "SystemLevelID": 4,
        "SystemLevelName": "PCN",
        "ComparisonData": [
          {
            "AreaID": 238,
            "AreaName": "Hammersmith & Fulham Central PCN",
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

Metric trend:

```json
{
  "Data": {
    "Areas": [
      {
        "AreaID": 8038,
        "AreaName": "NHS North West London Integrated Care Board",
        "TimeSeriesData": [
          { "TimePeriodID": 17, "TimePeriodName": "To March 2024", "Value": 0.68 },
          { "TimePeriodID": 33, "TimePeriodName": "To March 2026", "Value": 0.81 }
        ]
      }
    ]
  }
}
```

### Worked relay fallback sequence

For "Compare North West London's four-pillar heart failure treatment with London":

```text
1. Open the Agent API base and follow _links.timePeriods
   -> latest row where IndicatorTypeName == "Standard"
   -> follow that row's _links.navigation

2. Select the ICB href from navigation._links.areas and follow it
   -> areaList[]
   -> North West London row with SystemLevelID == 7

3. Follow that area row's _links.details
   -> areaDetails.ParentAreaList[]
   -> London row with SystemLevelID == 6

4. Follow the North West London row's _links.indicatorList
   -> indicatorList[]
   -> row with IndicatorCode == "CVDP003HF"
   -> follow that row's _links.data
   -> Sex / Persons -> AreaData.Value

5. Follow the London parent row's _links.indicatorList
   -> match IndicatorCode == "CVDP003HF"
   -> follow that row's _links.data
   -> Sex / Persons -> AreaData.Value

6. Report subject value, London value, subject minus London in pp, period,
   indicator name, and CVDP003HF.
```

Follow the returned URLs exactly. Do not substitute IDs copied from this example or from an earlier answer.

## Comparison recipes

The recipes name `_links` for relay users. With direct access, call the corresponding official route shown in `Endpoints for focused questions` using the same IDs.

### Organisation performance overview

Use the `Organisation summary` workflow above. Lead with the comparison basis and period, then the split between favourable, similar, and unfavourable directional indicators. List the largest unfavourable gaps within the same unit, and keep recorded prevalence in a separate higher/lower-recording section. Treat `ValueNote`, null values, and `Counts.missingComparison` as data gaps rather than zeroes.

### Parent organisation

Fetch `/area/{areaId}/details?timePeriodID={periodId}` and read `areaDetails.ParentAreaList[]`. Select the row by `SystemLevelID`, `SystemLevelName`, or requested `AreaName`, then resolve the matched indicator for that parent's level and fetch its data. Relay users can follow the equivalent `_links`. Do not assume the first numeric ID in `Parents` is always the parent level the user means.

### Geographic peers

Select the Persons `MetricID` and call `/indicator/siblingData?timePeriodID={periodId}&areaID={areaId}&metricID={metricId}`, or follow `_links.geographicPeers`. Read rows from `siblingData.Data[]`; use `AreaID`, `AreaName`, and `Value`. The array includes the selected organisation and same-level organisations sharing its parent. For an ICB, this normally means the ICBs in the same region. Call them geographic peers or sibling organisations, not statistically matched peers. Remove null values before sorting.

### One ICB against every ICB

Call `/indicator/{indicatorId}/rawDataJSON?timePeriodID={periodId}&systemLevelID=7` and filter locally to Sex / Persons, or follow the relay's filtered `_links.rawPersonsDataAtSystemLevel`. Locate the selected ICB by `AreaCode` or normalized `AreaName`, remove null values, and sort `Value`. The same pattern works for another level.

Alternatively, follow the Persons category's `_links.systemLevelComparison` for grouped system-level comparisons and medians. Inspect the returned `SystemLevelID` rather than assuming which levels are present.

For a rank, remove null values and sort higher-is-better measures descending or lower-is-better measures ascending. State the number of organisations with data. For recorded prevalence, describe rank as higher or lower recording, not better or worse performance.

### Child organisations

Use the area's `_links.details` for the immediate `areaDetails.ChildAreaList[]`, then follow the Persons category's `_links.immediateChildren`. Read values from `childData.Data[]` using `AreaID`, `AreaName`, `SystemLevelID`, and `Value`.

Follow the Persons category's `_links.areaBreakdown` when the user wants a deeper level. Read `Data.SystemLevels[]`, select the requested `SystemLevelID`, then read its `ComparisonData[]`. For example, to find the lowest PCN under an ICB, select `SystemLevelID=4`, discard rows with null `Value`, and sort ascending. Do not assume PCNs are immediate ICB children.

### Any two organisations

Resolve both areas and levels for the same period. Fetch each level's indicator list, match by `IndicatorCode`, fetch the indicator data for each `AreaID`, and match category rows by `MetricCategoryTypeName`, `MetricCategoryName`, and `CategoryAttribute`. Relay users can follow the corresponding area and indicator links. This supports comparisons that are neither parent-child nor siblings.

### Combine organisations into a calculated value

The API returns published organisations, not a new `AreaID` for an ad hoc combination. This applies when combining two or more ICBs, sub-ICBs, PCNs, or practices. Only calculate a combined result when all selected rows are at the same organisation level and have the same indicator code, period, category fields, unit, and definition.

For a percentage proportion with non-null compatible numerators and denominators:

```text
combined numerator = sum of Numerator
combined denominator = sum of Denominator
combined value = combined numerator / combined denominator * 100
```

Confirm the indicator is a percentage proportion using `FormatDisplayName` and `AxisCharacter`; `Factor` may be null. Never average the displayed percentages. Published numerators and denominators can be rounded, often to five patients, so state that a pooled result inherits this rounding and may differ slightly from an exact calculation. Do not combine confidence limits; calculating a valid combined interval needs the indicator's statistical method. Do not pool age-standardised values, mortality or admission rates, medians, indices, or any result without compatible numerators and denominators. If pooling is not valid, show the organisations separately.

Label the result `Calculated: [organisation A] + [organisation B]`, or similar, and state that it is not a published organisation value. Show each component alongside the calculation so differences are visible. If comparing the combination with a parent, resolve every component's parent and confirm the chosen parent `AreaID` is the same.

### England, region, and other reference lines

England is `areaID=1` and is included as `NationalData` in a focused indicator response. Resolve a region or another parent through the linked `ParentAreaList`, then follow its `indicatorList` link. Do not compare a Standard value with an Outcomes-period value.

For example, to answer "Which heart failure indicators should North West London focus on compared with London?":

1. Resolve the latest Standard period.
2. Resolve North West London at ICB level (`7`) and London at Region level (`6`).
3. Follow both area rows' `_links.indicatorList` URLs for that period.
4. Keep indicators whose code or name identifies heart failure, then follow each matched row's `_links.data`.
5. Match by `IndicatorCode`, extract the Persons `AreaData` values, apply indicator direction, and rank only unfavourable gaps.
6. Report the period, both values, difference, and indicator code. Treat recorded prevalence as higher or lower, not better or worse.

### Demographic comparison

Follow each area's `_links.indicatorList`, match the same indicator, and follow each `_links.data`. Build a category key from:

```text
MetricCategoryTypeName + MetricCategoryName + CategoryAttribute
```

Join category rows on that key. Exclude the Persons headline when the user asks only for demographic gaps. For every matched row with two non-null values, calculate `subject - comparison`; retain the category type as well as its label because labels such as `4` are ambiguous without `Deprivation quintile`. Apply polarity only when judging favourable or unfavourable; the largest absolute numerical gap is not always the largest performance gap.

### Trend

Follow the selected category's `_links.trend` and read `Data.Areas[]`. Select the row whose `AreaID` matches the requested organisation, then sort `TimeSeriesData[]` by the period dates obtained from `/timePeriod` or by known period order. Read `Value`, `TimePeriodID`, and `TimePeriodName`. Report first and latest values and the arithmetic change. A rising line is increasing even when the rounded latest-period change displays as `0.0pp`.

### Metadata and availability

- Definition, construction, exclusions, rationale, or interpretation: follow the indicator's `_links.details` and read every section in `indicatorDetails.MetaData`. Attribute the wording to the API and distinguish it from your own interpretation.
- Breakdown availability: follow the catalogue indicator's `_links.dataAvailability`. Read `DataAvailability[]` and match `MetricCategoryTypeName`; `IsAvailable` is `Y`, `N`, or null. Then verify the indicator response actually contains that category type, because availability metadata and published rows can differ.

## Endpoints for focused questions

- `GET /indicator/{indicatorId}/data?timePeriodID={periodId}&areaID={areaId}` returns one indicator with all breakdown categories. Each category contains `AreaData` for the requested organisation and `NationalData` for England.
- `GET /indicator/timeSeriesByMetric/{metricId}?areaID={areaId}` returns trend data in `Data.Areas[].TimeSeriesData`. Find the requested `AreaID`; use `TimePeriodID`, `TimePeriodName`, and `Value`. Join `TimePeriodID` to `/timePeriod` when exact date sorting is needed.
- `GET /indicator/siblingData?timePeriodID={periodId}&areaID={areaId}&metricID={metricId}` returns peer organisations in `siblingData.Data`.
- `GET /indicator/childData?timePeriodID={periodId}&areaID={areaId}&metricID={metricId}` returns child organisations. Use it for variation within an ICB, sub-ICB, or other parent geography.
- The category's `systemLevelComparison` link returns same-level comparison groups and medians; `nationalAndArea` returns the selected area, England, and any target attached to the metric.

Use the Persons `MetricID` for headline trends and organisation comparisons. Use the matching breakdown `MetricID` for an inequality trend or breakdown comparison.

For every other documented route and its complete response field set, read https://cvdprevent-explorer.app/api-reference.md.

## Interpretation

- Report the organisation, indicator code, reporting period, value, comparison value, and numerical difference.
- Mortality, admissions, undiagnosed or uncoded populations, and potential overtreatment are generally lower-is-better.
- Potential antihypertensive overtreatment (`CVDP006HYP`) is lower-is-better even though it is grouped with treatment indicators.
- Treatment, monitoring, and therapeutic control measures are generally higher-is-better.
- Recorded prevalence has no better or worse direction. Report it as higher or lower. Higher recording may reflect better detection, not better population health.
- Separate movement from judgement: first say whether a measure rose or fell, then whether that movement appears favourable given its direction.
- A small rounded change may display as `0.0pp`. Use more decimal places or say `similar` when the unrounded difference is negligible.
- Confidence limits do not by themselves prove a difference is statistically significant. Do not claim significance unless the API provides a valid statistical comparison.
- `ValueNote`, a null `Value`, or an empty result may indicate suppression or unavailable data. Report the limitation.

When asked for priorities, rank unfavourable gaps within comparable measures. Do not rank recorded prevalence as good or bad, mix percentage-point gaps with mortality rates as though they share a scale, or treat a larger raw number as automatically more important. Mention worsening trends separately from current gaps.

## Response style

Lead with the answer. Use a small table for several indicators or organisations. Put the reporting period and comparison basis near the values. Keep exact indicator codes so results are traceable.

Link to the explorer when possible:

- Organisation: `https://cvdprevent-explorer.app/dashboard?area={areaId}`
- Indicator: `https://cvdprevent-explorer.app/indicators/{indicatorId}?area={areaId}`

This is public, aggregate audit data. It does not provide patient-level records and must not be used to identify individuals or make decisions about individual care.
