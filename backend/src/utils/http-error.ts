export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    /** کد خطای ماشین‌خوان (اختیاری) — مثل TASK_NOT_FOUND یا PROJECT_NOT_IN_PROGRESS */
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
