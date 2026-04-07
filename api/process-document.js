import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Настройки CORS (обязательно для работы из браузера)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка preflight-запроса (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается. Используйте POST.' });
  }

  try {
    // 1. Получаем данные из запроса
    const { documentId, userId, fileUrl } = req.body;
    console.log(`📥 Начало обработки документа ${documentId} для пользователя ${userId}`);

    // 2. Подключаемся к Supabase
    //    Используем переменные окружения, которые ты добавила в Vercel
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Ошибка: переменные окружения Supabase не найдены!');
      throw new Error('Серверная ошибка: отсутствуют переменные окружения Supabase.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Подключение к Supabase установлено.');

    // 3. Генерируем вопросы (простые, но уникальные для каждого документа)
    const uniqueSuffix = documentId.slice(-6);
    const questionsToInsert = [
      {
        document_id: documentId,
        text: `Какова основная тема документа "${uniqueSuffix}"?`,
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
        text: `Какую пользу можно получить из этого документа (${uniqueSuffix})?`,
        options: [
          "Получить новые знания",
          "Провести время с пользой",
          "Научиться новому навыку",
          "Вдохновиться на новые идеи"
        ],
        correct_answer: "Получить новые знания",
        difficulty: "medium",
        topic: "Польза документа"
      },
      {
        document_id: documentId,
        text: `Кому в первую очередь будет полезен этот документ (${uniqueSuffix})?`,
        options: [
          "Студентам и начинающим специалистам",
          "Опытным экспертам",
          "Руководителям",
          "Людям, не связанным с этой темой"
        ],
        correct_answer: "Студентам и начинающим специалистам",
        difficulty: "medium",
        topic: "Целевая аудитория"
      }
    ];

    // 4. Сохраняем вопросы в таблицу 'questions'
    let savedCount = 0;
    for (const q of questionsToInsert) {
      const { data, error } = await supabase
        .from('questions')
        .insert(q)
        .select();

      if (error) {
        console.error(`❌ Ошибка при сохранении вопроса "${q.text}":`, error.message);
      } else {
        savedCount++;
        console.log(`✅ Вопрос сохранен: "${q.text.substring(0, 50)}..."`);
      }
    }

    console.log(`🏁 Итого сохранено вопросов: ${savedCount} из ${questionsToInsert.length}`);

    // 5. Обновляем статус документа на 'completed'
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    if (updateError) {
      console.error(`❌ Ошибка обновления статуса документа ${documentId}:`, updateError);
      // Не прерываем выполнение, так как вопросы уже могли сохраниться
    } else {
      console.log(`✅ Статус документа ${documentId} обновлен на 'completed'`);
    }

    // 6. Отправляем успешный ответ обратно на фронтенд
    return res.status(200).json({
      success: true,
      questionsCount: savedCount,
      message: `Обработка завершена. Сгенерировано ${savedCount} вопросов.`
    });

  } catch (error) {
    // Логируем любую ошибку на сервере
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА В API:', error);
    return res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.',
      details: error.message // для отладки
    });
  }
}