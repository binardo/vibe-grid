export type CellStatus = 'idle' | 'queued' | 'running' | 'streaming' | 'complete' | 'error' | 'cancelled';

export type ToolType = 'web_search' | 'latest_filing' | 'latest_earnings_call' | 'latest_broker_reports' | 'file_upload';

export type DynamicContentType = 
  | 'company_name' 
  | 'sedol' 
  | 'forward_looking_hypothesis' 
  | 'company_fundamentals' 
  | 'latest_earnings_call' 
  | 'latest_earnings_call_date' 
  | 'latest_filing_date' 
  | 'latest_filing_summary' 
  | 'latest_broker_reports'
  | 'cell_output';

export type ModelType = 
  | 'gpt-5-nano' 
  | 'gpt-5-mini' 
  | 'gpt-5.2' 
  | 'o4-mini-deep-research';

export type EffortLevel = 'minimal' | 'low' | 'medium' | 'high';

export type TriggerType = 'schedule' | 'new_filing' | 'new_earnings_call';

export interface Tool {
  id: string;
  type: ToolType;
  name: string;
  config?: Record<string, unknown>;
}

export interface DynamicContent {
  id: string;
  type: DynamicContentType;
  label: string;
  columnId?: string;
  columnName?: string;
}

export interface PromptSegment {
  id: string;
  type: 'text' | 'dynamic';
  content?: string;
  dynamicContent?: DynamicContent;
}

export interface Company {
  sedol: string;
  company_name: string;
  short_name?: string;
  sector?: string;
  industry?: string;
  region?: string;
  country?: string;
  source?: 'single' | 'strategy' | 'watchlist';
  sourceId?: string;
  forwardLookingHypothesis?: string;
}

export interface Strategy {
  strategy_asset_type: string;
  strategy: string;
  strategy_code: string;
  main_representative_portfolio_icon_code: string;
  portfolios: unknown[];
}

export interface CellMetadata {
  model: string;
  effortLevel: EffortLevel;
  tokensIn: number;
  tokensOut: number;
  dateTime: string;
  cost: number;
  toolsUsed: string[];
  executionCount: number;
}

export interface Cell {
  id: string;
  rowId: string;
  columnId: string;
  status: CellStatus;
  output: string;
  renderedPrompt: string;
  metadata?: CellMetadata;
  error?: {
    statusCode: number;
    message: string;
  };
  queuePosition?: number;
}

export interface PromptColumn {
  id: string;
  name: string;
  prompt: PromptSegment[];
  tools: Tool[];
  model: ModelType;
  effortLevel: EffortLevel;
  autoRun: boolean;
  order: number;
}

export interface AggregationPrompt {
  id: string;
  columnId: string;
  prompt: PromptSegment[];
  model: ModelType;
  effortLevel: EffortLevel;
  autoRun: boolean;
  output: string;
  status: CellStatus;
  metadata?: CellMetadata;
}

export interface ScheduleConfig {
  enabled: boolean;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  triggers?: TriggerType[];
}

export interface Grid {
  id: string;
  name: string;
  companies: Company[];
  columns: PromptColumn[];
  cells: Record<string, Cell>;
  aggregationPrompts: Record<string, AggregationPrompt>;
  schedule?: ScheduleConfig;
  createdAt: string;
  updatedAt: string;
}

export interface GridLibraryItem {
  id: string;
  name: string;
  schedule?: ScheduleConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  type: 'company' | 'strategy' | 'watchlist';
  id: string;
  name: string;
  icon?: string;
  data: Company | Strategy | { name: string };
}

export interface ApiConfig {
  baseUrl?: string;
  apiKey?: string;
  openAiApiKey?: string;
}
