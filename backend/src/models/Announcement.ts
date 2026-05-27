import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnnouncement extends Document {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'maintenance';
  createdAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    id:      { type: String, required: true, unique: true },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type:    {
      type: String,
      enum: ['info', 'warning', 'alert', 'maintenance'],
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

export default Announcement;
