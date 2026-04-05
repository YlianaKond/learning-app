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

    // Проверяем наличие ключа
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log(`🔑 SUPABASE_URL: ${supabaseUrl ? 'есть' : 'нет'}`);
    console.log(`🔑 SERVICE_ROLE_KEY: ${supabaseKey ? 'есть' : 'нет'}`);

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Отсутствуют переменные окружения Supabase');
    }

    // Подключаемся к Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Тестовые вопросы
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
      },
      {
        text: "Что такое React?",
        options: ["Язык программирования", "Библиотека для UI", "База данных", "Сервер"],
        correct_answer: "Библиотека для UI",
        difficulty: "medium",
        topic: "React"
      },
      {
        text: "Что такое API?",
        options: ["Интерфейс для взаимодействия программ", "Язык разметки", "База данных", "Операционная система"],
        correct_answer: "Интерфейс для взаимодействия программ",
        difficulty: "hard",
        topic: "Backend"
      }
    ];

    // Сохраняем вопросы
    let savedCount = 0;
    for (const q of testQuestions) {
      console.log(`💾 Сохраняем вопрос: ${q.text.substring(0, 30)}...`);
      
      const { data, error } = await supabase
        .from('questions')
        .insert({
          document_id: documentId,
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty,
          topic: q.topic
        })
        .select();

      if (error) {
        console.error(`❌ Ошибка сохранения: ${error.message}`);
      } else {
        savedCount++;
        console.log(`✅ Вопрос сохранен`);
      }
    }

    // Обновляем статус документа
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    if (updateError) {
      console.error(`❌ Ошибка обновления статуса: ${updateError.message}`);
    }

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
      error: error.message,
      stack: error.stack 
    });
  }
}