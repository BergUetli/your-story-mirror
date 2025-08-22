import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SaveMemoryDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  transcript: string;
}

const SaveMemoryDialog: React.FC<SaveMemoryDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  transcript
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Save this memory?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Would you like to preserve this conversation as a memory in your timeline?
          </p>
          
          {transcript && (
            <div className="p-3 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-1">Your conversation:</p>
              <p className="text-sm">{transcript}</p>
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <Button 
              variant="ghost" 
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              Continue Conversation
            </Button>
            <Button 
              onClick={onConfirm}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save Memory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaveMemoryDialog;