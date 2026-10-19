import OpenAI from 'openai';
import { config } from '../config';

/**
 * Lazily obtain the OpenAI client instance using the configured environment variable.
 * Never prints or leaks the key.
 */
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY || config.openaiApiKey;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new OpenAI({
    apiKey: apiKey.trim(),
    timeout: 15000,
    maxRetries: 1,
  });
}

export interface AIHealthStatus {
  configured: boolean;
  operational: boolean;
  model: string;
  status: 'operational' | 'unconfigured' | 'quota_exceeded' | 'invalid_key' | 'network_error';
  message: string;
  checked_at: string;
}

export interface AITriageResult {
  suggested_category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hazard_flags: string[];
  action_summary: string;
  duplicate_risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AIRefineResult {
  refined_description: string;
  identified_landmarks: string[];
  suggested_focus: string;
}

export interface AIDuplicateResult {
  potential_duplicate: boolean;
  matched_case_number: string | null;
  similarity_score: number;
  reason: string;
}

export interface AICaseSummaryResult {
  case_number: string;
  current_status: string;
  summary: string;
  milestones_completed: number;
  pending_action: string;
}

export interface AIAdvisoryAuditResult {
  advisory_notes: string;
  operator_notes_clear: boolean;
  requires_human_verification: true;
  checklist_items_covered: string[];
}

/**
 * Diagnostic health check verifying whether OPENAI_API_KEY is configured
 * and capable of successfully completing a minimal API request.
 * Never leaks the key or secret contents.
 */
export async function checkAIHealth(): Promise<AIHealthStatus> {
  const client = getOpenAIClient();
  const checkedAt = new Date().toISOString();

  if (!client) {
    return {
      configured: false,
      operational: false,
      model: 'gpt-4o-mini',
      status: 'unconfigured',
      message: 'OPENAI_API_KEY is not configured in the server environment. AI assistant features are safely disabled.',
      checked_at: checkedAt,
    };
  }

  try {
    // Perform minimal diagnostic ping using standard gpt-4o-mini model
    await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    });

    return {
      configured: true,
      operational: true,
      model: 'gpt-4o-mini',
      status: 'operational',
      message: 'OpenAI API connection is healthy and operational.',
      checked_at: checkedAt,
    };
  } catch (err: any) {
    const status = err.status;
    let errType: AIHealthStatus['status'] = 'network_error';
    let userMsg = 'Failed to connect to OpenAI API.';

    if (status === 401) {
      errType = 'invalid_key';
      userMsg = 'OpenAI API key is invalid or revoked. Please verify OPENAI_API_KEY in the server environment.';
    } else if (status === 429) {
      errType = 'quota_exceeded';
      userMsg = 'OpenAI API rate limit reached or quota exhausted. Please check billing and usage limits on the OpenAI dashboard.';
    } else if (status === 404) {
      userMsg = 'Configured model gpt-4o-mini is not accessible with this OpenAI account.';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      errType = 'network_error';
      userMsg = 'Network connectivity error while reaching api.openai.com.';
    }

    return {
      configured: true,
      operational: false,
      model: 'gpt-4o-mini',
      status: errType,
      message: userMsg,
      checked_at: checkedAt,
    };
  }
}

/**
 * 1. Categorization & Hazard Triage
 * Recommends appropriate municipal defect category from REAL database categories.
 * Throws explicit error when AI is unconfigured or unavailable — NO FAKE FALLBACKS.
 */
export async function triageCivicIssue(
  description: string,
  landmark: string,
  availableCategories: { slug: string; name_en: string }[],
  currentSlug?: string
): Promise<AITriageResult> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('AI triage is unavailable: OPENAI_API_KEY is not configured on the server.');
  }

  const categoryListStr = availableCategories.map(c => `"${c.slug}" (${c.name_en})`).join(', ');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert municipal solid waste and civic defect classifier.
Given the citizen's description and landmark, select the most accurate category from ONLY these valid options:
[${categoryListStr}]

Return valid JSON with:
- "suggested_category": one of the exact slugs provided above
- "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
- "hazard_flags": array of string hazards (e.g. "blocked stormwater drain", "pedestrian obstruction")
- "action_summary": concise 1-sentence instruction for municipal field teams
- "duplicate_risk": "LOW" | "MEDIUM" | "HIGH"`
      },
      {
        role: 'user',
        content: `Description: ${description}\nLandmark: ${landmark || 'Not provided'}\nCurrent Selected: ${currentSlug || 'none'}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 250,
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');
  const validSlugs = availableCategories.map(c => c.slug);
  const pickedCategory = validSlugs.includes(parsed.suggested_category)
    ? parsed.suggested_category
    : (currentSlug && validSlugs.includes(currentSlug) ? currentSlug : validSlugs[0] || 'garbage-accumulation');

  return {
    suggested_category: pickedCategory,
    priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed.priority) ? parsed.priority : 'MEDIUM',
    hazard_flags: Array.isArray(parsed.hazard_flags) ? parsed.hazard_flags : [],
    action_summary: String(parsed.action_summary || `Inspect reported civic issue near ${landmark || 'location'}`),
    duplicate_risk: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.duplicate_risk) ? parsed.duplicate_risk : 'LOW',
  };
}

/**
 * 2. Issue Description Writing Assistant
 * Helps citizens clarify their report description to make it actionable for municipal workers.
 * Throws explicit error when AI is unconfigured or unavailable — NO FAKE FALLBACKS.
 */
export async function refineIssueDescription(
  rawText: string,
  landmark?: string
): Promise<AIRefineResult> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('AI description refinement is unavailable: OPENAI_API_KEY is not configured on the server.');
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a civic reporting assistant helping citizens write concise, objective municipal tickets.
Rules:
- Do not add fake facts, invented dates, or fictional names.
- Focus strictly on location precision, physical obstruction, and health/safety hazards.
- Remove emotional venting; maintain neutral, actionable clarity.
Return strict JSON with:
- "refined_description": updated clear text (2-3 sentences max)
- "identified_landmarks": array of specific physical references mentioned
- "suggested_focus": 1-sentence tip on what detail field workers will need most`
      },
      {
        role: 'user',
        content: `Citizen Draft: ${rawText}\nLandmark: ${landmark || 'None specified'}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 250,
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');
  return {
    refined_description: String(parsed.refined_description || rawText),
    identified_landmarks: Array.isArray(parsed.identified_landmarks) ? parsed.identified_landmarks : [],
    suggested_focus: String(parsed.suggested_focus || 'Provide nearest cross street or building number for faster response.'),
  };
}

/**
 * 3. Duplicate Detection via Proximity & Persisted Reports
 * Compares new submission against genuine nearby cases in the database.
 * Throws explicit error when AI is unconfigured or unavailable — NO FAKE FALLBACKS.
 */
export async function detectDuplicateReport(
  newDescription: string,
  categorySlug: string,
  nearbyCases: Array<{ case_number: string; description: string; landmark: string; status: string }>
): Promise<AIDuplicateResult> {
  if (nearbyCases.length === 0) {
    return {
      potential_duplicate: false,
      matched_case_number: null,
      similarity_score: 0.0,
      reason: 'No existing active cases found within immediate geographic proximity.',
    };
  }

  const client = getOpenAIClient();
  if (!client) {
    throw new Error('AI duplicate checking is unavailable: OPENAI_API_KEY is not configured on the server.');
  }

  const casesContext = nearbyCases.map((c, i) => 
    `Case #${i + 1} (${c.case_number}): Category=${categorySlug}, Status=${c.status}, Landmark=${c.landmark}, Description=${c.description}`
  ).join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a municipal duplicate detection auditor.
Evaluate if the new citizen complaint describes the EXACT same on-ground civic defect as any existing nearby active case.
Return JSON with:
- "potential_duplicate": boolean
- "matched_case_number": case_number string if duplicate, otherwise null
- "similarity_score": float 0.0 to 1.0
- "reason": brief 1-sentence explanation`
      },
      {
        role: 'user',
        content: `NEW REPORT:\nDescription: ${newDescription}\nCategory: ${categorySlug}\n\nEXISTING NEARBY CASES IN DATABASE:\n${casesContext}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 200,
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');
  return {
    potential_duplicate: Boolean(parsed.potential_duplicate),
    matched_case_number: parsed.matched_case_number || null,
    similarity_score: typeof parsed.similarity_score === 'number' ? parsed.similarity_score : 0.0,
    reason: String(parsed.reason || 'Evaluated against active ward tickets.'),
  };
}

/**
 * 4. Timeline Summarization
 * Generates an objective, readable summary of a case's persisted audit history.
 * Throws explicit error when AI is unconfigured or unavailable — NO FAKE FALLBACKS.
 */
export async function summarizeCaseTimeline(
  caseNumber: string,
  currentStatus: string,
  description: string,
  landmark: string,
  transitions: Array<{ from_status: string; to_status: string; actor_name: string; reason: string; created_at: string }>
): Promise<AICaseSummaryResult> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('AI timeline summarization is unavailable: OPENAI_API_KEY is not configured on the server.');
  }

  const historyLines = transitions.map(t => 
    `- [${new Date(t.created_at).toISOString().slice(0, 16)}] Status changed from ${t.from_status} to ${t.to_status} by ${t.actor_name || 'System'}: "${t.reason || 'None'}"`
  ).join('\n');

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a civic audit summary assistant.
Summarize the real chronological progression of this municipal defect ticket based ONLY on the provided events.
Do not invent any dates, actions, or officers.
Return strict JSON with:
- "summary": 2-3 sentence neutral plain-language summary of what has transpired
- "pending_action": 1 sentence describing what action is next in the workflow`
      },
      {
        role: 'user',
        content: `Case: ${caseNumber}\nDescription: ${description}\nLandmark: ${landmark}\nCurrent Status: ${currentStatus}\nAudit History:\n${historyLines || 'No transitions recorded yet.'}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 250,
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');
  return {
    case_number: caseNumber,
    current_status: currentStatus,
    summary: String(parsed.summary || `Case ${caseNumber} is currently ${currentStatus}.`),
    milestones_completed: transitions.length,
    pending_action: String(parsed.pending_action || `Awaiting municipal progression from ${currentStatus}.`),
  };
}

/**
 * 5. Advisory Resolution Review (NON-AUTHORITATIVE)
 * Compares operator notes against original complaint to assist human review.
 * NOTE: AI NEVER marks cases resolved or changes case status. Status change is strictly
 * restricted to authorized human users through the state machine.
 */
export async function reviewResolutionNotes(
  caseDescription: string,
  resolutionNotes: string
): Promise<AIAdvisoryAuditResult> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error('AI advisory review is unavailable: OPENAI_API_KEY is not configured on the server.');
  }

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an advisory civic auditor assistant.
Review whether the field operator's clearance notes address the issues raised in the citizen complaint.
IMPORTANT: You are purely advisory. Authoritative closure requires verified operator photographic evidence and citizen confirmation.
Return JSON with:
- "advisory_notes": 1-2 sentence evaluation of whether the operator addressed the complaint
- "operator_notes_clear": boolean indicating whether the description describes physical cleanup
- "checklist_items_covered": array of string elements addressed (e.g. ["waste removed", "surrounding sidewalk swept"])`
      },
      {
        role: 'user',
        content: `Original Complaint: ${caseDescription}\nOperator Resolution Notes: ${resolutionNotes}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 250,
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');
  return {
    advisory_notes: String(parsed.advisory_notes || 'Operator notes submitted for supervisor review.'),
    operator_notes_clear: Boolean(parsed.operator_notes_clear),
    requires_human_verification: true,
    checklist_items_covered: Array.isArray(parsed.checklist_items_covered) ? parsed.checklist_items_covered : [],
  };
}
