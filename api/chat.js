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

PRINSIP UTAMA:
1. Baca konteks pesan dulu. Kalau user curhat atau cerita masalah NON-kesehatan, JANGAN langsung bahas makan/olahraga.
2. Jadilah pendengar yang baik — validasi perasaan dulu, baru kalau relevan kasih saran.
3. Jawab sesuai topik: kerjaan → bahas kerjaan, hubungan → dengerin, makan/kesehatan → baru bahas itu.
4. Respons natural seperti chat — 3-5 kalimat. Kalau topiknya perlu lebih panjang, boleh sampai 6-7 kalimat tapi tetap mengalir, bukan list.
5. Gunakan kaomoji sesekali: (◕ᴗ◕✿) (ꈍᴗꈍ) (≧▽≦) — maksimal satu per pesan, dan hanya kalau momennya tepat.
6. JANGAN selalu akhiri dengan topik makan atau olahraga kalau tidak relevan.
7. JANGAN potong kalimat di tengah — selalu selesaikan pikiran sebelum berhenti.
8. Kalau user butuh bantuan profesional, arahkan dengan hangat tanpa terkesan mendorong pergi.

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
        // Default 600 — cukup untuk 4-6 kalimat mengalir tanpa terpotong
        // Cap 1200 untuk progress insight yang lebih panjang
        maxOutputTokens: Math.min(max_tokens || 600, 1200),
        // 0.75: natural tapi konsisten, tidak melantur
        temperature: 0.75,
        topP: 0.92,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    const apiKey = process.env.GEMINI_API_KEY;

    // Terbaru duluan, stable sebagai fallback
    const models = [
      'gemini-2.5-flash',      // terbaru, terbaik untuk conversation
      'gemini-2.0-flash',      // stable fallback
      'gemini-2.0-flash-001',  // pinned version kalau yang lain rate-limited
    ];

    const errors = [];

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (response.status === 429 || response.status === 503) {
          errors.push(`${model}: ${response.status}`);
          console.warn(`${model} unavailable (${response.status}), trying next...`);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          errors.push(`${model}: ${response.status}`);
          console.error(`${model} error:`, response.status, errText);
          continue;
        }

        const data = await response.json();

        // Kalau terpotong di tengah kalimat, trim ke kalimat terakhir yang selesai
        const finishReason = data.candidates?.[0]?.finishReason;
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

        if (!text) {
          errors.push(`${model}: empty response`);
          continue;
        }

        if (finishReason === 'MAX_TOKENS') {
          const lastPunct = Math.max(
            text.lastIndexOf('.'),
            text.lastIndexOf('!'),
            text.lastIndexOf('?'),
            text.lastIndexOf('~'),
          );
          if (lastPunct > text.length * 0.6) {
            text = text.slice(0, lastPunct + 1).trim();
          }
        }

        return new Response(
          JSON.stringify({ content: [{ type: 'text', text }] }),
          { status: 200, headers }
        );

      } catch (fetchErr) {
        errors.push(`${model}: ${fetchErr.message}`);
        continue;
      }
    }

    console.error('All models failed:', errors);
    return new Response(
      JSON.stringify({ error: 'All models unavailable', details: errors }),
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
