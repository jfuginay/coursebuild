import { NextApiRequest, NextApiResponse } from 'next';
import { exportProgress } from '../../export';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { exportId } = req.query;

    if (!exportId || typeof exportId !== 'string') {
      return res.status(400).json({ error: 'Export ID is required' });
    }

    // Get progress from in-memory storage
    const progress = exportProgress.get(exportId);

    if (!progress) {
      return res.status(404).json({ error: 'Export not found' });
    }

    // Return current progress
    return res.status(200).json(progress);

  } catch (error) {
    console.error('Progress fetch error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch progress' 
    });
  }
}