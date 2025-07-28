import React, { useState } from 'react';
import { Key, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ApiKeySetupProps {
  onApiKeySet: (apiKey: string) => void;
  hasApiKey: boolean;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onApiKeySet, hasApiKey }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsValidating(true);
    
    try {
      // Basic validation - check if it starts with sk-
      if (!apiKey.startsWith('sk-')) {
        throw new Error('Invalid API key format');
      }

      onApiKeySet(apiKey.trim());
      toast({
        title: "API Key Set Successfully",
        description: "You can now start uploading files and chatting with your documents.",
      });
    } catch (error) {
      toast({
        title: "Invalid API Key",
        description: "Please check your OpenAI API key and try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  if (hasApiKey) {
    return (
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-800">API Key Configured</h3>
            <p className="text-sm text-green-600">
              Your OpenAI API key is set and ready to use.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-amber-50 border-amber-200">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-800">OpenAI API Key Required</h3>
            <p className="text-sm text-amber-600">
              Enter your OpenAI API key to enable document analysis and chat functionality.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-amber-800">
              API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="font-mono"
            />
            <p className="text-xs text-amber-600">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>

          <Button
            type="submit"
            disabled={!apiKey.trim() || isValidating}
            variant="gradient"
            className="w-full"
          >
            <Key className="w-4 h-4 mr-2" />
            {isValidating ? 'Validating...' : 'Set API Key'}
          </Button>
        </form>

        <div className="text-xs text-amber-600 space-y-1">
          <p>Don't have an API key? Get one from:</p>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-700 hover:text-amber-800 underline"
          >
            https://platform.openai.com/api-keys
          </a>
        </div>
      </div>
    </Card>
  );
};

export default ApiKeySetup;