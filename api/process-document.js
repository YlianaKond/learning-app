export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Используй POST' });
  }

  try {
    const { fileUrl, documentId, userId } = req.body;
    
    console.log(`📥 Получен запрос: ${documentId}`);

    return res.status(200).json({
      success: true,
      questionsCount: 3,
      message: 'Vercel Worker обработал запрос!'
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}