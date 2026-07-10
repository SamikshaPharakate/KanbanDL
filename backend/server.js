const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS: allow comma-separated origins from env (for production), or fallback to localhost for dev
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

// Initialize Socket.io with CORS
const io = socketio(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middlewares
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Import Sockets
require('./sockets/boardSocket')(io);

// Import Routes
const authRouter = require('./routes/auth');
const boardsRouter = require('./routes/boards');
const tasksRouter = require('./routes/tasks');
const analyticsRouter = require('./routes/analytics');

// Register Routes
app.use('/api/auth', authRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/analytics', analyticsRouter);

// Root Healthcheck Endpoint
app.get('/', (req, res) => {
  res.json({ status: 'online', app: 'TaskFlow AI Backend' });
});

// Database Connection & Server Startup
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Fail fast if MONGO_URI is not configured — prevents silent localhost fallback
if (!MONGO_URI) {
  console.error('FATAL ERROR: MONGO_URI environment variable is not set.');
  console.error('Set MONGO_URI to your MongoDB Atlas connection string in the Render dashboard.');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully.');
    server.listen(PORT, () => {
      console.log(`Node Express Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    console.error('Check that your MONGO_URI is correct and that your MongoDB Atlas cluster allows connections from 0.0.0.0/0.');
    process.exit(1);
  });
