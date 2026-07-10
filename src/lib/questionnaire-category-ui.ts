import { friendlyDbError } from '@/lib/db-error';

export function getQuestionnaireCategoryErrorMessage(error: {
  message?: string;
  code?: string;
}): string {
  return friendlyDbError(error);
}
