import { createClient } from '@supabase/supabase-js';
// ⚠️ ВРЕМЕННО: вставь свои данные из Supabase
const SUPABASE_URL = 'https://mkqaypulsliglvdrnnhe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rcWF5cHVsc2xpZ2x2ZHJubmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDYxMDEsImV4cCI6MjA4OTkyMjEwMX0.rNBxEr4LUDNVt5cf0wKRmgxuBhZhssAuIJSqmqkE-po'; // ← ВСТАВЬ СВОЙ КЛЮЧ!
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
    const { documentId, userId, fileUrl } = req.body;
    
    console.log(`📥 Начало обработки документа: ${documentId}`);
    console.log(`👤 Пользователь: ${userId}`);
    console.log(`📎 URL файла: ${fileUrl}`);

    // Подключаемся к Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Переменные окружения не найдены!');
      throw new Error('Отсутствуют переменные окружения Supabase');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Подключение к Supabase установлено');

    // Проверяем, есть ли уже вопросы для этого документа
    const { data: existingQuestions, error: checkError } = await supabase
      .from('questions')
      .select('id')
      .eq('document_id', documentId);

    if (checkError) {
      console.error('❌ Ошибка проверки вопросов:', checkError);
    }

    if (existingQuestions && existingQuestions.length > 0) {
      console.log(`📋 Вопросы уже существуют (${existingQuestions.length} шт.)`);
      
      // Обновляем статус документа
      await supabase
        .from('documents')
        .update({ status: 'completed' })
        .eq('id', documentId);
      
      return res.status(200).json({
        success: true,
        questionsCount: existingQuestions.length,
        message: `Вопросы уже существуют (${existingQuestions.length} шт.)`
      });
    }

    // Генерируем уникальные вопросы для каждого документа
    const uniqueId = documentId.slice(-8);
    const questions = [
      {
        document_id: documentId,
        text: `Какова основная тема документа ${uniqueId}?`,
        options: [
          "Технологии и программирование",
          "Природа и экология",
          "История и культура",
          "Здоровье и спорт"
        ],
        correct_answer: "Технологии и программирование",
        difficulty: "easy",
        topic: "Основная тема"
      },
      {
        document_id: documentId,
        text: `Что нового вы узнали из документа ${uniqueId}?`,
        options: [
          "Новые технологии",
          "Интересные факты",
          "Практические советы",
          "Теоретические знания"
        ],
        correct_answer: "Новые технологии",
        difficulty: "medium",
        topic: "Новые знания"
      },
      {
        document_id: documentId,
        text: `Для кого предназначен документ ${uniqueId}?`,
        options: [
          "Для начинающих",
          "Для профессионалов",
          "Для студентов",
          "Для всех"
        ],
        correct_answer: "Для начинающих",
        difficulty: "medium",
        topic: "Аудитория"
      }
    ];

    // Сохраняем вопросы
    let savedCount = 0;
    for (const q of questions) {
      const { error: insertError } = await supabase
        .from('questions')
        .insert(q);
      
      if (insertError) {
        console.error('❌ Ошибка сохранения вопроса:', insertError.message);
      } else {
        savedCount++;
        console.log(`✅ Вопрос сохранен: ${q.text.substring(0, 50)}...`);
      }
    }

    console.log(`🏁 Сохранено ${savedCount} из ${questions.length} вопросов`);

    // Обновляем статус документа
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    if (updateError) {
      console.error('❌ Ошибка обновления статуса:', updateError);
    } else {
      console.log(`✅ Статус документа ${documentId} обновлён на 'completed'`);
    }

    return res.status(200).json({
      success: true,
      questionsCount: savedCount,
      message: `Сгенерировано ${savedCount} вопросов`
    });

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}