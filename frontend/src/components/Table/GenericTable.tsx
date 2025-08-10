import { useState, useEffect, ReactNode } from 'react';
import { ChevronRight, ChevronLeft, Filter, AlertCircle, X } from 'lucide-react';

// Generic interfaces
export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T, index: number) => ReactNode;
  width?: string;
}

export interface TableAction<T> {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (record: T, index: number) => void;
  className?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface GenericTableProps<T> {
  // Data - parent component handles all data logic
  data: T[];
  filteredData: T[];
  
  // Configuration
  columns: TableColumn<T>[];
  rowKey: keyof T;
  actions?: TableAction<T>[];
  
  // Filters - parent handles filter logic
  filters?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  onResetFilters?: () => void;
  
  // States - parent manages all states
  loading?: boolean;
  error?: string | null;
  
  // Callbacks
  onRetry?: () => void;
  onRowClick?: (record: T, index: number) => void;
  
  // Pagination - parent handles pagination logic
  pagination?: {
    enabled: boolean;
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  
  // Styling
  className?: string;
  emptyMessage?: string;
}

// Helper function to get nested values
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

export default function GenericTable<T extends Record<string, any>>({
  data,
  filteredData,
  columns,
  rowKey,
  actions = [],
  filters = [],
  filterValues = {},
  onFilterChange,
  onResetFilters,
  loading = false,
  error = null,
  onRetry,
  onRowClick,
  pagination,
  className = '',
  emptyMessage = 'No data found'
}: GenericTableProps<T>) {
  const [showFilters, setShowFilters] = useState(false);

  // Check if filters are active
  const hasActiveFilters = Object.values(filterValues).some(value => 
    value !== '' && value !== null && value !== undefined
  );

  // Get paginated data
  const displayData = pagination?.enabled ? filteredData : filteredData;

  // Calculate pagination info
  const startEntry = pagination?.enabled 
    ? (pagination.currentPage - 1) * pagination.pageSize + 1 
    : 1;
  const endEntry = pagination?.enabled 
    ? Math.min(pagination.currentPage * pagination.pageSize, filteredData.length)
    : filteredData.length;

  // Page size options
  const pageSizeOptions = [10, 25, 50, 100];

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!pagination) return [];
    
    const { currentPage, totalPages } = pagination;
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxVisiblePages / 2);
      let start = Math.max(currentPage - half, 1);
      let end = Math.min(start + maxVisiblePages - 1, totalPages);
      
      if (end - start + 1 < maxVisiblePages) {
        start = Math.max(end - maxVisiblePages + 1, 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Filter Section */}
      {filters.length > 0 && (
        <>
          <div className="flex flex-wrap p-4 gap-2 border-b border-gray-200">
            <div
              className="border rounded-lg p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} className="text-gray-600" />
            </div>

            {/* Render filter inputs */}
            {filters.map(filter => (
              <div key={filter.key} className="border rounded-lg bg-gray-50 hover:bg-gray-100 flex-grow max-w-xs">
                {filter.type === 'text' && (
                  <div className="flex items-center px-4 py-2">
                    <input
                      type="text"
                      placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
                      value={filterValues[filter.key] || ''}
                      onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                      className="bg-transparent outline-none text-gray-700 placeholder-gray-500 w-full"
                    />
                  </div>
                )}
                
                {filter.type === 'select' && (
                  <select
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                    className="w-full px-4 py-2 bg-transparent outline-none text-gray-700"
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}

            {/* Reset Filters Button */}
            {hasActiveFilters && onResetFilters && (
              <button
                className="flex items-center text-red-500 hover:text-red-600 px-3 py-2 transition-colors"
                onClick={onResetFilters}
              >
                <X size={16} className="mr-1" />
                Reset Filters
              </button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="p-4 border-b border-gray-200 flex flex-wrap gap-2">
              {filters.map(filter => {
                const value = filterValues[filter.key];
                if (!value) return null;
                
                return (
                  <span key={filter.key} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {filter.label}: {String(value)}
                    <button
                      onClick={() => onFilterChange?.(filter.key, '')}
                      className="ml-2 hover:text-blue-600"
                    >
                      <X size={14} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Table Header Info */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            Showing {startEntry} to {endEntry} of {filteredData.length} entries
            {filteredData.length !== data.length && (
              <span className="text-gray-500"> (filtered from {data.length} total entries)</span>
            )}
          </span>
        </div>
        
        {pagination?.enabled && pagination.onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-sm text-gray-700">entries</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            <AlertCircle className="mx-auto mb-2" size={32} />
            <p className="font-medium">{error}</p>
            {onRetry && (
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                onClick={onRetry}
              >
                Retry
              </button>
            )}
          </div>
        ) : displayData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>{emptyMessage}{hasActiveFilters ? ' matching your filters' : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={String(column.key)}
                      className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider"
                      style={{ width: column.width }}
                    >
                      {column.title}
                    </th>
                  ))}
                  {actions.length > 0 && (
                    <th className="text-xs font-semibold text-gray-600 uppercase px-6 py-3 text-left tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {displayData.map((record, index) => (
                  <tr
                    key={String(record[rowKey])}
                    className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-6 py-4 whitespace-nowrap">
                        {column.render
                          ? column.render(getNestedValue(record, String(column.key)), record, index)
                          : <span className="text-sm text-gray-900">
                              {String(getNestedValue(record, String(column.key)) || '')}
                            </span>
                        }
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          {actions.map((action) => (
                            <button
                              key={action.key}
                              className={`p-1 rounded-full transition-colors ${action.className || 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(record, index);
                              }}
                              title={action.label}
                            >
                              {action.icon}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination?.enabled && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              className="flex items-center px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page) => (
              <button
                key={page}
                className={`px-3 py-2 text-sm rounded border transition-colors ${
                  pagination.currentPage === page
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => pagination.onPageChange(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="flex items-center px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
