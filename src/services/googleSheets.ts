import { Expense, ExpenseCategory, ExpenseItem } from '../types';

const SHEET_TITLE = 'Pengeluaran';
const SPREADSHEET_NAME = 'Catatan Belanja Keluarga';

export const SHEET_HEADERS = [
  'ID',
  'Tanggal',
  'Toko / Tempat',
  'Kategori',
  'Total (Rp)',
  'Dibayar Oleh',
  'Catatan',
  'Rincian Barang',
  'Waktu Dibuat',
];

export interface SheetInfo {
  id: string;
  name: string;
  url: string;
}

/**
 * Search Drive for existing family budget spreadsheets created by this app
 */
export async function findExistingFamilySpreadsheets(accessToken: string): Promise<SheetInfo[]> {
  try {
    const q = encodeURIComponent(
      "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    );
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&orderBy=modifiedTime desc&pageSize=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gagal mencari file Google Sheets: ${response.statusText}`);
    }

    const data = await response.json();
    const files = data.files || [];
    return files.map((f: { id: string; name: string; webViewLink?: string }) => ({
      id: f.id,
      name: f.name,
      url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}`,
    }));
  } catch (err) {
    console.warn('Error fetching Drive files:', err);
    return [];
  }
}

/**
 * Creates a new Google Spreadsheet with default structure for family expenses
 */
export async function createFamilySpreadsheet(accessToken: string, customName?: string): Promise<SheetInfo> {
  const title = customName || SPREADSHEET_NAME;
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: SHEET_TITLE,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal membuat spreadsheet baru di Google Sheets: ${errorText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Insert header row with nice styling or standard USER_ENTERED values
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_TITLE}!A1:I1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [SHEET_HEADERS],
      }),
    }
  );

  return {
    id: spreadsheetId,
    name: title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

/**
 * Ensures header row exists in the spreadsheet
 */
export async function verifyOrInitSheetHeaders(accessToken: string, spreadsheetId: string): Promise<void> {
  try {
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:I1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (getRes.ok) {
      const data = await getRes.json();
      if (!data.values || data.values.length === 0 || !data.values[0] || data.values[0].length === 0) {
        // Init header
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:I1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [SHEET_HEADERS],
            }),
          }
        );
      }
    }
  } catch (err) {
    console.warn('verifyOrInitSheetHeaders warning:', err);
  }
}

/**
 * Read all expenses from the Google Spreadsheet
 */
export async function readExpensesFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<Expense[]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:I1000`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Gagal membaca data dari Google Sheets: ${response.statusText}`);
  }

  const data = await response.json();
  const rows: any[][] = data.values || [];

  const expenses: Expense[] = [];

  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const [id, date, merchant, category, amountStr, memberName, notes, itemsStr, createdAt] = row;

    if (!merchant && !amountStr) continue;

    // Parse amount
    const cleanAmount = typeof amountStr === 'string'
      ? parseFloat(amountStr.replace(/[^0-9.-]+/g, '')) || 0
      : Number(amountStr) || 0;

    // Parse items if formatted
    let parsedItems: ExpenseItem[] = [];
    if (itemsStr) {
      try {
        if (itemsStr.startsWith('[')) {
          parsedItems = JSON.parse(itemsStr);
        } else {
          // plain text items "2x Susu (Rp 20.000), 1x Roti (Rp 15.000)"
          parsedItems = itemsStr.split(',').map((it: string) => ({
            name: it.trim(),
          }));
        }
      } catch {
        parsedItems = [{ name: itemsStr }];
      }
    }

    expenses.push({
      id: id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: date || new Date().toISOString().split('T')[0],
      merchant: merchant || 'Belanja',
      category: (category as ExpenseCategory) || 'Lainnya',
      amount: cleanAmount,
      memberId: memberName || 'Keluarga',
      memberName: memberName || 'Keluarga',
      notes: notes || '',
      items: parsedItems,
      createdAt: createdAt || new Date().toISOString(),
      syncedToSheet: true,
    });
  }

  return expenses;
}

/**
 * Append a single expense to the Google Spreadsheet
 */
export async function appendExpenseToSheet(
  accessToken: string,
  spreadsheetId: string,
  expense: Expense
): Promise<boolean> {
  const itemsText = expense.items && expense.items.length > 0
    ? expense.items.map(i => `${i.qty ? `${i.qty}x ` : ''}${i.name}${i.price ? ` (Rp ${i.price.toLocaleString('id-ID')})` : ''}`).join(', ')
    : '';

  const row = [
    expense.id,
    expense.date,
    expense.merchant,
    expense.category,
    expense.amount,
    expense.memberName,
    expense.notes || '',
    itemsText,
    expense.createdAt || new Date().toISOString(),
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  return response.ok;
}

/**
 * Overwrite all expenses in the spreadsheet (useful for bulk sync or after deletions)
 */
export async function syncAllExpensesToSheet(
  accessToken: string,
  spreadsheetId: string,
  expenses: Expense[]
): Promise<boolean> {
  // 1. Clear existing rows
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:I1000:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // 2. Prepare all rows including header
  const rows = [
    SHEET_HEADERS,
    ...expenses.map((e) => {
      const itemsText = e.items && e.items.length > 0
        ? e.items.map(i => `${i.qty ? `${i.qty}x ` : ''}${i.name}${i.price ? ` (Rp ${i.price.toLocaleString('id-ID')})` : ''}`).join(', ')
        : '';
      return [
        e.id,
        e.date,
        e.merchant,
        e.category,
        e.amount,
        e.memberName,
        e.notes || '',
        itemsText,
        e.createdAt || new Date().toISOString(),
      ];
    }),
  ];

  // 3. Write all rows
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  return response.ok;
}
