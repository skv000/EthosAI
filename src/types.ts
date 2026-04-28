export enum BiasType {
  HISTORICAL_BIAS = "historical_bias",
  SAMPLING_BIAS = "sampling_bias",
  PROXY_BIAS = "proxy_bias",
  MEASUREMENT_BIAS = "measurement_bias",
  ALGORITHMIC_BIAS = "algorithmic_bias",
}

export enum EthicalRiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export interface Candidate {
  id: string;
  name: string;
  gender: string;
  ethnicity: string;
  university_tier: "Tier 1" | "Tier 2" | "Tier 3";
  location: string;
  years_experience: number;
  skills: string[];
  decision: "Accepted" | "Rejected";
  confidence: number;
}

export interface AuditResult {
  bias_detected: boolean;
  bias_type: BiasType[];
  confidence_score: number;
  decision_explanation: string;
  bias_explanation: string;
  counterfactual_analysis: string;
  affected_feature: string[];
  ethical_risk_level: EthicalRiskLevel;
  recommendation: string;
}
