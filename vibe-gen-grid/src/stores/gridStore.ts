import { v4 as uuidv4 } from 'uuid';
import { 
  Grid, 
  GridLibraryItem, 
  Company, 
  PromptColumn, 
  Cell, 
  PromptSegment,
  AggregationPrompt,
  ScheduleConfig,
} from '../types';
import { openaiService } from '../services/openai';

const MAX_CONCURRENT_CALLS = 5;

type CellCallback = (cell: Cell) => void;
type GridCallback = (grid: Grid) => void;

interface QueuedCell {
  cellId: string;
  gridId: string;
  priority: number;
  dependencies: string[];
}

class GridStore {
  private grids: Map<string, Grid> = new Map();
  private gridLibrary: GridLibraryItem[] = [];
  private cellQueue: QueuedCell[] = [];
  private runningCells: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private isPaused: boolean = false;
  private cellListeners: Map<string, Set<CellCallback>> = new Map();
  private gridListeners: Map<string, Set<GridCallback>> = new Map();
  private gridCounter: number = 1;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    // For POC, we don't persist to storage, but this is where we would load
  }

  private notifyCellListeners(cell: Cell) {
    const listeners = this.cellListeners.get(cell.id);
    if (listeners) {
      listeners.forEach(cb => cb(cell));
    }
  }

  private notifyGridListeners(grid: Grid) {
    const listeners = this.gridListeners.get(grid.id);
    if (listeners) {
      listeners.forEach(cb => cb(grid));
    }
  }

  subscribeToCellUpdates(cellId: string, callback: CellCallback): () => void {
    if (!this.cellListeners.has(cellId)) {
      this.cellListeners.set(cellId, new Set());
    }
    this.cellListeners.get(cellId)!.add(callback);
    return () => {
      this.cellListeners.get(cellId)?.delete(callback);
    };
  }

  subscribeToGridUpdates(gridId: string, callback: GridCallback): () => void {
    if (!this.gridListeners.has(gridId)) {
      this.gridListeners.set(gridId, new Set());
    }
    this.gridListeners.get(gridId)!.add(callback);
    return () => {
      this.gridListeners.get(gridId)?.delete(callback);
    };
  }

  getGridLibrary(): GridLibraryItem[] {
    return [...this.gridLibrary];
  }

  createGrid(name?: string): Grid {
    const id = uuidv4();
    const gridName = name || `Grid ${this.gridCounter++}`;
    
    const grid: Grid = {
      id,
      name: gridName,
      companies: [],
      columns: [],
      cells: {},
      aggregationPrompts: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.grids.set(id, grid);
    this.gridLibrary.push({
      id,
      name: gridName,
      createdAt: grid.createdAt,
      updatedAt: grid.updatedAt,
    });

    return grid;
  }

  getGrid(id: string): Grid | undefined {
    return this.grids.get(id);
  }

  renameGrid(id: string, name: string): void {
    const grid = this.grids.get(id);
    if (grid) {
      grid.name = name;
      grid.updatedAt = new Date().toISOString();
      
      const libraryItem = this.gridLibrary.find(g => g.id === id);
      if (libraryItem) {
        libraryItem.name = name;
        libraryItem.updatedAt = grid.updatedAt;
      }
      
      this.notifyGridListeners(grid);
    }
  }

  deleteGrid(id: string): void {
    const grid = this.grids.get(id);
    if (grid) {
      // Cancel all running cells
      Object.values(grid.cells).forEach(cell => {
        this.cancelCell(cell.id);
      });
      
      this.grids.delete(id);
      this.gridLibrary = this.gridLibrary.filter(g => g.id !== id);
    }
  }

  updateGridSchedule(id: string, schedule: ScheduleConfig): void {
    const grid = this.grids.get(id);
    if (grid) {
      grid.schedule = schedule;
      grid.updatedAt = new Date().toISOString();
      
      const libraryItem = this.gridLibrary.find(g => g.id === id);
      if (libraryItem) {
        libraryItem.schedule = schedule;
        libraryItem.updatedAt = grid.updatedAt;
      }
      
      this.notifyGridListeners(grid);
    }
  }

  addCompany(gridId: string, company: Company): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    const existingIndex = grid.companies.findIndex(c => c.sedol === company.sedol);
    
    if (existingIndex >= 0) {
      // Move existing company to top
      const [existing] = grid.companies.splice(existingIndex, 1);
      grid.companies.unshift(existing);
    } else {
      // Add new company at top
      const newCompany = {
        ...company,
        short_name: company.short_name || company.company_name.split(' ')[0],
        source: company.source || 'single' as const,
      };
      grid.companies.unshift(newCompany);
      
      // Create cells for all columns
      grid.columns.forEach(column => {
        const cellId = `${newCompany.sedol}-${column.id}`;
        grid.cells[cellId] = {
          id: cellId,
          rowId: newCompany.sedol,
          columnId: column.id,
          status: 'idle',
          output: '',
          renderedPrompt: '',
        };
        
        if (column.autoRun) {
          this.queueCell(gridId, cellId, column.order);
        }
      });
    }

    grid.updatedAt = new Date().toISOString();
    this.notifyGridListeners(grid);
    this.processQueue();
  }

  addCompanies(gridId: string, companies: Company[]): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    // Sort alphabetically by short name
    const sortedCompanies = [...companies].sort((a, b) => 
      (a.short_name || a.company_name).localeCompare(b.short_name || b.company_name)
    );

    // Remove existing companies that are in the new list
    const newSedols = new Set(sortedCompanies.map(c => c.sedol));
    const existingCompanies = grid.companies.filter(c => !newSedols.has(c.sedol));

    // Add new companies at top
    const newCompanies = sortedCompanies.map(company => ({
      ...company,
      short_name: company.short_name || company.company_name.split(' ')[0],
    }));

    grid.companies = [...newCompanies, ...existingCompanies];

    // Create cells for new companies
    newCompanies.forEach(company => {
      grid.columns.forEach(column => {
        const cellId = `${company.sedol}-${column.id}`;
        if (!grid.cells[cellId]) {
          grid.cells[cellId] = {
            id: cellId,
            rowId: company.sedol,
            columnId: column.id,
            status: 'idle',
            output: '',
            renderedPrompt: '',
          };
          
          if (column.autoRun) {
            this.queueCell(gridId, cellId, column.order);
          }
        }
      });
    });

    grid.updatedAt = new Date().toISOString();
    this.notifyGridListeners(grid);
    this.processQueue();
  }

  removeCompany(gridId: string, sedol: string): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    // Cancel any running/queued cells for this company
    Object.values(grid.cells)
      .filter(cell => cell.rowId === sedol)
      .forEach(cell => this.cancelCell(cell.id));

    // Remove cells
    Object.keys(grid.cells)
      .filter(key => key.startsWith(`${sedol}-`))
      .forEach(key => delete grid.cells[key]);

    // Remove company
    grid.companies = grid.companies.filter(c => c.sedol !== sedol);
    grid.updatedAt = new Date().toISOString();
    this.notifyGridListeners(grid);
  }

  reorderCompanies(gridId: string, fromIndex: number, toIndex: number): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    const [company] = grid.companies.splice(fromIndex, 1);
    grid.companies.splice(toIndex, 0, company);
    grid.updatedAt = new Date().toISOString();
    this.notifyGridListeners(grid);
  }

  addColumn(gridId: string, column: Omit<PromptColumn, 'id' | 'order'>): PromptColumn {
    const grid = this.grids.get(gridId);
    if (!grid) throw new Error('Grid not found');

    const newColumn: PromptColumn = {
      ...column,
      id: uuidv4(),
      order: grid.columns.length,
    };

    grid.columns.push(newColumn);

    // Create cells for all companies
    grid.companies.forEach(company => {
      const cellId = `${company.sedol}-${newColumn.id}`;
      grid.cells[cellId] = {
        id: cellId,
        rowId: company.sedol,
        columnId: newColumn.id,
        status: 'idle',
        output: '',
        renderedPrompt: '',
      };

      if (newColumn.autoRun) {
        this.queueCell(gridId, cellId, newColumn.order);
      }
    });

    grid.updatedAt = new Date().toISOString();
    this.notifyGridListeners(grid);
    this.processQueue();

    // Auto-generate column name if not set
    if (!column.name || column.name.startsWith('Column ')) {
      this.generateColumnName(gridId, newColumn.id, column.prompt);
    }

    return newColumn;
  }

  updateColumn(gridId: string, columnId: string, updates: Partial<PromptColumn>): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    const columnIndex = grid.columns.findIndex(c => c.id === columnId);
    if (columnIndex < 0) return;

    grid.columns[columnIndex] = { ...grid.columns[columnIndex], ...updates };
    grid.updatedAt = new Date().toISOString();
    this.notifyGridListeners(grid);
  }

  deleteColumn(gridId: string, columnId: string): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    // Cancel any running/queued cells for this column
    Object.values(grid.cells)
      .filter(cell => cell.columnId === columnId)
      .forEach(cell => this.cancelCell(cell.id));

    // Remove cells
    Object.keys(grid.cells)
      .filter(key => key.endsWith(`-${columnId}`))
      .forEach(key => delete grid.cells[key]);

    // Remove column
    grid.columns = grid.columns.filter(c => c.id !== columnId);
    
    // Update order
    grid.columns.forEach((col, idx) => {
      col.order = idx;
    });

    // Remove aggregation prompt
    delete grid.aggregationPrompts[columnId];

    grid.updatedAt = new Date().toISOString();
    this.notifyGridListeners(grid);
  }

  reorderColumns(gridId: string, fromIndex: number, toIndex: number): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    const [column] = grid.columns.splice(fromIndex, 1);
    grid.columns.splice(toIndex, 0, column);
    
    // Update order
    grid.columns.forEach((col, idx) => {
      col.order = idx;
    });

    grid.updatedAt = new Date().toISOString();
    this.notifyGridListeners(grid);
  }

  private async generateColumnName(gridId: string, columnId: string, prompt: PromptSegment[]): Promise<void> {
    const promptText = prompt.map(s => s.type === 'text' ? s.content : `[${s.dynamicContent?.label}]`).join('');
    const name = await openaiService.generateColumnName(promptText);
    
    const grid = this.grids.get(gridId);
    if (grid) {
      const column = grid.columns.find(c => c.id === columnId);
      if (column && (!column.name || column.name.startsWith('Column '))) {
        column.name = name;
        this.notifyGridListeners(grid);
      }
    }
  }

  getCell(gridId: string, cellId: string): Cell | undefined {
    const grid = this.grids.get(gridId);
    return grid?.cells[cellId];
  }

  private queueCell(gridId: string, cellId: string, priority: number): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    const cell = grid.cells[cellId];
    if (!cell) return;

    // Find dependencies (prior columns for same row)
    const column = grid.columns.find(c => c.id === cell.columnId);
    if (!column) return;

    const dependencies: string[] = [];
    column.prompt.forEach(s => {
      if (s.type === 'dynamic' && s.dynamicContent?.type === 'cell_output') {
        const depColumnId = s.dynamicContent.columnId;
        if (depColumnId) {
          dependencies.push(`${cell.rowId}-${depColumnId}`);
        }
      }
    });

    // Remove from queue if already there
    this.cellQueue = this.cellQueue.filter(q => q.cellId !== cellId);

    // Add to queue
    this.cellQueue.push({
      cellId,
      gridId,
      priority,
      dependencies,
    });

    // Update cell status
    cell.status = 'queued';
    cell.queuePosition = this.cellQueue.filter(q => q.gridId === gridId).length;
    this.notifyCellListeners(cell);
  }

  private async processQueue(): Promise<void> {
    if (this.isPaused) return;

    while (this.runningCells.size < MAX_CONCURRENT_CALLS && this.cellQueue.length > 0) {
      // Find next cell that has all dependencies satisfied
      const nextIndex = this.cellQueue.findIndex(queued => {
        const grid = this.grids.get(queued.gridId);
        if (!grid) return false;

        return queued.dependencies.every(depId => {
          const depCell = grid.cells[depId];
          return depCell && depCell.status === 'complete';
        });
      });

      if (nextIndex < 0) {
        // Update waiting cells
        this.cellQueue.forEach(queued => {
          const grid = this.grids.get(queued.gridId);
          if (grid) {
            const cell = grid.cells[queued.cellId];
            if (cell && queued.dependencies.some(depId => {
              const depCell = grid.cells[depId];
              return !depCell || depCell.status !== 'complete';
            })) {
              cell.status = 'queued';
              this.notifyCellListeners(cell);
            }
          }
        });
        break;
      }

      const [queued] = this.cellQueue.splice(nextIndex, 1);
      this.executeCell(queued.gridId, queued.cellId);
    }

    // Update queue positions
    this.cellQueue.forEach((queued, idx) => {
      const grid = this.grids.get(queued.gridId);
      if (grid) {
        const cell = grid.cells[queued.cellId];
        if (cell) {
          cell.queuePosition = idx + 1;
          this.notifyCellListeners(cell);
        }
      }
    });
  }

  private async executeCell(gridId: string, cellId: string): Promise<void> {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    const cell = grid.cells[cellId];
    if (!cell) return;

    const column = grid.columns.find(c => c.id === cell.columnId);
    if (!column) return;

    const company = grid.companies.find(c => c.sedol === cell.rowId);
    if (!company) return;

    this.runningCells.add(cellId);
    cell.status = 'running';
    this.notifyCellListeners(cell);

    const abortController = new AbortController();
    this.abortControllers.set(cellId, abortController);

    try {
      // Render prompt
      const renderedPrompt = this.renderPrompt(grid, column.prompt, company);
      cell.renderedPrompt = renderedPrompt;

      cell.status = 'streaming';
      this.notifyCellListeners(cell);

      const result = await openaiService.generateResponse({
        prompt: renderedPrompt,
        model: column.model,
        effortLevel: column.effortLevel,
        tools: column.tools,
        onStream: (chunk) => {
          cell.output = chunk;
          this.notifyCellListeners(cell);
        },
        signal: abortController.signal,
      });

      cell.status = 'complete';
      cell.output = result.output;
      cell.metadata = {
        model: column.model,
        effortLevel: column.effortLevel,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        dateTime: new Date().toISOString(),
        cost: result.cost,
        toolsUsed: result.toolsUsed,
        executionCount: (cell.metadata?.executionCount || 0) + 1,
      };
    } catch (error) {
      if (abortController.signal.aborted) {
        cell.status = 'cancelled';
      } else {
        cell.status = 'error';
        cell.error = {
          statusCode: 500,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } finally {
      this.runningCells.delete(cellId);
      this.abortControllers.delete(cellId);
      this.notifyCellListeners(cell);
      this.processQueue();
    }
  }

  private renderPrompt(grid: Grid, segments: PromptSegment[], company: Company): string {
    return segments.map(segment => {
      if (segment.type === 'text') {
        return segment.content || '';
      }

      const dc = segment.dynamicContent;
      if (!dc) return '';

      switch (dc.type) {
        case 'company_name':
          return company.company_name;
        case 'sedol':
          return company.sedol;
        case 'forward_looking_hypothesis':
          return company.forwardLookingHypothesis || '[Forward Looking Hypothesis not available]';
        case 'company_fundamentals':
          return `[Company fundamentals for ${company.company_name}]`;
        case 'latest_earnings_call':
          return `[Latest earnings call transcript for ${company.company_name}]`;
        case 'latest_earnings_call_date':
          return '[Latest earnings call date]';
        case 'latest_filing_date':
          return '[Latest filing date]';
        case 'latest_filing_summary':
          return `[Latest filing summary for ${company.company_name}]`;
        case 'latest_broker_reports':
          return `[Latest broker reports for ${company.company_name}]`;
        case 'cell_output':
          if (dc.columnId) {
            const cellId = `${company.sedol}-${dc.columnId}`;
            const cell = grid.cells[cellId];
            return cell?.output || '[Cell output not available]';
          }
          return '[Cell output reference error]';
        default:
          return '';
      }
    }).join('');
  }

  cancelCell(cellId: string): void {
    const controller = this.abortControllers.get(cellId);
    if (controller) {
      controller.abort();
    }
    
    // Remove from queue
    this.cellQueue = this.cellQueue.filter(q => q.cellId !== cellId);
  }

  recalculateCells(gridId: string, rowId?: string, columnId?: string, emptyOnly: boolean = false): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    const cellsToRecalculate = Object.values(grid.cells).filter(cell => {
      if (rowId && cell.rowId !== rowId) return false;
      if (columnId && cell.columnId !== columnId) return false;
      if (emptyOnly && cell.output) return false;
      return true;
    });

    cellsToRecalculate.forEach(cell => {
      this.cancelCell(cell.id);
      cell.status = 'idle';
      cell.output = '';
      cell.error = undefined;
      
      const column = grid.columns.find(c => c.id === cell.columnId);
      if (column) {
        this.queueCell(gridId, cell.id, column.order);
      }
    });

    this.processQueue();
  }

  pauseGrid(): void {
    this.isPaused = true;
    
    // Cancel all running cells and return to queued
    this.runningCells.forEach(cellId => {
      const controller = this.abortControllers.get(cellId);
      if (controller) {
        controller.abort();
      }
    });
  }

  resumeGrid(): void {
    this.isPaused = false;
    this.processQueue();
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  // Aggregation prompts
  addAggregationPrompt(gridId: string, columnId: string, prompt: Omit<AggregationPrompt, 'id' | 'columnId' | 'output' | 'status'>): void {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    const aggPrompt: AggregationPrompt = {
      ...prompt,
      id: uuidv4(),
      columnId,
      output: '',
      status: 'idle',
    };

    grid.aggregationPrompts[columnId] = aggPrompt;
    grid.updatedAt = new Date().toISOString();
    this.notifyGridListeners(grid);

    if (prompt.autoRun) {
      this.executeAggregationPrompt(gridId, columnId);
    }
  }

  async executeAggregationPrompt(gridId: string, columnId: string): Promise<void> {
    const grid = this.grids.get(gridId);
    if (!grid) return;

    const aggPrompt = grid.aggregationPrompts[columnId];
    if (!aggPrompt) return;

    const column = grid.columns.find(c => c.id === columnId);
    if (!column) return;

    // Check if all column cells are complete
    const columnCells = Object.values(grid.cells).filter(c => c.columnId === columnId);
    const allComplete = columnCells.every(c => c.status === 'complete');
    
    if (!allComplete) {
      aggPrompt.status = 'queued';
      this.notifyGridListeners(grid);
      return;
    }

    aggPrompt.status = 'running';
    this.notifyGridListeners(grid);

    try {
      // Build aggregation prompt with all cell outputs
      let renderedPrompt = '';
      aggPrompt.prompt.forEach(segment => {
        if (segment.type === 'text') {
          renderedPrompt += segment.content || '';
        } else if (segment.dynamicContent?.type === 'cell_output') {
          renderedPrompt += `# ${column.name}\n`;
          columnCells.forEach((cell) => {
            const company = grid.companies.find(c => c.sedol === cell.rowId);
            renderedPrompt += `======= ${company?.company_name || 'Company'} =======\n${cell.output}\n`;
          });
        }
      });

      aggPrompt.status = 'streaming';
      this.notifyGridListeners(grid);

      const result = await openaiService.generateResponse({
        prompt: renderedPrompt,
        model: aggPrompt.model,
        effortLevel: aggPrompt.effortLevel,
        tools: [],
        onStream: (chunk) => {
          aggPrompt.output = chunk;
          this.notifyGridListeners(grid);
        },
      });

      aggPrompt.status = 'complete';
      aggPrompt.output = result.output;
      aggPrompt.metadata = {
        model: aggPrompt.model,
        effortLevel: aggPrompt.effortLevel,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        dateTime: new Date().toISOString(),
        cost: result.cost,
        toolsUsed: [],
        executionCount: (aggPrompt.metadata?.executionCount || 0) + 1,
      };
    } catch {
      aggPrompt.status = 'error';
    }

    this.notifyGridListeners(grid);
  }
}

export const gridStore = new GridStore();
export default gridStore;
