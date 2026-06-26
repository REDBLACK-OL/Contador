import pytest
from app.services.text_analysis.readability_fh import ReadabilityFernandezHuerta

def test_count_syllables_word():
    analyzer = ReadabilityFernandezHuerta()
    assert analyzer.count_syllables_word("gato") == 2
    assert analyzer.count_syllables_word("inteligente") == 5
    assert analyzer.count_syllables_word("sol") == 1
    assert analyzer.count_syllables_word("") == 0

def test_get_readability_category():
    analyzer = ReadabilityFernandezHuerta()
    assert analyzer.get_readability_category(95.0) == "Muy fácil"
    assert analyzer.get_readability_category(85.0) == "Fácil"
    assert analyzer.get_readability_category(75.0) == "Bastante fácil"
    assert analyzer.get_readability_category(65.0) == "Normal"
    assert analyzer.get_readability_category(55.0) == "Bastante difícil"
    assert analyzer.get_readability_category(40.0) == "Difícil"
    assert analyzer.get_readability_category(15.0) == "Muy difícil"

def test_analyze_readability_index():
    analyzer = ReadabilityFernandezHuerta()
    # Texto de prueba estructurado
    # 2 oraciones, 10 palabras en total
    words = ["este", "es", "un", "texto", "muy", "simple", "para", "evaluar", "la", "lectura"]
    sentences = ["este es un texto muy simple.", "para evaluar la lectura."]
    
    result = analyzer.analyze("", "", words, sentences)
    assert "readability_score" in result
    assert "readability_category" in result
    assert isinstance(result["readability_score"], float)
    assert result["readability_score"] > 0
