import { ref, onValue, set, push, remove, off, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { database, storage, testFirebaseStorage, checkFirebaseProject } from "./firebase";
import type { BusinessCard } from '../types';

// Helper function to convert base64 to File
const base64ToFile = (base64Data: string, mimeType: string, fileName: string): File => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], fileName, { type: mimeType });
};

// Helper function to generate unique filename
const generateFileName = (contactId: string, mimeType: string): string => {
  const timestamp = Date.now();
  const extension = mimeType.split('/')[1] || 'jpg';
  return `${contactId}_${timestamp}.${extension}`;
};

// Helper function to upload image to Firebase Storage with retry
const uploadImageToStorage = async (
  file: File, 
  fileName: string,
  maxRetries: number = 3
): Promise<string> => {
  console.log('📤 Uploading image to Firebase Storage...', { fileName, size: file.size });
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const imageRef = storageRef(storage, `business-cards/${fileName}`);
      console.log(`🔄 Upload attempt ${attempt}/${maxRetries} to:`, imageRef.fullPath);
      
      // Upload file
      const snapshot = await uploadBytes(imageRef, file);
      console.log('✅ Image uploaded successfully, metadata:', snapshot.metadata);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('🔗 Download URL obtained:', downloadURL);
      
      return downloadURL;
    } catch (error: any) {
      console.error(`❌ Upload attempt ${attempt} failed:`, error);
      
      if (error.code === 'storage/unauthorized') {
        throw new Error('Storage access denied. Please check Firebase Storage rules.');
      } else if (error.code === 'storage/cors-error') {
        throw new Error('CORS error. Please check Firebase Storage CORS configuration.');
      } else if (attempt === maxRetries) {
        throw new Error(`Failed to upload image after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error('Upload failed after all retry attempts');
};

export const saveCard = async (card: BusinessCard): Promise<void> => {
  try {
    console.log('💾 Saving card...', { card, hasImageData: !!(card as any).originalImageData });

    // Check Firebase project first
    await checkFirebaseProject();

    // Generate card ID if not exists
    const cardId = card.id || push(ref(database, 'cards')).key!;
    card.id = cardId;

    // If image data is provided, upload it first
    if ((card as any).originalImageData && (card as any).originalImageMimeType) {
      console.log('📸 Processing image upload...');
      
      try {
        // Test storage connection first
        console.log('🧪 Testing storage connection before upload...');
        const storageWorking = await testFirebaseStorage();
        
        if (!storageWorking) {
          throw new Error('Firebase Storage connection test failed');
        }
        
        // Convert base64 to File
        const fileName = generateFileName(cardId, (card as any).originalImageMimeType);
        const imageFile = base64ToFile((card as any).originalImageData, (card as any).originalImageMimeType, fileName);
        
        // Upload image to Firebase Storage
        const imageUrl = await uploadImageToStorage(imageFile, fileName);
        
        // Update card with image information
        (card as any).imageUrl = imageUrl;
        (card as any).imageFileName = fileName;
        
        console.log('✅ Image uploaded successfully:', imageUrl);
      } catch (uploadError: any) {
        console.warn("⚠️ Image upload failed:", uploadError);
        
        // Show user-friendly error message
        if (uploadError.message.includes('CORS')) {
          console.error('🌐 CORS Error: Please check Firebase Storage configuration');
        } else if (uploadError.message.includes('unauthorized')) {
          console.error('🔒 Authorization Error: Please check Firebase Storage rules');
        }
        
        // Continue saving card without image
        console.log('📝 Continuing to save card without image...');
      }
    }

    // Clean up temporary image data before saving to database
    const cardToSave = { ...card };
    delete (cardToSave as any).originalImageData;
    delete (cardToSave as any).originalImageMimeType;

    // Save card data to Firebase Realtime Database
    console.log('💾 Saving card data to database...');
    const cardRef = ref(database, `cards/${cardId}`);
    await set(cardRef, {
      ...cardToSave,
      updatedAt: Date.now()
    });
    
    console.log('✅ Card saved successfully:', cardId);
  } catch (error: any) {
    console.error("❌ Failed to save card:", error);
    throw error;
  }
};

export const deleteCard = async (cardId: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting card:', cardId);

    // Get card data first to delete associated image
    const cardRef = ref(database, `cards/${cardId}`);
    const snapshot = await get(cardRef);
    const cardData = snapshot.val() as BusinessCard;
    
    // Delete associated image if exists
    if ((cardData as any)?.imageUrl && (cardData as any)?.imageFileName) {
      try {
        console.log('🗑️ Deleting associated image...');
        const imageRef = storageRef(storage, `business-cards/${(cardData as any).imageFileName}`);
        await deleteObject(imageRef);
        console.log('✅ Associated image deleted');
      } catch (imageDeleteError) {
        console.warn("⚠️ Failed to delete associated image:", imageDeleteError);
      }
    }

    // Delete card data
    await remove(cardRef);
    console.log('✅ Card deleted successfully');
  } catch (error) {
    console.error("❌ Failed to delete card:", error);
    throw error;
  }
};

export const listenForCards = (callback: (cards: BusinessCard[]) => void) => {
  console.log('👂 Setting up cards listener...');
  const cardsRef = ref(database, 'cards');
  
  onValue(cardsRef, (snapshot) => {
    const data = snapshot.val();
    const cardList: BusinessCard[] = data ? Object.entries(data).map(([id, card]) => ({
      id,
      ...(card as Omit<BusinessCard, 'id'>),
    })) : [];
    
    console.log('📋 Cards updated:', cardList.length, 'cards');
    callback(cardList.sort((a, b) => b.createdAt - a.createdAt));
  });
  
  return () => {
    console.log('🔇 Removing cards listener');
    off(cardsRef);
  };
};

export const saveCategory = (category: string): Promise<void> => {
  console.log('📂 Saving category:', category);
  const categoriesRef = ref(database, 'categories');
  const newCategoryRef = push(categoriesRef);
  return set(newCategoryRef, category);
};

export const listenForCategories = (callback: (categories: string[]) => void) => {
  console.log('👂 Setting up categories listener...');
  const categoriesRef = ref(database, 'categories');
  
  onValue(categoriesRef, (snapshot) => {
    const data = snapshot.val();
    const categoryList: string[] = data ? Object.values(data) as string[] : [];
    // Ensure default categories are present and remove duplicates
    const defaultCategories = ["IT", "Mechanical", "Electrical", "Machine", "Civil"];
    const combined = [...new Set([...defaultCategories, ...categoryList])];
    callback(combined.sort());
  });
  
  return () => off(categoriesRef);
};

// Export the test function
export { testFirebaseStorage, checkFirebaseProject };

// Alias for backward compatibility
export const saveCardWithImage = saveCard;