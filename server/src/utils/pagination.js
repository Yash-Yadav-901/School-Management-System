export function parsePagination(query) {
  const rawPage = query.page !== undefined ? parseInt(query.page, 10) : 1;
  const rawSize = query.pageSize !== undefined ? parseInt(query.pageSize, 10) : 10;

  const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const pageSize = Number.isNaN(rawSize) ? 10 : Math.min(100, Math.max(1, rawSize));
  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip, take: pageSize };
}

export function formatPaginatedResponse(data, total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

