import regex

# Patrón para palabras en español (letras incluyendo acentos, eñe, diéresis y compuestos por guion)
# BR-020: Letras con acento (áéíóú), eñe (ñ) y diéresis (ü) son válidas.
# BR-022: Palabras compuestas por guion como "franco-peruano" o "bien-estar" cuentan como una sola.
WORD_PATTERN = regex.compile(r'\p{L}+(?:-\p{L}+)*')

# Lista de abreviaturas comunes en español para evitar dividir oraciones incorrectamente
SPANISH_ABBREVIATIONS = {
    "sr", "sra", "dr", "dra", "lic", "prof", "ing", "da", "dª", "dº", "etc", 
    "p.ej", "pej", "adm", "gral", "sgto", "tte", "av", "nro", "cía", "cia",
    "ee.uu", "art", "vol", "pag", "pág"
}

def normalize_text(text: str) -> str:
    """
    Normaliza saltos de línea y espacios en blanco.
    BR-024: Normaliza saltos de línea Windows (CRLF) y Linux (LF).
    """
    if not text:
        return ""
    # Reemplazar CRLF y CR por LF
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    return normalized

def tokenize_words(text: str) -> list[str]:
    """
    Divide el texto en palabras según las reglas del idioma español.
    """
    if not text:
        return []
    # Convertir a minúsculas y extraer tokens de palabra que coincidan con el patrón
    words = WORD_PATTERN.findall(text)
    return words

def tokenize_sentences(text: str) -> list[str]:
    """
    Divide el texto en oraciones reconociendo abreviaturas en español.
    BR-023: Evita cortar oraciones por un punto que es parte de una abreviatura.
    """
    if not text:
        return []

    # Normalizar saltos de línea primero
    normalized = normalize_text(text)
    
    # Patrón para separar oraciones: busca signos de puntuación final (. ? !) seguidos por espacios o salto de línea
    # y letra mayúscula o principio de otra oración.
    # Usaremos una división inteligente basada en un bucle para manejar abreviaturas.
    
    # Primero buscamos posibles puntos finales utilizando regex
    # Encontramos todas las ocurrencias de caracteres que podrían finalizar una oración.
    sentence_delimiters = regex.compile(r'([.!?])\s+')
    
    parts = sentence_delimiters.split(normalized)
    
    sentences = []
    current_sentence = ""
    
    # La lista parts tendrá el formato: [texto_antes, delimitador, texto_antes, delimitador, ...]
    # Si no se encuentra delimitador, parts tendrá un único elemento.
    
    i = 0
    while i < len(parts):
        chunk = parts[i]
        if not chunk:
            i += 1
            continue
            
        if chunk in {".", "!", "?"}:
            # Es un delimitador. Debemos verificar si el texto anterior termina en una abreviatura
            delimiter = chunk
            # Limpiar el texto anterior acumulado para inspeccionar su última palabra
            if current_sentence:
                last_word_match = regex.search(r'(\p{L}+)\s*$', current_sentence)
                if last_word_match:
                    last_word = last_word_match.group(1).lower()
                    # Si la última palabra es una abreviatura común, no terminamos la oración
                    if last_word in SPANISH_ABBREVIATIONS and delimiter == ".":
                        current_sentence += delimiter
                        i += 1
                        continue
            
            # Si no es abreviatura, cerramos la oración actual con su delimitador
            current_sentence += delimiter
            sentences.append(current_sentence.strip())
            current_sentence = ""
        else:
            # Es texto regular. Lo acumulamos.
            current_sentence += chunk
            
        i += 1
        
    if current_sentence.strip():
        sentences.append(current_sentence.strip())
        
    return [s for s in sentences if s]

def count_lines(text: str) -> int:
    """
    Cuenta el número de líneas basándose en saltos de línea normalizados.
    """
    if not text:
        return 0
    normalized = normalize_text(text)
    # Si el texto es no vacío y no tiene saltos, es al menos 1 línea
    return normalized.count("\n") + 1
