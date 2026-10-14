/** Quote cells so names containing commas, quotes or line breaks remain one cell. */
export const csvRow = (values: unknown[]) => values.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',');
