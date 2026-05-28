import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import Message from '../models/Message';
import { emitToTenant } from '../utils/socket';

const router = Router();

/**
 * GET /api/messages
 * Fetch all messages for the current user in their organization
 */
router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;

    if (!organizationId || !userId) {
      res.status(400).json({ error: 'Missing organizationId or userId' });
      return;
    }

    const cleanUserId = userId.replace(/^user-|^admin-/, '');

    // Retrieve messages where user is either sender or recipient (either prefixed or clean)
    const messages = await Message.find({
      organizationId,
      $or: [
        { senderId: userId },
        { senderId: cleanUserId },
        { recipientId: userId },
        { recipientId: cleanUserId },
        // Broadcasts to all admins can be read by admins
        { recipientId: 'admin', senderRole: 'employee' }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err: any) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/messages
 * Send a new real-time message
 */
router.post('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipientId, text } = req.body;
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;
    const userEmail = req.user?.email || 'User';
    const userRole = req.user?.role === 'admin' ? 'admin' : 'employee';

    if (!organizationId || !userId) {
      res.status(400).json({ error: 'Missing organizationId or userId' });
      return;
    }

    if (!recipientId || !text || !text.trim()) {
      res.status(400).json({ error: 'Recipient and text are required.' });
      return;
    }

    const cleanUserId = userId.replace(/^user-|^admin-/, '');
    const cleanRecipientId = recipientId.replace(/^user-|^admin-/, '');

    const message = new Message({
      senderId: cleanUserId,
      senderName: userEmail.split('@')[0],
      senderRole: userRole,
      recipientId: cleanRecipientId,
      organizationId,
      text: text.trim(),
      isRead: false
    });

    await message.save();

    // Broadcast message in real-time via Socket.io
    emitToTenant(organizationId, 'message-received', message);

    res.status(201).json(message);
  } catch (err: any) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/messages/:id/read
 * Mark a message thread/message as read
 */
router.patch('/:id/read', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId;

    if (!organizationId || !userId) {
      res.status(400).json({ error: 'Missing organization or user authentication.' });
      return;
    }

    const message = await Message.findOne({ _id: id, organizationId });
    if (!message) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }

    const cleanUserId = userId.replace(/^user-|^admin-/, '');
    const cleanRecipientId = message.recipientId.replace(/^user-|^admin-/, '');

    // Only recipient can mark as read
    if (cleanRecipientId === cleanUserId || (message.recipientId === 'admin' && req.user?.role === 'admin')) {
      message.isRead = true;
      await message.save();
      emitToTenant(organizationId, 'message-read', { messageId: message._id });
    }

    res.json(message);
  } catch (err: any) {
    console.error('Error marking message read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
