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

    // 1. Скачиваем файл
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Ошибка загрузки: ${response.status}`);
    }
    
    const text = await response.text();
    console.log(`📄 Текст файла (первые 200 символов): ${text.substring(0, 200)}`);
    
    if (!text || text.length < 50) {
      throw new Error('Файл слишком короткий или не содержит текста');
    }

    // 2. Генерируем вопросы из текста
    const questions = generateQuestionsFromText(text);
    console.log(`✅ Сгенерировано ${questions.length} вопросов`);

    // 3. Подключаемся к Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // 4. Удаляем старые вопросы
    await supabase.from('questions').delete().eq('document_id', documentId);

    // 5. Сохраняем новые вопросы
    let savedCount = 0;
    for (const q of questions) {
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
      
      if (error) {
        console.error('Ошибка сохранения:', error);
      } else {
        savedCount++;
      }
    }

    console.log(`✅ Сохранено ${savedCount} вопросов`);

    // 6. Обновляем статус документа
    await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

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

// Функция генерации вопросов из текста
function generateQuestionsFromText(text) {
  const questions = [];
  
  // Разбиваем текст на предложения
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences.length >= 3) {
    // Вопрос 1
    questions.push({
      text: `О чем говорится в начале текста: "${sentences[0].substring(0, 60)}..."?`,
      options: [
        "Это основная тема документа",
        "Это второстепенная деталь",
        "Это введение в тему",
        "Это заключение"
      ],
      correct_answer: "Это основная тема документа",
      difficulty: "easy",
      topic: "Основная идея"
    });
    
    // Вопрос 2
    if (sentences[1]) {
      questions.push({
        text: `Что автор говорит о "${getKeyword(sentences[1])}"?`,
        options: [
          "Это важно для понимания темы",
          "Это не имеет значения",
          "Это противоречит основной идее",
          "Это повторение уже сказанного"
        ],
        correct_answer: "Это важно для понимания темы",
        difficulty: "medium",
        topic: "Ключевые моменты"
      });
    }
    
    // Вопрос 3
    questions.push({
      text: "Какова основная цель этого документа?",
      options: [
        "Проинформировать читателя",
        "Развлечь читателя",
        "Продать продукт",
        "Запутать читателя"
      ],
      correct_answer: "Проинформировать читателя",
      difficulty: "medium",
      topic: "Цель документа"
    });
  }
  
  // Если не удалось сгенерировать вопросы, добавляем стандартные
  if (questions.length === 0) {
    questions.push(
      {
        text: "О чем этот документ?",
        options: ["О технических аспектах", "О бизнес-процессах", "Об образовании", "О науке"],
        correct_answer: "Об образовании",
        difficulty: "easy",
        topic: "Общее"
      },
      {
        text: "Какую пользу можно получить из этого документа?",
        options: ["Новую информацию", "Развлечение", "Рекламу", "Никакую"],
        correct_answer: "Новую информацию",
        difficulty: "medium",
        topic: "Польза"
      },
      {
        text: "Для кого предназначен этот документ?",
        options: ["Для специалистов", "Для начинающих", "Для всех", "Для детей"],
        correct_answer: "Для всех",
        difficulty: "easy",
        topic: "Аудитория"
      }
    );
  }
  
  return questions;
}

function getKeyword(sentence) {
  const words = sentence.split(' ').filter(w => w.length > 4);
  return words.length > 0 ? words[0] : 'этот термин';
}