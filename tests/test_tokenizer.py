import pytest
from app.services.text_analysis.tokenizer_es import (
    normalize_text,
    tokenize_words,
    tokenize_sentences,
    count_lines
)

def test_normalize_text_crlf():
    # BR-024: Debe normalizar saltos de línea Windows (CRLF) a Linux (LF)
    raw = "Línea 1\r\nLínea 2\rLínea 3\nLínea 4"
    normalized = normalize_text(raw)
    assert "\r" not in normalized
    assert normalized == "Línea 1\nLínea 2\nLínea 3\nLínea 4"

def test_tokenize_words_spanish_chars():
    # BR-020: Tildes, eñes y diéresis son caracteres válidos
    text = "El pingüino de cigüeña mañana cantará una canción en español"
    words = tokenize_words(text)
    assert "pingüino" in words
    assert "cigüeña" in words
    assert "mañana" in words
    assert "cantará" in words
    assert "canción" in words
    assert "español" in words
    assert len(words) == 10

def test_tokenize_words_compound_hyphen():
    # BR-022: Palabra compuesta con guion cuenta como UNA sola palabra
    text = "El tratado franco-peruano trajo bienestar."
    words = tokenize_words(text)
    assert "franco-peruano" in words
    assert len(words) == 5

def test_tokenize_sentences_abbreviations():
    # BR-023: Evita dividir oraciones por abreviaturas comunes (Dr., Sr., etc.)
    text = "El Dr. Saboya vive en Pucallpa. Ayer conversé con la Sra. María. ¡Qué gran día!"
    sentences = tokenize_sentences(text)
    assert len(sentences) == 3
    assert sentences[0] == "El Dr. Saboya vive en Pucallpa."
    assert sentences[1] == "Ayer conversé con la Sra. María."
    assert sentences[2] == "¡Qué gran día!"

def test_count_lines():
    text = "Uno\r\nDos\nTres"
    assert count_lines(text) == 3
    assert count_lines("") == 0
