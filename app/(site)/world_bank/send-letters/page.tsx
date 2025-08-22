// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Id } from "@/convex/_generated/dataModel";
import Letters from "@/components/Letters";
import { Download, Eye, FileText } from "lucide-react";
import LetterViewModal from "@/components/Letters/LetterViewModal";

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
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const itemsPerPage = 10;
  const sortedLetters = [...allLetters].sort((a, b) => b.letterDate - a.letterDate);
  const totalPages = Math.ceil(sortedLetters.length / itemsPerPage);
  const paginatedLetters = sortedLetters.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const userMap = Object.fromEntries(allUsers.map(user => [user._id, `${user.firstName || ""} ${user.lastName || ""} (${user.role || "N/A"})`.trim()]));

  useEffect(() => {
    const fetchFileUrls = async () => {
      const urls: Record<string, { url: string; fileName: string }> = {};
      for (const letter of paginatedLetters) {
        if (letter.letterUploadId) {
          try {
            const response = await getFileUrl({
              storageId: letter.letterUploadId as Id<"_storage">
            });
            if (response) {
              urls[letter._id] = response;
            }
          } catch (error) {
            console.error(`Error fetching letter file for ${letter.letterName}:`, error);
          }
        }
      }
      setFileUrls(urls);
    };
    if (paginatedLetters.length > 0) {
      fetchFileUrls();
    }
  }, [paginatedLetters, getFileUrl]);

  const statusColors: Record<string, string> = {
    sent: "bg-gray-200 text-gray-700",
    acknowledged: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700"
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">📬 World Bank Letters</h1>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          Send Letter
        </Button>
      </div>

      {allLetters.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No letters sent</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by sending your first letter.</p>
          <div className="mt-6">
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Send Letter
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Letter Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Sent To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLetters.map((letter) => (
                  <TableRow key={letter._id}>
                    <TableCell className="font-medium">{letter.letterName}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {letter.description || "No description"}
                    </TableCell>
                    <TableCell>
                      {letter.sentTo ? userMap[letter.sentTo] || "Unknown User" : "General"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[letter.status || "sent"]}`}>
                        {letter.status || "sent"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(letter.letterDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLetter(letter);
                            setIsViewModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {letter.letterUploadId && fileUrls[letter._id] && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(fileUrls[letter._id].url, "_blank")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Send Letter Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Send Letter</h2>
                <Button
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>
              <Letters onClose={() => setIsModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Letter View Modal */}
      {isViewModalOpen && selectedLetter && (
        <LetterViewModal
          letter={selectedLetter}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedLetter(null);
          }}
          fileUrl={fileUrls[selectedLetter._id]?.url}
          fileName={fileUrls[selectedLetter._id]?.fileName}
        />
      )}
    </div>
  );
}
