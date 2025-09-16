class SimpleVectorStore {
  constructor() {
    this.vectors = [];
    this.documents = [];
  }

  async addDocuments(documents, embeddings) {
    for (let i = 0; i < documents.length; i++) {
      this.vectors.push(embeddings[i]);
      this.documents.push({
        id: this.documents.length,
        ...documents[i]
      });
    }
    console.log(`Added ${documents.length} documents to vector store`);
  }

  async searchSimilar(queryEmbedding, topK = 3) {
    const similarities = this.vectors.map((vector, index) => ({
      index,
      similarity: this.cosineSimilarity(queryEmbedding, vector),
      document: this.documents[index]
    }));

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, topK);
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  getDocumentCount() {
    return this.documents.length;
  }
}

module.exports = SimpleVectorStore;
