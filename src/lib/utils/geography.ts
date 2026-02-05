import type { Area } from '@/lib/api/types';

export interface GeographyNode {
  code: string;
  name: string;
  levelId: number;
  parent?: GeographyNode;
  children: GeographyNode[];
}

export function buildGeographyTree(areasByLevel: Map<number, Area[]>): GeographyNode | null {
  // England is the root
  const englandNode: GeographyNode = {
    code: 'E92000001',
    name: 'England',
    levelId: 1,
    children: [],
  };

  // Build maps for lookups
  const nodeByCode = new Map<string, GeographyNode>();
  const nodeById = new Map<number, GeographyNode>();
  nodeByCode.set(englandNode.code, englandNode);
  nodeById.set(1, englandNode); // England AreaID = 1

  // Process levels in order: Region -> ICB -> Sub-ICB -> PCN
  const levelOrder = [6, 7, 8, 4];

  for (const levelId of levelOrder) {
    const areas = areasByLevel.get(levelId);
    if (!areas) continue;

    for (const area of areas) {
      const node: GeographyNode = {
        code: area.AreaCode,
        name: area.AreaName,
        levelId,
        children: [],
      };

      nodeByCode.set(area.AreaCode, node);
      nodeById.set(area.AreaID, node);

      // Link to parent using Parents array
      if (area.Parents.length > 0) {
        const parentNode = nodeById.get(area.Parents[0]);
        if (parentNode) {
          node.parent = parentNode;
          parentNode.children.push(node);
        }
      }
    }
  }

  return englandNode;
}

export function findNode(root: GeographyNode, code: string): GeographyNode | null {
  if (root.code === code) return root;

  for (const child of root.children) {
    const found = findNode(child, code);
    if (found) return found;
  }

  return null;
}

export function getAncestors(node: GeographyNode): GeographyNode[] {
  const ancestors: GeographyNode[] = [];
  let current = node.parent;

  while (current) {
    ancestors.push(current);
    current = current.parent;
  }

  return ancestors;
}

export function getSiblings(node: GeographyNode): GeographyNode[] {
  if (!node.parent) return [];
  return node.parent.children.filter((n) => n.code !== node.code);
}
