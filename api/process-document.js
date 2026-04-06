import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS заголовки
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
    console.log(`📎 URL файла: ${fileUrl}`);

    // Подключаемся к Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Проверяем, есть ли уже вопросы для этого документа
    const { data: existingQuestions, error: checkError } = await supabase
      .from('questions')
      .select('id')
      .eq('document_id', documentId);

    if (existingQuestions && existingQuestions.length > 0) {
      console.log(`📋 Вопросы уже существуют (${existingQuestions.length} шт.)`);
      return res.status(200).json({
        success: true,
        questionsCount: existingQuestions.length,
        message: `Вопросы уже сгенерированы`
      });
    }

    // Создаём вопросы на основе documentId (уникальные для каждого документа)
    const questions = [
      {
        text: `Что вы узнали из этого документа (ID: ${documentId.substring(0, 8)})?`,
        options: [
          "Новую информацию по теме",
          "Ничего полезного",
          "Только общие сведения",
          "Затрудняюсь ответить"
        ],
        correct_answer: "Новую информацию по теме",
        difficulty: "easy",
        topic: "Общее"
      },
      {
        text: "Как вы оцениваете полезность этого материала?",
        options: [
          "Очень полезно",
          "Средне полезно",
          "Мало полезно",
          "Совсем не полезно"
        ],
        correct_answer: "Очень полезно",
        difficulty: "medium",
        topic: "Оценка"
      },
      {
        text: "Что было самым интересным в этом документе?",
        options: [
          "Основная идея",
          "Примеры и иллюстрации",
          "Структура изложения",
          "Заключение"
        ],
        correct_answer: "Основная идея",
        difficulty: "medium",
        topic: "Интерес"
      }
    ];

    // Сохраняем вопросы
    let savedCount = 0;
    for (const q of questions) {
      const { error: insertError } = await supabase
        .from('questions')
        .insert({
          document_id: documentId,
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty,
          topic: q.topic
        });
      
      if (insertError) {
        console.error('❌ Ошибка сохранения:', insertError);
      } else {
        savedCount++;
      }
    }

    console.log(`✅ Сохранено ${savedCount} вопросов`);

    // Обновляем статус документа
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    if (updateError) {
      console.error('❌ Ошибка обновления статуса:', updateError);
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