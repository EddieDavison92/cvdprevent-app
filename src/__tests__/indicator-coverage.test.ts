import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_SECTIONS,
  findSectionForIndicator,
  isLowerBetterIndicator,
} from '@/lib/constants/indicator-sections';
import { CONDITION_PATHWAYS, findPathwayByIndicatorCode } from '@/lib/constants/pathways';

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
});
