import { Router, Request, Response } from 'express';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware';
import Task, { ITask } from '../models/Task';
import TaskActivityLog from '../models/TaskActivityLog';
import Employee from '../models/Employee';
import { emitToTenant } from '../utils/socket';

const router = Router();

// Helper to calculate overdue flags
const updateOverdueFlag = (task: ITask): void => {
  if (task.status !== 'Completed') {
    const isPastDeadline = new Date().getTime() > new Date(task.deadline).getTime();
    task.isOverdue = isPastDeadline;
    task.delayTimeMs = isPastDeadline ? (new Date().getTime() - new Date(task.deadline).getTime()) : 0;
  }
};

/**
 * POST /api/tasks
 * Create a new task (Admin / Manager only)
 */
router.post('/', verifyToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, assignedEmployeeId, priority, startDate, deadline, notes, location } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is missing in user payload.' });
      return;
    }

    if (!title || !assignedEmployeeId || !startDate || !deadline) {
      res.status(400).json({ error: 'Title, assigned employee, start date, and deadline are required.' });
      return;
    }

    // Fetch employee name
    const employee = await Employee.findOne({ id: assignedEmployeeId, organizationId });
    if (!employee) {
      res.status(404).json({ error: 'Assigned employee not found in this organization.' });
      return;
    }

    const newTask = new Task({
      organizationId,
      title,
      description,
      assignedEmployeeId,
      assignedEmployeeName: employee.name,
      priority,
      startDate: new Date(startDate),
      deadline: new Date(deadline),
      notes,
      location,
      status: 'Pending',
      attachments: [],
      comments: []
    });

    updateOverdueFlag(newTask);
    await newTask.save();

    // Log Activity
    const log = new TaskActivityLog({
      taskId: newTask._id,
      organizationId,
      employeeId: req.user?.userId || 'unknown',
      employeeName: req.user?.email || 'Admin',
      action: 'Created',
      details: `Task was created by admin and assigned to ${employee.name}. Priority: ${priority}.`
    });
    await log.save();

    // Broadcast Socket event
    emitToTenant(organizationId, 'task-created', { task: newTask, log });

    res.status(201).json(newTask);
  } catch (err: any) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tasks
 * Get all tasks for the tenant
 */
router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is missing.' });
      return;
    }

    // Admins see all, employees see only their own
    const filter: any = { organizationId };
    if (req.user?.role === 'employee' && req.user.employeeId) {
      filter.assignedEmployeeId = req.user.employeeId;
    }

    const tasks = await Task.find(filter).sort({ deadline: 1 });
    
    // Dynamically verify and update overdue states on return
    for (const t of tasks) {
      const originalOverdue = t.isOverdue;
      updateOverdueFlag(t);
      if (originalOverdue !== t.isOverdue) {
        await t.save();
      }
    }

    res.json(tasks);
  } catch (err: any) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tasks/analytics
 * Get productivity report and aggregated metrics
 */
router.get('/analytics', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is missing.' });
      return;
    }

    const tasks = await Task.find({ organizationId });
    
    let pending = 0;
    let started = 0;
    let paused = 0;
    let completed = 0;
    let overdue = 0;

    const employeeStats: Record<string, {
      name: string;
      completed: number;
      pending: number;
      overdue: number;
      totalDurationMs: number;
      delayTimeMs: number;
    }> = {};

    tasks.forEach(t => {
      // Dynamic overdue check
      const isPastDeadline = new Date().getTime() > new Date(t.deadline).getTime();
      const currentOverdue = t.status !== 'Completed' && isPastDeadline;

      if (t.status === 'Completed') completed++;
      else if (t.status === 'Started') started++;
      else if (t.status === 'Paused') paused++;
      else pending++;

      if (currentOverdue) overdue++;

      const empId = t.assignedEmployeeId;
      if (!employeeStats[empId]) {
        employeeStats[empId] = {
          name: t.assignedEmployeeName,
          completed: 0,
          pending: 0,
          overdue: 0,
          totalDurationMs: 0,
          delayTimeMs: 0
        };
      }

      if (t.status === 'Completed') {
        employeeStats[empId].completed++;
      } else {
        employeeStats[empId].pending++;
      }

      if (currentOverdue) {
        employeeStats[empId].overdue++;
      }

      employeeStats[empId].totalDurationMs += t.totalDurationMs || 0;
      employeeStats[empId].delayTimeMs += t.delayTimeMs || 0;
    });

    const logs = await TaskActivityLog.find({ organizationId }).sort({ timestamp: -1 }).limit(100);

    res.json({
      summary: {
        total: tasks.length,
        pending,
        started,
        paused,
        completed,
        overdue
      },
      employeePerformance: Object.values(employeeStats),
      recentActivity: logs
    });
  } catch (err: any) {
    console.error('Error computing analytics:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/tasks/:id
 * Update status, notes, or priority
 */
router.put('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const { status, notes, priority, title, description, deadline, startDate } = req.body;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is missing.' });
      return;
    }

    const task = await Task.findOne({ _id: id, organizationId });
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const actorName = req.user?.email || 'User';
    const actorId = req.user?.userId || 'unknown';
    let actionLog: string = '';

    // Handle updates to basic fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (notes !== undefined) task.notes = notes;
    if (startDate !== undefined) task.startDate = new Date(startDate);
    if (deadline !== undefined) task.deadline = new Date(deadline);

    // Handle lifecycle status changes & timer math
    if (status !== undefined && status !== task.status) {
      const prevStatus = task.status;
      task.status = status;
      actionLog = `Task status updated from ${prevStatus} to ${status} by ${actorName}.`;

      const now = new Date();
      if (status === 'Started') {
        task.startedAt = now;
      } else if (status === 'Paused') {
        task.pausedAt = now;
        // Accumulate active working time
        if (task.startedAt) {
          const delta = now.getTime() - new Date(task.startedAt).getTime();
          task.totalDurationMs += delta;
        }
      } else if (status === 'Completed') {
        task.completedAt = now;
        if (prevStatus === 'Started' && task.startedAt) {
          const delta = now.getTime() - new Date(task.startedAt).getTime();
          task.totalDurationMs += delta;
        }
        
        // Final Delay check
        const isPastDeadline = now.getTime() > new Date(task.deadline).getTime();
        task.isOverdue = isPastDeadline;
        task.delayTimeMs = isPastDeadline ? (now.getTime() - new Date(task.deadline).getTime()) : 0;
      }
    } else {
      actionLog = `Task information updated by ${actorName}.`;
    }

    updateOverdueFlag(task);
    await task.save();

    // Log the action audit log
    let activityAction: any = 'Updated';
    if (status === 'Started') activityAction = 'Started';
    else if (status === 'Paused') activityAction = 'Paused';
    else if (status === 'Completed') activityAction = 'Completed';

    const log = new TaskActivityLog({
      taskId: task._id,
      organizationId,
      employeeId: actorId,
      employeeName: actorName,
      action: activityAction,
      details: actionLog
    });
    await log.save();

    // Broadcast updates via Socket.io
    emitToTenant(organizationId, 'task-updated', { task, log });

    res.json(task);
  } catch (err: any) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks/:id/comments
 * Add comment to task
 */
router.post('/:id/comments', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is missing.' });
      return;
    }

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Comment text cannot be empty.' });
      return;
    }

    const task = await Task.findOne({ _id: id, organizationId });
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const actorName = req.user?.email || 'User';
    const actorId = req.user?.userId || 'unknown';

    const newComment = {
      id: new Date().getTime().toString(),
      authorName: actorName,
      authorId: actorId,
      text,
      createdAt: new Date()
    };

    task.comments.push(newComment);
    await task.save();

    // Audit log
    const log = new TaskActivityLog({
      taskId: task._id,
      organizationId,
      employeeId: actorId,
      employeeName: actorName,
      action: 'CommentAdded',
      details: `Comment added by ${actorName}: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`
    });
    await log.save();

    emitToTenant(organizationId, 'task-updated', { task, log });

    res.status(201).json(task);
  } catch (err: any) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tasks/:id/attachments
 * Add file proof/attachments
 */
router.post('/:id/attachments', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fileName, fileUrl } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is missing.' });
      return;
    }

    if (!fileName || !fileUrl) {
      res.status(400).json({ error: 'File name and URL are required.' });
      return;
    }

    const task = await Task.findOne({ _id: id, organizationId });
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const actorName = req.user?.email || 'User';
    const actorId = req.user?.userId || 'unknown';

    task.attachments.push({
      fileName,
      fileUrl,
      uploadedAt: new Date()
    });

    await task.save();

    // Audit log
    const log = new TaskActivityLog({
      taskId: task._id,
      organizationId,
      employeeId: actorId,
      employeeName: actorName,
      action: 'AttachmentUploaded',
      details: `${actorName} uploaded file proof: "${fileName}"`
    });
    await log.save();

    emitToTenant(organizationId, 'task-updated', { task, log });

    res.status(201).json(task);
  } catch (err: any) {
    console.error('Error uploading attachment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tasks/:id/logs
 * Get audit timeline logs for a specific task
 */
router.get('/:id/logs', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is missing.' });
      return;
    }

    const logs = await TaskActivityLog.find({ taskId: id, organizationId }).sort({ timestamp: 1 });
    res.json(logs);
  } catch (err: any) {
    console.error('Error fetching task timeline logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
