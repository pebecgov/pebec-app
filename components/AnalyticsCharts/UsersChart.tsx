// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Users, FileText, Building, List, TrendingUp } from "lucide-react";
export default function StatsCards() {
  const stats = useQuery(api.users.getGrowthStats) || {
    total: {
      users: 0,
      posts: 0,
      mdas: 0
    },
    growth: {
      users: {
        current: 0,
        previous: 0
      },
      posts: {
        current: 0,
        previous: 0
      },
      mdas: {
        current: 0,
        previous: 0
      }
    }
  };
  const ticketStats = useQuery(api.tickets.getIncidentsStats) || {
    total: 0,
    pending: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0
  };
  const totalActiveTickets = (ticketStats.open ?? 0) + (ticketStats.in_progress ?? 0) + (ticketStats.resolved ?? 0);
  const resolvedPercentage = totalActiveTickets > 0 ? Math.round(ticketStats.resolved / totalActiveTickets * 100) : 0;
  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    if (current === 0) return -100;
    return Math.round((current - previous) / previous * 100);
  };
  const userGrowth = getPercentageChange(stats.growth.users.current, stats.growth.users.previous);
  const postGrowth = getPercentageChange(stats.growth.posts.current, stats.growth.posts.previous);
  const mdaGrowth = getPercentageChange(stats.growth.mdas.current, stats.growth.mdas.previous);
  const statsData = [{
    title: "Total Users",
    value: stats.total.users.toLocaleString(),
    icon: <Users className="w-5 h-5 text-white" />,
    iconBg: "bg-gray-900",
    change: `${userGrowth}%`,
    changeType: userGrowth >= 0 ? "up" : "down",
    timeframe: "last month"
  }, {
    title: "Total Posts",
    value: stats.total.posts.toLocaleString(),
    icon: <FileText className="w-5 h-5 text-white" />,
    iconBg: "bg-gray-900",
    change: `${postGrowth}%`,
    changeType: postGrowth >= 0 ? "up" : "down",
    timeframe: "last week"
  }, {
    title: "Total Enrolled MDAs",
    value: stats.total.mdas.toLocaleString(),
    icon: <Building className="w-5 h-5 text-white" />,
    iconBg: "bg-gray-900",
    change: `${mdaGrowth}%`,
    changeType: mdaGrowth >= 0 ? "up" : "down",
    timeframe: "last week"
  }, {
    title: "Reports Progress",
    value: `${resolvedPercentage}%`,
    icon: <List className="w-5 h-5 text-white" />,
    iconBg: "bg-gray-900",
    progressBar: true
  }];
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => <div key={index} className="bg-white rounded-xl p-4 shadow-sm border flex flex-col justify-between relative">
          {}
          <div className="absolute -top-5 right-4">
            <div className={`rounded-xl p-2 shadow-lg ${stat.iconBg}`}>
              {stat.icon}
            </div>
          </div>

          <div className="pt-6">
            <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
            <h3 className="text-2xl font-semibold text-gray-900">{stat.value}</h3>
          </div>

          {}
          {stat.progressBar ? <div className="mt-4">
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-purple-500 rounded-full transition-all duration-300" style={{
            width: `${resolvedPercentage}%`
          }} />
              </div>
            </div> : <div className="mt-2 text-sm flex items-center">
              <TrendingUp className={`w-4 h-4 mr-1 ${stat.changeType === "up" ? "text-green-500" : "text-red-500 rotate-180"}`} />
              <span className={`font-medium ${stat.changeType === "up" ? "text-green-500" : "text-red-500"}`}>
                {stat.change}
              </span>
              <span className="ml-1 text-gray-500">
                than {stat.timeframe}
              </span>
            </div>}
        </div>)}
    </div>;
}