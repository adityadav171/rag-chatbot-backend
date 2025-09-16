class SessionService {
  constructor() {
    // Simple in-memory storage (replace with Redis in production)
    this.sessions = new Map();
    this.sessionTTL = 3600000; // 1 hour in milliseconds
  }

  async createSession(sessionId) {
    this.sessions.set(sessionId, {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    // Set auto-cleanup
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, this.sessionTTL);
    
    return sessionId;
  }

  async addMessage(sessionId, userMessage, botResponse) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.messages.push({
      timestamp: new Date().toISOString(),
      user: userMessage,
      bot: botResponse
    });
    
    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);
  }

  async getHistory(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  async clearSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        ...this.sessions.get(sessionId),
        messages: []
      });
    }
  }

  getActiveSessionCount() {
    return this.sessions.size;
  }
}

module.exports = SessionService;
