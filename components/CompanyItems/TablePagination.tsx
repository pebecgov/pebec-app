"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TABLE_PAGE_SIZE = 10;

export function paginateRows<T>(items: T[], page: number, pageSize = TABLE_PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  return {
    rows: items.slice(startIndex, startIndex + pageSize),
    total,
    totalPages,
    currentPage,
    start: total === 0 ? 0 : startIndex + 1,
    end: Math.min(startIndex + pageSize, total),
  };
}

function pageWindow(current: number, total: number) {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, start + 4);
  const shiftedStart = Math.max(1, end - 4);
  for (let page = shiftedStart; page <= end; page += 1) {
    pages.push(page);
  }
  return pages;
}

export default function TablePagination({
  page,
  totalPages,
  total,
  start,
  end,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-800">{start}</span>
        –<span className="font-medium text-gray-800">{end}</span> of{" "}
        <span className="font-medium text-gray-800">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-full"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        {pageWindow(page, totalPages).map((pageNumber) => (
          <Button
            key={pageNumber}
            type="button"
            variant={pageNumber === page ? "default" : "ghost"}
            size="sm"
            className={`h-8 w-8 rounded-full ${pageNumber === page ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-full"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
