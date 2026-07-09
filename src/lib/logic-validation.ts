/**
 * Logic Validation — Editor-time validation of logic rules.
 *
 * Enforces:
 * 1. Forward-only jumps (target sort_order > source sort_order)
 * 2. No dead-end detection (unreachable questions)
 * 3. Valid target references (target_question_id must exist in the questionnaire)
 */

import type { LogicRule, QuestionWithLogic } from './logic-engine';

export interface ValidationError {
  questionId: string;
  questionIndex: number;
  ruleIndex: number;
  message: string;
  messageKey: string; // i18n key for localization
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  unreachableQuestionIds: string[];
}

/**
 * Validate all logic rules across a questionnaire's questions.
 * Questions must be sorted by sort_order before calling.
 */
export function validateLogicRules(
  questions: QuestionWithLogic[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);

  const idToSortOrder = new Map<string, number>();
  const idToIndex = new Map<string, number>();
  sorted.forEach((q, i) => {
    idToSortOrder.set(q.id, q.sort_order);
    idToIndex.set(q.id, i);
  });

  const questionIdSet = new Set(sorted.map((q) => q.id));

  // ── Rule-level validation ──────────────────────────────────────

  for (let qi = 0; qi < sorted.length; qi++) {
    const question = sorted[qi];
    if (!question.logic_rules || question.logic_rules.length === 0) continue;

    for (let ri = 0; ri < question.logic_rules.length; ri++) {
      const rule = question.logic_rules[ri];

      // 1. Validate action type
      if (rule.action !== 'jump_to' && rule.action !== 'skip_to_end') {
        errors.push({
          questionId: question.id,
          questionIndex: qi,
          ruleIndex: ri,
          message: `Invalid action: "${rule.action}"`,
          messageKey: 'logic.invalidAction',
        });
        continue;
      }

      // 2. jump_to requires a target
      if (rule.action === 'jump_to') {
        if (!rule.target_question_id) {
          errors.push({
            questionId: question.id,
            questionIndex: qi,
            ruleIndex: ri,
            message: 'Jump target is missing.',
            messageKey: 'logic.missingTarget',
          });
          continue;
        }

        // 3. Target must exist
        if (!questionIdSet.has(rule.target_question_id)) {
          errors.push({
            questionId: question.id,
            questionIndex: qi,
            ruleIndex: ri,
            message: 'Jump target does not exist in this questionnaire.',
            messageKey: 'logic.targetNotFound',
          });
          continue;
        }

        // 4. Forward-only: target sort_order must be > source sort_order
        const sourceSO = question.sort_order;
        const targetSO = idToSortOrder.get(rule.target_question_id)!;
        if (targetSO <= sourceSO) {
          errors.push({
            questionId: question.id,
            questionIndex: qi,
            ruleIndex: ri,
            message: `Cannot jump backward (Q${qi + 1} → Q${(idToIndex.get(rule.target_question_id) ?? 0) + 1}). Jumps must be forward-only.`,
            messageKey: 'logic.backwardJump',
          });
        }
      }

      // 5. Condition validation
      if (!rule.condition || typeof rule.condition.answer_equals !== 'string') {
        errors.push({
          questionId: question.id,
          questionIndex: qi,
          ruleIndex: ri,
          message: 'Rule condition is missing or invalid.',
          messageKey: 'logic.invalidCondition',
        });
      }

      // 6. Synthetic skipped answers validation
      if (rule.synthetic_skipped_answers) {
        const sourceSO = question.sort_order;
        const targetSO = rule.action === 'jump_to' && rule.target_question_id
          ? idToSortOrder.get(rule.target_question_id)
          : undefined;

        for (const [skippedId, val] of Object.entries(rule.synthetic_skipped_answers)) {
          const skippedQ = sorted.find(q => q.id === skippedId);
          if (!skippedQ) {
            errors.push({
              questionId: question.id,
              questionIndex: qi,
              ruleIndex: ri,
              message: `Synthetic answer refers to non-existent question ID: ${skippedId}`,
              messageKey: 'logic.syntheticNonExistent',
            });
            continue;
          }

          const skippedSO = skippedQ.sort_order;
          
          // Verify it is actually skipped by this rule
          if (rule.action === 'jump_to') {
            if (targetSO === undefined || skippedSO <= sourceSO || skippedSO >= targetSO) {
              errors.push({
                questionId: question.id,
                questionIndex: qi,
                ruleIndex: ri,
                message: `Question Q${(idToIndex.get(skippedId) ?? 0) + 1} is not skipped by this jump rule.`,
                messageKey: 'logic.syntheticNotSkipped',
              });
              continue;
            }
          } else if (rule.action === 'skip_to_end') {
            if (skippedSO <= sourceSO) {
              errors.push({
                questionId: question.id,
                questionIndex: qi,
                ruleIndex: ri,
                message: `Question Q${(idToIndex.get(skippedId) ?? 0) + 1} is not skipped by this rule.`,
                messageKey: 'logic.syntheticNotSkipped',
              });
              continue;
            }
          }

          // Verify it is a scored type (scale, yes_no, multiple_choice) and check type-aware constraints
          const type = skippedQ.question_type;
          if (type === 'text') {
            errors.push({
              questionId: question.id,
              questionIndex: qi,
              ruleIndex: ri,
              message: `Question Q${(idToIndex.get(skippedId) ?? 0) + 1} is a text question and cannot have a synthetic answer.`,
              messageKey: 'logic.syntheticTextUnscored',
            });
            continue;
          }

          if (type === 'yes_no') {
            if (val !== 'yes' && val !== 'no') {
              errors.push({
                questionId: question.id,
                questionIndex: qi,
                ruleIndex: ri,
                message: `Synthetic answer for yes_no question Q${(idToIndex.get(skippedId) ?? 0) + 1} must be 'yes' or 'no'.`,
                messageKey: 'logic.syntheticInvalidYesNo',
              });
            }
          } else if (type === 'scale') {
            const opts = skippedQ.options;
            const min = opts && opts[0] ? Number(opts[0]) : 1;
            const max = opts && opts[1] ? Number(opts[1]) : 5;
            const valNum = Number(val);
            if (isNaN(valNum) || valNum < min || valNum > max) {
              errors.push({
                questionId: question.id,
                questionIndex: qi,
                ruleIndex: ri,
                message: `Synthetic answer for scale question Q${(idToIndex.get(skippedId) ?? 0) + 1} must be between ${min} and ${max}.`,
                messageKey: 'logic.syntheticInvalidScale',
              });
            }
          } else if (type === 'multiple_choice') {
            const opts = skippedQ.options ?? [];
            if (!opts.includes(val)) {
              errors.push({
                questionId: question.id,
                questionIndex: qi,
                ruleIndex: ri,
                message: `Synthetic answer for multiple choice question Q${(idToIndex.get(skippedId) ?? 0) + 1} is not one of its configured options.`,
                messageKey: 'logic.syntheticInvalidMC',
              });
            }
          }
        }
      }
    }
  }

  // ── Reachability analysis ──────────────────────────────────────
  // Walk all possible paths from Q1 to find which questions are reachable.
  // A question is "unreachable" if no path from Q1 can reach it.

  const reachable = new Set<string>();

  function walk(startIndex: number, visited: Set<string>): void {
    if (startIndex >= sorted.length) return;

    const q = sorted[startIndex];
    if (visited.has(q.id)) return; // prevent infinite loops in analysis
    visited.add(q.id);
    reachable.add(q.id);

    if (!q.logic_rules || q.logic_rules.length === 0) {
      // No rules — next question is always reachable
      walk(startIndex + 1, new Set(visited));
      return;
    }

    // For each possible rule outcome + the "no match" fallback, mark targets reachable
    const ruleTargets = new Set<number>();

    for (const rule of q.logic_rules) {
      if (rule.action === 'skip_to_end') {
        // End path — no more questions reachable from this branch
        continue;
      }
      if (rule.action === 'jump_to' && rule.target_question_id) {
        const targetIdx = idToIndex.get(rule.target_question_id);
        if (targetIdx !== undefined) {
          ruleTargets.add(targetIdx);
        }
      }
    }

    // "No match" fallback — next question
    ruleTargets.add(startIndex + 1);

    for (const target of ruleTargets) {
      walk(target, new Set(visited));
    }
  }

  if (sorted.length > 0) {
    walk(0, new Set());
  }

  const unreachableQuestionIds = sorted
    .filter((q) => !reachable.has(q.id))
    .map((q) => q.id);

  return {
    valid: errors.length === 0,
    errors,
    unreachableQuestionIds,
  };
}
