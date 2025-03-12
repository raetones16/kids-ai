const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/search?q={query}&count={count}
router.get('/', async (req, res) => {
  try {
    const { q, count = 5 } = req.query;
    
    // Validate input
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Check if API key is configured
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey || apiKey === 'your_brave_search_api_key') {
      return res.status(503).json({ 
        error: 'Search service not configured',
        message: 'Brave Search API key is not configured on the server'
      });
    }
    
    // Call Brave Search API
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: { q, count },
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      }
    });
    
    // Return the results
    res.json(response.data);
  } catch (error) {
    console.error('Search API error:', error);
    
    // Handle specific error types
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many search requests, please try again later'
        });
      }
      
      return res.status(error.response.status).json({
        error: 'Search API error',
        message: error.response.data?.message || error.message
      });
    } else if (error.request) {
      // The request was made but no response was received
      return res.status(503).json({
        error: 'Search service unavailable',
        message: 'Could not connect to search service'
      });
    }
    
    // Generic error handler
    res.status(500).json({
      error: 'Failed to fetch search results',
      message: error.message
    });
  }
});

// GET /api/search/test - Test endpoint for search functionality
router.get('/test', async (req, res) => {
  try {
    // Check if API key is configured
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey || apiKey === 'your_brave_search_api_key') {
      return res.status(503).json({ 
        error: 'Search service not configured',
        message: 'Brave Search API key is not configured on the server'
      });
    }
    
    // Test search query
    const testQuery = 'latest fortnite season';
    
    // Call Brave Search API
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: { q: testQuery, count: 3 },
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      }
    });
    
    // Return the full results and status info
    res.json({
      success: true,
      query: testQuery,
      apiKeyConfigured: true,
      results: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Search test error:', error);
    
    // Return detailed error information
    res.status(500).json({
      success: false,
      error: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null
    });
  }
});

module.exports = router;
