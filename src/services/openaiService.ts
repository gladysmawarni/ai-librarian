import OpenAI from 'openai';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

export class OpenAIService {
  private client: OpenAI | null = null;
  private fileContents: string[] = [];
  private systemInstructions: string = '';

  constructor(apiKey?: string) {
    if (apiKey) {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  setApiKey(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async uploadFiles(files: UploadedFile[]): Promise<void> {
    if (!this.client) throw new Error('OpenAI client not initialized');

    try {
      // For this demo, we'll read file contents directly
      // In a production app, you'd want to process these server-side
      const fileReadPromises = files.map(async (file) => {
        if (file.file.type === 'text/plain' || file.file.name.endsWith('.py')) {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string || '');
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file.file);
          });
        } else {
          // For other file types, we'll use a placeholder
          // In production, you'd extract text using server-side tools
          return `[File: ${file.name} - Content extraction would require server-side processing]`;
        }
      });

      const contents = await Promise.all(fileReadPromises);
      this.fileContents.push(...contents);
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
      const context = this.fileContents.join('\n\n---\n\n');
      
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `${this.systemInstructions}

Here are the uploaded documents for reference:

${context}

Please answer questions based on this content.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 1500,
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
}