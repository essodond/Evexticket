import math

from rest_framework.exceptions import ParseError
from rest_framework.parsers import JSONParser

from .renderers import JS_MAX_SAFE_INTEGER


def _find_unsafe_integer(value, path='$'):
    if isinstance(value, bool):
        return None
    if isinstance(value, int) and not isinstance(value, bool) and abs(value) > JS_MAX_SAFE_INTEGER:
        return path
    if (
        isinstance(value, float)
        and math.isfinite(value)
        and value.is_integer()
        and abs(value) > JS_MAX_SAFE_INTEGER
    ):
        return path
    if isinstance(value, dict):
        for key, item in value.items():
            unsafe_path = _find_unsafe_integer(item, f'{path}.{key}')
            if unsafe_path:
                return unsafe_path
    elif isinstance(value, (list, tuple)):
        for index, item in enumerate(value):
            unsafe_path = _find_unsafe_integer(item, f'{path}[{index}]')
            if unsafe_path:
                return unsafe_path
    return None


class SafeIntegerJSONParser(JSONParser):
    """Reject JSON integers that browsers cannot represent without rounding."""

    def parse(self, stream, media_type=None, parser_context=None):
        data = super().parse(stream, media_type=media_type, parser_context=parser_context)
        unsafe_path = _find_unsafe_integer(data)
        if unsafe_path:
            raise ParseError(
                f'Entier JSON imprécis détecté ({unsafe_path}). '
                'Les identifiants CockroachDB supérieurs à 2^53 - 1 '
                'doivent être transmis sous forme de chaînes.'
            )
        return data
