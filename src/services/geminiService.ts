import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { AuditResult, Candidate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function auditDecision(candidate: Candidate, allCandidates: Candidate[]): Promise<AuditResult> {
  const prompt = `
    Audit this specific decision:
    CANDIDATE: ${JSON.stringify(candidate)}
    
    CONTEXT (Full Dataset): ${JSON.stringify(allCandidates)}
    
    PERFORM:
    1. Bias Detection
    2. Decision Trace
    3. Counterfactual Analysis (What if ${candidate.gender === 'Male' ? 'Female' : 'Male'}? What if University was 'Tier 1'?)
    4. Ethical Risk Scoring
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json"
    }
  });

  try {
    const text = response.text || "{}";
    return JSON.parse(text) as AuditResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Audit failed due to processing error.");
  }
}

export async function auditDataset(candidates: Candidate[]): Promise<string> {
  const prompt = `
    Analyze this entire candidate dataset for systemic bias patterns.
    Look for:
    - Skewed selection rates between genders/ethnicities.
    - Over-reliance on "Proxy Variables" like University Tier.
    - Distribution anomalies.
    
    DATASET: ${JSON.stringify(candidates)}
    
    Provide a high-level executive summary of fairness risks.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are a Senior Fairness Auditor. Provide a professional markdown summary."
    }
  });

  return response.text || "No issues detected.";
}
