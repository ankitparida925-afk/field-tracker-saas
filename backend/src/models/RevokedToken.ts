import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRevokedToken extends Document {
  token: string;
  revokedAt: Date;
  expiresAt: Date;
}

const RevokedTokenSchema = new Schema<IRevokedToken>({
  token:     { type: String, required: true, unique: true, index: true },
  revokedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// TTL index: MongoDB auto-deletes documents when expiresAt is reached
RevokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RevokedToken: Model<IRevokedToken> =
  mongoose.models.RevokedToken ||
  mongoose.model<IRevokedToken>('RevokedToken', RevokedTokenSchema);

export default RevokedToken;
