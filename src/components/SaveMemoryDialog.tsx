import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">Save this memory?</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Would you like to preserve this conversation as a memory in your timeline?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SaveMemoryDialog;