import React, { useState, useEffect } from 'react';
import { FileText, MessageSquare, Settings } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import SystemInstructions from '@/components/SystemInstructions';
import ChatInterface from '@/components/ChatInterface';
import ApiKeySetup from '@/components/ApiKeySetup';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OpenAIService } from '@/services/openaiService';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
}

const DEFAULT_INSTRUCTIONS = `You are a helpful AI assistant that analyzes documents and answers questions based on their content. 

Guidelines:
- Always base your answers on the provided documents
- If information isn't available in the documents, clearly state that
- Provide detailed and accurate responses
- Include relevant quotes or references when appropriate
- Be concise but comprehensive in your explanations`;

const Index = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [systemInstructions, setSystemInstructions] = useState<string>(DEFAULT_INSTRUCTIONS);
  const [openaiService, setOpenaiService] = useState<OpenAIService | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const { toast } = useToast();

  useEffect(() => {
    // Load API key from localStorage
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setOpenaiService(new OpenAIService(savedApiKey));
    }
  }, []);

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    localStorage.setItem('openai_api_key', key);
    setOpenaiService(new OpenAIService(key));
  };

  const handleFilesChange = async (files: UploadedFile[]) => {
    setUploadedFiles(files);
    
    if (files.length > 0 && openaiService) {
      setIsLoading(true);
      try {
        await openaiService.uploadFiles(files);
        await openaiService.createAssistant(systemInstructions);
        
        toast({
          title: "Files processed successfully",
          description: "Your documents are now ready for analysis. You can start chatting!",
        });
        
        setActiveTab('chat');
      } catch (error) {
        toast({
          title: "Error processing files",
          description: "Failed to upload and process files. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSystemInstructionsChange = async (instructions: string) => {
    setSystemInstructions(instructions);
    
    if (openaiService && openaiService.isReady()) {
      try {
        await openaiService.updateSystemInstructions(instructions);
        toast({
          title: "Instructions updated",
          description: "System instructions have been updated successfully.",
        });
      } catch (error) {
        toast({
          title: "Error updating instructions",
          description: "Failed to update system instructions.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSendMessage = async (message: string): Promise<string> => {
    if (!openaiService) {
      throw new Error('OpenAI service not initialized');
    }

    if (!openaiService.isReady()) {
      throw new Error('Assistant not ready. Please upload files first.');
    }

    try {
      return await openaiService.sendMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            AI Document Analyzer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload your documents and chat with AI to extract insights, answers, and analysis from your files.
          </p>
        </div>

        {/* API Key Setup */}
        {!apiKey && (
          <div className="max-w-2xl mx-auto mb-8">
            <ApiKeySetup onApiKeySet={handleApiKeySet} hasApiKey={!!apiKey} />
          </div>
        )}

        {/* Main Content */}
        {apiKey && (
          <div className="max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger 
                  value="chat" 
                  className="flex items-center gap-2"
                  disabled={uploadedFiles.length === 0}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-6">
                <FileUpload 
                  onFilesChange={handleFilesChange}
                  uploadedFiles={uploadedFiles}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="max-w-4xl mx-auto">
                  <SystemInstructions
                    instructions={systemInstructions}
                    onInstructionsChange={handleSystemInstructionsChange}
                  />
                </div>
              </TabsContent>

              <TabsContent value="chat" className="space-y-6">
                {uploadedFiles.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No files uploaded</h3>
                    <p className="text-muted-foreground">
                      Upload some documents first to start chatting with your AI assistant.
                    </p>
                  </Card>
                ) : (
                  <div className="max-w-4xl mx-auto">
                    <ChatInterface 
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
