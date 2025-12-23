import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Send, Loader2, Wand2, MessageSquare, Edit3, 
  Type, Image, RefreshCw, Check, X,Layout, 
  Lightbulb, MousePointerClick, ChevronDown
} from 'lucide-react';
import { supabase } from '../../../../supabase/integration/client';
import "./customizeDesign.css"

const CustomizeDesign = () => {
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentGenerated, setContentGenerated] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedElement, setSelectedElement] = useState(null);
  const [editorReady, setEditorReady] = useState(false);
  const [ editorUrl, setEditorUrl ] = useState("");

  // Simulate PostGrid editor loading
  useEffect(() => {
        const templateId = localStorage.getItem('postgrid-template-id');

        /* here i am goint to fetch the editor session */
        getPostGridEditorSession(templateId);
  }, []);

    async function getPostGridEditorSession(templateId) {
        try {
            const { data, error } = await supabase.functions.invoke("postgrid-editor-session", {
                body: {
                    templateId: templateId
                }
            });
            setEditorUrl(data?.postGridResponse?.url)
        } catch (error) {
            console.error(error);
        };
    };

  const toneOptions = [
    { value: 'friendly', label: 'Friendly & Warm' },
    { value: 'premium', label: 'Premium & Elegant' },
    { value: 'playful', label: 'Playful & Fun' },
    { value: 'urgent', label: 'Urgent & Direct' },
    { value: 'professional', label: 'Professional' },
  ];

  const handleGenerateContent = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const generatedContent = {
      headline: `Free Coffee On Us!`,
      offerText: `New to the neighborhood? Stop by and enjoy a complimentary small coffee with any pastry purchase. Great Staff, Delicious Pastries, Cozy Atmosphere.`,
      cta: `Bring this postcard to redeem`,
      tagline: `"Welcome to the neighborhood!"`,
    };
    
    onUpdateContent(generatedContent);
    setIsGenerating(false);
    setContentGenerated(true);
    
    // Initial AI message
    setChatMessages([{
      role: 'ai',
      text: `Perfect! I've generated content for your ${business.name || 'business'} postcard. The design is ready for you to customize.\n\nClick any element on the postcard to select it, or ask me to help refine the copy.`,
      suggestions: ['Make headline more exciting', 'Change the offer', 'Different CTA options']
    }]);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    let aiResponse = { role: 'ai', text: '' };
    
    if (userMessage.toLowerCase().includes('headline')) {
      aiResponse = {
        role: 'ai',
        text: 'Here are 3 headline options:\n\n1. "Your First Cup is On Us!"\n2. "Welcome Home, Coffee Lover!"\n3. "Start Your Day the Right Way"',
        suggestions: ['Your First Cup is On Us!', 'Welcome Home, Coffee Lover!', 'Start Your Day Right']
      };
    } else if (userMessage.toLowerCase().includes('cta') || userMessage.toLowerCase().includes('button')) {
      aiResponse = {
        role: 'ai',
        text: 'Here are some call-to-action options:\n\n1. "Redeem this card for your free coffee"\n2. "Show this postcard & claim your treat"\n3. "Visit us today!"',
        suggestions: ['Redeem Now', 'Claim Your Treat', 'Visit Us Today']
      };
    } else if (userMessage.toLowerCase().includes('offer')) {
      aiResponse = {
        role: 'ai',
        text: 'I can adjust your offer! What would you prefer?\n\n• Free item (coffee, pastry, etc.)\n• Percentage discount (10%, 20%)\n• Buy one get one free',
        suggestions: ['20% Off First Order', 'Free Pastry', 'Buy 1 Get 1 Free']
      };
    } else {
      aiResponse = {
        role: 'ai',
        text: `I can help you refine any part of your postcard. Try:\n\n• "Make the headline more exciting"\n• "Give me 3 CTA options"\n• "Change the offer to 20% off"`,
        suggestions: ['Improve headline', 'Change CTA', 'Adjust offer']
      };
    }
    
    setChatMessages(prev => [...prev, aiResponse]);
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.length < 30) {
      onUpdateContent({ headline: suggestion });
      setChatMessages(prev => [...prev, { 
        role: 'ai', 
        text: `Great choice! I've updated the headline to "${suggestion}". What else would you like to change?` 
      }]);
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
          <section className='bg-white relative w-[60%]'>
              {/* Header */}
              <div className="rounded-t-2xl gradient-primary-ai px-5 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">AI Chat Assistant</h3>
                    <p className="text-xs opacity-90">Ask me to refine your copy</p>
                  </div>
                </div>
              </div>
        
              {/* Messages */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50">
              <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-700">
                <p>
                  Perfect! I've generated content for your Brew & Bean Coffee postcard.
                  The design is ready for you to customize.
                </p>
                <p className="mt-2">
                  Click any element on the postcard to select it, or ask me to help
                  refine the copy.
                </p>
              </div>
      
              {/* Suggestion Chips */}
              <div className="flex text-[#57d0b7] flex-wrap gap-2">
                <Suggestion text="Make headline more exciting" />
                <Suggestion text="Change the offer" />
                <Suggestion text="Different CTA options" />
              </div>
              </div>
      
            {/* Input */}
            <div className="p-4 border-t absolute w-full bottom-0 bg-gray-50">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask AI to help refine your copy..."
                  className="flex-1 rounded-full border border-[#e0dfe8] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button className="w-10 h-10 rounded-full bg-[#57d0b7] hover:bg-purple-700 flex items-center justify-center text-white">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
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