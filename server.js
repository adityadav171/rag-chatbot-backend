const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:3000" }
});

// Middleware
app.use(cors());
app.use(express.json());

// Import services
const SessionService = require('./services/sessionService');
const RAGService = require('./services/ragService');

// Initialize services
const sessionService = new SessionService();
const ragService = new RAGService();

// Initialize RAG pipeline on startup
ragService.initialize().then(() => {
  console.log('RAG pipeline initialized successfully');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create new session
  socket.on('create-session', async () => {
    const sessionId = uuidv4();
    await sessionService.createSession(sessionId);
    socket.emit('session-created', { sessionId });
  });

  // Join existing session
  socket.on('join-session', async (sessionId) => {
    socket.join(sessionId);
    const history = await sessionService.getHistory(sessionId);
    socket.emit('session-history', history);
  });

  // Handle chat message
  socket.on('send-message', async (data) => {
    const { sessionId, message } = data;
    
    try {
      // Get RAG response
      const response = await ragService.processQuery(message);
      
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
      socket.emit('error', { message: 'Failed to process your message' });
    }
  });

  // Reset session
  socket.on('reset-session', async (sessionId) => {
    await sessionService.clearSession(sessionId);
    socket.emit('session-reset');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
