// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
const podiumStyles = ['bg-gradient-to-t from-yellow-400 to-yellow-300 text-black h-64 z-20', 'bg-gradient-to-t from-gray-400 to-gray-300 text-black h-56 z-10', 'bg-gradient-to-t from-orange-500 to-orange-400 text-white h-48 z-0'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TopMDAs = () => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [top, setTop] = useState<any[]>([]);
  const [bottom, setBottom] = useState<any[]>([]);
  const currentYear = now.getFullYear();
  const from = new Date(currentYear, selectedMonth, 1).getTime();
  const to = new Date(currentYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();
  const data = useQuery(api.tickets.getTopAndBottomMdaPerformanceByMonth, {
    from,
    to
  });
  useEffect(() => {
    if (!data) return;
    const used = new Set();
    const uniqueTop = data.top3.filter(mda => {
      if (used.has(mda.name)) return false;
      used.add(mda.name);
      return true;
    });
    const uniqueBottom = data.bottom3.filter(mda => !used.has(mda.name));
    setTop(uniqueTop);
    setBottom(uniqueBottom);
  }, [data]);
  const renderChart = (mda: any) => {
    const hours = parseFloat((mda.avgTime / 3600000).toFixed(2));
    const chartData = [{
      name: 'Start',
      value: 0
    }, {
      name: 'Resolution',
      value: hours
    }];
    return <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{
        top: 10,
        right: 20,
        bottom: 10,
        left: 0
      }}>
          <XAxis dataKey="name" tick={{
          fontSize: 10
        }} />
          <YAxis tick={{
          fontSize: 10
        }} domain={[0, 'dataMax + 0.1']} />
          <Tooltip formatter={(val: any) => [`${val} hrs`, 'Time']} labelStyle={{
          fontSize: 12
        }} itemStyle={{
          fontSize: 12
        }} />
          <Line type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>;
  };
  return <div className="max-w-7xl mx-auto px-4 py-16 font-[Inter]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          Top Performing MDAs ({monthNames[selectedMonth]})
        </h2>
        <select className="border border-green-400 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
          {monthNames.map((month, i) => <option key={i} value={i}>{month}</option>)}
        </select>
      </div>

      {}
      <div className="bg-[#313132] text-white py-20 px-4 sm:px-8 rounded-3xl shadow-xl mb-24">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-20 flex items-center justify-center gap-2">
          🏆 Top Performing MDAs ({monthNames[selectedMonth]})
        </h2>

        <div className="flex flex-col sm:flex-row justify-center items-end gap-6">
          {top.map((mda, i) => <div key={i} className={`relative flex flex-col items-center justify-end w-full sm:w-1/3 max-w-xs mx-auto rounded-t-3xl shadow-xl px-4 pt-20 pb-6 ${podiumStyles[i]} transform transition-all hover:scale-105`}>
              <div className="absolute top-2 right-2 text-xs font-bold text-white bg-black/60 px-2 py-1 rounded-full shadow z-20">
                #{i + 1}
              </div>
              <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-gray-200 flex items-center justify-center shadow-md z-10">
                <span className="text-2xl">🏛️</span>
              </div>
              <p className="text-center font-semibold text-sm sm:text-base leading-tight">
                {mda.name}
              </p>
              <p className="text-xs sm:text-sm text-center leading-snug">
                Complaints Received: {mda.total}<br />
                Complaints Resolved: {mda.count}<br />
                Avg Resolution Time: {(mda.avgTime / 3600000).toFixed(2)} hrs
              </p>
              <div className="w-full mt-4">{renderChart(mda)}</div>
            </div>)}
        </div>
      </div>

 
    </div>;
};
export default TopMDAs;