"use client";

import { AppBrand } from "@/components/AppBrand";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <AppBrand href="/" />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 mt-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded mb-8">
          <h2 className="text-2xl font-bold text-yellow-800 mb-4">⚠️ Setup Required</h2>
          <p className="text-yellow-700 mb-4">
            The admin dashboard requires Supabase configuration. Follow these steps:
          </p>

          <div className="space-y-6 mt-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">Create Supabase Project</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
                    <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://supabase.com</a></li>
                    <li>Sign in or create a free account</li>
                    <li>Create a new project</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">Get Your Credentials</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
                    <li>Go to Settings → API in your Supabase project</li>
                    <li>Copy your <strong>Project URL</strong></li>
                    <li>Copy your <strong>anon public</strong> API Key</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">Create Database Tables</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600 text-sm">
                    <li>In Supabase, go to <strong>SQL Editor</strong></li>
                    <li>Create a new query</li>
                    <li>Copy the entire contents of <code className="bg-gray-100 px-2 py-1 rounded">database/migrations/001_initial_schema.sql</code></li>
                    <li>Paste it into the editor and click <strong>Run</strong></li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">Update .env.local</h3>
                  <p className="text-gray-600 text-sm mb-3">Edit the <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file in your project root:</p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
                    <div>NEXT_PUBLIC_SUPABASE_URL=your_project_url_here</div>
                    <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here</div>
                  </div>
                  <p className="text-gray-600 text-sm mt-3">Replace the values with your credentials from step 2</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-2">Restart Dev Server</h3>
                  <p className="text-gray-600 text-sm">Stop the dev server (Ctrl+C) and restart it (<code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code>)</p>
                  <p className="text-gray-600 text-sm mt-3">Then refresh your browser</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 text-sm">
              💡 <strong>Need help?</strong> Check <code className="bg-blue-100 px-2 py-1 rounded">QUICK_START.md</code> for a quick setup guide.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
