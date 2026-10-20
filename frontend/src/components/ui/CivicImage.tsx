import React, { useState } from 'react';

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
  fallbackSrc = '/assets/cat-garbage.jpg',
  className = '',
  ...rest
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const modeClasses = {
    contain: 'w-full h-full object-contain',
    cover: 'w-full h-full object-cover',
    natural: 'w-auto h-auto max-w-full max-h-full object-contain',
  }[mode];

  return (
    <img
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (!hasError && fallbackSrc) {
          setHasError(true);
          setCurrentSrc(fallbackSrc);
        }
      }}
      className={`${modeClasses} ${className}`}
      {...rest}
    />
  );
};

export default CivicImage;
