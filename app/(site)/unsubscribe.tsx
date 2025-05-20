"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailParam);
  const [status, setStatus] = useState("");

  const unsubscribe = useMutation(api.newsletters.unsubscribeFromNewsletter);

  const handleUnsubscribe = async () => {
    const res = await unsubscribe({ email });
    if (res?.success) {
      setStatus("You’ve been unsubscribed successfully.");
    } else {
      setStatus("Email not found or already unsubscribed.");
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-xl font-bold mb-4">Unsubscribe from Newsletter</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 border rounded mb-4"
      />
      <button
        onClick={handleUnsubscribe}
        className="bg-red-600 text-white px-4 py-2 rounded"
      >
        Unsubscribe
      </button>
      {status && <p className="mt-4 text-sm">{status}</p>}
    </div>
  );
}
