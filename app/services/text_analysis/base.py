from abc import ABC, abstractmethod

class TextAnalyzer(ABC):
    @abstractmethod
    def analyze(self, text: str, normalized_text: str, words: list, sentences: list) -> dict:
        """
        Realiza el análisis y devuelve un diccionario de métricas.
        - text: Texto crudo original recibido.
        - normalized_text: Texto normalizado (saltos de línea unificados, etc.).
        - words: Lista de palabras tokenizadas.
        - sentences: Lista de oraciones segmentadas.
        """
        pass
