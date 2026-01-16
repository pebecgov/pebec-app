// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { mdalistIcon } from '../mdalistIcon';
import { FaMedal, FaTrophy } from 'react-icons/fa';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];


const TopMDAS = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [top, setTop] = useState<any[]>([]);

  const currentYear = now.getFullYear();
  const from = new Date(currentYear, selectedMonth, 1).getTime();
  const to = new Date(currentYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

  const data = useQuery(api.tickets.getTopAndBottomMdaPerformanceByMonth, { from, to });

  useEffect(() => {
    const dataToUse = data || { top5: [], bottom5: [] };

    // Deduplicate and filter data
    const used = new Set<string>();
    const uniqueTop = (dataToUse.top5 ?? []).filter(mda => {
      const name = mda?.name;
      if (!name || used.has(name)) return false;
      used.add(name);
      return true;
    });
    setTop(uniqueTop);
  }, [data]);

  const getMdaIcon = (name: string) => {
    let icon = mdalistIcon.find(icon => icon.name === name);
    if (!icon && name.includes(' - ')) {
      const abbreviation = name.split(' - ')[0];
      icon = mdalistIcon.find(icon => icon.abbreviation === abbreviation);
    }
    if (!icon && name) {
      icon = mdalistIcon.find(icon => name.includes(icon.name));
    }
    return icon?.icon || '🏛️';
  };

  const getRankStyles = (index: number) => {
    switch (index) {
      case 0:
        return {
          bg: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/50',
          text: 'text-yellow-700',
          icon: <FaTrophy className="w-6 h-6 text-yellow-600" />,
          badge: 'bg-yellow-500 text-white',
        };
      case 1:
        return {
          bg: 'bg-gradient-to-r from-slate-200 to-slate-300/50 border-slate-300',
          text: 'text-slate-700',
          icon: <FaMedal className="w-6 h-6 text-slate-500" />,
          badge: 'bg-slate-400 text-white',
        };
      case 2:
        return {
          bg: 'bg-gradient-to-r from-orange-100 to-orange-200/50 border-orange-300',
          text: 'text-orange-800',
          icon: <FaMedal className="w-6 h-6 text-orange-600" />,
          badge: 'bg-orange-500 text-white',
        };
      default:
        return {
          bg: 'bg-white border-slate-200',
          text: 'text-slate-600',
          icon: <span className="w-6 h-6 flex items-center justify-center font-bold text-slate-400">#{index + 1}</span>,
          badge: 'bg-slate-100 text-slate-500',
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 font-[Inter]">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <span>🏆</span> MDA Leaderboard
          <span className="text-sm font-normal text-slate-500 ml-2">({monthNames[selectedMonth]})</span>
        </h2>
        <select
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 transition-all hover:border-green-400"
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
        >
          {monthNames.map((month, i) => (
            <option key={i} value={i}>{month}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {top.map((mda, index) => {
          const style = getRankStyles(index);
          const icon = getMdaIcon(mda.name);
          const avgHours = ((mda.avgTime ?? 0) / 3600000).toFixed(1);

          return (
            <div
              key={index}
              className={`relative flex items-center p-4 rounded-xl border ${style.bg} transition-all duration-300 hover:scale-[1.01] hover:shadow-lg`}
            >
              {/* Rank Icon */}
              <div className="flex-shrink-0 mr-4">
                {style.icon}
              </div>


              {/* Info */}
              <div className="flex-grow min-w-0 mr-4">
                <h3 className={`font-bold text-sm sm:text-base truncate ${index < 3 ? 'text-slate-800' : 'text-slate-600'}`}>
                  {mda.name}
                </h3>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {mda.count} Resolved
                  </span>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Avg: {avgHours} hrs
                  </span>
                </div>
              </div>

              {/* Score Badge */}
              <div className={`hidden sm:flex flex-col items-end flex-shrink-0`}>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${style.badge}`}>
                  Rank #{index + 1}
                </div>
              </div>
            </div>
          );
        })}

        {top.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            No performance data available for this month.
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-slate-400">
        * Rankings are based on the number of resolved tickets and average resolution time.
      </div>
    </div>
  );
};

export default TopMDAS;