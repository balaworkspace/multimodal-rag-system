"use client";

import { useEffect, useState } from "react";

// Define the shape of our data based on our Supabase table
type FileRecord = {
  id: string;
  file_name: string;
  file_size: number;
  created_at: string;
};

export default function FileManager() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the files from our API as soon as the component mounts
  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch("/api/files");
        const data = await res.json();
        
        if (data.success) {
          setFiles(data.files);
        }
      } catch (error) {
        console.error("Failed to load files:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFiles();
  }, []);

  // Quick utility to convert raw bytes into readable KB/MB
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">2. Knowledge Base</h2>
      <p className="text-sm text-gray-500 mb-4">
        Documents currently stored in the vector database.
      </p>

      {isLoading ? (
        <p className="text-sm text-gray-500 animate-pulse">Loading files...</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No files uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-2">
          {files.map((file) => (
            <li key={file.id} className="py-3 flex justify-between items-center">
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate" title={file.file_name}>
                  {file.file_name}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(file.created_at).toLocaleDateString()} • {formatBytes(file.file_size)}
                </p>
              </div>
              <div className="h-2 w-2 rounded-full bg-green-500" title="Vectorized and ready"></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}