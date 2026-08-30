---
name: cvdprevent-data-explorer
description: Look up and compare public aggregate CVDPREVENT cardiovascular prevention indicators for NHS organisations in England, including regions, ICBs, sub-ICBs, PCNs, and practices. Use for values, trends, comparisons, pathways, inequalities, metadata, or organisation performance.
---

# CVDPREVENT data explorer

Answer questions using the public CVDPREVENT API. It needs no authentication and returns aggregate JSON data.

## Sources and access

- Official API: https://api.cvdprevent.nhs.uk
- Explorer: https://www.cvdprevent-explorer.app
- API field and route reference: https://www.cvdprevent-explorer.app/api-reference.md
- Response examples: https://www.cvdprevent-explorer.app/skill-examples.md
- Machine-readable polarity: https://www.cvdprevent-explorer.app/api/cvdprevent/polarity?agentVersion=5
- Relay fallback guide: https://www.cvdprevent-explorer.app/skill-relay.md
- Official API documentation: https://bmchealthdocs.atlassian.net/wiki/spaces/CP/pages/317882369/CVDPREVENT+API+Documentation

Use the official API directly when a shell, code runner, or HTTP client can request constructed URLs. Use `curl -fsSL`, Python, or a native HTTP client. Save large responses to a file or variable and parse them locally instead of printing them into the conversation.

```bash
curl -fsSL "https://api.cvdprevent.nhs.uk/timePeriod"
curl -fsSLG "https://api.cvdprevent.nhs.uk/area/search" \
  --data-urlencode "partialAreaName=North West London" \
  --data-urlencode "timePeriodID=33"
```

If direct requests are blocked or a web fetcher refuses constructed URLs, read the relay fallback guide and follow its returned `_links` exactly. Do not use the relay merely for convenience.

Read the response examples before the first query. At minimum, read the period, organisation search, indicator catalogue, and focused indicator sections. When the question needs parents, peers, child areas, ranks, metadata, or organisation-wide data, read the matching example before calling that route. The examples show object nesting; the API reference lists every observed field and the other documented routes.

## Response shape map

The main response containers are:

| Route | Read from |
|---|---|
| `/timePeriod` | `timePeriodList[]` |
| `/area/systemLevel` | `systemLevels[]` |
| `/area/search` | `foundAreaList[]` |
| `/area/{areaId}/details` | `areaDetails`, including `ParentAreaList[]` and `ChildAreaList[]` |
| `/indicator/list` | `indicatorList[]` |
| `/indicator` | `indicatorList[].Categories[].Data` and `.TimeSeries[]` |
| `/indicator/{indicatorId}/data` | `indicatorData.Categories[].AreaData` and `.NationalData` |
| `/indicator/{indicatorId}/details` | `indicatorDetails.MetaData`, grouped by section name |
| `/indicator/siblingData` | `siblingData.Data[]` |
| `/indicator/childData` | `childData.Data[]` |
| `/indicator/timeSeriesByMetric/{metricId}` | `Data.Areas[].TimeSeriesData[]` |
| `/indicator/metricSystemLevelComparison/{metricId}` | `Data.SystemLevels[].ComparisonData[]` |
| `/indicator/metricAreaBreakdown/{metricId}` | `Data.SystemLevels[].ComparisonData[]` |
| `/indicator/{indicatorId}/rawDataJSON` | `indicatorRawData[]` |

Do not assume similarly named routes use the same wrapper. In particular, the all-indicator route uses `Categories[].Data`, while the focused route uses `Categories[].AreaData` and `Categories[].NationalData`.

Common route sequence:

```text
/timePeriod
  -> /area/search?partialAreaName=...&timePeriodID=...
  -> /indicator/list?timePeriodID=...&systemLevelID=...
  -> /indicator/{indicatorId}/data?timePeriodID=...&areaID=...
```

Use the focused route for one indicator and all its demographic rows. Use `/indicator` for every indicator in one organisation. Use the metric routes only after resolving the required `MetricID` from a category row.

## IDs and matching

- `TimePeriodID` identifies a release period.
- `AreaID` is the API's numeric organisation ID. Do not substitute an ODS code.
- `IndicatorID` selects an indicator endpoint.
- `IndicatorCode` is the stable code used to match an indicator between responses.
- `MetricID` selects one breakdown for trends, peers, and child-area routes.

Known organisation levels are England `1`, historic STP `2`, historic CCG `3`, PCN `4`, Practice `5`, Region `6`, ICB `7`, and Sub-ICB `8`. Query `/area/systemLevel?timePeriodID={periodId}` because not every period exposes every level.

Use `AreaCode` as the organisation code. `AreaOdsCode` can be null, and search results may call the field `OdsCode`. Never select an organisation on name alone when the search returns more than one level.

Use `IndicatorCode` as authoritative. A code embedded in `IndicatorShortName` or other display text can contain an upstream typo.

## Direct query workflow

1. Identify the organisation name and level, comparison, indicator or condition, and requested period type.
2. Fetch `/timePeriod`. Filter by `IndicatorTypeName`, then select the greatest parsed `EndDate`; the array is not ordered.
3. Resolve each organisation with `/area/search?partialAreaName={name}&timePeriodID={periodId}`. Check `SystemLevelID`, `AreaName`, and `AreaCode`. If ambiguous, list the requested level with `/area?timePeriodID={periodId}&systemLevelID={levelId}`.
4. Find indicators with `/indicator/list?timePeriodID={periodId}&systemLevelID={levelId}`. Match exact `IndicatorCode` first, then distinctive words in `IndicatorShortName` and `IndicatorName`. Show ambiguous matches instead of choosing silently.
5. Fetch `/indicator/{indicatorId}/data?timePeriodID={periodId}&areaID={areaId}`.
6. Select the same metric category on both sides, validate period and units, then compare.

`TimePeriodName` is the reporting or measurement-window label to show users. `EndDate` is used to order releases; do not call it the publication date unless a source says so. Standard and Outcomes are separate period series even when their `EndDate` matches.

Ready-to-run TypeScript period selection:

```ts
const periods = (await fetch(`${api}/timePeriod`).then(r => r.json())).timePeriodList;
const latest = periods
  .filter((p: { IndicatorTypeName: string }) => p.IndicatorTypeName === requestedType)
  .sort((a: { EndDate: string }, b: { EndDate: string }) => Date.parse(b.EndDate) - Date.parse(a.EndDate))[0];
```

Do not reuse IDs from examples or earlier answers. Resolve them for the selected period.

## Headline values and comparisons

The headline category is exactly:

```text
MetricCategoryTypeName == "Sex"
MetricCategoryName == "Persons"
```

In focused indicator data, read the subject from `AreaData` and England from `NationalData`. For a parent or another organisation, fetch that organisation and read its `AreaData`; do not treat `NationalData` as the requested parent.

Confirm the same `IndicatorCode`, `TimePeriodID`, `MetricCategoryTypeName`, `MetricCategoryName`, `CategoryAttribute`, and unit before subtracting values. Calculate `subject - comparison`. For percentages, label the result in percentage points (`pp`).

Use the polarity endpoint to classify current mapped indicators. Match by `IndicatorCode`:

- `higher is better` and `lower is better` are directional measures.
- `recording measure` covers recorded prevalence; describe it as higher or lower recording, not better or worse health.
- If a code is absent, label it unclassified and do not infer direction silently from its name.

For display grouping, percentage differences of at most `0.5pp` may be called similar. For rates and other units, call values similar only when equal at their published display precision. These are explorer display conventions, not significance tests. Always provide the two values and raw difference when it matters.

## Organisation-wide comparison

For any two organisations in the same period:

1. Fetch `/indicator?timePeriodID={periodId}&areaID={areaId}` for each organisation.
2. Select each indicator's Sex / Persons category.
3. Join on `IndicatorCode`.
4. Apply the polarity mapping. Keep recorded prevalence and unclassified indicators separate.
5. Report comparable and missing counts. List the largest unfavourable gaps within the same unit.
6. Resolve the latest Outcomes period separately if the question covers all available indicators. Do not merge Standard and Outcomes as one release.

The optional compact relay route also supports any two organisations:

```text
/api/cvdprevent/summary?timePeriodID={periodId}&areaID={subjectAreaId}&comparisonAreaID={comparisonAreaId}
```

Its `Indicators[]` rows include `Polarity`, `ClassificationSource`, `Difference`, `DifferenceUnit`, `SimilarityRule`, neutral `Relation`, and polarity-aware `Assessment`. Its counts separate directional measures, recorded prevalence, unclassified indicators, and missing comparisons.

Call the result “largest benchmark gaps,” not priorities, unless population need, trends, confidence, local context, and actionability have also been considered.

## Demographic breakdowns

Focused `/indicator/{indicatorId}/data` returns all available categories. Build a join key from:

```text
MetricCategoryTypeName + MetricCategoryName + CategoryAttribute
```

Age rows are crossed with sex. For a persons-only age comparison, require `CategoryAttribute == "Persons"`; use Male and Female only when a sex-by-age split is requested. Deprivation, ethnicity, mental-health, and learning-disability comparisons should also use `CategoryAttribute == "Persons"` unless the question asks for another attribute.

Enumerate the category types actually returned. Availability metadata can be empty or disagree with published rows, so verify the focused response itself.

For every matched row with two values:

- retain the category type with its label because values such as `4` are ambiguous without `Deprivation quintile`;
- show subject, comparison, and difference;
- use the indicator polarity only when describing the difference as favourable or unfavourable;
- keep null or suppressed rows and explain their `ValueNote`; never turn them into zero;
- treat small denominators and wide confidence intervals cautiously.

`Numerator` and `Denominator` describe the eligible audit population. Subnational counts can be rounded, often to five, so the published `Value` is authoritative and may not exactly equal a recalculation. `Count` usually describes the number of organisations in the comparison distribution; it is not a patient count.

For a compact demographic answer:

1. Lead with the overall Sex / Persons result and reporting period.
2. Show short tables for age, deprivation, ethnicity, and other available groups.
3. Surface the largest within-organisation gap and the largest gap versus the comparison.
4. Note suppressed values, small denominators, wide intervals, and unavailable groups.
5. End with two or three findings that warrant investigation, not causal claims.

## Comparison recipes

### Parent organisation

Fetch `/area/{areaId}/details?timePeriodID={periodId}` and select the requested row from `ParentAreaList` by ID, name, and level. Do not assume the first parent ID is the comparison the user means.

### Geographic peers

Use the Persons `MetricID` with `/indicator/siblingData?timePeriodID={periodId}&areaID={areaId}&metricID={metricId}`. `siblingData.Data` contains same-level organisations sharing the parent and includes the selected area. Call them geographic peers, not statistically matched peers. Remove null values before sorting.

### One organisation against every organisation at its level

Use `/indicator/{indicatorId}/rawDataJSON?timePeriodID={periodId}&systemLevelID={levelId}` and filter locally to Sex / Persons. Locate the subject by `AreaCode` or resolved `AreaID`, remove nulls, and sort in the polarity direction. State the number of organisations with data. For prevalence, describe higher or lower recording rather than rank as better or worse.

### Child organisations

Use `/area/{areaId}/details` for immediate children and `/indicator/childData` with the Persons `MetricID` for values. Use `/indicator/metricAreaBreakdown/{metricId}` for deeper descendant levels. Select the returned `SystemLevelID`; do not assume PCNs are immediate children of an ICB.

### Combine published organisations

There is no API organisation for an ad hoc combination of two or more ICBs, sub-ICBs, PCNs, or practices. Only pool rows at the same level with the same indicator, period, category, unit, definition, and compatible non-null numerators and denominators.

For a percentage proportion:

```text
combined value = sum(Numerator) / sum(Denominator) * 100
```

Never average displayed percentages. Do not pool confidence limits, age-standardised values, mortality or admission rates, medians, indices, or values without compatible denominators. Label the output `Calculated: A + B`, state that it is not a published organisation value, explain count rounding, and show each component beside it.

### Trend

Use `/indicator/timeSeriesByMetric/{metricId}?areaID={areaId}`. Select the matching area, then sort `TimeSeriesData` by dates resolved from `/timePeriod`. Report first and latest values and the arithmetic change. Say whether the line increased or decreased before judging whether that movement was favourable. A rising line is increasing even if the latest rounded change displays as `0.0pp`.

### Metadata

Use `/indicator/{indicatorId}/details` for definitions, construction, exclusions, rationale, and interpretation. Read every returned `MetaData` section. Attribute this wording to the API and distinguish it from your own interpretation.

## Interpretation boundaries

- Mortality, admissions, undiagnosed or uncoded populations, and potential overtreatment are normally lower-is-better, but use the polarity mapping rather than name heuristics when available.
- Potential antihypertensive overtreatment (`CVDP006HYP`) is lower-is-better although it is grouped under treatment.
- Recorded prevalence can reflect detection and recording as well as underlying disease burden.
- Recorded prescribing does not prove dispensing, adherence, or clinical appropriateness.
- Confidence intervals do not by themselves establish a statistically significant difference. Do not claim significance unless the API supplies a valid test.
- A null `Value`, `ValueNote`, or empty array means missing, suppressed, or unavailable data, not zero.
- CVDPREVENT is an audit dataset. Check coverage and participation before turning results into local patient estimates.

## Response style

Lead with the answer. State the organisation and level, comparison, indicator code, reporting period, values, units, and difference. Use a small table when comparing several indicators or demographic groups. Separate observed data from interpretation and describe associations rather than causes.

Link results back to the explorer:

- Organisation: `https://www.cvdprevent-explorer.app/dashboard?area={areaId}`
- Indicator: `https://www.cvdprevent-explorer.app/indicators/{indicatorId}?area={areaId}`

This is public aggregate data. It does not contain patient-level records and must not be used to identify individuals or make decisions about individual care.
