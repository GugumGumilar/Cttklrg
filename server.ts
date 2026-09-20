import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 20MB limit for receipt images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// In-memory data store for real-time family collaboration
interface FamilyState {
  expenses: any[];
  budget: number;
  members: any[];
  sheetId?: string;
  sheetName?: string;
  lastUpdated: string;
}

const familyDatabase: Record<string, FamilyState> = {};
const sseClients: Record<string, Response[]> = {};

// Helper to broadcast SSE event to all connected family members
function broadcastToFamily(familyId: string, eventData: any) {
  const clients = sseClients[familyId] || [];
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(payload);
    } catch (err) {
      console.error('SSE client write error:', err);
    }
  });
}

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Receipt OCR & Parser API with Gemini
app.post('/api/scan-receipt', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Gambar bon/struk belanja belum dikirimkan' });
    }

    // Clean base64 string if it contains data URI prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const actualMime = mimeType || 'image/jpeg';

    const ai = getAI();
    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `Anda adalah ahli ekstraksi bon/struk belanja (receipt OCR) khusus untuk manajemen pengeluaran keluarga di Indonesia.
Analisis gambar bon/struk ini dengan teliti dan ekstrak data belanjaan dalam format JSON yang valid.

Field yang wajib diekstrak:
1. "merchant": Nama toko, swalayan, minimarket, warung, atau restoran (contoh: "Indomaret", "Alfamart", "Super Indo", "Transmart", "Warung Nasi Padang", "SPBU Pertamina", "Apotek Kimia Farma", dll).
2. "date": Tanggal transaksi dalam format "YYYY-MM-DD". Jika tanggal tidak terbaca atau tidak ada tahun, perkirakan dengan masuk akal atau gunakan tahun ${currentYear} (hari ini: ${todayStr}).
3. "total": Total nominal pembayaran akhir (grand total atau total belanja) HANYA berupa angka murni tanpa simbol 'Rp' atau titik pemisah (contoh: 125000, 48500).
4. "category": Salah satu kategori paling akurat dari daftar berikut:
   - "Belanja Bulanan & Sembako" (untuk supermarket/minimarket bahan makanan mentah, bumbu, sabun, beras, minyak, dll)
   - "Makanan & Minuman" (untuk restoran, cafe, warteg, jajanan, kopi)
   - "Kebutuhan Rumah" (peralatan rumah tangga, perabotan, hardware)
   - "Transportasi & Bensin" (SPBU, bensin, tiket kereta/bus, parkir, servis)
   - "Listrik, Air & Tagihan" (token listrik, PDAM, internet, pulsa)
   - "Kesehatan & Obat" (apotek, klinik, dokter, vitamin)
   - "Pendidikan & Sekolah" (buku pelajaran, alat tulis, SPP)
   - "Hiburan & Liburan" (nonton bioskop, tempat wisata, rekreasi)
   - "Pakaian & Belanja Lain" (baju, celana, sepatu)
   - "Lainnya"
5. "items": Daftar rincian barang yang dibeli (array of object dengan format: { "name": string, "qty": number, "price": number }). Jika harga satuan tidak tertera, isi total harga baris tersebut.
6. "confidence": Tingkat keyakinan bacaan struk ("tinggi", "sedang", atau "rendah").

Berikan respon HANYA dalam format JSON:
{
  "merchant": "...",
  "date": "YYYY-MM-DD",
  "total": 123000,
  "category": "...",
  "items": [
    { "name": "...", "qty": 1, "price": 10000 }
  ],
  "confidence": "tinggi"
}`;

    // Call Gemini API with gemini-3.6-flash
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: actualMime,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (modelErr: any) {
      console.warn('Fallback to gemini-3.8-flash due to:', modelErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: actualMime,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
    }

    const responseText = response.text?.trim() || '{}';
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      // Fallback regex match if wrapped in markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Format respon AI tidak dapat dibaca sebagai JSON');
      }
    }

    return res.json({
      success: true,
      data: {
        merchant: parsedResult.merchant || 'Belanja Toko',
        date: parsedResult.date || todayStr,
        total: Number(parsedResult.total) || 0,
        category: parsedResult.category || 'Belanja Bulanan & Sembako',
        items: Array.isArray(parsedResult.items) ? parsedResult.items : [],
        confidence: parsedResult.confidence || 'sedang',
      },
    });
  } catch (err: any) {
    console.error('Scan receipt error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan saat memproses foto bon belanja',
    });
  }
});

// 3. Family State Management (for live synchronization)
app.get('/api/family/:familyId/state', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const state = familyDatabase[familyId] || {
    expenses: [],
    budget: 5000000, // Default 5 juta Rp
    members: [
      { id: 'ayah', name: 'Ayah', role: 'Kepala Keluarga', color: '#2563EB' },
      { id: 'ibu', name: 'Ibu', role: 'Pengatur Keuangan', color: '#EC4899' },
      { id: 'anak-1', name: 'Kakak', role: 'Anak', color: '#10B981' },
      { id: 'anak-2', name: 'Adik', role: 'Anak', color: '#F59E0B' },
    ],
    lastUpdated: new Date().toISOString(),
  };

  if (!familyDatabase[familyId]) {
    familyDatabase[familyId] = state;
  }

  res.json(state);
});

// Sync / Update state from a family member
app.post('/api/family/:familyId/sync', (req: Request, res: Response) => {
  const { familyId } = req.params;
  const { expenses, budget, members, sheetId, sheetName, event } = req.body;

  if (!familyDatabase[familyId]) {
    familyDatabase[familyId] = {
      expenses: [],
      budget: 5000000,
      members: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  const current = familyDatabase[familyId];

  if (Array.isArray(expenses)) {
    current.expenses = expenses;
  }
  if (typeof budget === 'number') {
    current.budget = budget;
  }
  if (Array.isArray(members)) {
    current.members = members;
  }
  if (sheetId !== undefined) {
    current.sheetId = sheetId;
  }
  if (sheetName !== undefined) {
    current.sheetName = sheetName;
  }

  current.lastUpdated = new Date().toISOString();

  // Broadcast to all other listening members
  if (event) {
    broadcastToFamily(familyId, {
      ...event,
      timestamp: new Date().toISOString(),
      updatedState: {
        expensesCount: current.expenses.length,
        budget: current.budget,
        sheetId: current.sheetId,
      },
    });
  }

  res.json({ success: true, lastUpdated: current.lastUpdated });
});

// SSE endpoint for instant real-time live events across all family devices
app.get('/api/family/:familyId/events', (req: Request, res: Response) => {
  const { familyId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!sseClients[familyId]) {
    sseClients[familyId] = [];
  }
  sseClients[familyId].push(res);

  // Send initial handshake
  res.write(
    `data: ${JSON.stringify({
      type: 'INIT',
      memberName: 'Sistem',
      timestamp: new Date().toISOString(),
      message: 'Terhubung dengan sinkronisasi real-time keluarga',
    })}\n\n`
  );

  // Periodic keepalive to prevent proxies/Cloud Run from terminating idle connection
  const keepAliveTimer = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAliveTimer);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
    sseClients[familyId] = (sseClients[familyId] || []).filter((c) => c !== res);
  });
});

// Vite Middleware & Static handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server pencatatan belanja berjalan pada http://0.0.0.0:${PORT}`);
  });
}

startServer();
