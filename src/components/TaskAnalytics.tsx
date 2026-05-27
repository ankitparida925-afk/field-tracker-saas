import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/AppState';
import {
  TrendingUp, Clock, AlertTriangle, CheckCircle, Zap, ShieldAlert,
  Calendar, Flame, Activity, User, Award, ListTodo
} from 'lucide-react';

export const TaskAnalytics: React.FC = () => {
  const { taskAnalytics, tasks, isDemoMode, theme } = useAppState();
  const [localAnalytics, setLocalAnalytics] = useState<any | null>(null);

  // In demo mode or if server analytics aren't loaded yet, aggregate them on the client-side dynamically!
  useEffect(() => {
    if (isDemoMode || !taskAnalytics) {
      // Calculate local sandbox values
      let pending = 0;
      let started = 0;
      let paused = 0;
      let completed = 0;
      let overdue = 0;

      const employeeStats: Record<string, {
        name: string;
        completed: number;
        pending: number;
        overdue: number;
        totalDurationMs: number;
        delayTimeMs: number;
      }> = {};

      tasks.forEach(t => {
        const isPastDeadline = new Date().getTime() > new Date(t.deadline).getTime();
        const currentOverdue = t.status !== 'Completed' && isPastDeadline;

        if (t.status === 'Completed') completed++;
        else if (t.status === 'Started') started++;
        else if (t.status === 'Paused') paused++;
        else pending++;

        if (currentOverdue) overdue++;

        const empId = t.employeeId;
        if (!employeeStats[empId]) {
          employeeStats[empId] = {
            name: t.employeeName,
            completed: 0,
            pending: 0,
            overdue: 0,
            totalDurationMs: 0,
            delayTimeMs: 0
          };
        }

        if (t.status === 'Completed') {
          employeeStats[empId].completed++;
        } else {
          employeeStats[empId].pending++;
        }

        if (currentOverdue) {
          employeeStats[empId].overdue++;
        }

        employeeStats[empId].totalDurationMs += t.totalDurationMs || 0;
        employeeStats[empId].delayTimeMs += t.delayTimeMs || 0;
      });

      setLocalAnalytics({
        summary: {
          total: tasks.length,
          pending,
          started,
          paused,
          completed,
          overdue
        },
        employeePerformance: Object.values(employeeStats),
        recentActivity: [
          { employeeName: 'Sarah Jenkins', action: 'Started', details: 'Sarah started the Pharma Clinic Delivery audit task.', timestamp: new Date(Date.now() - 40 * 60 * 1000) },
          { employeeName: 'Rahul Sharma', action: 'Completed', details: 'Rahul completed the Enterprise Client Onboarding Presentation task.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          { employeeName: 'HQ System', action: 'Created', details: 'Carlos Ruiz was assigned HVAC Air Filter Replacement Service.', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) }
        ]
      });
    } else {
      setLocalAnalytics(taskAnalytics);
    }
  }, [taskAnalytics, tasks, isDemoMode]);

  if (!localAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-stone-500">
        <div className="w-8 h-8 border-[2.5px] border-white/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-[10px] uppercase font-black tracking-widest mt-3">Computing Productivity Insights…</p>
      </div>
    );
  }

  const { summary, employeePerformance, recentActivity } = localAnalytics;

  const getCompletionRate = () => {
    if (summary.total === 0) return 0;
    return Math.round((summary.completed / summary.total) * 100);
  };

  return (
    <div className="space-y-6">
      
      {/* HUD COUNTERS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Tasks', value: summary.total, icon: ListTodo, color: 'sky' },
          { label: 'Completed', value: summary.completed, icon: CheckCircle, color: 'emerald' },
          { label: 'Active In-Progress', value: summary.started, icon: Zap, color: 'amber' },
          { label: 'Pending Start', value: summary.pending + summary.paused, icon: Clock, color: 'stone' },
          { label: 'Deadline Overdue', value: summary.overdue, icon: AlertTriangle, color: 'rose' }
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`glass-panel p-4 flex items-center gap-3.5 text-left border border-white/5`}>
              <div className={`p-2.5 rounded-xl flex-shrink-0 bg-${card.color === 'emerald' ? 'emerald' : card.color === 'rose' ? 'rose' : card.color === 'amber' ? 'amber' : card.color === 'sky' ? 'sky' : 'stone'}-500/10 text-${card.color === 'emerald' ? 'emerald' : card.color === 'rose' ? 'rose' : card.color === 'amber' ? 'amber' : card.color === 'sky' ? 'sky' : 'stone'}-400`}>
                <Icon size={16} />
              </div>
              <div>
                <h4 className="text-[10px] text-stone-500 uppercase font-black tracking-wider leading-none">{card.label}</h4>
                <p className="text-xl font-black text-stone-100 mt-1.5">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* CORE DOUBLE GRAPHICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* PROGRESS TRACKER */}
        <div className="bg-stone-900/25 border border-white/5 rounded-2xl p-5 flex flex-col justify-between items-center text-center">
          <div className="w-full text-left">
            <h4 className="text-xs font-black text-stone-300 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={14} className="text-amber-500" /> Completion Target
            </h4>
            <p className="text-[10px] text-stone-500 mt-0.5">Global organization task resolution ratio</p>
          </div>

          <div className="relative flex items-center justify-center my-6">
            {/* Simple Premium progress circle */}
            <svg width="120" height="120" className="rotate-[-90deg]">
              <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="50"
                fill="transparent"
                stroke="#d97706"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - getCompletionRate() / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-stone-100">{getCompletionRate()}%</span>
              <span className="text-[8.5px] uppercase font-black text-stone-500 mt-0.5">RESOLVED</span>
            </div>
          </div>

          <div className="text-left w-full border-t border-white/5 pt-4 text-[10px] text-stone-500 font-bold space-y-1">
            <div className="flex justify-between">
              <span>Resolution Target Met:</span>
              <span className="text-stone-300 font-black">{summary.completed} / {summary.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Risk Warning Index:</span>
              <span className={summary.overdue > 0 ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}>
                {summary.overdue > 0 ? `${summary.overdue} tasks breached` : 'Healthy (0 delay)'}
              </span>
            </div>
          </div>
        </div>

        {/* EMPLOYEE PERFORMANCE TABLE */}
        <div className="md:col-span-2 bg-stone-900/25 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
          <div className="text-left">
            <h4 className="text-xs font-black text-stone-300 uppercase tracking-widest flex items-center gap-2">
              <Award size={14} className="text-amber-500" /> Operative Productivity Matrix
            </h4>
            <p className="text-[10px] text-stone-500 mt-0.5">Completion counts and average active shift durations</p>
          </div>

          <div className="overflow-x-auto flex-grow max-h-[220px]">
            <table className="w-full text-left border-collapse text-xs font-bold text-stone-300">
              <thead>
                <tr className="border-b border-white/5 text-[9px] text-stone-500 uppercase font-black tracking-wider select-none">
                  <th className="pb-3">Field Employee</th>
                  <th className="pb-3 text-center">Completed</th>
                  <th className="pb-3 text-center">Pending</th>
                  <th className="pb-3 text-center">Overdue</th>
                  <th className="pb-3 text-right">Time Logged</th>
                </tr>
              </thead>
              <tbody>
                {employeePerformance.map((emp: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-stone-900/20 transition">
                    <td className="py-2.5 flex items-center gap-2">
                      <User size={12} className="text-stone-500 flex-shrink-0" />
                      <span>{emp.name}</span>
                    </td>
                    <td className="py-2.5 text-center text-emerald-400 font-black">{emp.completed}</td>
                    <td className="py-2.5 text-center text-stone-400">{emp.pending}</td>
                    <td className="py-2.5 text-center text-rose-400">{emp.overdue}</td>
                    <td className="py-2.5 text-right font-mono text-amber-500">
                      {emp.totalDurationMs > 0 ? `${(emp.totalDurationMs / (1000 * 60)).toFixed(0)}m` : '0m'}
                    </td>
                  </tr>
                ))}

                {employeePerformance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-stone-600">
                      No employee stats compiled yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RECENT ACTIVITY TIMELINE FEED */}
      <div className="bg-stone-900/25 border border-white/5 rounded-2xl p-5 text-left space-y-4">
        <div>
          <h4 className="text-xs font-black text-stone-300 uppercase tracking-widest flex items-center gap-2">
            <Activity size={14} className="text-amber-500 animate-pulse" /> Live Task Activity Feed
          </h4>
          <p className="text-[10px] text-stone-500 mt-0.5">Real-time audit trails of field operations updates</p>
        </div>

        <div className="space-y-4 max-h-[300px] overflow-y-auto">
          {recentActivity.map((log: any, idx: number) => (
            <div key={idx} className="flex gap-4 items-start text-xs border-b border-white/5 pb-3 last:border-0">
              <div className={`p-2 rounded-xl flex-shrink-0 ${
                log.action === 'Completed' ? 'bg-indigo-500/10 text-indigo-400' :
                log.action === 'Started' ? 'bg-emerald-500/10 text-emerald-400' :
                log.action === 'Created' ? 'bg-sky-500/10 text-sky-400' : 'bg-stone-500/10 text-stone-400'
              }`}>
                <Activity size={12} />
              </div>
              <div className="flex-grow space-y-1">
                <p className="text-stone-250 font-bold leading-relaxed">{log.details}</p>
                <div className="flex items-center gap-2 text-[9.5px] text-stone-500 font-bold">
                  <span>Actor: {log.employeeName}</span>
                  <span>·</span>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}

          {recentActivity.length === 0 && (
            <p className="text-stone-500 text-center py-10">No recent task activities logged</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default TaskAnalytics;
