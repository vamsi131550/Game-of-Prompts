import { describe, it, expect, vi } from 'vitest';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

describe('firestoreErrorHandler', () => {
  it('should format and throw a structured error', () => {
    const mockError = new Error('Permission denied');
    const operation = OperationType.GET;
    const path = 'test-collection';

    expect(() => handleFirestoreError(mockError, operation, path)).toThrow();

    try {
      handleFirestoreError(mockError, operation, path);
    } catch (err: any) {
      const errorInfo = JSON.parse(err.message);
      expect(errorInfo.error).toBe('Permission denied');
      expect(errorInfo.operationType).toBe(operation);
      expect(errorInfo.path).toBe(path);
    }
  });
});
