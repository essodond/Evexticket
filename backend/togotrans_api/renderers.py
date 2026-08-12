from rest_framework.renderers import JSONRenderer


JS_MAX_SAFE_INTEGER = (2**53) - 1


def preserve_large_integer_ids(value):
    """Convert integers that JavaScript cannot represent exactly to strings."""
    if isinstance(value, bool):
        return value
    if isinstance(value, int) and abs(value) > JS_MAX_SAFE_INTEGER:
        return str(value)
    if isinstance(value, dict):
        return {key: preserve_large_integer_ids(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [preserve_large_integer_ids(item) for item in value]
    return value


class SafeIntegerJSONRenderer(JSONRenderer):
    """Render CockroachDB 64-bit IDs without losing precision in browsers."""

    def render(self, data, accepted_media_type=None, renderer_context=None):
        safe_data = preserve_large_integer_ids(data)
        return super().render(safe_data, accepted_media_type, renderer_context)
