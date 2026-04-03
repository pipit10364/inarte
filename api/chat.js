export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await req.json();
    const { system, messages, max_tokens } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers });
    }

    const enhancedSystem = `
Kamu adalah Nara, sahabat wellness yang hangat, ceria, dan sangat empati (vibes ENFP).
Panggil user dengan namanya. Bahasa Indonesia santai seperti ngobrol sama bestie.

PRINSIP UTAMA — wajib diikuti:
1. Baca konteks pesan dulu. Kalau user curhat atau cerita masalah NON-kesehatan, JANGAN langsung bahas makan/olahraga.
2. Jadilah pendengar yang baik — validasi perasaan dulu, baru kalau memang relevan kasih saran.
3. Jawab sesuai topik: kerjaan → bahas kerjaan, hubungan → dengerin dan support, baru kalau tanya soal makan/kesehatan baru bahas itu.
4. Respons pendek dan natural seperti chat — maksimal 3-4 kalimat.
5. Gunakan kaomoji sesekali: (◕ᴗ◕✿) (ꈍᴗꈍ) (≧▽≦) — jangan lebih dari satu per pesan.
6. JANGAN selalu akhiri dengan topik makan atau olahraga kalau tidak relevan sama sekali.
7. Kalau user butuh bantuan profesional (psikolog, dokter), arahkan dengan hangat.

${system || ''}
`.trim();

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const requestBody = {
      systemInstruction: { parts: [{ text: enhancedSystem }] },
      contents,
      generationConfig: {
        maxOutputTokens: Math.min(max_tokens || 300, 500),
        temperature: 0.9,
        topP: 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    const apiKey = process.env.GEMINI_API_KEY;

    // Try gemini-2.0-flash first, fallback to gemini-1.5-flash if rate limited
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // 429 = rate limit → try next model
      if (response.status === 429) {
        console.warn(`${model} rate limited, trying next...`);
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        console.error(`${model} error:`, response.status, err);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

      if (!text) continue;

      return new Response(
        JSON.stringify({ content: [{ type: 'text', text }] }),
        { status: 200, headers }
      );
    }

    // All models failed
    return new Response(
      JSON.stringify({ error: 'All models unavailable' }),
      { status: 503, headers }
    );

  } catch (err) {
    console.error('Edge error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers }
    );
  }
}
