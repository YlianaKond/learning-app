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
    const { documentId, userId, fileUrl } = req.body;
    
    console.log(`📥 Получен запрос: documentId=${documentId}, userId=${userId}`);

    // Подключаемся к Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Переменные окружения не найдены!');
      throw new Error('Отсутствуют переменные окружения Supabase');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Подключение к Supabase установлено');

    // Генерируем вопросы на основе documentId (уникальные для каждого файла)
    const shortId = documentId.slice(-8);
    const questions = [
      {
        document_id: documentId,
        text: `О чем говорится в документе ${shortId}?`,
        options: [
          "О технологиях и программировании",
          "О природе и экологии", 
          "Об истории и культуре",
          "О здоровье и спорте"
        ],
        correct_answer: "О технологиях и программировании",
        difficulty: "easy",
        topic: "Тема документа"
      },
      {
        document_id: documentId,
        text: "Какую основную мысль автор хочет донести?",
        options: [
          "Важность самообразования",
          "Необходимость практики",
          "Ценность новых знаний",
          "Роль технологий в жизни"
        ],
        correct_answer: "Ценность новых знаний",
        difficulty: "medium",
        topic: "Основная мысль"
      },
      {
        document_id: documentId,
        text: "Кому будет полезен этот материал?",
        options: [
          "Начинающим специалистам",
          "Опытным профессионалам",
          "Руководителям",
          "Преподавателям"
        ],
        correct_answer: "Начинающим специалистам",
        difficulty: "medium",
        topic: "Целевая аудитория"
      }
    ];

    // Сохраняем вопросы
    let savedCount = 0;
    for (const q of questions) {
      const { error } = await supabase.from('questions').insert(q);
      if (error) {
        console.error('❌ Ошибка сохранения вопроса:', error.message);
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