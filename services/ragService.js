const axios = require('axios');
const NewsService = require('./newsService');
const EmbeddingService = require('./embeddingService');
const SimpleVectorStore = require('./vectorService');

class RAGService {
  constructor() {
    this.newsService = new NewsService();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new SimpleVectorStore();
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing RAG service...');
    
    // Load or fetch articles
    let articles = this.newsService.loadArticlesFromFile();
    if (articles.length === 0) {
      articles = await this.newsService.fetchNewsArticles(50);
    }

    if (articles.length === 0) {
      throw new Error('No articles found to initialize RAG service');
    }

    // Create embeddings for articles
    const articleTexts = articles.map(article => 
      `${article.title} ${article.content}`.substring(0, 1000)
    );
    
    console.log('Creating embeddings...');
    const embeddings = await this.embeddingService.createEmbeddings(articleTexts);
    
    // Store in vector database
    await this.vectorStore.addDocuments(articles, embeddings);
    
    this.isInitialized = true;
    console.log(`RAG service initialized with ${articles.length} articles`);
  }

  async processQuery(query) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Create embedding for query
    const queryEmbedding = await this.embeddingService.createSingleEmbedding(query);
    
    // Search for similar documents
    const similarDocs = await this.vectorStore.searchSimilar(queryEmbedding, 3);
    
    // Format context from retrieved documents
    const context = similarDocs.map(result => 
      `Article: ${result.document.title}\n` +
      `Source: ${result.document.source}\n` +
      `Content: ${result.document.content.substring(0, 300)}...\n` +
      `URL: ${result.document.url}`
    ).join('\n\n');

    // Generate response using Gemini
    const response = await this.generateGeminiResponse(query, context);
    return response;
  }

async generateGeminiResponse(query, context) {
  if (!this.geminiApiKey) {
    return "I apologize, but I cannot generate responses without a valid API key.";
  }

  const prompt = `You are a helpful news assistant. Based on the following news articles, answer the user's question accurately and concisely.

Context from recent news articles:
${context}

User question: ${query}

Please provide a helpful answer based on the news context above. If the context doesn't contain relevant information, say so.`;

  try {
    console.log('Sending request to Gemini API...');
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    console.log('Gemini API Response received');

    // Robust error handling
    if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
      console.error('No candidates in response:', response.data);
      return "I apologize, but I couldn't generate a response. Please try rephrasing your question.";
    }

    const candidate = response.data.candidates[0];
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('Invalid response structure:', candidate);
      return "I apologize, but the response was incomplete. Please try again.";
    }

    const generatedText = candidate.content.parts[0].text;
    
    if (!generatedText || generatedText.trim() === '') {
      return "I apologize, but I couldn't generate a meaningful response. Please try a different question.";
    }

    return generatedText;

  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    return "I apologize, but I'm having trouble generating a response right now. Please try again later.";
  }
}


}

module.exports = RAGService;
