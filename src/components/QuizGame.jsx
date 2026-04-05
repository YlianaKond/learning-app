import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useParams, useNavigate } from 'react-router-dom'

export default function QuizGame() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkAccessAndLoadQuestions()
  }, [documentId])

  const checkAccessAndLoadQuestions = async () => {
    setLoading(true)
    setError(null)

    // 1. Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      setError('Пожалуйста, войдите в аккаунт')
      setTimeout(() => navigate('/auth'), 2000)
      return
    }

    // 2. Проверяем, что документ существует и принадлежит этому пользователю
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, user_id, filename, status')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      setError('Документ не найден')
      setTimeout(() => navigate('/dashboard'), 2000)
      return
    }

    // 3. Проверяем, что текущий пользователь - владелец документа
    if (document.user_id !== user.id) {
      setError('У вас нет доступа к этому документу. Это чужой файл!')
      setTimeout(() => navigate('/dashboard'), 2000)
      return
    }

    // 4. Проверяем, что документ обработан
    if (document.status !== 'completed') {
      setError('Вопросы еще не сгенерированы. Подождите немного.')
      setTimeout(() => navigate('/dashboard'), 2000)
      return
    }

    // 5. Загружаем вопросы ТОЛЬКО для этого документа
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('document_id', documentId)

    if (questionsError) {
      setError('Ошибка загрузки вопросов')
      console.error(questionsError)
      setTimeout(() => navigate('/dashboard'), 2000)
      return
    }

    if (!questionsData || questionsData.length === 0) {
      setError('Вопросы не найдены. Попробуйте загрузить файл заново.')
      setTimeout(() => navigate('/dashboard'), 2000)
      return
    }

    setQuestions(questionsData)
    setLoading(false)
  }

  const startGame = () => {
    setGameStarted(true)
    setCurrentIndex(0)
    setScore(0)
  }

  const handleAnswer = (selectedAnswer) => {
    const currentQuestion = questions[currentIndex]
    const isCorrect = selectedAnswer === currentQuestion.correct_answer
    
    const newScore = isCorrect ? score + 1 : score
    setScore(newScore)

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Игра окончена
      alert(`Игра завершена! Твой счет: ${newScore} из ${questions.length}`)
      navigate('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка вопросов...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">⛔ Ошибка</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <h1 className="text-3xl font-bold mb-4">🎮 Готов к игре?</h1>
          <p className="text-gray-600 mb-6">
            Тебя ждет {questions.length} вопросов по твоему файлу
          </p>
          <button
            onClick={startGame}
            className="bg-green-600 text-white px-8 py-3 rounded-full text-lg hover:bg-green-700"
          >
            Начать игру!
          </button>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Прогресс */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              Вопрос {currentIndex + 1} из {questions.length}
            </span>
            <span className="text-indigo-600 font-bold">Счет: {score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Вопрос */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">{currentQ.text}</h2>
          
          <div className="space-y-3">
            {currentQ.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(option)}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-all"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Кнопка выхода */}
        <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-700"
          >
            Выйти в меню
          </button>
        </div>
      </div>
    </div>
  )
}