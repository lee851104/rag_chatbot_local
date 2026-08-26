from chat_history import init_chat_history


def test_zero_length_history_does_not_raise_when_a_response_completes():
    history = init_chat_history(total_length=0)

    history.append("question: hello, answer: hi")

    assert history == []


def test_history_keeps_only_the_configured_number_of_exchanges():
    history = init_chat_history(total_length=2)

    history.append("first")
    history.append("second")
    history.append("third")

    assert history == ["second", "third"]
