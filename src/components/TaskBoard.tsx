import React, { useState, useEffect } from 'react';
import { useAppState, Task, TaskComment, TaskAttachment } from '../context/AppState';
import {
  LayoutGrid, Calendar as CalendarIcon, List as ListIcon, Plus, Clock,
  AlertTriangle, Play, Pause, CheckCircle2, MessageSquare, Paperclip,
  ArrowUpRight, ArrowDownRight, Tag, Settings, Send, Calendar,
  User, CheckCircle, Flame, ShieldAlert, X, ChevronRight
} from 'lucide-react';

export const TaskBoard: React.FC = () => {
  const {
    tasks, employees, currentUser, isDemoMode,
    assignTask, updateTaskStatus, addTaskComment, addTaskAttachment, fetchTaskLogs,
    theme
  } = useAppState();

  const [activeTab, setActiveTab] = useState<'kanban' | 'calendar' | 'list'>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskLogs, setTaskLogs] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [simAttachmentName, setSimAttachmentName] = useState('');
  
  // Create task modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskEmpId, setTaskEmpId] = useState('');
  const [taskPriority, setTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  // Fetch logs whenever the selected task drawer is opened
  useEffect(() => {
    if (selectedTask) {
      fetchTaskLogs(selectedTask.id).then(logs => {
        setTaskLogs(logs || []);
      });
    }
  }, [selectedTask, tasks]);

  // Keep selected task instance in sync when task updates happen in context
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskEmpId || !taskDeadline) {
      alert('Please fill out all required fields.');
      return;
    }

    await assignTask({
      title: taskTitle,
      description: taskDesc,
      assignedEmployeeId: taskEmpId,
      priority: taskPriority,
      startDate: new Date(),
      deadline: new Date(taskDeadline),
      notes: taskNotes
    });

    // Reset fields
    setTaskTitle('');
    setTaskDesc('');
    setTaskEmpId('');
    setTaskPriority('Medium');
    setTaskDeadline('');
    setTaskNotes('');
    setShowCreateModal(false);
  };

  const handleStatusTransition = async (task: Task, targetStatus: 'Started' | 'Paused' | 'Completed') => {
    await updateTaskStatus(task.id, targetStatus);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;
    await addTaskComment(selectedTask.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleUploadSimAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simAttachmentName.trim() || !selectedTask) return;
    
    // Simulate uploading a file by creating a mock url
    const mockUrl = `https://example.com/uploads/${Date.now()}-${simAttachmentName.replace(/\s+/g, '-')}`;
    await addTaskAttachment(selectedTask.id, simAttachmentName.trim(), mockUrl);
    setSimAttachmentName('');
    alert('Simulated file uploaded successfully and logged as verified task proof!');
  };

  // Scoped views
  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const myTasks = tasks.filter(t => isManagerOrAdmin ? true : t.employeeId === currentUser?.employeeId);

  const getPriorityColor = (p: string) => {
    if (p === 'High') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (p === 'Medium') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  };

  const getStatusColor = (s: string) => {
    if (s === 'Pending') return 'text-stone-400 bg-stone-500/5';
    if (s === 'Started') return 'text-emerald-400 bg-emerald-500/10';
    if (s === 'Paused') return 'text-amber-400 bg-amber-500/10';
    return 'text-indigo-400 bg-indigo-500/10';
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-stone-900/40 p-3 rounded-2xl border border-white/5">
        <div className="flex gap-1.5 p-1 bg-stone-950 rounded-xl border border-white/5 select-none">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === 'kanban' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/10' : 'text-stone-400 hover:text-stone-250'
            }`}
          >
            <LayoutGrid size={14} /> Kanban Board
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === 'calendar' ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-250'
            }`}
          >
            <CalendarIcon size={14} /> Calendar Grid
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${
              activeTab === 'list' ? 'bg-amber-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-250'
            }`}
          >
            <ListIcon size={14} /> spreadsheet List
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isManagerOrAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-600/10"
            >
              <Plus size={14} /> Create Task
            </button>
          )}
        </div>
      </div>

      {/* VIEW DRAWERS */}
      
      {/* 1. KANBAN BOARD */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
          {(['Pending', 'Started', 'Paused', 'Completed'] as const).map(column => {
            const columnTasks = myTasks.filter(t => t.status === column);
            return (
              <div key={column} className="bg-stone-900/25 border border-white/5 rounded-2xl p-4 flex flex-col min-h-[380px] max-h-[600px] overflow-y-auto">
                {/* Column Title */}
                <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3.5 flex-shrink-0">
                  <h4 className="text-xs font-black text-stone-300 uppercase tracking-widest flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      column === 'Pending' ? 'bg-stone-500' :
                      column === 'Started' ? 'bg-emerald-500 animate-pulse' :
                      column === 'Paused' ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}></span>
                    {column}
                  </h4>
                  <span className="bg-stone-950 text-stone-500 border border-white/5 text-[9px] px-2 py-0.5 rounded-full font-black">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3.5 overflow-y-auto flex-grow pr-0.5">
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="glass-panel p-4 hover:border-amber-500/40 transition-all cursor-pointer scale-100 hover:scale-[1.01] hover:shadow-lg hover:shadow-amber-500/5 select-none space-y-3 text-left relative overflow-hidden"
                    >
                      {task.isOverdue && (
                        <div className="absolute right-0 top-0 bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-bl uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <AlertTriangle size={8} /> OVERDUE
                        </div>
                      )}
                      
                      <div>
                        <h5 className="text-xs font-bold text-stone-200 line-clamp-1 pr-6">{task.title}</h5>
                        <p className="text-[10px] text-stone-500 line-clamp-2 mt-1 leading-relaxed">{task.description}</p>
                      </div>

                      {/* Info tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-white/5">
                        <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-[9px] text-stone-500 font-bold bg-stone-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <User size={10} /> {task.employeeName}
                        </span>
                      </div>

                      {/* Time trackers & counters */}
                      <div className="flex justify-between items-center text-[9px] text-stone-500 font-bold">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {task.status === 'Completed' ? 'Done' : new Date(task.deadline).toLocaleDateString()}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {task.comments.length > 0 && (
                            <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {task.comments.length}</span>
                          )}
                          {task.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5"><Paperclip size={10} /> {task.attachments.length}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="text-center py-10 text-stone-600 text-[10.5px] border-2 border-dashed border-white/5 rounded-xl">
                      No tasks in this column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="bg-stone-900/25 border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-stone-300 uppercase tracking-widest flex items-center gap-2">
              <CalendarIcon size={14} className="text-amber-500" /> Deadline Planner
            </h4>
            <span className="text-[9.5px] text-stone-500 font-bold">Deadlines are visually flagged below</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="glass-panel p-4 hover:border-amber-500/40 transition-all cursor-pointer text-left space-y-3 relative overflow-hidden"
              >
                {task.isOverdue && (
                  <div className="absolute right-0 top-0 bg-rose-600 text-white text-[8px] font-black px-2 py-0.5 rounded-bl uppercase">
                    OVERDUE
                  </div>
                )}
                
                <div className="bg-stone-950 p-2 rounded-xl border border-white/5 text-center flex flex-col justify-center items-center h-12 w-12 flex-shrink-0">
                  <span className="text-[9px] uppercase font-black text-amber-500">
                    {new Date(task.deadline).toLocaleString('default', { month: 'short' })}
                  </span>
                  <span className="text-base font-black text-stone-250 leading-none mt-0.5">
                    {new Date(task.deadline).getDate()}
                  </span>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-stone-200 line-clamp-1">{task.title}</h5>
                  <p className="text-[10px] text-amber-400 font-semibold mt-1">
                    ⏰ Time: {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. LIST VIEW */}
      {activeTab === 'list' && (
        <div className="bg-stone-900/25 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-950 border-b border-white/5 text-[10px] text-stone-500 uppercase font-black tracking-widest select-none">
                <th className="p-4 pl-6">Task Title</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Deadline</th>
                <th className="p-4">Timer Spent</th>
              </tr>
            </thead>
            <tbody>
              {myTasks.map(task => (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="border-b border-white/5 hover:bg-stone-900/20 cursor-pointer transition text-xs font-bold text-stone-300"
                >
                  <td className="p-4 pl-6 flex items-center gap-3">
                    <span className="text-stone-300 font-bold truncate max-w-xs">{task.title}</span>
                    {task.isOverdue && (
                      <span className="text-[8px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 font-black uppercase">Overdue</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-stone-400">{task.employeeName}</span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="p-4 text-stone-400">
                    {new Date(task.deadline).toLocaleString()}
                  </td>
                  <td className="p-4 text-amber-500 font-mono">
                    {task.totalDurationMs > 0 ? `${(task.totalDurationMs / (1000 * 60)).toFixed(1)} min` : '0m'}
                  </td>
                </tr>
              ))}

              {myTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-12 text-stone-600">
                    No tasks found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-white/10 shadow-2xl rounded-2xl w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-stone-500 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3.5 mb-5 select-none">
              <Plus size={16} className="text-amber-500" />
              <h3 className="text-sm font-black text-stone-100">Create New Task Assignment</h3>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-left text-xs font-bold text-stone-400">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-450 uppercase font-black tracking-wider">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit Pharma Fridge stock"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full bg-stone-950 border border-white/10 text-stone-250 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-450 uppercase font-black tracking-wider">Description</label>
                <textarea
                  placeholder="Provide detailed logs of steps needed..."
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-stone-950 border border-white/10 text-stone-250 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-450 uppercase font-black tracking-wider">Assign Operative *</label>
                  <select
                    value={taskEmpId}
                    onChange={e => setTaskEmpId(e.target.value)}
                    className="w-full bg-stone-950 border border-white/10 text-stone-250 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold cursor-pointer"
                  >
                    <option value="">— Select Staff —</option>
                    {employees.map(emp => (
                      <option key={emp.id} className="bg-stone-900" value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-stone-450 uppercase font-black tracking-wider">Priority *</label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as any)}
                    className="w-full bg-stone-950 border border-white/10 text-stone-250 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold cursor-pointer"
                  >
                    <option className="bg-stone-900" value="High">High Priority</option>
                    <option className="bg-stone-900" value="Medium">Medium Priority</option>
                    <option className="bg-stone-900" value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-450 uppercase font-black tracking-wider">Deadline Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={taskDeadline}
                  onChange={e => setTaskDeadline(e.target.value)}
                  className="w-full bg-stone-950 border border-white/10 text-stone-250 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-450 uppercase font-black tracking-wider">Instructions/Notes</label>
                <textarea
                  placeholder="Notes for the employee..."
                  value={taskNotes}
                  onChange={e => setTaskNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-stone-950 border border-white/10 text-stone-250 px-3.5 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-600/10 cursor-pointer active:scale-95 transition"
              >
                Create Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAIL & TIMELINE AUDIT DRAWER */}
      {selectedTask && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-stone-950 border-l border-white/10 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-350 select-none">
          
          {/* Drawer Header */}
          <div className="bg-stone-900 p-5 border-b border-white/10 flex justify-between items-start flex-shrink-0">
            <div className="space-y-1.5 text-left">
              <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full border ${getPriorityColor(selectedTask.priority)}`}>
                {selectedTask.priority}
              </span>
              <h3 className="text-sm font-black text-stone-100">{selectedTask.title}</h3>
              <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Assigned to: {selectedTask.employeeName}</p>
            </div>
            <button
              onClick={() => setSelectedTask(null)}
              className="text-stone-500 hover:text-white p-1 rounded-lg transition cursor-pointer hover:bg-white/5"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-grow overflow-y-auto p-5 space-y-6 text-left">
            
            {/* Description */}
            <div className="space-y-1.5">
              <h5 className="text-[9.5px] text-stone-550 uppercase font-black tracking-wider">Description</h5>
              <p className="text-xs text-stone-300 bg-stone-900/40 border border-white/5 rounded-xl p-3 leading-relaxed">
                {selectedTask.description || 'No description provided.'}
              </p>
            </div>

            {/* Employee Controls Drawer */}
            <div className="bg-stone-900/60 p-4 rounded-xl border border-white/5 space-y-3.5">
              <h5 className="text-[9.5px] text-stone-400 uppercase font-black tracking-wider">Task Control Panel</h5>
              
              <div className="flex flex-wrap gap-2.5">
                {selectedTask.status === 'Pending' && (
                  <button
                    onClick={() => handleStatusTransition(selectedTask, 'Started')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Play size={13} /> Start Task
                  </button>
                )}

                {selectedTask.status === 'Started' && (
                  <>
                    <button
                      onClick={() => handleStatusTransition(selectedTask, 'Paused')}
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <Pause size={13} /> Pause Task
                    </button>
                    <button
                      onClick={() => handleStatusTransition(selectedTask, 'Completed')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 size={13} /> Complete Task
                    </button>
                  </>
                )}

                {selectedTask.status === 'Paused' && (
                  <button
                    onClick={() => handleStatusTransition(selectedTask, 'Started')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Play size={13} /> Resume Task
                  </button>
                )}

                {selectedTask.status === 'Completed' && (
                  <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5">
                    <CheckCircle size={14} /> This task is completed!
                  </span>
                )}
              </div>
            </div>

            {/* Instructions */}
            {selectedTask.notes && (
              <div className="space-y-1.5">
                <h5 className="text-[9.5px] text-stone-550 uppercase font-black tracking-wider font-sans">Special Instructions</h5>
                <p className="text-xs text-amber-300 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 leading-relaxed">
                  {selectedTask.notes}
                </p>
              </div>
            )}

            {/* Proof Upload Simulation */}
            {selectedTask.status !== 'Completed' && (
              <div className="bg-stone-900/30 p-4 rounded-xl border border-dashed border-white/10 space-y-3">
                <h5 className="text-[9.5px] text-stone-500 uppercase font-black tracking-wider flex items-center gap-1"><Paperclip size={11} /> File Proof Upload Simulator</h5>
                <form onSubmit={handleUploadSimAttachment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter file name (e.g. delivery-proof.png)..."
                    value={simAttachmentName}
                    onChange={e => setSimAttachmentName(e.target.value)}
                    className="flex-grow bg-stone-950 text-xs px-3.5 py-2 rounded-xl border border-white/10 outline-none text-stone-250"
                  />
                  <button
                    type="submit"
                    className="bg-stone-850 hover:bg-stone-800 text-amber-500 border border-white/5 rounded-xl px-4 text-xs font-black cursor-pointer active:scale-95 transition"
                  >
                    Upload
                  </button>
                </form>
              </div>
            )}

            {/* Attachments list */}
            {selectedTask.attachments.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-[9.5px] text-stone-550 uppercase font-black tracking-wider flex items-center gap-1"><Paperclip size={11} /> Task Attachments & Proofs</h5>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTask.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-stone-900 hover:bg-stone-850 border border-white/5 p-2.5 rounded-xl flex flex-col items-start gap-2 text-[10.5px] font-bold text-stone-300 hover:text-white transition w-full"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="truncate pr-2">{att.fileName}</span>
                        <ArrowUpRight size={13} className="text-stone-500 flex-shrink-0" />
                      </div>
                      {att.fileUrl.startsWith('data:image/') && (
                        <img 
                          src={att.fileUrl} 
                          alt={att.fileName} 
                          className="w-full h-24 object-cover rounded-lg border border-white/10 mt-1"
                        />
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Logs Timeline */}
            <div className="space-y-3">
              <h5 className="text-[9.5px] text-stone-550 uppercase font-black tracking-wider flex items-center gap-1"><Clock size={11} /> Detailed Audit Logs</h5>
              <div className="border-l border-white/5 ml-3 pl-4 space-y-4">
                {taskLogs.map((log: any, i) => (
                  <div key={i} className="relative text-xs">
                    <span className="absolute left-[-21px] top-1.5 w-2 h-2 rounded-full bg-amber-500/80 shadow shadow-amber-500/35 border border-stone-950"></span>
                    <p className="text-stone-300 font-bold leading-relaxed">{log.details}</p>
                    <p className="text-[9.5px] text-stone-550 mt-0.5">{new Date(log.timestamp).toLocaleString()} · actor: {log.employeeName}</p>
                  </div>
                ))}

                {taskLogs.length === 0 && (
                  <p className="text-stone-500 text-[10px] italic">Loading audit trail logs...</p>
                )}
              </div>
            </div>

            {/* Comments block */}
            <div className="space-y-3.5 border-t border-white/5 pt-5">
              <h5 className="text-[9.5px] text-stone-550 uppercase font-black tracking-wider flex items-center gap-1"><MessageSquare size={11} /> Rich Comments ({selectedTask.comments.length})</h5>
              
              <div className="space-y-3">
                {selectedTask.comments.map((c, idx) => (
                  <div key={idx} className="bg-stone-900/40 border border-white/5 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-stone-300">{c.authorName}</span>
                      <span className="text-stone-500">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed font-bold">{c.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Post comment to thread..."
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  className="flex-grow bg-stone-950 text-xs px-3.5 py-2.5 rounded-xl border border-white/10 outline-none text-stone-250 font-bold"
                />
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-4 py-2.5 text-xs font-black cursor-pointer active:scale-95 transition"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>

          </div>

          {/* Drawer Footer / Durations */}
          <div className="bg-stone-900 p-4 border-t border-white/10 flex justify-between items-center text-[10.5px] text-stone-550 font-bold flex-shrink-0">
            <span>Duration: <strong className="text-stone-300">{selectedTask.totalDurationMs > 0 ? `${(selectedTask.totalDurationMs / (1000 * 60)).toFixed(1)} min` : '0m'}</strong></span>
            <span>Deadline: <strong className="text-stone-300">{new Date(selectedTask.deadline).toLocaleDateString()}</strong></span>
          </div>

        </div>
      )}

    </div>
  );
};

export default TaskBoard;
