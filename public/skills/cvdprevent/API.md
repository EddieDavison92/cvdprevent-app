# CVDPREVENT API field and route reference

Agent API base URL: `https://cvdprevent-explorer.app/api/cvdprevent`

Official API origin: `https://api.cvdprevent.nhs.uk`

Official documentation: https://bmchealthdocs.atlassian.net/wiki/spaces/CP/pages/317882369/CVDPREVENT+API+Documentation

All routes use `GET`. The API needs no authentication. The Agent API base is a read-only relay for the documented JSON routes. It retains official response fields and adds `_links` with absolute URLs for related requests. Follow those exact URLs when an assistant blocks URLs that did not appear in an earlier response. Most JSON responses also contain a top-level `copyright` string. Field names are case-sensitive. Routes and fields were checked against the live API on 30 August 2026; the upstream API and documentation can change.

Start at the API base and follow `_links.timePeriods`. Direct clients can also append routes to the base. For example:

```text
https://cvdprevent-explorer.app/api/cvdprevent/area/search?partialAreaName=North%20Central%20London&timePeriodID=33
```

The relay excludes the CSV and XLSX download routes. Use the official API origin for those files.

## Relay links

Every relayed response has top-level links for `self`, `apiIndex`, `skill`, and `apiReference`. Other `_links` are placed beside the IDs they use:

- period rows: `systemLevels`, plus arrays for `areas`, `indicatorLists`, and `dataAvailability` by system level;
- area rows: `details`, `indicators`, and `indicatorList`;
- indicator rows: `details`, `data`, `rawDataAtSystemLevel`, and `dataAvailability` when their parameters are known;
- metric category rows: `trend`, `geographicPeers`, `immediateChildren`, `areaBreakdown`, `systemLevelComparison`, and `nationalAndArea`.

The all-indicator route adds metric links only to the Sex / Persons category to keep its response below hosting limits. Follow the indicator row's `data` link to get links on every demographic category.

## Shared field sets

These aliases keep the route list readable. They describe every field currently returned in the named object.

### `Period`

`EndDate`, `IndicatorTypeID`, `IndicatorTypeName`, `StartDate`, `TimePeriodID`, `TimePeriodName`.

The system-level period routes may omit `IndicatorTypeID` and `IndicatorTypeName`.

### `SystemLevel`

`IsVisible`, `NationalLevel`, `SystemLevelID`, `SystemLevelName`, `SystemLevelOrder`.

Known IDs are England `1`, historic STP `2`, historic CCG `3`, PCN `4`, Practice `5`, Region `6`, ICB `7`, and Sub-ICB `8`. Use `/area/systemLevel` for the requested period instead of assuming all are available.

### `Area`

`AreaCode`, `AreaID`, `AreaName`, `AreaOdsCode`, `Parents`, `ParticipationRate`, `PopulationRate`, `SystemLevelID`, `SystemLevelName`.

Some endpoints call the ODS field `OdsCode` or omit it. Relationship responses add `ParentAreaID`, `Children`, or `SubSystems`.

### `IndicatorDescriptor`

`AxisCharacter`, `DataUpdateInterval`, `FormatDisplayName`, `HighestPriorityNotificationType`, `IndicatorCode`, `IndicatorFormatID`, `IndicatorID`, `IndicatorName`, `IndicatorOrder`, `IndicatorShortName`, `IndicatorStatus`, `NotificationCount`.

The `/indicator` response also returns `IndicatorTypeID` and `IndicatorTypeName`.

### `MetricDescriptor`

`CategoryAttribute`, `MetricCategoryID`, `MetricCategoryName`, `MetricCategoryOrder`, `MetricCategoryTypeName`, `MetricID`.

`ExternalCategoryID` appears in some periods and older documented examples.

### `MetricData`

`AreaCode`, `AreaID`, `AreaName`, `Count`, `DataID`, `Denominator`, `Factor`, `HighestPriorityNotificationType`, `LowerConfidenceLimit`, `Max`, `Median`, `Min`, `NationalLevel`, `NotificationCount`, `Numerator`, `Q20`, `Q40`, `Q60`, `Q80`, `SystemLevelID`, `SystemLevelName`, `TimePeriodID`, `TimePeriodName`, `UpperConfidenceLimit`, `Value`, `ValueNote`.

Not every endpoint returns every field. For example, the nested `Data` object in `/indicator` has `AreaID` but not `AreaName`, while sibling and child rows contain the organisation fields. A field may be `null`.

### `EmbeddedTimeSeriesPoint`

`Denominator`, `EndDate`, `Factor`, `Median`, `Numerator`, `StartDate`, `TimePeriodID`, `TimePeriodName`, `Value`.

### `ChartTimeSeriesPoint`

`Count`, `Denominator`, `Factor`, `HighestPriorityNotificationType`, `NotificationCount`, `Numerator`, `TimePeriodID`, `TimePeriodName`, `TimeseriesNotificationCount`, `Value`.

## Time period routes

### `/timePeriod`

Parameters:

- `indicatorTypeID` - optional filter.

Response: `timePeriodList: Period[]`.

Use parsed `EndDate` to find the latest period. Standard and Outcomes periods are separate.

### `/timePeriod/systemLevels`

The official documentation labels this route proposed, but it currently responds.

Response: `timePeriodList[]`, where each item has `EndDate`, `StartDate`, `TimePeriodID`, `TimePeriodName`, and `SystemLevels[]`. Each system level has `IsVisible`, `NationalLevel`, `SystemLevelID`, and `SystemLevelName`.

## Area routes

### `/area/systemLevel`

Parameters:

- `timePeriodID` - required.

Response: `systemLevels: SystemLevel[]`.

### `/area/systemLevel/timePeriods`

The official documentation labels this route proposed, but it currently responds.

Response: `systemLevelList[]`. Each item has `IsVisible`, `NationalLevel`, `SystemLevelID`, `SystemLevelName`, and `TimePeriods: Period[]`.

### `/area`

Parameters:

- `timePeriodID` - required.
- `parentAreaID` - optional; takes precedence over `systemLevelID`.
- `systemLevelID` - optional; required when `parentAreaID` is absent.

Response: `areaList: Area[]`.

### `/area/{areaId}/details`

Parameters:

- `timePeriodID` - required.

Response: `areaDetails` with `AreaCode`, `AreaID`, `AreaName`, `AreaOdsCode`, `ParticipationRate`, `PopulationRate`, `SystemLevelID`, `SystemLevelName`, `ChildAreaList[]`, and `ParentAreaList[]`. Each child or parent has `AreaCode`, `AreaID`, `AreaName`, `SystemLevelID`, and `SystemLevelName`.

### `/area/unassigned`

Parameters:

- `timePeriodID` - required.
- `systemLevelID` - optional.

Response: `unassignedAreaList[]`, with `AreaCode`, `AreaID`, `AreaName`, `SystemLevelID`, and `SystemLevelName`. The array may be empty.

### `/area/search`

Parameters:

- `partialAreaName` - required; partial `LIKE` match.
- `timePeriodID` - required.

Response: `foundAreaList[]`, with `AreaCode`, `AreaID`, `AreaName`, `IsVisible`, `NationalLevel`, `OdsCode`, `SystemLevelID`, `SystemLevelName`, and `SystemLevelOrder`.

This route can return practices and other levels together. Check `SystemLevelID` before selecting a match.

### `/area/{areaId}/nestedSubSystems`

No query parameters.

Response: `AreaRelationships`, a recursive area tree. Every node can contain `AreaCode`, `AreaID`, `AreaName`, `AreaOdsCode`, `ParentAreaID`, `SystemLevelID`, `SystemLevelName`, and `Children[]`.

### `/area/{areaId}/flatSubSystems`

No query parameters.

Response: `AreaRelationships` with `AreaCode`, `AreaID`, `AreaName`, `AreaOdsCode`, `ParentAreaID`, `SystemLevelID`, `SystemLevelName`, and `SubSystems`. `SubSystems` is an object keyed by level name, such as `Sub-ICB`, `PCN`, or `Practice`; each value is an array of area nodes with the same area and parent fields.

## Indicator discovery and metadata routes

### `/indicator/list`

Parameters:

- `timePeriodID` - required.
- `systemLevelID` - required.

Response: `indicatorList: IndicatorDescriptor[]`.

### `/indicator/metricList`

The official documentation labels this route proposed, but it currently responds.

Parameters:

- `timePeriodID` - required.
- `systemLevelID` - required.

Response: `indicatorList[]`. Each item has `AxisCharacter`, `FormatDisplayName`, `HighestPriorityNotificationType`, `IndicatorCode`, `IndicatorFormatID`, `IndicatorID`, `IndicatorName`, `IndicatorOrder`, `IndicatorShortName`, `NotificationCount`, and `MetricList[]`. Each metric has `CategoryAttribute`, `MetricCategoryName`, `MetricCategoryTypeName`, and `MetricID`.

### `/indicator/tags`

No parameters.

Response: `indicatorTagList[]`, with `IndicatorTagID` and `IndicatorTagName`.

### `/indicator/{indicatorId}/details`

No query parameters.

Response: `indicatorDetails` with `DataUpdateInterval`, `HighestPriorityNotificationType`, `IndicatorCode`, `IndicatorID`, `IndicatorName`, `IndicatorOrder`, `IndicatorShortName`, `IndicatorStatus`, `NotificationCount`, and `MetaData`.

`MetaData` is an object keyed by section title. Each section is an array whose rows contain `AgeStandardised`, `CategoryName`, `MetaData`, `MetaDataCategoryID`, and `MetaDataTitle`. Use this route for definitions, construction, data quality, interpretation, exclusions, caveats, and rationale. Age-standardised indicators may have both standard and age-standardised metadata rows.

### `/indicator/priorityGroups`

No parameters.

Response: `PriorityGroups`, an object keyed by priority-group name. Every indicator row has `AxisCharacter`, `FormatDisplayName`, `HighestPriorityNotificationType`, `IndicatorCode`, `IndicatorFormatID`, `IndicatorID`, `IndicatorName`, `MetricID`, `NotificationCount`, `PathwayGroupID`, `PathwayGroupName`, `PriorityGroupDisplayOrder`, `PriorityGroupID`, and `QuestionGroupName`.

### `/indicator/pathwayGroup/{pathwayGroupId}`

No query parameters.

Response: `PathwayGroup` with `PathwayGroupID`, `PathwayGroupName`, and `Indicators[]`. Every indicator has `AxisCharacter`, `FormatDisplayName`, `HighestPriorityNotificationType`, `IndicatorCode`, `IndicatorFormatID`, `IndicatorID`, `IndicatorName`, `MetricID`, `NotificationCount`, `PathwayGroupDisplayOrder`, and `QuestionGroupName`.

### `/indicator/indicatorGroup/{indicatorGroupId}`

No query parameters.

Response: `IndicatorGroup` with `HighestPriorityNotificationType`, `IndicatorGroupID`, `IndicatorGroupName`, `IndicatorGroupTypeID`, `IndicatorGroupTypeName`, `NotificationCount`, and `Indicators[]`. Every indicator has `DisplayOrder`, `HighestPriorityNotificationType`, `IndicatorCode`, `IndicatorID`, `IndicatorName`, `MetricID`, and `NotificationCount`.

## Indicator data routes

### `/indicator`

Parameters:

- `timePeriodID` - required.
- `areaID` - required.
- `tagID` - optional and repeatable, for example `tagID=12&tagID=34`.

Response: `indicatorList[]`. Every item has all `IndicatorDescriptor` fields, `IndicatorTypeID`, `IndicatorTypeName`, and `Categories[]`.

Every category has all `MetricDescriptor` fields plus:

- `Data` with `AreaID`, `Count`, `DataID`, `Denominator`, `Factor`, `LowerConfidenceLimit`, `Max`, `Median`, `Min`, `Numerator`, `Q20`, `Q40`, `Q60`, `Q80`, `TimePeriodID`, `UpperConfidenceLimit`, `Value`, and `ValueNote`.
- `TimeSeries: EmbeddedTimeSeriesPoint[]`.

The current live response also includes `HighestPriorityNotificationType` and `NotificationCount` at indicator level.

### `/indicator/{indicatorId}/data`

Parameters:

- `timePeriodID` - required.
- `areaID` - required.

Response: `indicatorData` with `AxisCharacter`, `FormatDisplayName`, `HighestPriorityNotificationType`, `IndicatorCode`, `IndicatorFormatID`, `IndicatorID`, `IndicatorName`, `IndicatorOrder`, `IndicatorShortName`, `NotificationCount`, `TimePeriodID`, `TimePeriodName`, and `Categories[]`.

Every category has all `MetricDescriptor` fields plus `AreaData` and `NationalData`. Both use `MetricData`; the live response includes `AreaCode`, `AreaID`, `AreaName`, `Count`, `DataID`, `Denominator`, `Factor`, `HighestPriorityNotificationType`, `LowerConfidenceLimit`, `Max`, `Median`, `Min`, `NotificationCount`, `Numerator`, `Q20`, `Q40`, `Q60`, `Q80`, `TimePeriodID`, `TimePeriodName` on area data, `UpperConfidenceLimit`, `Value`, and `ValueNote`.

This endpoint supplies an England comparison in `NationalData`; it does not substitute another parent comparison requested by the user.

### `/indicator/siblingData`

Parameters: required `timePeriodID`, `areaID`, and `metricID`.

Response: `siblingData` with `CategoryAttribute`, `HighestPriorityNotificationType`, `IndicatorCode`, `IndicatorID`, `IndicatorName`, `IndicatorOrder`, `IndicatorShortName`, `MetricCategoryID`, `MetricCategoryName`, `MetricCategoryOrder`, `MetricCategoryTypeName`, `NotificationCount`, and `Data: MetricData[]`.

### `/indicator/childData`

Parameters: required `timePeriodID`, `areaID`, and `metricID`.

Response: `childData` with the same descriptor and `Data: MetricData[]` fields as `siblingData`.

### `/indicator/nationalVsAreaMetricData/{metricId}`

Parameters: required `timePeriodID` and `areaID`.

Response: `indicatorData` with:

- `AreaData[]`: `AreaCode`, `AreaID`, `AreaName`, `Denominator`, `Factor`, `HighestPriorityNotificationType`, `NationalLevel`, `NotificationCount`, `Numerator`, `Value`.
- `TargetData`: `TargetLabel`, `TargetPatients`, `TargetValue`.

`TargetPatients` is the extra patient count needed to reach the target percentage when a target exists. Do not use it without checking `TargetValue` and `TargetLabel`.

### `/indicator/timeSeriesByMetric/{metricId}`

Parameters: required `areaID`.

Response: `Data` with `TargetLabel`, `TargetValue`, and `Areas[]`. Each area has `AreaCode`, `AreaID`, `AreaName`, and `TimeSeriesData: ChartTimeSeriesPoint[]`.

`TimeseriesNotificationCount > 0` marks a methodology or calculation change that may break comparability. Mention it when interpreting the trend.

### `/indicator/personsTimeSeriesByIndicator/{indicatorId}`

Parameters: required `areaID`.

Response: `Data` with `AreaCode`, `AreaID`, `AreaName`, `TargetLabel`, `TargetValue`, and `InequalityMarkers[]`. Each marker has `MetricCategoryTypeID`, `MetricCategoryTypeName`, and `CategoryData[]`. Category rows have `Denominator`, `Factor`, `MetricCategoryID`, `MetricCategoryName`, `Numerator`, `TimePeriodID`, `TimePeriodName`, and `Value`.

Despite the route name, this endpoint is for inequality-marker time series grouped by category type.

### `/indicator/metricSystemLevelComparison/{metricId}`

Parameters: required `timePeriodID` and `areaID`.

Response: `Data` with `TargetLabel`, `TargetValue`, and `SystemLevels[]`. Each level has `NationalLevel`, `SystemLevelID`, `SystemLevelMedian`, `SystemLevelName`, `SystemLevelOrder`, and `ComparisonData[]`. Comparison rows have `AreaCode`, `AreaID`, `AreaName`, `Denominator`, `Factor`, `Numerator`, and `Value`.

### `/indicator/metricAreaBreakdown/{metricId}`

Parameters: required `timePeriodID` and `areaID`.

Response: `Data` with `TargetLabel`, `TargetValue`, and `SystemLevels[]`. The level and comparison fields match `metricSystemLevelComparison`; documented comparison rows may also include `ParentAreaID`.

Use this endpoint to inspect the selected area's descendants across levels, including practices where available.

## Raw data and file routes

### `/indicator/{indicatorId}/rawDataJSON`

Parameters: required `timePeriodID` and `systemLevelID`.

Response: `indicatorRawData[]`. Every row has `AreaCode`, `AreaName`, `CategoryAttribute`, `Denominator`, `Factor`, `HighestPriorityNotificationType`, `IndicatorCode`, `IndicatorName`, `IndicatorShortName`, `LowerConfidenceLimit`, `MetricCategoryName`, `MetricCategoryTypeName`, `NotificationCount`, `Numerator`, `TimePeriodName`, `UpperConfidenceLimit`, `Value`, and `ValueNote`.

### `/indicator/{indicatorId}/rawDataCSV`

Parameters: required `timePeriodID` and `systemLevelID`. Returns the same raw dataset as CSV.

### `/indicator/{indicatorId}/rawDataXLSX`

Parameters: required `timePeriodID` and `systemLevelID`. Returns the same raw dataset as XLSX.

### `/indicator/{indicatorId}/metaDataXLSX`

No query parameters are documented. Returns XLSX with `IndicatorCode`, `IndicatorName`, `CategoryName`, `MetaDataTitle`, and `MetaData` columns.

## Other routes

### `/externalResource`

No parameters.

Response: `externalResourceList[]`. Each item has `ExternalResourceCategory`, `ExternalResourceID`, `ExternalResourceOrder`, `ExternalResourceSource`, `ExternalResourceTitle`, `ExternalResourceType`, `ExternalResourceURL`, and `Tags[]`. Tag rows contain `IndicatorTagID` and `IndicatorTagName`.

### `/dataAvailability`

Parameters:

- `timePeriodID` - required.
- `systemLevelID` - required.
- `indicatorID` - optional.
- `metricCategoryTypeID` - optional.

Response: `DataAvailability[]`. Rows have `DataAvailabilityID`, `DataAvailabilityName`, `IndicatorID`, `IsAvailable`, `MetricCategoryTypeID`, `MetricCategoryTypeName`, `SystemLevelID`, and `TimePeriodID`.

`IsAvailable` is `Y`, `N`, or null. The array may be empty for a valid query.

## Handling gaps and changes

- A valid endpoint can return an empty array. Treat that as unavailable, not zero.
- A `Value` can be null and `ValueNote` can explain suppression or availability.
- Some current responses add notification fields not shown in older official examples.
- The documented proposed routes may change or fail. Test them before use and prefer stable alternatives.
- Export endpoints return files, not JSON. Do not try to parse them as JSON.
- Never infer a field that is absent. If a user asks about an unsupported concept, explain which returned fields are available.

## Choosing a comparison route

| Question | Route | Scope |
|---|---|---|
| What is this organisation's parent? | `/area/{areaId}/details` | `ParentAreaList` with IDs, names, and levels |
| How does it compare with nearby peers? | `/indicator/siblingData` | Same-level organisations sharing the selected area's parent; includes the selected area |
| How does one ICB compare with every ICB? | `/indicator/{indicatorId}/rawDataJSON` with `systemLevelID=7` | All ICB rows for one indicator and period; filter to Persons |
| How does one area compare across system levels? | `/indicator/metricSystemLevelComparison/{metricId}` | Returned national and same-level comparison groups with medians |
| What are the immediate child organisations? | `/area/{areaId}/details` plus `/indicator/childData` | `ChildAreaList` and values for one metric |
| What are all lower-level organisations? | `/indicator/metricAreaBreakdown/{metricId}` | Descendant levels grouped in one response |
| How do two arbitrary organisations compare? | Two `/indicator` calls | Match `IndicatorCode` and the same category fields |

`siblingData` means geographic siblings, not a matched statistical peer group. In a live ICB example it returned the five ICBs within the same region. `rawDataJSON` with ICB level returned all 42 ICBs with data. Always report the actual returned count because coverage can change by indicator and period.
