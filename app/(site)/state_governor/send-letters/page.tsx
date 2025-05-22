// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Id } from "@/convex/_generated/dataModel";
import Letters from "@/components/Letters";
export default function ViewLettersPage() {
  const letters = useQuery(api.letters.getUserLetters) || [];
  const getFileUrl = useMutation(api.letters.getLetterFileUrl);
  const [fileUrls, setFileUrls] = useState<{
    [key: string]: string;
  }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  useEffect(() => {
    const fetchFileUrls = async () => {
      const urls: {
        [key: string]: string;
      } = {};
      for (const letter of letters) {
        if (letter.letterUploadId) {
          try {
            const url = await getFileUrl({
              storageId: letter.letterUploadId as Id<"_storage">
            });
            if (url) {
              urls[letter._id] = url;
            }
          } catch (error) {
            console.error(`Error fetching letter file for ${letter.letterName}:`, error);
          }
        }
      }
      setFileUrls(urls);
    };
    if (letters.length > 0) {
      fetchFileUrls();
    }
  }, [letters, getFileUrl]);
  return <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6">My Letters</h1>

      {}
      <div className="flex justify-end mb-4">
        <Button className="bg-green-600 text-white" onClick={() => setIsModalOpen(true)}>
          Send New Letter to PEBEC
        </Button>
      </div>

      {}
      <div className="bg-white shadow-md rounded-lg p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Letter Name</TableHead>
              <TableHead>Date Sent</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {letters.length > 0 ? letters.map(letter => <TableRow key={letter._id}>
                  <TableCell>{letter.letterName}</TableCell>
                  <TableCell>{new Date(letter.letterDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {fileUrls[letter._id] ? <a href={fileUrls[letter._id]} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-blue-600 text-white px-4 py-2 rounded-md">View Letter</Button>
                      </a> : <Button className="bg-gray-400 text-white px-4 py-2 rounded-md" disabled>
                        Loading...
                      </Button>}
                  </TableCell>
                </TableRow>) : <TableRow>
                <TableCell colSpan={3} className="text-center text-gray-500">
                  No letters found.
                </TableCell>
              </TableRow>}
          </TableBody>
        </Table>
      </div>

      {}
      {isModalOpen && <Letters onClose={() => setIsModalOpen(false)} />}
    </div>;
}