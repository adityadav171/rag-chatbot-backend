const Parser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class NewsService {
  constructor() {
    this.parser = new Parser();
    // Updated with more reliable RSS feeds
    this.newsFeeds = [
      'https://feeds.bbci.co.uk/news/rss.xml',           // BBC News (working)
      'https://feeds.nbcnews.com/nbcnews/public/news',   // NBC News
      'https://feeds.npr.org/1001/rss.xml',              // NPR
      'https://rss.cbs.com/rss/public/rss-feed/1'        // CBS News
    ];
    
    // Ensure data directory exists
    this.dataDir = path.join(__dirname, '../data');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        console.log('Created data directory');
      }
    } catch (error) {
      console.error('Error creating data directory:', error);
    }
  }

  async fetchNewsArticles(limit = 50) {
    console.log('Fetching news articles...');
    const articles = [];
    
    try {
      for (const feedUrl of this.newsFeeds) {
        try {
          console.log(`Trying to fetch from: ${feedUrl}`);
          const feed = await this.parser.parseURL(feedUrl);
          const feedArticles = feed.items.slice(0, Math.ceil(limit / this.newsFeeds.length));
          
          for (const item of feedArticles) {
            articles.push({
              title: item.title || 'No title',
              content: item.contentSnippet || item.content || item.summary || item.description || 'No content available',
              url: item.link || '',
              publishDate: item.pubDate || new Date().toISOString(),
              source: feed.title || 'Unknown Source'
            });
          }
          console.log(`✅ Successfully fetched ${feedArticles.length} articles from ${feed.title}`);
        } catch (error) {
          console.log(`❌ Error fetching from ${feedUrl}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in fetchNewsArticles:', error);
    }

    // Add fallback mock articles if no articles fetched
    if (articles.length === 0) {
      console.log('No articles fetched, using mock data for demo');
      articles.push(...this.getMockArticles());
    }

    try {
      // Save articles to local file for backup
      const filePath = path.join(this.dataDir, 'news.json');
      fs.writeFileSync(filePath, JSON.stringify(articles, null, 2));
      console.log(`💾 Saved ${articles.length} articles to ${filePath}`);
    } catch (error) {
      console.error('Error saving articles:', error);
    }
    
    return articles;
  }

  loadArticlesFromFile() {
    try {
      const filePath = path.join(this.dataDir, 'news.json');
      const data = fs.readFileSync(filePath, 'utf8');
      const articles = JSON.parse(data);
      console.log(`📖 Loaded ${articles.length} cached articles`);
      return articles;
    } catch (error) {
      console.log('No cached articles found, will fetch new ones');
      return [];
    }
  }

  getMockArticles() {
    return [
      {
        title: "Tech Giants Report Strong Q3 Results Amid AI Boom",
        content: "Major technology companies including Apple, Microsoft, and Google reported stronger than expected earnings for Q3 2025, with artificial intelligence investments driving significant growth across multiple sectors. The companies saw increased revenue from cloud services and AI-powered products.",
        url: "https://example.com/tech-earnings",
        publishDate: new Date().toISOString(),
        source: "Mock Tech News"
      },
      {
        title: "Global Climate Summit Reaches Historic Agreement on Carbon Reduction",
        content: "World leaders at the 2025 Global Climate Summit have reached a breakthrough agreement on aggressive carbon reduction targets. The pact includes commitments to renewable energy initiatives and significant funding for developing nations to transition to clean energy sources.",
        url: "https://example.com/climate-agreement",
        publishDate: new Date().toISOString(),
        source: "Mock Environmental News"
      },
      {
        title: "Breakthrough in Quantum Computing Announced by Research Team",
        content: "Scientists have announced a major breakthrough in quantum computing technology that could revolutionize data processing and cybersecurity. The new quantum processor demonstrates unprecedented stability and error correction capabilities.",
        url: "https://example.com/quantum-computing",
        publishDate: new Date().toISOString(),
        source: "Mock Science News"
      },
      {
        title: "Major Infrastructure Investment Plan Unveiled",
        content: "Government officials unveiled a comprehensive infrastructure investment plan worth billions, focusing on modernizing transportation networks, upgrading power grids, and expanding broadband access to rural areas. The plan aims to create millions of jobs over the next decade.",
        url: "https://example.com/infrastructure-plan",
        publishDate: new Date().toISOString(),
        source: "Mock Political News"
      },
      {
        title: "Revolutionary Medical Treatment Shows Promise in Clinical Trials",
        content: "A new medical treatment for autoimmune diseases has shown remarkable results in phase III clinical trials. The therapy uses advanced gene editing techniques and has demonstrated significant improvement in patient outcomes with minimal side effects.",
        url: "https://example.com/medical-breakthrough",
        publishDate: new Date().toISOString(),
        source: "Mock Medical News"
      }
    ];
  }
}

module.exports = NewsService;
