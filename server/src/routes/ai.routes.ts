import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth/middleware';
import { triageCivicIssue, verifyCivicResolution } from '../services/openai.service';

const router = Router();

// POST /api/v1/ai/triage — AI-assisted categorization and hazard scoring
router.post('/triage', authenticateToken, async (req: Request, res: Response) => {
  const { description, landmark, category_slug } = req.body;

  if (!description) {
    res.status(400).json({ detail: 'description is required for AI triage.' });
    return;
  }

  try {
    const result = await triageCivicIssue(
      String(description),
      String(landmark || ''),
      category_slug ? String(category_slug) : undefined
    );
    res.json(result);
  } catch (err: any) {
    console.error('[ai/triage] Error:', err);
    res.status(500).json({ detail: 'AI triage processing failed.' });
  }
});

// POST /api/v1/ai/verify — AI-assisted resolution verification
router.post('/verify', authenticateToken, async (req: Request, res: Response) => {
  const { case_description, resolution_notes } = req.body;

  if (!case_description || !resolution_notes) {
    res.status(400).json({ detail: 'case_description and resolution_notes are required.' });
    return;
  }

  try {
    const result = await verifyCivicResolution(
      String(case_description),
      String(resolution_notes)
    );
    res.json(result);
  } catch (err: any) {
    console.error('[ai/verify] Error:', err);
    res.status(500).json({ detail: 'AI resolution verification failed.' });
  }
});

export default router;
