"""Regenerate the TypeScript API contract from the backend Pydantic models."""

import sys
from pathlib import Path

ROOT_FOLDER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_FOLDER / "backend"))

from schemas.typescript import write_typescript  # noqa: E402


def main() -> int:
    path = write_typescript()
    print(f"Wrote {path.relative_to(ROOT_FOLDER).as_posix()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
