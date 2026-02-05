/**
 * CVD Prevention Pathway Definitions
 * 
 * Maps CVDPREVENT indicators into logical clinical pathways
 * for funnel analysis and driver identification.
 */

import { NHS_COLORS } from './colors';

export type StageType = 'detection' | 'prevalence' | 'monitoring' | 'treatment' | 'control' | 'outcome';

export interface PathwayStage {
  id: string;
  name: string;
  type: StageType;
  indicatorCodes: string[];
  description: string;
  /** Higher is better (true for most, false for undiagnosed/detection gaps) */
  higherIsBetter: boolean;
}

export interface ConditionPathway {
  id: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  stages: PathwayStage[];
  outcomeIndicatorCodes: string[];
}

export const CONDITION_PATHWAYS: ConditionPathway[] = [
  {
    id: 'HYP',
    name: 'Hypertension',
    shortName: 'BP',
    description: 'Blood pressure detection, treatment and control',
    color: NHS_COLORS.blue,
    stages: [
      {
        id: 'detection',
        name: 'Undiagnosed',
        type: 'detection',
        indicatorCodes: ['CVDP005HYP'],
        description: 'One high BP reading with no recorded hypertension',
        higherIsBetter: false, // Lower is better - fewer undiagnosed
      },
      {
        id: 'prevalence',
        name: 'Diagnosed',
        type: 'prevalence',
        indicatorCodes: ['CVDP001HYP'],
        description: 'Recorded hypertension prevalence',
        higherIsBetter: true, // Higher detection is generally good
      },
      {
        id: 'monitoring',
        name: 'Monitored',
        type: 'monitoring',
        indicatorCodes: ['CVDP004HYP', 'CVDP009HYP'],
        description: 'BP monitoring and ACR testing',
        higherIsBetter: true,
      },
      {
        id: 'control',
        name: 'Controlled',
        type: 'control',
        indicatorCodes: ['CVDP002HYP', 'CVDP003HYP', 'CVDP007HYP'],
        description: 'Treated to appropriate BP threshold',
        higherIsBetter: true,
      },
    ],
    outcomeIndicatorCodes: ['CVDP005MORT', 'CVDP006MORT', 'CVDP001ADMN', 'CVDP002ADMN'],
  },
  {
    id: 'AF',
    name: 'Atrial Fibrillation',
    shortName: 'AF',
    description: 'AF detection, risk assessment and anticoagulation',
    color: NHS_COLORS.darkBlue,
    stages: [
      {
        id: 'prevalence',
        name: 'Diagnosed',
        type: 'prevalence',
        indicatorCodes: ['CVDP001AF'],
        description: 'Recorded AF prevalence',
        higherIsBetter: true,
      },
      {
        id: 'risk-assessment',
        name: 'Risk Assessed',
        type: 'monitoring',
        indicatorCodes: ['CVDP004AF'],
        description: 'CHA2DS2-VASc score recorded',
        higherIsBetter: true,
      },
      {
        id: 'treatment',
        name: 'Anticoagulated',
        type: 'treatment',
        indicatorCodes: ['CVDP002AF'],
        description: 'Treated with anticoagulants',
        higherIsBetter: true,
      },
      {
        id: 'quality',
        name: 'DOAC',
        type: 'control',
        indicatorCodes: ['CVDP005AF'],
        description: 'DOAC prioritised over warfarin',
        higherIsBetter: true,
      },
    ],
    outcomeIndicatorCodes: ['CVDP003MORT'], // Stroke mortality
  },
  {
    id: 'CKD',
    name: 'Chronic Kidney Disease',
    shortName: 'CKD',
    description: 'CKD detection, monitoring and treatment',
    color: NHS_COLORS.aqua,
    stages: [
      {
        id: 'detection',
        name: 'Undiagnosed',
        type: 'detection',
        indicatorCodes: ['CVDP002CKD', 'CVDP003CKD'],
        description: 'Low eGFRs with no recorded CKD',
        higherIsBetter: false,
      },
      {
        id: 'prevalence',
        name: 'Diagnosed',
        type: 'prevalence',
        indicatorCodes: ['CVDP001CKD'],
        description: 'Recorded CKD prevalence',
        higherIsBetter: true,
      },
      {
        id: 'monitoring',
        name: 'Monitored',
        type: 'monitoring',
        indicatorCodes: ['CVDP004CKD', 'CVDP006CKD'],
        description: 'ACR and eGFR monitoring',
        higherIsBetter: true,
      },
      {
        id: 'treatment',
        name: 'Treated',
        type: 'treatment',
        indicatorCodes: ['CVDP005CKD'],
        description: 'High risk treated with RAS antagonists',
        higherIsBetter: true,
      },
      {
        id: 'control',
        name: 'BP Controlled',
        type: 'control',
        indicatorCodes: ['CVDP007CKD'],
        description: 'Treated to appropriate BP threshold',
        higherIsBetter: true,
      },
    ],
    outcomeIndicatorCodes: ['CVDP001MORT', 'CVDP002MORT'],
  },
  {
    id: 'CHOL',
    name: 'Cholesterol / Lipids',
    shortName: 'Lipids',
    description: 'Cardiovascular risk assessment and lipid management',
    color: NHS_COLORS.orange,
    stages: [
      {
        id: 'risk-high',
        name: 'High Risk Treated',
        type: 'treatment',
        indicatorCodes: ['CVDP003CHOL'],
        description: 'QRISK ≥20% treated with lipid-lowering therapy',
        higherIsBetter: true,
      },
      {
        id: 'risk-moderate',
        name: 'Moderate Risk Treated',
        type: 'treatment',
        indicatorCodes: ['CVDP006CHOL'],
        description: 'QRISK ≥10% treated with lipid-lowering therapy',
        higherIsBetter: true,
      },
      {
        id: 'secondary-cvd',
        name: 'CVD on Statin',
        type: 'treatment',
        indicatorCodes: ['CVDP009CHOL'],
        description: 'Existing CVD treated with lipid-lowering therapy',
        higherIsBetter: true,
      },
      {
        id: 'monitoring',
        name: 'Monitored',
        type: 'monitoring',
        indicatorCodes: ['CVDP011CHOL'],
        description: 'Cholesterol monitoring in CVD patients',
        higherIsBetter: true,
      },
      {
        id: 'control',
        name: 'At Target',
        type: 'control',
        indicatorCodes: ['CVDP012CHOL'],
        description: 'Treated to cholesterol threshold',
        higherIsBetter: true,
      },
    ],
    outcomeIndicatorCodes: ['CVDP001MORT', 'CVDP002MORT', 'CVDP004MORT'],
  },
  {
    id: 'SMOK',
    name: 'Smoking',
    shortName: 'Smoking',
    description: 'Smoking status recording and cessation support',
    color: NHS_COLORS.warmYellow,
    stages: [
      {
        id: 'recording',
        name: 'Status Recorded',
        type: 'monitoring',
        indicatorCodes: ['CVDP001SMOK'],
        description: 'Smoking status recorded',
        higherIsBetter: true,
      },
      {
        id: 'support',
        name: 'Support Offered',
        type: 'treatment',
        indicatorCodes: ['CVDP002SMOK'],
        description: 'Current smokers offered support/treatment',
        higherIsBetter: true,
      },
    ],
    outcomeIndicatorCodes: ['CVDP007MORT', 'CVDP008MORT'],
  },
  {
    id: 'FH',
    name: 'Familial Hypercholesterolaemia',
    shortName: 'FH',
    description: 'FH identification and investigation',
    color: NHS_COLORS.pink,
    stages: [
      {
        id: 'at-risk',
        name: 'At Risk Uninvestigated',
        type: 'detection',
        indicatorCodes: ['CVDP004FH'],
        description: 'Cholesterol in at-risk range with no FH investigation',
        higherIsBetter: false,
      },
      {
        id: 'probable',
        name: 'Probable/Possible',
        type: 'prevalence',
        indicatorCodes: ['CVDP002FH'],
        description: 'Possible, probable and confirmed FH',
        higherIsBetter: true,
      },
      {
        id: 'confirmed',
        name: 'Genetically Confirmed',
        type: 'prevalence',
        indicatorCodes: ['CVDP003FH'],
        description: 'Genetically confirmed FH',
        higherIsBetter: true,
      },
    ],
    outcomeIndicatorCodes: ['CVDP001MORT', 'CVDP004MORT'],
  },
];

// Outcome indicators mapped to their descriptions
export const OUTCOME_INDICATORS: Record<string, { name: string; type: 'mortality' | 'admission' }> = {
  'CVDP001MORT': { name: 'CVD: All-cause mortality', type: 'mortality' },
  'CVDP002MORT': { name: 'CVD: CVD mortality', type: 'mortality' },
  'CVDP003MORT': { name: 'CVD: Stroke mortality', type: 'mortality' },
  'CVDP004MORT': { name: 'CVD: Heart attack mortality', type: 'mortality' },
  'CVDP005MORT': { name: 'Hypertension: All-cause mortality', type: 'mortality' },
  'CVDP006MORT': { name: 'Hypertension: CVD mortality', type: 'mortality' },
  'CVDP007MORT': { name: 'CVD risk factors: All-cause mortality', type: 'mortality' },
  'CVDP008MORT': { name: 'CVD risk factors: CVD mortality', type: 'mortality' },
  'CVDP001ADMN': { name: 'Hypertension: Stroke admission', type: 'admission' },
  'CVDP002ADMN': { name: 'Hypertension: Heart attack admission', type: 'admission' },
};

// Helper to find pathway by indicator code
export function findPathwayByIndicatorCode(code: string): ConditionPathway | undefined {
  return CONDITION_PATHWAYS.find(pathway =>
    pathway.stages.some(stage => stage.indicatorCodes.includes(code)) ||
    pathway.outcomeIndicatorCodes.includes(code)
  );
}

// Helper to get all indicator codes for a pathway
export function getPathwayIndicatorCodes(pathway: ConditionPathway): string[] {
  const stageCodes = pathway.stages.flatMap(s => s.indicatorCodes);
  return [...stageCodes, ...pathway.outcomeIndicatorCodes];
}

// Get condition suffix from indicator code (e.g., "CVDP001HYP" -> "HYP")
export function getConditionFromCode(code: string): string {
  const match = code.match(/CVDP\d{3}([A-Z]+)/);
  return match ? match[1] : '';
}

// Group indicators by condition
export function groupIndicatorsByCondition(indicatorCodes: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const code of indicatorCodes) {
    const condition = getConditionFromCode(code);
    const existing = grouped.get(condition) || [];
    existing.push(code);
    grouped.set(condition, existing);
  }
  return grouped;
}
