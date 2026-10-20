import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

export interface CivicImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  mode?: 'contain' | 'cover' | 'natural';
  fallbackSrc?: string;
}

/**
 * Standardized CivicImage component
 * Supports 'contain' (for illustrations/icons), 'cover' (for photographic thumbnails), and 'natural'.
 * Automatically provides fallback recovery and preserves aspect ratio integrity.
 */
export const CivicImage: React.FC<CivicImageProps> = ({
  src,
  alt = '',
  mode = 'contain',
  fallbackSrc = '',
  className = '',
  ...rest
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  const modeClasses = {
    contain: 'w-full h-full object-contain',
    cover: 'w-full h-full object-cover',
    natural: 'w-auto h-auto max-w-full max-h-full object-contain',
  }[mode];

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt || 'No image available'}
        className={`flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 ${className}`}
      >
        <ImageOff className="h-4 w-4" aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          return;
        }
        setHasError(true);
      }}
      className={`${modeClasses} ${className}`}
      {...rest}
    />
  );
};

export default CivicImage;
