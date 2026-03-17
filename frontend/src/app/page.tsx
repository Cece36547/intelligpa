import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">IntelliGPA</h1>
        <p className="text-gray-600">Authentication starter</p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded bg-blue-600 text-white px-4 py-2"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="rounded border px-4 py-2"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}