from app.services.text_analysis.base import TextAnalyzer
from app.core.config import settings

class BasicCounter(TextAnalyzer):
    def analyze(self, text: str, normalized_text: str, words: list, sentences: list) -> dict:
        """
        Calcula las métricas de conteo básico.
        Módulo 1: Palabras, caracteres con/sin espacios, párrafos, oraciones, líneas y tiempos.
        """
        # Caracteres con espacio
        char_count = len(normalized_text)
        
        # Caracteres sin espacio
        char_count_no_spaces = sum(1 for c in normalized_text if not c.isspace())

        # Contar párrafos (bloques de texto separados por saltos de línea)
        paragraphs = [p for p in normalized_text.split("\n") if p.strip()]
        paragraph_count = len(paragraphs)

        # Contar oraciones
        sentence_count = len(sentences)

        # Contar líneas
        # Si el texto está vacío es 0, si no, contamos los saltos de línea y sumamos 1
        line_count = normalized_text.count("\n") + 1 if normalized_text else 0

        # Estimación de tiempos (en segundos)
        # Velocidad de lectura: settings.READING_WORDS_PER_MINUTE (default 200 palabras/minuto)
        # Velocidad de habla/narración promedio: 130 palabras/minuto
        total_words = len(words)
        reading_time_seconds = int((total_words / settings.READING_WORDS_PER_MINUTE) * 60)
        speaking_time_seconds = int((total_words / 130) * 60)

        return {
            "word_count": total_words,
            "char_count": char_count,
            "char_count_no_spaces": char_count_no_spaces,
            "paragraph_count": paragraph_count,
            "sentence_count": sentence_count,
            "line_count": line_count,
            "reading_time_seconds": max(1 if total_words > 0 else 0, reading_time_seconds),
            "speaking_time_seconds": max(1 if total_words > 0 else 0, speaking_time_seconds)
        }
