import { describe, it, expect } from 'vitest';
import {
  evaluateLogicRules,
  computeVisiblePath,
  getSkippedQuestionIds,
  getSkippedQuestionsWithRules,
  type QuestionWithLogic,
  type LogicRule
} from '../lib/logic-engine';
import { validateLogicRules } from '../lib/logic-validation';

describe('Conditional Logic Auto-Scored Skips', () => {
  // Setup standard questions
  const q1: QuestionWithLogic = {
    id: 'q1',
    sort_order: 1,
    question_type: 'yes_no',
    logic_rules: [
      {
        condition: { answer_equals: 'yes' },
        action: 'jump_to',
        target_question_id: 'q3',
        synthetic_skipped_answers: { q2: '3' } // Q2 is scale
      }
    ]
  };

  const q2: QuestionWithLogic = {
    id: 'q2',
    sort_order: 2,
    question_type: 'scale',
    options: ['1', '5'],
    logic_rules: null
  };

  const q3: QuestionWithLogic = {
    id: 'q3',
    sort_order: 3,
    question_type: 'multiple_choice',
    options: ['Option A', 'Option B'],
    logic_rules: null
  };

  const questionsList = [q1, q2, q3];

  it('Rule with no auto-fill behaves exactly as today', () => {
    const q1NoAutoFill: QuestionWithLogic = {
      id: 'q1',
      sort_order: 1,
      question_type: 'yes_no',
      logic_rules: [
        {
          condition: { answer_equals: 'yes' },
          action: 'jump_to',
          target_question_id: 'q3'
        }
      ]
    };
    const list = [q1NoAutoFill, q2, q3];
    const answers = { q1: 'yes' };

    const visiblePath = computeVisiblePath(list, answers);
    expect(visiblePath).toEqual(['q1', 'q3']);

    const skippedWithRules = getSkippedQuestionsWithRules(list, answers);
    expect(skippedWithRules).toHaveLength(1);
    expect(skippedWithRules[0].id).toBe('q2');
    expect(skippedWithRules[0].ruleApplied?.synthetic_skipped_answers).toBeUndefined();
  });

  it('jump_to over one skipped question inserts synthetic answer correctly', () => {
    const answers = { q1: 'yes' };

    const visiblePath = computeVisiblePath(questionsList, answers);
    expect(visiblePath).toEqual(['q1', 'q3']);

    const skippedWithRules = getSkippedQuestionsWithRules(questionsList, answers);
    expect(skippedWithRules).toHaveLength(1);
    expect(skippedWithRules[0].id).toBe('q2');
    
    const syntheticVal = skippedWithRules[0].ruleApplied?.synthetic_skipped_answers?.['q2'];
    expect(syntheticVal).toBe('3');
  });

  it('jump_to over multiple skipped questions of mixed types works', () => {
    const qA: QuestionWithLogic = {
      id: 'qA',
      sort_order: 1,
      question_type: 'yes_no',
      logic_rules: [
        {
          condition: { answer_equals: 'no' },
          action: 'jump_to',
          target_question_id: 'qD',
          synthetic_skipped_answers: { qB: 'yes', qC: 'Option B' }
        }
      ]
    };
    const qB: QuestionWithLogic = { id: 'qB', sort_order: 2, question_type: 'yes_no', logic_rules: null };
    const qC: QuestionWithLogic = { id: 'qC', sort_order: 3, question_type: 'multiple_choice', options: ['Option A', 'Option B'], logic_rules: null };
    const qD: QuestionWithLogic = { id: 'qD', sort_order: 4, question_type: 'scale', logic_rules: null };

    const list = [qA, qB, qC, qD];
    const answers = { qA: 'no' };

    const visiblePath = computeVisiblePath(list, answers);
    expect(visiblePath).toEqual(['qA', 'qD']);

    const skippedWithRules = getSkippedQuestionsWithRules(list, answers);
    expect(skippedWithRules).toHaveLength(2);
    expect(skippedWithRules[0].id).toBe('qB');
    expect(skippedWithRules[1].id).toBe('qC');

    expect(skippedWithRules[0].ruleApplied?.synthetic_skipped_answers?.['qB']).toBe('yes');
    expect(skippedWithRules[1].ruleApplied?.synthetic_skipped_answers?.['qC']).toBe('Option B');
  });

  it('skip_to_end applies synthetic answers to remaining skipped questions', () => {
    const qA: QuestionWithLogic = {
      id: 'qA',
      sort_order: 1,
      question_type: 'yes_no',
      logic_rules: [
        {
          condition: { answer_equals: 'yes' },
          action: 'skip_to_end',
          synthetic_skipped_answers: { qB: '4' } // Q2 is scale
        }
      ]
    };
    const qB: QuestionWithLogic = { id: 'qB', sort_order: 2, question_type: 'scale', options: ['1', '5'], logic_rules: null };
    const qC: QuestionWithLogic = { id: 'qC', sort_order: 3, question_type: 'text', logic_rules: null };

    const list = [qA, qB, qC];
    const answers = { qA: 'yes' };

    const visiblePath = computeVisiblePath(list, answers);
    expect(visiblePath).toEqual(['qA']);

    const skippedWithRules = getSkippedQuestionsWithRules(list, answers);
    expect(skippedWithRules).toHaveLength(2);
    
    // Q2 (qB) has synthetic answer '4'
    const qBResult = skippedWithRules.find(r => r.id === 'qB');
    expect(qBResult?.ruleApplied?.synthetic_skipped_answers?.['qB']).toBe('4');

    // Q3 (qC) is text, has no synthetic answer
    const qCResult = skippedWithRules.find(r => r.id === 'qC');
    expect(qCResult?.ruleApplied?.synthetic_skipped_answers?.['qC']).toBeUndefined();
  });

  describe('Validation', () => {
    it('passes validation for valid rules and synthetic answers', () => {
      const result = validateLogicRules(questionsList);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects synthetic answers targeting non-existent questions', () => {
      const invalidQ: QuestionWithLogic = {
        id: 'q1',
        sort_order: 1,
        question_type: 'yes_no',
        logic_rules: [
          {
            condition: { answer_equals: 'yes' },
            action: 'jump_to',
            target_question_id: 'q3',
            synthetic_skipped_answers: { nonExistent: 'yes' }
          }
        ]
      };
      const result = validateLogicRules([invalidQ, q2, q3]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('non-existent question ID');
    });

    it('rejects synthetic answers targeting questions that are not skipped', () => {
      const invalidQ: QuestionWithLogic = {
        id: 'q1',
        sort_order: 1,
        question_type: 'yes_no',
        logic_rules: [
          {
            condition: { answer_equals: 'yes' },
            action: 'jump_to',
            target_question_id: 'q3',
            synthetic_skipped_answers: { q3: 'Option A' } // Q3 is the jump target, not skipped!
          }
        ]
      };
      const result = validateLogicRules([invalidQ, q2, q3]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('not skipped by this jump rule');
    });

    it('rejects synthetic answers for text questions', () => {
      const qText: QuestionWithLogic = {
        id: 'q2',
        sort_order: 2,
        question_type: 'text',
        logic_rules: null
      };
      const invalidQ: QuestionWithLogic = {
        id: 'q1',
        sort_order: 1,
        question_type: 'yes_no',
        logic_rules: [
          {
            condition: { answer_equals: 'yes' },
            action: 'jump_to',
            target_question_id: 'q3',
            synthetic_skipped_answers: { q2: 'hello' }
          }
        ]
      };
      const result = validateLogicRules([invalidQ, qText, q3]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('text question and cannot have a synthetic answer');
    });

    it('rejects invalid values for scale questions', () => {
      const invalidScaleQ: QuestionWithLogic = {
        id: 'q1',
        sort_order: 1,
        question_type: 'yes_no',
        logic_rules: [
          {
            condition: { answer_equals: 'yes' },
            action: 'jump_to',
            target_question_id: 'q3',
            synthetic_skipped_answers: { q2: '6' } // Max is 5
          }
        ]
      };
      const result = validateLogicRules([invalidScaleQ, q2, q3]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('must be between 1 and 5');
    });

    it('rejects invalid values for yes_no questions', () => {
      const qYesNo: QuestionWithLogic = {
        id: 'q2',
        sort_order: 2,
        question_type: 'yes_no',
        logic_rules: null
      };
      const invalidRuleQ: QuestionWithLogic = {
        id: 'q1',
        sort_order: 1,
        question_type: 'yes_no',
        logic_rules: [
          {
            condition: { answer_equals: 'yes' },
            action: 'jump_to',
            target_question_id: 'q3',
            synthetic_skipped_answers: { q2: 'maybe' } // Should be yes or no
          }
        ]
      };
      const result = validateLogicRules([invalidRuleQ, qYesNo, q3]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('must be \'yes\' or \'no\'');
    });

    it('rejects invalid values for multiple choice questions', () => {
      const qA: QuestionWithLogic = {
        id: 'qA',
        sort_order: 1,
        question_type: 'yes_no',
        logic_rules: [
          {
            condition: { answer_equals: 'yes' },
            action: 'jump_to',
            target_question_id: 'qC',
            synthetic_skipped_answers: { qB: 'InvalidOption' }
          }
        ]
      };
      const qB: QuestionWithLogic = {
        id: 'qB',
        sort_order: 2,
        question_type: 'multiple_choice',
        options: ['Option A', 'Option B'],
        logic_rules: null
      };
      const qC: QuestionWithLogic = {
        id: 'qC',
        sort_order: 3,
        question_type: 'scale',
        logic_rules: null
      };
      const result = validateLogicRules([qA, qB, qC]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('is not one of its configured options');
    });
  });
});
