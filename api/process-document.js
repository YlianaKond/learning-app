import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';

// Функция для извлечения текста из файла
async function extractTextFromFile(fileUrl) {
  try {
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('utf-8').decode(buffer);
    
    if (!text || text.length < 50) {
      throw new Error('Файл слишком короткий или не содержит текста');
    }
    
    return text;
  } catch (error) {
    console.error('Ошибка извлечения текста:', error);
    throw new Error(`Не удалось извлечь текст: ${error.message}`);
  }
}

// Функция генерации вопросов через Hugging Face
async function generateQuestionsFromText(text, hf) {
  const prompt = `Ты — эксперт по созданию учебных тестов. На основе следующего текста сгенерируй 3 вопроса для проверки знаний.

Текст: ${text.substring(0, 2000)}

Формат ответа (строго JSON массив):
[
  {
    "text": "текст вопроса",
    "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
    "correct_answer": "правильный вариант",
    "difficulty": "easy/medium/hard",
    "topic": "тема вопроса"
  }
]

Правила:
- Вопросы должны быть основаны ТОЛЬКО на этом тексте
- Не используй общие знания, только информацию из текста
- Все варианты ответов должны быть правдоподобными
- Правильный ответ должен быть явно указан в тексте`;

  try {
    const response = await hf.textGeneration({
      model: 'microsoft/Phi-3-mini-4k-instruct',
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        top_p: 0.95,
        do_sample: true,
        return_full_text: false
      }
    });

    const generatedText = response.generated_text;
    console.log('Ответ модели:', generatedText.substring(0, 300));

    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Не удалось найти JSON в ответе модели');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Ошибка генерации вопросов:', error);
    // Если ИИ не сработал, создаем простые вопросы из текста
    return generateSimpleQuestionsFromText(text);
  }
}

// Запасной вариант: простые вопросы из текста
function generateSimpleQuestionsFromText(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30);
  const questions = [];
  
  for (let i = 0; i < Math.min(3, sentences.length); i++) {
    const sentence = sentences[i].trim();
    if (sentence.length > 20) {
      questions.push({
        text: `О чем говорится в отрывке: "${sentence.substring(0, 60)}..."?`,
        options: [
          "Это основная тема документа",
          "Это второстепенная деталь",
          "Это введение в тему",
          "Это заключение"
        ],
        correct_answer: "Это основная тема документа",
        difficulty: "medium",
        topic: "Из документа"
      });
    }
  }
  
  if (questions.length === 0) {
    questions.push({
      text: "О чем этот документ?",
      options: ["О технических аспектах", "О бизнес-процессах", "Об образовании", "О науке"],
      correct_answer: "Об образовании",
      difficulty: "easy",
      topic: "Общее"
    });
  }
  
  return questions;
}

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
    console.log(`📎 URL файла: ${fileUrl}`);

    // 1. Извлекаем текст из файла
    console.log('📖 Извлечение текста из файла...');
    const extractedText = await extractTextFromFile(fileUrl);
    console.log(`✅ Извлечено ${extractedText.length} символов`);
    console.log(`📝 Первые 200 символов: ${extractedText.substring(0, 200)}`);

    // 2. Инициализируем Hugging Face клиент
    const hf = new HfInference(process.env.HF_API_KEY);

    // 3. Генерируем вопросы на основе текста
    console.log('🤖 Генерация вопросов через Hugging Face...');
    const questions = await generateQuestionsFromText(extractedText, hf);
    console.log(`✅ Сгенерировано ${questions.length} вопросов`);

    // 4. Подключаемся к Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // 5. Удаляем старые вопросы для этого документа (если есть)
    await supabase.from('questions').delete().eq('document_id', documentId);

    // 6. Сохраняем новые вопросы
    let savedCount = 0;
    for (const q of questions) {
      const { error } = await supabase
        .from('questions')
        .insert({
          document_id: documentId,
          text: q.text,
          options: q.options,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty || 'medium',
          topic: q.topic || 'Из документа'
        });
      
      if (!error) savedCount++;
    }

    console.log(`✅ Сохранено ${savedCount} вопросов`);

    // 7. Обновляем статус документа
    await supabase
      .from('documents')
      .update({ status: 'completed' })
      .eq('id', documentId);

    return res.status(200).json({
      success: true,
      questionsCount: savedCount,
      message: `Сгенерировано ${savedCount} вопросов на основе текста`
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}