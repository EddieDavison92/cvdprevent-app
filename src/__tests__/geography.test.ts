import { describe, expect, it } from 'vitest';
import type { Area } from '@/lib/api/types';
import { findSuccessorArea } from '@/lib/utils/geography';

function area(AreaID: number, Parents: number[] = [], SystemLevelID = 7): Area {
  return { AreaID, AreaCode: `C${AreaID}`, AreaName: `Area ${AreaID}`, Parents, SystemLevelID, SystemLevelName: 'ICB' };
}

const wnl = area(8205);
const sel = area(8059);
const subIcbs = [area(7951, [8205], 8), area(7952, [8063, 8205], 8), area(7960, [8059], 8)];

describe('findSuccessorArea', () => {
  it('maps a merged area to the current parent of its children', () => {
    expect(findSuccessorArea([7951, 7952], subIcbs, [wnl, sel])).toBe(wnl);
  });

  it('returns null when children now sit under different areas', () => {
    expect(findSuccessorArea([7951, 7960], subIcbs, [wnl, sel])).toBeNull();
  });

  it('returns null when no child is in the current period', () => {
    expect(findSuccessorArea([9999], subIcbs, [wnl, sel])).toBeNull();
  });
});
