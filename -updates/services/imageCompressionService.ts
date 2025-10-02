import type { ImageCompressionOptions } from "../types";

export class ImageCompressionService {
  private static readonly DEFAULT_OPTIONS: ImageCompressionOptions = {
    maxWidth: 1200,
    maxHeight: 800,
    maxFileSizeKB: 500,
    quality: 0.85
  };

  /**
   * Compresses an image file
   */
  static async compressImage(
    file: File,
    options: Partial<ImageCompressionOptions> = {}
  ): Promise<File> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate optimal dimensions
          const { width, height } = this.calculateOptimalDimensions(
            img.width,
            img.height,
            opts.maxWidth,
            opts.maxHeight
          );

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx!.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              // Create new File object
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });

              // Check if compression achieved target size
              if (compressedFile.size <= opts.maxFileSizeKB * 1024) {
                resolve(compressedFile);
              } else {
                // Try with lower quality if still too large
                this.compressWithLowerQuality(canvas, file.name, opts.maxFileSizeKB)
                  .then(resolve)
                  .catch(reject);
              }
            },
            'image/jpeg',
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      // Load image
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Compresses image with progressively lower quality until target size is reached
   */
  private static async compressWithLowerQuality(
    canvas: HTMLCanvasElement,
    fileName: string,
    maxSizeKB: number
  ): Promise<File> {
    const qualities = [0.7, 0.6, 0.5, 0.4, 0.3];

    for (const quality of qualities) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });

      if (blob && blob.size <= maxSizeKB * 1024) {
        return new File([blob], fileName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
      }
    }

    // If still too large, return the lowest quality version
    const finalBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.3);
    });

    if (!finalBlob) {
      throw new Error('Failed to compress image to target size');
    }

    return new File([finalBlob], fileName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  }

  /**
   * Calculates optimal dimensions while maintaining aspect ratio
   */
  private static calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // If image is already within limits, return original dimensions
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    // Calculate scaling factor to fit within max dimensions
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const scalingFactor = Math.min(widthRatio, heightRatio);

    return {
      width: Math.round(originalWidth * scalingFactor),
      height: Math.round(originalHeight * scalingFactor)
    };
  }

  /**
   * Checks if image needs compression
   */
  static needsCompression(
    file: File,
    options: Partial<ImageCompressionOptions> = {}
  ): boolean {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Check file size
    if (file.size > opts.maxFileSizeKB * 1024) {
      return true;
    }

    // For dimension check, we'd need to load the image
    // This is a simplified check based on file size only
    return false;
  }

  /**
   * Gets compression info for display
   */
  static getCompressionInfo(originalFile: File, compressedFile: File) {
    const originalSize = originalFile.size;
    const compressedSize = compressedFile.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    return {
      originalSize: this.formatFileSize(originalSize),
      compressedSize: this.formatFileSize(compressedSize),
      compressionRatio: Math.round(compressionRatio),
      spaceSaved: this.formatFileSize(originalSize - compressedSize)
    };
  }

  /**
   * Formats file size for display
   */
  private static formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Creates a preview of the compressed image
   */
  static createImagePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to create image preview'));
      };
      reader.readAsDataURL(file);
    });
  }
}