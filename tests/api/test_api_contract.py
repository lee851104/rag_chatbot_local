import pytest
from schemas.chat import ChatRequest
from schemas.typescript import (
    EXPORTED_MODELS,
    MODEL_NOTES,
    TYPESCRIPT_PATH,
    UnsupportedAnnotation,
    _render_annotation,
    render_typescript,
)


def test_typescript_contract_is_up_to_date():
    """
    The generated frontend types must match the Pydantic models exactly.

    A failure here means a schema under `backend/schemas/` changed without the
    contract being regenerated. This is the only thing stopping the two sides
    from drifting apart, so it must stay a hard failure rather than a warning.
    """
    assert TYPESCRIPT_PATH.exists(), f"{TYPESCRIPT_PATH} is missing. Run `make generate_api_types`."

    assert TYPESCRIPT_PATH.read_text(encoding="utf-8") == render_typescript(), (
        "frontend/src/types/api.ts is out of date with backend/schemas/. "
        "Run `make generate_api_types` and commit the result."
    )


def test_every_exported_model_is_documented():
    """Each exported model needs a note, because it becomes the TSDoc comment."""
    undocumented = [model.__name__ for model in EXPORTED_MODELS if model not in MODEL_NOTES]
    assert not undocumented, f"Add a MODEL_NOTES entry for: {', '.join(undocumented)}"


def test_unsupported_annotation_fails_loudly():
    """
    An unmodelled type must raise instead of degrading to `any`.

    Silently emitting `any` would let the frontend keep compiling against a
    payload shape that no longer exists, which is the exact failure this
    contract is meant to prevent.
    """
    with pytest.raises(UnsupportedAnnotation):
        _render_annotation(dict[str, int], model=ChatRequest, field="text")


@pytest.mark.parametrize(
    ("annotation", "expected"),
    [
        (str, "string"),
        (int, "number"),
        (float, "number"),
        (bool, "boolean"),
        (list[str], "string[]"),
        (str | None, "string | null"),
        (list[str] | None, "string[] | null"),
    ],
)
def test_annotation_rendering(annotation, expected):
    assert _render_annotation(annotation, model=ChatRequest, field="text") == expected
