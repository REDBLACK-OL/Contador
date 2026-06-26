from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class DomainError(Exception):
    """Clase base para todos los errores de dominio de WordCount Pro."""
    def __init__(self, message: str, code: str):
        self.message = message
        self.code = code
        super().__init__(message)

class PlanLimitExceededError(DomainError):
    def __init__(self, message: str = "Límite del plan excedido"):
        super().__init__(message, "PLAN_LIMIT_EXCEEDED")

class InvalidFileFormatError(DomainError):
    def __init__(self, message: str = "Formato de archivo inválido o corrupto"):
        super().__init__(message, "INVALID_FILE_FORMAT")

class InsufficientPermissionsError(DomainError):
    def __init__(self, message: str = "Permisos insuficientes para realizar esta operación"):
        super().__init__(message, "INSUFFICIENT_PERMISSIONS")

class DuplicatePaymentEventError(DomainError):
    def __init__(self, message: str = "Evento de pago duplicado"):
        super().__init__(message, "DUPLICATE_PAYMENT_EVENT")

class ProfileNotFoundOrInactive(DomainError):
    def __init__(self, message: str = "El perfil docente no existe o se encuentra inactivo"):
        super().__init__(message, "PROFILE_NOT_FOUND_OR_INACTIVE")

class InstitutionMemberLimitError(DomainError):
    def __init__(self, message: str = "Se ha alcanzado el límite de miembros en la institución"):
        super().__init__(message, "INSTITUTION_MEMBER_LIMIT_ERROR")

class AlreadyReferredError(DomainError):
    def __init__(self, message: str = "El usuario ya ha sido referido anteriormente"):
        super().__init__(message, "ALREADY_REFERRED")

class SelfReferralError(DomainError):
    def __init__(self, message: str = "Un usuario no puede referirse a sí mismo"):
        super().__init__(message, "SELF_REFERRAL")

class TokenReuseDetectedError(DomainError):
    def __init__(self, message: str = "Reutilización de token de sesión detectada"):
        super().__init__(message, "TOKEN_REUSE_DETECTED")

class InvalidCredentialsFormatError(DomainError):
    def __init__(self, message: str = "Formato de credenciales inválido"):
        super().__init__(message, "INVALID_CREDENTIALS_FORMAT")

class EmptyOrInvalidTextError(DomainError):
    def __init__(self, message: str = "El texto enviado se encuentra vacío o no contiene caracteres válidos"):
        super().__init__(message, "EMPTY_OR_INVALID_TEXT")


# Manejador global de excepciones de dominio para registrar en FastAPI
def register_exception_handlers(app: FastAPI):
    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError):
        # Determinar el código HTTP correspondiente según el tipo de excepción de dominio
        status_code = 400
        if isinstance(exc, PlanLimitExceededError):
            status_code = 402  # HTTP 402 Payment Required (Límite excedido)
        elif isinstance(exc, InsufficientPermissionsError):
            status_code = 403  # HTTP 403 Forbidden
        elif isinstance(exc, ProfileNotFoundOrInactive):
            status_code = 404  # HTTP 404 Not Found
        elif isinstance(exc, InvalidFileFormatError):
            status_code = 415  # HTTP 415 Unsupported Media Type
        elif isinstance(exc, (DuplicatePaymentEventError, AlreadyReferredError, SelfReferralError, InstitutionMemberLimitError)):
            status_code = 409  # HTTP 409 Conflict
        elif isinstance(exc, TokenReuseDetectedError):
            status_code = 401  # HTTP 401 Unauthorized
        elif isinstance(exc, (InvalidCredentialsFormatError, EmptyOrInvalidTextError)):
            status_code = 422  # HTTP 422 Unprocessable Entity
            
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "error": {
                    "code": exc.code,
                    "message": exc.message
                }
            }
        )
