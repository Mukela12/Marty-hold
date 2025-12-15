import React, { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { Star, Zap } from "lucide-react";

const PreviewCards = ({ className, size = "medium", src }) => {
    const [ isHover, setIsHover ] = useState(false);
    const sizeClasses = {
        small: 'max-w-sm',
        medium: 'max-w-lg',
        large: 'max-w-xl',
    };

    return (
        <main onMouseOver={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)} className={cn("relative", sizeClasses[size], className, "border-blue-300 hover:shadow-2xl hover:border-3 rounded-t-4xl rounded-b-2xl hover:-translate-y-2 hover:shadow-glow transition-all duration-300 hover:scale-[1.02]")}>
            {/* Color Gradient */}
            <section className="bg-amber-100 gradient-primary opacity-10 blur-3xl rounded-top-4xl" />

            {/* Card First Half Image */}
            <section className="relative card-elevated overflow-hidden">
              <div className="relative overflow-hidden aspect-16/10 flex items-center justify-center">
                {/* Scaled wrapper */}
                <div className="origin-center scale-[0.6]">
                  {src?.html && (
                    <iframe
                      srcDoc={src.html}
                      className="w-[600px] h-[408px] border-0 block rounded-t-[4rem]"
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
                  Best Match
                </span>
              </div>
            </section>

            {isHover &&
                <section>
                    <div className="cursor-pointer rounded-t-4xl rounded-b-2xl  absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center animate-fade-in">
                        <span className="px-5 select-design py-2.5 rounded-full bg-white text-foreground font-bold shadow-xl flex items-center gap-2 text-[0.8rem]">
                            <Zap className="w-4 h-4" />
                            Select This Design
                        </span>
                    </div>
                </section>
            }

            {/* Select Template Content */}
            <section className="shadow-sm p-4 rounded-b-2xl">
                <div>
                    <p>Welcome Blend</p>
                    <div className="flex gap-2">
                      <span className="text-[10px] text-bold border border-[#f1f0f5] bg-[#f1f0f5] badge-card rounded-2xl capitalize">
                        welcome
                      </span>
                      <span className="text-[10px] text-bold border border-[#f1f0f5] badge-card rounded-2xl capitalize">
                        friendly
                      </span>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default PreviewCards;
