import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export interface DocumentChunk {
  text: string;
  metadata: {
    source: string;
    position: number;
    caseId: string;
  };
}

export class DocumentProcessor {
  private splitter: RecursiveCharacterTextSplitter;
  
  constructor(chunkSize = 1000, chunkOverlap = 200) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ["\n\n", "\n", " ", ""]
    });
  }
  
  async processDocument(caseId: string, content: string): Promise<DocumentChunk[]> {
    // Split the text into chunks
    const textChunks = await this.splitter.splitText(content);
    
    // Convert to document chunks with metadata
    return textChunks.map((text, index) => ({
      text,
      metadata: {
        source: 'case-file',
        position: index,
        caseId
      }
    }));
  }
} 