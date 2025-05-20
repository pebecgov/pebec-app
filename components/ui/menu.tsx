"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical } from "lucide-react";

interface MenuProps {
  onReschedule: () => void;
  onCancel: () => void;
  onView: () => void;
}

export default function Menu({ onReschedule, onCancel, onView }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800">
          <MoreVertical size={18} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-white dark:bg-gray-900 shadow-lg rounded-md p-2 w-40"
          align="end"
        >
          <DropdownMenu.Item
            className="p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            onClick={onView}
          >
            View
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-800 cursor-pointer"
            onClick={onReschedule}
          >
            Reschedule
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800 cursor-pointer"
            onClick={onCancel}
          >
            Cancel
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
