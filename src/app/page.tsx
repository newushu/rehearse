import Link from "next/link";
import { AppBrand } from "@/components/AppBrand";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="text-center max-w-4xl">
        <div className="flex justify-center mb-6">
          <AppBrand href="/" textClassName="text-3xl font-bold text-gray-900" logoClassName="border-gray-300 bg-white text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
          {/* Admin Section */}
          <Link href="/admin" className="group">
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 text-blue-600">Admin Dashboard</h2>
              <ul className="text-left text-gray-600 space-y-3 flex-1">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>Create performances</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>Schedule rehearsals</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>Organize parts & choreography</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>Position students on stage</span>
                </li>
              </ul>
              <button className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors group-hover:scale-105">
                Go to Admin
              </button>
            </div>
          </Link>

          {/* Student Section */}
          <Link href="/signup" className="group">
            <div className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col">
              <h2 className="text-2xl font-bold mb-6 text-green-600">Student Signup</h2>
              <ul className="text-left text-gray-600 space-y-3 flex-1">
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">→</span>
                  <span>Browse performances</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">→</span>
                  <span>Register for performances</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">→</span>
                  <span>View rehearsal schedule</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">→</span>
                  <span>Manage your sign-ups</span>
                </li>
              </ul>
              <button className="w-full mt-6 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors group-hover:scale-105">
                Go to Signup
              </button>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
