import { describe, it, expect } from 'vitest';
import {
  detectConflict,
  resolveConflict,
  mergeVersions,
  createConflictInfo,
  getConflictDiff,
} from './conflictResolution';

describe('Conflict Resolution', () => {
  describe('detectConflict', () => {
    it('should detect conflict when server is newer and data differs', () => {
      const localVersion = { id: '1', name: 'Local Name', status: 'active' };
      const serverVersion = { id: '1', name: 'Server Name', status: 'active' };
      const localTimestamp = 1000;
      const serverTimestamp = 2000;

      const hasConflict = detectConflict(
        localVersion,
        serverVersion,
        localTimestamp,
        serverTimestamp
      );

      expect(hasConflict).toBe(true);
    });

    it('should not detect conflict when data is identical', () => {
      const localVersion = { id: '1', name: 'Same Name', status: 'active' };
      const serverVersion = { id: '1', name: 'Same Name', status: 'active' };
      const localTimestamp = 1000;
      const serverTimestamp = 2000;

      const hasConflict = detectConflict(
        localVersion,
        serverVersion,
        localTimestamp,
        serverTimestamp
      );

      expect(hasConflict).toBe(false);
    });

    it('should not detect conflict when timestamps match', () => {
      const localVersion = { id: '1', name: 'Local', status: 'active' };
      const serverVersion = { id: '1', name: 'Server', status: 'active' };
      const timestamp = 1000;

      const hasConflict = detectConflict(
        localVersion,
        serverVersion,
        timestamp,
        timestamp
      );

      expect(hasConflict).toBe(false);
    });
  });

  describe('resolveConflict', () => {
    const conflict = createConflictInfo(
      'projects',
      '1',
      { id: '1', name: 'Local' },
      { id: '1', name: 'Server' },
      1000,
      2000
    );

    it('should use last-write-wins by default (server newer)', async () => {
      const resolved = await resolveConflict(conflict, 'last-write-wins');
      expect(resolved.name).toBe('Server');
    });

    it('should respect server-wins strategy', async () => {
      const resolved = await resolveConflict(conflict, 'server-wins');
      expect(resolved.name).toBe('Server');
    });

    it('should respect local-wins strategy', async () => {
      const resolved = await resolveConflict(conflict, 'local-wins');
      expect(resolved.name).toBe('Local');
    });

    it('should throw error for manual resolution', async () => {
      await expect(
        resolveConflict(conflict, 'manual')
      ).rejects.toThrow('Manual resolution required');
    });
  });

  describe('mergeVersions', () => {
    it('should merge with local precedence for non-null values', () => {
      const local = { id: '1', name: 'Local Name', description: 'Local Desc', status: null };
      const server = { id: '1', name: 'Server Name', description: null, status: 'active' };

      const merged = mergeVersions(local, server);

      expect(merged.name).toBe('Local Name');
      expect(merged.description).toBe('Local Desc');
      expect(merged.status).toBe('active'); // Server value used when local is null
    });

    it('should respect localPrecedence fields', () => {
      const local = { id: '1', name: 'Local', priority: 'high' };
      const server = { id: '1', name: 'Server', priority: 'low' };

      const merged = mergeVersions(local, server, {
        localPrecedence: ['priority'],
      });

      expect(merged.priority).toBe('high');
    });

    it('should respect serverPrecedence fields', () => {
      const local = { id: '1', status: 'draft', approved_by: 'user1' };
      const server = { id: '1', status: 'approved', approved_by: 'admin' };

      const merged = mergeVersions(local, server, {
        serverPrecedence: ['status', 'approved_by'],
      });

      expect(merged.status).toBe('approved');
      expect(merged.approved_by).toBe('admin');
    });
  });

  describe('getConflictDiff', () => {
    it('should return fields that differ', () => {
      const local = { id: '1', name: 'Local', status: 'active', count: 5 };
      const server = { id: '1', name: 'Server', status: 'active', count: 10 };

      const diff = getConflictDiff(local, server);

      expect(diff).toHaveLength(2);
      expect(diff.find(d => d.field === 'name')).toBeDefined();
      expect(diff.find(d => d.field === 'count')).toBeDefined();
      expect(diff.find(d => d.field === 'status')).toBeUndefined(); // Same value
    });

    it('should handle nested objects', () => {
      const local = { id: '1', metadata: { tags: ['a', 'b'] } };
      const server = { id: '1', metadata: { tags: ['a', 'c'] } };

      const diff = getConflictDiff(local, server);

      expect(diff).toHaveLength(1);
      expect(diff[0].field).toBe('metadata');
    });
  });

  describe('createConflictInfo', () => {
    it('should create valid conflict info', () => {
      const conflict = createConflictInfo(
        'projects',
        '123',
        { name: 'Local' },
        { name: 'Server' },
        1000,
        2000
      );

      expect(conflict.id).toBeTruthy();
      expect(conflict.entityType).toBe('projects');
      expect(conflict.entityId).toBe('123');
      expect(conflict.localVersion).toEqual({ name: 'Local' });
      expect(conflict.serverVersion).toEqual({ name: 'Server' });
      expect(conflict.resolved).toBe(false);
      expect(conflict.detectedAt).toBeGreaterThan(0);
    });
  });
});
