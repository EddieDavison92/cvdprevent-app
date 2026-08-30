import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_SECTIONS,
  classifyIndicator,
  findSectionForIndicator,
  getDashboardSections,
  isLowerBetterIndicator,
} from '@/lib/constants/indicator-sections';
import { CONDITION_PATHWAYS, findPathwayByIndicatorCode, getConditionPathways } from '@/lib/constants/pathways';

const NEW_INDICATOR_CODES = [
  'CVDP006HYP',
  'CVDP010HYP',
  'CVDP008CKD',
  'CVDP006DM',
  'CVDP003HF',
  'CVDP004HF',
  'CVDP001CVKM',
  'CVDP002CVKM',
];

describe('indicator classification', () => {
  it('assigns each indicator to at most one dashboard section', () => {
    const codes = DASHBOARD_SECTIONS.flatMap((section) => section.indicatorCodes);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('assigns and maps all new indicators', () => {
    for (const code of NEW_INDICATOR_CODES) {
      expect(findSectionForIndicator(code), `${code} has no dashboard section`).toBeDefined();
      expect(findPathwayByIndicatorCode(code), `${code} has no clinical pathway`).toBeDefined();
    }
  });

  it('assigns every pathway indicator to a dashboard section with matching polarity', () => {
    for (const pathway of CONDITION_PATHWAYS) {
      for (const stage of pathway.stages) {
        for (const code of stage.indicatorCodes) {
          expect(findSectionForIndicator(code), `${code} has no dashboard section`).toBeDefined();
          expect(isLowerBetterIndicator(code), `${code} polarity differs from its pathway stage`)
            .toBe(!stage.higherIsBetter);
        }
      }
    }
  });

  it('infers treatment and outcome metadata for unseen codes', () => {
    const treatment = {
      IndicatorCode: 'CVDP099HF',
      IndicatorName: 'Patients with heart failure treated with a new therapy',
      IndicatorShortName: 'HF: Treated with new therapy',
    };
    const outcome = {
      IndicatorCode: 'CVDP099MORT',
      IndicatorName: 'Cardiovascular mortality',
      IndicatorShortName: 'CVD: Cardiovascular mortality',
    };

    expect(classifyIndicator(treatment)).toMatchObject({ source: 'inferred', lowerIsBetter: false, section: { id: 'treatment' } });
    expect(classifyIndicator(outcome)).toMatchObject({ source: 'inferred', lowerIsBetter: true, section: { id: 'outcomes' } });
    expect(getDashboardSections([treatment]).find(section => section.id === 'treatment')?.indicatorCodes).toContain('CVDP099HF');
    expect(getConditionPathways([treatment]).find(pathway => pathway.id === 'HF')?.stages
      .find(stage => stage.id === 'treatment')?.indicatorCodes).toContain('CVDP099HF');
  });

  it('keeps an unclear new indicator visible for review', () => {
    const indicator = {
      IndicatorCode: 'CVDP099NEW',
      IndicatorName: 'New experimental measure',
      IndicatorShortName: 'New experimental measure',
    };

    expect(classifyIndicator(indicator)).toMatchObject({ source: 'unclassified', section: { id: 'other' } });
    expect(getDashboardSections([indicator]).at(-1)).toMatchObject({ id: 'other', indicatorCodes: ['CVDP099NEW'] });
  });
});
