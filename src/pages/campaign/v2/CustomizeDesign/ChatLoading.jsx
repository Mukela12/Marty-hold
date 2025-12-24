// components/ChatLoading.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export const ChatLoading = () => {
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#57d0b7] to-[#16be9c] flex items-center justify-center flex-shrink-0">
        <Loader2 className="w-4 h-4 text-white animate-spin" />
      </div>
      
      <div className="max-w-[80%]">
        <div className="rounded-2xl p-4 bg-white border border-gray-200">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-[#57d0b7] animate-spin" />
            <span className="text-sm text-gray-600">AI is thinking...</span>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1 text-left">
          AI Assistant • Thinking
        </div>
      </div>
    </div>
  );
};