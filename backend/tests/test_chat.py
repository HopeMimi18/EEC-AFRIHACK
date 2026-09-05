from fastapi.testclient import TestClient

from app.auth import (
    authenticate,
    create_access_token,
)
from app.main import (
    CASES,
    app,
)


client = TestClient(app)


def auth_header(
    email: str,
    password: str,
) -> dict[str, str]:
    user = authenticate(
        email,
        password,
    )
    assert user is not None

    token = create_access_token(
        user
    )

    return {
        "Authorization":
            f"Bearer {token}"
    }


def seed_case(
    case_id: str,
    owner_email: str,
) -> None:
    CASES[case_id] = {
        "case_id": case_id,
        "owner_email": owner_email,
        "updated_at": (
            "2026-09-06T12:00:00+00:00"
        ),
        "messages": [],
        "audit_trail": [],
    }


def setup_function():
    CASES.clear()


def teardown_function():
    CASES.clear()


def test_client_can_send_and_read_own_case_messages():
    case_id = "RS-CHAT0001"
    seed_case(
        case_id,
        "client@demo.co.za",
    )

    headers = auth_header(
        "client@demo.co.za",
        "Client123!",
    )

    send_response = client.post(
        f"/api/v1/cases/{case_id}/messages",
        headers=headers,
        json={
            "body":
                "Hi, is anything still outstanding?"
        },
    )

    assert send_response.status_code == 200
    message = send_response.json()

    assert message["sender_role"] == "client"
    assert message["body"] == (
        "Hi, is anything still outstanding?"
    )

    read_response = client.get(
        f"/api/v1/cases/{case_id}/messages",
        headers=headers,
    )

    assert read_response.status_code == 200
    assert len(
        read_response.json()["messages"]
    ) == 1


def test_adviser_can_reply_to_client_case():
    case_id = "RS-CHAT0002"
    seed_case(
        case_id,
        "client@demo.co.za",
    )

    headers = auth_header(
        "adviser@demo.co.za",
        "Adviser123!",
    )

    response = client.post(
        f"/api/v1/cases/{case_id}/messages",
        headers=headers,
        json={
            "body":
                "We still need your latest bank statement."
        },
    )

    assert response.status_code == 200
    assert response.json()["sender_role"] == (
        "adviser"
    )


def test_client_cannot_access_someone_elses_case_messages():
    case_id = "RS-CHAT0003"
    seed_case(
        case_id,
        "someone-else@example.com",
    )

    headers = auth_header(
        "client@demo.co.za",
        "Client123!",
    )

    response = client.get(
        f"/api/v1/cases/{case_id}/messages",
        headers=headers,
    )

    assert response.status_code == 403


def test_empty_message_is_rejected():
    case_id = "RS-CHAT0004"
    seed_case(
        case_id,
        "client@demo.co.za",
    )

    headers = auth_header(
        "client@demo.co.za",
        "Client123!",
    )

    response = client.post(
        f"/api/v1/cases/{case_id}/messages",
        headers=headers,
        json={"body": "   "},
    )

    assert response.status_code == 400
