/**
 * Logic Engine — Evaluates conditional branching rules at runtime.
 *
 * Core responsibilities:
 * 1. Evaluate a single question's logic_rules against the user's answer
 * 2. Compute the full visible question path given current answers
 * 3. Identify which questions were skipped by logic jumps
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface LogicCondition {
  answer_equals: string;
}

export interface LogicRule {
  condition: LogicCondition;
  action: 'jump_to' | 'skip_to_end';
  target_question_id?: string;
  synthetic_skipped_answers?: Record<string, string>;
}

export interface QuestionWithLogic {
  id: string;
  sort_order: number;
  logic_rules: LogicRule[] | null;
  question_type?: string;
  options?: string[] | null;
  answer_scores?: Record<string, number> | null;
  exclude_from_scoring?: boolean;
}

export interface EvaluationResult {
  action: 'next' | 'jump_to' | 'skip_to_end';
  targetId?: string;
}

// ─── Rule Evaluation ───────────────────────────────────────────────

/**
 * Evaluate a question's logic rules against a given answer.
 * Returns the action to take. First matching rule wins.
 * If no rules match (or no rules exist), returns { action: 'next' }.
 */
export function evaluateLogicRules(
  question: QuestionWithLogic,
  answer: string | undefined
): EvaluationResult {
  if (!question.logic_rules || question.logic_rules.length === 0 || !answer) {
    return { action: 'next' };
  }

  for (const rule of question.logic_rules) {
    if (rule.condition.answer_equals === answer) {
      return {
        action: rule.action,
        targetId: rule.action === 'jump_to' ? rule.target_question_id : undefined,
      };
    }
  }

  // No rule matched — proceed linearly
  return { action: 'next' };
}

// ─── Path Computation ──────────────────────────────────────────────

/**
 * Compute the ordered list of question IDs the respondent sees,
 * given the full question list (sorted by sort_order) and their current answers.
 *
 * This walks the questionnaire from the first question forward,
 * evaluating logic rules at each answered question to determine the next step.
 * Un-answered questions in the path are included (they haven't been reached yet).
 */
export function computeVisiblePath(
  questions: QuestionWithLogic[],
  answers: Record<string, string>
): string[] {
  if (questions.length === 0) return [];

  const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);
  const idToIndex = new Map<string, number>();
  sorted.forEach((q, i) => idToIndex.set(q.id, i));

  const path: string[] = [];
  let currentIndex = 0;

  while (currentIndex < sorted.length) {
    const question = sorted[currentIndex];
    path.push(question.id);

    const answer = answers[question.id];

    if (answer === undefined) {
      // Not yet answered — this is the current question; stop walking
      break;
    }

    const result = evaluateLogicRules(question, answer);

    switch (result.action) {
      case 'skip_to_end':
        // Jump to end — no more questions
        return path;

      case 'jump_to': {
        if (!result.targetId) {
          currentIndex++;
          break;
        }
        const targetIndex = idToIndex.get(result.targetId);
        if (targetIndex !== undefined && targetIndex > currentIndex) {
          currentIndex = targetIndex;
        } else {
          // Safety: invalid target, proceed linearly
          currentIndex++;
        }
        break;
      }

      case 'next':
      default:
        currentIndex++;
        break;
    }
  }

  return path;
}

// ─── Skip Detection ────────────────────────────────────────────────

/**
 * Given the full question list and the set of answered question IDs,
 * returns the IDs of questions that were skipped by logic jumps.
 *
 * A question is "skipped" if it exists in the full list but was NOT
 * in the visible path AND is NOT the current unanswered question.
 */
export function getSkippedQuestionIds(
  allQuestions: QuestionWithLogic[],
  visiblePath: string[]
): string[] {
  const visibleSet = new Set(visiblePath);
  return allQuestions
    .filter((q) => !visibleSet.has(q.id))
    .map((q) => q.id);
}

/**
 * Returns list of skipped questions along with the specific logic rules
 * that caused them to be skipped.
 */
export function getSkippedQuestionsWithRules(
  questions: QuestionWithLogic[],
  answers: Record<string, string>
): { id: string; ruleApplied?: LogicRule }[] {
  const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);
  const idToIndex = new Map<string, number>();
  sorted.forEach((q, i) => idToIndex.set(q.id, i));

  const visiblePath: string[] = [];
  const skippedList: { id: string; ruleApplied?: LogicRule }[] = [];
  let currentIndex = 0;

  while (currentIndex < sorted.length) {
    const question = sorted[currentIndex];
    visiblePath.push(question.id);

    const answer = answers[question.id];
    if (answer === undefined) {
      break;
    }

    const rules = question.logic_rules;
    let appliedRule: LogicRule | undefined;
    if (rules && rules.length > 0) {
      for (const r of rules) {
        if (r.condition.answer_equals === answer) {
          appliedRule = r;
          break;
        }
      }
    }

    if (appliedRule) {
      if (appliedRule.action === 'skip_to_end') {
        for (let s = currentIndex + 1; s < sorted.length; s++) {
          skippedList.push({ id: sorted[s].id, ruleApplied: appliedRule });
        }
        break; // stop walking
      } else if (appliedRule.action === 'jump_to' && appliedRule.target_question_id) {
        const targetIndex = idToIndex.get(appliedRule.target_question_id);
        if (targetIndex !== undefined && targetIndex > currentIndex) {
          for (let s = currentIndex + 1; s < targetIndex; s++) {
            skippedList.push({ id: sorted[s].id, ruleApplied: appliedRule });
          }
          currentIndex = targetIndex;
          continue;
        }
      }
    }

    currentIndex++;
  }

  const visibleSet = new Set(visiblePath);
  return skippedList.filter(item => !visibleSet.has(item.id));
}


// ─── Branching Detection ───────────────────────────────────────────

/**
 * Returns true if any question in the list has logic rules defined.
 * Used to decide between flat-list and stepper rendering modes.
 */
export function hasBranchingLogic(questions: QuestionWithLogic[]): boolean {
  return questions.some(
    (q) => q.logic_rules !== null && q.logic_rules.length > 0
  );
}
