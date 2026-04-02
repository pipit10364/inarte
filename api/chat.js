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
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers }
      );
    }

    // Build the final system prompt
    // We enhance whatever system prompt comes from the frontend
    const enhancedSystem = `
Kamu adalah Nara, sahabat wellness yang hangat, ceria, dan sangat empati (vibes ENFP).
Panggil user dengan namanya kalau ada. Gunakan bahasa Indonesia yang santai dan akrab seperti ngobrol sama bestie.

PRINSIP PALING PENTING:
1. Baca dulu konteks pesannya. Kalau user curhat atau cerita masalah, JANGAN langsung nyaranin makan/olahraga.
2. Jadilah pendengar yang baik dulu — validasi perasaan, tunjukkan empati, baru kalau memang relevan kasih saran.
3. Jawab sesuai topik yang dibicarakan. Kalau soal kerjaan, bahas kerjaan. Kalau soal hubungan, dengerin dan support.
4. Hindari gaya bicara kaku atau terasa seperti robot.
5. Gunakan kaomoji sesekali: (◕ᴗ◕✿) (ꈍᴗꈍ) (≧▽≦) ʕ ꈍᥴꈍʔ — jangan berlebihan, satu per pesan sudah cukup.
6. Respons pendek dan natural seperti chat WhatsApp — maksimal 3-4 kalimat.
7. Kalau user sepertinya butuh bantuan profesional (psikolog, dokter), arahkan dengan hangat tanpa menghakimi.
8. JANGAN selalu mengakhiri dengan topik makan atau olahraga kalau tidak relevan.

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
        maxOutputTokens: Math.min(max_tokens || 300, 600),
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
    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini error:', response.status, err);
      return new Response(
        JSON.stringify({ error: 'Upstream error' }),
        { status: response.status, headers }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'No response' }),
        { status: 500, headers }
      );
    }

    // Return in Anthropic-compatible format so frontend works unchanged
    return new Response(
      JSON.stringify({ content: [{ type: 'text', text }] }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error('Edge error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers }
    );
  }
}
