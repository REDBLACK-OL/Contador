from collections import Counter
from app.services.text_analysis.base import TextAnalyzer
from app.services.text_analysis.stopwords_es import SPANISH_STOPWORDS

class KeywordDensityAnalyzer(TextAnalyzer):
    def analyze(self, text: str, normalized_text: str, words: list, sentences: list) -> dict:
        """
        Calcula la frecuencia y densidad porcentual de palabras clave.
        BR-028: Excluye stopwords en español.
        """
        total_words = len(words)
        if total_words == 0:
            return {
                "keywords": [],
                "lexical_density": 0.0
            }

        # Convertir todas a minúsculas para unificación
        lowercased_words = [w.lower() for w in words]
        
        # Filtrar stopwords
        filtered_words = [w for w in lowercased_words if w not in SPANISH_STOPWORDS]

        # Calcular densidad léxica (porcentaje de palabras con contenido / total palabras)
        # Esto indica qué tan rico en vocabulario es el texto.
        lexical_density = round((len(filtered_words) / total_words) * 100, 2)

        # Contar frecuencias de palabras filtradas
        counter = Counter(filtered_words)
        
        # Obtener las 20 palabras más comunes
        most_common = counter.most_common(20)

        keywords = []
        for word, count in most_common:
            density_pct = round((count / total_words) * 100, 2)
            keywords.append({
                "keyword": word,
                "frequency": count,
                "density_pct": density_pct
            })

        return {
            "keywords": keywords,
            "lexical_density": lexical_density
        }
