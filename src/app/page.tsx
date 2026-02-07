import Link from "next/link";
import { AppBrand } from "@/components/AppBrand";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="text-center max-w-4xl">
        <div className="flex justify-center mb-6">
          <AppBrand
            href="/"
            textClassName="text-3xl font-bold text-gray-900"
            logoClassName="border-gray-300 bg-white text-gray-400"
          />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900">Rehearse by ORGN Media</h1>
        <p className="mt-2 text-sm text-gray-600">
          Performance planning, rehearsal prep, and stage positioning.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
          <Link href="/admin" className="group">
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 text-blue-600">Admin</h2>
              <ul className="text-left text-gray-600 space-y-3 flex-1">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>Create performances and rehearsal schedules</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>Organize parts, subparts, and timelines</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>Position students and manage rosters</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>Run rehearse mode with music playback</span>
                </li>
              </ul>
              <button className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors group-hover:scale-105">
                Go to Admin
              </button>
            </div>
          </Link>

          <Link href="/signup" className="group">
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 text-green-600">Student Info</h2>
              <ul className="text-left text-gray-600 space-y-3 flex-1">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">→</span>
                  <span>View performance and rehearsal schedule</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">→</span>
                  <span>See your assigned uniform and part order</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">→</span>
                  <span>Check your stage position</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">→</span>
                  <span>Review your performance details</span>
                </li>
              </ul>
              <div className="mt-4 text-sm text-gray-500 font-semibold">
                Registrations are closed.
              </div>
              <button className="w-full mt-6 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors group-hover:scale-105">
                View Performance Information
              </button>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
