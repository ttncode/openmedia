from collections.abc import Mapping

from flask import Flask, Response, jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.headers = dict(headers or {})


def error_response(status: int, code: str, message: str) -> tuple[Response, int]:
    return jsonify(error=message, code=code), status


def _api_error(error: ApiError) -> tuple[Response, int, dict[str, str]]:
    response, status = error_response(error.status, error.code, error.message)
    return response, status, error.headers


def _http_error(error: HTTPException) -> tuple[Response, int]:
    status = error.code or 500
    code = (error.name or "error").lower().replace(" ", "_")
    return error_response(status, code, error.description or error.name)


def register_error_handlers(app: Flask) -> None:
    app.register_error_handler(ApiError, _api_error)
    app.register_error_handler(HTTPException, _http_error)
