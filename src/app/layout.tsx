import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Performance Tool",
  description: "Performance signup and management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="text-center text-xs text-gray-400 py-4">
            Rehearse by Origin Media
          </footer>
        </div>
      </body>
    </html>
  );
}
