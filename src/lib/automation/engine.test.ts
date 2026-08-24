import { describe, it, expect } from 'vitest';
import { AutomationEngine } from './engine';

// Expose the private method for testing purposes
const evaluateConditionGroup = (AutomationEngine as any).evaluateConditionGroup.bind(AutomationEngine);

describe('AutomationEngine Conditions', () => {
  it('should pass base conditions', () => {
    const lead = { status: 'new', score: 100, company: 'Acme Corp' };
    
    expect(evaluateConditionGroup(lead, { field: 'status', operator: 'equals', value: 'new' })).toBe(true);
    expect(evaluateConditionGroup(lead, { field: 'status', operator: 'not_equals', value: 'active' })).toBe(true);
    expect(evaluateConditionGroup(lead, { field: 'score', operator: 'greater_than', value: 50 })).toBe(true);
    expect(evaluateConditionGroup(lead, { field: 'company', operator: 'contains', value: 'Acme' })).toBe(true);
    expect(evaluateConditionGroup(lead, { field: 'company', operator: 'does_not_contain', value: 'Global' })).toBe(true);
  });

  it('should evaluate AND groups', () => {
    const lead = { status: 'new', score: 100 };
    const group = {
      type: 'AND',
      conditions: [
        { field: 'status', operator: 'equals', value: 'new' },
        { field: 'score', operator: 'greater_than', value: 50 }
      ]
    };

    expect(evaluateConditionGroup(lead, group)).toBe(true);

    const failingGroup = {
      type: 'AND',
      conditions: [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'score', operator: 'greater_than', value: 50 }
      ]
    };
    expect(evaluateConditionGroup(lead, failingGroup)).toBe(false);
  });

  it('should evaluate OR groups', () => {
    const lead = { status: 'active', score: 100 };
    const group = {
      type: 'OR',
      conditions: [
        { field: 'status', operator: 'equals', value: 'new' },
        { field: 'score', operator: 'greater_than', value: 50 }
      ]
    };

    expect(evaluateConditionGroup(lead, group)).toBe(true);
  });
});
