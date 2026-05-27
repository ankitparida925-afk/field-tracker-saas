import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  department: string;
  phone: string;
  avatar: string;
  color: string;
  organizationId: string;
  employeeCode?: string;
  assignedManagerId?: string;
  isManager: boolean;
  isActive: boolean;
  otpCode?: string;
  otpExpiry?: Date;
  needsPasswordSetup: boolean;
  createdAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    id:              { type: String, required: true, unique: true },
    name:            { type: String, required: true, trim: true },
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:    { type: String, required: true },
    role:            { type: String, required: true, trim: true },
    department:      { type: String, required: true, trim: true },
    phone:           { type: String, required: true, trim: true },
    avatar:          { type: String, default: '' },
    color:           { type: String, default: '#3b82f6' },
    organizationId:  { type: String, required: true },
    employeeCode:    { type: String },
    assignedManagerId: { type: String },
    isManager:       { type: Boolean, default: false },
    isActive:        { type: Boolean, default: true },
    otpCode:         { type: String },
    otpExpiry:       { type: Date },
    needsPasswordSetup: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for quick org lookup
EmployeeSchema.index({ organizationId: 1 });

const Employee: Model<IEmployee> =
  mongoose.models.Employee ||
  mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
