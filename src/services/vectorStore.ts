import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";

export interface DocumentChunk {
  content: string;
  metadata: {
    fileName: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

export class VectorStoreService {
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: OpenAIEmbeddings | null = null;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async initialize(apiKey: string): Promise<void> {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: "text-embedding-3-small",
    });
    
    this.vectorStore = new MemoryVectorStore(this.embeddings);
  }

  async addDocuments(documents: Array<{ name: string; content: string }>): Promise<void> {
    if (!this.vectorStore || !this.embeddings) {
      throw new Error("Vector store not initialized");
    }

    const allDocs: Document[] = [];

    for (const doc of documents) {
      // Split the document into chunks
      const chunks = await this.textSplitter.createDocuments([doc.content]);
      
      // Add metadata to each chunk
      const docsWithMetadata = chunks.map((chunk, index) => new Document({
        pageContent: chunk.pageContent,
        metadata: {
          fileName: doc.name,
          chunkIndex: index,
          totalChunks: chunks.length,
        }
      }));

      allDocs.push(...docsWithMetadata);
    }

    await this.vectorStore.addDocuments(allDocs);
    console.log(`Added ${allDocs.length} document chunks to vector store`);
  }

  async searchSimilar(query: string, k: number = 4): Promise<DocumentChunk[]> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    const results = await this.vectorStore.similaritySearchVectorWithScore(
      await this.embeddings!.embedQuery(query), 
      k
    );
    
    return results.map(([doc]) => ({
      content: doc.pageContent,
      metadata: {
        fileName: doc.metadata.fileName,
        chunkIndex: doc.metadata.chunkIndex,
        totalChunks: doc.metadata.totalChunks,
      }
    }));
  }

  isInitialized(): boolean {
    return this.vectorStore !== null && this.embeddings !== null;
  }

  clear(): void {
    this.vectorStore = null;
    if (this.embeddings) {
      this.vectorStore = new MemoryVectorStore(this.embeddings);
    }
  }
}