import { describe, it, expect } from 'vitest';
import { flattenLeadData } from './migrate-legacy';

describe('Legacy Data Migration', () => {
  describe('flattenLeadData', () => {
    it('should map legacy lead and person into a unified object', () => {
      const legacyLead = {
        id: 1,
        person_id: 10,
        status: 'Won',
        lead_value: 5000,
        lead_source_id: 3,
      };

      const legacyPerson = {
        id: 10,
        first_name: 'Jane',
        last_name: 'Doe',
        emails: '[{"value": "jane@example.com"}]',
        contact_numbers: '[{"value": "+1234567890"}]',
      };

      const result = flattenLeadData(legacyLead, legacyPerson);

      expect(result).toMatchObject({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1234567890',
        expectedValue: '5000',
        status: 'won',
      });
      expect(result.customData.legacySourceId).toBe(3);
    });

    it('should handle missing person gracefully', () => {
      const legacyLead = {
        status: 'Lost',
      };

      const result = flattenLeadData(legacyLead, null);

      expect(result.name).toBe('Unknown');
      expect(result.email).toBe(null);
      expect(result.status).toBe('lost');
    });
  });
});
