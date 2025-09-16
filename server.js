const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Get frontend URLs from environment or use defaults
const frontendUrls = [
  process.env.FRONTEND_URL,
  'https://rag-news-chatbot.netlify.app',       // Your actual Netlify URL
  'https://rag-news-chatbot-app.netlify.app',   // Alternative URL pattern
  'http://localhost:3000',                      // For local development
  'http://localhost:3001'                       // Alternative local port
].filter(Boolean); // Remove undefined values

console.log('Allowed CORS origins:', frontendUrls);

// Configure Socket.io with proper CORS
const io = socketIo(server, {
  cors: {
    origin: frontendUrls,
    methods: ["GET", "POST"],
    credentials: true,
    allowEIO3: true // Support older socket.io versions
  },
  transports: ['websocket', 'polling'] // Enable both transport methods
});

// Configure Express CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches netlify pattern
    const isAllowed = frontendUrls.includes(origin) || 
                     origin.endsWith('.netlify.app') ||
                     origin.startsWith('http://localhost');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow for now, can change to false for strict mode
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    timestamp: new Date().toISOString(),
    cors_origins: frontendUrls 
  });
});

// Socket.io health check
app.get('/socket.io/health', (req, res) => {
  res.json({ 
    status: 'Socket.IO server is running',
    transport: ['websocket', 'polling']
  });
});

// Import services
const SessionService = require('./services/sessionService');
const RAGService = require('./services/ragService');

// Initialize services
const sessionService = new SessionService();
const ragService = new RAGService();

// Initialize RAG pipeline on startup
ragService.initialize().then(() => {
  console.log('RAG pipeline initialized successfully');
}).catch((error) => {
  console.error('Failed to initialize RAG pipeline:', error);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'from origin:', socket.request.headers.origin);

  // Create new session
  socket.on('create-session', async () => {
    try {
      const sessionId = uuidv4();
      await sessionService.createSession(sessionId);
      socket.emit('session-created', { sessionId });
      console.log('Session created:', sessionId);
    } catch (error) {
      console.error('Error creating session:', error);
      socket.emit('error', { message: 'Failed to create session' });
    }
  });

  // Join existing session
  socket.on('join-session', async (sessionId) => {
    try {
      socket.join(sessionId);
      const history = await sessionService.getHistory(sessionId);
      socket.emit('session-history', history);
      console.log('User joined session:', sessionId);
    } catch (error) {
      console.error('Error joining session:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  });

  // Handle chat message
  socket.on('send-message', async (data) => {
    const { sessionId, message } = data;
    console.log('Processing message:', message, 'in session:', sessionId);
    
    try {
      // Get RAG response
      const response = await ragService.processQuery(message);
      console.log('Generated response length:', response.length);
      
      // Save to session
      await sessionService.addMessage(sessionId, message, response);
      
      // Send response
      io.to(sessionId).emit('bot-response', {
        userMessage: message,
        botResponse: response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('error', { message: 'Failed to process your message. Please try again.' });
    }
  });

  // Reset session
  socket.on('reset-session', async (sessionId) => {
    try {
      await sessionService.clearSession(sessionId);
      socket.emit('session-reset');
      console.log('Session reset:', sessionId);
    } catch (error) {
      console.error('Error resetting session:', error);
      socket.emit('error', { message: 'Failed to reset session' });
    }
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', socket.id, 'Reason:', reason);
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Allowed origins:', frontendUrls);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
