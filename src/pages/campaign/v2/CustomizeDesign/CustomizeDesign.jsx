import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Send, Loader2, Wand2, MessageSquare, Edit3, 
  Type, Image, RefreshCw, Check, X, 
  Lightbulb, MousePointerClick
} from 'lucide-react';
import ProcessLayout from '../../../../components/process/ProcessLayout';

const CustomizeDesign = () => {
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentGenerated, setContentGenerated] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedElement, setSelectedElement] = useState(null);
  const [editorReady, setEditorReady] = useState(false);

  // Simulate PostGrid editor loading
  useEffect(() => {
    const timer = setTimeout(() => setEditorReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

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

  const preview = "";

    return (
        <ProcessLayout currentStep={3} totalSteps={5}
            // footerMessage={selectedTemplate
            //     ? `Continue with ${selectedTemplate.name} template`
            //     : "Please select a template before continuing to the editor"}
            // onContinue={handleContinue}
            // continueDisabled={!selectedTemplate}
            onSkip={() => navigate('/dashboard')}
            skipText="Cancel">
            <div className="">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                        <Edit3 className="w-4 h-4" />
                        Step 3 of 4 • Customize Postcard
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
                        Customize your design
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        AI generates your content, then fine-tune it with the editor and AI chat
                    </p>
                </div>

                {/* AI Content Generation - Show before editor */}
                {!contentGenerated && (
                    <div className="max-w-2xl mx-auto mb-10 animate-scale-in">
                        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-linear-to-br from-primary/5 via-background to-accent/30 p-8 text-center">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2" />

                            <div className="relative">
                                <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow animate-pulse-soft">
                                    <Wand2 className="w-10 h-10 text-white" />
                                </div>

                                <h2 className="text-2xl font-bold text-foreground mb-3">AI Content Generation</h2>
                                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                                    Based on your template and business info, AI will generate compelling copy
                                </p>

                                <div className="flex items-center justify-center gap-4 mb-8">

                                    <select value={selectedTone} onChange={setSelectedTone} placeholder="Select tone" >
                                        {toneOptions.map((option) => (
                                            <option key={option.value} value={option.value} >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={handleGenerateContent}
                                        disabled={isGenerating}
                                        className="h-12 px-8 btn-primary gap-3 text-base font-bold"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                Generate Content
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="flex flex-wrap justify-center gap-3">
                                    {['Headline', 'Offer Text', 'CTA', 'Tagline'].map((item) => (
                                        <p key={item} variant="secondary" className="px-3 py-1.5">
                                            <Check className="w-3 h-3 mr-1.5 text-primary" />
                                            {item}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Editor + AI Chat Layout - Postcard takes more space */}
                {contentGenerated && (
                    <div className="grid lg:grid-cols-5 gap-6">
                        {/* Large Postcard Preview - Takes 3 columns */}
                        <div className="lg:col-span-3">
                            <div className="card-elevated overflow-hidden">
                                {/* Editor Toolbar */}
                                <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-success/10 text-success border-success/20 gap-1">
                                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                            PostGrid Editor
                                        </Badge>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setContentGenerated(false)} className="gap-1.5">
                                        <RefreshCw className="w-4 h-4" />
                                        Regenerate
                                    </Button>
                                </div>

                                {/* Postcard Preview Area */}
                                <div className="p-8 bg-[repeating-linear-gradient(45deg,hsl(var(--muted)/0.2),hsl(var(--muted)/0.2)_10px,transparent_10px,transparent_20px)]">
                                    {!editorReady ? (
                                        <div className="aspect-6/4 flex items-center justify-center">
                                            <div className="text-center">
                                                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                                                <p className="text-muted-foreground">Loading editor...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative max-w-lg mx-auto">
                                            {/* Actual Postcard Design */}
                                            <div
                                                className="aspect-6/4 rounded-xl shadow-2xl overflow-hidden border-4 border-white"
                                                style={{ backgroundColor: preview?.backgroundColor || '#1a1a2e' }}
                                            >
                                                {/* Postcard Header */}
                                                <div className="h-2/5 relative overflow-hidden">
                                                    <div
                                                        className="absolute inset-0 opacity-30"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${preview?.accentColor || business.brandColors.primary} 0%, transparent 100%)`
                                                        }}
                                                    />
                                                    {/* Logo */}
                                                    <div className="absolute top-4 left-4">
                                                        <div
                                                            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg"
                                                            style={{
                                                                backgroundColor: preview?.accentColor || business.brandColors.primary,
                                                                color: preview?.backgroundColor || '#1a1a2e'
                                                            }}
                                                        >
                                                            {business.name?.charAt(0) || 'B'}
                                                        </div>
                                                    </div>
                                                    {/* Business Name */}
                                                    <div className="absolute top-4 right-4">
                                                        <span
                                                            className="text-sm font-semibold opacity-80"
                                                            style={{ color: preview?.accentColor || '#fff' }}
                                                        >
                                                            {business.name}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Postcard Content */}
                                                <div className="h-3/5 p-5 flex flex-col justify-between">
                                                    {/* Headline - Clickable */}
                                                    <div
                                                        className={cn(
                                                            "cursor-pointer p-2 -m-2 rounded-lg transition-all",
                                                            selectedElement === 'headline' && "ring-2 ring-primary bg-primary/10"
                                                        )}
                                                        onClick={() => setSelectedElement('headline')}
                                                    >
                                                        <h3
                                                            className="text-xl font-bold leading-tight"
                                                            style={{ color: preview?.accentColor || '#fff' }}
                                                        >
                                                            {content.headline || 'Your Headline Here'}
                                                        </h3>
                                                    </div>

                                                    {/* Tagline */}
                                                    <div
                                                        className={cn(
                                                            "cursor-pointer p-2 -m-2 rounded-lg transition-all",
                                                            selectedElement === 'tagline' && "ring-2 ring-primary bg-primary/10"
                                                        )}
                                                        onClick={() => setSelectedElement('tagline')}
                                                    >
                                                        <p
                                                            className="text-sm italic opacity-70"
                                                            style={{ color: preview?.accentColor || '#fff' }}
                                                        >
                                                            {content.tagline}
                                                        </p>
                                                    </div>

                                                    {/* Offer Text */}
                                                    <div
                                                        className={cn(
                                                            "cursor-pointer p-2 -m-2 rounded-lg transition-all flex-1 flex items-center",
                                                            selectedElement === 'offer' && "ring-2 ring-primary bg-primary/10"
                                                        )}
                                                        onClick={() => setSelectedElement('offer')}
                                                    >
                                                        <p
                                                            className="text-xs opacity-80 line-clamp-3"
                                                            style={{ color: preview?.accentColor || '#fff' }}
                                                        >
                                                            {content.offerText}
                                                        </p>
                                                    </div>

                                                    {/* CTA Button */}
                                                    <div
                                                        className={cn(
                                                            "cursor-pointer rounded-lg transition-all inline-block self-start",
                                                            selectedElement === 'cta' && "ring-2 ring-primary ring-offset-2"
                                                        )}
                                                        onClick={() => setSelectedElement('cta')}
                                                    >
                                                        <span
                                                            className="inline-block px-5 py-2.5 rounded-lg text-sm font-bold"
                                                            style={{
                                                                backgroundColor: preview?.accentColor || business.brandColors.primary,
                                                                color: preview?.backgroundColor || '#1a1a2e'
                                                            }}
                                                        >
                                                            {content.cta || 'Call to Action'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Click instruction */}
                                            <div className="text-center mt-4">
                                                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                                                    <MousePointerClick className="w-3.5 h-3.5" />
                                                    Click any element to select it for editing
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Element Editor Bar */}
                                {selectedElement && (
                                    <div className="p-4 border-t border-border bg-muted/30">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="capitalize gap-1.5">
                                                <Type className="w-3 h-3" />
                                                {selectedElement}
                                            </Badge>
                                            <Input
                                                value={
                                                    selectedElement === 'headline' ? content.headline :
                                                        selectedElement === 'tagline' ? content.tagline :
                                                            selectedElement === 'offer' ? content.offerText :
                                                                selectedElement === 'cta' ? content.cta : ''
                                                }
                                                onChange={(e) => {
                                                    const key = selectedElement === 'offer' ? 'offerText' : selectedElement;
                                                    onUpdateContent({ [key]: e.target.value });
                                                }}
                                                className="flex-1 h-10"
                                                placeholder={`Edit ${selectedElement}...`}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSelectedElement(null)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Chat Panel - Always Visible - Takes 2 columns */}
                        <div className="lg:col-span-2">
                            <div className="card-elevated overflow-hidden flex flex-col h-[600px] sticky top-24">
                                {/* Chat Header */}
                                <div className="gradient-primary px-5 py-4 flex items-center gap-3 shrink-0">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">AI Chat Assistant</h3>
                                        <p className="text-xs text-white/70">Ask me to refine your copy</p>
                                    </div>
                                </div>

                                {/* Chat Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className="animate-fade-in">
                                            <div
                                                className={cn(
                                                    "text-sm p-4 rounded-2xl whitespace-pre-wrap",
                                                    msg.role === 'user'
                                                        ? "gradient-primary text-white ml-6"
                                                        : "bg-muted mr-4"
                                                )}
                                            >
                                                {msg.text}
                                            </div>

                                            {/* Quick Suggestions */}
                                            {msg.suggestions && msg.role === 'ai' && (
                                                <div className="flex flex-wrap gap-2 mt-3 mr-4">
                                                    {msg.suggestions.map((suggestion, j) => (
                                                        <button
                                                            key={j}
                                                            onClick={() => handleSuggestionClick(suggestion)}
                                                            className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                                                        >
                                                            <Lightbulb className="w-3 h-3" />
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Chat Input */}
                                <div className="p-4 border-t border-border shrink-0">
                                    <div className="flex gap-2">
                                        <Input
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                                            placeholder="Ask AI to help refine your copy..."
                                            className="flex-1 h-11 rounded-xl"
                                        />
                                        <Button
                                            onClick={handleChatSubmit}
                                            disabled={!chatInput.trim()}
                                            className="h-11 w-11 rounded-xl btn-primary"
                                            size="icon"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProcessLayout>
    );
};

export default CustomizeDesign;