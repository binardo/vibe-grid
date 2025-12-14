import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Calendar, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GridLibraryItem, ScheduleConfig } from '@/types';
import { gridStore } from '@/stores/gridStore';

export default function GridLibrary() {
  const navigate = useNavigate();
  const [grids, setGrids] = useState<GridLibraryItem[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedGridId, setSelectedGridId] = useState<string | null>(null);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    enabled: false,
    recurrence: {
      type: 'daily',
      time: '07:00',
    },
    triggers: [],
  });

  useEffect(() => {
    setGrids(gridStore.getGridLibrary());
  }, []);

  const handleCreateGrid = () => {
    const newGrid = gridStore.createGrid();
    navigate(`/grid/${newGrid.id}`);
  };

  const handleOpenGrid = (id: string) => {
    navigate(`/grid/${id}`);
  };

  const handleDeleteGrid = (id: string) => {
    gridStore.deleteGrid(id);
    setGrids(gridStore.getGridLibrary());
  };

  const handleRenameStart = (id: string, currentName: string) => {
    setEditingName(id);
    setTempName(currentName);
  };

  const handleRenameSubmit = (id: string) => {
    if (tempName.trim()) {
      gridStore.renameGrid(id, tempName.trim());
      setGrids(gridStore.getGridLibrary());
    }
    setEditingName(null);
  };

  const handleScheduleOpen = (id: string) => {
    const grid = grids.find(g => g.id === id);
    if (grid?.schedule) {
      setScheduleConfig(grid.schedule);
    } else {
      setScheduleConfig({
        enabled: false,
        recurrence: {
          type: 'daily',
          time: '07:00',
        },
        triggers: [],
      });
    }
    setSelectedGridId(id);
    setScheduleDialogOpen(true);
  };

  const handleScheduleSave = () => {
    if (selectedGridId) {
      gridStore.updateGridSchedule(selectedGridId, scheduleConfig);
      setGrids(gridStore.getGridLibrary());
    }
    setScheduleDialogOpen(false);
    setSelectedGridId(null);
  };

  const formatSchedule = (schedule?: ScheduleConfig): string => {
    if (!schedule?.enabled) return '';
    
    const parts: string[] = [];
    if (schedule.recurrence) {
      parts.push(`${schedule.recurrence.type} at ${schedule.recurrence.time}`);
    }
    if (schedule.triggers?.length) {
      parts.push(`triggers: ${schedule.triggers.join(', ')}`);
    }
    return parts.join(' | ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-2 h-2 bg-white rounded-sm"></div>
                <div className="w-2 h-2 bg-white rounded-sm"></div>
                <div className="w-2 h-2 bg-white rounded-sm"></div>
                <div className="w-2 h-2 bg-white rounded-sm"></div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">GENERATIVE</h1>
              <p className="text-sm text-gray-500">GRID APP</p>
            </div>
          </div>
          <Button onClick={handleCreateGrid} className="gap-2">
            <Plus className="w-4 h-4" />
            New Grid
          </Button>
        </div>
      </header>

      <main className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Grids</h2>
        
        {grids.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No grids yet</h3>
              <p className="text-gray-500 mb-4">Create your first generative grid to get started</p>
              <Button onClick={handleCreateGrid}>Create Grid</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grids.map((grid) => (
              <Card key={grid.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingName === grid.id ? (
                        <Input
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          onBlur={() => handleRenameSubmit(grid.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(grid.id);
                            if (e.key === 'Escape') setEditingName(null);
                          }}
                          autoFocus
                          className="h-8 text-lg font-medium"
                        />
                      ) : (
                        <h3
                          className="text-lg font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                          onClick={() => handleOpenGrid(grid.id)}
                          onDoubleClick={() => handleRenameStart(grid.id, grid.name)}
                        >
                          {grid.name}
                        </h3>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Updated {new Date(grid.updatedAt).toLocaleDateString()}
                      </p>
                      {grid.schedule?.enabled && (
                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatSchedule(grid.schedule)}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenGrid(grid.id)}>
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleScheduleOpen(grid.id)}>
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteGrid(grid.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="schedule-enabled">Enable Schedule</Label>
              <Switch
                id="schedule-enabled"
                checked={scheduleConfig.enabled}
                onCheckedChange={(checked) =>
                  setScheduleConfig({ ...scheduleConfig, enabled: checked })
                }
              />
            </div>

            {scheduleConfig.enabled && (
              <>
                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Select
                    value={scheduleConfig.recurrence?.type || 'daily'}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                      setScheduleConfig({
                        ...scheduleConfig,
                        recurrence: { ...scheduleConfig.recurrence!, type: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-time">Time</Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    value={scheduleConfig.recurrence?.time || '07:00'}
                    onChange={(e) =>
                      setScheduleConfig({
                        ...scheduleConfig,
                        recurrence: { ...scheduleConfig.recurrence!, time: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Triggers</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Only rows for companies with new data will be regenerated
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={scheduleConfig.triggers?.includes('new_filing')}
                        onChange={(e) => {
                          const triggers = scheduleConfig.triggers || [];
                          if (e.target.checked) {
                            setScheduleConfig({
                              ...scheduleConfig,
                              triggers: [...triggers, 'new_filing'],
                            });
                          } else {
                            setScheduleConfig({
                              ...scheduleConfig,
                              triggers: triggers.filter((t) => t !== 'new_filing'),
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">New Filing</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={scheduleConfig.triggers?.includes('new_earnings_call')}
                        onChange={(e) => {
                          const triggers = scheduleConfig.triggers || [];
                          if (e.target.checked) {
                            setScheduleConfig({
                              ...scheduleConfig,
                              triggers: [...triggers, 'new_earnings_call'],
                            });
                          } else {
                            setScheduleConfig({
                              ...scheduleConfig,
                              triggers: triggers.filter((t) => t !== 'new_earnings_call'),
                            });
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">New Earnings Call</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
