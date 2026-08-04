import { toast } from "react-toastify"

export class AppError extends Error {
  constructor(
    message: string,
    public code = "UNKNOWN_ERROR",
    public statusCode = 500,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const handleApiError = (error: any): AppError => {
  console.error("[v0] API Error:", error)

  if (error instanceof AppError) {
    return error
  }

  if (error?.code === "PGRST116") {
    return new AppError("Database connection failed", "DB_CONNECTION_ERROR", 503)
  }

  if (error?.code === "23505") {
    return new AppError("Duplicate entry found", "DUPLICATE_ERROR", 409)
  }

  if (error?.code === "23503") {
    return new AppError("Referenced record not found", "REFERENCE_ERROR", 400)
  }

  return new AppError(error?.message || "An unexpected error occurred", "UNKNOWN_ERROR", 500)
}

export const showErrorToast = (error: any) => {
  const appError = handleApiError(error)
  toast.error(appError.message)
}
