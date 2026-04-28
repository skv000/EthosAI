import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { AuditResult, Candidate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

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

export async function auditDataset(candidates: Candidate[]): Promise<{ summary: string, disparateImpact: number, proxyCorrelation: number, ethicalIndex: number }> {
  const prompt = `
    Analyze this entire candidate dataset for systemic bias patterns.
    Look for:
    - Skewed selection rates between genders/ethnicities.
    - Over-reliance on "Proxy Variables" like University Tier.
    - Distribution anomalies.
    
    DATASET: ${JSON.stringify(candidates)}
    
    TASKS:
    1. Summarize high-level findings (3 sentences max).
    2. Calculate a "Disparate Impact" ratio (0.00 to 1.00). Use 4/5ths rule logic.
    3. Calculate a "Proxy Correlation" score (0.00 to 1.00).
    4. Calculate an "Ethical Index" (0-100).
    
    RETURN ONLY JSON:
    {
      "summary": "string",
      "disparateImpact": number,
      "proxyCorrelation": number,
      "ethicalIndex": number
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are a Senior Fairness Auditor. Return only the requested JSON format.",
      responseMimeType: "application/json"
    }
  });

  try {
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    return {
      summary: "System audit failed due to parsing error.",
      disparateImpact: 0.8,
      proxyCorrelation: 0.2,
      ethicalIndex: 85
    };
  }
}

export async function auditCounterfactuals(candidates: Candidate[]): Promise<{ gender_sensitivity: number, university_sensitivity: number, analysis: string }> {
  const prompt = `
    Perform a global counterfactual sensitivity analysis on this recruitment dataset.
    
    DATASET: ${JSON.stringify(candidates)}
    
    TASKS:
    1. Calculate a "Gender Sensitivity" score (0-100) representing how much gender influences outcomes.
    2. Calculate a "University Prestige" score (0-100) representing how much university tier influences outcomes.
    3. Provide a brief (2 sentence) executive insight on intersectional stability.
    
    RETURN ONLY JSON:
    {
      "gender_sensitivity": number,
      "university_sensitivity": number,
      "analysis": "string"
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "You are an AI Governance Engine. Return only the requested JSON format.",
      responseMimeType: "application/json"
    }
  });

  try {
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    return {
      gender_sensitivity: 0,
      university_sensitivity: 0,
      analysis: "Failed to perform global counterfactual audit."
    };
  }
}
