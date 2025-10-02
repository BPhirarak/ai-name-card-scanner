import { ref, onValue, set, push, remove, off, get } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { database, storage } from "./firebase";
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

// Helper function to upload image to Firebase Storage
const uploadImageToStorage = async (
  file: File, 
  fileName: string
): Promise<string> => {
  console.log('📤 Uploading image to Firebase Storage...', { fileName, size: file.size });
  
  const imageRef = storageRef(storage, `business-cards/${fileName}`);
  
  try {
    // Upload file
    const snapshot = await uploadBytes(imageRef, file);
    console.log('✅ Image uploaded successfully');
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('🔗 Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Failed to upload image:', error);
    throw new Error(`Failed to upload image: ${error}`);
  }
};

export const saveCard = async (card: BusinessCard): Promise<void> => {
  try {
    console.log('💾 Saving card...', { card, hasImageData: !!(card as any).originalImageData });

    // Generate card ID if not exists
    const cardId = card.id || push(ref(database, 'cards')).key!;
    card.id = cardId;

    // If image data is provided, upload it first
    if ((card as any).originalImageData && (card as any).originalImageMimeType) {
      console.log('📸 Processing image upload...');
      
      try {
        // Convert base64 to File
        const fileName = generateFileName(cardId, (card as any).originalImageMimeType);
        const imageFile = base64ToFile((card as any).originalImageData, (card as any).originalImageMimeType, fileName);
        
        // Upload image to Firebase Storage
        const imageUrl = await uploadImageToStorage(imageFile, fileName);
        
        // Update card with image information
        (card as any).imageUrl = imageUrl;
        (card as any).imageFileName = fileName;
        
        console.log('✅ Image uploaded successfully:', imageUrl);
      } catch (uploadError) {
        console.warn("⚠️ Image upload failed:", uploadError);
        // Continue saving card without image
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
  } catch (error) {
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

// Debug function to test Firebase Storage
export const testFirebaseStorage = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Firebase Storage...');
    
    // Create a test file
    const testData = new Blob(['test'], { type: 'text/plain' });
    const testFile = new File([testData], 'test.txt', { type: 'text/plain' });
    
    // Try to upload and delete
    const testRef = storageRef(storage, 'test/connection-test.txt');
    await uploadBytes(testRef, testFile);
    
    // Get download URL to verify upload
    const downloadURL = await getDownloadURL(testRef);
    console.log('✅ Test file uploaded:', downloadURL);
    
    // Clean up test file
    await deleteObject(testRef);
    
    console.log('✅ Firebase Storage test passed');
    return true;
  } catch (error) {
    console.error('❌ Firebase Storage test failed:', error);
    return false;
  }
};