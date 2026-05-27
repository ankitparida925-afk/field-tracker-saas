import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/geocode
// Proxy to open-source geocoding services (Photon/Nominatim)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  try {
    const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
    if (!response.ok) {
      throw new Error(`Photon geocoding returned status: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to fetch geocoding suggestions' });
  }
});

export default router;
