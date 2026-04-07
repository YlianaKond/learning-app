import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Настройки CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается. Используйте POST.' });
  }

  try {
    const { documentId, userId, fileUrl } = req.body;
    console.log(`📥 Начало обработки документа ${documentId} для пользователя ${userId}`);

    // ПРОВЕРЯЕМ ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      console.error('❌ Ошибка: переменная SUPABASE_URL не найдена!');
      throw new Error('SUPABASE_URL is not defined');
    }
    if (!supabaseKey) {
      console.error('❌ Ошибка: переменная SUPABASE_ANON_KEY не найдена!');
      throw new Error('SUPABASE_ANON_KEY is not defined');
    }
    console.log('✅ Переменные окружения найдены.');

    // ПОДКЛЮЧАЕМСЯ К SUPABASE
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Подключение к Supabase установлено.');

    // ГЕНЕРИРУЕМ ТЕСТОВЫЕ ВОПРОСЫ
    const uniqueSuffix = documentId.slice(-6);
    const questionsToInsert = [
      {
        document_id: documentId,
        text: `Какова основная тема документа "${uniqueSuffix}"?`,
        options: ["Технологии и программирование", "Природа и экология", "История и культура", "Здоровье и спорт"],
        correct_answer: "Технологии и программирование",
        difficulty: "easy",
        topic: "Основная тема"
      },
      {
        document_id: documentId,
        text: `Какую пользу можно получить из этого документа?`,
        options: ["Получить новые знания", "Провести время с пользой", "Научиться новому навыку", "Вдохновиться на новые идеи"],
        correct_answer: "Получить новые знания",
        difficulty: "medium",
        topic: "Польза документа"
      },
      {
        document_id: documentId,
        text: `Кому в первую очередь будет полезен этот документ?`,
        options: ["Студентам и начинающим", "Опытным экспертам", "Руководителям", "Людям без опыта"],
        correct_answer: "Студентам и начинающим",
        difficulty: "medium",
        topic: "Целевая аудитория"
      }
    ];

    // СОХРАНЯЕМ ВОПРОСЫ
    let savedCount = 0;
    for (const q of questionsToInsert) {
      const { error } = await supabase.from('questions').insert(q);
      if (error) {
        console.error(`❌ Ошибка при сохранении вопроса:`, error.message);
      } else {
        savedCount++;
      }
    }
    console.log(`🏁 Итого сохранено вопросов: ${savedCount}`);

    // ОБНОВЛЯЕМ СТАТУС ДОКУМЕНТА
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    if (updateError) {
      console.error(`❌ Ошибка обновления статуса:`, updateError);
    } else {
      console.log(`✅ Статус документа ${documentId} обновлен на 'completed'`);
    }

    // ОТПРАВЛЯЕМ УСПЕШНЫЙ ОТВЕТ
    return res.status(200).json({
      success: true,
      questionsCount: savedCount,
      message: `Обработка завершена. Сгенерировано ${savedCount} вопросов.`
    });

  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА В API:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера.',
      details: error.message
    });
  }
}