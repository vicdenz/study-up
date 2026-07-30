
import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { BookOpen, Target, Calendar } from 'lucide-react';

interface TimeSlotSelectionPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startTime: Date;
  endTime: Date;
  onCreateStudySession: () => void;
  onCreateAssignment: () => void;
  anchorElement: HTMLElement;
}

const TimeSlotSelectionPopover = ({
  open,
  onOpenChange,
  startTime,
  endTime,
  onCreateStudySession,
  onCreateAssignment,
  anchorElement
}: TimeSlotSelectionPopoverProps) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && popoverRef.current && anchorElement) {
      const anchorRect = anchorElement.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      
      // Position the popover near the anchor element
      const left = anchorRect.left + (anchorRect.width / 2) - (popoverRect.width / 2);
      const top = anchorRect.top - popoverRect.height - 8;
      
      // Ensure popover stays within viewport
      const viewportWidth = window.innerWidth;
      const finalLeft = Math.max(8, Math.min(left, viewportWidth - popoverRect.width - 8));
      let finalTop = Math.max(8, top);
      
      // If popover would be above viewport, show it below the anchor
      if (finalTop < 8) {
        finalTop = anchorRect.bottom + 8;
      }
      
      popoverRef.current.style.left = `${finalLeft}px`;
      popoverRef.current.style.top = `${finalTop}px`;
      firstActionRef.current?.focus();
    }
  }, [open, anchorElement]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
        anchorElement.focus();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [anchorElement, open, onOpenChange]);

  const handleCreateStudySession = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCreateStudySession();
    onOpenChange(false);
  };

  const handleCreateAssignment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCreateAssignment();
    onOpenChange(false);
  };

  const formatTimeRange = (start: Date, end: Date) => {
    return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-80 bg-white rounded-lg border shadow-lg p-4"
      style={{ position: 'fixed' }}
      role="dialog"
      aria-labelledby="time-slot-popover-title"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 id="time-slot-popover-title" className="font-medium text-sm">
            Create event for selected time
          </h4>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatTimeRange(startTime, endTime)}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Button
            ref={firstActionRef}
            onClick={handleCreateStudySession}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <BookOpen className="h-4 w-4 text-blue-500" />
            Create Study Session
          </Button>
          
          <Button
            onClick={handleCreateAssignment}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Target className="h-4 w-4 text-green-500" />
            Create Assignment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotSelectionPopover;
