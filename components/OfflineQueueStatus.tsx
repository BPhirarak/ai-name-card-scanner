import React from 'react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

interface OfflineQueueStatusProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineQueueStatus: React.FC<OfflineQueueStatusProps> = ({
  className = '',
  showDetails = false
}) => {
  const { status, processQueue, clearFailedItems, retryFailedItems } = useOfflineQueue();

  if (status.totalItems === 0) {
    return null;
  }

  return (
    <div className={`offline-queue-status ${className}`}>
      <div style={{
        padding: '10px',
        backgroundColor: status.isOnline ? '#e8f5e8' : '#fff3cd',
        border: `1px solid ${status.isOnline ? '#28a745' : '#ffc107'}`,
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ marginRight: '10px' }}>
              {status.isOnline ? '🟢' : '🔴'} 
              {status.isOnline ? 'Online' : 'Offline'}
            </span>
            
            {status.pendingItems > 0 && (
              <span style={{ 
                backgroundColor: '#007bff', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '12px', 
                fontSize: '12px',
                marginRight: '5px'
              }}>
                {status.pendingItems} pending
              </span>
            )}
            
            {status.failedItems > 0 && (
              <span style={{ 
                backgroundColor: '#dc3545', 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '12px', 
                fontSize: '12px'
              }}>
                {status.failedItems} failed
              </span>
            )}
          </div>

          <div>
            {status.isOnline && status.pendingItems > 0 && (
              <button
                onClick={processQueue}
                disabled={status.isProcessing}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: status.isProcessing ? 'not-allowed' : 'pointer',
                  marginRight: '5px'
                }}
              >
                {status.isProcessing ? '⏳ Processing...' : '🔄 Upload Now'}
              </button>
            )}

            {status.failedItems > 0 && (
              <>
                <button
                  onClick={retryFailedItems}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginRight: '5px'
                  }}
                >
                  🔄 Retry Failed
                </button>
                <button
                  onClick={clearFailedItems}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Clear Failed
                </button>
              </>
            )}
          </div>
        </div>

        {showDetails && status.totalItems > 0 && (
          <div style={{ 
            marginTop: '10px', 
            fontSize: '12px', 
            color: '#666',
            borderTop: '1px solid #eee',
            paddingTop: '10px'
          }}>
            <div>Total queued items: {status.totalItems}</div>
            <div>Pending uploads: {status.pendingItems}</div>
            <div>Failed uploads: {status.failedItems}</div>
            {!status.isOnline && (
              <div style={{ color: '#856404', marginTop: '5px' }}>
                📡 Images will be uploaded automatically when connection is restored
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};