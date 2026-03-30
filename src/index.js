export default {
  async fetch(request, env, ctx) {
    // CORS заголовки (разрешают запросы из браузера)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Обработка предварительных запросов (preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Для GET запросов (когда открываешь в браузере)
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Worker работает! Отправь POST запрос для обработки файла.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Разрешаем только POST запросы
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Метод не поддерживается. Используй POST' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    try {
      // Получаем данные из запроса
      const { fileUrl, documentId, userId } = await request.json()
      
      console.log(`📥 Получен запрос: documentId=${documentId}`)
      console.log(`🔗 URL файла: ${fileUrl}`)
      console.log(`👤 Пользователь: ${userId}`)

      // Здесь позже добавим:
      // - Извлечение текста через OCR.space
      // - Генерацию вопросов через Hugging Face
      // - Сохранение в Supabase

      // Пока возвращаем тестовый ответ
      return new Response(JSON.stringify({ 
        success: true, 
        questionsCount: 3,
        message: 'Worker успешно обработал запрос! В ближайшее время добавим генерацию вопросов.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error(`❌ Ошибка: ${error.message}`)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }
}