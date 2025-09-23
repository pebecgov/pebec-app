// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const [activeConversation, setActiveConversation] = useState<Id<"conversations"> | null>(null);
  const myConversations = useQuery(api.chat.listMyConversations, convexUser?._id ? { userId: convexUser._id } : "skip") || [];
  const messages = useQuery(api.chat.listMessages, activeConversation ? { conversationId: activeConversation, limit: 200 } : "skip") || [];
  const users = useQuery(api.users.getAllUsers) || [];

  const sendMessage = useMutation(api.chat.sendMessage);
  const createConversation = useMutation(api.chat.createConversation);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const markRead = useMutation(api.chat.markRead);

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    if (activeConversation && convexUser?._id) {
      markRead({ conversationId: activeConversation, userId: convexUser._id });
    }
  }, [activeConversation, convexUser?._id]);

  const handleSend = async () => {
    if (!activeConversation || !convexUser?._id) return;
    if (!text && !file) return;

    let fileId: Id<"_storage"> | undefined = undefined;
    let fileName: string | undefined;
    let contentType: string | undefined;

    if (file) {
      const url = await generateUploadUrl();
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file
      });
      const { storageId } = await (await fetch(url)).json();
      fileId = storageId as Id<"_storage">;
      fileName = file.name;
      contentType = file.type;
    }

    await sendMessage({
      conversationId: activeConversation,
      senderId: convexUser._id,
      text: text || undefined,
      fileId,
      fileName,
      contentType
    });
    setText("");
    setFile(null);
  };

  const handleCreateConversation = async () => {
    if (!convexUser?._id || selectedMembers.length === 0) return;
    const memberIds = selectedMembers.map(id => id as Id<"users">);
    const { conversationId } = await createConversation({
      title: undefined,
      isGroup: memberIds.length > 1,
      memberIds,
      createdBy: convexUser._id
    });
    setActiveConversation(conversationId);
    setIsCreating(false);
    setSelectedMembers([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Conversations list */}
      <div className="bg-white rounded-lg shadow p-4 md:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chats</h2>
          <Button size="sm" onClick={() => setIsCreating(true)}>New</Button>
        </div>
        <ul className="space-y-2">
          {myConversations.map((c: any) => (
            <li key={c._id}>
              <button
                className={`w-full text-left px-3 py-2 rounded ${activeConversation === c._id ? "bg-gray-100" : "hover:bg-gray-50"}`}
                onClick={() => setActiveConversation(c._id)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{c.title || (c.isGroup ? "Group" : "Direct")}</span>
                  <span className="text-xs text-gray-500">{new Date(c.lastMessageAt).toLocaleTimeString()}</span>
                </div>
              </button>
            </li>
          ))}
          {myConversations.length === 0 && <p className="text-sm text-gray-500">No conversations yet.</p>}
        </ul>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-lg shadow p-4 md:col-span-2 flex flex-col h-[70vh]">
        {activeConversation ? (
          <>
            <div className="flex-1 overflow-y-auto space-y-3">
              {messages.map((m: any) => (
                <div key={m._id} className={`max-w-[80%] ${m.senderId === convexUser?._id ? "ml-auto text-right" : ""}`}>
                  {m.text && <p className="inline-block bg-gray-100 rounded px-3 py-2 text-sm">{m.text}</p>}
                  {m.fileId && (
                    <div className="mt-1">
                      <a
                        className="text-sm text-blue-600 hover:underline"
                        href={`/api/files/${m.fileId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {m.fileName || "Attachment"}
                      </a>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                className="flex-1 border rounded px-3 py-2 text-sm"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Button onClick={handleSend}>Send</Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">Select a conversation</div>
        )}
      </div>

      {/* New conversation modal (simple inline) */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow p-4 w-full max-w-md">
            <h3 className="font-semibold mb-3">Start a conversation</h3>
            <div className="h-64 overflow-y-auto border rounded p-2 mb-3">
              {users.filter(u => u._id !== convexUser?._id).map((u: any) => (
                <label key={u._id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(u._id)}
                    onChange={(e) => {
                      setSelectedMembers(prev => e.target.checked ? [...prev, u._id] : prev.filter(id => id !== u._id));
                    }}
                  />
                  <span className="text-sm">{u.firstName} {u.lastName} ({u.role})</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreateConversation} disabled={selectedMembers.length === 0}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



