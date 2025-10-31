const searchService = require('../services/searchService');

class SearchController {
  async handleSearch(req, res) {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    try {
      const result = await searchService.search(query);
      // result is { answer, sources }
      return res.status(200).json({ answer: result.answer, sources: result.sources });
    } catch (error) {
      console.error('Search service error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new SearchController();