import OpenAI from 'openai';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import PizZip from 'pizzip';
import { VectorStoreService } from './vectorStore';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

export class OpenAIService {
  private client: OpenAI | null = null;
  private fileContents: Array<{name: string, content: string}> = [];
  private systemInstructions: string = '';
  private vectorStore: VectorStoreService;

  constructor(apiKey?: string) {
    this.vectorStore = new VectorStoreService();
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
      this.vectorStore.initialize(apiKey);
    }
  }

  async setApiKey(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
    await this.vectorStore.initialize(apiKey);
  }

  private async extractPdfText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText || `No text content found in PDF: ${file.name}`;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return `Error extracting content from PDF: ${file.name}`;
    }
  }

  private async extractDocxText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting DOCX text:', error);
      return `Error extracting content from DOCX: ${file.name}`;
    }
  }

  private async extractPptxText(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      let fullText = '';

      // Extract text from slides
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );

      for (const slideFile of slideFiles) {
        const content = zip.files[slideFile].asText();
        // Simple regex to extract text content from XML
        const textMatches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
        if (textMatches) {
          const slideText = textMatches
            .map(match => match.replace(/<[^>]*>/g, ''))
            .join(' ');
          fullText += slideText + '\n';
        }
      }

      return fullText || `Unable to extract readable text from: ${file.name}`;
    } catch (error) {
      console.error('Error extracting PPTX text:', error);
      return `Error extracting content from PPTX: ${file.name}`;
    }
  }

  async uploadFiles(files: UploadedFile[]): Promise<void> {
    if (!this.client) throw new Error('OpenAI client not initialized');

    try {
      const fileReadPromises = files.map(async (file) => {
        let content = '';
        
        if (file.file.type === 'application/pdf') {
          content = await this.extractPdfText(file.file);
        } else if (file.file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          content = await this.extractDocxText(file.file);
        } else if (file.file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
          content = await this.extractPptxText(file.file);
        } else if (file.file.type === 'text/plain' || file.file.name.endsWith('.py')) {
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string || '');
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file.file);
          });
        } else {
          content = `Unsupported file type: ${file.name}`;
        }

        return {
          name: file.name,
          content: content
        };
      });

      const extractedFiles = await Promise.all(fileReadPromises);
      this.fileContents.push(...extractedFiles);
      
      // Add documents to vector store for semantic search
      if (this.vectorStore.isInitialized()) {
        await this.vectorStore.addDocuments(extractedFiles);
        console.log('Documents added to vector store for semantic search');
      }
      
      console.log('Files processed:', this.fileContents.map(f => ({ name: f.name, contentLength: f.content.length })));
    } catch (error) {
      console.error('Error reading files:', error);
      throw error;
    }
  }

  async createAssistant(systemInstructions: string): Promise<void> {
    this.systemInstructions = systemInstructions;
    // No additional setup needed for completion API
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    if (this.fileContents.length === 0) {
      throw new Error('No files uploaded. Please upload documents first.');
    }

    try {
      let context = '';
      
      if (this.vectorStore.isInitialized()) {
        // Use semantic search to find relevant chunks
        const relevantChunks = await this.vectorStore.searchSimilar(message, 6);
        context = relevantChunks
          .map(chunk => `=== ${chunk.metadata.fileName} (chunk ${chunk.metadata.chunkIndex + 1}/${chunk.metadata.totalChunks}) ===\n${chunk.content}`)
          .join('\n\n---\n\n');
        
        console.log('Using semantic search:', { 
          query: message,
          relevantChunks: relevantChunks.length,
          contextLength: context.length
        });
      } else {
        // Fallback to full documents
        context = this.fileContents
          .map(file => `=== ${file.name} ===\n${file.content}`)
          .join('\n\n---\n\n');
        
        console.log('Using full documents:', { 
          fileCount: this.fileContents.length, 
          contextLength: context.length
        });
      }
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `${this.systemInstructions}

Here are the relevant document sections for answering the user's question:

${context}

Please answer the question based on this content. If the information is not available in the provided context, say so clearly.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async updateSystemInstructions(instructions: string): Promise<void> {
    this.systemInstructions = instructions;
  }

  isReady(): boolean {
    return this.client !== null && this.fileContents.length > 0;
  }

  hasFiles(): boolean {
    return this.fileContents.length > 0;
  }

  clearFiles(): void {
    this.fileContents = [];
    this.vectorStore.clear();
  }

  getFileContents(): Array<{name: string, content: string}> {
    return this.fileContents;
  }
}
