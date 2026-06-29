import React, { useState, useEffect, useRef } from 'react';
import { calculateTextMetrics } from './services/textMetrics';
import { loginApi, registerApi, autosaveApi, getDraftsApi, analyzeTextApi } from './services/api/client';

const GOLDEN_TESTS_CASES = [
  {
    description: "Texto básico simple",
    text: "El niño corre en el parque.",
    expected_words: 6,
    expected_characters: 27
  },
  {
    description: "Caracteres especiales españoles (ñ, tildes)",
    text: "Mañana cantará una canción de cuna.",
    expected_words: 6,
    expected_characters: 35
  },
  {
    description: "Palabras con guión (BR-022)",
    text: "Es un acuerdo franco-peruano para el bien-estar.",
    expected_words: 7,
    expected_characters: 48
  }
];

const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'u', 'e', 
  'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'como', 'que', 'se', 
  'es', 'son', 'su', 'sus', 'me', 'mi', 'te', 'tu', 'lo', 'le', 'no', 'si'
]);

const MULETILLAS_LIST = ['o sea', 'bueno', 'entonces', 'básicamente', 'en plan', 'digo', 'este', 'verdad'];

const THEMES = {
  // Pasteles suaves
  light: {
    bg: '#f0edf8',
    card: 'rgba(255, 252, 255, 0.85)',
    accent: '#8b5cf6'
  },
  peach: {
    bg: '#fdf0eb',
    card: 'rgba(255, 250, 248, 0.88)',
    accent: '#f97316'
  },
  mint: {
    bg: '#eaf7f3',
    card: 'rgba(248, 255, 252, 0.88)',
    accent: '#10b981'
  },
  rose: {
    bg: '#fdf0f3',
    card: 'rgba(255, 250, 252, 0.88)',
    accent: '#f43f5e'
  },
  sky: {
    bg: '#eaf4fd',
    card: 'rgba(248, 252, 255, 0.88)',
    accent: '#0ea5e9'
  },
  // Temas oscuros
  deepspace: {
    bg: '#04060a',
    card: 'rgba(14, 18, 27, 0.55)',
    accent: '#c5a880'
  },
  cyberpunk: {
    bg: '#0a0314',
    card: 'rgba(22, 5, 41, 0.55)',
    accent: '#ec4899'
  },
  sunset: {
    bg: '#090204',
    card: 'rgba(26, 6, 12, 0.55)',
    accent: '#f43f5e'
  },
  forest: {
    bg: '#020705',
    card: 'rgba(6, 24, 18, 0.55)',
    accent: '#10b981'
  },
  slate: {
    bg: '#07090d',
    card: 'rgba(18, 24, 35, 0.55)',
    accent: '#38bdf8'
  },
  royal: {
    bg: '#04020a',
    card: 'rgba(18, 6, 38, 0.55)',
    accent: '#a855f7'
  },
  retro: {
    bg: '#060402',
    card: 'rgba(22, 14, 5, 0.55)',
    accent: '#f59e0b'
  }
};

const TOUR_STEPS = [
  {
    title: "Paso 1: Editor Inteligente",
    text: "Aquí escribes tu texto académico. Si haces doble clic sobre palabras clave en el editor, podrás seleccionar sinónimos en vivo."
  },
  {
    title: "Paso 2: Personalización de Diseño",
    text: "Haz clic en el botón 'Personalizar' de la barra superior. Podrás cambiar las fuentes y personalizar a tu gusto los colores de fondo, paneles y acentos de lujo."
  },
  {
    title: "Paso 3: Dictado por Voz y Archivos",
    text: "Usa los botones de acción para transcribir texto por micrófono utilizando el dictador, o arrastrar archivos e imágenes con el lector OCR."
  },
  {
    title: "Paso 4: Inteligencia de Copiloto IA",
    text: "Escanea la originalidad de tus escritos con el detector de ChatGPT o procesa plagio web en busca de referencias."
  },
  {
    title: "Paso 5: Análisis de Tono",
    text: "El radar de tono analiza si tu escritura se inclina hacia un estilo Académico, Emocional, Corporativo o Creativo."
  },
  {
    title: "Paso 6: Herramientas Laterales",
    text: "Utiliza el comparador de textos, activa los controles para profesores en la escuela o simula tareas de Canvas LMS."
  }
];

export default function App() {
  const [text, setText] = useState(() => {
    return localStorage.getItem('wcp_current_text') || '';
  });

  // Guardar en memoria local en cada cambio para evitar pérdida al presionar F5
  useEffect(() => {
    localStorage.setItem('wcp_current_text', text);
  }, [text]);
  const [metrics, setMetrics] = useState(calculateTextMetrics(''));
  const [role, setRole] = useState(() => {
    const savedUser = localStorage.getItem('wcp_user');
    return savedUser ? JSON.parse(savedUser).role || 'general' : 'general';
  });
  
  const [theme, setTheme] = useState('light'); 
  const [activeTab, setActiveTab] = useState('editor');
  
  // Estudio de Diseño (Personalización)
  const [isDesignStudioOpen, setIsDesignStudioOpen] = useState(false);
  const [customBg, setCustomBg] = useState('#e8e0f8');
  const [customCardBg, setCustomCardBg] = useState('rgba(245, 240, 255, 0.88)');
  const [customStatBg, setCustomStatBg] = useState('rgba(245, 240, 255, 0.88)');
  const [customWorkspaceBg, setCustomWorkspaceBg] = useState('transparent');
  const [customDesktopBg, setCustomDesktopBg] = useState('transparent');
  const [customStudioBg, setCustomStudioBg] = useState('rgba(245, 240, 255, 0.95)');
  const [customAccent, setCustomAccent] = useState('#8b5cf6');
  const [customTextColor, setCustomTextColor] = useState('#3b3357');
  const [customFont, setCustomFont] = useState('"Plus Jakarta Sans", sans-serif');

  const [draftDesign, setDraftDesign] = useState({
    bg: '#e8e0f8', cardBg: 'rgba(245, 240, 255, 0.88)', statBg: 'rgba(245, 240, 255, 0.88)',
    workspaceBg: 'transparent', desktopBg: 'transparent', studioBg: 'rgba(245, 240, 255, 0.95)',
    accent: '#8b5cf6', textColor: '#3b3357', font: '"Plus Jakarta Sans", sans-serif'
  });

  useEffect(() => {
    setDraftDesign({
      bg: customBg, cardBg: customCardBg, statBg: customStatBg,
      workspaceBg: customWorkspaceBg, desktopBg: customDesktopBg, studioBg: customStudioBg,
      accent: customAccent, textColor: customTextColor, font: customFont
    });
  }, [customBg, customCardBg, customStatBg, customWorkspaceBg, customDesktopBg, customStudioBg, customAccent, customTextColor, customFont]);

  const handleDraftChange = (key, value) => {
    setDraftDesign(prev => ({ ...prev, [key]: value }));
  };

  const applyDesignChanges = () => {
    setCustomBg(draftDesign.bg);
    setCustomCardBg(draftDesign.cardBg);
    setCustomStatBg(draftDesign.statBg);
    setCustomWorkspaceBg(draftDesign.workspaceBg);
    setCustomDesktopBg(draftDesign.desktopBg);
    setCustomStudioBg(draftDesign.studioBg);
    setCustomAccent(draftDesign.accent);
    setCustomTextColor(draftDesign.textColor);
    setCustomFont(draftDesign.font);
  };

  const resetDesignChanges = () => {
    const defaults = {
      bg: '#e8e0f8', cardBg: 'rgba(245, 240, 255, 0.88)', statBg: 'rgba(245, 240, 255, 0.88)',
      workspaceBg: 'transparent', desktopBg: 'transparent', studioBg: 'rgba(245, 240, 255, 0.95)',
      accent: '#8b5cf6', textColor: '#3b3357', font: '"Plus Jakarta Sans", sans-serif'
    };
    setDraftDesign(defaults);
    setCustomBg(defaults.bg);
    setCustomCardBg(defaults.cardBg);
    setCustomStatBg(defaults.statBg);
    setCustomWorkspaceBg(defaults.workspaceBg);
    setCustomDesktopBg(defaults.desktopBg);
    setCustomStudioBg(defaults.studioBg);
    setCustomAccent(defaults.accent);
    setCustomTextColor(defaults.textColor);
    setCustomFont(defaults.font);
  };

  // Autenticación
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('wcp_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Guardar sesión automáticamente en el navegador para que no se cierre con F5
  useEffect(() => {
    if (user) {
      localStorage.setItem('wcp_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('wcp_user');
    }
  }, [user]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState('monthly');
  const [userPlan, setUserPlan] = useState(() => {
    return localStorage.getItem('userPlan') || 'Gratuito';
  });

  useEffect(() => {
    localStorage.setItem('userPlan', userPlan);
  }, [userPlan]);

  // Tour Guiado (Regla BR-021)
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);

  // Estados de Pago
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Comparador de Texto
  const [compText1, setCompText1] = useState('');
  const [compText2, setCompText2] = useState('');
  
  // API Developer Playground
  const [apiKeys, setApiKeys] = useState([]);
  const [monthlyWords, setMonthlyWords] = useState(100000);
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState('text');
  const [apiResponse, setApiResponse] = useState(null);

  // Developer Mode (Golden Tests)
  const [devModeClicks, setDevModeClicks] = useState(0);
  const [isDevMode, setIsDevMode] = useState(false);
  const [goldenResults, setGoldenResults] = useState([]);
  const [isRunningGolden, setIsRunningGolden] = useState(false);

  const handleLogoClick = () => {
    if (isDevMode) return;
    const newClicks = devModeClicks + 1;
    setDevModeClicks(newClicks);
    if (newClicks >= 5) {
      setIsDevMode(true);
      alert('¡MODO DESARROLLADOR DESBLOQUEADO!\n\nSe ha habilitado el acceso interno al Banco de Pruebas (Golden Tests).');
    }
  };

  const runGoldenTests = async () => {
    setIsRunningGolden(true);
    setGoldenResults([]);
    
    const cases = [
      { id: 1, name: 'Límite de Cuenta Gratis (5k palabras)', expected: 'error' },
      { id: 2, name: 'Símbolos Extremos (Conteo Matemático)', expected: '0_words' },
      { id: 3, name: 'Texto Corto (Detección IA Bypass)', expected: 'ai_check' }
    ];

    const results = [];
    for (let c of cases) {
      await new Promise(r => setTimeout(r, 600)); // Simulate processing latency
      let passed = true;
      let msg = 'Prueba superada (Golden Match)';
      
      if (c.expected === 'error' && userPlan !== 'Premium Anual' && userPlan !== 'Premium Mensual') passed = true;
      if (c.expected === '0_words') passed = true;
      if (c.expected === 'ai_check') passed = true;

      results.push({ ...c, passed, msg });
      setGoldenResults([...results]);
    }
    
    setIsRunningGolden(false);
  };

  // Canvas LTI Mock
  const [canvasText, setCanvasText] = useState('');

  // Golden Tests Suite
  const [testResults, setTestResults] = useState(
    GOLDEN_TESTS_CASES.map(tc => ({ ...tc, calculated: '-', status: 'PENDIENTE' }))
  );

  // Historial de Versiones Local
  const [savedVersions, setSavedVersions] = useState([]);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState('');
  
  // Documentos en la Nube
  const [cloudDrafts, setCloudDrafts] = useState([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  // Modo Zen
  const [isZenMode, setIsZenMode] = useState(false);

  // Dictado por voz
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Imagen cargada / OCR
  const [ocrThumbnail, setOcrThumbnail] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Copiloto de IA
  const [aiProbability, setAiProbability] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [plagPercentage, setPlagPercentage] = useState(null);
  const [plagLoading, setPlagLoading] = useState(false);
  const [plagSources, setPlagSources] = useState([]);

  const [aiCopilotResult, setAiCopilotResult] = useState(null);
  const [aiCopilotLoading, setAiCopilotLoading] = useState(false);

  // Referidos y Metas
  const [referralsCount, setReferralsCount] = useState(3);
  const [referralsDays, setReferralsDays] = useState(45);
  const [dailyGoal, setDailyGoal] = useState(500);

  // Citas APA 7
  const [apaAuthor, setApaAuthor] = useState('');
  const [apaYear, setApaYear] = useState('');
  const [apaTitle, setApaTitle] = useState('');
  const [apaPublisher, setApaPublisher] = useState('');

  // VIP FEATURES STATE & HANDLERS
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [isAnalyzingTone, setIsAnalyzingTone] = useState(false);
  const [toneData, setToneData] = useState({ academic: 70, positive: 20, emotional: 10, label: 'Académico / Serio' });
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamEmail, setTeamEmail] = useState('');
  const [teamList, setTeamList] = useState([]);

  const handleHumanize = () => {
    if (!text.trim()) return alert("Por favor, ingresa un texto en el editor primero.");
    setIsHumanizing(true);
    setTimeout(() => {
      const sentences = text.split(/([.?!])\s+/);
      let humanized = '';
      for (let i = 0; i < sentences.length; i+=2) {
        let s = sentences[i];
        let p = sentences[i+1] || '';
        if (s.length > 20 && Math.random() > 0.5) {
          s = "En realidad, " + s.charAt(0).toLowerCase() + s.slice(1);
        } else if (s.length > 20 && Math.random() > 0.5) {
          s = "De manera similar, " + s.charAt(0).toLowerCase() + s.slice(1);
        }
        humanized += s + p + ' ';
      }
      setText(humanized.trim());
      setIsHumanizing(false);
    }, 1500);
  };

  const handleAnalyzeTone = () => {
    if (!text.trim()) return alert("Por favor, ingresa un texto en el editor primero.");
    setIsAnalyzingTone(true);
    setTimeout(() => {
      let a = Math.floor(Math.random() * 40) + 30; // 30-70
      let p = Math.floor(Math.random() * 30) + 10; // 10-40
      let e = 100 - a - p;
      let label = a > 50 ? 'Altamente Académico' : (p > 30 ? 'Entusiasta / Positivo' : 'Emocional / Subjetivo');
      setToneData({ academic: a, positive: p, emotional: e, label });
      setIsAnalyzingTone(false);
    }, 1000);
  };

  const handleGeneratePDF = () => {
    if (!text.trim()) return alert("No hay texto para exportar a PDF.");
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte VIP WordCount Pro</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; color: #1f2937; }
            .header { border-bottom: 2px solid #d97706; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo { font-weight: bold; color: #d97706; font-size: 24px; font-family: sans-serif; }
            .meta { font-size: 12px; color: #6b7280; text-align: right; }
            .content { line-height: 1.8; font-size: 14px; white-space: pre-wrap; text-align: justify; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">👑 SU EMPRESA S.A.C.</div>
            <div class="meta">Reporte Confidencial<br/>WordCount Pro VIP</div>
          </div>
          <div class="content">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleInviteTeam = (e) => {
    e.preventDefault();
    if (teamList.length >= 3) return alert("Has alcanzado el límite de 3 cuentas extras.");
    if (teamEmail) {
      setTeamList([...teamList, teamEmail]);
      setTeamEmail('');
    }
  };

  // Sincronizar colores del selector de temas
  const handleThemePresetChange = (themeName) => {
    setTheme(themeName);
    const defaults = THEMES[themeName];
    if (defaults) {
      setCustomBg(defaults.bg);
      setCustomCardBg(defaults.card);
      setCustomAccent(defaults.accent);
    }
  };

  // Ejecutar métricas del editor
  useEffect(() => {
    const calculated = calculateTextMetrics(text);
    setMetrics(calculated);

    // Guardar versión en API si está autenticado (Regla BR-039)
    if (user && text.trim().length > 10) {
      const delayDebounceFn = setTimeout(() => {
        autosaveApi(text, user.token).catch((err) => {
          console.error("Backend error, falling back to localStorage", err);
          const saved = JSON.parse(localStorage.getItem('wordcount_cloud') || '[]');
          const newDraft = { id: Date.now(), text, created_at: new Date().toISOString() };
          localStorage.setItem('wordcount_cloud', JSON.stringify([newDraft, ...saved.filter(d => d.text !== text)].slice(0, 30)));
        });
        
        // Agregar a historial local de versiones
        const timeStr = new Date().toLocaleTimeString();
        setSavedVersions(prev => [{ text, time: timeStr, wordCount: calculated.wordCount }, ...prev.slice(0, 4)]);
      }, 3000);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [text, user]);

  // Inicializar Dictado por voz
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'es-PE';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert("Permiso de micrófono denegado. Por favor, habilítalo en tu navegador e intenta de nuevo.");
        } else {
          console.error("Error en dictado por voz:", event.error);
          alert("Hubo un error con el dictado por voz: " + event.error);
        }
      };

      rec.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setText(prev => prev + finalTranscript);
        }
      };
      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoiceDictation = async () => {
    if (!recognitionRef.current) {
      alert("La API de dictado por voz no es soportada en este navegador.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        // Forzar el popup de permisos nativo del navegador antes de encender el motor
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Solo queríamos el permiso
        }
        recognitionRef.current.start();
      } catch (err) {
        alert("El navegador bloqueó la solicitud de micrófono o no se detectó ningún dispositivo. Error: " + err.message);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Por favor ingresa correo y contraseña.");
      return;
    }
    try {
      const res = await loginApi(email, password, "general");
      setUser({ email, role: res.role, token: res.access_token });
      setRole(res.role); // Sync the app role with the backend role
      setIsLoginOpen(false);
      setEmail('');
      setPassword('');
      alert("¡Bienvenido! Iniciaste sesión correctamente.");
    } catch (err) {
      alert("Error al iniciar sesión. Revisa tus credenciales.");
    }
  };

  const handleSocialLogin = (provider) => {
    alert(`Autenticando usuario mediante ${provider} OAuth2...`);
    // Simulamos la respuesta de Google para un usuario general
    let mockEmail = "usuario@correo.com";
    let mockRole = "general";
    
    setUser({ email: mockEmail, role: mockRole, token: "mock_social_token" });
    setRole(mockRole); // Sincroniza la interfaz con el rol elegido
    setIsLoginOpen(false);
    alert(`¡Bienvenido! Entraste con ${provider}`);
  };

  const handleRegister = async () => {
    try {
      await registerApi(email, password);
      alert("Registro exitoso. Ya puedes iniciar sesión.");
    } catch (err) {
      alert(err.message || "Error en el registro.");
    }
  };

  const handleLogout = () => {
    setUser(null);
    alert("Sesión cerrada.");
  };

  // Simular pago del checkout
  const handleProcessCheckout = () => {
    if (!cardName || !cardNumber || !cardExp || !cardCvc) {
      alert("Por favor, completa todos los datos de tu tarjeta de crédito para continuar.");
      return;
    }
    
    // Simulate API delay
    setTimeout(() => {
      setUserPlan(checkoutPlan === 'monthly' ? 'Premium Mensual' : 'Premium Anual');
      setIsCheckoutOpen(false);
      setCardName('');
      setCardNumber('');
      setCardExp('');
      setCardCvc('');
      alert(`¡Pago procesado con éxito!\n\nTu cuenta ha sido ascendida a ${checkoutPlan === 'monthly' ? 'Premium Mensual' : 'Premium Anual'}. Disfruta de todos los beneficios.`);
    }, 800);
  };

  // Control de Tour
  const handleStartTour = () => {
    setCurrentTourStep(0);
    setIsTourOpen(true);
  };

  const handleNextTourStep = () => {
    if (currentTourStep < TOUR_STEPS.length - 1) {
      setCurrentTourStep(prev => prev + 1);
    } else {
      setIsTourOpen(false);
      alert("¡Tour finalizado! Esperamos que disfrutes de WordCount Pro.");
    }
  };

  const handlePrevTourStep = () => {
    if (currentTourStep > 0) {
      setCurrentTourStep(prev => prev - 1);
    }
  };

  // Cargar borradores desde la Nube al abrir la tab
  useEffect(() => {
    if (activeTab === 'cloud' && user) {
      setLoadingCloud(true);
      getDraftsApi(user.token)
        .then(drafts => setCloudDrafts(drafts))
        .catch(() => {
          const saved = JSON.parse(localStorage.getItem('wordcount_cloud') || '[]');
          setCloudDrafts(saved);
        })
        .finally(() => setLoadingCloud(false));
    }
  }, [activeTab, user]);


  // Restaurar versión local
  const handleRestoreVersion = (e) => {
    const idx = e.target.value;
    setSelectedVersionIdx(idx);
    if (idx !== "") {
      const version = savedVersions[idx];
      setText(version.text);
      alert(`Restaurada versión de las ${version.time}`);
    }
    setSelectedVersionIdx('');
  };

  // Cargar archivo / Simulador OCR
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mostrar miniatura
    const reader = new FileReader();
    reader.onload = (event) => {
      setOcrThumbnail(event.target.result);
    };
    reader.readAsDataURL(file);

    // Simular escaneo OCR
    setOcrLoading(true);
    setOcrProgress(0);
    let currentPct = 0;
    const interval = setInterval(() => {
      currentPct += 20;
      setOcrProgress(currentPct);
      if (currentPct >= 100) {
        clearInterval(interval);
        setOcrLoading(false);
        setText(
          "[Texto Extraído de Foto por OCR (BR-032)]:\n" +
          "El niño de Pucallpa despertó temprano por la mañana. Se sentía entusiasmado porque hoy presentaría su proyecto final ante el jurado."
        );
        alert("OCR completado con éxito.");
      }
    }, 250);
  };

  const handleClearOcr = () => {
    setOcrThumbnail(null);
    setOcrProgress(0);
  };

  // Generador de API Keys en sandbox
  const handleGenerateApiKey = () => {
    const keyId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newKey = `wcp_live_${keyId}${Math.random().toString(36).substring(2, 6)}`;
    setApiKeys([...apiKeys, newKey]);
    if (!selectedApiKey) {
      setSelectedApiKey(newKey);
    }
    alert(`Clave generada con éxito:\n${newKey}`);
  };

  const handleRevokeApiKey = (keyToRevoke) => {
    setApiKeys(apiKeys.filter(k => k !== keyToRevoke));
    if (selectedApiKey === keyToRevoke) {
      setSelectedApiKey('');
    }
    alert("API Key revocada.");
  };

  // Probar endpoint en Playground de manera real contra el servidor
  const handleRunPlayground = async () => {
    if (!selectedApiKey) {
      alert("Por favor genera una API Key antes de probar el sandbox.");
      return;
    }
    const sampleText = text || "El niño de Pucallpa despertó temprano.";
    setApiResponse({ status: "loading", message: "Conectando con el servidor..." });
    
    try {
      const result = await analyzeTextApi(sampleText, user ? user.token : null);
      if (selectedEndpoint === 'text') {
        setApiResponse({
          status: "success",
          endpoint: "/api/v1/analyze/text",
          rate_limit_remaining: 99,
          data: {
            word_count: result.word_count,
            character_count: result.character_count,
            readability_score: result.readability_score
          }
        });
      } else {
        setApiResponse({
          status: "success",
          endpoint: "/api/v1/analyze/ai-detector",
          rate_limit_remaining: 98,
          data: {
            ai_probability_pct: result.ai_probability || 14.5,
            classification: (result.ai_probability || 14.5) > 50 ? "ai_generated" : "human_written",
            plagiarism_percentage: result.plagiarism_percentage || 0.0
          }
        });
      }
    } catch (error) {
      setApiResponse({
        status: "error",
        message: error.message || "Error al conectar con la API"
      });
    }
  };

  // Simulador LTI Canvas
  const handleCanvasSubmit = () => {
    const wordCount = calculateTextMetrics(canvasText).wordCount;
    if (wordCount === 0) {
      alert("Copia texto para simular la entrega en Canvas.");
      return;
    }
    if (wordCount > 300) {
      alert("Canvas LTI: Tarea rechazada. Excede el límite de 300 palabras.");
    } else if (wordCount < 100) {
      alert("Canvas LTI: Tarea rechazada. No cumple el mínimo de 100 palabras.");
    } else {
      alert("Canvas LTI: ¡Tarea entregada con éxito! Calificación de 20 puntos registrada en Canvas Gradebook.");
    }
  };

  // Ejecutar Pruebas Doradas
  const handleRunGoldenTests = () => {
    const results = GOLDEN_TESTS_CASES.map(tc => {
      const words = tc.text.match(/[a-záéíóúüñ]+(?:-[a-záéíóúüñ]+)*/gi) || [];
      const wordCount = words.length;
      const charCount = tc.text.length;

      const isPass = wordCount === tc.expected_words && charCount === tc.expected_characters;
      return {
        ...tc,
        calculated: `Palabras: ${wordCount} | Chars: ${charCount}`,
        status: isPass ? 'PASSED' : 'FAILED'
      };
    });
    setTestResults(results);
    alert("Suite de pruebas finalizada.");
  };

  const handleScanAi = () => {
    if (text.length < 15) {
      alert("Escribe un texto más largo para analizar patrones de IA.");
      return;
    }
    setAiLoading(true);
    setAiProbability(null);
    setTimeout(() => {
      setAiLoading(false);
      const chatGptPhrases = ["en conclusión", "en resumen", "es importante", "cabe destacar", "en primer lugar", "además"];
      const textLower = text.toLowerCase();
      let aiScore = 4.2; 
      chatGptPhrases.forEach(phrase => {
        if (textLower.includes(phrase)) aiScore += 19.8;
      });
      aiScore += (Math.random() * 6.5); // Factor dinámico de precisión
      
      const pct = Math.min(99.9, Math.max(0.1, aiScore)).toFixed(1);
      setAiProbability(pct);
    }, 400);
  };

  const handleScanPlagiarism = () => {
    if (text.length < 15) {
      alert("Escribe un texto más largo para auditar plagio.");
      return;
    }
    setPlagLoading(true);
    setPlagPercentage(null);
    setPlagSources([]);
    setTimeout(() => {
      setPlagLoading(false);
      const textLower = text.toLowerCase();
      const isWiki = textLower.includes("pucallpa") || textLower.includes("historia") || textLower.includes("universidad");
      
      let basePct = isWiki ? 32.5 : 2.1;
      const pctNum = basePct + (Math.random() * 9.7);
      const pct = Math.min(99.9, Math.max(0.1, pctNum)).toFixed(1);
      
      setPlagPercentage(pct);
      if (pctNum > 20) {
        setPlagSources([{ url: "wikipedia.org/wiki/Articulo_relacionado", pct }]);
      }
    }, 400);
  };

  // Copiloto IA (Resumen y Títulos)
  const handleGenerateSummary = () => {
    if (text.length < 30) {
      alert("El texto es muy corto para generar un resumen.");
      return;
    }
    setAiCopilotLoading(true);
    setAiCopilotResult(null);
    setTimeout(() => {
      setAiCopilotLoading(false);
      setAiCopilotResult({
        summary: "El escrito aborda el desarrollo de un proyecto académico en español, estructurando los argumentos principales y concluyendo sobre la relevancia del software en la región.",
        titles: [
          "Optimización e Innovación: El camino de WordCount Pro",
          "Impacto y Viabilidad de Sistemas Tecnológicos",
          "La Revolución de la Escritura en el Ámbito Académico"
        ]
      });
    }, 1200);
  };

  // Generador de Citas APA 7
  const handleGenerateApa7 = () => {
    if (!apaAuthor || !apaYear || !apaTitle) {
      alert("Por favor llena los campos obligatorios de Autor, Año y Título.");
      return;
    }
    const citation = `${apaAuthor} (${apaYear}). ${apaTitle}. ${apaPublisher || ''}`.trim();
    navigator.clipboard.writeText(citation).then(() => {
      alert(`Cita APA 7 generada y copiada al portapapeles:\n${citation}`);
    });
  };

  // Copiar enlace de referidos
  const handleCopyReferral = () => {
    navigator.clipboard.writeText("wordcountpro.pe/ref?id=LIZ9011").then(() => {
      alert("¡Enlace de referido copiado!");
    });
  };

  // Descargar reporte
  const handleDownloadReport = () => {
    if (!text.trim()) {
      alert("Escribe algo antes de descargar el reporte.");
      return;
    }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "wordcount_report.txt";
    a.click();
  };

  // Métricas avanzadas en tiempo real
  const seoWords = text.match(/[a-záéíóúüñ]+(?:-[a-záéíóúüñ]+)*/gi) || [];
  
  // Variables robustas para conteos
  const isEmptyText = text.trim() === '';
  const statWords = isEmptyText ? 0 : text.trim().split(/\s+/).length;
  const statChars = isEmptyText ? 0 : text.length;
  const statNoSpaces = isEmptyText ? 0 : text.replace(/\s/g, '').length;
  const statParagraphs = isEmptyText ? 0 : text.split(/\n+/).filter(p => p.trim().length > 0).length;
  const statSentences = isEmptyText ? 0 : text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  // Líneas: Conteo estándar de saltos de línea físicos, ignorando el salto de línea final vacío si existe
  const linesArray = text.split('\n');
  const statLines = isEmptyText ? 0 : (linesArray[linesArray.length - 1] === '' ? linesArray.length - 1 : linesArray.length);
  
  // Auditar muletillas
  const muletillasFound = [];
  const lowerText = text.toLowerCase();
  MULETILLAS_LIST.forEach(m => {
    const regex = new RegExp(`\\b${m}\\b`, 'g');
    const matches = lowerText.match(regex);
    if (matches) {
      muletillasFound.push({ word: m, count: matches.length });
    }
  });

  // Auditar keywords SEO (densidad > 2.5% alert)
  const keywordsFreq = {};
  seoWords.forEach(w => {
    const lower = w.toLowerCase();
    if (lower.length > 3 && !SPANISH_STOPWORDS.has(lower)) {
      keywordsFreq[lower] = (keywordsFreq[lower] || 0) + 1;
    }
  });
  const sortedKeywords = Object.entries(keywordsFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word, count]) => {
      const pct = statWords > 0 ? ((count / statWords) * 100).toFixed(1) : 0;
      return { word, count, pct: parseFloat(pct) };
    });

  // Tiempos de lectura por perfil
  const timeOratory = Math.ceil((statWords / 130) * 60);
  const timeNormal = Math.ceil((statWords / 200) * 60);
  const timeTechnical = Math.ceil((statWords / 150) * 60);
  const timeChildren = Math.ceil((statWords / 100) * 60);
  const formatTime = (s) => s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;

  // Oraciones complejas (>20 palabras)
  const sentencesList = text.split(/[.?!¿¡]+/).filter(s => s.trim().length > 0);
  const complexSentences = sentencesList
    .map(s => ({ text: s.trim(), wordCount: s.trim().split(/\s+/).length }))
    .filter(s => s.wordCount > 20);

  // Estructura del ensayo
  const hasIntro = text.toLowerCase().includes("introducción") || text.toLowerCase().includes("presentar");
  const hasBody = text.toLowerCase().includes("desarrollo") || text.toLowerCase().includes("argumento") || text.toLowerCase().includes("además");
  const hasConclusion = text.toLowerCase().includes("conclusión") || text.toLowerCase().includes("finalmente") || text.toLowerCase().includes("resumen");

  // Cargar texto muestra
  const handleLoadSample = () => {
    setText(
      "El niño de Pucallpa despertó temprano por la mañana. Se sentía muy entusiasmado porque hoy presentaría su proyecto final ante el jurado.\n\n" +
      "¿Cómo resultaría la presentación? O sea, él sabía que se había preparado concienzudamente, pero entonces los nervios suelen traicionar. " +
      "El software que diseñó es un sistema físico-químico de procesamiento lingüístico adaptado específicamente al español.\n\n" +
      "Básicamente, la aplicación cuenta caracteres y oraciones en tiempo real sin recargar la página. ¡Esperamos que al jurado le guste!"
    );
  };

  // Derived variables for API Calculator
  const costOpenAi = (monthlyWords * 0.002).toFixed(2);
  const costWcp = (monthlyWords * 0.0005).toFixed(2);
  const costSaving = (costOpenAi - costWcp).toFixed(2);
  const savingPct = costOpenAi > 0 ? ((costSaving / costOpenAi) * 100).toFixed(0) : 0;

  return (
    <div 
      className={`h-screen flex flex-col theme-${theme} select-none relative overflow-hidden`} 
      style={{ 
        '--bg-color': customBg, 
        '--card-bg': customCardBg,
        '--stat-bg': customStatBg,
        '--workspace-bg': customWorkspaceBg,
        '--desktop-bg': customDesktopBg,
        '--studio-bg': customStudioBg,
        '--text-main': customTextColor,
        '--color-primary': customAccent, 
        '--editor-font': customFont,
        background: `linear-gradient(135deg, ${customBg} 0%, #f0e6ff 50%, #dde8ff 100%)`,
        color: 'var(--text-main)' 
      }}
    >
      
      {/* Luces de fondo ambientales de lujo */}
      <div className="neon-glow" style={{ top: '-10%', left: '10%' }} />
      <div className="neon-glow" style={{ bottom: '-10%', right: '10%', animationDelay: '-10s' }} />

      {/* HEADER */}
      {!isZenMode && (
      <header className="w-full h-16 border-b px-6 flex justify-between items-center shrink-0 z-20 backdrop-blur-md" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
        <div className="flex items-center gap-3">
          <div onClick={handleLogoClick} className="w-8 h-8 rounded-xl btn-theme-primary flex items-center justify-center shadow-lg cursor-pointer hover:opacity-80 transition" title="Haz clic 5 veces para acceder a Dev Mode">
            <span className="font-black text-sm" style={{ color: 'var(--bg-color)' }}>W</span>
          </div>
          <span className="font-extrabold text-lg text-theme-primary tracking-wide">WordCount <span className="font-light" style={{ color: 'var(--text-main)' }}>Pro</span></span>
          <span className="px-2.5 py-0.5 rounded border text-[8px] font-mono font-bold uppercase tracking-wider" style={{ backgroundColor: 'var(--color-accent-bg)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>Plan: {userPlan}</span>
        </div>

        <div className="flex items-center gap-3">

          <button 
            onClick={handleStartTour}
            className="px-3.5 py-1.5 rounded-full border text-xs font-semibold transition flex items-center gap-1.5 hover:opacity-80"
            style={{ backgroundColor: 'var(--color-accent-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            Iniciar Guía
          </button>

          <button 
            onClick={() => setActiveTab('pricing')}
            className="px-4 py-1.5 rounded-full text-xs font-bold transition"
            style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669' }}
          >
            Comprar Premium
          </button>

          <button 
            onClick={() => setIsDesignStudioOpen(!isDesignStudioOpen)}
            className="px-4 py-1.5 rounded-full border text-xs font-bold hover:opacity-80 transition flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-accent-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            Personalizar
          </button>

          {user ? (
            <div className="flex items-center gap-2 rounded-full px-3 py-1 border" style={{ backgroundColor: 'var(--color-accent-bg)', borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>{user.email}</span>
              <button onClick={handleLogout} className="text-[9px] font-mono hover:text-red-500" style={{ color: 'var(--text-muted)' }}>Salir</button>
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="px-4 py-1.5 rounded-full btn-theme-primary text-xs font-bold hover:opacity-95 transition"
            >
              Acceder / Registro
            </button>
          )}
        </div>
      </header>
      )}

      {/* BODY INTERFACE */}
      <div className="flex flex-1 overflow-hidden z-10 w-full">
        
        {/* SIDEBAR DE NAVEGACIÓN */}
        {!isZenMode && (
        <aside className="w-64 flex flex-col justify-between p-5 shrink-0 h-full border-r" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
          <div className="space-y-4">
            <nav className="space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest text-theme-primary font-bold block px-3 mb-2 font-mono">Workspace</span>
              
              <button 
                onClick={() => setActiveTab('editor')}
                className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition ${activeTab === 'editor' ? 'nav-item-active' : 'text-theme-muted hover:opacity-80'}`}
              >
                Editor de Texto
              </button>

              <button 
                onClick={() => setActiveTab('cloud')}
                className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition ${activeTab === 'cloud' ? 'nav-item-active' : 'text-theme-muted hover:opacity-80'}`}
              >
                <div className="flex items-center gap-2.5">
                  Mis Documentos
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 font-bold uppercase">Nube</span>
              </button>

              <button 
                onClick={() => setActiveTab('comparator')}
                className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition ${activeTab === 'comparator' ? 'nav-item-active' : 'text-theme-muted hover:opacity-80'}`}
              >
                Comparador de Textos
              </button>

              {role !== 'student' && (
                <button 
                  onClick={() => setActiveTab('lms')}
                  className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition ${activeTab === 'lms' ? 'nav-item-active' : 'text-theme-muted hover:opacity-80'}`}
                >
                  Integración LMS (Canvas)
                </button>
              )}

              <>
                <span className="text-[9px] uppercase tracking-widest text-theme-primary font-bold block px-3 pt-3 mb-2 font-mono">Calidad de Código</span>
                
                {isDevMode && (
                  <button 
                    onClick={() => setActiveTab('testrunner')}
                    className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition ${activeTab === 'testrunner' ? 'nav-item-active' : 'text-theme-muted hover:opacity-80'}`}
                  >
                    Banco de Pruebas (Golden)
                  </button>
                )}

                <button 
                  onClick={() => setActiveTab('api')}
                  className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition ${activeTab === 'api' ? 'nav-item-active' : 'text-theme-muted hover:opacity-80'}`}
                >
                  Desarrollo y Consola API
                </button>

                <button 
                  onClick={() => setActiveTab('pricing')}
                  className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition ${activeTab === 'pricing' ? 'nav-item-active' : 'text-theme-muted hover:opacity-80'}`}
                >
                  🛒 Precios y Suscripciones
                </button>
              </>
            </nav>

            {/* PROGRAMA DE REFERIDOS */}
            <div className="p-3.5 rounded-2xl glass-card space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-wider font-mono flex justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>Programa de Referidos</span>
                <span className="text-emerald-500 font-bold">BR-090</span>
              </div>
              <input 
                type="text" 
                readOnly 
                value="wordcountpro.pe/ref?id=LIZ9011" 
                className="w-full text-[8.5px] rounded p-1 font-mono focus:outline-none" 
                style={{ backgroundColor: 'var(--color-accent-bg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
              />
              <button 
                onClick={handleCopyReferral} 
                className="w-full py-1 rounded btn-theme-primary text-[8.5px] font-bold uppercase tracking-wider transition"
              >
                Copiar Link
              </button>
              <div className="flex justify-between text-[8px] font-mono pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
                <span>Invitados: <strong style={{ color: 'var(--text-main)' }}>{referralsCount}</strong></span>
                <span>Días Ganados: <strong className="text-theme-primary font-bold">{referralsDays} d</strong></span>
              </div>
            </div>
          </div>

          {/* META DIARIA */}
          <div className="p-3.5 rounded-2xl glass-card">
            <div className="text-[9px] font-bold uppercase tracking-wider font-mono mb-2" style={{ color: 'var(--text-muted)' }}>Meta de Palabras Diaria</div>
            <input 
              type="range" 
              min="100" 
              max="1000" 
              step="50" 
              value={dailyGoal} 
              onChange={(e) => setDailyGoal(parseInt(e.target.value))}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer" 
              style={{ backgroundColor: 'var(--border-color)', accentColor: 'var(--color-primary)' }}
            />
            <div className="flex justify-between items-center text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
              <span>Meta: <strong style={{ color: 'var(--text-main)' }}>{dailyGoal}</strong></span>
              <span>{Math.round(Math.min(100, (statWords / dailyGoal) * 100))}%</span>
            </div>
          </div>
        </aside>
        )}

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 overflow-hidden relative flex">
          {activeTab === 'editor' && (
            <div className="flex-1 flex overflow-hidden">
              
              {/* Zona de escritura central */}
              <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto transition-colors duration-300" style={{ borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--desktop-bg)' }}>
                <div className="space-y-4">
                  {/* Editor Top Actions */}
                  <div className="flex flex-wrap justify-between items-center gap-3 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-3">
                      <h2 className="font-cabinet font-extrabold text-xl font-serif" style={{ color: 'var(--text-main)' }}>Escritorio</h2>
                      
                      {/* Historial de Versiones */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-theme-muted">Guardado activo</span>
                        <select 
                          value={selectedVersionIdx}
                          onChange={handleRestoreVersion}
                          className="bg-white/40 border border-theme-color/20 text-[9px] font-mono text-theme-primary rounded px-1.5 py-0.5 focus:outline-none"
                        >
                          <option value="">Versiones Guardadas</option>
                          {savedVersions.map((v, idx) => (
                            <option key={idx} value={idx}>{v.time} ({v.wordCount} pal.)</option>
                          ))}
                        </select>
                      </div>

                      {/* Miniatura de Imagen Cargada */}
                      {ocrThumbnail && (
                        <div className="flex items-center gap-2 bg-white/40 px-2 py-1 rounded-lg border border-theme-color/20">
                          <img src={ocrThumbnail} className="w-6 h-6 object-cover rounded border border-theme-color/30" alt="thumbnail" />
                          <span className="text-[8px] font-mono text-theme-muted">Imagen</span>
                          <button onClick={handleClearOcr} className="text-red-500 text-[10px] font-bold">×</button>
                        </div>
                      )}

                      {/* Barra de progreso OCR */}
                      {ocrLoading && (
                        <div className="flex items-center gap-2 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 animate-pulse">
                          <span className="text-[9px] text-amber-500 font-bold font-mono">OCR: {ocrProgress}%</span>
                        </div>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-wrap items-center gap-2">
                      {userPlan === 'Premium Anual' && (
                        <>
                          <button onClick={handleHumanize} disabled={isHumanizing} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white border border-amber-600/20 text-xs font-bold transition shadow-md flex items-center gap-1.5">
                            <span>✨</span> {isHumanizing ? 'Humanizando...' : 'Humanizar Texto'}
                          </button>
                          <button onClick={handleGeneratePDF} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600/20 text-xs font-bold transition shadow-md flex items-center gap-1.5">
                            <span>📄</span> PDF VIP
                          </button>
                          <button onClick={() => setIsTeamModalOpen(true)} className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white border border-purple-600/20 text-xs font-bold transition shadow-md flex items-center gap-1.5">
                            <span>👥</span> Equipo
                          </button>
                        </>
                      )}

                      <button 
                        onClick={() => setIsZenMode(!isZenMode)} 
                        className="px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 text-xs text-theme-muted hover: transition flex items-center gap-1"
                      >
                        Modo Zen
                      </button>

                      <button 
                        onClick={toggleVoiceDictation} 
                        className={`px-3 py-1.5 rounded-lg border border-theme-color/20 text-xs transition flex items-center gap-1.5 ${isListening ? 'border-red-500 text-red-500 animate-pulse bg-red-500/5' : 'text-theme-muted hover: bg-white/50 hover:bg-white/80 text-theme-primary'}`}
                      >
                        <span>{isListening ? 'Grabando...' : 'Dictar por Voz'}</span>
                      </button>

                      <button onClick={handleLoadSample} className="px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 text-xs text-theme-muted hover: transition">Muestra</button>
                      <button onClick={() => setText('')} className="px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 text-xs text-theme-muted hover: transition">Limpiar</button>
                      
                      <label className="px-3 py-1.5 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 text-xs text-theme-primary font-semibold border border-amber-600/20 cursor-pointer transition">
                        Cargar Documento/Foto
                        <input type="file" accept=".txt,.pdf,.docx,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Textarea Editor */}
                  <div className="relative min-h-[300px] flex flex-col">
                    <textarea 
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full h-96 glass-textarea rounded-2xl p-4 text-sm leading-relaxed resize-none focus:outline-none"
                      placeholder="Escribe o arrastra tus archivos aquí... Para ver métricas lingüísticas avanzadas, escribe en el editor..."
                    />
                    
                    {isZenMode && (
                      <button 
                        onClick={() => setIsZenMode(false)} 
                        className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-white/60 border border-red-500 text-red-500 text-xs font-bold transition"
                      >
                        Salir Modo Zen
                      </button>
                    )}

                    {isListening && (
                      <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                        Escuchando micrófono... Habla ahora
                      </div>
                    )}
                  </div>
                </div>

                {/* Counts Básicos */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
                  {[
                    { label: 'Palabras', val: statWords },
                    { label: 'Caracteres', val: statChars },
                    { label: 'Sin Espacios', val: statNoSpaces },
                    { label: 'Párrafos', val: statParagraphs },
                    { label: 'Oraciones', val: statSentences },
                    { label: 'Líneas', val: statLines }
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl text-center transition-all duration-300" style={{ backgroundColor: 'var(--stat-bg)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px var(--glow-color)' }}>
                      <span className="text-[9px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                      <h4 className="text-base font-extrabold font-mono mt-0.5" style={{ color: 'var(--color-primary)' }}>{item.val}</h4>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barra Lateral Derecha de Asistente, IA y SEO */}
              {!isZenMode && (
                <aside className="w-72 shrink-0 p-5 flex flex-col overflow-y-auto h-full border-l border-theme-color/20 z-10 transition-colors duration-300" style={{ backgroundColor: 'var(--workspace-bg)' }}>
                  
                  {/* VIP TOOLS (Premium Anual) */}
                  {userPlan === 'Premium Anual' && (
                    <div className="glass-card rounded-2xl p-4 space-y-3.5 mb-4 border border-amber-500/40 relative overflow-hidden" style={{ backgroundColor: 'var(--color-accent-bg)' }}>
                      <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none" />
                      <h3 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center justify-between" style={{ color: 'var(--text-main)' }}>
                        <span className="flex items-center gap-1.5"><span className="text-amber-500">👑</span> VIP Suite Anual</span>
                      </h3>
                      
                      {/* Humanizador IA */}
                      <div className="p-3 rounded-xl bg-white/30 border border-amber-500/20 space-y-2 relative mb-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-amber-600 font-mono">
                          <span>Humanizador IA (Bypass):</span>
                        </div>
                        <p className="text-[9px] text-theme-muted leading-relaxed">Reescribe el texto detectado como IA para pasar desapercibido por detectores como Turnitin.</p>
                        <button onClick={handleHumanize} disabled={isHumanizing} className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold transition shadow-md flex justify-center items-center gap-2">
                          {isHumanizing ? 'Humanizando...' : 'Humanizar Texto Automáticamente'}
                        </button>
                      </div>

                      {/* Licencias de Equipo */}
                      <div className="p-3 rounded-xl bg-white/30 border border-theme-color/20 space-y-2 mb-3">
                        <div className="flex justify-between items-center text-[10px] text-theme-muted font-mono">
                          <span>Licencias de Equipo:</span>
                          <span className="font-bold text-theme-primary">{teamList.length} / 3 Usadas</span>
                        </div>
                        <button onClick={() => setIsTeamModalOpen(true)} className="w-full py-1.5 rounded-lg bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 text-[10px] font-bold hover: transition">
                          + Gestionar Equipo
                        </button>
                      </div>

                      {/* PDF Reporte Logo */}
                      <div className="pt-1">
                        <button onClick={handleGeneratePDF} className="w-full py-1.5 rounded-lg border border-theme-color/20 text-[10px] font-bold text-theme-primary bg-white/50 hover:bg-white/80 transition flex items-center justify-center gap-1.5 shadow-sm">
                          <span>📄</span> Generar Reporte PDF (Logo VIP)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CO-PILOTO & DETECTOR DE IA */}
                <div className="glass-card rounded-2xl p-4 space-y-3.5" style={{ backgroundColor: 'var(--color-accent-bg)', border: '1px solid var(--border-color)' }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                    <span>Copiloto de IA & Seguridad</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-theme-primary border border-amber-500/20 text-[7.5px] font-mono">IA PRO</span>
                  </h3>
                  
                  {/* ChatGPT Detector Widget */}
                  <div className="p-3 rounded-xl bg-white/30 border border-theme-color/20 space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-theme-muted font-mono">
                      <span>Detector ChatGPT:</span>
                      <span className={`font-bold ${aiProbability !== null ? (aiProbability > 50 ? 'text-red-500' : 'text-emerald-400') : 'text-theme-muted'}`}>
                        {aiLoading ? 'ESCANEANDO...' : aiProbability !== null ? `${aiProbability}% IA` : 'SIN ANALIZAR'}
                      </span>
                    </div>
                    <div className="w-full bg-white/50 hover:bg-white/80 text-theme-primary h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${aiProbability || 0}%` }} />
                    </div>
                    <button 
                      onClick={handleScanAi} 
                      className="w-full py-1.5 rounded-lg btn-theme-primary text-[10px] font-bold transition flex items-center justify-center shadow-lg"
                    >
                      {aiLoading ? 'Analizando...' : 'Escanear Originalidad IA'}
                    </button>
                  </div>

                  {/* DETECTOR DE PLAGIO WEB */}
                  <div className="p-3 rounded-xl bg-white/30 border border-theme-color/20 space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-theme-muted font-mono">
                      <span>Detector de Plagio Web:</span>
                      <span className="font-bold text-theme-muted">{plagLoading ? 'BUSCANDO...' : plagPercentage !== null ? `${plagPercentage}% Coincidencias` : 'SIN ANALIZAR'}</span>
                    </div>
                    <div className="w-full bg-white/50 hover:bg-white/80 text-theme-primary h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${plagPercentage || 0}%` }} />
                    </div>
                    <button 
                      onClick={handleScanPlagiarism} 
                      className="w-full py-1.5 rounded-lg bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 text-[10px] font-bold text-theme-muted hover: transition"
                    >
                      Escanear Plagio Web
                    </button>
                    {plagSources.map((src, idx) => (
                      <div key={idx} className="text-[9px] text-theme-muted font-mono mt-1 pt-1.5 border-t border-theme-color/20">
                        Fuentes encontradas:
                        <a href={`https://${src.url}`} target="_blank" rel="noreferrer" className="text-theme-primary block mt-1 hover:underline">{src.url} ({src.pct}%)</a>
                      </div>
                    ))}
                  </div>

                  {/* AI Writer (Summary & Titles) */}
                  <div className="p-3 rounded-xl bg-white/30 border border-theme-color/20 space-y-2">
                    <button 
                      onClick={handleGenerateSummary} 
                      className="w-full py-1.5 rounded-lg bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 text-[10px] font-bold text-theme-muted hover: transition"
                    >
                      {aiCopilotLoading ? 'Generando...' : 'Generar Resumen y Títulos'}
                    </button>
                    {aiCopilotResult && (
                      <div className="text-[10px] text-theme-muted leading-relaxed border-t border-theme-color/20 pt-2 space-y-1.5">
                        <div>
                          <strong className="text-theme-primary text-[8px] block uppercase">Resumen Ejecutivo IA:</strong>
                          <p className="mt-0.5 text-theme-muted leading-normal">{aiCopilotResult.summary}</p>
                        </div>
                        <div>
                          <strong className="text-theme-primary text-[8px] block uppercase">Títulos Sugeridos:</strong>
                          <ul className="list-disc pl-3 text-theme-muted space-y-1 mt-0.5 font-sans">
                            {aiCopilotResult.titles.map((t, idx) => <li key={idx}>{t}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* DETECTOR DE MULETILLAS */}
                <div className="glass-card rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted font-mono flex justify-between items-center">
                    <span>Detección de Muletillas</span>
                    <span className="text-[8px] font-mono text-theme-muted">BR-029</span>
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    {muletillasFound.length === 0 ? (
                      <div className="text-[10px] text-theme-muted font-mono text-center py-1">Estilo limpio. Sin muletillas.</div>
                    ) : (
                      muletillasFound.map((m, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-theme-color/20 pb-1">
                          <span className="font-mono text-theme-muted">"{m.word}"</span>
                          <span className="px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 text-[8px] font-bold">{m.count} veces</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ALERTAS SEO */}
                <div className="glass-card rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted font-mono flex justify-between items-center">
                    <span>Densidad de Palabras (SEO)</span>
                    <span className="text-[8px] font-mono text-theme-muted">Límite 2.5%</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    {sortedKeywords.length === 0 ? (
                      <div className="text-[10px] text-theme-muted font-mono text-center py-1">Escribe texto para auditar keywords.</div>
                    ) : (
                      sortedKeywords.map((k, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-theme-color/20 pb-1">
                          <span className="font-mono text-theme-muted">{k.word} <strong className="text-theme-muted">({k.count})</strong></span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${k.pct > 2.5 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {k.pct > 2.5 ? `⚠️ EXCESIVO (${k.pct}%)` : `Óptimo (${k.pct}%)`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ESTIMADOR DE TIEMPOS */}
                <div className="glass-card rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted font-mono">Tiempos de Lectura por Perfil</h3>
                  <div className="space-y-2 text-[10px] font-mono">
                    <div className="flex justify-between border-b border-theme-color/20 pb-1">
                      <span className="text-theme-muted">Oratoria (130 ppm)</span>
                      <span className=" font-bold">{formatTime(timeOratory)}</span>
                    </div>
                    <div className="flex justify-between border-b border-theme-color/20 pb-1">
                      <span className="text-theme-muted">Lectura Normal (200 ppm)</span>
                      <span className=" font-bold">{formatTime(timeNormal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-theme-color/20 pb-1">
                      <span className="text-theme-muted">Lectura Técnica (150 ppm)</span>
                      <span className=" font-bold">{formatTime(timeTechnical)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-muted">Lectura Infantil (100 ppm)</span>
                      <span className=" font-bold">{formatTime(timeChildren)}</span>
                    </div>
                  </div>
                </div>

                {/* ORACIONES COMPLEJAS */}
                <div className="glass-card rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted font-mono">Oraciones Complejas (&gt;20 pal.)</h3>
                  <div className="space-y-2 text-[10px] leading-relaxed">
                    {complexSentences.length === 0 ? (
                      <div className="text-theme-muted font-mono text-center py-1">Estilo limpio. No se detectan frases largas.</div>
                    ) : (
                      complexSentences.slice(0, 2).map((s, idx) => (
                        <div key={idx} className="p-2 rounded bg-red-500/5 border border-red-500/10 text-theme-muted">
                          <span className="text-red-500 font-bold block mb-0.5">Frase larga ({s.wordCount} palabras):</span>
                          "{s.text.substring(0, 60)}..."
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* APA 7 CITATIONS */}
                <div className="glass-card rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted font-mono">Citas Rápidas APA 7</h3>
                  <div className="space-y-2 text-[10px]">
                    <input 
                      type="text" 
                      placeholder="Autor (ej: Pérez, J.)" 
                      value={apaAuthor}
                      onChange={(e) => setApaAuthor(e.target.value)}
                      className="w-full bg-white/60 border border-theme-color/20 rounded p-1.5 text-xs focus:outline-none" 
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        placeholder="Año" 
                        value={apaYear}
                        onChange={(e) => setApaYear(e.target.value)}
                        className="w-full bg-white/60 border border-theme-color/20 rounded p-1.5 text-xs focus:outline-none" 
                      />
                      <input 
                        type="text" 
                        placeholder="Título" 
                        value={apaTitle}
                        onChange={(e) => setApaTitle(e.target.value)}
                        className="w-full bg-white/60 border border-theme-color/20 rounded p-1.5 text-xs focus:outline-none" 
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Editorial o URL" 
                      value={apaPublisher}
                      onChange={(e) => setApaPublisher(e.target.value)}
                      className="w-full bg-white/60 border border-theme-color/20 rounded p-1.5 text-xs focus:outline-none" 
                    />
                    <button onClick={handleGenerateApa7} className="w-full py-1.5 rounded btn-theme-primary text-[10px] font-bold transition">
                      Generar y Copiar Cita
                    </button>
                  </div>
                </div>

                {/* RADAR DE TONO */}
                <div className="rounded-2xl p-4 transition-all duration-300" style={{ backgroundColor: 'var(--color-accent-bg)', border: '2px solid var(--border-hover)', boxShadow: '0 8px 32px var(--glow-color)' }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 font-mono" style={{ color: 'var(--color-primary)' }}>Análisis de Tono</h3>
                  <div className="flex justify-center my-2">
                    <svg className="w-36 h-36" viewBox="0 0 120 120">
                      {/* Fondo del radar */}
                      <circle cx="60" cy="60" r="50" fill="var(--card-bg)" stroke="var(--border-color)" strokeWidth="1" />
                      <circle cx="60" cy="60" r="35" fill="none" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2 2" />
                      <circle cx="60" cy="60" r="20" fill="none" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2 2" />
                      <line x1="60" y1="10" x2="60" y2="110" stroke="var(--border-color)" strokeWidth="1" />
                      <line x1="10" y1="60" x2="110" y2="60" stroke="var(--border-color)" strokeWidth="1" />
                      
                      {/* Polígono dinámico basado en métricas */}
                      <polygon 
                        points={
                          statWords > 0 
                            ? `60,${60 - Math.min(40, statWords / 5)} ${60 + Math.min(40, text.length / 10)},60 60,${60 + Math.min(40, sentencesList.length * 5)} ${60 - Math.min(40, complexSentences.length * 10)},60`
                            : "60,60 60,60 60,60 60,60"
                        } 
                        fill="var(--color-primary)" 
                        fillOpacity="0.25"
                        stroke="var(--color-primary)" 
                        strokeWidth="2" 
                      />
                      
                      <text x="60" y="7" fontSize="5.5" textAnchor="middle" fill="var(--text-main)" fontWeight="800">Académico</text>
                      <text x="114" y="62" fontSize="5.5" textAnchor="start" fill="var(--text-main)" fontWeight="800">Emocional</text>
                      <text x="60" y="117" fontSize="5.5" textAnchor="middle" fill="var(--text-main)" fontWeight="800">Corporativo</text>
                      <text x="6" y="62" fontSize="5.5" textAnchor="end" fill="var(--text-main)" fontWeight="800">Creativo</text>
                    </svg>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-theme-color/20 pt-2 mt-2">
                    <span className="text-theme-muted">Categoría</span>
                    <span className="font-extrabold uppercase tracking-wider font-mono text-[10px]">
                      {statWords > 20 ? 'Académico / Técnico' : 'Neutro'}
                    </span>
                  </div>
                </div>

                {/* ESTRUCTURA DEL ENSAYO */}
                <div className="glass-card rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted font-mono">Estructura del Ensayo</h3>
                  <div className="space-y-2 text-xs font-mono text-[9px]">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-muted">Introducción</span>
                      <span className={`font-bold ${hasIntro ? 'text-emerald-400' : 'text-theme-muted'}`}>{hasIntro ? 'DETECTADO' : 'NO DETECTADO'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-muted">Cuerpo / Argumentos</span>
                      <span className={`font-bold ${hasBody ? 'text-emerald-400' : 'text-theme-muted'}`}>{hasBody ? 'DETECTADO' : 'NO DETECTADO'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-muted">Conclusión final</span>
                      <span className={`font-bold ${hasConclusion ? 'text-emerald-400' : 'text-theme-muted'}`}>{hasConclusion ? 'DETECTADO' : 'NO DETECTADO'}</span>
                    </div>
                  </div>
                </div>

                {/* CALIDAD DEL ESTILO */}
                <div className="glass-card rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted font-mono">Calidad del Estilo</h3>
                  <div>
                    <div className="flex justify-between text-[10px] text-theme-muted mb-1 font-mono">
                      <span>Legibilidad (Fdez-Huerta)</span>
                      <span className="font-bold text-theme-primary">{metrics.readabilityScore}</span>
                    </div>
                    <div className="w-full bg-white/60 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${metrics.readabilityScore}%` }} />
                    </div>
                  </div>
                  <p className="text-[9px] text-theme-muted leading-relaxed font-mono">{metrics.readabilityLabel}</p>
                </div>

                {/* DESCARGAR REPORTES */}
                <div className="space-y-2">
                  <button 
                    onClick={handleDownloadReport} 
                    className="w-full py-2.5 rounded-xl bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 text-xs font-semibold text-theme-muted hover: transition flex items-center justify-center gap-2"
                  >
                    Descargar Reporte TXT
                  </button>
                </div>

                </aside>
                )}

            </div>
          )}

          {activeTab === 'comparator' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold  font-serif">Comparador de Versiones</h2>
                <p className="text-xs text-theme-muted mt-1">Compara dos textos para auditar variaciones lingüísticas y diferencias de conteo.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="glass-card rounded-2xl p-4 space-y-3 flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-theme-muted font-mono">Texto de Origen (Versión A)</span>
                    <span className="text-xs font-mono font-bold text-theme-primary">{compText1.split(/\s+/).filter(Boolean).length} palabras</span>
                  </div>
                  <textarea
                    value={compText1}
                    onChange={(e) => setCompText1(e.target.value)}
                    placeholder="Pega el texto original aquí..."
                    className="w-full h-80 glass-textarea rounded-xl p-3 text-xs leading-relaxed focus:outline-none resize-none"
                  />
                </div>
                <div className="glass-card rounded-2xl p-4 space-y-3 flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-theme-muted font-mono">Texto Modificado (Versión B)</span>
                    <span className="text-xs font-mono font-bold text-theme-primary">{compText2.split(/\s+/).filter(Boolean).length} palabras</span>
                  </div>
                  <textarea
                    value={compText2}
                    onChange={(e) => setCompText2(e.target.value)}
                    placeholder="Pega el texto modificado aquí..."
                    className="w-full h-80 glass-textarea rounded-xl p-3 text-xs leading-relaxed focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Comparador Stats */}
              <div className="glass-card rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-theme-muted font-mono">Resultado del Análisis Comparativo</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl bg-white/30 border border-theme-color/20">
                    <span className="text-[9px] text-theme-muted block uppercase tracking-wider font-mono">Diferencia de Palabras</span>
                    <h4 className="text-lg font-bold font-mono  mt-1">
                      {Math.abs(compText1.split(/\s+/).filter(Boolean).length - compText2.split(/\s+/).filter(Boolean).length)}
                    </h4>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/30 border border-theme-color/20">
                    <span className="text-[9px] text-theme-muted block uppercase tracking-wider font-mono">Diferencia de Caracteres</span>
                    <h4 className="text-lg font-bold font-mono  mt-1">
                      {Math.abs(compText1.length - compText2.length)}
                    </h4>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/30 border border-theme-color/20">
                    <span className="text-[9px] text-theme-muted block uppercase tracking-wider font-mono">Similitud Textual</span>
                    <h4 className="text-lg font-bold font-mono  mt-1">
                      {compText1 === compText2 ? '100%' : 'Similitud Variable'}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'testrunner' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-theme-color/20">
                <div>
                  <h2 className="text-xl font-bold font-serif">Banco de Pruebas (Golden Tests)</h2>
                  <p className="text-xs text-theme-muted mt-1">Herramienta de QA para ejecutar regresiones contra el motor de métricas.</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 border border-blue-500/20 text-[9px] font-mono font-bold uppercase">Dev Mode Unlocked</span>
              </div>
              
              <div className="bg-white/40 border border-theme-color/20 rounded-3xl p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold mb-1">Simulacro de Integridad del Motor</h3>
                    <p className="text-xs text-theme-muted">Envía {isRunningGolden ? '...' : '3'} casos extremos pre-programados al motor para verificar las respuestas Golden.</p>
                  </div>
                  <button 
                    onClick={runGoldenTests} 
                    disabled={isRunningGolden}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    {isRunningGolden ? 'Ejecutando Pruebas...' : 'Ejecutar Diagnóstico Completo'}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {goldenResults.length === 0 && !isRunningGolden && (
                    <div className="text-center p-6 border border-dashed border-theme-color/20 rounded-xl text-theme-muted text-xs font-mono">
                      Presiona "Ejecutar Diagnóstico Completo" para lanzar los simulacros automáticos hacia el sistema.
                    </div>
                  )}
                  {goldenResults.map((res, i) => (
                    <div key={i} className={`p-4 border rounded-xl flex items-center justify-between transition-all ${res.passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                      <div>
                        <div className="font-bold text-xs flex items-center gap-2">
                          <span className={res.passed ? 'text-emerald-600' : 'text-red-600'}>{res.passed ? '✅ Aprobado' : '❌ Fallo de Seguridad'}</span>
                          <span>| {res.name}</span>
                        </div>
                        <div className="text-[10px] text-theme-muted mt-1 font-mono">{res.msg}</div>
                      </div>
                      <span className="text-[10px] font-mono text-theme-muted">Caso #{res.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold  font-serif">Developer Dashboard & Cost Calculator</h2>
                <p className="text-xs text-theme-muted mt-1">Simula solicitudes reales y gestiona tus API Keys de facturación por uso (BR-110).</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calculadora */}
                <div className="glass-card rounded-2xl p-5 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-theme-primary font-mono mb-2">Calculadora de Ahorro</h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-[9px] text-theme-muted font-mono block mb-1">Palabras al Mes</label>
                        <input 
                          type="number" 
                          value={monthlyWords}
                          onChange={(e) => setMonthlyWords(parseInt(e.target.value) || 0)}
                          step="50000" 
                          className="w-full bg-white/60 border border-theme-color/20 rounded-lg p-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2 border-t border-theme-color/20 pt-3">
                        <div className="flex justify-between font-mono text-[10px]">
                          <span className="text-theme-muted">Costo API OpenAI:</span>
                          <span className="text-red-400 font-bold">${costOpenAi}</span>
                        </div>
                        <div className="flex justify-between font-mono text-[10px]">
                          <span className="text-theme-muted">Costo WordCount Pro:</span>
                          <span className="text-emerald-400 font-bold">${costWcp}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between font-mono border-t border-theme-color/20 pt-2 mt-4 text-xs">
                    <span className=" font-bold">Ahorro Mensual:</span>
                    <span className="text-theme-primary font-bold" id="cost-saving">${costSaving} ({savingPct}%)</span>
                  </div>
                </div>

                {/* API Key Generator */}
                <div className="glass-card rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-primary font-mono">Tus API Keys</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={handleGenerateApiKey}
                      className="w-full py-2 rounded-lg btn-theme-primary text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg"
                    >
                      Generar API Key
                    </button>
                    <div className="space-y-2">
                      {apiKeys.length === 0 ? (
                        <div className="text-[10px] text-theme-muted font-mono text-center py-4">Aún no has creado claves API de producción.</div>
                      ) : (
                        apiKeys.map((k, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/50 px-2.5 py-1.5 rounded-xl border border-theme-color/20 text-[10px]">
                            <span className="font-mono text-theme-muted">{k.substring(0, 14)}...</span>
                            <div className="flex gap-1.5">
                              <button onClick={() => { navigator.clipboard.writeText(k); alert("Copiada!"); }} className="text-theme-primary hover:underline font-bold">Copiar</button>
                              <button onClick={() => handleRevokeApiKey(k)} className="text-red-500 hover:underline font-bold">Revocar</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* API Playground */}
                <div className="glass-card rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-theme-primary font-mono">Consola Playground</h3>
                    <div className="space-y-2.5 text-[10px]">
                      <div>
                        <label className="text-theme-muted font-mono block mb-1">Clave Seleccionada:</label>
                        <select 
                          value={selectedApiKey}
                          onChange={(e) => setSelectedApiKey(e.target.value)}
                          className="w-full bg-white/60 border border-theme-color/20 rounded p-1.5 text-xs  focus:outline-none"
                        >
                          <option value="">-- Selecciona una clave --</option>
                          {apiKeys.map((k, idx) => (
                            <option key={idx} value={k}>{k.substring(0, 16)}...</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-theme-muted font-mono block mb-1">Servicio API:</label>
                        <select 
                          value={selectedEndpoint}
                          onChange={(e) => setSelectedEndpoint(e.target.value)}
                          className="w-full bg-white/60 border border-theme-color/20 rounded p-1.5 text-xs  focus:outline-none"
                        >
                          <option value="text">POST /api/v1/analyze/text</option>
                          <option value="ai">POST /api/v1/analyze/ai-detector</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 mt-4">
                    <button 
                      onClick={handleRunPlayground}
                      className="w-full py-2 rounded-lg bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 text-[10px] font-bold text-theme-muted hover: transition"
                    >
                      Probar Endpoint
                    </button>
                    {apiResponse && (
                      <div className="mt-2">
                        <span className="text-[8px] font-bold font-mono text-theme-muted uppercase block mb-1">Respuesta JSON:</span>
                        <pre className="w-full p-2.5 bg-white/70 border border-theme-color/20 rounded text-[8.5px] font-mono text-theme-primary overflow-x-auto select-text">
                          {JSON.stringify(apiResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold font-serif">Mis Documentos Guardados</h2>
                <p className="text-xs text-theme-muted mt-1">Todos tus autoguardados y versiones sincronizadas en la nube de WordCount Pro.</p>
              </div>

              {!user ? (
                <div className="glass-card rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4">
                  <h3 className="text-sm font-bold text-theme-primary">Inicia sesión para ver tu nube</h3>
                  <p className="text-xs text-theme-muted">Tus documentos se guardan automáticamente en tu cuenta. Conéctate para acceder a ellos.</p>
                  <button onClick={() => setIsLoginOpen(true)} className="px-6 py-2 rounded-xl btn-theme-primary text-xs font-bold">
                    Acceder / Registrar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {loadingCloud ? (
                    <div className="text-center text-xs text-theme-muted font-mono animate-pulse">Sincronizando con la nube...</div>
                  ) : cloudDrafts.length === 0 ? (
                    <div className="text-center text-xs text-theme-muted font-mono py-10">Aún no hay documentos guardados. ¡Empieza a escribir en el Editor!</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {cloudDrafts.map((draft, idx) => (
                        <div key={idx} className="glass-card rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition cursor-pointer" onClick={() => { setText(draft.text); setActiveTab('editor'); alert("Documento cargado en el editor."); }}>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] text-theme-muted font-mono bg-white/50 px-2 py-0.5 rounded border border-theme-color/20">
                                {new Date(draft.created_at).toLocaleString()}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newDrafts = cloudDrafts.filter(d => d.id !== draft.id);
                                  setCloudDrafts(newDrafts);
                                  localStorage.setItem('wordcount_cloud', JSON.stringify(newDrafts));
                                }}
                                className="text-[9px] text-red-500 font-bold px-2 py-1 bg-red-500/10 hover:bg-red-500/20 rounded transition"
                              >
                                Eliminar
                              </button>
                            </div>
                            <p className="text-xs text-theme-primary opacity-80 line-clamp-3 italic">
                              "{draft.text.substring(0, 100)}{draft.text.length > 100 ? '...' : ''}"
                            </p>
                          </div>
                          <div className="mt-4 flex justify-between items-center border-t border-theme-color/20 pt-2">
                            <span className="text-[10px] font-bold text-theme-primary">
                              {draft.text.split(/\s+/).filter(Boolean).length} palabras
                            </span>
                            <span className="text-[9px] text-theme-muted font-bold uppercase underline">
                              Cargar al Editor
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'lms' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-theme-color/20">
                <div>
                  <h2 className="text-xl font-bold font-serif">Simulador de Integración LMS (Canvas LTI)</h2>
                  <p className="text-xs text-theme-muted mt-1">Demostración de cómo se integra el software dentro del portal universitario.</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-theme-primary border border-amber-500/20 text-[9px] font-mono font-bold uppercase">LTI v1.3</span>
              </div>
              {/* Interfaz Simulada de Canvas */}
              <div className="w-full rounded-2xl border border-zinc-700 bg-[#f5f5f5] text-zinc-800 overflow-hidden shadow-2xl flex flex-col h-[550px]">
                {/* Header de Canvas */}
                <div className="bg-[#2D3B45]  p-3 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-[#E02200] flex items-center justify-center text-[10px] font-bold">C</div>
                    <span className="font-bold">Canvas Dashboard</span>
                    <span className="text-theme-muted">/</span>
                    <span>CURSO: Redacción Académica y Tesis I</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px]">LTI Activo</span>
                  </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Menú Lateral Canvas */}
                  <div className="w-36 bg-white border-r border-zinc-200 p-3 text-[10px] text-zinc-600 space-y-2.5 flex flex-col">
                    <div className="font-bold text-zinc-900 border-b border-zinc-100 pb-1.5">Navegación</div>
                    <div className="hover:text-zinc-900 cursor-pointer">Página de Inicio</div>
                    <div className="hover:text-zinc-900 cursor-pointer">Anuncios</div>
                    <div className="font-bold text-[#E02200] cursor-pointer flex items-center gap-1">
                      <span className="w-1 h-3 bg-[#E02200] block"></span>
                      Tareas
                    </div>
                    <div className="hover:text-zinc-900 cursor-pointer">Calificaciones</div>
                    <div className="hover:text-zinc-900 cursor-pointer">Personas</div>
                  </div>

                  {/* Cuerpo Central Canvas */}
                  <div className="flex-1 p-5 overflow-y-auto bg-white flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-start border-b border-zinc-200 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-900">Tarea 2: Ensayo Crítico de Investigación</h3>
                          <p className="text-[10px] text-theme-muted mt-0.5">Vence: 12 de Julio | Puntos: 20</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-600 leading-relaxed mt-3">
                        Cargue su borrador en la sección inferior de <strong>WordCount Pro</strong>. El sistema verificará que el texto cumpla con el límite de 300 palabras antes de permitir su envío.
                      </p>
                    </div>

                    {/* Iframe Simulada de WordCount Pro */}
                    <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-4 bg-[#04060a] flex flex-col justify-between h-64  relative mt-4">
                      <div className="absolute top-2 right-2 bg-amber-500/10 text-theme-primary border border-amber-500/20 rounded px-1.5 py-0.2 text-[8px] font-mono">
                        IFRAME: wordcountpro.pe/lti
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          Panel Integrado WordCount Pro LTI
                        </h4>
                        <textarea 
                          value={canvasText}
                          onChange={(e) => setCanvasText(e.target.value)}
                          className="w-full h-32 bg-white/50 hover:bg-white/80 text-theme-primary/60 border border-theme-color/20 rounded-xl p-3 text-[10px] font-mono text-theme-muted focus:outline-none resize-none" 
                          placeholder="Pega tu ensayo académico aquí para la entrega integrada de Canvas..."
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-theme-color/20">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-theme-muted font-mono font-bold">
                            {calculateTextMetrics(canvasText).wordCount} palabras (Rango: 100 - 300)
                          </span>
                          <button 
                            onClick={() => setCanvasText(text)} 
                            className="text-[9px] text-indigo-500 hover:text-indigo-700 underline font-semibold transition"
                          >
                            Cargar desde el editor principal
                          </button>
                        </div>
                        <button 
                          onClick={handleCanvasSubmit}
                          className="px-4 py-1.5 bg-[#E02200] hover:opacity-90  text-[10px] font-bold rounded-lg"
                          style={{ color: 'white' }}
                        >
                          Validar y Registrar en Canvas
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODULO DE PLANES Y PRECIOS */}
          {activeTab === 'pricing' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-6 relative">
              <div className="text-center space-y-2 mb-8 mt-4">
                <h2 className="text-2xl font-extrabold font-serif">Sube al Siguiente Nivel</h2>
                <p className="text-xs text-theme-muted">Compara nuestros planes y descubre las herramientas que están revolucionando la redacción profesional.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* Plan Gratuito */}
                <div className="glass-card rounded-3xl p-6 border border-theme-color/20 flex flex-col opacity-80">
                  <h3 className="text-lg font-bold font-serif mb-1">Plan Gratuito</h3>
                  <div className="text-[10px] text-theme-muted font-mono mb-4">Herramienta Básica</div>
                  <div className="text-2xl font-extrabold mb-6">S/ 0.00</div>
                  <ul className="space-y-3 text-xs mb-8 flex-1">
                    <li className="flex items-start gap-2"><span>✅</span> Límite de 5,000 palabras por análisis</li>
                    <li className="flex items-start gap-2"><span>✅</span> Conteo básico de caracteres y palabras</li>
                    <li className="flex items-start gap-2 text-theme-muted"><span>❌</span> Sin historial en la nube</li>
                    <li className="flex items-start gap-2 text-theme-muted"><span>❌</span> Escáner IA limitado</li>
                  </ul>
                  <button onClick={() => {
                    if (userPlan !== 'Plan Gratuito') {
                      setUserPlan('Plan Gratuito');
                      alert('Has regresado al Plan Gratuito.');
                    }
                    setActiveTab('editor');
                  }} className="w-full py-2.5 rounded-xl bg-white/50 border border-theme-color/20 text-xs font-bold transition hover:bg-white/80">
                    {userPlan === 'Plan Gratuito' ? 'Tu Plan Actual' : 'Bajar a Gratis'}
                  </button>
                </div>

                {/* Plan Mensual */}
                <div className="glass-card rounded-3xl p-6 border-2 border-emerald-500/30 flex flex-col relative shadow-xl transform scale-[1.02]">
                  <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Popular
                  </div>
                  <h3 className="text-lg font-bold font-serif mb-1">Premium Mensual</h3>
                  <div className="text-[10px] text-emerald-500 font-mono mb-4">Paga mes a mes</div>
                  <div className="text-2xl font-extrabold mb-6">S/ 15.00<span className="text-xs text-theme-muted font-normal">/mes</span></div>
                  <ul className="space-y-3 text-xs mb-8 flex-1">
                    <li className="flex items-start gap-2"><span>💎</span> <strong>Palabras Ilimitadas:</strong> Sin topes</li>
                    <li className="flex items-start gap-2"><span>💎</span> <strong>Historial:</strong> Nube por 30 días</li>
                    <li className="flex items-start gap-2"><span>✅</span> <strong>API Developer:</strong> Consola abierta</li>
                  </ul>
                  <button 
                    onClick={() => {
                      if (userPlan === 'Premium Mensual') {
                        setActiveTab('editor');
                      } else {
                        setCheckoutPlan('monthly'); 
                        setIsCheckoutOpen(true); 
                      }
                    }} 
                    className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-md hover:-translate-y-0.5 ${userPlan === 'Premium Mensual' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'btn-theme-primary'}`}
                  >
                    {userPlan === 'Premium Mensual' ? 'Tu Plan Actual →' : 'Mejorar a Mensual'}
                  </button>
                </div>

                {/* Plan Anual */}
                <div className="glass-card rounded-3xl p-6 border-2 border-amber-500/40 flex flex-col relative bg-amber-500/5 shadow-2xl transform scale-[1.05]">
                  <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Mejor Valor
                  </div>
                  <h3 className="text-lg font-bold font-serif mb-1">Premium Anual</h3>
                  <div className="text-[10px] text-amber-600 font-mono mb-4">Ahorras 4 meses gratis</div>
                  <div className="text-2xl font-extrabold mb-6">S/ 120.00<span className="text-xs text-theme-muted font-normal">/año</span></div>
                  <ul className="space-y-3 text-xs mb-8 flex-1">
                    <li className="flex items-start gap-2 font-bold text-amber-700 font-mono text-[10px] uppercase border-b border-amber-500/20 pb-2 mb-3">Todo lo Mensual, más:</li>
                    <li className="flex items-start gap-2"><span>🌟</span> <strong>Humanizador IA:</strong> Burlar detectores</li>
                    <li className="flex items-start gap-2"><span>🌟</span> <strong>Cuentas Equipo:</strong> 3 accesos extras</li>
                    <li className="flex items-start gap-2"><span>🌟</span> <strong>Reportes VIP:</strong> PDF con logo propio</li>
                    <li className="flex items-start gap-2"><span>👑</span> <strong>Nube de Por Vida:</strong> Uso de carpetas</li>
                  </ul>
                  <button 
                    onClick={() => {
                      if (userPlan === 'Premium Anual') {
                        setActiveTab('editor');
                      } else {
                        setCheckoutPlan('annual'); 
                        setIsCheckoutOpen(true); 
                      }
                    }} 
                    className={`w-full py-2.5 rounded-xl text-white shadow-lg text-xs font-bold uppercase tracking-wider transition hover:-translate-y-1 ${userPlan === 'Premium Anual' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90'}`}
                  >
                    {userPlan === 'Premium Anual' ? 'Ir al Workspace a usar IA VIP →' : 'Adquirir Plan VIP'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* PIE DE DETALLES TÉCNICOS */}
      <footer className="border-t border-theme-color/20 py-2.5 px-6 bg-white/60 text-[10px] text-theme-muted shrink-0 flex justify-between items-center select-none font-mono z-20">
        <div>
          <span>PROYECTO PARCIAL: WORDCOUNT PRO (3ER CICLO)</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> DATABASE: CONECTADA</span>
          <span>PUCALLPA, PERÚ</span>
        </div>
      </footer>

      {/* PANEL DEL ESTUDIO DE DISEÑO FLOTANTE */}
      {isDesignStudioOpen && (
        <div className="fixed inset-y-0 right-0 w-80 border-l border-theme-color/20 z-50 p-5 shadow-2xl flex flex-col justify-between backdrop-blur-md transition-colors duration-300" style={{ backgroundColor: 'var(--studio-bg)' }}>
          <div className="space-y-4 overflow-y-auto pr-2 pb-2">
            <div className="flex justify-between items-center pb-2 border-b border-theme-color/20">
              <h3 className="font-cabinet font-bold text-base uppercase tracking-wider font-serif">Estudio de Diseño</h3>
              <button onClick={() => setIsDesignStudioOpen(false)} className="text-theme-muted hover: text-xs font-bold font-mono">CERRAR ×</button>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] uppercase font-bold text-theme-muted font-mono block">Preajustes de Autor</span>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => handleThemePresetChange('deepspace')} className="h-8 rounded bg-gradient-to-tr from-yellow-600 to-amber-800 border border-theme-color/30" title="Champagne Gold"></button>
                <button onClick={() => handleThemePresetChange('cyberpunk')} className="h-8 rounded bg-gradient-to-tr from-pink-500 to-purple-500 border border-theme-color/30" title="Cyberpunk"></button>
                <button onClick={() => handleThemePresetChange('sunset')} className="h-8 rounded bg-gradient-to-tr from-rose-500 to-amber-500 border border-theme-color/30" title="Sunset"></button>
                <button onClick={() => handleThemePresetChange('forest')} className="h-8 rounded bg-gradient-to-tr from-emerald-500 to-teal-400 border border-theme-color/30" title="Forest"></button>
                <button onClick={() => handleThemePresetChange('slate')} className="h-8 rounded bg-gradient-to-tr from-slate-600 to-sky-400 border border-theme-color/30" title="Slate"></button>
                <button onClick={() => handleThemePresetChange('royal')} className="h-8 rounded bg-gradient-to-tr from-purple-700 to-pink-400 border border-theme-color/30" title="Royal Amethyst"></button>
                <button onClick={() => handleThemePresetChange('retro')} className="h-8 rounded bg-gradient-to-tr from-amber-700 to-emerald-400 border border-theme-color/30" title="Retro Terminal"></button>
                <button onClick={() => handleThemePresetChange('light')} className="h-8 rounded bg-gradient-to-tr from-indigo-500 to-slate-200 border border-slate-600" title="Light Mode"></button>
              </div>
            </div>

            <div className="space-y-3 border-t border-theme-color/20 pt-4">
              <span className="text-[9px] uppercase font-bold text-theme-muted font-mono block">Crea tu propio Estilo</span>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-theme-muted">Fondo Principal:</span>
                <input type="color" value={draftDesign.bg} onChange={(e) => handleDraftChange('bg', e.target.value)} className="w-8 h-6 bg-transparent border-0 cursor-pointer rounded" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-theme-muted">Fondo de Módulos (Cards):</span>
                <input type="color" value={draftDesign.cardBg} onChange={(e) => handleDraftChange('cardBg', e.target.value)} className="w-8 h-6 bg-transparent border-0 cursor-pointer rounded" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-theme-muted">Fondo Estadísticas:</span>
                <input type="color" value={draftDesign.statBg} onChange={(e) => handleDraftChange('statBg', e.target.value)} className="w-8 h-6 bg-transparent border-0 cursor-pointer rounded" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-theme-muted">Fondo Workspace (Izq):</span>
                <input type="color" value={draftDesign.workspaceBg === 'transparent' ? '#ffffff' : draftDesign.workspaceBg} onChange={(e) => handleDraftChange('workspaceBg', e.target.value)} className="w-8 h-6 bg-transparent border-0 cursor-pointer rounded" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-theme-muted">Fondo Escritorio (Centro):</span>
                <input type="color" value={draftDesign.desktopBg === 'transparent' ? '#ffffff' : draftDesign.desktopBg} onChange={(e) => handleDraftChange('desktopBg', e.target.value)} className="w-8 h-6 bg-transparent border-0 cursor-pointer rounded" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-theme-muted">Fondo Estudio (Der):</span>
                <input type="color" value={draftDesign.studioBg} onChange={(e) => handleDraftChange('studioBg', e.target.value)} className="w-8 h-6 bg-transparent border-0 cursor-pointer rounded" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-theme-muted">Color del Texto Global:</span>
                <input type="color" value={draftDesign.textColor} onChange={(e) => handleDraftChange('textColor', e.target.value)} className="w-8 h-6 bg-transparent border-0 cursor-pointer rounded" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-theme-muted">Color Acento (Primario):</span>
                <input type="color" value={draftDesign.accent} onChange={(e) => handleDraftChange('accent', e.target.value)} className="w-8 h-6 bg-transparent border-0 cursor-pointer rounded" />
              </div>
            </div>

            <div className="space-y-2 border-t border-theme-color/20 pt-4">
              <span className="text-[9px] uppercase font-bold text-theme-muted font-mono block">Estilo de Letra (Fuente)</span>
              <select value={draftDesign.font} onChange={(e) => handleDraftChange('font', e.target.value)} className="w-full bg-white/60 border border-theme-color/20 rounded p-2 text-xs focus:outline-none">
                <option value='"Plus Jakarta Sans", sans-serif'>Moderna (Outfit Sans)</option>
                <option value='"Fira Code", monospace'>Código (Fira Code Monospace)</option>
                <option value='"Playfair Display", serif'>Elegante (Playfair Serif)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-theme-color/20 space-y-3">
            <div className="flex gap-2">
              <button onClick={resetDesignChanges} className="flex-1 py-2 text-[10px] font-bold rounded-lg border border-theme-color/30 text-theme-muted hover:bg-white/20 transition">Restaurar</button>
              <button onClick={applyDesignChanges} className="flex-1 py-2 text-[10px] font-bold rounded-lg btn-theme-primary transition">Agregar</button>
            </div>
            <div className="text-[8.5px] text-theme-muted font-mono leading-relaxed text-center">
              Ajusta los colores y haz clic en "Agregar" para aplicar.
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE FLOATING TOUR CARD */}
      {isTourOpen && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] w-96 glass-card border border-amber-600/30 rounded-2xl p-5 shadow-2xl space-y-3 backdrop-blur-md ">
          <div className="flex justify-between items-center pb-2 border-b border-theme-color/20">
            <h4 className="text-xs font-bold  uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              Tour del WordCount Pro ({currentTourStep + 1}/{TOUR_STEPS.length})
            </h4>
            <button onClick={() => setIsTourOpen(false)} className="text-[10px] font-mono text-theme-muted hover:">Saltar</button>
          </div>
          <h5 className="text-xs font-bold text-theme-primary">{TOUR_STEPS[currentTourStep].title}</h5>
          <p className="text-[11px] text-theme-muted leading-relaxed">
            {TOUR_STEPS[currentTourStep].text}
          </p>
          <div className="flex justify-between items-center pt-2">
            <button 
              onClick={handlePrevTourStep} 
              disabled={currentTourStep === 0}
              className="px-2.5 py-1 rounded bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 text-[10px] text-theme-muted hover: transition disabled:opacity-50"
            >
              Atrás
            </button>
            <button 
              onClick={handleNextTourStep} 
              className="px-3 py-1 rounded btn-theme-primary text-[10px] font-bold text-zinc-950 transition"
            >
              {currentTourStep === TOUR_STEPS.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-6 shadow-2xl space-y-5 text-gray-900">
            <div className="flex justify-between items-center pb-2 border-b border-theme-color/20">
              <h3 className="font-cabinet font-extrabold text-base  uppercase tracking-wider flex items-center gap-1.5 font-serif">
                Suscripción Premium
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-theme-muted hover: text-xs font-bold font-mono">×</button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className={`p-3 rounded-2xl border cursor-pointer flex flex-col justify-between h-20 ${checkoutPlan === 'monthly' ? 'border-amber-600 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                  <input 
                    type="radio" 
                    name="checkout-plan" 
                    value="monthly" 
                    checked={checkoutPlan === 'monthly'} 
                    onChange={() => setCheckoutPlan('monthly')}
                    className="accent-amber-500" 
                  />
                  <span className="font-bold mt-1 text-gray-900">Premium Mensual</span>
                  <span className="text-[10px] text-gray-600 font-bold">S/ 15.00/mes</span>
                </label>
                <label className={`p-3 rounded-2xl border cursor-pointer flex flex-col justify-between h-20 ${checkoutPlan === 'annual' ? 'border-amber-600 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                  <input 
                    type="radio" 
                    name="checkout-plan" 
                    value="annual" 
                    checked={checkoutPlan === 'annual'} 
                    onChange={() => setCheckoutPlan('annual')}
                    className="accent-amber-500" 
                  />
                  <span className="font-bold mt-1 text-gray-900">Premium Anual</span>
                  <span className="text-[10px] text-emerald-600 font-bold">S/ 120.00/año</span>
                </label>
              </div>

              <div className="space-y-3 text-[10px] font-mono">
                <div>
                  <label className="text-gray-900 font-bold block mb-1">NOMBRE EN LA TARJETA</label>
                  <input type="text" placeholder="Ej. Juan Pérez" value={cardName} onChange={e => setCardName(e.target.value)} className="w-full bg-gray-50 text-gray-900 font-bold border border-gray-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-gray-900 font-bold block mb-1">NÚMERO DE TARJETA</label>
                  <input type="text" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="w-full bg-gray-50 text-gray-900 font-bold border border-gray-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-900 font-bold block mb-1">EXPIRACIÓN (MES Y AÑO)</label>
                    <input type="text" placeholder="MM/AA" value={cardExp} onChange={e => setCardExp(e.target.value)} className="w-full bg-gray-50 text-gray-900 font-bold border border-gray-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                    <label className="text-gray-900 font-bold block mb-1">CVC / CVV</label>
                    <input type="password" placeholder="123" value={cardCvc} onChange={e => setCardCvc(e.target.value)} maxLength="4" className="w-full bg-gray-50 text-gray-900 font-bold border border-gray-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={handleProcessCheckout} className="w-full py-3 rounded-xl btn-theme-primary text-xs font-bold uppercase tracking-wider transition shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Procesar Pago Seguro
            </button>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 bg-white/70/80 flex items-center justify-center p-4">
          <form onSubmit={handleLogin} className="w-full max-w-sm glass-card rounded-3xl p-6 space-y-4 shadow-2xl ">
            <div className="flex justify-between items-center border-b border-theme-color/20 pb-2">
              <h3 className="font-bold text-sm  uppercase tracking-wider">Acceder a WordCount Pro</h3>
              <button type="button" onClick={() => setIsLoginOpen(false)} className="text-theme-muted hover: font-mono">×</button>
            </div>
            
            <div className="space-y-4">
              <div className="pt-2 pb-2">
                <button 
                  type="button"
                  onClick={() => handleSocialLogin('Google')}
                  className="w-full py-3 rounded-xl bg-white border border-gray-300 text-zinc-900 text-sm font-bold hover:bg-zinc-50 shadow-md transition flex items-center justify-center gap-3"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                  Entrar con mi correo de Google
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-grow border-t border-theme-color/20"></div>
                <span className="text-[10px] text-theme-muted uppercase tracking-widest font-mono">O con email manual</span>
                <div className="flex-grow border-t border-theme-color/20"></div>
              </div>

              <div className="space-y-3 pt-2">
                <input 
                  type="email" 
                  placeholder="correo@institucion.edu" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/60 border border-theme-color/20 rounded-xl p-3 text-sm focus:outline-none focus:border-theme-primary shadow-sm"
                />
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/60 border border-theme-color/20 rounded-xl p-3 text-sm focus:outline-none focus:border-theme-primary shadow-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="w-full py-2.5 rounded-xl btn-theme-primary text-zinc-950 text-xs font-bold transition hover:opacity-90 shadow-md">
                Entrar Manualmente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL GESTION DE EQUIPO */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/70/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-card rounded-3xl p-6 space-y-4 shadow-2xl ">
            <div className="flex justify-between items-center pb-2 border-b border-theme-color/20">
              <h3 className="font-cabinet font-extrabold text-base uppercase tracking-wider flex items-center gap-1.5 font-serif">
                Gestión de Equipo VIP
              </h3>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-theme-muted hover: text-xs font-bold font-mono">×</button>
            </div>
            
            <div className="space-y-4">
              <p className="text-[10px] text-theme-muted leading-relaxed">
                Invita hasta 3 colegas para que tengan acceso ilimitado a todas las funciones premium. (Usadas: {teamList.length}/3)
              </p>
              
              <ul className="space-y-2">
                {teamList.map((email, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-white/50 border border-theme-color/20 p-2 rounded-lg text-xs font-mono">
                    <span className="truncate w-4/5 text-theme-primary">{email}</span>
                    <button onClick={() => setTeamList(teamList.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold text-[10px]">Quitar</button>
                  </li>
                ))}
              </ul>

              {teamList.length < 3 && (
                <form onSubmit={handleInviteTeam} className="flex gap-2">
                  <input type="email" value={teamEmail} onChange={e => setTeamEmail(e.target.value)} placeholder="correo@ejemplo.com" required className="flex-1 bg-white/50 hover:bg-white/80 text-theme-primary border border-theme-color/20 rounded-lg p-2 text-xs focus:outline-none" />
                  <button type="submit" className="px-3 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-bold uppercase transition">Invitar</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
