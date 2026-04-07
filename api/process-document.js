import { createClient } from '@supabase/supabase-js';

// ТВОИ ДАННЫЕ (скопируй из Supabase)
const supabaseUrl = 'https://mkqaypulsliglvdrnnhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rcWF5cHVsc2xpZ2x2ZHJubmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDYxMDEsImV4cCI6MjA4OTkyMjEwMX0.rNBxEr4LUDNVt5cf0wKRmgxuBhZhssAuIJSqmqkE-po'; // ЗАМЕНИ НА СВОЙ АНОНИМНЫЙ КЛЮЧ!

export default async function handler(req, res) {
  // Разрешаем запросы с любого источника (CORS)
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
    console.log(`📥 Обработка документа: ${documentId}`);

    // Подключаемся к Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. ПРОВЕРКА: Можем ли мы вообще прочитать таблицу documents?
    const { data: testData, error: testError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Ошибка подключения к Supabase:', testError);
      throw new Error(`Ошибка БД: ${testError.message}`);
    }
    console.log('✅ Подключение к Supabase работает!');

    // 2. Проверяем, есть ли уже вопросы для этого документа
    const { data: existingQuestions, error: checkError } = await supabase
      .from('questions')
      .select('id')
      .eq('document_id', documentId);

    if (existingQuestions && existingQuestions.length > 0) {
      console.log(`📋 Вопросы уже есть (${existingQuestions.length})`);
      await supabase.from('documents').update({ status: 'completed' }).eq('id', documentId);
      return res.status(200).json({ success: true, questionsCount: existingQuestions.length });
    }

    // 3. Создаём вопросы
    const questions = [
      {
        document_id: documentId,
        text: "Какова основная тема этого документа?",
        options: ["Технологии", "Природа", "История", "Искусство"],
        correct_answer: "Технологии",
        difficulty: "easy",
        topic: "Тема"
      },
      {
        document_id: documentId,
        text: "Какую пользу можно получить из этого документа?",
        options: ["Новые знания", "Развлечение", "Рекламу", "Никакую"],
        correct_answer: "Новые знания",
        difficulty: "medium",
        topic: "Польза"
      },
      {
        document_id: documentId,
        text: "Кому будет полезен этот материал?",
        options: ["Студентам", "Профессионалам", "Всем", "Детям"],
        correct_answer: "Студентам",
        difficulty: "medium",
        topic: "Аудитория"
      }
    ];

    let savedCount = 0;
    for (const q of questions) {
      const { error: insertError } = await supabase.from('questions').insert(q);
      if (insertError) {
        console.error('❌ Ошибка вставки:', insertError);
      } else {
        savedCount++;
      }
    }

    console.log(`✅ Сохранено ${savedCount} вопросов`);

    // 4. Обновляем статус документа
    await supabase.from('documents').update({ status: 'completed' }).eq('id', documentId);

    return res.status(200).json({ success: true, questionsCount: savedCount });

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}