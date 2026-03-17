"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto rounded-xl border p-6 shadow">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

        {user ? (
          <>
            <p className="mb-4">Logged in as: {user.email}</p>
            <button
              onClick={handleLogout}
              className="rounded bg-red-600 text-white px-4 py-2"
            >
              Log Out
            </button>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </main>
  );
}