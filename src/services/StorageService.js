// StorageService.js - Central service that uses the modular implementation

import { StorageService as ModularStorageService } from './storage';

/**
 * Storage Service
 * Provides data storage and retrieval with fallback to localStorage when backend is unavailable
 * Now uses a modular implementation for better maintainability
 */
export class StorageService extends ModularStorageService {
  constructor(namespace = 'kids-ai') {
    super(namespace);
    console.log('Using modular StorageService implementation');
  }
}
