import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'employee';
  recipientId: string; // Employee ID, or 'admin' for messages sent to admins
  organizationId: string; // Strict multi-tenant isolation
  text: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    senderId:       { type: String, required: true },
    senderName:     { type: String, required: true },
    senderRole:     { type: String, enum: ['admin', 'employee'], required: true },
    recipientId:    { type: String, required: true },
    organizationId: { type: String, required: true, index: true },
    text:           { type: String, required: true, trim: true },
    isRead:         { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for quick thread retrieval
MessageSchema.index({ organizationId: 1, senderId: 1, recipientId: 1 });

const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
