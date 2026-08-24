import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngestionService } from './ingestion';
import { NormalizedLeadPayload } from '../integrations/types';

// Mock DB
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]), // Default to no existing lead
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'updated-123' }]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 'new-123' }])
    }),
  },
}));

describe('IngestionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(IngestionService, 'logIngestion').mockResolvedValue(undefined);
  });

  it('should throw an error if both email and phone are missing', async () => {
    const payload: NormalizedLeadPayload = {
      name: 'Test User',
      sourceId: 'source-1',
      customData: {},
    };

    await expect(IngestionService.processLead(payload)).rejects.toThrow('Email or phone is required');
  });

  it('should create a new lead if no duplicate is found', async () => {
    const { db } = await import('@/db');
    // Ensure select returns empty array (no duplicates)
    ((db as any).limit as any).mockResolvedValueOnce([]);

    const payload: NormalizedLeadPayload = {
      name: 'New Lead',
      email: 'new@example.com',
      sourceId: 'source-1',
      customData: {},
    };

    const result = await IngestionService.processLead(payload);
    
    expect(result.status).toBe('success');
    expect(result.leadId).toBe('new-123');
    expect(db.insert).toHaveBeenCalled();
  });

  it('should deduplicate and update if an existing lead is found', async () => {
    const { db } = await import('@/db');
    // Mock existing lead
    ((db as any).limit as any).mockResolvedValueOnce([{ id: 'existing-123', email: 'existing@example.com', customData: { old: 'data' } }]);

    const payload: NormalizedLeadPayload = {
      name: 'Existing Lead',
      email: 'existing@example.com',
      sourceId: 'source-1',
      customData: { new: 'data' },
    };

    const result = await IngestionService.processLead(payload);
    
    expect(result.status).toBe('deduplicated');
    expect(result.leadId).toBe('updated-123');
    expect(db.update).toHaveBeenCalled();
  });
});
