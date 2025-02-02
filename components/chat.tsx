"use client";

import { useChat } from "ai/react";
import { SendHorizontal, StopCircle } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const promptSuggestions = [
  "Who is the current F1 World Champion?",
  "Explain DRS in Formula 1",
  "Top 5 F1 drivers of all time",
  "Recent changes in F1 regulations",
  "Upcoming F1 races this season",
];

const Chat = () => {
  const { messages, handleSubmit, input, setInput, isLoading, stop, error } =
    useChat({
      api: "/api/gemini",
    });

  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(
    null
  );

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setSelectedSuggestion(suggestion);
    handleSubmit({
      preventDefault: () => {},
      target: { message: { value: suggestion } },
    } as any);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">F1 RAG Chatbot</h1>
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error.message}
        </div>
      )}
      <ScrollArea className="flex-grow border rounded-md p-4 bg-white dark:bg-gray-800">
        {messages.length !== 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.role === "assistant"
                  ? "pl-4 border-l-2 border-black dark:border-white"
                  : ""
              }`}
            >
              <span className="font-bold">
                {message.role === "user" ? "You: " : "AI: "}
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {message.content}
              </span>
            </div>
          ))
        ) : (
          <div className="flex justify-center items-center">
            Send a message to start a conversation about Formula 1
          </div>
        )}
        {isLoading && (
          <div className="text-gray-500 animate-pulse pl-4 border-l-2 border-black dark:border-white">
            AI is thinking...
          </div>
        )}
      </ScrollArea>
      <div className="flex flex-wrap gap-2 mb-2">
        {promptSuggestions.map((suggestion) => (
          <Button
            key={suggestion}
            onClick={() => handleSuggestionClick(suggestion)}
            variant="outline"
            size="sm"
            className={`text-sm ${
              selectedSuggestion === suggestion
                ? "bg-black text-white dark:bg-white dark:text-black"
                : ""
            }`}
          >
            {suggestion}
          </Button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setSelectedSuggestion(null);
          }}
          placeholder="Ask about Formula 1..."
          className="flex-grow bg-white dark:bg-gray-800"
        />
        <Button
          type="submit"
          disabled={isLoading || input.trim() === ""}
          className="bg-black text-white dark:bg-white dark:text-black"
        >
          <SendHorizontal className="w-4 h-4 mr-2" />
          Send
        </Button>
        {isLoading && (
          <Button
            type="button"
            variant="outline"
            onClick={stop}
            className="border-black dark:border-white"
          >
            <StopCircle className="w-4 h-4 mr-2" />
            Stop
          </Button>
        )}
      </form>
    </div>
  );
};

export default Chat;
