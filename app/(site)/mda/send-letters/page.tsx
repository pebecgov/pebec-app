// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Id } from "@/convex/_generated/dataModel";
import Letters from "@/components/Letters";
import { Download, Eye } from "lucide-react";
export default function ViewLettersPage() {
  const allLetters = useQuery(api.letters.getUserLetters) || [];
  const allUsers = useQuery(api.users.getUsers) || [];
  const getFileUrl = useMutation(api.letters.getLetterFileUrl);
  const [fileUrls, setFileUrls] = useState<Record<string, {
    url: string;
    fileName: string;
  }>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const sortedLetters = [...allLetters].sort((a, b) => b.letterDate - a.letterDate);
  const totalPages = Math.ceil(sortedLetters.length / itemsPerPage);
  const paginatedLetters = sortedLetters.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const userMap = Object.fromEntries(allUsers.map(user => [user._id, `${user.firstName || ""} ${user.lastName || ""} (${user.role || "N/A"})`.trim()]));
  useEffect(() => {
    const fetchFileUrls = async () => {
      const urls: {
        [key: string]: {
          url: string;
          fileName: string;
        };
      } = {};
      for (const letter of paginatedLetters) {
        if (letter.letterUploadId && !fileUrls[letter._id]) {
          try {
            const response = await getFileUrl({
              storageId: letter.letterUploadId as Id<"_storage">
            });
            if (response) {
              urls[letter._id] = {
                url: response.url,
                fileName: response.fileName || "Letter.pdf"
              };
            }
          } catch (error) {
            console.error(`Error fetching file for letter ${letter.letterName}:`, error);
          }
        }
      }
      if (Object.keys(urls).length > 0) {
        setFileUrls(prev => ({
          ...prev,
          ...urls
        }));
      }
    };
    if (paginatedLetters.length > 0) {
      fetchFileUrls();
    }
  }, [paginatedLetters, getFileUrl]);
  return <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">📬 My Letters</h1>
          <Button className="bg-green-600 hover:bg-green-700 text-white mt-4 sm:mt-0" onClick={() => setIsModalOpen(true)}>
            Send New Letter to PEBEC
          </Button>
        </div>

        {}
        <div className="overflow-x-auto bg-white rounded-xl shadow-md">
          <Table className="min-w-full text-sm">
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="text-gray-600 font-semibold">Letter Name</TableHead>
                <TableHead className="text-gray-600 font-semibold">Date Sent</TableHead>
                <TableHead className="text-gray-600 font-semibold">Sent To</TableHead>
                <TableHead className="text-gray-600 font-semibold">Status</TableHead>
                <TableHead className="text-center text-gray-600 font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLetters.length > 0 ? paginatedLetters.map(letter => <TableRow key={letter._id} className="hover:bg-gray-50 transition-colors duration-150">
                    <TableCell className="text-gray-800 font-medium">{letter.letterName}</TableCell>
                    <TableCell>{new Date(letter.letterDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {letter.sentTo && userMap[letter.sentTo] ? <span>{userMap[letter.sentTo]}</span> : <span className="text-gray-400 italic">Not specified</span>}
                    </TableCell>

                    <TableCell>
      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${letter.status === "sent" ? "bg-gray-200 text-gray-700" : letter.status === "acknowledged" ? "bg-blue-100 text-blue-700" : letter.status === "in_progress" ? "bg-yellow-100 text-yellow-700" : letter.status === "resolved" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
        {letter.status?.replace("_", " ").toUpperCase() || "SENT"}
      </span>
    </TableCell>
    <TableCell className="text-center">
  {fileUrls[letter._id] ? <Button variant="ghost" size="icon" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-sm" title="Download Letter" onClick={async () => {
                const fileMeta = fileUrls[letter._id];
                if (!fileMeta) return;
                try {
                  const response = await fetch(fileMeta.url);
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = blobUrl;
                  link.download = fileMeta.fileName || "Letter.pdf";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(blobUrl);
                } catch (err) {
                  console.error("Download failed", err);
                }
              }}>
      <Download className="w-4 h-4" />
    </Button> : <Button disabled variant="ghost" size="icon" className="bg-gray-400 text-white rounded-full">
      ...
    </Button>}
            </TableCell>



                  </TableRow>) : <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 py-6">
                    No letters found.
                  </TableCell>
                </TableRow>}
            </TableBody>
          </Table>
        </div>

        {}
        <div className="flex flex-col sm:flex-row justify-center items-center mt-6 gap-4">
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
            ◀ Previous
          </Button>
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
            Next ▶
          </Button>
        </div>

        {}
        {isModalOpen && <Letters onClose={() => setIsModalOpen(false)} />}
      </div>;
}