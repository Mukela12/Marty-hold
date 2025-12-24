import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Loader2, RefreshCw, X,Layout
} from 'lucide-react';
import { supabase } from '../../../../supabase/integration/client';
import "./customizeDesign.css"
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {useBrandDev} from '../../../../contexts/BrandDevContext.jsx'
import { ChatMessage } from './ChatMessage.jsx';
import { ChatLoading } from './ChatLoading.jsx';

const CustomizeDesign = () => {
  const [ editorUrl, setEditorUrl ] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const chatContainerRef = useRef(null);


  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm({
    defaultValues: {
      message: ''
    }
  });

  const { mappedData: brand, apiResponse } = useBrandDev();

  // Simulate PostGrid editor loading
  useEffect(() => {
        const templateId = localStorage.getItem('postgrid-template-id');

        /* here i am goint to fetch the editor session */
        getPostGridEditorSession(templateId);
  }, []);

  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        role: 'ai',
        text: "Hello! I'm your AI design assistant. I can help you refine your postcard content. What would you like to change or improve?",
        suggestions: null,
        onSuggestionClick: handleSuggestionClick
      }]);
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const processAIResponse = (response) => {
    const parsedResponse = JSON.parse(response?.data || response);
    
    if (parsedResponse.metadata.request_type === "out_of_scope") {
      return {
        text: parsedResponse.usage_recommendations.join('\n'),
        suggestions: null,
        transformations: null
      };
    } else {
      const transformations = parsedResponse.transformations?.flatMap(item => 
        item.transformations?.map(trans => ({
          text: trans.text,
          version: trans.version,
          brand_basis: trans.brand_basis,
          marketing_principle: trans.marketing_principle,
          semantic_integrity: trans.semantic_integrity
        }))
      ).filter(Boolean) || [];

      const suggestions = transformations.length > 0 
        ? transformations.map(t => t.text).slice(0, 3)
        : ['Try different wording', 'Make it more engaging', 'Adjust the tone'];

      return {
        text: parsedResponse.usage_recommendations?.join('\n') || "Here are some options based on your brand:",
        suggestions: suggestions,
        transformations: transformations
      };
    }
  };

  const handleSuggestionClick = (suggestionText) => {
    setChatMessages(prev => [...prev, {
      role: 'ai',
      text: `Applied: "${suggestionText}"`,
      suggestions: null,
      transformations: null
    }]);
    
    // onUpdateContent({ [selectedElement]: suggestionText });
  };

  const handleTransformationClick = (transformationText) => {
    setChatMessages(prev => [...prev, {
      role: 'ai',
      text: `Perfect! I've selected: "${transformationText}"`,
      suggestions: null,
      transformations: null
    }]);
    
    // onUpdateContent({ [selectedElement]: transformationText });
  };

    async function getPostGridEditorSession(templateId) {
        try {
            const { data, error } = await supabase.functions.invoke("postgrid-editor-session", {
                body: {
                    templateId: templateId
                }
            });
            if(error){
              throw new Error("Error in implementing the editor flow")
            }
            setEditorUrl(data?.postGridResponse?.url)
        } catch (error) {
            toast.error(error.message)
        };
    };

    const onChatSubmit = async (userData) => {
    try {
      if (!userData.message.trim()) return;
      
      const userMessage = { role: 'user', text: userData.message.trim() };
      setChatMessages(prev => [...prev, userMessage]);
      
      reset();
      
      if (!apiResponse?.brand) {
        throw new Error("No details about brand");
      }
      
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("open-ai-post-editor-area", {
        body: { brand: apiResponse.brand, content: userData.message },
      });
      
      if (error) {
        throw new Error("Error in getting the AI suggestion");
      }
      
      const aiResponseData = processAIResponse(data);
      const aiMessage = {
        role: 'ai',
        text: aiResponseData.text,
        suggestions: null,
        transformations: aiResponseData.transformations,
        onSuggestionClick: handleSuggestionClick,
        onTransformationClick: handleTransformationClick
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to get AI response");
      setChatMessages(prev => [...prev, {
        role: 'ai',
        text: "Sorry, I encountered an error. Please try again.",
        suggestions: null,
        transformations: null
      }]);
    } finally {
      setIsLoading(false);
    }
  };


    return (
        <div>
        {/* Header */}
        <section className="text-center m-6">
          <div className="inline-flex items-center gap-2 px-5 py-5 rounded-full p-2 bg-[#d1efe8] text-[#16be9c] text-sm font-semibold">
            <Layout className="w-4 h-4" />
            Step 3 of 4 • Customize Postcard
          </div>
          <h1 className="text-4xl content-generation md:text-5xl font-bold text-foreground tracking-tight">
            Customize your design
          </h1>
          <div className='flex justify-center'>
            <p className="text-lg text-[#9490a5] max-w-2xl mx-auto">
              AI generates your content, then fine-tune it with the editor and AI chat
            </p>
          </div>
        </section>

        {/* AI Content Generation - Show before editor */}

        {/* Editor + AI Chat Layout - Postcard takes more space */}
        <main className='flex gap-10'>
          <section className="w-full max-w-[890px]">
            {/* Editor Card */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-2 postgrid-badge rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    PostGrid Editor
                  </span>
                </div>

                <button className="flex cursor-pointer regenerate-btn items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>

              {/* Editor Canvas */}
              <main className="p-6">
                <section className="relative rounded-2xl bg-gray-50">
                  {/* Postcard Preview */}
                  <div className="overflow-hidden aspect-3/2 rounded-xl bg-black shadow-lg flex items-center justify-center">
                    <iframe
                      src={editorUrl}
                      title="PostGrid Template Editor"
                      className="w-full h-full"
                      id="postgrid-editor"
                    ></iframe>
                  </div>

                  {/* Footer hint */}
                  <div className="postgrid-footer flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Sparkles className="w-3 h-3" />
                    Click any element to select it for editing
                  </div>
                </section>
              </main>
            </div>
          </section>
          <section className='bg-white rounded-2xl border border-gray-200 shadow-sm relative w-full max-w-md flex flex-col h-[600px]'>
            {/* Header */}
            <div className="rounded-t-2xl gradient-primary-ai px-5 p-4 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">AI Chat Assistant</h3>
                  <p className="text-xs opacity-90">Ask me to refine your copy</p>
                </div>
              </div>
            </div>

            {/* Chat Messages Container */}
            <div 
              ref={chatContainerRef}
              className="flex-1 p-4 overflow-y-auto bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
            >
              <div className="space-y-4">
                {chatMessages.map((message, index) => (
                  <ChatMessage key={index} message={message} />
                ))}
                
                {isLoading && <ChatLoading />}
              </div>
            </div>

            {/* Input Form */}
            <form 
              onSubmit={handleSubmit(onChatSubmit)} 
              className="p-4 border-t border-gray-200 bg-white rounded-b-2xl flex-shrink-0"
            >
              <div className="relative">
                <textarea
                  placeholder="Type your message here..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#57d0b7] focus:border-transparent placeholder:text-gray-400 bg-gray-50 resize-none min-h-[44px] max-h-[120px]"
                  {...register('message', { required: true })}
                  disabled={isSubmitting || isLoading}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(onChatSubmit)();
                    }
                  }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                />
                <button 
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gradient-to-r from-[#57d0b7] to-[#16be9c] hover:opacity-90 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Press <span className="font-semibold">Enter</span> to send • <span className="font-semibold">Shift+Enter</span> for new line
              </p>
            </form>
          </section>
        </main>
      </div>
    );
};

function Suggestion({ text }) {
  return (
    <button className="flex items-center gap-1 p-2 rounded-full text-xs bg-purple-50 text-[#57d0b7] hover:bg-purple-100 transition">
      <Sparkles className="w-3 h-3" />
      {text}
    </button>
  );
}

export default CustomizeDesign;