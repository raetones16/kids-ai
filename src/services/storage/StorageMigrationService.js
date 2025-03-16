import { MigrationApi } from '../ApiService';
import { BaseStorageService } from './BaseStorageService';

/**
 * Storage Migration Service
 * Handles data migration between localStorage and backend
 */
export class StorageMigrationService extends BaseStorageService {
  constructor(namespace = 'kids-ai') {
    super(namespace);
  }
  
  // Migrate data from localStorage to backend
  async migrateToBackend() {
    try {
      await this.backendAvailabilityPromise;
      
      if (!this.isBackendAvailable) {
        console.warn('Cannot migrate data: Backend is not available');
        return false;
      }
      
      // Get all data from localStorage
      const profiles = JSON.parse(localStorage.getItem(`${this.namespace}.profiles`) || '[]');
      const conversations = JSON.parse(localStorage.getItem(`${this.namespace}.conversations`) || '[]');
      const settings = JSON.parse(localStorage.getItem(`${this.namespace}.settings`) || '{}');
      
      // Send to backend
      const result = await MigrationApi.importLocalStorageData({
        profiles,
        conversations,
        settings
      });
      
      console.log('Migration result:', result);
      return result.success;
    } catch (error) {
      console.error('Migration error:', error);
      return false;
    }
  }
}