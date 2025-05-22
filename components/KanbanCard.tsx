// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
const KanbanCard = ({
  task,
  updateTaskStatus,
  deleteTask
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const progress = task.status === "done" ? 100 : task.status === "in_progress" ? 50 : 0;
  return <div className={`relative p-4 rounded-lg shadow-lg border border-gray-300 hover:shadow-xl transition-all duration-200 ${isOverdue ? "bg-red-100 border-red-500" : "bg-white"}`}>
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">{task.title}</h3>
        <button onClick={() => setDeleteConfirmOpen(true)} className="text-red-500 hover:text-red-700 text-xl">
          ✖
        </button>
      </div>

      {task.description && <p className="text-gray-600 text-sm mt-1">{task.description}</p>}

      {task.assignedToName && <p className="text-sm text-gray-500 mt-2">
          <strong>Assigned to:</strong> {task.assignedToName}
        </p>}

      {task.dueDate && <p className="text-sm text-gray-500 mt-2">
          <strong>Due Date:</strong> {new Date(task.dueDate).toLocaleDateString()}
        </p>}

      {}
      <div className="w-full bg-gray-200 h-2 mt-3 rounded-full overflow-hidden">
        <div className={`h-2 transition-all duration-500 ${progress === 100 ? "bg-green-500" : progress === 50 ? "bg-blue-500" : "bg-gray-400"}`} style={{
        width: `${progress}%`
      }} />
      </div>

      {}
      <div className="relative">
  <button onClick={() => setStatusMenuOpen(!statusMenuOpen)} className="bg-gray-200 text-black mt-3 px-3 py-1 rounded-md w-full hover:bg-gray-300">
    Change Status ▼
  </button>

  {statusMenuOpen && <div className="absolute top-full left-0 z-50 bg-white shadow-md p-2 rounded-md mt-1 w-full border">
      {["to_do", "in_progress", "done"].map(status => <button key={status} className="block w-full text-left px-3 py-1 hover:bg-gray-200" onClick={() => {
          updateTaskStatus({
            taskId: task._id,
            status
          });
          setStatusMenuOpen(false);
        }}>
          {status === "to_do" ? "📌 To Do" : status === "in_progress" ? "🚀 In Progress" : "✅ Done"}
        </button>)}
    </div>}
    </div>


      {}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>Do you really want to delete this task?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <button onClick={() => {
            deleteTask({
              taskId: task._id
            });
            setDeleteConfirmOpen(false);
          }} className="bg-red-500 text-white px-4 py-2 rounded-md">
              Yes, Delete
            </button>
            <button onClick={() => setDeleteConfirmOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded-md">
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default KanbanCard;