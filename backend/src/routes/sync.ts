import { Router, Request, Response } from 'express';

const router = Router();

// POST /api/sync
// Receives GPS telemetry data and prints/acknowledges it
router.post('/', (req: Request, res: Response) => {
  const telemetry = req.body;
  
  // Real-time synchronization is handled directly by active client sockets/React context,
  // but we acknowledge the receipt of telemetry here.
  res.json({ success: true, received: true });
});

export default router;
