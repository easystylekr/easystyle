// Minimal admin check endpoint
import type { VercelRequest, VercelResponse } from 'vercel';
import { requireAdmin } from './_client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const check = await requireAdmin(req as any);
  if (!check.ok) {
    return res.status(check.status).json(check.json);
  }
  const { user, profile } = check;
  return res.status(200).json({ ok: true, user: { id: user.id, email: user.email }, profile });
}

