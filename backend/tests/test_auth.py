import pytest
from fastapi import HTTPException

from app.auth import (
    authenticate,
    create_access_token,
    decode_access_token,
)


def test_demo_client_authenticates():
    user = authenticate(
        "client@demo.co.za",
        "Client123!",
    )

    assert user is not None
    assert user.role == "client"


def test_wrong_password_is_rejected():
    user = authenticate(
        "client@demo.co.za",
        "wrong-password",
    )

    assert user is None


def test_signed_token_round_trip():
    user = authenticate(
        "adviser@demo.co.za",
        "Adviser123!",
    )

    assert user is not None

    token = create_access_token(
        user
    )

    decoded = decode_access_token(
        token
    )

    assert decoded.email == user.email
    assert decoded.role == "adviser"


def test_tampered_token_is_rejected():
    user = authenticate(
        "client@demo.co.za",
        "Client123!",
    )

    assert user is not None

    token = create_access_token(
        user
    )

    payload_part, signature_part = (
        token.split(".", 1)
    )

    replacement = (
        "A"
        if signature_part[0] != "A"
        else "B"
    )

    tampered = (
        f"{payload_part}."
        f"{replacement}"
        f"{signature_part[1:]}"
    )

    with pytest.raises(
        HTTPException
    ):
        decode_access_token(
            tampered
        )
