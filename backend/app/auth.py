from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from dataclasses import dataclass
from typing import Callable, Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)


Role = Literal["client", "adviser"]

TOKEN_TTL_SECONDS = 8 * 60 * 60
TOKEN_SCHEME = HTTPBearer(auto_error=False)

# Hackathon/demo users. Do not use these credentials in production.
_DEMO_USERS = {
    "client@demo.co.za": {
        "name": "Demo Client",
        "role": "client",
        "password": "Client123!",
        "salt": "royal-square-client",
    },
    "adviser@demo.co.za": {
        "name": "Demo Adviser",
        "role": "adviser",
        "password": "Adviser123!",
        "salt": "royal-square-adviser",
    },
}


@dataclass(frozen=True)
class AuthUser:
    email: str
    name: str
    role: Role


_FALLBACK_SECRET = secrets.token_bytes(32)


def _secret() -> bytes:
    value = os.getenv("APP_SECRET")

    if value:
        return value.encode("utf-8")

    # Safe demo fallback: unpredictable for each
    # backend process. Tokens therefore expire when
    # the server restarts if APP_SECRET is unset.
    return _FALLBACK_SECRET


def _password_digest(
    password: str,
    salt: str,
) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    )


_USER_RECORDS = {
    email: {
        "name": data["name"],
        "role": data["role"],
        "salt": data["salt"],
        "digest": _password_digest(
            data["password"],
            data["salt"],
        ),
    }
    for email, data in _DEMO_USERS.items()
}


def authenticate(
    email: str,
    password: str,
) -> AuthUser | None:
    normalized = email.strip().lower()
    record = _USER_RECORDS.get(normalized)

    if not record:
        # Keep timing closer to a real password check.
        _password_digest(
            password,
            "royal-square-unknown-user",
        )
        return None

    candidate = _password_digest(
        password,
        record["salt"],
    )

    if not hmac.compare_digest(
        candidate,
        record["digest"],
    ):
        return None

    return AuthUser(
        email=normalized,
        name=record["name"],
        role=record["role"],
    )


def _b64_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(
        raw
    ).decode("ascii").rstrip("=")


def _b64_decode(value: str) -> bytes:
    padding = "=" * (
        (4 - len(value) % 4) % 4
    )
    return base64.urlsafe_b64decode(
        value + padding
    )


def create_access_token(
    user: AuthUser,
) -> str:
    now = int(time.time())
    payload = {
        "sub": user.email,
        "name": user.name,
        "role": user.role,
        "iat": now,
        "exp": now + TOKEN_TTL_SECONDS,
    }

    payload_part = _b64_encode(
        json.dumps(
            payload,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    )

    signature = hmac.new(
        _secret(),
        payload_part.encode("ascii"),
        hashlib.sha256,
    ).digest()

    return (
        f"{payload_part}."
        f"{_b64_encode(signature)}"
    )


def decode_access_token(
    token: str,
) -> AuthUser:
    try:
        payload_part, signature_part = (
            token.split(".", 1)
        )

        expected_signature = hmac.new(
            _secret(),
            payload_part.encode("ascii"),
            hashlib.sha256,
        ).digest()

        supplied_signature = _b64_decode(
            signature_part
        )

        if not hmac.compare_digest(
            supplied_signature,
            expected_signature,
        ):
            raise ValueError(
                "Invalid token signature."
            )

        payload = json.loads(
            _b64_decode(
                payload_part
            ).decode("utf-8")
        )

        if int(payload["exp"]) <= int(
            time.time()
        ):
            raise ValueError(
                "Token has expired."
            )

        email = str(payload["sub"])
        record = _USER_RECORDS.get(email)

        if not record:
            raise ValueError(
                "Unknown token user."
            )

        role = str(payload["role"])
        if role not in {
            "client",
            "adviser",
        }:
            raise ValueError(
                "Invalid token role."
            )

        return AuthUser(
            email=email,
            name=str(payload["name"]),
            role=role,
        )

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        ) from error


def get_current_user(
    credentials: (
        HTTPAuthorizationCredentials | None
    ) = Depends(TOKEN_SCHEME),
) -> AuthUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    return decode_access_token(
        credentials.credentials
    )


def require_role(
    required_role: Role,
) -> Callable[..., AuthUser]:
    def dependency(
        user: AuthUser = Depends(
            get_current_user
        ),
    ) -> AuthUser:
        if user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"{required_role.title()} "
                    "access is required."
                ),
            )

        return user

    return dependency


require_client = require_role("client")
require_adviser = require_role("adviser")


def demo_accounts() -> list[dict]:
    return [
        {
            "email": email,
            "name": data["name"],
            "role": data["role"],
        }
        for email, data in _DEMO_USERS.items()
    ]
