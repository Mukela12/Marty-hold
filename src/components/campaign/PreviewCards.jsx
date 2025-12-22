import { useState } from 'react';
import { cn } from '../../utils/cn';
import { Star, Zap, Check } from "lucide-react";

const PreviewCards = ({ className, size = "medium", masterTemplate, handleTemplateSelect, selectedTemplates, aiScore, welcomeMessage="Welcome Blend", tone="Friendly" }) => {
    const [ isHover, setIsHover ] = useState(false);
    const sizeClasses = {
        small: 'max-w-sm',
        medium: 'max-w-lg',
        large: 'max-w-xl',
    };

    return (
      <main onClick={() => handleTemplateSelect(masterTemplate?.template_id)}>
        <main onMouseOver={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)} className={cn("relative", sizeClasses[size], className, 
          "border-blue-300 hover:shadow-2xl hover:border-3 rounded-t-4xl rounded-b-4xl  hover:-translate-y-2 hover:shadow-glow transition-all duration-300 hover:scale-[1.02]", selectedTemplates && "border-3 border-[#4827ec] scale-[1.04]")}>
            {/* Color Gradient */}
            <section className="bg-amber-100 gradient-primary opacity-10 blur-3xl rounded-top-4xl" />

            {/* Card First Half Image */}
            <section className="relative card-elevated overflow-hidden">
              <div className="relative overflow-hidden aspect-16/10 flex items-center justify-center">
                {/* Scaled wrapper */}
                <div className="origin-center scale-[0.6]">
                  {masterTemplate?.html && (
                    <iframe
                      srcDoc={masterTemplate.html}
                      className="w-[600px] h-[408px] border-0 block rounded-t-[5rem]"
                    />
                  )}
                </div>
                
                {/* Overlay */}
                <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
              </div>
                
              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="gradient-primary inline-flex items-center gap-1 p-1 rounded-2xl text-white text-[8px]">
                  <Star className="w-3 h-3" />
                  Ai Ratings : {`${aiScore}%`}
                </span>
              </div>
            </section>

            {isHover &&
                <main>
                    <section className="cursor-pointer rounded-t-4xl rounded-b-4xl  absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center animate-fade-in">
                        <span className="px-5 select-design py-2.5 rounded-full bg-white text-foreground font-bold shadow-xl flex items-center gap-2 text-[0.8rem]">
                            <Zap className="w-4 h-4" />
                            Select This Design
                        </span>
                    </section>
                </main>
            }

            {/* Select Template Content */}
            <main className="shadow-sm p-4 flex justify-between items-center rounded-b-4xl">
                <section>
                    <p>{welcomeMessage}</p>
                    <div className="flex gap-2">
                      <span className="text-[10px] text-bold border border-[#f1f0f5] bg-[#f1f0f5] badge-card rounded-2xl capitalize">
                        {tone}
                      </span>
                    </div>
                </section>
                { selectedTemplates && (
                <section>
                  <span className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  </span>
                </section>
                )}
            </main>
        </main>
      </main>
    );
};

export default PreviewCards;
