import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'langchain/document';
import { DocumentChunk } from './documentLoader';

// Access environment variables in a way that works with React
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '';
const CHROMA_URL = process.env.REACT_APP_CHROMA_URL || 'http://localhost:8000';

export class VectorStoreService {
  private embeddings: OpenAIEmbeddings;
  
  constructor(apiKey?: string) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey || OPENAI_API_KEY
    });
  }
  
  async createCollection(caseId: string, documents: DocumentChunk[]): Promise<void> {
    const texts = documents.map(doc => doc.text);
    const metadatas = documents.map(doc => doc.metadata);
    
    await Chroma.fromTexts(
      texts,
      metadatas,
      this.embeddings,
      {
        collectionName: `case-${caseId}`,
        url: CHROMA_URL
      }
    );
  }
  
  async searchCollection(caseId: string, query: string, k = 5): Promise<DocumentChunk[]> {
    const vectorStore = await Chroma.fromExistingCollection(
      this.embeddings,
      {
        collectionName: `case-${caseId}`,
        url: CHROMA_URL
      }
    );
    
    const results = await vectorStore.similaritySearch(query, k);
    
    return results.map((doc: Document) => ({
      text: doc.pageContent,
      metadata: doc.metadata as DocumentChunk['metadata']
    }));
  }
  
  async deleteCollection(caseId: string): Promise<void> {
    const client = new Chroma(this.embeddings, {
      collectionName: `case-${caseId}`,
      url: CHROMA_URL
    });
    
    await client.delete({ filter: {} });
  }
} 