"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function ChatUI() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Auto-scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput(""); // Clear input box
    
    // Add user message to UI immediately
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    // Add an empty AI message placeholder that we will fill as the stream comes in
    setMessages((prev) => [...prev, { role: "ai", content: "" }]); 
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      // Read the stream chunk by chunk
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let aiText = "";

      while (reader && !done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          aiText += decoder.decode(value, { stream: true });
          // Update the last message (the AI placeholder) with the new text
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = aiText;
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = "Sorry, I encountered an error while trying to answer that.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col h-[600px]">
      <div className="bg-gray-800 text-white p-4">
        <h2 className="text-lg font-semibold">3. Ask Your Data</h2>
      </div>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <p>Upload a document above, then ask a question about it here!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg shadow-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {msg.content || (msg.role === "ai" && <span className="animate-pulse">Thinking...</span>)}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your uploaded documents..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-6 py-2 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}