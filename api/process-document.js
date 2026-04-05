import { createClient } from '@supabase/supabase-js';

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
    
    console.log(`📥 Получен запрос: documentId=${documentId}`);

    // Подключаемся к Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // Тестовые вопросы (заменишь на ИИ позже)
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

    // 1. Сохраняем вопросы
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

    console.log(`✅ Сохранено ${savedCount} вопросов`);

    // 2. ОБНОВЛЯЕМ СТАТУС ДОКУМЕНТА — ЭТО САМОЕ ВАЖНОЕ!
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    if (updateError) {
      console.error(`❌ Ошибка обновления статуса: ${updateError.message}`);
    } else {
      console.log(`✅ Статус документа ${documentId} обновлён на 'completed'`);
    }

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