import re
from app.services.text_analysis.tokenizer_es import tokenize_spanish

def count_syllables_spanish(word: str) -> int:
    """
    Cuenta de forma heurística el número de sílabas en una palabra en español.
    """
    w = word.lower()
    # Eliminar caracteres no alfabéticos
    w = re.sub(r'[^a-záéíóúüñ]', '', w)
    if len(w) <= 3:
        return 1
        
    vowels = re.findall(r'[aeiouáéíóúü]', w)
    count = len(vowels)
    if count <= 1:
        return 1
        
    # Descontar diptongos e hiatos básicos
    diphthongs = re.findall(r'[aiou][aeiou]|ui', w)
    count -= len(diphthongs)
    return max(1, count)

def calculate_text_metrics(text: str) -> dict:
    """
    Calcula los contadores del Módulo 1 y la legibilidad de Fernández-Huerta (Módulo 2).
    """
    if not text or not text.strip():
        return {
            "word_count": 0,
            "character_count": 0,
            "character_count_no_spaces": 0,
            "paragraph_count": 0,
            "sentence_count": 0,
            "readability_score": 0.0,
            "readability_label": "Texto vacío"
        }

    words = tokenize_spanish(text)
    word_count = len(words)
    character_count = len(text)
    character_count_no_spaces = len(text.replace(" ", "").replace("\n", "").replace("\r", ""))
    
    paragraphs = [p for p in text.split("\n") if p.strip()]
    paragraph_count = len(paragraphs)
    
    # Segmentación por signos de puntuación de oraciones (¿? ¡! .)
    sentences = [s for s in re.split(r'[.!?¿¡]+', text) if s.strip()]
    sentence_count = len(sentences) if len(sentences) > 0 else 1

    # Calcular sílabas para Fernández-Huerta (BR-027)
    total_syllables = sum(count_syllables_spanish(w) for w in words)
    
    if word_count > 0:
        # Fórmula Fernández-Huerta: 206.84 - 60*(sílabas/palabras) - 1.02*(palabras/oraciones)
        score = 206.84 - 60 * (total_syllables / word_count) - 1.02 * (word_count / sentence_count)
        readability_score = max(0.0, min(100.0, round(score, 2)))
    else:
        readability_score = 0.0

    # Clasificar legibilidad
    if readability_score > 80:
        label = "Muy fácil"
    elif readability_score > 70:
        label = "Fácil"
    elif readability_score > 60:
        label = "Estándar / General"
    elif readability_score > 50:
        label = "Algo difícil"
    elif readability_score > 30:
        label = "Difícil"
    else:
        label = "Muy difícil / Técnico"

    return {
        "word_count": word_count,
        "character_count": character_count,
        "character_count_no_spaces": character_count_no_spaces,
        "paragraph_count": paragraph_count,
        "sentence_count": sentence_count,
        "readability_score": readability_score,
        "readability_label": label
    }
