export interface ApiResponse<T> {
  data: T;
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
  };
}

export interface PaginatedResponse<T> {
  data: T;
  total: number;
  page: number;
  limit: number;
}

export function paginatedResponse<T>(
  data: T,
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<T> {
  return {
    data,
    page,
    limit,
    total,
  };
}
