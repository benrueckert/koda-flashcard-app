/**
 * Class name utility function
 * 
 * Simple utility for combining class names with conditional logic.
 */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}