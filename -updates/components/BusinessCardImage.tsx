import React, { useState } from 'react';
import type { BusinessCard } from '../types';

interface BusinessCardImageProps {
  card: BusinessCard;
  size?: 'small' | 'medium' | 'large';
  showPlaceholder?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BusinessCardImage: React.FC<BusinessCardImageProps> = ({
  card,
  size = 'medium',
  showPlaceholder = true,
  className = '',
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeStyles = {
    small: { width: '60px', height: '40px' },
    medium: { width: '120px', height: '80px' },
    large: { width: '240px', height: '160px' }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.warn('Failed to load image:', card.imageUrl);
  };

  const containerStyle = {
    ...sizeStyles[size],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative' as const
  };

  // Show placeholder if no image URL or if image failed to load
  if (!card.imageUrl || imageError) {
    if (!showPlaceholder) return null;
    
    return (
      <div 
        className={className}
        style={containerStyle}
        onClick={onClick}
      >
        <div style={{ 
          textAlign: 'center', 
          color: '#6c757d',
          fontSize: size === 'small' ? '12px' : '14px'
        }}>
          <div style={{ fontSize: size === 'small' ? '16px' : '24px' }}>📄</div>
          <div>No Image</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={containerStyle}
      onClick={onClick}
    >
      {imageLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(248, 249, 250, 0.8)',
          fontSize: size === 'small' ? '12px' : '14px',
          color: '#6c757d'
        }}>
          Loading...
        </div>
      )}
      
      <img
        src={card.imageUrl}
        alt={`Business card for ${card.name_th || card.name_en || 'Unknown'}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: imageLoading ? 'none' : 'block'
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
};