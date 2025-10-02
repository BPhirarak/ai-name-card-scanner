import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDMJxaCa9biRxQN7TIsg-XQwtcdyzgHOks",
  authDomain: "namecardreader-7a7d3.firebaseapp.com",
  databaseURL: "https://namecardreader-7a7d3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "namecardreader-7a7d3",
  storageBucket: "namecardreader-7a7d3.appspot.com",
  messagingSenderId: "1036193513751",
  appId: "1:1036193513751:web:06ad5a18d049955e6a3752"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const database = getDatabase(app);

// Base64 Image Storage Class
class Base64ImageStorage {
  /**
   * Store image as base64 in Firebase Realtime Database
   */
  static async uploadImage(file: File, contactId: string): Promise<string> {
    try {
      console.log('📤 Converting image to base64 for database storage...', { fileName: file.name });

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Generate unique key (replace dots and invalid characters)
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'jpg';
      // Replace dots with underscores for Firebase path compatibility
      const imageKey = `${contactId}_${timestamp}_${extension}`;
      
      console.log('🔑 Generated image key:', imageKey);
      
      // Store in Firebase Realtime Database under 'images' node
      const { ref, set } = await import("firebase/database");
      const imageRef = ref(database, `images/${imageKey}`);
      
      await set(imageRef, {
        data: base64Data,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        contactId: contactId,
        uploadedAt: timestamp,
        originalExtension: extension
      });
      
      console.log('✅ Image stored in database:', imageKey);
      
      // Return a reference to the stored image
      return `db-image:${imageKey}`;
    } catch (error) {
      console.error('❌ Database image storage failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve image from Firebase Realtime Database
   */
  static async getImage(imageKey: string): Promise<string | null> {
    try {
      if (!imageKey.startsWith('db-image:')) {
        return imageKey; // Return as-is if not a database image
      }

      const actualKey = imageKey.replace('db-image:', '');
      console.log('🔍 Retrieving image with key:', actualKey);
      
      const { ref, get } = await import("firebase/database");
      const imageRef = ref(database, `images/${actualKey}`);
      const snapshot = await get(imageRef);
      
      if (snapshot.exists()) {
        const imageData = snapshot.val();
        console.log('✅ Image retrieved successfully');
        return imageData.data; // Return base64 data
      }
      
      console.warn('⚠️ Image not found in database:', actualKey);
      return null;
    } catch (error) {
      console.error('❌ Failed to retrieve image from database:', error);
      return null;
    }
  }

  /**
   * Delete image from Firebase Realtime Database
   */
  static async deleteImage(imageKey: string): Promise<void> {
    try {
      if (!imageKey.startsWith('db-image:')) {
        return; // Not a database image
      }

      const actualKey = imageKey.replace('db-image:', '');
      console.log('🗑️ Deleting image with key:', actualKey);
      
      const { ref, remove } = await import("firebase/database");
      const imageRef = ref(database, `images/${actualKey}`);
      await remove(imageRef);
      
      console.log('✅ Image deleted from database:', actualKey);
    } catch (error) {
      console.error('❌ Failed to delete image from database:', error);
      throw error;
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

  /**
   * Sanitize filename for Firebase path
   */
  private static sanitizeFilename(filename: string): string {
    // Replace invalid characters with underscores
    return filename.replace(/[.#$[\]]/g, '_');
  }
}

/**
 * Test database image storage
 */
export const testFirebaseStorage = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing database image storage...');

    // Create a test image
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#28a745';
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

    // Upload test image
    console.log('⬆️ Uploading test image...');
    const imageKey = await Base64ImageStorage.uploadImage(testFile, 'test-contact');
    console.log('✅ Test image uploaded:', imageKey);

    // Retrieve test image
    console.log('⬇️ Retrieving test image...');
    const retrievedData = await Base64ImageStorage.getImage(imageKey);
    if (retrievedData) {
      console.log('✅ Test image retrieved successfully');
    } else {
      throw new Error('Failed to retrieve test image');
    }

    // Clean up test image
    console.log('🧹 Cleaning up test image...');
    await Base64ImageStorage.deleteImage(imageKey);
    console.log('✅ Test image cleaned up');

    console.log('✅ Database image storage test passed');
    return true;
  } catch (error) {
    console.error('❌ Database image storage test failed:', error);
    return false;
  }
};

// Export the storage class
export { Base64ImageStorage };