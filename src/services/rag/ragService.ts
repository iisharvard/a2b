import { DocumentProcessor } from './documentLoader';
import { EmbeddingService } from './embeddingService';
import { VectorStoreService } from './vectorStore';

export class RAGService {
  private documentProcessor: DocumentProcessor;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStoreService;
  
  constructor(apiKey?: string) {
    this.documentProcessor = new DocumentProcessor();
    this.embeddingService = new EmbeddingService(apiKey);
    this.vectorStore = new VectorStoreService(apiKey);
  }
  
  async indexCaseFile(caseId: string, content: string): Promise<{ success: boolean; chunksCount: number }> {
    try {
      // Process the document into chunks
      const chunks = await this.documentProcessor.processDocument(caseId, content);
      
      // Store in vector database
      await this.vectorStore.createCollection(caseId, chunks);
      
      return { success: true, chunksCount: chunks.length };
    } catch (error) {
      console.error('Error indexing case file:', error);
      return { success: false, chunksCount: 0 };
    }
  }
  
  async searchCaseFile(caseId: string, query: string, k = 5): Promise<any[]> {
    try {
      const results = await this.vectorStore.searchCollection(caseId, query, k);
      return results;
    } catch (error) {
      console.error('Error searching case file:', error);
      return [];
    }
  }
  
  async deleteCaseIndex(caseId: string): Promise<boolean> {
    try {
      await this.vectorStore.deleteCollection(caseId);
      return true;
    } catch (error) {
      console.error('Error deleting case index:', error);
      return false;
    }
  }
} 