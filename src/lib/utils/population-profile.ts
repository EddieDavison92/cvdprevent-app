import type { IndicatorRawData } from '@/lib/api/types';

export interface DemographicDefinition {
  type: string;
  label: string;
  excludeCategories: string[];
}

export interface CategoryShare {
  name: string;
  areaShare: number | null;
  baselineShare: number | null;
  areaDenominator: number | null;
  baselineDenominator: number | null;
  areaSuppressed: boolean;
  baselineSuppressed: boolean;
}

interface CategoryValue {
  denominator: number | null;
  suppressed: boolean;
}

function isSuppressed(item: IndicatorRawData | undefined): boolean {
  return /suppress/i.test(item?.ValueNote ?? '');
}

function getCategoryValue(
  data: IndicatorRawData[],
  categoryType: string,
  categoryName: string,
): CategoryValue {
  const names = categoryType === 'Ethnicity' && categoryName === 'Unknown'
    ? ['Unknown', 'Missing', 'Not stated']
    : [categoryName];
  const items = data.filter(
    (item) => item.MetricCategoryTypeName === categoryType
      && names.includes(item.MetricCategoryName)
      && (
        categoryType === 'Sex'
        || item.CategoryAttribute === undefined
        || item.CategoryAttribute === 'Persons'
      )
  );

  if (items.length === 0) return { denominator: null, suppressed: false };

  const suppressed = items.some(isSuppressed);
  if (suppressed) return { denominator: null, suppressed: true };

  const denominators = items
    .map((item) => item.Denominator)
    .filter((value): value is number => value !== null);

  return {
    denominator: denominators.length > 0
      ? denominators.reduce((sum, value) => sum + value, 0)
      : null,
    suppressed: false,
  };
}

function getEligiblePopulation(data: IndicatorRawData[]): number | null {
  return data.find(
    (item) => item.MetricCategoryTypeName === 'Sex' && item.MetricCategoryName === 'Persons'
  )?.Denominator ?? null;
}

export function computePopulationShares(
  demo: DemographicDefinition,
  areaData: IndicatorRawData[],
  baselineData: IndicatorRawData[],
  categories: { type: string; categories: string[] }[],
): CategoryShare[] | null {
  const category = categories.find((item) => item.type === demo.type);
  if (!category) return null;

  const names = category.categories.filter(
    (name) => !demo.excludeCategories.includes(name)
  );
  const areaTotal = getEligiblePopulation(areaData);
  const baselineTotal = getEligiblePopulation(baselineData);

  const items = names.map((name) => {
    const area = getCategoryValue(areaData, demo.type, name);
    const baseline = getCategoryValue(baselineData, demo.type, name);

    return {
      name,
      areaShare: areaTotal && area.denominator !== null
        ? (area.denominator / areaTotal) * 100
        : null,
      baselineShare: baselineTotal && baseline.denominator !== null
        ? (baseline.denominator / baselineTotal) * 100
        : null,
      areaDenominator: area.denominator,
      baselineDenominator: baseline.denominator,
      areaSuppressed: area.suppressed,
      baselineSuppressed: baseline.suppressed,
    };
  });

  const hasAreaData = items.some(
    (item) => item.areaDenominator !== null || item.areaSuppressed
  );
  return hasAreaData ? items : null;
}
