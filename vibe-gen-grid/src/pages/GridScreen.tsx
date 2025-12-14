import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  ArrowLeft,
  GripVertical,
  MoreHorizontal,
  Info,
  RefreshCw,
  Trash2,
  Loader2,
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Grid, Company, PromptColumn, Cell, SearchResult } from '@/types';
import { gridStore } from '@/stores/gridStore';
import { apiService } from '@/services/api';
import ColumnEditor from '@/components/grid/ColumnEditor';
import CellViewer from '@/components/grid/CellViewer';
import AggregationPromptEditor from '@/components/grid/AggregationPromptEditor';
import GridCell from '@/components/grid/GridCell';

interface SortableRowProps {
  company: Company;
  columns: PromptColumn[];
  cells: Record<string, Cell>;
  onCellClick: (cell: Cell) => void;
  onRecalculate: (sedol: string, emptyOnly: boolean) => void;
  onDelete: (sedol: string) => void;
}

function SortableRow({ 
  company, 
  columns, 
  cells, 
  onCellClick, 
  onRecalculate, 
  onDelete 
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.sedol });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex border-b border-gray-200 bg-white"
    >
      <div className="w-64 min-w-64 flex-shrink-0 sticky left-0 bg-white z-10 border-r border-gray-200">
        <div className="flex items-center justify-between p-3 h-32">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-medium text-gray-900 truncate">
              {company.short_name || company.company_name}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Info className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{company.company_name}</p>
                    <p className="text-xs">SEDOL: {company.sedol}</p>
                    {company.sector && <p className="text-xs">Sector: {company.sector}</p>}
                    {company.industry && <p className="text-xs">Industry: {company.industry}</p>}
                    {company.country && <p className="text-xs">Country: {company.country}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                {...attributes}
                {...listeners}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRecalculate(company.sedol, false)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Recalculate cells
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRecalculate(company.sedol, true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Recalculate empty cells
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(company.sedol)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {columns.map((column) => {
        const cellId = `${company.sedol}-${column.id}`;
        const cell = cells[cellId];
        return (
          <div key={column.id} className="w-56 min-w-56 flex-shrink-0 border-r border-gray-200">
            <GridCell 
              cell={cell} 
              onClick={() => cell && onCellClick(cell)}
            />
          </div>
        );
      })}
      <div className="w-56 min-w-56 flex-shrink-0 flex items-center justify-center">
        {/* Empty cell for add column button alignment */}
      </div>
    </div>
  );
}

export default function GridScreen() {
  const { gridId } = useParams<{ gridId: string }>();
  const navigate = useNavigate();
  const [grid, setGrid] = useState<Grid | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loadingHoldings, setLoadingHoldings] = useState(false);
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<PromptColumn | null>(null);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [cellViewerOpen, setCellViewerOpen] = useState(false);
  const [aggPromptEditorOpen, setAggPromptEditorOpen] = useState(false);
  const [aggPromptColumnId, setAggPromptColumnId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!gridId) return;

    const loadedGrid = gridStore.getGrid(gridId);
    if (loadedGrid) {
      setGrid({ ...loadedGrid });
    } else {
      // Create new grid if not found
      const newGrid = gridStore.createGrid();
      navigate(`/grid/${newGrid.id}`, { replace: true });
    }

    // Load strategies (pre-cache for search)
    apiService.getStrategies();

    // Subscribe to grid updates
    const unsubscribe = gridStore.subscribeToGridUpdates(gridId, (updatedGrid) => {
      setGrid({ ...updatedGrid });
    });

    return () => {
      unsubscribe();
    };
  }, [gridId, navigate]);

  useEffect(() => {
    setIsPaused(gridStore.isPausedState());
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // Search companies
      const companies = await apiService.searchCompanies(query, 6);
      const companyResults: SearchResult[] = companies.map(c => ({
        type: 'company',
        id: c.sedol,
        name: `${c.short_name || c.company_name} - ${c.company_name}`,
        data: c,
      }));

      // Search strategies locally
      const matchingStrategies = apiService.searchStrategiesLocal(query, 3);
      const strategyResults: SearchResult[] = matchingStrategies.map(s => ({
        type: 'strategy',
        id: s.strategy_code,
        name: s.strategy,
        icon: 'chart',
        data: s,
      }));

      // Search watchlist
      const watchlistResults: SearchResult[] = [];
      if ('watchlist'.includes(query.toLowerCase()) || 'my watchlist'.includes(query.toLowerCase())) {
        watchlistResults.push({
          type: 'watchlist',
          id: 'watchlist',
          name: 'My Watchlist',
          icon: 'list',
          data: { name: 'watchlist' },
        });
      }

      setSearchResults([...companyResults, ...strategyResults, ...watchlistResults].slice(0, 10));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 500);
  };

  const handleSelectResult = async (result: SearchResult) => {
    if (!gridId) return;

    setShowSearchResults(false);
    setSearchQuery('');

    if (result.type === 'company') {
      gridStore.addCompany(gridId, result.data as Company);
    } else if (result.type === 'strategy') {
      setLoadingHoldings(true);
      try {
        const holdings = await apiService.getStrategyHoldings(result.id);
        gridStore.addCompanies(gridId, holdings);
      } finally {
        setLoadingHoldings(false);
      }
    } else if (result.type === 'watchlist') {
      setLoadingHoldings(true);
      try {
        const holdings = await apiService.getWatchlistHoldings();
        gridStore.addCompanies(gridId, holdings);
      } finally {
        setLoadingHoldings(false);
      }
    }
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      gridStore.resumeGrid();
    } else {
      gridStore.pauseGrid();
    }
    setIsPaused(!isPaused);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !grid || active.id === over.id) return;

    const oldIndex = grid.companies.findIndex(c => c.sedol === active.id);
    const newIndex = grid.companies.findIndex(c => c.sedol === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      gridStore.reorderCompanies(grid.id, oldIndex, newIndex);
    }
  };

  const handleAddColumn = () => {
    setEditingColumn(null);
    setColumnEditorOpen(true);
  };

  const handleEditColumn = (column: PromptColumn) => {
    setEditingColumn(column);
    setColumnEditorOpen(true);
  };

  const handleColumnSave = (columnData: Omit<PromptColumn, 'id' | 'order'>) => {
    if (!gridId) return;

    if (editingColumn) {
      gridStore.updateColumn(gridId, editingColumn.id, columnData);
    } else {
      gridStore.addColumn(gridId, columnData);
    }
    setColumnEditorOpen(false);
    setEditingColumn(null);
  };

  const handleDeleteColumn = (columnId: string) => {
    if (!gridId) return;
    gridStore.deleteColumn(gridId, columnId);
  };

  const handleRecalculateColumn = (columnId: string, emptyOnly: boolean) => {
    if (!gridId) return;
    gridStore.recalculateCells(gridId, undefined, columnId, emptyOnly);
  };

  const handleRecalculateRow = (sedol: string, emptyOnly: boolean) => {
    if (!gridId) return;
    gridStore.recalculateCells(gridId, sedol, undefined, emptyOnly);
  };

  const handleDeleteRow = (sedol: string) => {
    if (!gridId) return;
    gridStore.removeCompany(gridId, sedol);
  };

  const handleCellClick = (cell: Cell) => {
    setSelectedCell(cell);
    setCellViewerOpen(true);
  };

  const handleAddAggregationPrompt = (columnId: string) => {
    setAggPromptColumnId(columnId);
    setAggPromptEditorOpen(true);
  };

  if (!grid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                </div>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">GENERATIVE</h1>
                <p className="text-xs text-gray-500 leading-tight">GRID APP</p>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-xl relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Add companies, strategies..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                className="pl-10 bg-white"
              />
              {(isSearching || loadingHoldings) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
            
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                    onClick={() => handleSelectResult(result)}
                  >
                    {result.type === 'company' && (
                      <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-xs font-medium text-blue-600">
                        {(result.data as Company).short_name?.[0] || 'C'}
                      </div>
                    )}
                    {result.type === 'strategy' && (
                      <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 3v18h18" />
                          <path d="M18 9l-5 5-4-4-3 3" />
                        </svg>
                      </div>
                    )}
                    {result.type === 'watchlist' && (
                      <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                        </svg>
                      </div>
                    )}
                    <span className="text-sm text-gray-900">{result.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Grid Enabled</span>
            <Switch
              checked={!isPaused}
              onCheckedChange={handlePauseToggle}
            />
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Column Headers */}
          <div className="flex sticky top-0 bg-gray-100 z-20 border-b border-gray-300">
            <div className="w-64 min-w-64 flex-shrink-0 sticky left-0 bg-gray-100 z-20 border-r border-gray-300">
              <div className="p-3 h-12 flex items-center">
                <span className="text-sm font-medium text-gray-500">Companies</span>
              </div>
            </div>
            {grid.columns.map((column) => (
              <div key={column.id} className="w-56 min-w-56 flex-shrink-0 border-r border-gray-300">
                <div className="p-3 h-12 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {column.name || `Column ${column.order + 1}`}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRecalculateColumn(column.id, false)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Calculate all cells
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRecalculateColumn(column.id, true)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Calculate empty cells
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditColumn(column)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteColumn(column.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            <div className="w-56 min-w-56 flex-shrink-0">
              <div className="p-3 h-12 flex items-center justify-center">
                <Button variant="ghost" size="icon" onClick={handleAddColumn}>
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Rows */}
          {grid.companies.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-gray-500 mb-2">No companies added yet</p>
                <p className="text-sm text-gray-400">Use the search box above to add companies, strategies, or watchlists</p>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={grid.companies.map(c => c.sedol)}
                strategy={verticalListSortingStrategy}
              >
                {grid.companies.map((company) => (
                  <SortableRow
                    key={company.sedol}
                    company={company}
                    columns={grid.columns}
                    cells={grid.cells}
                    onCellClick={handleCellClick}
                    onRecalculate={handleRecalculateRow}
                    onDelete={handleDeleteRow}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          {/* Aggregation Prompts Row */}
          {grid.columns.length > 0 && (
            <div className="flex border-t-2 border-gray-300 bg-gray-50">
              <div className="w-64 min-w-64 flex-shrink-0 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                <div className="p-3 h-16 flex items-center">
                  <span className="text-sm text-gray-500">Aggregation</span>
                </div>
              </div>
              {grid.columns.map((column) => {
                const aggPrompt = grid.aggregationPrompts[column.id];
                return (
                  <div key={column.id} className="w-56 min-w-56 flex-shrink-0 border-r border-gray-200">
                    <div className="p-3 h-16 flex items-center justify-center">
                      {aggPrompt ? (
                        <div 
                          className="w-full h-full bg-white rounded border border-gray-200 p-2 cursor-pointer hover:border-blue-300"
                          onClick={() => handleAddAggregationPrompt(column.id)}
                        >
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {aggPrompt.output || 'Aggregation configured'}
                          </p>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700"
                          onClick={() => handleAddAggregationPrompt(column.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Aggregation Prompt
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="w-56 min-w-56 flex-shrink-0"></div>
            </div>
          )}
        </div>
      </div>

      {/* Column Editor Modal */}
      <ColumnEditor
        open={columnEditorOpen}
        onOpenChange={setColumnEditorOpen}
        column={editingColumn}
        existingColumns={grid.columns}
        onSave={handleColumnSave}
      />

      {/* Cell Viewer Modal */}
      <CellViewer
        open={cellViewerOpen}
        onOpenChange={setCellViewerOpen}
        cell={selectedCell}
        columns={grid.columns}
      />

      {/* Aggregation Prompt Editor */}
      <AggregationPromptEditor
        open={aggPromptEditorOpen}
        onOpenChange={setAggPromptEditorOpen}
        columnId={aggPromptColumnId}
        gridId={grid.id}
        existingPrompt={aggPromptColumnId ? grid.aggregationPrompts[aggPromptColumnId] : undefined}
        column={grid.columns.find(c => c.id === aggPromptColumnId)}
      />
    </div>
  );
}
