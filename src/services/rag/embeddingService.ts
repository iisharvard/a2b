import { OpenAIEmbeddings } from '@langchain/openai';
import { DocumentChunk } from './documentLoader';

// Access environment variables in a way that works with React
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '';

export class EmbeddingService {
  private embeddings: OpenAIEmbeddings;
  
  constructor(apiKey?: string) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey || OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002', // or the latest model
      batchSize: 512 // Process in batches for efficiency
    });
  }
  
  async embedDocuments(documents: DocumentChunk[]): Promise<number[][]> {
    const texts = documents.map(doc => doc.text);
    return this.embeddings.embedDocuments(texts);
  }
  
  async embedQuery(query: string): Promise<number[]> {
    return this.embeddings.embedQuery(query);
  }
} 