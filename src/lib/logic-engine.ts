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
}

export interface QuestionWithLogic {
  id: string;
  sort_order: number;
  logic_rules: LogicRule[] | null;
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
