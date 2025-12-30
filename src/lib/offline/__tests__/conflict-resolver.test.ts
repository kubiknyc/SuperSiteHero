/**
 * Conflict Resolver Test Suite
 * Tests conflict detection and resolution strategies
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConflictResolver } from '../conflict-resolver';
import type { ConflictMetadata } from '../conflict-resolver';

describe('ConflictResolver', () => {
  beforeEach(() => {
    ConflictResolver.clearHistory();
  });

  describe('Field Diff Detection', () => {
    it('should detect modified fields', () => {
      const localData = {
        id: '123',
        name: 'Project A (Local)',
        status: 'active',
      };

      const serverData = {
        id: '123',
        name: 'Project A (Server)',
        status: 'active',
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].field).toBe('name');
      expect(diffs[0].type).toBe('modified');
      expect(diffs[0].localValue).toBe('Project A (Local)');
      expect(diffs[0].serverValue).toBe('Project A (Server)');
    });

    it('should detect added fields', () => {
      const localData = {
        id: '123',
        name: 'Project A',
        newField: 'New value',
      };

      const serverData = {
        id: '123',
        name: 'Project A',
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);

      const addedDiff = diffs.find(d => d.field === 'newField');
      expect(addedDiff).toBeDefined();
      expect(addedDiff?.type).toBe('added');
    });

    it('should detect removed fields', () => {
      const localData = {
        id: '123',
        name: 'Project A',
      };

      const serverData = {
        id: '123',
        name: 'Project A',
        removedField: 'Old value',
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);

      const removedDiff = diffs.find(d => d.field === 'removedField');
      expect(removedDiff).toBeDefined();
      expect(removedDiff?.type).toBe('removed');
    });

    it('should not detect diffs for identical values', () => {
      const localData = {
        id: '123',
        name: 'Project A',
        status: 'active',
        budget: 100000,
      };

      const serverData = {
        id: '123',
        name: 'Project A',
        status: 'active',
        budget: 100000,
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);

      expect(diffs).toHaveLength(0);
    });

    it('should handle nested objects', () => {
      const localData = {
        id: '123',
        metadata: { version: 1, tags: ['a', 'b'] },
      };

      const serverData = {
        id: '123',
        metadata: { version: 2, tags: ['a', 'c'] },
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);

      const metadataDiff = diffs.find(d => d.field === 'metadata');
      expect(metadataDiff).toBeDefined();
      expect(metadataDiff?.type).toBe('modified');
    });

    it('should mark server-priority fields as auto-mergeable', () => {
      const localData = {
        id: '123',
        company_id: 'local-company',
        name: 'Project A',
      };

      const serverData = {
        id: '456', // Different ID
        company_id: 'server-company',
        name: 'Project A',
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);

      const idDiff = diffs.find(d => d.field === 'id');
      const companyIdDiff = diffs.find(d => d.field === 'company_id');

      expect(idDiff?.canAutoMerge).toBe(true);
      expect(companyIdDiff?.canAutoMerge).toBe(true);
    });

    it('should mark local-priority fields as auto-mergeable', () => {
      const localData = {
        id: '123',
        updated_at: '2024-01-15T10:00:00Z',
      };

      const serverData = {
        id: '123',
        updated_at: '2024-01-15T09:00:00Z',
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);

      const updatedAtDiff = diffs.find(d => d.field === 'updated_at');
      expect(updatedAtDiff?.canAutoMerge).toBe(true);
    });

    it('should mark null/undefined differences as auto-mergeable', () => {
      const localData = {
        id: '123',
        optionalField: 'value',
      };

      const serverData = {
        id: '123',
        optionalField: null,
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);

      const optionalDiff = diffs.find(d => d.field === 'optionalField');
      expect(optionalDiff?.canAutoMerge).toBe(true);
    });
  });

  describe('Last-Write-Wins Strategy', () => {
    it('should keep local data when local is newer', () => {
      const localData = { id: '123', name: 'Local', value: 100 };
      const serverData = { id: '123', name: 'Server', value: 50 };
      const localTimestamp = Date.now();
      const serverTimestamp = localTimestamp - 60000; // 1 minute older

      const result = ConflictResolver.applyLastWriteWins(
        localData,
        serverData,
        localTimestamp,
        serverTimestamp
      );

      expect(result.name).toBe('Local');
      expect(result.value).toBe(100);
    });

    it('should keep server data when server is newer', () => {
      const localData = { id: '123', name: 'Local', value: 100 };
      const serverData = { id: '123', name: 'Server', value: 50 };
      const localTimestamp = Date.now() - 60000; // 1 minute older
      const serverTimestamp = Date.now();

      const result = ConflictResolver.applyLastWriteWins(
        localData,
        serverData,
        localTimestamp,
        serverTimestamp
      );

      expect(result.name).toBe('Server');
      expect(result.value).toBe(50);
    });

    it('should keep server data when timestamps are equal', () => {
      const localData = { id: '123', name: 'Local' };
      const serverData = { id: '123', name: 'Server' };
      const timestamp = Date.now();

      const result = ConflictResolver.applyLastWriteWins(
        localData,
        serverData,
        timestamp,
        timestamp
      );

      expect(result.name).toBe('Server');
    });
  });

  describe('Field-Level Merge Strategy', () => {
    it('should merge non-conflicting fields', () => {
      const localData = {
        id: '123',
        name: 'Project A',
        description: 'Updated description',
        status: 'active',
      };

      const serverData = {
        id: '123',
        name: 'Project A',
        description: 'Old description',
        budget: 100000,
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);
      const result = ConflictResolver.applyFieldLevelMerge(localData, serverData, diffs);

      expect(result.name).toBe('Project A');
      expect(result.description).toBe('Updated description'); // Local value
      expect(result.budget).toBe(100000); // Server value
    });

    it('should prioritize server for security fields', () => {
      const localData = {
        id: '123',
        company_id: 'local-company',
        name: 'Project A',
      };

      const serverData = {
        id: '123',
        company_id: 'server-company',
        name: 'Project A',
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);
      const result = ConflictResolver.applyFieldLevelMerge(localData, serverData, diffs);

      expect(result.company_id).toBe('server-company'); // Server wins for security
    });

    it('should prioritize local for updated_at', () => {
      const localData = {
        id: '123',
        updated_at: '2024-01-15T10:00:00Z',
      };

      const serverData = {
        id: '123',
        updated_at: '2024-01-15T09:00:00Z',
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);
      const result = ConflictResolver.applyFieldLevelMerge(localData, serverData, diffs);

      expect(result.updated_at).toBe('2024-01-15T10:00:00Z'); // Local wins
    });

    it('should prefer local for non-auto-mergeable conflicts', () => {
      const localData = {
        id: '123',
        name: 'Local Name',
        status: 'active',
      };

      const serverData = {
        id: '123',
        name: 'Server Name',
        status: 'on_hold',
      };

      const diffs = ConflictResolver.detectFieldDiffs(localData, serverData);
      const result = ConflictResolver.applyFieldLevelMerge(localData, serverData, diffs);

      // For fields that can't auto-merge, prefer local
      expect(result.name).toBe('Local Name');
      expect(result.status).toBe('active');
    });
  });

  describe('Manual Selection Strategy', () => {
    it('should apply manual field selections', () => {
      const localData = {
        id: '123',
        name: 'Local Name',
        status: 'active',
        budget: 100000,
      };

      const serverData = {
        id: '123',
        name: 'Server Name',
        status: 'on_hold',
        budget: 150000,
      };

      const selections = [
        { field: 'name', source: 'local' as const },
        { field: 'status', source: 'server' as const },
        { field: 'budget', source: 'custom' as const, customValue: 125000 },
      ];

      const result = ConflictResolver.applyManualSelections(localData, serverData, selections);

      expect(result.name).toBe('Local Name');
      expect(result.status).toBe('on_hold');
      expect(result.budget).toBe(125000);
    });

    it('should use server as base for unselected fields', () => {
      const localData = {
        id: '123',
        name: 'Local',
        description: 'Local desc',
      };

      const serverData = {
        id: '123',
        name: 'Server',
        description: 'Server desc',
        status: 'active',
      };

      const selections = [
        { field: 'name', source: 'local' as const },
      ];

      const result = ConflictResolver.applyManualSelections(localData, serverData, selections);

      expect(result.name).toBe('Local');
      expect(result.description).toBe('Server desc'); // Server base
      expect(result.status).toBe('active'); // Server base
    });
  });

  describe('Merge Preview', () => {
    it('should generate merge preview for last-write-wins', () => {
      const localData = { id: '123', name: 'Local', value: 100 };
      const serverData = { id: '123', name: 'Server', value: 50 };

      const metadata: ConflictMetadata = {
        entityType: 'projects',
        entityId: '123',
        localTimestamp: Date.now(),
        serverTimestamp: Date.now() - 60000,
        detectedAt: Date.now(),
      };

      const preview = ConflictResolver.generateMergePreview(
        localData,
        serverData,
        'last-write-wins',
        metadata
      );

      expect(preview.strategy).toBe('last-write-wins');
      expect(preview.mergedData.name).toBe('Local'); // Local is newer
      expect(preview.conflicts).toBeDefined();
    });

    it('should generate merge preview for field-level-merge', () => {
      const localData = {
        id: '123',
        name: 'Project A',
        description: 'Local desc',
      };

      const serverData = {
        id: '123',
        name: 'Project A',
        budget: 100000,
      };

      const metadata: ConflictMetadata = {
        entityType: 'projects',
        entityId: '123',
        localTimestamp: Date.now(),
        serverTimestamp: Date.now(),
        detectedAt: Date.now(),
      };

      const preview = ConflictResolver.generateMergePreview(
        localData,
        serverData,
        'field-level-merge',
        metadata
      );

      expect(preview.strategy).toBe('field-level-merge');
      expect(preview.mergedData.description).toBe('Local desc');
      expect(preview.mergedData.budget).toBe(100000);
      expect(preview.autoMergedFields).toContain('description');
    });

    it('should identify manual fields that need user input', () => {
      const localData = {
        id: '123',
        name: 'Local Name',
        status: 'active',
      };

      const serverData = {
        id: '123',
        name: 'Server Name',
        status: 'on_hold',
      };

      const metadata: ConflictMetadata = {
        entityType: 'projects',
        entityId: '123',
        localTimestamp: Date.now(),
        serverTimestamp: Date.now(),
        detectedAt: Date.now(),
      };

      const preview = ConflictResolver.generateMergePreview(
        localData,
        serverData,
        'field-level-merge',
        metadata
      );

      expect(preview.manualFields.length).toBeGreaterThan(0);
      expect(preview.manualFields).toContain('name');
      expect(preview.manualFields).toContain('status');
    });
  });

  describe('Conflict History', () => {
    it('should record conflict resolution', () => {
      ConflictResolver.recordResolution(
        'projects',
        '123',
        'last-write-wins',
        undefined,
        'user-456'
      );

      const history = ConflictResolver.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].entityType).toBe('projects');
      expect(history[0].entityId).toBe('123');
      expect(history[0].strategy).toBe('last-write-wins');
      expect(history[0].resolvedBy).toBe('user-456');
    });

    it('should record manual field selections', () => {
      const selections = [
        { field: 'name', source: 'local' as const },
        { field: 'status', source: 'server' as const },
      ];

      ConflictResolver.recordResolution(
        'projects',
        '123',
        'manual',
        selections
      );

      const history = ConflictResolver.getHistory();

      expect(history[0].fieldSelections).toEqual(selections);
    });

    it('should filter history by entity type', () => {
      ConflictResolver.recordResolution('projects', '1', 'last-write-wins');
      ConflictResolver.recordResolution('daily_reports', '2', 'field-level-merge');
      ConflictResolver.recordResolution('projects', '3', 'manual');

      const projectHistory = ConflictResolver.getHistory('projects');

      expect(projectHistory).toHaveLength(2);
      expect(projectHistory.every(h => h.entityType === 'projects')).toBe(true);
    });

    it('should filter history by entity ID', () => {
      ConflictResolver.recordResolution('projects', '123', 'last-write-wins');
      ConflictResolver.recordResolution('projects', '456', 'field-level-merge');
      ConflictResolver.recordResolution('projects', '123', 'manual');

      const entityHistory = ConflictResolver.getHistory('projects', '123');

      expect(entityHistory).toHaveLength(2);
      expect(entityHistory.every(h => h.entityId === '123')).toBe(true);
    });

    it('should limit history to 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        ConflictResolver.recordResolution('projects', `${i}`, 'last-write-wins');
      }

      const history = ConflictResolver.getHistory();

      expect(history).toHaveLength(100);
    });

    it('should clear history', () => {
      ConflictResolver.recordResolution('projects', '1', 'last-write-wins');
      ConflictResolver.recordResolution('projects', '2', 'field-level-merge');

      expect(ConflictResolver.getHistory()).toHaveLength(2);

      ConflictResolver.clearHistory();

      expect(ConflictResolver.getHistory()).toHaveLength(0);
    });

    it('should sort history by timestamp descending', () => {
      ConflictResolver.recordResolution('projects', '1', 'last-write-wins');

      // Small delay to ensure different timestamp
      setTimeout(() => {
        ConflictResolver.recordResolution('projects', '2', 'field-level-merge');
      }, 10);

      const history = ConflictResolver.getHistory();

      if (history.length > 1) {
        expect(history[0].timestamp).toBeGreaterThanOrEqual(history[1].timestamp);
      }
    });
  });

  describe('Recommended Strategy', () => {
    it('should recommend field-level-merge when no conflicts', () => {
      const localData = {
        id: '123',
        name: 'Project A',
        description: 'Local desc',
      };

      const serverData = {
        id: '123',
        name: 'Project A',
        budget: 100000,
      };

      const metadata: ConflictMetadata = {
        entityType: 'projects',
        entityId: '123',
        localTimestamp: Date.now(),
        serverTimestamp: Date.now(),
        detectedAt: Date.now(),
      };

      const strategy = ConflictResolver.getRecommendedStrategy(localData, serverData, metadata);

      expect(strategy).toBe('field-level-merge');
    });

    it('should recommend manual when few conflicts', () => {
      const localData = {
        id: '123',
        name: 'Local Name',
        status: 'active',
      };

      const serverData = {
        id: '123',
        name: 'Server Name',
        status: 'on_hold',
      };

      const metadata: ConflictMetadata = {
        entityType: 'projects',
        entityId: '123',
        localTimestamp: Date.now(),
        serverTimestamp: Date.now(),
        detectedAt: Date.now(),
      };

      const strategy = ConflictResolver.getRecommendedStrategy(localData, serverData, metadata);

      expect(strategy).toBe('manual');
    });

    it('should recommend last-write-wins when many conflicts', () => {
      const localData = {
        id: '123',
        field1: 'local1',
        field2: 'local2',
        field3: 'local3',
        field4: 'local4',
        field5: 'local5',
      };

      const serverData = {
        id: '123',
        field1: 'server1',
        field2: 'server2',
        field3: 'server3',
        field4: 'server4',
        field5: 'server5',
      };

      const metadata: ConflictMetadata = {
        entityType: 'projects',
        entityId: '123',
        localTimestamp: Date.now(),
        serverTimestamp: Date.now(),
        detectedAt: Date.now(),
      };

      const strategy = ConflictResolver.getRecommendedStrategy(localData, serverData, metadata);

      expect(strategy).toBe('last-write-wins');
    });
  });
});
