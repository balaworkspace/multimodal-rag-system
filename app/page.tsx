import UploadFile from "@/components/UploadFile";
import FileManager from "@/components/FileManager";
import ChatUI from "@/components/ChatUI";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50 text-gray-900">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-12">Multimodal RAG System</h1>
        
        <div className="flex flex-col md:flex-row gap-8 justify-center items-start mb-4">
          {/* Upload Component */}
          <UploadFile />
          
          {/* Dashboard Component */}
          <FileManager />
        </div>

        {/* The Final Chat Interface */}
        <ChatUI />

      </div>
    </main>
  );
}