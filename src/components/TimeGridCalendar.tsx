
import React, { useState, useRef } from 'react';
import { format, startOfWeek, addDays, addHours, startOfDay, isToday, isSameDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Target } from 'lucide-react';
import type { AssignmentWithCourse } from '@/hooks/useAssignments';
import type { CourseWithStats } from '@/hooks/useCourses';
import type { StudySessionWithCourse } from '@/hooks/useStudySessions';

type PlannerEvent = AssignmentWithCourse | StudySessionWithCourse;
type CalendarEvent =
  | (AssignmentWithCourse & { type: 'assignment' })
  | (StudySessionWithCourse & { type: 'study' });

interface TimeGridCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  assignments: AssignmentWithCourse[];
  studySessions: StudySessionWithCourse[];
  courses: CourseWithStats[];
  onAddStudySession: () => void;
  onAddAssignment: () => void;
  onTimeSlotSelect?: (startTime: Date, endTime: Date, element: HTMLElement) => void;
  onEventClick?: (event: PlannerEvent, eventType: 'assignment' | 'study') => void;
}

interface TimeSlot {
  hour: number;
  label: string;
}

const TimeGridCalendar = ({ 
  selectedDate, 
  onDateSelect, 
  assignments, 
  studySessions, 
  courses,
  onTimeSlotSelect,
  onEventClick
}: TimeGridCalendarProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; hour: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generate time slots from 12 AM to 11 PM
  const timeSlots: TimeSlot[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`
  }));

  // Get the week starting from the selected date
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleMouseDown = (dayIndex: number, hour: number, event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ day: dayIndex, hour });
    setDragEnd({ day: dayIndex, hour });
  };

  const handleMouseEnter = (dayIndex: number, hour: number) => {
    if (isDragging && dragStart) {
      setDragEnd({ day: dayIndex, hour });
    }
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    if (isDragging && dragStart && dragEnd && onTimeSlotSelect) {
      // Only trigger if same day for now
      if (dragStart.day === dragEnd.day) {
        const startDay = weekDays[dragStart.day];
        const endDay = weekDays[dragEnd.day];
        
        const minHour = Math.min(dragStart.hour, dragEnd.hour);
        const maxHour = Math.max(dragStart.hour, dragEnd.hour);
        
        const startTime = addHours(startOfDay(startDay), minHour);
        const endTime = addHours(startOfDay(endDay), maxHour + 1);
        
        const targetElement = event.currentTarget as HTMLElement;
        
        // Add a small delay to prevent immediate closing
        dragTimeoutRef.current = setTimeout(() => {
          onTimeSlotSelect(startTime, endTime, targetElement);
        }, 100);
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const handleMouseLeave = (event: React.MouseEvent) => {
    // Only end drag if we're leaving the calendar entirely
    const relatedTarget = event.relatedTarget as Node | null;
    if (!calendarRef.current || !relatedTarget || !calendarRef.current.contains(relatedTarget)) {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  };

  const isSlotSelected = (dayIndex: number, hour: number) => {
    if (!isDragging || !dragStart || !dragEnd) return false;
    
    // Only highlight if same day for now
    if (dragStart.day !== dragEnd.day || dayIndex !== dragStart.day) return false;
    
    const minHour = Math.min(dragStart.hour, dragEnd.hour);
    const maxHour = Math.max(dragStart.hour, dragEnd.hour);
    
    return hour >= minHour && hour <= maxHour;
  };

  const getEventsForTimeSlot = (dayIndex: number, hour: number) => {
    const day = weekDays[dayIndex];
    const events: CalendarEvent[] = [];
    
    // Check study sessions
    studySessions.forEach(session => {
      const sessionDate = new Date(session.scheduled_date);
      if (isSameDay(sessionDate, day)) {
        const sessionHour = sessionDate.getHours();
        if (sessionHour === hour) {
          events.push({ ...session, type: 'study' });
        }
      }
    });
    
    // Check assignments (show on due date)
    assignments.forEach(assignment => {
      if (assignment.due_date) {
        const dueDate = new Date(assignment.due_date);
        if (isSameDay(dueDate, day)) {
          const dueHour = dueDate.getHours();
          if (dueHour === hour) {
            events.push({ ...assignment, type: 'assignment' });
          }
        }
      }
    });
    
    return events;
  };

  const handleEventClick = (event: PlannerEvent, eventType: 'assignment' | 'study', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event, eventType);
    }
  };

  const handleEventMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b bg-gray-50 sticky top-0 z-10 flex-shrink-0">
        <div className="p-2 text-sm font-medium text-gray-500 border-r">Time</div>
        {weekDays.map((day, index) => (
          <div 
            key={index} 
            className={`p-2 text-center border-r last:border-r-0 cursor-pointer hover:bg-gray-100 ${
              isToday(day) ? 'bg-blue-50 text-blue-600 font-semibold' : ''
            }`}
            onClick={() => onDateSelect(day)}
          >
            <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
            <div className="text-sm font-medium">{format(day, 'd')}</div>
          </div>
        ))}
      </div>
      
      {/* Scrollable time grid */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div 
            ref={calendarRef} 
            className="min-h-full"
            onMouseLeave={handleMouseLeave}
          >
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot.hour} className="grid grid-cols-8 border-b hover:bg-gray-50">
                {/* Time label */}
                <div className="p-2 text-xs text-gray-500 border-r bg-gray-50 font-medium sticky left-0">
                  {timeSlot.label}
                </div>
                
                {/* Day columns */}
                {weekDays.map((_day, dayIndex) => {
                  const events = getEventsForTimeSlot(dayIndex, timeSlot.hour);
                  const isSelected = isSlotSelected(dayIndex, timeSlot.hour);
                  
                  return (
                    <div
                      key={`${dayIndex}-${timeSlot.hour}`}
                      className={`p-1 border-r last:border-r-0 min-h-[60px] cursor-pointer transition-colors select-none flex flex-col ${
                        isSelected ? 'bg-blue-200' : 'hover:bg-gray-100'
                      }`}
                      onMouseDown={(e) => handleMouseDown(dayIndex, timeSlot.hour, e)}
                      onMouseEnter={() => handleMouseEnter(dayIndex, timeSlot.hour)}
                      onMouseUp={handleMouseUp}
                    >
                      {events.map((event, eventIndex) => {
                        const course = courses.find(c => c.id === event.course_id);
                        return (
                          <div
                            key={eventIndex}
                            className={`text-xs p-1 rounded mb-1 cursor-pointer hover:opacity-80 ${
                              event.type === 'study' 
                                ? 'bg-blue-100 text-blue-800 border-l-2 border-blue-400' 
                                : 'bg-green-100 text-green-800 border-l-2 border-green-400'
                            }`}
                            onClick={(e) => handleEventClick(event, event.type, e)}
                            onMouseDown={handleEventMouseDown}
                          >
                            <div className="flex items-center gap-1">
                              {event.type === 'study' ? (
                                <BookOpen className="h-3 w-3" />
                              ) : (
                                <Target className="h-3 w-3" />
                              )}
                              <span className="font-medium truncate">{event.title}</span>
                            </div>
                            {course && (
                              <div className="text-gray-600 truncate">{course.name}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TimeGridCalendar;
