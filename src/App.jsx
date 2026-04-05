import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import QuizGame from './components/QuizGame'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔍 App: проверка сессии...')
    
    // Проверяем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📌 Текущая сессия:', session ? `Пользователь ${session.user.email}` : 'Нет сессии')
      setSession(session)
      setLoading(false)
    })

    // Слушаем изменения авторизации
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Событие авторизации:', event)
      console.log('👤 Пользователь:', session?.user?.email || 'не авторизован')
      setSession(session)
    })

    return () => {
      console.log('🧹 Очистка слушателя')
      listener?.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  console.log('🎯 Текущий session:', session ? 'есть' : 'нет')
  console.log('📍 Редирект:', session ? 'на dashboard' : 'на auth')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/auth" />} />
        <Route path="/game/:documentId" element={session ? <QuizGame /> : <Navigate to="/auth" />} />
        <Route path="/" element={<Navigate to={session ? "/dashboard" : "/auth"} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App