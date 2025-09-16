const Parser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');

class NewsService {
  constructor() {
    this.parser = new Parser();
    this.newsFeeds = [
      'https://feeds.bbci.co.uk/news/rss.xml',
      'https://rss.cnn.com/rss/edition.rss',
      'https://feeds.reuters.com/reuters/topNews'
    ];
  }

  async fetchNewsArticles(limit = 50) {
    console.log('Fetching news articles...');
    const articles = [];
    
    try {
      for (const feedUrl of this.newsFeeds) {
        try {
          const feed = await this.parser.parseURL(feedUrl);
          const feedArticles = feed.items.slice(0, Math.ceil(limit / this.newsFeeds.length));
          
          for (const item of feedArticles) {
            articles.push({
              title: item.title,
              content: item.contentSnippet || item.content || item.summary || 'No content available',
              url: item.link,
              publishDate: item.pubDate,
              source: feed.title
            });
          }
        } catch (error) {
          console.log(`Error fetching from ${feedUrl}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error in fetchNewsArticles:', error);
    }

    // Save articles to local file for backup
    fs.writeFileSync('./data/news.json', JSON.stringify(articles, null, 2));
    console.log(`Fetched ${articles.length} articles`);
    return articles;
  }

  loadArticlesFromFile() {
    try {
      const data = fs.readFileSync('./data/news.json', 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.log('No cached articles found, will fetch new ones');
      return [];
    }
  }
}

module.exports = NewsService;
