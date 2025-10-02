import React, { useState, useRef } from 'react';
import { ImageCompressionService } from '../services/imageCompressionService';
import type { UploadProgress } from '../types';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  disabled?: boolean;
  acceptedFormats?: string[];
  maxSizeMB?: number;
  showPreview?: boolean;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onUploadProgress,
  disabled = false,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'],
  maxSizeMB = 10,
  showPreview = true,
  className = ''
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    try {
      // Validate file
      if (!acceptedFormats.includes(file.type)) {
        alert(`Unsupported file format. Please use: ${acceptedFormats.join(', ')}`);
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File size too large. Maximum size is ${maxSizeMB}MB`);
        return;
      }

      // Show preview
      if (showPreview) {
        const previewUrl = await ImageCompressionService.createImagePreview(file);
        setPreview(previewUrl);
      }

      // Compress if needed
      let finalFile = file;
      if (ImageCompressionService.needsCompression(file)) {
        setIsCompressing(true);
        try {
          finalFile = await ImageCompressionService.compressImage(file);
          const info = ImageCompressionService.getCompressionInfo(file, finalFile);
          setCompressionInfo(info);
        } catch (error) {
          console.warn('Compression failed, using original file:', error);
        } finally {
          setIsCompressing(false);
        }
      }

      onImageSelect(finalFile);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const clearImage = () => {
    setPreview(null);
    setCompressionInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`image-upload ${className}`}>
      <div
        className={`upload-area ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: isDragging ? '#f0f8ff' : '#fafafa',
          borderColor: isDragging ? '#007bff' : '#ccc'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {isCompressing ? (
          <div>
            <div>🔄 Compressing image...</div>
          </div>
        ) : preview ? (
          <div>
            <img
              src={preview}
              alt="Preview"
              style={{
                maxWidth: '200px',
                maxHeight: '200px',
                objectFit: 'contain',
                marginBottom: '10px'
              }}
            />
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
            <div>
              <strong>Click to upload</strong> or drag and drop
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Supported formats: {acceptedFormats.map(format => format.split('/')[1]).join(', ')}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Maximum size: {maxSizeMB}MB
            </div>
          </div>
        )}
      </div>

      {compressionInfo && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div><strong>Image Compressed:</strong></div>
          <div>Original: {compressionInfo.originalSize}</div>
          <div>Compressed: {compressionInfo.compressedSize}</div>
          <div>Space saved: {compressionInfo.spaceSaved} ({compressionInfo.compressionRatio}%)</div>
        </div>
      )}
    </div>
  );
};