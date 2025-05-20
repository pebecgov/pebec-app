"use client";

import { FaBell, FaUserCircle } from "react-icons/fa";

export default function AdminNavbar() {
  return (
    <header className=" fixed bg-white shadow-md px-6 py-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">Admin Dashboard</h1>

      <div className="flex items-center gap-4">
        <FaBell className="text-gray-700 text-lg cursor-pointer" />
        <FaUserCircle className="text-gray-700 text-lg cursor-pointer" />
      </div>
    </header>
  );
}
