/**
 * Dashboard Section Definitions
 * 
 * Groups indicators into logical sections for the redesigned dashboard.
 */

import { NHS_COLORS } from './colors';

export type SectionType = 'prevalence' | 'detection' | 'treatment' | 'control' | 'monitoring' | 'outcomes';

export interface DashboardSection {
  id: SectionType;
  name: string;
  description: string;
  color: string;
  /** For detection gaps, lower is better */
  lowerIsBetter: boolean;
  /** Indicator codes that belong to this section */
  indicatorCodes: string[];
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    id: 'prevalence',
    name: 'Prevalence',
    description: 'Recorded disease in your population',
    color: NHS_COLORS.blue,
    lowerIsBetter: false,
    indicatorCodes: [
      'CVDP001AF',   // AF prevalence
      'CVDP001HYP',  // Hypertension prevalence
      'CVDP001CKD',  // CKD prevalence
      'CVDP001CVD',  // CVD prevalence
      'CVDP001HF',   // Heart failure prevalence
      'CVDP002FH',   // FH prevalence (possible/probable/confirmed)
      'CVDP003FH',   // FH genetically confirmed
    ],
  },
  {
    id: 'detection',
    name: 'Detection Gaps',
    description: 'Patients potentially undiagnosed — lower is better',
    color: NHS_COLORS.orange,
    lowerIsBetter: true,
    indicatorCodes: [
      'CVDP005HYP',  // High risk - one high BP with no recorded hypertension
      'CVDP002CKD',  // Uncoded - two low eGFRs with no recorded CKD
      'CVDP003CKD',  // High risk - one low eGFR with no recorded CKD
      'CVDP004FH',   // Cholesterol in at risk range for FH with no investigation
      'CVDP002NDH',  // High risk - one HbA1c 42-48 with no recorded NDH or DM
      'CVDP003DM',   // Uncoded - two high HbA1c with no recorded diabetes
      'CVDP005DM',   // High risk - one high HbA1c with no recorded diabetes
    ],
  },
  {
    id: 'treatment',
    name: 'Treatment',
    description: 'Patients receiving appropriate therapy',
    color: NHS_COLORS.green,
    lowerIsBetter: false,
    indicatorCodes: [
      'CVDP002AF',   // AF treated with anticoagulants
      'CVDP005AF',   // AF treated with anticoagulants - DOAC prioritised
      'CVDP005CKD',  // CKD high risk treated with RAS antagonists
      'CVDP003CHOL', // QRISK >= 20% treated with LLT
      'CVDP006CHOL', // QRISK >= 10% treated with LLT
      'CVDP008CHOL', // Primary prevention of CVD treated with LLT
      'CVDP009CHOL', // CVD treated with LLT
      'CVDP010CHOL', // CKD treated with LLT
      'CVDP002SMOK', // Current smokers offered support/treatment
    ],
  },
  {
    id: 'control',
    name: 'Control',
    description: 'Patients at therapeutic targets',
    color: NHS_COLORS.aqua,
    lowerIsBetter: false,
    indicatorCodes: [
      'CVDP002HYP',  // Hypertension treated to threshold (age < 80)
      'CVDP003HYP',  // Hypertension treated to threshold (age >= 80)
      'CVDP007HYP',  // Hypertension treated to threshold (all ages)
      'CVDP007CKD',  // CKD ACR < 70 treated to appropriate BP threshold
      'CVDP012CHOL', // CVD treated to cholesterol threshold
      'CVDP002CHD',  // CHD treated to BP threshold
      'CVDP002STRK', // Stroke treatment to BP threshold
    ],
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    description: 'Recording and monitoring activity',
    color: NHS_COLORS.lightBlue,
    lowerIsBetter: false,
    indicatorCodes: [
      'CVDP001SMOK', // Smoking: Record of smoking status
      'CVDP001BMI',  // BMI: Record of BMI status
      'CVDP004HYP',  // Hypertension: BP monitoring
      'CVDP009HYP',  // Hypertension: Monitoring with ACR
      'CVDP004CKD',  // CKD: Monitoring with ACR
      'CVDP006CKD',  // CKD: Monitoring with eGFR
      'CVDP002HF',   // HF: Monitoring with eGFR
      'CVDP004AF',   // AF: Low risk AF with recorded CHA2DS2-VASc score
      'CVDP011CHOL', // Cholesterol: CVD cholesterol monitoring
    ],
  },
  {
    id: 'outcomes',
    name: 'Outcomes',
    description: 'Mortality and hospital admissions',
    color: NHS_COLORS.red,
    lowerIsBetter: true,
    indicatorCodes: [
      'CVDP001MORT', // CVD: All-cause mortality
      'CVDP002MORT', // CVD: CVD mortality
      'CVDP003MORT', // CVD: Stroke mortality
      'CVDP004MORT', // CVD: Heart attack mortality
      'CVDP005MORT', // Hypertension: All-cause mortality
      'CVDP006MORT', // Hypertension: CVD mortality
      'CVDP007MORT', // CVD risk factors: All-cause mortality
      'CVDP008MORT', // CVD risk factors: CVD mortality
      'CVDP001ADMN', // Hypertension: stroke admission
      'CVDP002ADMN', // Hypertension: heart attack admission
    ],
  },
];

// Helper to find section for an indicator
export function findSectionForIndicator(code: string): DashboardSection | undefined {
  return DASHBOARD_SECTIONS.find(section => 
    section.indicatorCodes.includes(code)
  );
}

// Helper to get section by ID
export function getSectionById(id: SectionType): DashboardSection | undefined {
  return DASHBOARD_SECTIONS.find(section => section.id === id);
}
