import { describe, expect, it } from 'vitest';
import {
  diffCatalogSnapshots,
  formatCatalogAlert,
  getInitialCatalogSnapshot,
  type CatalogIndicator,
} from '@/lib/monitor/catalog';

const newIndicator: CatalogIndicator = {
  code: 'CVDP099HF',
  name: 'Patients with heart failure treated with a new therapy',
  shortName: 'HF: Treated with new therapy',
  release: 'standard',
  section: 'Treatment',
  polarity: 'higher',
  classification: 'inferred',
  classificationReason: 'Treatment wording',
  pathway: 'Heart Failure',
  pathwayIsSuggested: true,
};

describe('catalog monitor', () => {
  it('does not report an unchanged catalog', () => {
    const snapshot = getInitialCatalogSnapshot();
    expect(diffCatalogSnapshots(snapshot, structuredClone(snapshot))).toMatchObject({ hasChanges: false });
  });

  it('reports new releases and indicators', () => {
    const previous = getInitialCatalogSnapshot();
    const current = structuredClone(previous);
    current.standardPeriod = { id: 34, name: 'To September 2026', endDate: '2026-09-30T00:00:00.000Z' };
    current.indicators.push(newIndicator);

    const changes = diffCatalogSnapshots(previous, current);
    expect(changes).toMatchObject({ standardReleaseChanged: true, outcomeReleaseChanged: false, hasChanges: true });
    expect(changes.newIndicators).toEqual([newIndicator]);
    expect(formatCatalogAlert(previous, current, changes)).toContain('CVDP099HF: HF: Treated with new therapy');
  });

  it('reports removed indicators', () => {
    const previous = getInitialCatalogSnapshot();
    const current = structuredClone(previous);
    const removed = current.indicators.pop()!;

    expect(diffCatalogSnapshots(previous, current).removedIndicators).toEqual([removed]);
  });
});
