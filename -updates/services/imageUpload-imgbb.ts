// Alternative image upload using ImgBB (free service, no CORS issues)
export class ImgBBUploader {
  // Free ImgBB API key (you can get your own at https://api.imgbb.com/)
  private static readonly API_KEY = "your-imgbb-api-key"; // Replace with actual key
  private static readonly UPLOAD_URL = "https://api.imgbb.com/1/upload";

  /**
   * Upload image to ImgBB (no CORS issues)
   */
  static async uploadImage(file: File, name?: string): Promise<string> {
    try {
      console.log('📤 Uploading image to ImgBB...', { fileName: file.name });

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      const base64Content = base64Data.split(',')[1]; // Remove data:image/jpeg;base64, prefix

      // Create form data
      const formData = new FormData();
      formData.append('key', this.API_KEY);
      formData.append('image', base64Content);
      if (name) {
        formData.append('name', name);
      }

      // Upload to ImgBB
      const response = await fetch(this.UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`ImgBB upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`ImgBB upload failed: ${result.error?.message || 'Unknown error'}`);
      }

      console.log('✅ ImgBB upload successful:', result.data.url);
      return result.data.url;

    } catch (error) {
      console.error('❌ ImgBB upload failed:', error);
      throw error;
    }
  }

  /**
   * Test ImgBB connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing ImgBB connection...');

      // Create a test image (1x1 pixel PNG)
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(0, 0, 1, 1);
      }

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      const testFile = new File([blob], 'test.png', { type: 'image/png' });

      // Upload test image
      const imageUrl = await this.uploadImage(testFile, 'connection-test');
      console.log('✅ ImgBB test upload successful:', imageUrl);

      // Verify image exists
      const verifyResponse = await fetch(imageUrl);
      if (verifyResponse.ok) {
        console.log('✅ ImgBB test image verification successful');
      }

      console.log('✅ ImgBB connection test passed');
      return true;
    } catch (error) {
      console.error('❌ ImgBB connection test failed:', error);
      return false;
    }
  }

  /**
   * Convert File to base64
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// For demo purposes, let's create a simple base64 storage solution
export class Base64ImageStorage {
  /**
   * "Upload" image by converting to base64 and storing in localStorage
   * This is just for demo - not recommended for production
   */
  static async uploadImage(file: File, contactId: string): Promise<string> {
    try {
      console.log('📤 Converting image to base64 for local storage...', { fileName: file.name });

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Generate unique key
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'jpg';
      const key = `business-card-${contactId}-${timestamp}.${extension}`;
      
      // Store in localStorage (for demo only)
      localStorage.setItem(key, base64Data);
      
      console.log('✅ Image stored as base64:', key);
      
      // Return the base64 data URL
      return base64Data;
    } catch (error) {
      console.error('❌ Base64 storage failed:', error);
      throw error;
    }
  }

  /**
   * Test base64 storage
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing base64 storage...');

      // Create a test image
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#007bff';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText('TEST', 30, 55);
      }

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      const testFile = new File([blob], 'test.png', { type: 'image/png' });

      // "Upload" test image
      const imageUrl = await this.uploadImage(testFile, 'test-contact');
      console.log('✅ Base64 storage test successful');

      // Clean up
      const key = Object.keys(localStorage).find(k => k.includes('test-contact'));
      if (key) {
        localStorage.removeItem(key);
        console.log('✅ Test data cleaned up');
      }

      return true;
    } catch (error) {
      console.error('❌ Base64 storage test failed:', error);
      return false;
    }
  }

  /**
   * Convert File to base64
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}