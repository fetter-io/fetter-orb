"use client";

import { useState } from "react";
import Image from "next/image";

interface ImageLightboxProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export function ImageLightbox({
  src,
  alt,
  width,
  height,
  className = "",
}: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Thumbnail/Regular Image */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setIsOpen(true)}
      />

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl font-light leading-none w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            ×
          </button>

          {/* Full-size image container */}
          <div
            className="relative max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              width={width * 2}
              height={height * 2}
              className="object-contain max-h-[95vh] w-auto h-auto"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
