export function parisDay(date: Date): string;
export function parisDateTime(date: Date): string;
export function readFrontmatterFlags(markdownText: string): {
  draft: boolean;
  publishDate: string | undefined;
  annexOf: string | undefined;
};
export function isPublishedFlags(
  flags: { draft?: boolean; publishDate?: string | Date | undefined },
  now?: Date,
  options?: { mode?: 'day' | 'instant' }
): boolean;
