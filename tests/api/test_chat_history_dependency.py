from api.deps import get_chat_history


def test_chat_history_dependency_creates_independent_histories():
    first = next(get_chat_history())
    second = next(get_chat_history())

    first.append("question: first user, answer: first answer")

    assert first is not second
    assert second == []
