import React from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw } from 'lucide-react';

interface SystemInstructionsProps {
  instructions: string;
  onInstructionsChange: (instructions: string) => void;
}

const DEFAULT_INSTRUCTIONS = `You are a helpful AI assistant that analyzes documents and answers questions based on their content. 

Guidelines:
- Always base your answers on the provided documents
- If information isn't available in the documents, clearly state that
- Provide detailed and accurate responses
- Include relevant quotes or references when appropriate
- Be concise but comprehensive in your explanations`;

const SystemInstructions: React.FC<SystemInstructionsProps> = ({
  instructions,
  onInstructionsChange,
}) => {
  const resetToDefault = () => {
    onInstructionsChange(DEFAULT_INSTRUCTIONS);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <Label htmlFor="system-instructions" className="text-lg font-semibold">
            System Instructions
          </Label>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetToDefault}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Default
        </Button>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Customize how the AI assistant should behave and respond to questions about your documents.
        </p>
        
        <Textarea
          id="system-instructions"
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Enter system instructions..."
          className="min-h-[120px] resize-none"
        />
        
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Define the AI's personality, response style, and guidelines</span>
          <span>{instructions.length} characters</span>
        </div>
      </div>
    </Card>
  );
};

export default SystemInstructions;