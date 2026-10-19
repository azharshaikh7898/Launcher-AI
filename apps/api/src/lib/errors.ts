export class AppError extends Error {
  constructor(public status: number, message: string, public code = "ERROR") {
    super(message);
  }
}
export const notFound = (what = "Resource") => new AppError(404, `${what} not found`, "NOT_FOUND");
