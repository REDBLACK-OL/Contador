import regex
from app.services.text_analysis.base import TextAnalyzer

# Lista de muletillas por defecto si no se cargan de la base de datos
DEFAULT_FILLER_WORDS = [
    "o sea", "bueno", "entonces", "pues", "a ver", "digo", "en plan", 
    "así que", "nada", "este", "tipo", "verdad", "eh", "sabes"
]

class FillerWordsDetector(TextAnalyzer):
    def __init__(self, custom_fillers: list = None):
        self.fillers = custom_fillers if custom_fillers is not None else DEFAULT_FILLER_WORDS

    def analyze(self, text: str, normalized_text: str, words: list, sentences: list) -> dict:
        """
        Detecta y cuenta la frecuencia de palabras de relleno/muletillas en español.
        BR-029: La lista de muletillas es configurable.
        """
        if not words:
            return {
                "filler_words_count": 0,
                "filler_words_pct": 0.0,
                "filler_words_details": []
            }

        text_lower = normalized_text.lower()
        total_words = len(words)
        found_fillers = {}
        total_fillers_count = 0

        # Para cada muletilla, buscamos coincidencias exactas usando expresiones regulares con límites de palabra
        # Esto nos permite buscar tanto palabras sueltas como frases ("o sea", "en plan")
        for filler in self.fillers:
            # Reemplazar espacios en la muletilla por patrones flexibles de espacios en blanco
            filler_pattern = r'\b' + regex.escape(filler).replace(r'\ ', r'\s+') + r'\b'
            pattern = regex.compile(filler_pattern)
            
            matches = pattern.findall(text_lower)
            if matches:
                count = len(matches)
                found_fillers[filler] = count
                # Si la muletilla es una frase de más de una palabra, multiplicamos su conteo por el número de palabras
                # para el porcentaje total, pero usualmente contamos incidencias.
                total_fillers_count += count

        # Calcular el porcentaje de incidencias de muletillas frente al total de palabras
        filler_words_pct = round((total_fillers_count / total_words) * 100, 2)

        # Ordenar los detalles de mayor a menor frecuencia
        details = [
            {"filler_word": k, "frequency": v}
            for k, v in sorted(found_fillers.items(), key=lambda item: item[1], reverse=True)
        ]

        return {
            "filler_words_count": total_fillers_count,
            "filler_words_pct": filler_words_pct,
            "filler_words_details": details
        }
