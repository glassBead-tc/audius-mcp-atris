/**
 * Response optimization utilities
 */

export interface FieldFilter {
  include?: string[];
  exclude?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  }
}

/**
 * Filter response fields based on include/exclude rules
 */
export function filterFields<T extends object>(
  response: T,
  filter?: FieldFilter
): T {
  if (!filter) return response;

  if (filter.include?.length) {
    const filtered = {} as T;
    filter.include.forEach(field => {
      if (field in response) {
        (filtered as any)[field] = response[field as keyof T];
      }
    });
    return filtered;
  }

  if (filter.exclude?.length) {
    const filtered = { ...response } as T;
    filter.exclude.forEach(field => {
      delete (filtered as any)[field];
    });
    return filtered;
  }

  return response;
}

/**
 * Add pagination metadata to response
 */
export function addPaginationMetadata<T>(
  data: T[],
  total: number,
  offset: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + data.length < total
    }
  };
}

/**
 * Optimize response by removing unnecessary fields and adding metadata
 */
export function optimizeResponse<T extends object>(
  response: T | T[],
  options: {
    filter?: FieldFilter;
    pagination?: {
      total: number;
      offset: number;
      limit: number;
    }
  } = {}
): T | T[] | PaginatedResponse<T> {
  const { filter, pagination } = options;

  // Handle array responses
  if (Array.isArray(response)) {
    const filteredData = response.map(item => filterFields(item, filter));
    
    // Add pagination if provided
    if (pagination) {
      return addPaginationMetadata(
        filteredData,
        pagination.total,
        pagination.offset,
        pagination.limit
      );
    }
    
    return filteredData;
  }

  // Handle single object responses
  return filterFields(response, filter);
}

/**
 * Common field filters for different response types
 */
export const CommonFilters = {
  track: {
    basic: {
      include: ['id', 'title', 'artist', 'duration', 'artwork']
    },
    minimal: {
      include: ['id', 'title']
    },
    noMetadata: {
      exclude: ['metadata', 'encodedMetadata', 'transcodedVersions']
    }
  },
  user: {
    basic: {
      include: ['id', 'name', 'handle', 'profilePicture']
    },
    minimal: {
      include: ['id', 'handle']
    },
    noWallet: {
      exclude: ['wallet', 'ercWallet', 'splWallet']
    }
  }
};
