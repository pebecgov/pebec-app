// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { Suspense } from "react";
import AdminTasks from "@/components/Tasks/AdminTasks";

export default function AdminTasksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading tasks…</div>}>
      <AdminTasks />
    </Suspense>
  );
}
