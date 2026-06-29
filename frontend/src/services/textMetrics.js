// Tokenizador en español que respeta tildes, eñes y diéresis (Regla BR-020)
// e identifica palabras compuestas con guion como una sola palabra (Regla BR-022)
export function tokenizeSpanish(text) {
  if (!text) return [];
  const matches = text.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu);
  return matches ? matches : [];
}

// Contador heurístico de sílabas en español
export function countSyllablesSpanish(word) {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (w.length <= 3) return 1;
  const vowels = w.match(/[aeiouáéíóúü]/g) || [];
  let count = vowels.length;
  const diphthongs = w.match(/[aiou][aeiou]|ui/gi) || [];
  count -= diphthongs.length;
  return Math.max(1, count);
}

export function calculateTextMetrics(text) {
  if (!text || !text.trim()) {
    return {
      wordCount: 0,
      characterCount: 0,
      characterCountNoSpaces: 0,
      paragraphCount: 0,
      sentenceCount: 0,
      linesCount: 1,
      readabilityScore: 0,
      readabilityLabel: "Escribe texto para iniciar.",
      adverbDensity: 0,
      isAdverbExcessive: false
    };
  }

  const words = tokenizeSpanish(text);
  const wordCount = words.length;
  const characterCount = text.length;
  const characterCountNoSpaces = text.replace(/\s/g, '').length;
  
  const paragraphCount = text.split('\n').filter(p => p.trim().length > 0).length;
  const sentences = text.split(/[.?!]+/).filter(s => s.trim().length > 0).length;
  const linesCount = text.split('\n').length;

  // Legibilidad Fernández-Huerta (BR-027)
  let totalSyllables = 0;
  words.forEach(w => {
    totalSyllables += countSyllablesSpanish(w);
  });
  
  const sentencesDivider = sentences || 1;
  const score = wordCount > 0 
    ? (206.84 - 60 * (totalSyllables / wordCount) - 1.02 * (wordCount / sentencesDivider))
    : 0;
  
  const readabilityScore = Math.max(0, Math.min(100, Math.round(score)));

  let readabilityLabel = "";
  if (readabilityScore > 80) readabilityLabel = "Muy fácil / Infantil";
  else if (readabilityScore > 70) readabilityLabel = "Fácil";
  else if (readabilityScore > 60) readabilityLabel = "Estándar / General";
  else if (readabilityScore > 50) readabilityLabel = "Algo difícil / Universitario";
  else if (readabilityScore > 30) readabilityLabel = "Difícil / Técnico";
  else readabilityLabel = "Muy difícil / Científico";

  // Densidad de adverbios terminados en "-mente"
  const menteWords = words.filter(w => w.toLowerCase().endsWith('mente') && w.length > 5);
  const adverbDensity = wordCount > 0 ? parseFloat(((menteWords.length / wordCount) * 100).toFixed(1)) : 0;
  const isAdverbExcessive = adverbDensity > 2.5;

  return {
    wordCount,
    characterCount,
    characterCountNoSpaces,
    paragraphCount,
    sentenceCount: sentences || 1,
    linesCount,
    readabilityScore,
    readabilityLabel,
    adverbDensity,
    isAdverbExcessive
  };
}
