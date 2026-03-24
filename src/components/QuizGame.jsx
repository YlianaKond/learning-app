import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useParams, useNavigate } from 'react-router-dom'
import Phaser from 'phaser'

export default function QuizGame() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const gameRef = useRef(null)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('document_id', documentId)
    
    if (data && data.length > 0) {
      setQuestions(data)
    } else {
      alert('Вопросы еще не сгенерированы. Подожди немного и обнови страницу.')
      navigate('/dashboard')
    }
  }

  const startGame = () => {
    setGameStarted(true)
    setCurrentIndex(0)
    setScore(0)
  }

  const handleAnswer = (selectedAnswer) => {
    const currentQuestion = questions[currentIndex]
    const isCorrect = selectedAnswer === currentQuestion.correct_answer
    
    if (isCorrect) {
      setScore(score + 1)
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Игра окончена
      alert(`Игра завершена! Твой счет: ${score + (isCorrect ? 1 : 0)} из ${questions.length}`)
      navigate('/dashboard')
    }
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <h1 className="text-3xl font-bold mb-4">🎮 Готов к игре?</h1>
          <p className="text-gray-600 mb-6">
            Тебя ждет {questions.length} вопросов по загруженному материалу
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
      <div className="max-w-2xl mx-auto">
        {/* Прогресс */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Вопрос {currentIndex + 1} из {questions.length}</span>
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
          <h2 className="text-2xl font-bold mb-6 text-center">{currentQ.text}</h2>
          
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
      </div>
    </div>
  )
}