import { useState, useEffect } from 'react';
import { OfflineQueueService } from '../services/offlineQueueService';
import type { OfflineImageItem } from '../types';

export interface OfflineQueueStatus {
  totalItems: number;
  pendingItems: number;
  failedItems: number;
  isOnline: boolean;
  isProcessing: boolean;
}

export const useOfflineQueue = () => {
  const [queue, setQueue] = useState<OfflineImageItem[]>([]);
  const [status, setStatus] = useState<OfflineQueueStatus>({
    totalItems: 0,
    pendingItems: 0,
    failedItems: 0,
    isOnline: navigator.onLine,
    isProcessing: false
  });

  useEffect(() => {
    // Initialize offline queue service
    OfflineQueueService.initialize();

    // Listen for queue changes
    const unsubscribe = OfflineQueueService.addListener((newQueue) => {
      setQueue(newQueue);
      
      const queueStatus = OfflineQueueService.getQueueStatus();
      setStatus(prev => ({
        ...prev,
        ...queueStatus
      }));
    });

    // Listen for network status changes
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status update
    const initialStatus = OfflineQueueService.getQueueStatus();
    setStatus(prev => ({
      ...prev,
      ...initialStatus,
      isOnline: navigator.onLine
    }));

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processQueue = async () => {
    setStatus(prev => ({ ...prev, isProcessing: true }));
    try {
      await OfflineQueueService.processQueue();
    } finally {
      setStatus(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const clearFailedItems = () => {
    OfflineQueueService.clearFailedItems();
  };

  const retryFailedItems = () => {
    OfflineQueueService.retryFailedItems();
  };

  const queueImageForUpload = async (contactId: string, file: File, priority: number = 1) => {
    return await OfflineQueueService.queueImageForUpload(contactId, file, priority);
  };

  return {
    queue,
    status,
    processQueue,
    clearFailedItems,
    retryFailedItems,
    queueImageForUpload
  };
};