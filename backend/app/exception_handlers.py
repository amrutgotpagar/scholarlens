"""Global exception handlers so no route ever leaks a raw stack trace to the client.

Each handler logs the full exception server-side (with request_id, via JsonFormatter's
contextvar lookup) and returns a small, stable JSON error shape to the caller.
"""

import logging

import openai
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.request_context import get_request_id

logger = logging.getLogger("app.errors")


def _error_response(status_code: int, detail: str) -> JSONResponse:
    body = {"detail": detail}
    request_id = get_request_id()
    if request_id:
        body["request_id"] = request_id
    return JSONResponse(status_code=status_code, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # Preserve intentional HTTPException(status_code, detail) calls made in routes as-is.
        return _error_response(exc.status_code, str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return _error_response(422, "Invalid request")

    @app.exception_handler(OperationalError)
    async def db_unavailable_handler(request: Request, exc: OperationalError) -> JSONResponse:
        logger.error("Database unavailable", exc_info=exc)
        return _error_response(503, "Database is temporarily unavailable. Please try again shortly.")

    @app.exception_handler(openai.APITimeoutError)
    async def llm_timeout_handler(request: Request, exc: openai.APITimeoutError) -> JSONResponse:
        logger.error("LLM request timed out", exc_info=exc)
        return _error_response(504, "The AI service timed out. Please try again.")

    @app.exception_handler(openai.APIConnectionError)
    async def llm_unreachable_handler(request: Request, exc: openai.APIConnectionError) -> JSONResponse:
        logger.error("LLM service unreachable", exc_info=exc)
        return _error_response(502, "The AI service is temporarily unreachable. Please try again shortly.")

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled exception", exc_info=exc)
        return _error_response(500, "An unexpected error occurred. Please try again.")
