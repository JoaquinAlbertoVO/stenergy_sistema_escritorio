import Papa from 'papaparse';

// URL for CSV Export of the Google Sheet "general vista"
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1OSBY9KyChXMlpuUIb5uIfdIhNsO9XWVdrc5nDHAxz84/export?format=csv&gid=362041156';

/**
 * Fetches the data from the Google Sheet and parses it.
 * Note: Since the sheet is visually formatted with empty columns and multiple tables,
 * the parsed JSON will be a raw 2D array representation.
 */
export const fetchGoogleSheetData = () => {
  return new Promise((resolve, reject) => {
    Papa.parse(SHEET_CSV_URL, {
      download: true,
      header: false, // We use false because there are no clear headers in the first row due to the dashboard layout
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
