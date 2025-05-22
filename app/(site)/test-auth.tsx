"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

export default function TestAuth() {
  const { user: clerkUser, isSignedIn } = useUser();
  const convexUser = useQuery(api.users.getCurrentUsers);
  const allUsers = useQuery(api.users.getUsers);

  console.log("Clerk auth status:", { isSignedIn, userId: clerkUser?.id });
  console.log("Convex user:", convexUser);
  console.log("All users:", allUsers?.length || 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Diagnostic</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Clerk Auth:</h2>
        <p>Signed in: {isSignedIn ? "Yes" : "No"}</p>
        <p>User ID: {clerkUser?.id || "Not signed in"}</p>
        <p>Email: {clerkUser?.primaryEmailAddress?.emailAddress || "N/A"}</p>
      </div>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Convex Current User:</h2>
        {convexUser ? (
          <pre>{JSON.stringify(convexUser, null, 2)}</pre>
        ) : (
          <p>Not authenticated in Convex or user not found</p>
        )}
      </div>
      
      <div className="p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">All Users in Convex:</h2>
        <p>Count: {allUsers?.length || 0}</p>
      </div>
    </div>
  );
}
