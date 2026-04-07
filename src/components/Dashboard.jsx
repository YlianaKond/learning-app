import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Проверяем авторизацию
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate('/auth')
      } else {
        setUser(data.user)
        loadDocuments(data.user.id)
      }
    })

    // Слушаем изменения авторизации
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/auth')
      }
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  const loadDocuments = async (userId) => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setDocuments(data)
  }

  // Функция вызова Worker для обработки файла
const processDocument = async (documentId, fileUrl, userId) => {
  const workerUrl = '/api/process-document'
  
  try {
    console.log('📡 Вызов Worker для обработки файла:', documentId)
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileUrl,
        documentId,
        userId
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log(`✅ Успешно! ${result.message}`)
      // Принудительно обновляем список документов
      setTimeout(async () => {
        const user = await supabase.auth.getUser()
        if (user.data.user) {
          await loadDocuments(user.data.user.id)
        }
      }, 2000)
    } else {
      console.error('❌ Ошибка обработки:', result.error)
    }
  } catch (error) {
    console.error('❌ Ошибка вызова Worker:', error)
  }
}

  // Функция загрузки файла
  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    const user = await supabase.auth.getUser()
    const userId = user.data.user.id

    try {
      // 1. Загружаем файл в Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // 2. Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // 3. Сохраняем запись в таблицу documents
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          filename: selectedFile.name,
          file_url: urlData.publicUrl,
          status: 'pending'
        })
        .select()

      if (dbError) throw dbError

      // 4. Обновляем список документов
      await loadDocuments(userId)
      
      // 5. Вызываем Worker для обработки
      if (docData && docData[0]) {
        await processDocument(docData[0].id, urlData.publicUrl, userId)
      }
      
      setSelectedFile(null)
      alert('Файл загружен! Начинается генерация вопросов.')

    } catch (error) {
      console.error('Ошибка загрузки:', error)
      alert('Ошибка загрузки: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const startGame = (documentId) => {
    navigate(`/game/${documentId}`)
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Навигационная панель */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">LearnApp</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Выйти
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Форма загрузки файлов */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Загрузить учебный материал</h2>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </form>
        </div>

        {/* Список документов */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Мои материалы</h2>
          
          {documents.length === 0 ? (
            <p className="text-gray-500">Нет загруженных материалов</p>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium">{doc.filename}</p>
                    <p className="text-sm text-gray-500">
                      Статус: {doc.status === 'completed' ? '✅ Готов к игре' : 
                               doc.status === 'processing' ? '🔄 Обрабатывается...' : 
                               '⏳ Ожидает обработки'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Загружен: {new Date(doc.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {doc.status === 'completed' && (
                      <button
                        onClick={() => startGame(doc.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        Играть 🎮
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}