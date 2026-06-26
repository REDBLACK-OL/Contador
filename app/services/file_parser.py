import io
import docx
import pdfplumber
from app.core.exceptions import InvalidFileFormatError

def parse_file(file_content: bytes, filename: str, content_type: str) -> str:
    """
    Parsea archivos .txt, .docx y .pdf y devuelve el texto plano extraído.
    BR-051: Valida el formato del archivo inspeccionando los magic bytes del contenido.
    """
    # 1. Validar magic bytes (inspeccionar cabecera binaria)
    header = file_content[:4]

    # Verificar PDF (Magic Bytes: %PDF)
    if header == b"%PDF":
        return _parse_pdf(file_content)

    # Verificar DOCX (DOCX es un archivo zip, Magic Bytes: PK\x03\x04)
    elif header == b"PK\x03\x04" and filename.endswith(".docx"):
        return _parse_docx(file_content)

    # Si es TXT
    elif filename.endswith(".txt") or content_type == "text/plain":
        return _parse_txt(file_content)

    else:
        raise InvalidFileFormatError(
            "El formato del archivo no está soportado. Sube un archivo .txt, .docx o .pdf válido."
        )

def _parse_txt(content: bytes) -> str:
    try:
        # Intentar decodificar en UTF-8 o fallback a latin-1
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return content.decode("latin-1")
    except Exception:
        raise InvalidFileFormatError("No se pudo decodificar el archivo de texto plano (.txt).")

def _parse_docx(content: bytes) -> str:
    try:
        file_stream = io.BytesIO(content)
        doc = docx.Document(file_stream)
        paragraphs = [p.text for p in doc.paragraphs]
        return "\n".join(paragraphs)
    except Exception:
        raise InvalidFileFormatError("Error al procesar el archivo .docx. Asegúrate de que no esté corrupto.")

def _parse_pdf(content: bytes) -> str:
    try:
        file_stream = io.BytesIO(content)
        text_pages = []
        with pdfplumber.open(file_stream) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_pages.append(page_text)
        return "\n".join(text_pages)
    except Exception:
        raise InvalidFileFormatError("Error al procesar el archivo .pdf. Asegúrate de que no esté protegido por contraseña.")
