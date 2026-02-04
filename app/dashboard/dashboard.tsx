import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight 
} from "lucide-react";

const data = [
  { name: "Sen", tickets: 12 },
  { name: "Sel", tickets: 19 },
  { name: "Rab", tickets: 15 },
  { name: "Kam", tickets: 22 },
  { name: "Jum", tickets: 10 },
];

const pieData = [
  { name: "Selesai", value: 65, color: "#10b981" },
  { name: "Proses", value: 25, color: "#3b82f6" },
  { name: "Tertunda", value: 10, color: "#f59e0b" },
];

export const DashboardView = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Tiket Selesai", value: "24", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Dalam Proses", value: "08", icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "Butuh Perhatian", value: "03", icon: AlertCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="size-6" />
              </div>
              <span className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                +12% <ArrowUpRight className="size-3 ml-0.5" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-6">Volume Tiket Mingguan</h3>
          <div className="h-64 w-full relative min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#94a3b8", fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#94a3b8", fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                  contentStyle={{ 
                    backgroundColor: "rgb(15, 23, 42)", 
                    border: "1px solid rgb(30, 41, 59)", 
                    borderRadius: "8px", 
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    color: "#fff"
                  }}
                />
                <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-6">Status Penyelesaian</h3>
          <div className="h-64 w-full flex items-center relative min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-8">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.name}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
