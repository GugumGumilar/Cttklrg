import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Kunci GEMINI_API_KEY belum dikonfigurasi di Environment Variables server/Vercel.',
      });
    }

    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Gambar bon/struk belanja belum dikirimkan',
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const actualMime = mimeType || 'image/jpeg';

    const ai = new GoogleGenAI({ apiKey });
    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `Anda adalah ahli ekstraksi bon/struk belanja (receipt OCR) khusus untuk manajemen pengeluaran keluarga di Indonesia.
Analisis gambar bon/struk ini dengan teliti dan ekstrak data belanjaan dalam format JSON yang valid.

Field yang wajib diekstrak:
1. "merchant": Nama toko, swalayan, minimarket, warung, atau restoran (contoh: "Indomaret", "Alfamart", "Super Indo", "Transmart", "Warung Nasi Padang", "SPBU Pertamina", "Apotek Kimia Farma", dll).
2. "date": Tanggal transaksi dalam format "YYYY-MM-DD". Jika tanggal tidak terbaca atau tidak ada tahun, perkirakan dengan masuk akal atau gunakan tahun ${currentYear} (hari ini: ${todayStr}).
3. "total": Total nominal pembayaran akhir (grand total atau total belanja) HANYA berupa angka murni tanpa simbol 'Rp' atau titik pemisah (contoh: 125000, 48500).
4. "category": Salah satu kategori paling akurat dari daftar berikut:
   - "Belanja Bulanan & Sembako"
   - "Makanan & Minuman"
   - "Kebutuhan Rumah"
   - "Transportasi & Bensin"
   - "Listrik, Air & Tagihan"
   - "Kesehatan & Obat"
   - "Pendidikan & Sekolah"
   - "Hiburan & Liburan"
   - "Pakaian & Belanja Lain"
   - "Lainnya"
5. "items": Daftar rincian barang yang dibeli (array of object dengan format: { "name": string, "qty": number, "price": number }).
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
    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Format respon AI tidak dapat dibaca sebagai JSON');
      }
    }

    return res.status(200).json({
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
    console.error('Scan receipt error in Vercel function:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan saat memproses foto bon belanja',
    });
  }
}
