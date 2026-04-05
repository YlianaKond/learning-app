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
    const { documentId } = req.body;
    
    console.log(`📥 API вызван для документа: ${documentId}`);

    return res.status(200).json({
      success: true,
      questionsCount: 3,
      message: 'API работает (заглушка)'
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}