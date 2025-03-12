import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import SearchService from '../services/SearchService';

/**
 * Test component for trying out the search functionality
 */
const SearchTest = () => {
  const [query, setQuery] = useState('latest fortnite season');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [shouldSearch, setShouldSearch] = useState(null);
  
  // Test the backend API directly
  const testBackendSearch = async () => {
    try {
      setSearching(true);
      setError(null);
      setResults(null);

      // Call the test endpoint directly
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/search/test`);
      const data = await response.json();
      
      setResults(data);
    } catch (err) {
      console.error('Test search error:', err);
      setError(err.message || 'Error occurred during test search');
    } finally {
      setSearching(false);
    }
  };
  
  // Test the SearchService directly
  const testSearchService = async () => {
    try {
      setSearching(true);
      setError(null);
      setResults(null);
      
      // Check if the query would trigger a search
      const checkShouldSearch = SearchService.shouldSearch(query);
      setShouldSearch(checkShouldSearch);
      
      // Try to search anyway
      const searchResults = await SearchService.search(query);
      
      // Format search results for display
      const formattedResults = {
        raw: searchResults,
        formatted: SearchService.formatSearchResults(searchResults, 8)
      };
      
      setResults(formattedResults);
    } catch (err) {
      console.error('SearchService error:', err);
      setError(err.message || 'Error occurred during search service test');
    } finally {
      setSearching(false);
    }
  };
  
  // Perform a direct custom search
  const customSearch = async () => {
    try {
      setSearching(true);
      setError(null);
      setResults(null);
      
      // Check if the query would trigger a search
      const checkShouldSearch = SearchService.shouldSearch(query);
      setShouldSearch(checkShouldSearch);

      // Direct API call with the user's query
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/search?q=${encodeURIComponent(query)}&count=5`);
      const data = await response.json();
      
      setResults({
        raw: data,
        formatted: SearchService.formatSearchResults(data, 8)
      });
    } catch (err) {
      console.error('Custom search error:', err);
      setError(err.message || 'Error occurred during custom search');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Search Functionality Test</h1>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Search Query</h2>
        <div className="flex gap-4 mb-4">
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Enter search query"
            className="max-w-lg flex-grow"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={testBackendSearch} 
            disabled={searching}
            variant="default"
          >
            Test Backend API
          </Button>
          <Button 
            onClick={testSearchService} 
            disabled={searching}
            variant="outline"
          >
            Test SearchService
          </Button>
          <Button 
            onClick={customSearch} 
            disabled={searching}
            variant="secondary"
          >
            Custom Search
          </Button>
        </div>
      </div>
      
      {shouldSearch !== null && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>shouldSearch Result</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={shouldSearch ? "text-green-600" : "text-red-600"}>
              SearchService.shouldSearch returns: <strong>{shouldSearch ? "TRUE" : "FALSE"}</strong>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              This means the AI {shouldSearch ? "would" : "would NOT"} perform a search for this query.
            </p>
          </CardContent>
        </Card>
      )}
      
      {error && (
        <Card className="mb-4 border-red-300">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
      
      {searching && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-2">Searching...</span>
        </div>
      )}
      
      {results && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          
          {results.formatted && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Formatted for AI</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">{results.formatted}</pre>
              </CardContent>
            </Card>
          )}
          
          {results.raw && (
            <Card>
              <CardHeader>
                <CardTitle>Raw Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">{JSON.stringify(results.raw, null, 2)}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchTest;
