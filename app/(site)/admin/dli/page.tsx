// DLIReportsPage.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import CreateDLIForm from "@/components/DLI/CreateDLIReport";

export default function DLIReportsPage() {
  const dliTemplates = useQuery(api.dli.getAllDliTemplates) || [];
  const deleteDliTemplate = useMutation(api.dli.deleteDliTemplate);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDli, setEditingDli] = useState<any>(null);

  const handleEdit = (dli: any) => {
    setEditingDli(dli);
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">DLI Reports</h1>
        <Button
          onClick={() => {
            setEditingDli(null);
            setIsModalOpen(true);
          }}
          className="bg-green-600 text-white"
        >
          Create DLI Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {dliTemplates.length > 0 ? (
          dliTemplates.map((dli) => (
            <div key={dli._id} className="p-4 bg-white shadow-md rounded-lg">
              <h2 className="text-lg font-bold">{dli.title}</h2>
              <p className="text-gray-500">{dli.description}</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => handleEdit(dli)} className="bg-blue-600 text-white">
                  Edit
                </Button>
                <Button
                  onClick={() => deleteDliTemplate({ id: dli._id })}
                  className="bg-red-600 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No DLI Reports found.</p>
        )}
      </div>

      {isModalOpen && (
        <CreateDLIForm
          onClose={() => setIsModalOpen(false)}
          existingDli={editingDli}
        />
      )}
    </div>
  );
}
