import { describe, it, expect, vi } from 'vitest';
import { AnalyticsService } from './service';

// Mock DB
vi.mock('@/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  },
}));

describe('AnalyticsService Calculations', () => {
  it('should correctly calculate lead metrics', async () => {
    const mockLeads = [
      { status: 'new', expectedValue: '0' },
      { status: 'active', expectedValue: '1000' },
      { status: 'active', expectedValue: '2000' },
      { status: 'won', expectedValue: '5000' },
      { status: 'lost', expectedValue: '1000' },
      { status: 'unqualified', expectedValue: '0' },
    ];

    const { db } = await import('@/db');
    // Mock the chain to return our data
    const queryChain = {
      where: vi.fn().mockResolvedValue(mockLeads),
      then: (resolve: any) => resolve(mockLeads)
    };
    ((db as any).from as any).mockReturnValue(queryChain);

    const metrics = await AnalyticsService.getLeadMetrics();

    expect(metrics.total).toBe(6);
    expect(metrics.newLeads).toBe(1);
    expect(metrics.qualified).toBe(3); // 2 active + 1 won
    expect(metrics.unqualified).toBe(1);
    expect(metrics.won).toBe(1);
    expect(metrics.lost).toBe(1);
    
    // Won / (Won + Lost) = 1 / 2 = 50%
    expect(metrics.conversionRate).toBe(50);
    
    // Active leads expected value sum = 1000 + 2000 = 3000
    expect(metrics.pipelineValue).toBe(3000);
    
    // Won leads expected value sum = 5000
    expect(metrics.expectedRevenue).toBe(5000);
  });

  it('should handle zero division for conversion rate safely', async () => {
    const mockLeads = [
      { status: 'new', expectedValue: '0' },
      { status: 'active', expectedValue: '1000' },
    ];

    const { db } = await import('@/db');
    const queryChain = {
      where: vi.fn().mockResolvedValue(mockLeads),
      then: (resolve: any) => resolve(mockLeads)
    };
    ((db as any).from as any).mockReturnValue(queryChain);

    const metrics = await AnalyticsService.getLeadMetrics();

    expect(metrics.won).toBe(0);
    expect(metrics.lost).toBe(0);
    expect(metrics.conversionRate).toBe(0); // Should not be NaN
  });
});
