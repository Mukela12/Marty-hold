import React, { useState } from 'react';
import { Sparkles, User, Copy, Check, MessageSquare, Bot } from 'lucide-react';

export const ChatMessage = ({ message }) => {
  const isAI = message.role === 'ai';
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [copiedSuggestion, setCopiedSuggestion] = useState(null);

  const handleCopy = async (text, type, index) => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'transformation') {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1500);
        message.onTransformationClick?.(text);
      } else {
        setCopiedSuggestion(index);
        setTimeout(() => setCopiedSuggestion(null), 1500);
        message.onSuggestionClick?.(text);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#57d0b7] to-[#16be9c] flex items-center justify-center flex-shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-[85%] min-w-[100px] ${isAI ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-xl p-4 ${isAI ? 'bg-white border border-gray-200 shadow-xs' : 'bg-gradient-to-r from-[#57d0b7] to-[#16be9c] text-white'}`}>
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-700">
            {message.text}
          </div>
          
         
          {message.transformations && message.transformations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-3.5 h-3.5 text-[#57d0b7]" />
                <span className="text-xs font-semibold text-gray-600">AI Generated Options</span>
              </div>
              <div className="space-y-3">
                {message.transformations.map((transformation, index) => (
                  <div 
                    key={index}
                    className={`w-full p-3 rounded-lg border cursor-pointer transition-all ${
                      copiedIndex === index 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-200 hover:border-[#57d0b7] hover:bg-[#f8fffd]'
                    }`}
                    onClick={() => handleCopy(transformation.text, 'transformation', index)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 mb-1.5 text-sm break-words">
                          {transformation.text}
                          {copiedIndex === index && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-green-600 animate-pulse whitespace-nowrap">
                              <Check className="w-3 h-3" />
                              Copied
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium whitespace-nowrap">
                            {transformation.version}
                          </span>
                          <span className="text-xs text-gray-500 break-words">
                            Based on: {transformation.brand_basis}
                          </span>
                        </div>
                      </div>
                      <button
                        className="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(transformation.text, 'transformation', index);
                        }}
                      >
                        {copiedIndex === index ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400 hover:text-[#57d0b7]" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={`text-xs text-gray-400 mt-1.5 px-1 ${isAI ? 'text-left' : 'text-right'}`}>
          {isAI ? 'AI Assistant' : 'You'}
        </div>
      </div>
      
      {!isAI && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-gray-600" />
        </div>
      )}
    </div>
  );
};