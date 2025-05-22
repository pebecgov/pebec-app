// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DndContext, closestCorners } from "@dnd-kit/core";
import KanbanColumn from "./KanbanColumn";
const statuses = [{
  id: "to_do",
  title: "To Do"
}, {
  id: "in_progress",
  title: "In Progress"
}, {
  id: "done",
  title: "Done"
}];
const KanbanBoard = () => {
  const toDoTasks = useQuery(api.tasks.getTasksByStatus, {
    status: "to_do"
  }) || [];
  const inProgressTasks = useQuery(api.tasks.getTasksByStatus, {
    status: "in_progress"
  }) || [];
  const doneTasks = useQuery(api.tasks.getTasksByStatus, {
    status: "done"
  }) || [];
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const createTask = useMutation(api.tasks.createTask);
  const onDragEnd = event => {
    const {
      active,
      over
    } = event;
    if (!over) return;
    updateTaskStatus({
      taskId: active.id,
      status: over.id
    });
  };
  return <DndContext collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 md:p-6">
        {statuses.map(status => <KanbanColumn key={status.id} title={status.title} status={status.id} tasks={status.id === "to_do" ? toDoTasks : status.id === "in_progress" ? inProgressTasks : doneTasks} updateTaskStatus={updateTaskStatus} deleteTask={deleteTask} createTask={createTask} />)}
      </div>
    </DndContext>;
};
export default KanbanBoard;