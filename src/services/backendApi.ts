import axios from 'axios';

// Backend API configuration
const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

// Create axios instance for backend API
const backendApi = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interface for document chunks
export interface DocumentChunk {
  text: string;
  metadata: {
    source: string;
    position: number;
    caseId: string;
  };
}

// RAG API service
export const ragApi = {
  /**
   * Check the health status of the backend
   */
  async checkHealth(): Promise<{ status: string; services: Record<string, string> }> {
    try {
      const response = await backendApi.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('Error checking backend health:', error);
      throw new Error('Failed to connect to backend service');
    }
  },

  /**
   * Index a case file in the vector database
   * @param caseId Unique identifier for the case
   * @param content Text content of the case file
   */
  async indexCaseFile(caseId: string, content: string): Promise<{ success: boolean; chunksCount: number }> {
    try {
      const response = await backendApi.post('/api/index', { caseId, content });
      return response.data;
    } catch (error) {
      console.error('Error indexing case file:', error);
      throw new Error('Failed to index case file');
    }
  },

  /**
   * Search for relevant information in a case file
   * @param caseId Unique identifier for the case
   * @param query Search query
   * @param k Number of results to return (default: 5)
   */
  async searchCaseFile(caseId: string, query: string, k = 5): Promise<DocumentChunk[]> {
    try {
      const response = await backendApi.post('/api/search', { caseId, query });
      return response.data;
    } catch (error) {
      console.error('Error searching case file:', error);
      throw new Error('Failed to search case file');
    }
  },

  /**
   * Delete a case index from the vector database
   * @param caseId Unique identifier for the case
   */
  async deleteCaseIndex(caseId: string): Promise<{ success: boolean }> {
    try {
      const response = await backendApi.delete(`/api/index/${caseId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting case index:', error);
      throw new Error('Failed to delete case index');
    }
  }
}; 