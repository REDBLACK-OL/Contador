import { useState, useEffect } from 'react'

const SPANISH_ABBREVIATIONS = new Set([
  "sr", "sra", "dr", "dra", "lic", "prof", "ing", "da", "dª", "dº", "etc", 
  "p.ej", "pej", "adm", "gral", "sgto", "tte", "av", "nro", "cía", "cia",
  "ee.uu", "art", "vol", "pag", "pág"
])

export interface BasicMetrics {
  word_count: number
  char_count: number
  char_count_no_spaces: number
  paragraph_count: number
  sentence_count: number
  line_count: number
  reading_time_seconds: number
  speaking_time_seconds: number
}

const DEFAULT_METRICS: BasicMetrics = {
  word_count: 0,
  char_count: 0,
  char_count_no_spaces: 0,
  paragraph_count: 0,
  sentence_count: 0,
  line_count: 0,
  reading_time_seconds: 0,
  speaking_time_seconds: 0
}

export function useRealtimeCount(text: string): BasicMetrics {
  const [metrics, setMetrics] = useState<BasicMetrics>(DEFAULT_METRICS)

  useEffect(() => {
    if (!text) {
      setMetrics(DEFAULT_METRICS)
      return
    }

    // Normalizar saltos de línea (BR-024)
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

    // Conteo de caracteres con espacios
    const char_count = normalized.length

    // Conteo de caracteres sin espacios
    let char_count_no_spaces = 0
    for (let i = 0; i < normalized.length; i++) {
      if (!/\s/.test(normalized[i])) {
        char_count_no_spaces++
      }
    }

    // Conteo de palabras (BR-020: acentos/eñes, BR-022: guiones)
    // El flag 'u' habilita categorías unicode como \p{L}
    const wordRegex = /[\p{L}]+(?:-[\p{L}]+)*/gu
    const words = normalized.match(wordRegex) || []
    const word_count = words.length

    // Conteo de párrafos (líneas no vacías)
    const paragraphs = normalized.split("\n").filter(p => p.trim().length > 0)
    const paragraph_count = paragraphs.length

    // Conteo de líneas
    const line_count = normalized.split("\n").length

    // Segmentación de oraciones (BR-023: respetando abreviaturas)
    const rawSentences = normalized.split(/([.!?])(?:\s+|$)/)
    const sentences: string[] = []
    let currentSentence = ""

    for (let i = 0; i < rawSentences.length; i++) {
      const chunk = rawSentences[i]
      if (!chunk) continue

      if (chunk === "." || chunk === "?" || chunk === "!") {
        // Es un delimitador, verifiquemos si la oración termina en abreviatura
        if (currentSentence && chunk === ".") {
          const lastWordMatch = currentSentence.match(/([\p{L}]+)\s*$/u)
          if (lastWordMatch) {
            const lastWord = lastWordMatch[1].toLowerCase()
            if (SPANISH_ABBREVIATIONS.has(lastWord)) {
              currentSentence += chunk
              continue
            }
          }
        }
        
        currentSentence += chunk
        sentences.push(currentSentence.trim())
        currentSentence = ""
      } else {
        currentSentence += chunk
      }
    }

    if (currentSentence.trim()) {
      sentences.push(currentSentence.trim())
    }
    
    const sentence_count = sentences.length

    // Estimación de tiempos en segundos
    const reading_time_seconds = Math.round((word_count / 200) * 60)
    const speaking_time_seconds = Math.round((word_count / 130) * 60)

    setMetrics({
      word_count,
      char_count,
      char_count_no_spaces,
      paragraph_count,
      sentence_count,
      line_count,
      reading_time_seconds: word_count > 0 ? Math.max(1, reading_time_seconds) : 0,
      speaking_time_seconds: word_count > 0 ? Math.max(1, speaking_time_seconds) : 0
    })

  }, [text])

  return metrics
}
