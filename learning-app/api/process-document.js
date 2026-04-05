export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS запрос (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Используй POST' });
  }

  try {
    const { fileUrl, documentId, userId } = req.body;
    
    console.log(`📥 Получен запрос: documentId=${documentId}`);

    // Тестовые вопросы (потом заменишь на реальную генерацию)
    const testQuestions = [
      {
        text: "Что такое HTML?",
        options: ["Язык программирования", "Язык разметки", "База данных", "Операционная система"],
        correct_answer: "Язык разметки",
        difficulty: "easy",
        topic: "Web"
      },
      {
        text: "Для чего используется CSS?",
        options: ["Для структуры страницы", "Для стилей и оформления", "Для серверной логики", "Для баз данных"],
        correct_answer: "Для стилей и оформления",
        difficulty: "easy",
        topic: "Web"
      },
      {
        text: "Что делает JavaScript?",
        options: ["Добавляет стили", "Добавляет интерактивность", "Создает структуру", "Управляет сервером"],
        correct_answer: "Добавляет интерактивность",
        difficulty: "medium",
        topic: "Web"
      }
    ];

    // Импортируем Supabase динамически (чтобы не было ошибок на этапе сборки)
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // Сохраняем вопросы
    let savedCount = 0;
    for (const q of testQuestions) {
      const { error } = await supabase
        .from('questions')
        .insert({
          document_id: documentId,
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty,
          topic: q.topic
        });
      
      if (!error) savedCount++;
    }

    // Обновляем статус документа
    await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    console.log(`✅ Сохранено ${savedCount} вопросов`);

    return res.status(200).json({
      success: true,
      questionsCount: savedCount,
      message: `Сгенерировано ${savedCount} вопросов`
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}