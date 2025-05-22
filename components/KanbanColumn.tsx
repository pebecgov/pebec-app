// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import KanbanCard from "./KanbanCard";
const KanbanColumn = ({
  title,
  status,
  tasks,
  updateTaskStatus,
  deleteTask,
  createTask
}) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const submitTask = () => {
    if (!taskTitle.trim()) return alert("Task title is required!");
    createTask({
      title: taskTitle,
      description: taskDescription,
      status,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined
    });
    setModalIsOpen(false);
    setTaskTitle("");
    setTaskDescription("");
    setDueDate("");
  };
  return <div className="bg-gray-100 p-4 rounded-lg shadow-md min-h-[400px] w-full border">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>

        {}
        <Dialog open={modalIsOpen} onOpenChange={setModalIsOpen}>
          <DialogTrigger asChild>
            <button className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition-all">
              + Add
            </button>
          </DialogTrigger>

          <DialogContent className="max-w-sm w-full">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>Enter task details below.</DialogDescription>
            </DialogHeader>

            <input type="text" placeholder="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="w-full border p-2 rounded-md mb-2" />
            <textarea placeholder="Task description (optional)" value={taskDescription} onChange={e => setTaskDescription(e.target.value)} className="w-full border p-2 rounded-md mb-2" />
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border p-2 rounded-md mb-2" />

            <button onClick={submitTask} className="bg-green-500 text-white px-4 py-2 rounded-md w-full mt-3">
              Add Task
            </button>
          </DialogContent>
        </Dialog>
      </div>

      {}
      <div className="space-y-3">
        {tasks.map(task => <KanbanCard key={task._id} task={task} updateTaskStatus={updateTaskStatus} deleteTask={deleteTask} />)}
      </div>
    </div>;
};
export default KanbanColumn;