from typing import Optional
from app.services.text_analysis.tokenizer_es import normalize_text, tokenize_words, tokenize_sentences
from app.services.text_analysis.basic_counter import BasicCounter
from app.services.text_analysis.readability_fh import ReadabilityFernandezHuerta
from app.services.text_analysis.keyword_density import KeywordDensityAnalyzer
from app.services.text_analysis.filler_words import FillerWordsDetector

class AnalysisOrchestrator:
    def __init__(self):
        self.basic_counter = BasicCounter()
        self.readability_analyzer = ReadabilityFernandezHuerta()
        self.keyword_analyzer = KeywordDensityAnalyzer()
        self.filler_detector = FillerWordsDetector()

    async def run(self, text: str, plan_type: str = "free") -> dict:
        """
        Orquesta la ejecución del pipeline de análisis sobre un texto.
        BR-025: Ejecuta los analizadores según el plan vigente del usuario.
        """
        # Normalizar texto (CRLF/LF)
        norm_text = normalize_text(text)
        
        # Tokenización
        words = tokenize_words(norm_text)
        sentences = tokenize_sentences(norm_text)

        # 1. Ejecutar análisis del Módulo 1 (Conteo básico) para TODOS los planes
        results = self.basic_counter.analyze(text, norm_text, words, sentences)

        # 2. Si el plan es premium o institucional, ejecutar Módulo 2 (Métricas avanzadas)
        is_premium = plan_type in {"premium_monthly", "premium_annual", "institutional"}
        
        if is_premium:
            # Calcular legibilidad
            readability_res = self.readability_analyzer.analyze(text, norm_text, words, sentences)
            results.update(readability_res)

            # Calcular densidad de palabras clave
            keyword_res = self.keyword_analyzer.analyze(text, norm_text, words, sentences)
            results.update(keyword_res)

            # Detectar muletillas
            filler_res = self.filler_detector.analyze(text, norm_text, words, sentences)
            results.update(filler_res)
        else:
            # Rellenar campos premium con valores nulos o vacíos para mantener consistencia en la respuesta
            results.update({
                "readability_score": None,
                "readability_category": None,
                "lexical_density": None,
                "keywords": [],
                "filler_words_count": None,
                "filler_words_pct": None,
                "filler_words_details": []
            })

        return results

analysis_orchestrator = AnalysisOrchestrator()
