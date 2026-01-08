/**
 * Utility functions for ordering contact fields based on original file column order.
 */

/**
 * Sort field names according to the original file column order.
 * Fields not in column_order are appended at the end in their original order.
 *
 * @param fields - Array of field names to sort
 * @param columnOrder - Optional array defining the desired order (from metadata)
 * @returns Sorted array of field names
 *
 * @example
 * const fields = ['Email', 'Name', 'Phone'];
 * const columnOrder = ['Name', 'Phone', 'Email'];
 * sortFieldsByColumnOrder(fields, columnOrder);
 * // Returns: ['Name', 'Phone', 'Email']
 */
export function sortFieldsByColumnOrder(
  fields: string[],
  columnOrder?: string[]
): string[] {
  if (!columnOrder || columnOrder.length === 0) {
    return fields;
  }

  // Create a map of field name → original index
  const orderMap = new Map<string, number>();
  columnOrder.forEach((field, index) => {
    orderMap.set(field, index);
  });

  // Sort fields based on column_order, with unknowns at the end
  return [...fields].sort((a, b) => {
    const indexA = orderMap.get(a) ?? Number.MAX_SAFE_INTEGER;
    const indexB = orderMap.get(b) ?? Number.MAX_SAFE_INTEGER;
    return indexA - indexB;
  });
}
