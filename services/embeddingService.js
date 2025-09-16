const axios = require('axios');

class EmbeddingService {
  constructor() {
    this.apiKey = process.env.JINA_API_KEY;
    this.baseUrl = 'https://api.jina.ai/v1/embeddings';
  }

  async createEmbeddings(texts) {
    if (!this.apiKey) {
      throw new Error('Jina API key not found');
    }

    try {
      const response = await axios.post(this.baseUrl, {
        model: 'jina-embeddings-v2-base-en',
        input: texts
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.data.map(item => item.embedding);
    } catch (error) {
      console.error('Error creating embeddings:', error.response?.data || error.message);
      throw error;
    }
  }

  async createSingleEmbedding(text) {
    const embeddings = await this.createEmbeddings([text]);
    return embeddings[0];
  }
}

module.exports = EmbeddingService;
