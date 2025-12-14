import { useEffect, useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cell, PromptColumn } from '@/types';
import { gridStore } from '@/stores/gridStore';

interface CellViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cell: Cell | null;
  columns: PromptColumn[];
}

export default function CellViewer({
  open,
  onOpenChange,
  cell,
  columns,
}: CellViewerProps) {
  const [localCell, setLocalCell] = useState<Cell | null>(cell);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    if (!cell) {
      setLocalCell(null);
      return;
    }

    setLocalCell(cell);

    const unsubscribe = gridStore.subscribeToCellUpdates(cell.id, (updatedCell) => {
      setLocalCell({ ...updatedCell });
    });

    return () => {
      unsubscribe();
    };
  }, [cell, open]);

  const handleCopyOutput = async () => {
    if (!localCell?.output) return;
    await navigator.clipboard.writeText(localCell.output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const handleCopyPrompt = async () => {
    if (!localCell?.renderedPrompt) return;
    await navigator.clipboard.writeText(localCell.renderedPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const column = columns.find(c => c.id === localCell?.columnId);

  const formatCost = (cost: number): string => {
    if (cost < 0.01) {
      return `$${cost.toFixed(6)}`;
    }
    return `$${cost.toFixed(4)}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!localCell) {
    return null;
  }

  const isStreaming = localCell.status === 'streaming' || localCell.status === 'running';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Cell Details
            {isStreaming && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="output" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="input">Rendered Input Prompt</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="output" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyOutput}
                disabled={!localCell.output}
              >
                {copiedOutput ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Output
                  </>
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 rounded-lg p-4">
              {localCell.status === 'error' ? (
                <div className="text-red-600">
                  <p className="font-medium">Error {localCell.error?.statusCode}</p>
                  <p className="mt-2">{localCell.error?.message}</p>
                </div>
              ) : localCell.output ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{localCell.output}</p>
                </div>
              ) : (
                <p className="text-gray-400 italic">
                  {isStreaming ? 'Generating...' : 'No output yet'}
                </p>
              )}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
              )}
            </div>
          </TabsContent>

          <TabsContent value="input" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPrompt}
                disabled={!localCell.renderedPrompt}
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Prompt
                  </>
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 rounded-lg p-4">
              {localCell.renderedPrompt ? (
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {localCell.renderedPrompt}
                </pre>
              ) : (
                <p className="text-gray-400 italic">No rendered prompt available</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="flex-1 overflow-auto mt-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {localCell.metadata ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Model</p>
                      <p className="font-medium">{localCell.metadata.model}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Effort Level</p>
                      <p className="font-medium capitalize">{localCell.metadata.effortLevel}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tokens In</p>
                      <p className="font-medium">{localCell.metadata.tokensIn.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tokens Out</p>
                      <p className="font-medium">{localCell.metadata.tokensOut.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date/Time</p>
                      <p className="font-medium">{formatDate(localCell.metadata.dateTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Call Cost</p>
                      <p className="font-medium">{formatCost(localCell.metadata.cost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Execution Count</p>
                      <p className="font-medium">{localCell.metadata.executionCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Tools Used</p>
                      <p className="font-medium">
                        {localCell.metadata.toolsUsed.length > 0
                          ? localCell.metadata.toolsUsed.join(', ')
                          : 'None'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-400 italic">No metadata available yet</p>
              )}

              {column && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Column Configuration</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Column Name</p>
                      <p className="font-medium">{column.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Auto-run</p>
                      <p className="font-medium">{column.autoRun ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
