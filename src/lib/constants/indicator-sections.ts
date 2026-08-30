/**
 * Dashboard Section Definitions
 * 
 * Groups indicators into logical sections for the redesigned dashboard.
 */

import { NHS_COLORS } from './colors';
import type { Indicator } from '@/lib/api/types';

export type SectionType = 'prevalence' | 'detection' | 'treatment' | 'control' | 'monitoring' | 'outcomes' | 'other';

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
      'CVDP008CKD',  // CKD treated with SGLT2i
      'CVDP006DM',   // Type 2 diabetes treated with SGLT2i
      'CVDP003HF',   // Heart failure treated with four pillar model
      'CVDP004HF',   // Heart failure treated with SGLT2i
      'CVDP001CVKM', // CKD, HF or T2D treated with SGLT2i
      'CVDP006HYP',  // Potential antihypertensive overtreatment
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
      'CVDP010HYP',  // CVD treated to BP threshold
      'CVDP002CVKM', // CVD with BP and cholesterol treated to threshold
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

export const REVIEW_SECTION: DashboardSection = {
  id: 'other',
  name: 'Needs review',
  description: 'New indicators awaiting a confirmed pathway stage',
  color: NHS_COLORS.midGrey,
  lowerIsBetter: false,
  indicatorCodes: [],
};

export type IndicatorDescriptor = Pick<Indicator, 'IndicatorCode' | 'IndicatorName' | 'IndicatorShortName'>;

export interface IndicatorClassification {
  section: DashboardSection;
  lowerIsBetter: boolean;
  source: 'mapped' | 'inferred' | 'unclassified';
  reason: string;
}

const SECTION_BY_CODE = new Map(
  DASHBOARD_SECTIONS.flatMap(section => section.indicatorCodes.map(code => [code, section] as const)),
);

const LOWER_IS_BETTER_OVERRIDES = new Set([
  'CVDP006HYP', // Potential antihypertensive overtreatment
]);

/** Classifies API indicators not yet listed in the maintained mapping. */
export function classifyIndicator(indicator: IndicatorDescriptor): IndicatorClassification {
  const mappedSection = SECTION_BY_CODE.get(indicator.IndicatorCode);
  if (mappedSection) {
    return {
      section: mappedSection,
      lowerIsBetter: LOWER_IS_BETTER_OVERRIDES.has(indicator.IndicatorCode) || mappedSection.lowerIsBetter,
      source: 'mapped',
      reason: 'Maintained indicator mapping',
    };
  }

  const text = `${indicator.IndicatorShortName} ${indicator.IndicatorName}`.toLowerCase();
  const inferred = (sectionId: Exclude<SectionType, 'other'>, lowerIsBetter: boolean, reason: string): IndicatorClassification => ({
    section: DASHBOARD_SECTIONS.find(section => section.id === sectionId)!,
    lowerIsBetter,
    source: 'inferred',
    reason,
  });

  if (/mortality|admission|\bmort\b|\badmn\b/.test(`${text} ${indicator.IndicatorCode.toLowerCase()}`)) {
    return inferred('outcomes', true, 'Mortality or admission wording');
  }
  if (/prevalence/.test(text)) {
    return inferred('prevalence', false, 'Prevalence wording');
  }
  if (/undiagnosed|uncoded|no recorded|no diagnosis|no investigation/.test(text)) {
    return inferred('detection', true, 'Detection-gap wording');
  }
  if (/overtreatment|over-treatment/.test(text)) {
    return inferred('treatment', true, 'Potential overtreatment wording');
  }
  if (/threshold|at target|controlled|\bcontrol\b/.test(text)) {
    return inferred('control', false, 'Therapeutic target wording');
  }
  if (/monitoring|monitored|record of|recorded .*(score|status)|risk score|assessment/.test(text)) {
    return inferred('monitoring', false, 'Monitoring or recording wording');
  }
  if (/treated|treatment|therapy|anticoagul|sglt2|statin|\bllt\b|support offered|four pillar/.test(text)) {
    return inferred('treatment', false, 'Treatment wording');
  }

  return {
    section: REVIEW_SECTION,
    lowerIsBetter: false,
    source: 'unclassified',
    reason: 'No classification rule matched',
  };
}

/** Returns sections with newly inferred indicators appended. */
export function getDashboardSections(indicators: IndicatorDescriptor[]): DashboardSection[] {
  const sections = DASHBOARD_SECTIONS.map(section => ({ ...section, indicatorCodes: [...section.indicatorCodes] }));
  const sectionMap = new Map(sections.map(section => [section.id, section]));
  const reviewCodes: string[] = [];

  for (const indicator of indicators) {
    if (SECTION_BY_CODE.has(indicator.IndicatorCode)) continue;
    const classification = classifyIndicator(indicator);
    if (classification.section.id === 'other') {
      reviewCodes.push(indicator.IndicatorCode);
      continue;
    }
    const section = sectionMap.get(classification.section.id);
    if (section && !section.indicatorCodes.includes(indicator.IndicatorCode)) {
      section.indicatorCodes.push(indicator.IndicatorCode);
    }
  }

  if (reviewCodes.length > 0) {
    sections.push({ ...REVIEW_SECTION, indicatorCodes: reviewCodes });
  }
  return sections;
}

export function findSectionForIndicator(code: string, indicator?: IndicatorDescriptor): DashboardSection | undefined {
  return SECTION_BY_CODE.get(code) ?? (indicator ? classifyIndicator(indicator).section : undefined);
}

/** Returns the comparison polarity for an indicator. */
export function isLowerBetterIndicator(code: string, indicator?: IndicatorDescriptor): boolean {
  if (LOWER_IS_BETTER_OVERRIDES.has(code)) return true;
  return indicator ? classifyIndicator(indicator).lowerIsBetter : findSectionForIndicator(code)?.lowerIsBetter ?? false;
}

// Helper to get section by ID
export function getSectionById(id: SectionType): DashboardSection | undefined {
  return id === 'other' ? REVIEW_SECTION : DASHBOARD_SECTIONS.find(section => section.id === id);
}
