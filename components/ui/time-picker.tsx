import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock } from 'lucide-react';

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
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Available hours (10 AM to 4 PM = 10, 11, 12, 1, 2, 3, 4)
  const availableHours = [10, 11, 12, 1, 2, 3, 4];
  const availableMinutes = [0, 15, 30, 45]; // 15-minute intervals

  useEffect(() => {
    if (value) {
      const hours = value.getHours();
      const minutes = value.getMinutes();
      
      if (hours === 0) {
        setSelectedHour(12);
        setSelectedPeriod('AM');
      } else if (hours < 12) {
        setSelectedHour(hours);
        setSelectedPeriod('AM');
      } else if (hours === 12) {
        setSelectedHour(12);
        setSelectedPeriod('PM');
      } else {
        setSelectedHour(hours - 12);
        setSelectedPeriod('PM');
      }
      
      setSelectedMinute(minutes);
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

  const handleTimeSelect = (hour: number, minute: number, period: 'AM' | 'PM') => {
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

  const getValidPeriods = (hour: number) => {
    if (hour === 10 || hour === 11) return ['AM'];
    if (hour === 12) return ['PM'];
    if (hour === 1 || hour === 2 || hour === 3 || hour === 4) return ['PM'];
    return [];
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer flex items-center justify-between hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {value ? formatTime(value) : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden">
          <div className="flex">
            {/* Hours Column */}
            <div className="flex-1 border-r border-gray-100">
              <div className="p-2 text-xs font-medium text-gray-500 border-b border-gray-100 bg-gray-50">
                Hour
              </div>
              <div className="max-h-48 overflow-y-auto">
                {availableHours.map((hour) => (
                  <div
                    key={hour}
                    className={`p-2 text-sm cursor-pointer hover:bg-blue-50 ${
                      selectedHour === hour ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                    onClick={() => setSelectedHour(hour)}
                  >
                    {hour}
                  </div>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="flex-1 border-r border-gray-100">
              <div className="p-2 text-xs font-medium text-gray-500 border-b border-gray-100 bg-gray-50">
                Minute
              </div>
              <div className="max-h-48 overflow-y-auto">
                {availableMinutes.map((minute) => (
                  <div
                    key={minute}
                    className={`p-2 text-sm cursor-pointer hover:bg-blue-50 ${
                      selectedMinute === minute ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                    onClick={() => setSelectedMinute(minute)}
                  >
                    {minute.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>

            {/* Period Column */}
            <div className="flex-1">
              <div className="p-2 text-xs font-medium text-gray-500 border-b border-gray-100 bg-gray-50">
                Period
              </div>
              <div className="max-h-48 overflow-y-auto">
                {selectedHour && getValidPeriods(selectedHour).map((period) => (
                  <div
                    key={period}
                    className={`p-2 text-sm cursor-pointer hover:bg-blue-50 ${
                      selectedPeriod === period ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                    onClick={() => {
                      setSelectedPeriod(period);
                      if (selectedHour !== null && selectedMinute !== null) {
                        handleTimeSelect(selectedHour, selectedMinute, period);
                      }
                    }}
                  >
                    {period}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Select Button */}
          {selectedHour !== null && selectedMinute !== null && (
            <div className="p-2 border-t border-gray-100 bg-gray-50">
              <button
                className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                onClick={() => handleTimeSelect(selectedHour, selectedMinute, selectedPeriod)}
              >
                Select {selectedHour}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 