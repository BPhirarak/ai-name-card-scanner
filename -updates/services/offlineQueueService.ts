import type { OfflineImageItem } from "../types";
import { ImageUploadService } from "./imageUploadService";
import { ImageCompressionService } from "./imageCompressionService";

export class OfflineQueueService {
  private static readonly STORAGE_KEY = "offline_image_queue";
  private static readonly PROCESSING_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CONCURRENT_UPLOADS = 3;
  
  private static queue: OfflineImageItem[] = [];
  private static isProcessing = false;
  private static processingTimer: NodeJS.Timeout | null = null;
  private static listeners: Array<(queue: OfflineImageItem[]) => void> = [];

  /**
   * Initializes the offline queue service
   */
  static initialize(): void {
    this.loadQueue();
    this.startProcessingTimer();
    this.setupNetworkListener();
  }

  /**
   * Adds an image to the offline upload queue
   */
  static async queueImageForUpload(
    contactId: string,
    file: File,
    priority: number = 1
  ): Promise<boolean> {
    try {
      // Check if already queued
      const existingItem = this.queue.find(
        item => item.contactId === contactId && item.fileName === file.name
      );

      if (existingItem) {
        // Update priority if higher
        if (priority > existingItem.priority) {
          existingItem.priority = priority;
          this.saveQueue();
        }
        return true;
      }

      // Create new queue item
      const queueItem: OfflineImageItem = {
        id: this.generateId(),
        contactId,
        localImagePath: file.name, // In web, we'll store the file reference differently
        fileName: ImageUploadService.generateFileName(file, contactId),
        queuedAt: Date.now(),
        attemptCount: 0,
        priority,
        shouldRetry: true,
        maxRetries: 5,
        fileSizeBytes: file.size
      };

      // Store file in IndexedDB for offline access
      await this.storeFileOffline(queueItem.id, file);

      this.queue.push(queueItem);
      this.saveQueue();
      this.notifyListeners();

      console.log(`Image queued for upload: ${contactId}`);
      return true;
    } catch (error) {
      console.error("Failed to queue image for upload:", error);
      return false;
    }
  }

  /**
   * Processes the upload queue
   */
  static async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    try {
      this.isProcessing = true;

      const itemsToProcess = this.queue
        .filter(item => item.shouldRetry && this.isReadyForRetry(item))
        .sort((a, b) => b.priority - a.priority || a.queuedAt - b.queuedAt)
        .slice(0, this.MAX_CONCURRENT_UPLOADS);

      if (itemsToProcess.length === 0) {
        return;
      }

      console.log(`Processing ${itemsToProcess.length} queued images...`);

      // Process items concurrently
      const uploadPromises = itemsToProcess.map(item => this.processQueueItem(item));
      await Promise.allSettled(uploadPromises);

      // Remove successfully uploaded items and failed items that exceeded max retries
      this.queue = this.queue.filter(item => 
        item.shouldRetry && !this.hasExceededMaxRetries(item)
      );

      this.saveQueue();
      this.notifyListeners();

      const remainingCount = this.queue.filter(item => item.shouldRetry).length;
      if (remainingCount === 0) {
        console.log("All queued images uploaded successfully!");
      } else {
        console.log(`${remainingCount} images remaining in upload queue`);
      }
    } catch (error) {
      console.error("Failed to process upload queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Gets the current queue status
   */
  static getQueueStatus(): {
    totalItems: number;
    pendingItems: number;
    failedItems: number;
  } {
    const totalItems = this.queue.length;
    const pendingItems = this.queue.filter(
      item => item.shouldRetry && !this.hasExceededMaxRetries(item)
    ).length;
    const failedItems = this.queue.filter(item => this.hasExceededMaxRetries(item)).length;

    return { totalItems, pendingItems, failedItems };
  }

  /**
   * Clears failed items from the queue
   */
  static clearFailedItems(): void {
    const failedItems = this.queue.filter(item => this.hasExceededMaxRetries(item));
    
    // Clean up stored files
    failedItems.forEach(item => {
      this.removeStoredFile(item.id).catch(console.error);
    });

    this.queue = this.queue.filter(item => !this.hasExceededMaxRetries(item));
    this.saveQueue();
    this.notifyListeners();

    console.log(`Cleared ${failedItems.length} failed items from queue`);
  }

  /**
   * Retries all failed items
   */
  static retryFailedItems(): void {
    const failedItems = this.queue.filter(item => this.hasExceededMaxRetries(item));
    
    failedItems.forEach(item => {
      item.attemptCount = 0;
      item.shouldRetry = true;
      item.lastAttemptAt = undefined;
      item.lastError = undefined;
    });

    this.saveQueue();
    this.notifyListeners();

    console.log(`Reset ${failedItems.length} failed items for retry`);
  }

  /**
   * Adds a listener for queue changes
   */
  static addListener(callback: (queue: OfflineImageItem[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Processes a single queue item
   */
  private static async processQueueItem(item: OfflineImageItem): Promise<void> {
    try {
      // Retrieve stored file
      const file = await this.getStoredFile(item.id);
      if (!file) {
        item.shouldRetry = false;
        item.lastError = "Stored file no longer exists";
        return;
      }

      // Compress image if needed
      let fileToUpload = file;
      if (ImageCompressionService.needsCompression(file)) {
        fileToUpload = await ImageCompressionService.compressImage(file);
      }

      // Upload to Firebase
      const imageUrl = await ImageUploadService.uploadImageWithRetry(
        fileToUpload,
        item.contactId,
        2 // Reduced retries since we have queue-level retry
      );

      // Mark as successfully uploaded
      item.shouldRetry = false;
      item.lastError = undefined;

      // Clean up stored file
      await this.removeStoredFile(item.id);

      console.log(`Successfully uploaded queued image for contact ${item.contactId}`);
    } catch (error) {
      this.recordFailedAttempt(item, (error as Error).message);
      console.error(`Failed to upload queued image for contact ${item.contactId}:`, error);
    }
  }

  /**
   * Records a failed upload attempt
   */
  private static recordFailedAttempt(item: OfflineImageItem, errorMessage: string): void {
    item.attemptCount++;
    item.lastAttemptAt = Date.now();
    item.lastError = errorMessage;

    // Stop retrying after max attempts
    if (this.hasExceededMaxRetries(item)) {
      item.shouldRetry = false;
    }
  }

  /**
   * Checks if item has exceeded maximum retry attempts
   */
  private static hasExceededMaxRetries(item: OfflineImageItem): boolean {
    return item.attemptCount >= item.maxRetries;
  }

  /**
   * Checks if item is ready for retry
   */
  private static isReadyForRetry(item: OfflineImageItem): boolean {
    if (!item.shouldRetry || this.hasExceededMaxRetries(item)) {
      return false;
    }

    if (!item.lastAttemptAt) {
      return true;
    }

    // Exponential backoff: 1min, 2min, 4min, 8min, 16min
    const delayMinutes = Math.pow(2, item.attemptCount);
    const maxDelayMinutes = 60; // Max 1 hour delay
    const delayMs = Math.min(delayMinutes, maxDelayMinutes) * 60 * 1000;
    const nextRetryTime = item.lastAttemptAt + delayMs;

    return Date.now() >= nextRetryTime;
  }

  /**
   * Stores file in IndexedDB for offline access
   */
  private static async storeFileOffline(id: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("OfflineImageStore", 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["files"], "readwrite");
        const store = transaction.objectStore("files");
        
        store.put({ id, file });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
      };
    });
  }

  /**
   * Retrieves stored file from IndexedDB
   */
  private static async getStoredFile(id: string): Promise<File | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("OfflineImageStore", 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["files"], "readonly");
        const store = transaction.objectStore("files");
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          resolve(getRequest.result?.file || null);
        };

        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  /**
   * Removes stored file from IndexedDB
   */
  private static async removeStoredFile(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("OfflineImageStore", 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["files"], "readwrite");
        const store = transaction.objectStore("files");
        
        store.delete(id);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  /**
   * Loads queue from localStorage
   */
  private static loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load offline queue:", error);
      this.queue = [];
    }
  }

  /**
   * Saves queue to localStorage
   */
  private static saveQueue(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error("Failed to save offline queue:", error);
    }
  }

  /**
   * Starts the processing timer
   */
  private static startProcessingTimer(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }

    this.processingTimer = setInterval(() => {
      this.processQueue();
    }, this.PROCESSING_INTERVAL);
  }

  /**
   * Sets up network status listener
   */
  private static setupNetworkListener(): void {
    window.addEventListener('online', () => {
      console.log('Connection restored! Processing queued uploads...');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost. Images will be queued for upload when connection is restored.');
    });
  }

  /**
   * Notifies all listeners of queue changes
   */
  private static notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback([...this.queue]);
      } catch (error) {
        console.error("Error in queue listener:", error);
      }
    });
  }

  /**
   * Generates unique ID
   */
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}