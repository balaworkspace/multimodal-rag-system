"use client";

import { useState, useRef } from "react";

export default function UploadFile() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileType, setFileType] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");

  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = () => {
    const inputElement = fileInputRef.current;
    if (!inputElement) return;

    const files = inputElement.files;
    if (!files || files.length === 0) return;

    const file = files[0]; // ✅ Fixed: was `files` (FileList), now `files[0]` (File)

    setStatus("Reading file locally...");

    const reader = new FileReader();

    reader.onload = (event) => {
      if (!event || !event.target) return;

      const text = event.target.result;
      if (typeof text === "string") {
        setFileContent(text);
        setFileName(file.name);
        setFileSize(file.size);
        setFileType(file.type);
        setStatus("File ready. Click upload to vectorize.");
      } else {
        setStatus("Error: Could not read file text.");
      }
    };

    reader.onerror = () => {
      setStatus("Error reading the file.");
    };

    reader.readAsText(file); // ✅ Now receives a real File/Blob
  };

  const handleUpload = async () => {
    if (!fileContent) {
      setStatus("Please select a valid file first.");
      return;
    }

    setIsLoading(true);
    setStatus("Uploading and processing document...");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          fileSize,
          fileType,
          rawText: fileContent,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`Success! Processed ${data.chunks} chunks from your file.`);
        setFileContent("");
        setFileName("");

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        setTimeout(() => {
          setStatus("Success! Refresh the page to see it in your Knowledge Base.");
        }, 3000);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("An unexpected error occurred during upload.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">1. Upload Document</h2>
      <p className="text-sm text-gray-500 mb-4">
        Upload a .txt or .md file to add it to the AI's knowledge base.
      </p>

      <div className="flex flex-col gap-4">
        <input
          type="file"
          accept=".txt,.md"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-md p-2"
        />

        <button
          onClick={handleUpload}
          disabled={!fileContent || isLoading}
          className={`py-2 px-4 rounded-md font-medium text-white transition-colors ${
            !fileContent || isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isLoading ? "Processing..." : "Upload & Vectorize"}
        </button>

        {status && (
          <div
            className={`p-3 text-sm rounded-md ${
              status.includes("Success")
                ? "bg-green-100 text-green-700"
                : status.includes("Uploading") ||
                  status.includes("ready") ||
                  status.includes("Reading")
                ? "bg-blue-100 text-blue-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
}