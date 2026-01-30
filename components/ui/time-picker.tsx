import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: Date | null;
  onChange: (time: Date | null) => void;
  className?: string;
  placeholder?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Select time'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartMinute, setDragStartMinute] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  // Available times (10 AM to 4 PM)
  const availableHours: Array<{ value: number; period: 'AM' | 'PM' }> = [
    { value: 10, period: 'AM' },
    { value: 11, period: 'AM' },
    { value: 12, period: 'PM' },
    { value: 1, period: 'PM' },
    { value: 2, period: 'PM' },
    { value: 3, period: 'PM' },
    { value: 4, period: 'PM' }
  ];

  useEffect(() => {
    if (value) {
      const hours = value.getHours();
      const minutes = value.getMinutes();

      if (hours >= 8 && hours <= 11) {
        setHour(hours);
        setPeriod('AM');
      } else if (hours === 12) {
        setHour(12);
        setPeriod('PM');
      } else if (hours >= 13 && hours <= 17) {
        setHour(hours - 12);
        setPeriod('PM');
      }

      // Round to nearest 15-minute interval
      setMinute(Math.round(minutes / 15) * 15);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global mouse events for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = dragStartY - e.clientY;
      const minuteChange = Math.round(deltaY / 10) * 15;
      const newMinute = Math.max(0, Math.min(45, dragStartMinute + minuteChange));

      setMinute(newMinute);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStartY, dragStartMinute]);

  const handleTimeChange = () => {
    let hour24 = hour;
    if (period === 'AM' && hour === 12) hour24 = 0;
    if (period === 'PM' && hour !== 12) hour24 = hour + 12;

    const newTime = new Date();
    newTime.setHours(hour24, minute, 0, 0);
    onChange(newTime);
    setIsOpen(false);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartMinute(minute);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaY = dragStartY - e.clientY; // Inverted: drag up = positive
    const minuteChange = Math.round(deltaY / 10) * 15; // Every 10px = 15 minutes
    const newMinute = Math.max(0, Math.min(45, dragStartMinute + minuteChange));

    setMinute(newMinute);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    setDragStartMinute(minute);
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const deltaY = dragStartY - e.touches[0].clientY;
    const minuteChange = Math.round(deltaY / 10) * 15;
    const newMinute = Math.max(0, Math.min(45, dragStartMinute + minuteChange));

    setMinute(newMinute);
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input Display */}
      <div
        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer flex items-center gap-2 hover:border-gray-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Clock className="w-4 h-4 text-gray-400" />
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value ? formatTime(value) : placeholder}
        </span>
      </div>

      {/* Time Picker Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 max-h-[80vh] overflow-y-auto">
          <div className="text-center mb-3">
            <h3 className="text-base font-medium text-gray-900">Select Time</h3>
            <p className="text-xs text-gray-500">10:00 AM - 4:00 PM</p>
          </div>

          {/* Hour Selection - Compact */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Hour</label>
            <div className="grid grid-cols-5 gap-1">
              {availableHours.map((h) => (
                <button
                  key={`${h.value}-${h.period}`}
                  className={`px-2 py-1.5 text-xs rounded border transition-colors ${hour === h.value && period === h.period
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  onClick={() => {
                    setHour(h.value);
                    setPeriod(h.period);
                  }}
                >
                  {h.value} {h.period}
                </button>
              ))}
            </div>
          </div>

          {/* Minute Selection - Compact */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Minutes (drag to adjust)
            </label>
            <div
              ref={minuteScrollRef}
              className={`bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-300 cursor-grab select-none transition-all duration-200 ${isDragging ? 'cursor-grabbing bg-green-50 border-green-300' : 'hover:bg-gray-100'
                }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ userSelect: 'none' }}
            >
              <div className="text-center">
                <div className={`text-2xl font-bold transition-all duration-200 ${isDragging ? 'text-green-600' : 'text-green-500'
                  }`}>
                  :{minute.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isDragging ? '↕ Dragging...' : '↕ Drag to change'}
                </div>
                <div className="flex justify-center mt-1 space-x-1">
                  {[0, 15, 30, 45].map((m) => (
                    <div
                      key={m}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${m === minute ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Time Preview - Compact */}
          <div className="mb-3 p-2 bg-green-50 rounded text-center">
            <div className="text-base font-semibold text-green-800">
              {hour}:{minute.toString().padStart(2, '0')} {period}
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex gap-2">
            <button
              className="flex-1 px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              onClick={handleTimeChange}
            >
              Select Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 