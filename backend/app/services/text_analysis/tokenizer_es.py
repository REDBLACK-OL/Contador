import re

# Expresión regular para palabras en español.
# Cumple con la regla BR-022: Palabras con guion (ej. "franco-peruano") se cuentan como una sola.
# Conserva tildes, eñes y diéresis (Regla BR-020).
SPANISH_WORD_PATTERN = re.compile(r'[a-záéíóúüñ]+(?:-[a-záéíóúüñ]+)*', re.IGNORECASE)

def tokenize_spanish(text: str) -> list[str]:
    """
    Divide un texto en tokens de palabras aplicando las reglas lingüísticas del español.
    """
    if not text:
        return []
    return SPANISH_WORD_PATTERN.findall(text)
