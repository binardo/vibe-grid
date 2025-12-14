import { useEffect, useState } from 'react';
import { Loader2, Clock, Link2, AlertCircle } from 'lucide-react';
import { Cell } from '@/types';
import { gridStore } from '@/stores/gridStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GridCellProps {
  cell?: Cell;
  onClick?: () => void;
}

export default function GridCell({ cell, onClick }: GridCellProps) {
  const [localCell, setLocalCell] = useState<Cell | undefined>(cell);

  useEffect(() => {
    if (!cell) return;

    setLocalCell(cell);

    const unsubscribe = gridStore.subscribeToCellUpdates(cell.id, (updatedCell) => {
      setLocalCell({ ...updatedCell });
    });

    return () => {
      unsubscribe();
    };
  }, [cell]);

  if (!localCell) {
    return (
      <div className="h-32 p-3 bg-gray-50 flex items-center justify-center">
        <span className="text-xs text-gray-400">No cell</span>
      </div>
    );
  }

  const renderContent = () => {
    switch (localCell.status) {
      case 'idle':
        return (
          <div className="h-full flex items-center justify-center text-gray-400">
            <span className="text-xs">Idle</span>
          </div>
        );

      case 'queued':
        return (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-xs">Queued (Pos: {localCell.queuePosition || '?'})</span>
          </div>
        );

      case 'running':
        return (
          <div className="h-full flex flex-col items-center justify-center text-blue-500">
            <Loader2 className="w-5 h-5 animate-spin mb-1" />
            <span className="text-xs">Running...</span>
          </div>
        );

      case 'streaming':
        return (
          <div className="h-full relative">
            <p className="text-sm text-gray-700 line-clamp-3 pr-6">
              {localCell.output || 'Generating...'}
            </p>
            <Loader2 className="w-4 h-4 animate-spin text-blue-500 absolute bottom-0 right-0" />
          </div>
        );

      case 'complete':
        return (
          <div className="h-full">
            <p className="text-sm text-gray-700 line-clamp-3">
              {localCell.output}
            </p>
            {localCell.output.length > 150 && (
              <span className="text-xs text-gray-400">...</span>
            )}
          </div>
        );

      case 'error':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-full flex flex-col items-center justify-center text-red-500 cursor-help">
                  <AlertCircle className="w-5 h-5 mb-1" />
                  <span className="text-xs">Failed</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">Error {localCell.error?.statusCode || 'Unknown'}</p>
                  <p className="text-xs">{localCell.error?.message || 'An error occurred'}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );

      case 'cancelled':
        return (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-xs">Cancelled</span>
          </div>
        );

      default:
        return null;
    }
  };

  const hasDependency = localCell.status === 'queued' && localCell.queuePosition === undefined;

  return (
    <div
      className={`h-32 p-3 cursor-pointer transition-colors ${
        localCell.status === 'complete' 
          ? 'bg-white hover:bg-gray-50' 
          : localCell.status === 'error'
          ? 'bg-red-50 hover:bg-red-100'
          : localCell.status === 'streaming' || localCell.status === 'running'
          ? 'bg-blue-50'
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
      onClick={onClick}
    >
      {hasDependency ? (
        <div className="h-full flex flex-col items-center justify-center text-amber-500">
          <Link2 className="w-5 h-5 mb-1" />
          <span className="text-xs">Waiting dependency</span>
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
}
