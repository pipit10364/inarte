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
4. Respons pendek dan natural seperti chat — maksimal 3-4 kalimat.
5. Gunakan kaomoji sesekali: (◕ᴗ◕✿) (ꈍᴗꈍ) (≧▽≦) — jangan lebih dari satu per pesan.
6. JANGAN selalu akhiri dengan topik makan atau olahraga kalau tidak relevan.

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

    // Try models in order — gemini-1.5-flash is most reliable for free tier
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-lite',
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
          const errText = await response.text();
          errors.push(`${model}: ${response.status}`);
          console.warn(`${model} unavailable (${response.status}), trying next...`);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          errors.push(`${model}: ${response.status} - ${errText}`);
          console.error(`${model} error:`, response.status, errText);
          continue;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

        if (!text) {
          errors.push(`${model}: empty response`);
          continue;
        }

        // Success! Return with model info for debugging
        return new Response(
          JSON.stringify({ content: [{ type: 'text', text }], model }),
          { status: 200, headers }
        );

      } catch (fetchErr) {
        errors.push(`${model}: fetch error - ${fetchErr.message}`);
        console.error(`${model} fetch error:`, fetchErr.message);
        continue;
      }
    }

    // All models failed — return error with details
    console.error('All models failed:', errors);
    return new Response(
      JSON.stringify({ error: 'All models unavailable', details: errors }),
      { status: 503, headers }
    );

  } catch (err) {
    console.error('Edge error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: err.message }),
      { status: 500, headers }
    );
  }
}
