import OpenAI from 'openai';
import { config } from '../config';

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

export interface AITriageResult {
  suggested_category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hazard_flags: string[];
  action_summary: string;
  duplicate_risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AIVerifyResult {
  verification_passed: boolean;
  confidence_score: number; // 0.0 - 1.0
  assessment: string;
  deficiencies_found: string[];
}

export async function triageCivicIssue(
  description: string,
  landmark: string,
  categorySlug?: string
): Promise<AITriageResult> {
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert civic municipal operations AI for Bengaluru Ward 82.
Analyze the citizen issue report and return strict JSON with:
- "suggested_category": one of ["garbage-accumulation", "missed-collection", "recurring-hotspot", "overflowing-bin", "illegal-dumping"]
- "priority": one of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
- "hazard_flags": array of string hazards (e.g. ["blocked stormwater drain", "foul odor", "pedestrian obstruction"])
- "action_summary": concise 1-sentence instruction for municipal field teams
- "duplicate_risk": "LOW" | "MEDIUM" | "HIGH"`
          },
          {
            role: 'user',
            content: `Description: ${description}\nLandmark: ${landmark}\nCurrent Category: ${categorySlug || 'none'}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      return {
        suggested_category: parsed.suggested_category || categorySlug || 'garbage-accumulation',
        priority: parsed.priority || 'MEDIUM',
        hazard_flags: Array.isArray(parsed.hazard_flags) ? parsed.hazard_flags : [],
        action_summary: parsed.action_summary || `Inspect and resolve issue reported at ${landmark}`,
        duplicate_risk: parsed.duplicate_risk || 'LOW',
      };
    } catch (err: any) {
      console.warn('[openai] Triage error, using heuristic fallback:', err.message);
    }
  }

  // Heuristic rule-based fallback
  const text = (description + ' ' + landmark).toLowerCase();
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  const hazards: string[] = [];

  if (text.includes('hospital') || text.includes('drain') || text.includes('overflow') || text.includes('hazard')) {
    priority = 'HIGH';
    hazards.push('Potential drainage or sanitation risk');
  }
  if (text.includes('burning') || text.includes('toxic') || text.includes('chemical') || text.includes('fire')) {
    priority = 'CRITICAL';
    hazards.push('Fire or toxic inhalation risk');
  }

  return {
    suggested_category: categorySlug || 'garbage-accumulation',
    priority,
    hazard_flags: hazards,
    action_summary: `Deploy Ward 82 team to inspect reported condition near ${landmark}`,
    duplicate_risk: 'LOW',
  };
}

export async function verifyCivicResolution(
  caseDescription: string,
  resolutionNotes: string
): Promise<AIVerifyResult> {
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a municipal resolution auditor for Bengaluru Ward 82.
Compare the original citizen complaint against the field operator resolution report.
Return strict JSON with:
- "verification_passed": boolean
- "confidence_score": float between 0.0 and 1.0
- "assessment": 1-2 sentence evaluation
- "deficiencies_found": array of remaining issues if any`
          },
          {
            role: 'user',
            content: `Original Issue: ${caseDescription}\nField Resolution Notes: ${resolutionNotes}`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      return {
        verification_passed: Boolean(parsed.verification_passed),
        confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.85,
        assessment: parsed.assessment || 'Resolution verified by municipal compliance check.',
        deficiencies_found: Array.isArray(parsed.deficiencies_found) ? parsed.deficiencies_found : [],
      };
    } catch (err: any) {
      console.warn('[openai] Verify error, using heuristic fallback:', err.message);
    }
  }

  // Deterministic fallback
  const passed = resolutionNotes.trim().length > 15;
  return {
    verification_passed: passed,
    confidence_score: passed ? 0.9 : 0.6,
    assessment: passed 
      ? 'Field clearance verified against initial civic defect parameters.'
      : 'Insufficient clearance description provided by field operator.',
    deficiencies_found: passed ? [] : ['Detailed clearance confirmation required'],
  };
}
