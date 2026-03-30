import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    console.log('=== ОТПРАВКА ЗАПРОСА ===')
    console.log('Режим:', isLogin ? 'Вход' : 'Регистрация')
    console.log('Email:', email)

    try {
      if (isLogin) {
        // ВХОД
        console.log('🔑 Отправка запроса на вход...')
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        })
        
        console.log('📦 Полный ответ Supabase:', { 
          user: data?.user?.email || null, 
          session: data?.session ? 'есть' : 'нет',
          error: error?.message || null 
        })
        
        if (error) {
          console.error('❌ Ошибка входа:', error)
          
          // Понятное сообщение для пользователя
          if (error.message.includes('Invalid login credentials')) {
            setErrorMessage('Неверный email или пароль')
          } else if (error.message.includes('Email not confirmed')) {
            setErrorMessage('Email не подтвержден. Проверьте почту или обратитесь к администратору.')
          } else {
            setErrorMessage(`Ошибка входа: ${error.message}`)
          }
        } else {
          console.log('✅ Успешный вход!')
          console.log('👤 Пользователь:', data.user?.email)
          // Редирект произойдет автоматически через App.jsx
        }
      } else {
        // РЕГИСТРАЦИЯ
        console.log('📝 Отправка запроса на регистрацию...')
        
        // Проверка пароля
        if (password.length < 6) {
          setErrorMessage('Пароль должен быть не менее 6 символов')
          setLoading(false)
          return
        }
        
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              email: email
            }
          }
        })
        
        console.log('📦 Полный ответ Supabase:', { 
          user: data?.user?.email || null, 
          session: data?.session ? 'есть' : 'нет',
          error: error?.message || null 
        })
        
        if (error) {
          console.error('❌ Ошибка регистрации:', error)
          
          if (error.message.includes('already registered')) {
            setErrorMessage('Этот email уже зарегистрирован. Попробуйте войти.')
          } else {
            setErrorMessage(`Ошибка регистрации: ${error.message}`)
          }
        } else {
          console.log('✅ Успешная регистрация!')
          
          if (data?.user) {
            // Если регистрация прошла, но пользователь не вошел автоматически
            if (data.session) {
              console.log('🔑 Автоматический вход выполнен!')
            } else {
              alert('Регистрация успешна! Теперь войдите с вашим паролем.')
              setIsLogin(true)
              setPassword('')
            }
          }
        }
      }
    } catch (err) {
      console.error('💥 Неожиданная ошибка:', err)
      setErrorMessage(`Неожиданная ошибка: ${err.message}`)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
        <h1 className="text-3xl font-bold text-center mb-8 text-indigo-600">
          LearnApp
        </h1>
        
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            ❌ {errorMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="минимум 6 символов"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
        
        <button
          onClick={() => {
            setIsLogin(!isLogin)
            setErrorMessage('')
            setPassword('')
          }}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 w-full text-center"
        >
          {isLogin ? 'Нет аккаунта? Зарегистрируйся' : 'Уже есть аккаунт? Войди'}
        </button>
        
        <div className="mt-6 text-xs text-gray-400 text-center border-t pt-4">
          {isLogin ? 'Войдите, чтобы начать обучение' : 'Создайте аккаунт для доступа к играм'}
        </div>
      </div>
    </div>
  )
}