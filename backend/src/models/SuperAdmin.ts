import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISuperAdmin extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'superadmin';
  createdAt: Date;
}

const SuperAdminSchema = new Schema<ISuperAdmin>(
  {
    id:           { type: String, required: true, unique: true },
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, default: 'superadmin' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const SuperAdmin: Model<ISuperAdmin> =
  mongoose.models.SuperAdmin ||
  mongoose.model<ISuperAdmin>('SuperAdmin', SuperAdminSchema);

export default SuperAdmin;
