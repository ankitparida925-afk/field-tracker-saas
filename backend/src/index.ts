import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/auth';
import registerRoutes from './routes/register';
import superadminRoutes from './routes/superadmin';
import syncRoutes from './routes/sync';
import geocodeRoutes from './routes/geocode';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/register', registerRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/geocode', geocodeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 FieldTracker Express API running on http://localhost:${PORT}`);
});
