import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrganization extends Document {
  id: string;
  companyName: string;
  adminEmail: string;
  passwordHash: string;
  phone: string;
  industry: string;
  subscriptionPlan: 'FREE_TRIAL' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  employeeLimit: number;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    id:               { type: String, required: true, unique: true },
    companyName:      { type: String, required: true, trim: true },
    adminEmail:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:     { type: String, required: true },
    phone:            { type: String, required: true, trim: true },
    industry:         { type: String, required: true, trim: true },
    subscriptionPlan: {
      type: String,
      enum: ['FREE_TRIAL', 'BASIC', 'PREMIUM', 'ENTERPRISE'],
      default: 'FREE_TRIAL',
    },
    employeeLimit: { type: Number, default: 5 },
    status:        { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Organization: Model<IOrganization> =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
