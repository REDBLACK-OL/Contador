import React, { useState, useEffect } from 'react'
import { useRealtimeCount } from './features/text-analysis/hooks/useRealtimeCount'
import { useAuthStore } from './store/authStore'
import { apiClient } from './services/api/client'
import { 
  FileText, Sparkles, BookOpen, User, Lock, ArrowRight, CheckCircle2, 
  AlertTriangle, Copy, Moon, Sun, Upload, RefreshCw, GraduationCap,
  Volume2, Square, Mail, Clock
} from 'lucide-react'

export default function App() {
  const [text, setText] = useState('')
  const [darkMode, setDarkMode] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Control de Lectura en Voz Alta (TTS)
  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      if (!text.trim()) return
      
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'es-ES' // Configurado en español
      
      utterance.onend = () => {
        setIsSpeaking(false)
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
      }
      
      window.speechSynthesis.speak(utterance)
      setIsSpeaking(true)
    }
  }

  // Limpiar síntesis de voz al desmontar componente
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])
  
  // Auth Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  // Premium metrics state (fetched from backend)
  const [premiumMetrics, setPremiumMetrics] = useState<any>(null)
  const [isAnalyzingPremium, setIsAnalyzingPremium] = useState(false)
  
  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [fileSuccess, setFileSuccess] = useState('')

  // Teacher Workspace State
  const [activeTab, setActiveTab] = useState<'editor' | 'teacher' | 'student' | 'admin'>('editor')
  const [profileName, setProfileName] = useState('')
  const [minWords, setMinWords] = useState<number | ''>('')
  const [maxWords, setMaxWords] = useState<number | ''>('')
  const [expiresAt, setExpiresAt] = useState('')
  const [createdProfiles, setCreatedProfiles] = useState<any[]>([])
  const [selectedProfileSubmissions, setSelectedProfileSubmissions] = useState<any[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  // Student Workspace State
  const [studentShareToken, setStudentShareToken] = useState('')
  const [studentProfileMeta, setStudentProfileMeta] = useState<any>(null)
  const [studentLabel, setStudentLabel] = useState('')
  const [studentSubmitSuccess, setStudentSubmitSuccess] = useState('')
  const [studentSubmitError, setStudentSubmitError] = useState('')

  // Admin Workspace State
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [adminStats, setAdminStats] = useState<any>(null)
  const [adminLogs, setAdminLogs] = useState<any[]>([])
  const [isAdminLoading, setIsAdminLoading] = useState(false)

  // Zustand Store
  const { user, isAuthenticated, setAuth, clearAuth, updateRole } = useAuthStore()

  // Conteo local en cliente (Módulo 1 - BR-026 / ADR-004)
  const basicMetrics = useRealtimeCount(text)

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
  }, [darkMode])

  // Carga de perfiles docentes si está autenticado
  const fetchTeacherProfiles = async () => {
    if (!isAuthenticated) return
    try {
      const res = await apiClient.get('/teachers/profiles')
      setCreatedProfiles(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchTeacherProfiles()
    }
  }, [isAuthenticated])

  // Registrar / Login
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')

    try {
      if (isRegistering) {
        // Registro
        await apiClient.post('/auth/register', {
          email: email.trim(),
          password,
          full_name: fullName || null
        })
        setAuthSuccess('¡Registro exitoso! Ya puedes iniciar sesión.')
        setIsRegistering(false)
      } else {
        // Login
        const res = await apiClient.post('/auth/login', {
          email: email.trim(),
          password
        })
        const { access_token, refresh_token } = res.data
        
        // Obtener datos reales del perfil del usuario desde el backend (incluyendo su rol actualizado, e.g. premium_user)
        const profileRes = await apiClient.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${access_token}`
          }
        })
        const realUser = profileRes.data
        
        setAuth({
          id: realUser.id,
          email: realUser.email,
          full_name: realUser.full_name || 'Usuario Registrado',
          role: realUser.role,
          email_verified: realUser.email_verified,
          is_active: realUser.is_active,
          created_at: realUser.created_at
        }, access_token, refresh_token)
        
        setAuthSuccess('¡Sesión iniciada correctamente!')
        setActiveTab('editor')
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.error?.message || 'Ocurrió un error en la autenticación.')
    }
  }

  // Correr análisis Premium (Módulo 2)
  const triggerPremiumAnalysis = async () => {
    if (!text.trim()) return
    setIsAnalyzingPremium(true)
    try {
      const res = await apiClient.post('/analysis/text', { text })
      setPremiumMetrics(res.data)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error en el análisis.')
    } finally {
      setIsAnalyzingPremium(false)
    }
  }

  // Subida de Archivos (.txt, .docx, .pdf)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setFileError('')
    setFileSuccess('')
    setUploadedFile(file)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await apiClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setFileSuccess('¡Archivo analizado correctamente!')
      setPremiumMetrics(res.data)
      // Cargar texto extraído para ver en pantalla
      // Para simular, ponemos una alerta o mostramos conteo
      if (res.data.extracted_text) {
        setText(res.data.extracted_text)
      } else {
        setText(`[Texto extraído del archivo ${file.name} con ${res.data.word_count} palabras]`)
      }
    } catch (err: any) {
      setFileError(err.response?.data?.error?.message || 'Error al procesar archivo.')
    }
  }

  // Simulación de Pago Webhook (Checkout Sandbox)
  const triggerMockPayment = async (planType: string) => {
    try {
      // 1. Crear intención
      const intentRes = await apiClient.post('/payments/checkout-intent', {
        plan_type: planType
      })
      
      const { payment_id } = intentRes.data
      
      const randToken = Math.random().toString(36).substring(7);
      // 2. Simular respuesta del webhook de Stripe
      await apiClient.post('/payments/webhook/stripe-simulated', {
        provider_payment_id: `ch_stripe_${randToken}`,
        payment_id: payment_id,
        success: true
      })
      
      // 3. Actualizar estado local
      updateRole('premium_user')
      alert(`¡Pago completado de forma exitosa! Tu cuenta ha sido actualizada a Premium.`)
      // Limpiar métricas anteriores para refrescar
      setPremiumMetrics(null)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error en la pasarela de pagos simulada.')
    }
  }

  // Crear Perfil Docente
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.post('/teachers/profiles', {
        profile_name: profileName,
        min_words: minWords || null,
        max_words: maxWords || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
      })
      setProfileName('')
      setMinWords('')
      setMaxWords('')
      setExpiresAt('')
      fetchTeacherProfiles()
      alert('¡Tarea/Perfil docente creada exitosamente!')
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error al crear perfil.')
    }
  }

  // Ver Entregas de Alumnos
  const handleViewSubmissions = async (profileId: string) => {
    setSelectedProfileId(profileId)
    try {
      const res = await apiClient.get(`/teachers/profiles/${profileId}/submissions`)
      setSelectedProfileSubmissions(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  // Admin Workspace Logic
  const fetchAdminData = async () => {
    if (!isAuthenticated || user?.role !== 'institution_admin') return
    setIsAdminLoading(true)
    try {
      const [usersRes, statsRes, logsRes] = await Promise.all([
        apiClient.get('/admin/users'),
        apiClient.get('/admin/usage-stats'),
        apiClient.get('/admin/activity-log')
      ])
      setAdminUsers(usersRes.data)
      setAdminStats(statsRes.data)
      setAdminLogs(logsRes.data)
    } catch (e) {
      console.error("Error al cargar datos de administrador:", e)
    } finally {
      setIsAdminLoading(false)
    }
  }

  const handleChangeUserRole = async (targetUserId: string, newRole: string) => {
    try {
      await apiClient.post(`/admin/users/${targetUserId}/role`, { role: newRole })
      alert("¡Rol y licencia actualizados correctamente!")
      fetchAdminData()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Error al actualizar el rol.")
    }
  }

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAdminData()
    }
  }, [activeTab])

  // Cargar Perfil de Alumno mediante el share token
  const handleLoadStudentProfile = async () => {
    setStudentSubmitError('')
    setStudentSubmitSuccess('')
    try {
      const res = await apiClient.get(`/teachers/profiles/by-token/${studentShareToken}`)
      setStudentProfileMeta(res.data)
    } catch (err: any) {
      setStudentSubmitError(err.response?.data?.error?.message || 'Enlace inválido o expirado.')
    }
  }
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStudentSubmitError('')
    setStudentSubmitSuccess('')

    try {
      const res = await apiClient.post(`/teachers/profiles/by-token/${studentShareToken}/submit`, {
        text: text,
        student_label: studentLabel
      })
      
      if (res.data.passed_validation) {
        setStudentSubmitSuccess('¡Trabajo enviado y verificado con éxito! Cumple las reglas de palabras.')
      } else {
        setStudentSubmitError('El trabajo fue registrado pero NO cumple con el rango de palabras requerido.')
      }
      setStudentLabel('')
    } catch (err: any) {
      setStudentSubmitError(err.response?.data?.error?.message || 'Error al enviar el trabajo.')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
        
        {/* Modern Vector Grid & Glow Background Effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 z-0"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/15 rounded-full filter blur-[120px] animate-blob z-0"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/15 rounded-full filter blur-[120px] animate-blob animation-delay-2000 z-0"></div>
        <div className="absolute top-[35%] right-[25%] w-[350px] h-[350px] bg-cyan-500/10 rounded-full filter blur-[100px] animate-blob animation-delay-4550 z-0"></div>

        {/* LEFT COLUMN: HERO, INSPIRATION & INTERACTIVE MOCKUP */}
        <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-16 relative z-10 border-r border-slate-900/60 bg-slate-950/40 backdrop-blur-3xl select-none">
          
          {/* Logo Brand Header */}
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-brand-600 to-brand-500 rounded-2xl text-white shadow-[0_4px_20px_rgba(124,58,237,0.35)] animate-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-brand-300 via-white to-indigo-300 bg-clip-text text-transparent font-sans">
                WordCount Pro
              </span>
              <span className="block text-[10px] text-brand-200 font-extrabold tracking-widest uppercase mt-0.5">Español Inteligente</span>
            </div>
          </div>

          {/* Main Hero & Stunning Mockup Container */}
          <div className="space-y-10 my-auto py-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 border border-brand-500/25 text-brand-300 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 animate-spin" /> Motor de Conteo y Legibilidad 2.0
              </div>
              <h2 className="text-5xl font-black leading-tight tracking-tight text-white">
                Escribe con precisión.<br />
                <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent animate-gradient font-black">
                  Inspira con impacto.
                </span>
              </h2>
              <p className="text-base text-slate-400 max-w-lg leading-relaxed">
                Optimiza tus redacciones en español con métricas de legibilidad científica, análisis de densidad léxica, detección de muletillas y vinculación docente en tiempo real.
              </p>
            </div>

            {/* Interactive Live Mockup Card */}
            <div className="relative border border-slate-800/80 bg-slate-900/40 rounded-3xl p-6 backdrop-blur-xl shadow-2xl hover:border-brand-500/30 transition-all duration-500 hover:shadow-[0_15px_30px_rgba(124,58,237,0.15)] animate-float max-w-lg animate-float">
              
              {/* Mockup Header */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-mono text-slate-400 ml-2">analisis_ensayo.docx</span>
                </div>
                <span className="text-[9px] bg-brand-500/20 text-brand-300 px-2.5 py-0.5 rounded-full font-bold border border-brand-500/30 uppercase tracking-wider">
                  Modo Premium Activo
                </span>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-3.5 mb-4">
                <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-900/90 text-center">
                  <span className="block text-slate-500 text-[9px] uppercase font-bold tracking-wider">Palabras</span>
                  <span className="block text-xl font-black text-brand-400 mt-0.5">742</span>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-450/10 px-2 py-0.5 rounded-lg mt-1.5 inline-block">Rango OK</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-900/90 text-center">
                  <span className="block text-slate-500 text-[9px] uppercase font-bold tracking-wider">Legibilidad</span>
                  <span className="block text-xl font-black text-indigo-300 mt-0.5">85.2</span>
                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-455/10 px-2 py-0.5 rounded-lg mt-1.5 inline-block">Muy Fácil</span>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-900/90 text-center">
                  <span className="block text-slate-500 text-[9px] uppercase font-bold tracking-wider">Muletillas</span>
                  <span className="block text-xl font-black text-rose-500 mt-0.5">3</span>
                  <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg mt-1.5 inline-block">Mejorar</span>
                </div>
              </div>

              {/* Visual text highlighting demonstration */}
              <div className="space-y-3.5">
                <div className="p-3.5 bg-slate-950/50 rounded-2xl border border-slate-900/60 text-xs leading-relaxed text-slate-300">
                  <p>
                    El análisis del ensayo científico <span className="text-brand-300 underline font-semibold bg-brand-500/10 px-1 rounded-md">básicamente</span> demuestra que la biodiversidad en la región de Ucayali es <span className="text-indigo-300 font-semibold bg-indigo-500/10 px-1 rounded-md">increíblemente</span> rica, pero <span className="text-brand-300 underline font-semibold bg-brand-500/10 px-1 rounded-md">obviamente</span> requiere mayor protección...
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-455 font-bold uppercase tracking-wider">
                    <span>Progreso de Tarea Docente</span>
                    <span>742 / 1000 palabras</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                    <div className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full rounded-full w-[74.2%]"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Branding Info */}
          <div className="text-[11px] text-slate-500 flex justify-between max-w-md items-center">
            <span>© 2026 WordCount Pro. Hecho con precisión científica.</span>
            <div className="flex space-x-3">
              <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacidad</span>
              <span className="hover:text-slate-400 cursor-pointer transition-colors">Soporte</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREMIUM FORM CARD PORTAL */}
        <div className="w-full lg:w-[48%] flex flex-col justify-center items-center p-6 relative z-10">
          
          {/* Logo visible on mobile only */}
          <div className="flex items-center space-x-3.5 mb-8 lg:hidden select-none">
            <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-brand-500 rounded-2xl text-white shadow-premium">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-brand-300 via-white to-indigo-300 bg-clip-text text-transparent">
                WordCount Pro
              </h1>
              <span className="block text-[9px] text-brand-200 font-bold uppercase tracking-widest">Español Inteligente</span>
            </div>
          </div>

          {/* Glassmorphic Container Card */}
          <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-8 shadow-[0_20px_50px_rgba(124,58,237,0.15)] space-y-6 overflow-hidden relative group hover:border-brand-500/30 transition-all duration-300">
            
            {/* Elegant glowing border light on top of card */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent"></div>

            {/* Selector de Acceso (Academic Access vs Submit Assignment) */}
            <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-900/80 select-none">
              <button
                onClick={() => { 
                  setActiveTab('editor'); 
                  setAuthError(''); 
                  setAuthSuccess(''); 
                  setEmail(''); 
                  setPassword(''); 
                  setFullName(''); 
                }}
                className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab !== 'student' 
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)] scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Acceso Académico</span>
              </button>
              <button
                onClick={() => { 
                  setActiveTab('student'); 
                  setAuthError(''); 
                  setAuthSuccess(''); 
                  setStudentShareToken('');
                  setStudentProfileMeta(null);
                  setStudentLabel('');
                  setStudentSubmitSuccess('');
                  setStudentSubmitError('');
                }}
                className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'student' 
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)] scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Entregar Trabajo</span>
              </button>
            </div>

            {activeTab !== 'student' ? (
              // Formulario de Login / Registro
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold flex items-center gap-2 select-none text-white">
                    <Lock className="text-brand-400 h-5 w-5" />
                    {isRegistering ? 'Crear Cuenta Académica' : 'Acceso Estudiante / Docente'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRegistering 
                      ? 'Regístrate gratis y analiza tus ensayos en segundos' 
                      : 'Ingresa tus credenciales para acceder al sistema'
                    }
                  </p>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  {isRegistering && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre Completo</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <User className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ej. Dr. Saboya Ucayali"
                          className="w-full p-3.5 pl-10 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder-slate-400 shadow-inner font-sans"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ejemplo@mail.com"
                        className="w-full p-3.5 pl-10 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder-slate-400 shadow-inner font-sans"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres (letras y números)"
                        className="w-full p-3.5 pl-10 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder-slate-400 shadow-inner font-sans"
                      />
                    </div>
                  </div>

                  {/* Smart Test Account Tip Badge */}
                  <div className="bg-brand-950/30 border border-brand-800/40 rounded-xl p-3 flex items-start gap-2.5 select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]">
                    <div className="p-1 bg-brand-500/20 text-brand-400 rounded-lg shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-[10px] text-brand-300 leading-relaxed font-semibold">
                      <span className="font-extrabold text-white block mb-0.5">💡 Credenciales Rápidas para Pruebas:</span>
                      Usa <span className="text-white bg-brand-500/20 px-1 rounded font-mono font-bold">profe</span> para modo docente, o <span className="text-white bg-brand-500/20 px-1 rounded font-mono font-bold">admin</span> para administrador.
                    </p>
                  </div>

                  {authError && (
                    <div className="p-3.5 bg-rose-950/30 text-rose-400 border border-rose-900/30 rounded-xl text-xs font-semibold animate-shake flex gap-2 items-center">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                      <span className="text-rose-400">{authError}</span>
                    </div>
                  )}
                  
                  {authSuccess && (
                    <div className="p-3.5 bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 rounded-xl text-xs font-semibold flex gap-2 items-center">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-emerald-400">{authSuccess}</span>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-550 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_8px_30px_rgba(124,58,237,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <span>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <div className="text-center pt-3.5 border-t border-slate-800/80">
                  <button 
                    onClick={() => { 
                      setIsRegistering(!isRegistering); 
                      setAuthError(''); 
                      setAuthSuccess(''); 
                      setEmail(''); 
                      setPassword(''); 
                      setFullName(''); 
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 hover:underline font-bold transition-colors"
                  >
                    {isRegistering ? '¿Ya tienes una cuenta? Inicia Sesión' : '¿No tienes una cuenta aún? Regístrate gratis'}
                  </button>
                </div>
              </div>
            ) : (
              // Portal de entrega de alumnos (público)
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold flex items-center gap-2 text-white">
                    <GraduationCap className="text-brand-400 h-5 w-5" />
                    Portal de Entrega
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ingresa el token proporcionado por tu docente para enviar tu redacción y validar su extensión
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={studentShareToken}
                        onChange={(e) => setStudentShareToken(e.target.value)}
                        placeholder="Código del docente (Token)"
                        className="w-full p-3.5 pl-10 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder-slate-400 font-sans shadow-inner"
                      />
                    </div>
                    <button 
                      onClick={handleLoadStudentProfile}
                      className="bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-550 text-white font-extrabold text-xs uppercase tracking-wider shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all px-5 rounded-xl shadow-md"
                    >
                      Cargar
                    </button>
                  </div>

                  {studentProfileMeta && (
                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-900 space-y-4 animate-fadeIn">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-extrabold text-brand-400">Tarea Asignada</span>
                        <h4 className="font-extrabold text-slate-100 text-lg mt-0.5">
                          {studentProfileMeta.profile_name}
                        </h4>
                        {studentProfileMeta.expires_at && (
                          <p className="text-xs text-rose-455 mt-1 font-semibold flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Fecha límite: {new Date(studentProfileMeta.expires_at).toLocaleString()}</span>
                          </p>
                        )}
                        {studentProfileMeta.expires_at && new Date(studentProfileMeta.expires_at) < new Date() && (
                          <div className="p-3 bg-rose-950/30 text-rose-400 border border-rose-900/30 rounded-xl text-xs font-semibold flex gap-2 items-center mt-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                            <span>El plazo de entrega ha vencido. No se aceptan más envíos.</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Redacta tu trabajo respetando el rango requerido por el docente:
                        </p>
                        <div className="mt-3 flex space-x-3 select-none">
                          <span className="text-xs font-bold bg-slate-900/60 px-3.5 py-2.5 rounded-xl border border-slate-850 flex-1 text-center">
                            Mínimo: <span className="text-brand-400 font-extrabold block text-sm mt-0.5">{studentProfileMeta.min_words || 'Sin límite'}</span>
                          </span>
                          <span className="text-xs font-bold bg-slate-900/60 px-3.5 py-2.5 rounded-xl border border-slate-850 flex-1 text-center">
                            Máximo: <span className="text-brand-400 font-extrabold block text-sm mt-0.5">{studentProfileMeta.max_words || 'Sin límite'}</span>
                          </span>
                        </div>
                      </div>

                      <form onSubmit={handleStudentSubmit} className="space-y-4 pt-4 border-t border-slate-900">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identificación del Estudiante</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                              <User className="h-4 w-4" />
                            </div>
                            <input
                              type="text"
                              required
                              value={studentLabel}
                              onChange={(e) => setStudentLabel(e.target.value)}
                              placeholder="Ej. Juan Pérez - Código: 20261102"
                              className="w-full p-3.5 pl-10 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder-slate-400 font-sans"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ensayo o Redacción</label>
                          <textarea
                            required
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Pega o redacta tu trabajo académico aquí..."
                            className="w-full h-44 p-4 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none placeholder-slate-400 font-sans"
                          />
                          <div className="flex justify-between items-center text-xs text-slate-400 mt-2 font-bold bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                            <span>Conteo: <span className="text-brand-400 font-extrabold">{basicMetrics.word_count}</span> palabras</span>
                            {studentProfileMeta.min_words && basicMetrics.word_count < studentProfileMeta.min_words && (
                              <span className="text-rose-500 font-extrabold bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/20">Insuficiente</span>
                            )}
                            {studentProfileMeta.max_words && basicMetrics.word_count > studentProfileMeta.max_words && (
                              <span className="text-rose-500 font-extrabold bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/20">Excedido</span>
                            )}
                            {(!studentProfileMeta.min_words || basicMetrics.word_count >= studentProfileMeta.min_words) && 
                             (!studentProfileMeta.max_words || basicMetrics.word_count <= studentProfileMeta.max_words) && (
                              <span className="text-emerald-400 font-extrabold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/20">Correcto</span>
                            )}
                          </div>
                        </div>
                        
                        <button 
                          type="submit" 
                          disabled={studentProfileMeta.expires_at && new Date(studentProfileMeta.expires_at) < new Date()}
                          className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-550 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_8px_30px_rgba(124,58,237,0.5)] active:scale-[0.98] transition-all disabled:opacity-45 disabled:cursor-not-allowed disabled:scale-100"
                        >
                          Enviar Trabajo
                        </button>
                      </form>
                    </div>
                  )}

                  {studentSubmitSuccess && (
                    <div className="p-4 bg-emerald-905/20 text-emerald-400 border border-emerald-900/30 rounded-2xl text-xs font-semibold flex gap-2 items-center">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                      <span>{studentSubmitSuccess}</span>
                    </div>
                  )}

                  {studentSubmitError && (
                    <div className="p-4 bg-rose-950/20 text-rose-400 border border-rose-900/30 rounded-2xl text-xs font-semibold flex gap-2 items-center">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
                      <span>{studentSubmitError}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-12 transition-colors duration-200 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 relative overflow-hidden">
      
      {/* Background Vector Grid & Glow Background Effects (Only active in dark mode) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none dark:block hidden z-0"></div>
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-brand-500/5 rounded-full filter blur-[100px] pointer-events-none dark:block hidden z-0"></div>
      <div className="absolute bottom-[20%] right-[5%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full filter blur-[100px] pointer-events-none dark:block hidden z-0"></div>

      {/* Header Premium */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/50 dark:border-slate-800/50 relative">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('editor')}>
            <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-brand-500 rounded-xl text-white shadow-premium">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-brand-600 to-indigo-500 dark:from-brand-400 dark:to-indigo-300 bg-clip-text text-transparent font-sans">
                WordCount Pro
              </span>
              <span className="block text-xs text-brand-700 dark:text-brand-200 font-bold">Español Inteligente</span>
            </div>
          </div>

          {/* Navegación de Roles */}
          <nav className="hidden md:flex space-x-1.5 bg-slate-200/60 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-300/30 dark:border-slate-800/40">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'editor' 
                  ? 'bg-white dark:bg-slate-800 shadow-md text-brand-600 dark:text-white border border-slate-100 dark:border-slate-700/55 scale-[1.02]' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Editor Principal
            </button>
            {isAuthenticated && (user?.role === 'teacher' || user?.role === 'institution_admin' || user?.role === 'premium_user') && (
              <button 
                onClick={() => setActiveTab('teacher')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  activeTab === 'teacher' 
                    ? 'bg-white dark:bg-slate-800 shadow-md text-brand-600 dark:text-white border border-slate-100 dark:border-slate-700/55 scale-[1.02]' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Módulo Docente
              </button>
            )}
            <button 
              onClick={() => setActiveTab('student')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'student' 
                  ? 'bg-white dark:bg-slate-800 shadow-md text-brand-600 dark:text-white border border-slate-100 dark:border-slate-700/55 scale-[1.02]' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Entregas Alumnos
            </button>
            {isAuthenticated && user?.role === 'institution_admin' && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  activeTab === 'admin' 
                    ? 'bg-white dark:bg-slate-800 shadow-md text-brand-600 dark:text-white border border-slate-100 dark:border-slate-700/55 scale-[1.02]' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Panel Administrador
              </button>
            )}
          </nav>

          {/* Botones de Acción */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              {darkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-indigo-600" />}
            </button>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-250">{user?.full_name}</span>
                  <span className="block text-xs text-brand-500 font-bold capitalize">{user?.role.replace('_', ' ')}</span>
                </div>
                <button 
                  onClick={() => { 
                    clearAuth()
                    setPremiumMetrics(null)
                    setText('')
                    setUploadedFile(null)
                    setFileSuccess('')
                    setFileError('')
                    setAuthSuccess('')
                    setAuthError('')
                    setEmail('')
                    setPassword('')
                    setFullName('')
                    if (isSpeaking) {
                      window.speechSynthesis.cancel()
                      setIsSpeaking(false)
                    }
                  }}
                  className="btn-secondary py-2 text-xs"
                >
                  Salir
                </button>
              </div>
            ) : (
              <a href="#auth-section" className="btn-primary py-2 text-sm shadow-premium">
                Ingresar
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10">
        
        {/* TAB 1: EDITOR PRINCIPAL */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Editor de Texto */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-4">
                  <h2 className="text-xl font-extrabold flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
                    <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span>Analizador de Texto</span>
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleSpeech}
                      disabled={!text.trim()}
                      className={`text-xs font-extrabold flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all ${
                        isSpeaking
                          ? 'bg-rose-500/20 text-rose-500 border-rose-500/30 hover:bg-rose-500/35'
                          : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 hover:scale-[1.02]'
                      } disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100`}
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="h-3.5 w-3.5 fill-current" />
                          Detener
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3.5 w-3.5" />
                          Escuchar
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => {
                        setText('')
                        if (isSpeaking) {
                          window.speechSynthesis.cancel()
                          setIsSpeaking(false)
                        }
                      }}
                      className="text-xs text-slate-500 hover:text-red-500 font-extrabold transition-colors"
                    >
                      Limpiar todo
                    </button>
                  </div>
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Pega o escribe tu texto en español aquí..."
                  className="w-full h-80 p-5 rounded-2xl border border-slate-300 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-slate-950 dark:text-white font-sans resize-none transition-all placeholder-slate-500 dark:placeholder-slate-400 shadow-inner leading-relaxed"
                />

                <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
                  <div className="flex gap-2">
                    {isAuthenticated && user?.role !== 'free_user' ? (
                      <div className="relative">
                        <input 
                          type="file" 
                          id="file-upload" 
                          className="hidden" 
                          accept=".txt,.docx,.pdf"
                          onChange={handleFileUpload}
                        />
                        <label 
                          htmlFor="file-upload"
                          className="btn-secondary py-2 text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                          <Upload className="h-4 w-4" /> Subir Archivo (.txt, .docx, .pdf)
                        </label>
                        {uploadedFile && (
                          <span className="ml-2 text-xs text-slate-500 font-semibold truncate max-w-[150px] inline-block align-middle">
                            ({uploadedFile.name})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">
                        🔓 Regístrate y obtén Premium para subir archivos (.docx, .pdf)
                      </span>
                    )}
                  </div>

                  {/* Acciones Premium */}
                  {isAuthenticated && user?.role !== 'free_user' ? (
                    <button 
                      onClick={triggerPremiumAnalysis}
                      disabled={isAnalyzingPremium || !text.trim()}
                      className="btn-primary py-2.5 text-xs flex items-center gap-2 shadow-premium font-bold uppercase tracking-wider"
                    >
                      {isAnalyzingPremium ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Análisis Avanzado (Módulo 2)
                    </button>
                  ) : (
                    <a href="#premium-section" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                      Prueba Premium para métricas avanzadas y legibilidad →
                    </a>
                  )}
                </div>

                {fileSuccess && <p className="text-xs text-emerald-500 font-semibold">{fileSuccess}</p>}
                {fileError && <p className="text-xs text-red-500 font-semibold">{fileError}</p>}
              </div>

              {/* Mapeo del Módulo 1 (Conteo local - sin latencia, BR-026 / ADR-004) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-5 relative overflow-hidden group hover:border-brand-500/40 transition-all duration-300 hover:shadow-premium-hover hover:-translate-y-1">
                  <div className="absolute top-[-5px] right-[-5px] p-3 opacity-[0.07] group-hover:scale-110 transition-transform text-brand-600 dark:text-brand-400">
                    <FileText className="h-12 w-12" />
                  </div>
                  <span className="block text-3xl font-black text-brand-600 dark:text-brand-400 tracking-tight">{basicMetrics.word_count}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest mt-1">Palabras</span>
                </div>

                <div className="glass-card p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 hover:shadow-premium-hover hover:-translate-y-1">
                  <div className="absolute top-[-5px] right-[-5px] p-3 opacity-[0.07] group-hover:scale-110 transition-transform text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-12 w-12" />
                  </div>
                  <span className="block text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{basicMetrics.char_count}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest mt-1">Caracteres</span>
                </div>

                <div className="glass-card p-5 relative overflow-hidden group hover:border-violet-500/40 transition-all duration-300 hover:shadow-premium-hover hover:-translate-y-1">
                  <div className="absolute top-[-5px] right-[-5px] p-3 opacity-[0.07] group-hover:scale-110 transition-transform text-violet-600 dark:text-violet-400">
                    <BookOpen className="h-12 w-12" />
                  </div>
                  <span className="block text-3xl font-black text-violet-600 dark:text-violet-400 tracking-tight">{basicMetrics.paragraph_count}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest mt-1">Párrafos</span>
                </div>

                <div className="glass-card p-5 relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300 hover:shadow-premium-hover hover:-translate-y-1">
                  <div className="absolute top-[-5px] right-[-5px] p-3 opacity-[0.07] group-hover:scale-110 transition-transform text-cyan-600 dark:text-cyan-400">
                    <FileText className="h-12 w-12" />
                  </div>
                  <span className="block text-3xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight">{basicMetrics.sentence_count}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest mt-1">Oraciones</span>
                </div>
              </div>

              {/* Tiempos Estimados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5 flex items-center space-x-4 hover:border-brand-500/30 transition-all duration-300 hover:shadow-premium-hover">
                  <div className="p-3.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Lectura Silenciosa</span>
                    <span className="block text-lg font-black text-slate-800 dark:text-white mt-0.5">
                      {Math.floor(basicMetrics.reading_time_seconds / 60)}m {basicMetrics.reading_time_seconds % 60}s
                    </span>
                  </div>
                </div>
                <div className="glass-card p-5 flex items-center space-x-4 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-premium-hover">
                  <div className="p-3.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <Volume2 className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">Narración en Voz Alta</span>
                    <span className="block text-lg font-black text-slate-800 dark:text-white mt-0.5">
                      {Math.floor(basicMetrics.speaking_time_seconds / 60)}m {basicMetrics.speaking_time_seconds % 60}s
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar de Métricas Avanzadas (Módulo 2) */}
            <div className="space-y-6">
              
              {/* Bloque Premium / Análisis del Servidor */}
              <div className="glass-card p-6 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Sparkles className="h-32 w-32" />
                </div>
                
                <h3 className="text-lg font-extrabold flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-850 pb-4 text-slate-800 dark:text-white">
                  <div className="p-1.5 bg-brand-500/10 text-brand-500 rounded-lg">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span>Métricas Avanzadas</span>
                </h3>

                {premiumMetrics ? (
                  <div className="space-y-5 animate-fadeIn">
                    {/* Legibilidad Fernández-Huerta */}
                    <div className="space-y-2">
                      <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Legibilidad (Fernández-Huerta)</span>
                      <div className="flex justify-between items-center p-4 bg-slate-100/50 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-850/80 rounded-2xl shadow-inner">
                        <div>
                          <span className="block text-3xl font-black text-brand-600 dark:text-brand-400">
                            {premiumMetrics.readability_score}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">Puntaje obtenido</span>
                        </div>
                        <div className="text-right">
                          <span className="px-3.5 py-1.5 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-[0_4px_12px_rgba(124,58,237,0.25)]">
                            {premiumMetrics.readability_category}
                          </span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-semibold">Dificultad</span>
                        </div>
                      </div>
                    </div>

                    {/* Densidad Léxica */}
                    <div className="space-y-2">
                      <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Densidad Léxica</span>
                      <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-3 border border-slate-300/35 dark:border-slate-900 overflow-hidden shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-brand-600 to-indigo-500 h-3 rounded-full" 
                          style={{ width: `${premiumMetrics.lexical_density}%` }}
                        />
                      </div>
                      <span className="block text-[10px] text-right text-brand-500 dark:text-brand-400 font-extrabold">{premiumMetrics.lexical_density}% de palabras clave</span>
                    </div>

                    {/* Palabras Clave Frecuentes */}
                    <div className="space-y-3">
                      <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Palabras más frecuentes</span>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {premiumMetrics.keywords.map((kw: any, index: number) => (
                          <div key={index} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-900">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{index + 1}. {kw.keyword}</span>
                            <span className="text-slate-500 font-medium">{kw.frequency} veces ({kw.density_pct}%)</span>
                          </div>
                        ))}
                        {premiumMetrics.keywords.length === 0 && (
                          <p className="text-xs text-slate-400 text-center">No hay suficientes palabras clave.</p>
                        )}
                      </div>
                    </div>

                    {/* Detector de Muletillas */}
                    <div className="space-y-3">
                      <span className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Muletillas / Relleno detectado</span>
                      {premiumMetrics.filler_words_count > 0 ? (
                        <div className="space-y-3.5">
                          <p className="text-xs font-semibold text-rose-500 bg-rose-500/10 px-3 py-2 rounded-xl border border-rose-500/20">
                            Se detectaron {premiumMetrics.filler_words_count} muletillas ({premiumMetrics.filler_words_pct}% del texto).
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {premiumMetrics.filler_words_details.map((m: any, idx: number) => (
                              <span key={idx} className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold rounded-xl border border-rose-100/50 dark:border-rose-900/30 shadow-sm flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                {m.filler_word} ({m.frequency})
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-500 font-semibold bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">¡Excelente! No se detectaron muletillas en el texto.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-4">
                    <p className="text-sm text-slate-400">
                      {isAuthenticated && user?.role !== 'free_user' 
                        ? 'Presiona "Análisis Avanzado" para calcular métricas adicionales.' 
                        : 'Accede a una cuenta Premium para desbloquear nubes de palabras, densidad léxica e índice de legibilidad en español.'
                      }
                    </p>
                    {!isAuthenticated && (
                      <a href="#auth-section" className="btn-secondary py-1.5 text-xs inline-block">
                        Iniciar Sesión
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Panel de Suscripciones Mock / Upgrade Checkout Sandbox */}
              <div id="premium-section" className="glass-card p-6 space-y-5 bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-premium relative overflow-hidden group hover:border-brand-400/40 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                  <Sparkles className="h-28 w-28" />
                </div>
                <h3 className="text-lg font-black flex items-center gap-2 relative z-10">
                  <Sparkles className="h-5 w-5" />
                  Prueba WordCount Pro Premium
                </h3>
                <p className="text-xs text-brand-100">
                  Desbloquea límites de palabras ilimitados, carga de archivos, legibilidad Fernández-Huerta, densidad de palabras clave y más.
                </p>
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-200" />
                    <span>Conteo y análisis de archivos (DOCX, PDF, TXT)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-200" />
                    <span>Métricas de legibilidad y muletillas en español</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-200" />
                    <span>Historial de análisis persistido por 90 días</span>
                  </div>
                </div>

                {isAuthenticated ? (
                  user?.role === 'free_user' ? (
                    <div className="space-y-2 pt-2">
                      <button 
                        onClick={() => triggerMockPayment('premium_monthly')}
                        className="w-full bg-white hover:bg-slate-100 text-brand-700 font-bold py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] shadow-md"
                      >
                        Obtener Premium Mensual (S/ 15.00)
                      </button>
                      <button 
                        onClick={() => triggerMockPayment('premium_annual')}
                        className="w-full bg-brand-800 hover:bg-brand-900 text-white border border-brand-500 font-bold py-2.5 rounded-xl text-xs transition-all active:scale-[0.98] shadow-md"
                      >
                        Obtener Premium Anual (S/ 120.00)
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/10 rounded-xl text-center">
                      <span className="text-xs font-bold uppercase tracking-wider block">¡Tu Plan Premium está Activo!</span>
                    </div>
                  )
                ) : (
                  <a 
                    href="#auth-section"
                    className="w-full bg-white hover:bg-slate-100 text-brand-700 font-bold py-2.5 rounded-xl text-xs text-center block transition-all shadow-md"
                  >
                    Registrarme para Upgrade
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MÓDULO DOCENTE */}
        {activeTab === 'teacher' && isAuthenticated && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Crear Perfil Tarea */}
            <div className="lg:col-span-1 glass-card p-6 space-y-5">
              <h3 className="text-lg font-bold flex items-center gap-2 border-b pb-3">
                <GraduationCap className="text-brand-600 h-5 w-5" />
                Crear Tarea / Límite
              </h3>
              
              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Nombre de la Tarea</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Ej. Ensayo sobre la Selva Peruana"
                    className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-slate-500 dark:placeholder-slate-400 font-sans shadow-inner"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Mínimo Palabras</label>
                    <input
                      type="number"
                      value={minWords}
                      onChange={(e) => setMinWords(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="Ej. 800"
                      className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-slate-500 dark:placeholder-slate-400 font-sans shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Máximo Palabras</label>
                    <input
                      type="number"
                      value={maxWords}
                      onChange={(e) => setMaxWords(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="Ej. 1000"
                      className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-slate-500 dark:placeholder-slate-400 font-sans shadow-inner"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Fecha y Hora Límite (Opcional)</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-slate-500 dark:placeholder-slate-400 font-sans shadow-inner"
                  />
                </div>
                <button type="submit" className="w-full btn-primary text-xs py-3">
                  Crear y Compartir Enlace
                </button>
              </form>
            </div>

            {/* Listado de Tareas Docente */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold border-b pb-3 mb-4">Tus Tareas Creadas</h3>
                <div className="space-y-4">
                  {createdProfiles.map((profile) => (
                    <div key={profile.id} className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-200">{profile.profile_name}</h4>
                        <p className="text-xs text-slate-500 mt-1 font-semibold">
                          Rango requerido: {profile.min_words || 0} - {profile.max_words || 'Sin Límite'} palabras.
                        </p>
                        {profile.expires_at && (
                          <p className="text-[11px] text-rose-500 dark:text-rose-455 mt-1 font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Límite: {new Date(profile.expires_at).toLocaleString()}</span>
                            {new Date(profile.expires_at) < new Date() && (
                              <span className="text-[9px] bg-rose-500/10 text-rose-500 dark:text-rose-455 px-1.5 py-0.5 rounded border border-rose-500/20 uppercase font-black tracking-wider ml-1.5">Expirado</span>
                            )}
                          </p>
                        )}
                        <div className="mt-2 flex items-center space-x-2 bg-white dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50 max-w-sm">
                          <input 
                            readOnly 
                            value={profile.share_token}
                            className="bg-transparent text-xs text-slate-500 focus:outline-none w-full font-mono select-all"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(profile.share_token)
                              alert('Token copiado. Pégalo en la pestaña "Entregas Alumnos" para simular la vista del estudiante.')
                            }}
                            className="text-brand-600 hover:text-brand-700"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleViewSubmissions(profile.id)}
                          className="btn-secondary py-2 text-xs font-bold"
                        >
                          Ver Entregas
                        </button>
                      </div>
                    </div>
                  ))}
                  {createdProfiles.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">Aún no has creado ningún perfil de tarea.</p>
                  )}
                </div>
              </div>

              {/* Entregas del perfil seleccionado */}
              {selectedProfileId && (
                <div className="glass-card p-6 space-y-4">
                  <div className="flex justify-between items-center border-b pb-3 mb-2">
                    <h3 className="text-lg font-bold">Entregas de Alumnos</h3>
                    <button
                      onClick={() => handleViewSubmissions(selectedProfileId)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 transition-all active:scale-[0.98]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Actualizar Lista
                    </button>
                  </div>
                  
                  {selectedProfileSubmissions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4">Alumno</th>
                            <th className="py-3 px-4">Fecha y Hora de Entrega</th>
                            <th className="py-3 px-4 text-right">Conteo de Palabras</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-sm">
                          {selectedProfileSubmissions.map((sub, idx) => (
                            <tr 
                              key={idx} 
                              className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-250">
                                {sub.student_label || 'Alumno Anónimo'}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                                {new Date(sub.submitted_at).toLocaleDateString()} {new Date(sub.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </td>
                              <td className="py-3.5 px-4 text-right font-black text-slate-700 dark:text-slate-350">
                                {sub.word_count} palabras
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  sub.passed_validation 
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-450 border border-emerald-250/20' 
                                    : 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-450 border border-red-250/20'
                                }`}>
                                  {sub.passed_validation ? 'CUMPLE' : 'FUERA DE RANGO'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-8">Nadie ha entregado trabajos para esta tarea todavía.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ENTREGAS ALUMNOS (VISTA PÚBLICA DEL ENLACE COMPARTIDO) */}
        {activeTab === 'student' && (
          <div className="max-w-2xl mx-auto glass-card p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 border-b pb-3">
              <GraduationCap className="text-brand-600 h-6 w-6" />
              Portal de Entrega de Trabajo
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={studentShareToken}
                  onChange={(e) => setStudentShareToken(e.target.value)}
                  placeholder="Introduce el código de enlace compartible del profesor (Token)"
                  className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-slate-500 dark:placeholder-slate-400 font-sans shadow-inner"
                />
                <button 
                  onClick={handleLoadStudentProfile}
                  className="btn-primary text-xs font-bold shrink-0"
                >
                  Cargar Tarea
                </button>
              </div>

              {studentProfileMeta && (
                <div className="p-4 bg-brand-50/50 dark:bg-slate-900/50 rounded-xl border border-brand-100/50 dark:border-brand-950/50 space-y-3">
                  <div>
                    <h4 className="font-extrabold text-brand-600 dark:text-brand-400 text-lg">
                      {studentProfileMeta.profile_name}
                    </h4>
                    {studentProfileMeta.expires_at && (
                      <p className="text-xs text-rose-500 dark:text-rose-455 mt-1.5 font-bold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Fecha límite: {new Date(studentProfileMeta.expires_at).toLocaleString()}</span>
                      </p>
                    )}
                    {studentProfileMeta.expires_at && new Date(studentProfileMeta.expires_at) < new Date() && (
                      <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs font-bold flex gap-2 items-center mt-2.5">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>El plazo de entrega ha vencido. No se pueden realizar más envíos.</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      El profesor requiere un conteo de palabras de:
                    </p>
                    <div className="mt-2 flex space-x-4">
                      <span className="text-sm font-bold bg-white dark:bg-slate-950 px-3 py-1 rounded-lg border">
                        Mínimo: {studentProfileMeta.min_words || 'Sin mínimo'}
                      </span>
                      <span className="text-sm font-bold bg-white dark:bg-slate-950 px-3 py-1 rounded-lg border">
                        Máximo: {studentProfileMeta.max_words || 'Sin máximo'}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleStudentSubmit} className="space-y-4 pt-3 border-t">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Identifícate (Nombre Completo o Código)</label>
                      <input
                        type="text"
                        required
                        value={studentLabel}
                        onChange={(e) => setStudentLabel(e.target.value)}
                        placeholder="Ej. Juan Pérez - Código: 20261102"
                        className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-slate-500 dark:placeholder-slate-400 font-sans shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Pega el texto de tu Ensayo</label>
                      <textarea
                        required
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Escribe tu trabajo aquí..."
                        className="w-full h-48 p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 text-slate-950 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-slate-500 dark:placeholder-slate-400 font-sans shadow-inner leading-relaxed"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-2 font-semibold">
                        <span>Conteo actual: {basicMetrics.word_count} palabras</span>
                        {studentProfileMeta.min_words && basicMetrics.word_count < studentProfileMeta.min_words && (
                          <span className="text-red-500">Faltan palabras.</span>
                        )}
                        {studentProfileMeta.max_words && basicMetrics.word_count > studentProfileMeta.max_words && (
                          <span className="text-red-500">Te excediste de palabras.</span>
                        )}
                        {(!studentProfileMeta.min_words || basicMetrics.word_count >= studentProfileMeta.min_words) && 
                         (!studentProfileMeta.max_words || basicMetrics.word_count <= studentProfileMeta.max_words) && (
                          <span className="text-emerald-500">¡Rango correcto!</span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={studentProfileMeta.expires_at && new Date(studentProfileMeta.expires_at) < new Date()}
                      className="w-full btn-primary py-3 text-xs shadow-premium disabled:opacity-45 disabled:cursor-not-allowed disabled:scale-100"
                    >
                      Entregar Trabajo
                    </button>
                  </form>
                </div>
              )}

              {studentSubmitSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex gap-2 items-center">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{studentSubmitSuccess}</span>
                </div>
              )}

              {studentSubmitError && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex gap-2 items-center">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{studentSubmitError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PANEL ADMINISTRADOR (INSTITUCIONAL) */}
        {activeTab === 'admin' && isAuthenticated && user?.role === 'institution_admin' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Header Módulo Administrador */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2.5 text-slate-800 dark:text-white">
                  <div className="p-2.5 bg-brand-500/10 text-brand-500 rounded-2xl">
                    <User className="h-6 w-6" />
                  </div>
                  <span>Panel de Administración Institucional</span>
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  Gestiona las licencias de docentes y alumnos, monitorea el uso de palabras y revisa el historial de actividad global.
                </p>
              </div>
              <button
                onClick={fetchAdminData}
                disabled={isAdminLoading}
                className="btn-primary py-2.5 text-xs flex items-center gap-2 shadow-premium font-bold uppercase tracking-wider"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isAdminLoading ? 'animate-spin' : ''}`} />
                {isAdminLoading ? 'Cargando...' : 'Actualizar Datos'}
              </button>
            </div>

            {/* Grid de Monitoreo de Uso (Metrics) */}
            {adminStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 relative overflow-hidden group hover:border-brand-500/30 transition-all duration-300">
                  <div className="absolute top-[-5px] right-[-5px] p-3 opacity-[0.08] text-brand-500">
                    <User className="h-16 w-16" />
                  </div>
                  <span className="block text-3xl font-black text-brand-600 dark:text-brand-400 tracking-tight">{adminStats.total_users}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Usuarios Totales</span>
                </div>

                <div className="glass-card p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
                  <div className="absolute top-[-5px] right-[-5px] p-3 opacity-[0.08] text-indigo-500">
                    <FileText className="h-16 w-16" />
                  </div>
                  <span className="block text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{adminStats.total_words_processed.toLocaleString()}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Palabras Analizadas</span>
                </div>

                <div className="glass-card p-6 relative overflow-hidden group hover:border-violet-500/30 transition-all duration-300">
                  <div className="absolute top-[-5px] right-[-5px] p-3 opacity-[0.08] text-violet-500">
                    <Sparkles className="h-16 w-16" />
                  </div>
                  <span className="block text-3xl font-black text-violet-600 dark:text-violet-400 tracking-tight">{adminStats.total_analyses}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Análisis Realizados</span>
                </div>

                <div className="glass-card p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
                  <div className="absolute top-[-5px] right-[-5px] p-3 opacity-[0.08] text-cyan-500">
                    <GraduationCap className="h-16 w-16" />
                  </div>
                  <span className="block text-3xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight">{adminStats.total_submissions}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Entregas de Alumnos</span>
                </div>
              </div>
            )}

            {/* Fila de Gestión y Auditoría */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Sección: Asimilación de Licencia y Control de Profesores */}
              <div className="xl:col-span-2 glass-card p-6 space-y-4">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
                  <User className="h-5 w-5 text-brand-500" />
                  <span>Control de Profesores y Asimilación de Licencias</span>
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Fecha de Registro</th>
                        <th className="py-3 px-4">Licencia / Rol Actual</th>
                        <th className="py-3 px-4 text-center">Asimilar Licencia (Acciones)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-sm">
                      {adminUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="block font-bold text-slate-850 dark:text-slate-200">{u.full_name || "Sin nombre"}</span>
                            <span className="block text-xs text-slate-500 font-mono">{u.email}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                              u.role === 'institution_admin' 
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 border border-red-250/20'
                                : u.role === 'teacher'
                                ? 'bg-brand-100 text-brand-800 dark:bg-brand-950/30 dark:text-brand-400 border border-brand-250/20'
                                : u.role === 'premium_user'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-250/20'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                              className="text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer shadow-sm"
                            >
                              <option value="free_user">Free User (Alumno)</option>
                              <option value="premium_user">Premium User</option>
                              <option value="teacher">Teacher (Profesor)</option>
                              <option value="institution_admin">Admin Institucional</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sección: Historial de Actividad (Audit log + analyses + submissions) */}
              <div className="xl:col-span-1 glass-card p-6 space-y-4">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
                  <Clock className="h-5 w-5 text-brand-500" />
                  <span>Historial de Actividad Global</span>
                </h3>
                
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                  {adminLogs.map((log) => (
                    <div key={log.id} className="p-3.5 bg-slate-100/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-850/30 space-y-1.5 hover:border-brand-500/20 transition-all">
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span className="font-extrabold uppercase tracking-widest text-brand-500">{log.type}</span>
                        <span className="font-medium">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                        {log.description}
                      </p>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span className="truncate max-w-[130px] font-mono">{log.user_email}</span>
                        <span className="text-slate-400">{log.detail}</span>
                      </div>
                    </div>
                  ))}
                  {adminLogs.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-10">No hay eventos de actividad recientes.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  )
}
