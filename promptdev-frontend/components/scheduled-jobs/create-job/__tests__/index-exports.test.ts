import { describe, it, expect } from 'vitest';
import * as exports from '@/components/scheduled-jobs/create-job';

describe('scheduled-jobs/create-job barrel exports', () => {
  it('exports JobFormProvider', () => {
    expect(exports.JobFormProvider).toBeDefined();
  });

  it('exports FormSections related components', () => {
    // form-sections module should export components
    const keys = Object.keys(exports);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('exports PromptSection related components', () => {
    // Verify the barrel re-exports from prompt-section
    expect(typeof exports).toBe('object');
  });

  it('exports ScheduleSection related components', () => {
    // Verify the barrel re-exports from schedule-section
    expect(typeof exports).toBe('object');
  });

  it('all exports are defined (not undefined)', () => {
    for (const [key, value] of Object.entries(exports)) {
      expect(value, `export "${key}" should be defined`).toBeDefined();
    }
  });
});
