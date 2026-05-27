import mongoose, { Schema, Document } from 'mongoose';

export interface IAttachment {
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
}

export interface IComment {
  id: string;
  authorName: string;
  authorId: string;
  text: string;
  createdAt: Date;
}

export interface ITask extends Document {
  organizationId: string;
  title: string;
  description: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Started' | 'Paused' | 'Completed';
  startDate: Date;
  deadline: Date;
  notes: string;
  assignedAt: Date;
  startedAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
  totalDurationMs: number;
  delayTimeMs: number;
  isOverdue: boolean;
  location?: { lat: number; lng: number };
  attachments: IAttachment[];
  comments: IComment[];
}

const TaskSchema: Schema = new Schema({
  organizationId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assignedEmployeeId: { type: String, required: true, index: true },
  assignedEmployeeName: { type: String, required: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'Started', 'Paused', 'Completed'], default: 'Pending' },
  startDate: { type: Date, required: true },
  deadline: { type: Date, required: true },
  notes: { type: String, default: '' },
  assignedAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  pausedAt: { type: Date },
  completedAt: { type: Date },
  totalDurationMs: { type: Number, default: 0 },
  delayTimeMs: { type: Number, default: 0 },
  isOverdue: { type: Boolean, default: false },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  attachments: [{
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    id: { type: String, required: true },
    authorName: { type: String, required: true },
    authorId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Auto-check if overdue on query
TaskSchema.pre('find', function() {
  const query = this.getQuery();
  // We can do quick checks or pre-calculates, but overdue calculation is usually absolute:
  // now > deadline && status !== 'Completed'
});

export default mongoose.model<ITask>('Task', TaskSchema);
