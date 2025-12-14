import { ModelType, EffortLevel, Tool, ToolType } from '../types';

interface LLMCallOptions {
  prompt: string;
  model: ModelType;
  effortLevel: EffortLevel;
  tools: Tool[];
  onStream?: (chunk: string) => void;
  signal?: AbortSignal;
}

interface LLMResponse {
  output: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  toolsUsed: string[];
}

const MODEL_MAP: Record<ModelType, string> = {
  'gpt-5-nano': 'gpt-4o-mini',
  'gpt-5-mini': 'gpt-4o',
  'gpt-5.2': 'gpt-4o',
  'o4-mini-deep-research': 'gpt-4o',
};

const EFFORT_MAP: Record<EffortLevel, number> = {
  'minimal': 256,
  'low': 512,
  'medium': 1024,
  'high': 2048,
};

const TOOL_DEFINITIONS: Record<ToolType, object> = {
  'web_search': {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  },
  'latest_filing': {
    type: 'function',
    function: {
      name: 'get_latest_filing',
      description: 'Get the latest SEC filing for a company',
      parameters: {
        type: 'object',
        properties: {
          company: { type: 'string', description: 'Company name or identifier' }
        },
        required: ['company']
      }
    }
  },
  'latest_earnings_call': {
    type: 'function',
    function: {
      name: 'get_latest_earnings_call',
      description: 'Get the latest earnings call transcript for a company',
      parameters: {
        type: 'object',
        properties: {
          company: { type: 'string', description: 'Company name or identifier' }
        },
        required: ['company']
      }
    }
  },
  'latest_broker_reports': {
    type: 'function',
    function: {
      name: 'get_latest_broker_reports',
      description: 'Get the latest broker reports for a company',
      parameters: {
        type: 'object',
        properties: {
          company: { type: 'string', description: 'Company name or identifier' }
        },
        required: ['company']
      }
    }
  },
  'file_upload': {
    type: 'function',
    function: {
      name: 'analyze_file',
      description: 'Analyze an uploaded file',
      parameters: {
        type: 'object',
        properties: {
          file_id: { type: 'string', description: 'File identifier' }
        },
        required: ['file_id']
      }
    }
  },
};

class OpenAIService {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private get useDummy(): boolean {
    return !this.apiKey;
  }

  async generateResponse(options: LLMCallOptions): Promise<LLMResponse> {
    const { prompt, model, effortLevel, tools, onStream, signal } = options;

    if (this.useDummy) {
      return this.generateDummyResponse(prompt, model, effortLevel, tools, onStream, signal);
    }

    return this.generateRealResponse(prompt, model, effortLevel, tools, onStream, signal);
  }

  private async generateDummyResponse(
    prompt: string,
    _model: ModelType,
    _effortLevel: EffortLevel,
    tools: Tool[],
    onStream?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    const dummyResponses = [
      "Based on my analysis of the company's recent performance, there are several key factors to consider. The revenue growth has been strong, driven by expansion in core markets and successful product launches. Operating margins have improved due to cost optimization initiatives. The company maintains a solid balance sheet with healthy cash reserves.",
      "The competitive landscape shows this company maintaining its market leadership position. Key differentiators include strong brand recognition, extensive distribution network, and continuous innovation. Recent strategic acquisitions have expanded their addressable market. Management guidance suggests continued growth momentum.",
      "Looking at the financial metrics, the company demonstrates strong fundamentals. Earnings per share have grown consistently over the past quarters. Free cash flow generation remains robust, supporting both reinvestment and shareholder returns. Valuation appears reasonable relative to growth prospects.",
      "Market analysis indicates favorable conditions for this sector. Industry tailwinds include digital transformation trends and increasing demand for innovative solutions. The company is well-positioned to capitalize on these opportunities through its technology investments and market presence.",
      "Risk factors to monitor include macroeconomic uncertainty, regulatory changes, and competitive pressures. However, the company's diversified revenue streams and strong market position provide resilience. Management has demonstrated effective risk management practices.",
    ];

    const response = dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
    const words = response.split(' ');
    let output = '';

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }
      
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
      output += (i > 0 ? ' ' : '') + words[i];
      
      if (onStream) {
        onStream(output);
      }
    }

    const tokensIn = Math.floor(prompt.length / 4);
    const tokensOut = Math.floor(output.length / 4);

    return {
      output,
      tokensIn,
      tokensOut,
      cost: (tokensIn * 0.00001) + (tokensOut * 0.00003),
      toolsUsed: tools.map(t => t.name),
    };
  }

  private async generateRealResponse(
    prompt: string,
    model: ModelType,
    effortLevel: EffortLevel,
    tools: Tool[],
    onStream?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    const openaiModel = MODEL_MAP[model];
    const maxTokens = EFFORT_MAP[effortLevel];
    
    const toolDefinitions = tools.map(t => TOOL_DEFINITIONS[t.type]).filter(Boolean);

    const requestBody: Record<string, unknown> = {
      model: openaiModel,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      stream: true,
    };

    if (toolDefinitions.length > 0) {
      requestBody.tools = toolDefinitions;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let output = '';
    let tokensIn = 0;
    let tokensOut = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            output += content;
            if (onStream) {
              onStream(output);
            }
          }
          
          if (parsed.usage) {
            tokensIn = parsed.usage.prompt_tokens || 0;
            tokensOut = parsed.usage.completion_tokens || 0;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    if (tokensIn === 0) {
      tokensIn = Math.floor(prompt.length / 4);
    }
    if (tokensOut === 0) {
      tokensOut = Math.floor(output.length / 4);
    }

    return {
      output,
      tokensIn,
      tokensOut,
      cost: (tokensIn * 0.00001) + (tokensOut * 0.00003),
      toolsUsed: tools.map(t => t.name),
    };
  }

  async generateColumnName(prompt: string): Promise<string> {
    if (this.useDummy) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const keywords = prompt.toLowerCase();
      if (keywords.includes('earnings') || keywords.includes('revenue')) return 'Earnings Analysis';
      if (keywords.includes('competitor') || keywords.includes('competition')) return 'Competitor Analysis';
      if (keywords.includes('risk')) return 'Risk Assessment';
      if (keywords.includes('growth')) return 'Growth Outlook';
      if (keywords.includes('valuation')) return 'Valuation Analysis';
      if (keywords.includes('summary')) return 'Summary';
      return 'Analysis Column';
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Generate a short, descriptive column name (2-4 words) for a spreadsheet column based on the prompt. Only respond with the column name, nothing else.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 20,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || 'Analysis Column';
    } catch {
      return 'Analysis Column';
    }
  }
}

export const openaiService = new OpenAIService();
export default openaiService;
