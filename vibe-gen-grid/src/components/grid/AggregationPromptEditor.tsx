import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AggregationPrompt,
  PromptColumn,
  PromptSegment,
  ModelType,
  EffortLevel,
} from '@/types';
import { gridStore } from '@/stores/gridStore';

interface AggregationPromptEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId: string | null;
  gridId: string;
  existingPrompt?: AggregationPrompt;
  column?: PromptColumn;
}

const MODEL_OPTIONS: { model: ModelType; efforts: EffortLevel[] }[] = [
  { model: 'gpt-5-nano', efforts: ['minimal', 'low', 'medium', 'high'] },
  { model: 'gpt-5-mini', efforts: ['minimal', 'low', 'medium', 'high'] },
  { model: 'gpt-5.2', efforts: ['minimal', 'low', 'medium', 'high'] },
  { model: 'o4-mini-deep-research', efforts: ['minimal', 'low', 'medium', 'high'] },
];

export default function AggregationPromptEditor({
  open,
  onOpenChange,
  columnId,
  gridId,
  existingPrompt,
  column,
}: AggregationPromptEditorProps) {
  const [promptText, setPromptText] = useState('');
  const [includeColumnResults, setIncludeColumnResults] = useState(true);
  const [model, setModel] = useState<ModelType>('gpt-5-nano');
  const [effortLevel, setEffortLevel] = useState<EffortLevel>('low');
  const [autoRun, setAutoRun] = useState(true);

  useEffect(() => {
    if (existingPrompt) {
      const textParts = existingPrompt.prompt
        .filter(s => s.type === 'text')
        .map(s => s.content)
        .join('');
      setPromptText(textParts);
      setIncludeColumnResults(existingPrompt.prompt.some(s => s.type === 'dynamic'));
      setModel(existingPrompt.model);
      setEffortLevel(existingPrompt.effortLevel);
      setAutoRun(existingPrompt.autoRun);
    } else {
      setPromptText('Summarize the following analysis results and provide key insights:\n\n');
      setIncludeColumnResults(true);
      setModel('gpt-5-nano');
      setEffortLevel('low');
      setAutoRun(true);
    }
  }, [existingPrompt, open]);

  const handleSave = () => {
    if (!columnId) return;

    const prompt: PromptSegment[] = [];
    
    // Add text before column results
    if (promptText) {
      prompt.push({
        id: uuidv4(),
        type: 'text',
        content: promptText,
      });
    }

    // Add column results reference
    if (includeColumnResults) {
      prompt.push({
        id: uuidv4(),
        type: 'dynamic',
        dynamicContent: {
          id: uuidv4(),
          type: 'cell_output',
          label: `All ${column?.name || 'column'} results`,
          columnId,
          columnName: column?.name,
        },
      });
    }

    gridStore.addAggregationPrompt(gridId, columnId, {
      prompt,
      model,
      effortLevel,
      autoRun,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Aggregation Prompt for {column?.name || 'Column'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Prompt</Label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full min-h-32 p-3 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your aggregation prompt..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="include-results"
              checked={includeColumnResults}
              onCheckedChange={setIncludeColumnResults}
            />
            <Label htmlFor="include-results" className="text-sm font-normal">
              Include all column cell outputs
            </Label>
          </div>

          {includeColumnResults && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p className="font-medium mb-1">Column results will be formatted as:</p>
              <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
{`# ${column?.name || 'Column Name'}
======= Company 1 =======
[Cell 1 output]
======= Company 2 =======
[Cell 2 output]
...`}
              </pre>
            </div>
          )}

          <div className="space-y-2">
            <Label>Model</Label>
            <div className="flex items-center gap-4">
              <Select
                value={`${model} (${effortLevel})`}
                onValueChange={(value) => {
                  const match = value.match(/^(.+) \((.+)\)$/);
                  if (match) {
                    setModel(match[1] as ModelType);
                    setEffortLevel(match[2] as EffortLevel);
                  }
                }}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) =>
                    option.efforts.map((effort) => (
                      <SelectItem key={`${option.model}-${effort}`} value={`${option.model} (${effort})`}>
                        {option.model} ({effort})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Switch
                  id="agg-auto-run"
                  checked={autoRun}
                  onCheckedChange={setAutoRun}
                />
                <Label htmlFor="agg-auto-run" className="text-sm font-normal">
                  Auto-run
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Aggregation Prompt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
