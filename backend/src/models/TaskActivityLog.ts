import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskActivityLog extends Document {
  taskId: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  action: 'Created' | 'Assigned' | 'Started' | 'Paused' | 'Updated' | 'Completed' | 'CommentAdded' | 'AttachmentUploaded';
  timestamp: Date;
  details: string;
}

const TaskActivityLogSchema: Schema = new Schema({
  taskId: { type: String, required: true, index: true },
  organizationId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  action: {
    type: String,
    enum: [
      'Created',
      'Assigned',
      'Started',
      'Paused',
      'Updated',
      'Completed',
      'CommentAdded',
      'AttachmentUploaded'
    ],
    required: true
  },
  timestamp: { type: Date, default: Date.now, index: true },
  details: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model<ITaskActivityLog>('TaskActivityLog', TaskActivityLogSchema);
