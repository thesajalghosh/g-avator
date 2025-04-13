import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document {
  userId: string;
  sessionId: string;
  createdAt: Date;
  lastActive: Date;
  status: 'active' | 'closed';
}

const SessionSchema: Schema = new Schema({
  userId: { type: String, required: true },
  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
});

// Avoid model overwrite error in dev
const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;
