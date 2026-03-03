/**
 * Maps Supabase/PostgreSQL errors to user-friendly messages.
 * Logs the original error for debugging.
 */
export function friendlyDbError(error: { message?: string; code?: string }): string {
  console.error('DB error:', error);
  if (error.code === '23505') return 'This item already exists';
  if (error.code === '23503') return 'Referenced item not found';
  if (error.code === '42501' || error.message?.includes('row-level security')) return 'Permission denied';
  if (error.code === '23502') return 'Required field is missing';
  return 'Unable to complete the operation';
}
