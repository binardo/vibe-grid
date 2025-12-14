import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Plus, Globe, FileText, Phone, Briefcase, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  PromptColumn,
  PromptSegment,
  Tool,
  ToolType,
  DynamicContent,
  DynamicContentType,
  ModelType,
  EffortLevel,
} from '@/types';

interface ColumnEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: PromptColumn | null;
  existingColumns: PromptColumn[];
  onSave: (column: Omit<PromptColumn, 'id' | 'order'>) => void;
}

const TOOL_OPTIONS: { type: ToolType; name: string; icon: React.ReactNode }[] = [
  { type: 'web_search', name: 'Web search', icon: <Globe className="w-4 h-4" /> },
  { type: 'latest_filing', name: 'Latest filing', icon: <FileText className="w-4 h-4" /> },
  { type: 'latest_earnings_call', name: 'Latest earnings call', icon: <Phone className="w-4 h-4" /> },
  { type: 'latest_broker_reports', name: 'Latest broker reports', icon: <Briefcase className="w-4 h-4" /> },
  { type: 'file_upload', name: 'Upload a file', icon: <Upload className="w-4 h-4" /> },
];

const DYNAMIC_CONTENT_OPTIONS: { type: DynamicContentType; label: string }[] = [
  { type: 'company_name', label: 'Company Name' },
  { type: 'sedol', label: 'SEDOL' },
  { type: 'forward_looking_hypothesis', label: 'Forward Looking Hypothesis' },
  { type: 'company_fundamentals', label: 'Company fundamentals' },
  { type: 'latest_earnings_call', label: 'Latest earnings call' },
  { type: 'latest_earnings_call_date', label: 'Latest earnings call date' },
  { type: 'latest_filing_date', label: 'Latest filing date' },
  { type: 'latest_filing_summary', label: 'Latest filing summary' },
  { type: 'latest_broker_reports', label: 'Latest broker reports' },
];

const MODEL_OPTIONS: { model: ModelType; efforts: EffortLevel[] }[] = [
  { model: 'gpt-5-nano', efforts: ['minimal', 'low', 'medium', 'high'] },
  { model: 'gpt-5-mini', efforts: ['minimal', 'low', 'medium', 'high'] },
  { model: 'gpt-5.2', efforts: ['minimal', 'low', 'medium', 'high'] },
  { model: 'o4-mini-deep-research', efforts: ['minimal', 'low', 'medium', 'high'] },
];

export default function ColumnEditor({
  open,
  onOpenChange,
  column,
  existingColumns,
  onSave,
}: ColumnEditorProps) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState<PromptSegment[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [model, setModel] = useState<ModelType>('gpt-5-nano');
  const [effortLevel, setEffortLevel] = useState<EffortLevel>('low');
  const [autoRun, setAutoRun] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    if (column) {
      setName(column.name);
      setPrompt(column.prompt);
      setTools(column.tools);
      setModel(column.model);
      setEffortLevel(column.effortLevel);
      setAutoRun(column.autoRun);
    } else {
      setName('');
      setPrompt([{ id: uuidv4(), type: 'text', content: '' }]);
      setTools([]);
      setModel('gpt-5-nano');
      setEffortLevel('low');
      setAutoRun(true);
    }
  }, [column, open]);

  const getPromptText = (): string => {
    return prompt.map(segment => {
      if (segment.type === 'text') {
        return segment.content || '';
      } else {
        return `[${segment.dynamicContent?.label}]`;
      }
    }).join('');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const oldText = getPromptText();
    
    // Find where the change occurred
    let changeStart = 0;
    while (changeStart < Math.min(oldText.length, newText.length) && oldText[changeStart] === newText[changeStart]) {
      changeStart++;
    }

    // Check if we're trying to edit inside a pill
    let charCount = 0;
    for (const segment of prompt) {
      if (segment.type === 'text') {
        charCount += (segment.content || '').length;
      } else {
        const pillText = `[${segment.dynamicContent?.label}]`;
        if (changeStart >= charCount && changeStart < charCount + pillText.length) {
          // Editing inside a pill - remove the entire pill
          setPrompt(prompt.filter(s => s.id !== segment.id));
          return;
        }
        charCount += pillText.length;
      }
    }

    // Rebuild prompt segments preserving pills
    const newPrompt: PromptSegment[] = [];
    let textIndex = 0;
    
    for (const segment of prompt) {
      if (segment.type === 'dynamic') {
        const pillText = `[${segment.dynamicContent?.label}]`;
        const pillStart = oldText.indexOf(pillText, textIndex);
        
        if (pillStart !== -1) {
          // Add text before pill
          const textBefore = newText.substring(textIndex, pillStart);
          if (textBefore) {
            newPrompt.push({ id: uuidv4(), type: 'text', content: textBefore });
          }
          newPrompt.push(segment);
          textIndex = pillStart + pillText.length;
        }
      }
    }
    
    // Add remaining text
    const remainingText = newText.substring(textIndex);
    if (remainingText || newPrompt.length === 0) {
      newPrompt.push({ id: uuidv4(), type: 'text', content: remainingText });
    }

    setPrompt(newPrompt.length > 0 ? newPrompt : [{ id: uuidv4(), type: 'text', content: '' }]);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const insertDynamicContent = (type: DynamicContentType, label: string, columnId?: string, columnName?: string) => {
    const dynamicContent: DynamicContent = {
      id: uuidv4(),
      type,
      label: columnName ? `Cell output of ${columnName}` : label,
      columnId,
      columnName,
    };

    const newSegment: PromptSegment = {
      id: uuidv4(),
      type: 'dynamic',
      dynamicContent,
    };

    // Insert at cursor position
    const text = getPromptText();
    const before = text.substring(0, cursorPosition);
    const after = text.substring(cursorPosition);

    const newPrompt: PromptSegment[] = [];
    
    if (before) {
      newPrompt.push({ id: uuidv4(), type: 'text', content: before });
    }
    newPrompt.push(newSegment);
    if (after) {
      newPrompt.push({ id: uuidv4(), type: 'text', content: after });
    }

    setPrompt(newPrompt);
  };

  const addTool = (type: ToolType, toolName: string) => {
    if (tools.some(t => t.type === type)) return;
    
    setTools([...tools, {
      id: uuidv4(),
      type,
      name: toolName,
    }]);
  };

  const removeTool = (toolId: string) => {
    setTools(tools.filter(t => t.id !== toolId));
  };

  const handleSave = () => {
    onSave({
      name: name || `Column ${existingColumns.length + 1}`,
      prompt,
      tools,
      model,
      effortLevel,
      autoRun,
    });
  };

  const priorColumns = existingColumns.filter(c => !column || c.order < (column.order ?? existingColumns.length));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{column ? 'Edit Prompt: Column' : 'New Prompt Column'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="column-name">Name: (optional)</Label>
            <Input
              id="column-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto-generated if left blank"
            />
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Prompt</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Insert Dynamic Content
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Dynamic Content</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {DYNAMIC_CONTENT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.type}
                      onClick={() => insertDynamicContent(option.type, option.label)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                  {priorColumns.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Cell Outputs</DropdownMenuLabel>
                      {priorColumns.map((col) => (
                        <DropdownMenuItem
                          key={col.id}
                          onClick={() => insertDynamicContent('cell_output', `Cell output of ${col.name}`, col.id, col.name)}
                        >
                          Cell output of {col.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={getPromptText()}
                onChange={handleTextChange}
                onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                className="w-full min-h-32 p-3 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter your prompt here. Use the button above to insert dynamic content."
              />
              
              {/* Visual pills overlay - simplified for now */}
              <div className="mt-2 flex flex-wrap gap-1">
                {prompt.filter(s => s.type === 'dynamic').map((segment) => (
                  <span
                    key={segment.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                  >
                    {segment.dynamicContent?.label}
                    <button
                      onClick={() => setPrompt(prompt.filter(s => s.id !== segment.id))}
                      className="hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <Label>Tools</Label>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Tool
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {TOOL_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.type}
                      onClick={() => addTool(option.type, option.name)}
                      disabled={tools.some(t => t.type === option.type)}
                    >
                      {option.icon}
                      <span className="ml-2">{option.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {tools.map((tool) => {
                const toolOption = TOOL_OPTIONS.find(t => t.type === tool.type);
                return (
                  <span
                    key={tool.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                  >
                    {toolOption?.icon}
                    <span>{tool.name}</span>
                    <button
                      onClick={() => removeTool(tool.id)}
                      className="ml-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Model */}
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
                  id="auto-run"
                  checked={autoRun}
                  onCheckedChange={setAutoRun}
                />
                <Label htmlFor="auto-run" className="text-sm font-normal">
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
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
