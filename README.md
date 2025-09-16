RAG News Chatbot - Backend

A Node.js backend service that powers a news chatbot using RAG (Retrieval-Augmented Generation) with Socket.io, Gemini AI, and Jina Embeddings.

Tech Stack:
- Node.js 18.x - Server runtime
- Express.js - Web framework  
- Socket.io - Real-time communication
- Jina AI - Text embeddings
- Google Gemini - AI responses
- RSS Parser - News ingestion

Quick Setup:
1. Clone & Install
git clone https://github.com/yourusername/rag-chatbot-backend.git
cd rag-chatbot-backend
npm install

2. Environment Variables - Create .env file:
JINA_API_KEY=your_jina_api_key
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=http://localhost:3000
PORT=8000

3. Run:
npm start

API:
- GET / - Health check
- Socket.io events: create-session, send-message, reset-session

Deploy to Render:
1. Connect GitHub repo to Render.com
2. Set environment variables in Render dashboard
3. Deploy with: Build: npm install, Start: npm start

Features:
- Fetches news from RSS feeds
- Creates embeddings using Jina AI
- Semantic search for relevant articles
- AI responses with Gemini
- Real-time chat with Socket.io
- Session management
