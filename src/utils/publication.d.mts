export function parisDay(date: Date): string;
export function parisDateTime(date: Date): string;
export function readFrontmatterFlags(markdownText: string): { draft: boolean; publishDate: string | undefined };
export function isPublishedFlags(
  flags: { draft?: boolean; publishDate?: string | Date | undefined },
  now?: Date,
  options?: { mode?: 'day' | 'instant' }
): boolean;
export function hasRecentlyPublished(
  postsFlags: Array<{ draft?: boolean; publishDate?: string | undefined }>,
  now: Date,
  windowHours?: number
): boolean;
export function shouldDeploy(
  event: string,
  postsFlags: Array<{ draft?: boolean; publishDate?: string | undefined }>,
  now: Date,
  windowHours?: number
): boolean;
