import pyphen
from app.services.text_analysis.base import TextAnalyzer

class ReadabilityFernandezHuerta(TextAnalyzer):
    def __init__(self):
        # Inicializar el silabeador para el idioma español
        try:
            self.dic = pyphen.Pyphen(lang='es')
        except Exception:
            # Fallback en caso de que no cargue el diccionario de idioma
            self.dic = None

    def count_syllables_word(self, word: str) -> int:
        """
        Cuenta las sílabas de una palabra individual usando pyphen.
        """
        if not word:
            return 0
        if not self.dic:
            # Estimación burda si el silabeador fallara (promedio vocalico)
            vowels = "aeiouáéíóúü"
            count = 0
            prev_is_vowel = False
            for char in word.lower():
                is_vowel = char in vowels
                if is_vowel and not prev_is_vowel:
                    count += 1
                prev_is_vowel = is_vowel
            return max(1, count)

        # Usar pyphen
        hyphenated = self.dic.inserted(word)
        if not hyphenated:
            return 1
        return len(hyphenated.split('-'))

    def get_readability_category(self, score: float) -> str:
        """
        Devuelve la categoría de dificultad basada en el puntaje.
        """
        if score >= 90:
            return "Muy fácil"
        elif score >= 80:
            return "Fácil"
        elif score >= 70:
            return "Bastante fácil"
        elif score >= 60:
            return "Normal"
        elif score >= 50:
            return "Bastante difícil"
        elif score >= 30:
            return "Difícil"
        else:
            return "Muy difícil"

    def analyze(self, text: str, normalized_text: str, words: list, sentences: list) -> dict:
        """
        Calcula el índice de legibilidad de Fernández-Huerta.
        Fórmula: I = 206.84 - 0.60 * P - 1.02 * O
        P = Cantidad de sílabas por cada 100 palabras (100 * total_silabas / total_palabras)
        O = Longitud media de las oraciones en palabras (total_palabras / total_oraciones)
        """
        total_words = len(words)
        total_sentences = len(sentences)

        if total_words == 0 or total_sentences == 0:
            return {
                "readability_score": 0.0,
                "readability_category": "N/A"
            }

        # Contar total de sílabas
        total_syllables = sum(self.count_syllables_word(word) for word in words)

        # Calcular P y O
        P = 100.0 * total_syllables / total_words
        O = float(total_words) / total_sentences

        # Calcular índice
        score = 206.84 - (0.60 * P) - (1.02 * O)
        
        # El score usualmente va de 0 a 100, pero teóricamente puede salirse de este rango. Acotamos.
        score = round(max(0.0, min(100.0, score)), 2)

        return {
            "readability_score": score,
            "readability_category": self.get_readability_category(score)
        }
