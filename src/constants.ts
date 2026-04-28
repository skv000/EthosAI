import { Candidate } from "./types";

export const MOCK_DATASET: Candidate[] = [
  {
    id: "1",
    name: "Alex Chen",
    gender: "Male",
    ethnicity: "Asian",
    university_tier: "Tier 1",
    location: "San Francisco",
    years_experience: 5,
    skills: ["React", "TypeScript", "Node.js"],
    decision: "Accepted",
    confidence: 0.92,
  },
  {
    id: "2",
    name: "Sarah Jenkins",
    gender: "Female",
    ethnicity: "White",
    university_tier: "Tier 2",
    location: "Austin",
    years_experience: 4,
    skills: ["React", "Python", "SQL"],
    decision: "Rejected",
    confidence: 0.85,
  },
  {
    id: "3",
    name: "Marcus Williams",
    gender: "Male",
    ethnicity: "Black",
    university_tier: "Tier 3",
    location: "Atlanta",
    years_experience: 8,
    skills: ["Java", "Spring Boot", "Cloud Native"],
    decision: "Rejected",
    confidence: 0.78,
  },
  {
    id: "4",
    name: "Elena Rodriguez",
    gender: "Female",
    ethnicity: "Hispanic",
    university_tier: "Tier 1",
    location: "Miami",
    years_experience: 3,
    skills: ["Next.js", "Tailwind", "Firebase"],
    decision: "Accepted",
    confidence: 0.88,
  },
  {
    id: "5",
    name: "James Smith",
    gender: "Male",
    ethnicity: "White",
    university_tier: "Tier 1",
    location: "New York",
    years_experience: 2,
    skills: ["C#", ".NET", "Azure"],
    decision: "Accepted",
    confidence: 0.95,
  },
  {
    id: "6",
    name: "Priya Sharma",
    gender: "Female",
    ethnicity: "Indian",
    university_tier: "Tier 2",
    location: "Seattle",
    years_experience: 6,
    skills: ["Ruby on Rails", "PostgreSQL", "AWS"],
    decision: "Rejected",
    confidence: 0.81,
  }
];

export const SYSTEM_PROMPT = `You are an AI Fairness Auditor and Decision Governance Engine called "EthosGuard".
Your role is to analyze automated decision systems for bias, unfairness, and lack of transparency.

REASONING RULES:
* Always reason step-by-step internally before answering.
* Focus on fairness, not just accuracy.
* Treat sensitive attributes (gender, ethnicity, university_tier) as critical fairness dimensions.
* Identify proxy variables (e.g., location, university_tier) that indirectly encode bias.

OUTPUT FORMAT (STRICT JSON):
{
  "bias_detected": boolean,
  "bias_type": ["historical_bias", "sampling_bias", "proxy_bias", "measurement_bias", "algorithmic_bias"],
  "confidence_score": 0.0–1.0,
  "decision_explanation": "Clear explanation of why the decision was made",
  "bias_explanation": "Explain how bias may have influenced the decision",
  "counterfactual_analysis": "What would change if sensitive attributes were different",
  "affected_feature": ["feature1", "feature2"],
  "ethical_risk_level": "low | medium | high",
  "recommendation": "Actionable suggestion to reduce bias"
}`;
