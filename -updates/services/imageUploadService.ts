import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";
import type { BusinessCard, UploadProgress } from "../types";

export class ImageUploadService {
  private static readonly STORAGE_PATH = "business-cards";
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/webp", "image/bmp"];

  /**
   * Uploads an image file to Firebase Storage
   */
  static async uploadImage(
    file: File,
    contactId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    console.log('🔄 Starting image upload...', { fileName: file.name, size: file.size, contactId });
    
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const fileName = this.generateFileName(file, contactId);
    const storageRef = ref(storage, `${this.STORAGE_PATH}/${fileName}`);
    
    console.log('📁 Storage path:', `${this.STORAGE_PATH}/${fileName}`);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Progress callback
          const progress: UploadProgress = {
            loaded: snapshot.bytesTransferred,
            total: snapshot.totalBytes,
            percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          };
          
          console.log(`📊 Upload progress: ${progress.percentage}%`);
          
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          // Error callback
          console.error("❌ Upload failed:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          // Success callback
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('✅ Upload successful! Download URL:', downloadURL);
            resolve(downloadURL);
          } catch (error) {
            console.error("❌ Failed to get download URL:", error);
            reject(new Error(`Failed to get download URL: ${error}`));
          }
        }
      );
    });
  }

  /**
   * Uploads image with automatic retry mechanism
   */
  static async uploadImageWithRetry(
    file: File,
    contactId: string,
    maxRetries: number = 3,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Upload attempt ${attempt}/${maxRetries}`);
        return await this.uploadImage(file, contactId, onProgress);
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Upload attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Upload failed after ${maxRetries} attempts. Last error: ${lastError!.message}`);
  }

  /**
   * Deletes an image from Firebase Storage
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      console.log('🗑️ Deleting image:', imageUrl);
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
      console.log('✅ Image deleted successfully');
    } catch (error) {
      console.error("❌ Failed to delete image:", error);
      throw new Error(`Failed to delete image: ${error}`);
    }
  }

  /**
   * Updates business card with image information
   */
  static updateBusinessCardWithImage(
    card: BusinessCard,
    imageUrl: string,
    fileName: string
  ): BusinessCard {
    console.log('📝 Updating business card with image info:', { imageUrl, fileName });
    return {
      ...card,
      imageUrl,
      imageFileName: fileName,
      localImagePath: undefined // Clear local path since it's now in cloud
    };
  }

  /**
   * Validates uploaded file
   */
  private static validateFile(file: File): void {
    console.log('🔍 Validating file:', { name: file.name, size: file.size, type: file.type });
    
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      throw new Error(`Unsupported file format. Supported formats: ${this.SUPPORTED_FORMATS.join(", ")}`);
    }
    
    console.log('✅ File validation passed');
  }

  /**
   * Generates unique filename for storage
   */
  static generateFileName(file: File, contactId: string): string {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${contactId}_${timestamp}.${extension}`;
    console.log('📝 Generated filename:', fileName);
    return fileName;
  }

  /**
   * Checks if file needs compression based on size
   */
  static needsCompression(file: File, maxSizeKB: number = 500): boolean {
    const needs = file.size > maxSizeKB * 1024;
    console.log('🗜️ Needs compression:', needs, `(${file.size} bytes > ${maxSizeKB * 1024} bytes)`);
    return needs;
  }

  /**
   * Gets file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Test Firebase Storage connection
   */
  static async testStorageConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Firebase Storage connection...');
      
      // Create a test file
      const testData = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testData], 'test.txt', { type: 'text/plain' });
      
      // Try to upload and delete
      const testRef = ref(storage, 'test/connection-test.txt');
      const uploadTask = uploadBytesResumable(testRef, testFile);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, resolve);
      });
      
      // Clean up test file
      await deleteObject(testRef);
      
      console.log('✅ Firebase Storage connection test passed');
      return true;
    } catch (error) {
      console.error('❌ Firebase Storage connection test failed:', error);
      return false;
    }
  }
}