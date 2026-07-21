#!/usr/bin/env python3
"""Seed eTax demo data through Supabase HTTP APIs.

This is useful when the Supabase CLI or psql is not installed. It requires the
schema migration to already be applied, because PostgREST cannot create tables,
policies, or extensions.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


DEMO_EMAIL = "demo@etax.local"
LEGACY_DEMO_EMAIL = "demo@etaxassist.local"
DEMO_PASSWORD = "DemoPass123!"
DEMO_USER_ID = "11111111-1111-4111-8111-111111111111"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")

    return values


def http_request(
    base_url: str,
    service_key: str,
    method: str,
    endpoint: str,
    payload: Any | None = None,
    extra_headers: dict[str, str] | None = None,
    ok_statuses: tuple[int, ...] = (200, 201, 204),
) -> tuple[int, str]:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }

    if extra_headers:
        headers.update(extra_headers)

    request = urllib.request.Request(
        f"{base_url}{endpoint}",
        data=body,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            text = response.read().decode("utf-8")
            if response.status not in ok_statuses:
                raise RuntimeError(f"HTTP {response.status}: {text}")
            return response.status, text
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8")


def create_or_find_demo_user(base_url: str, service_key: str) -> str:
    status, text = http_request(
        base_url,
        service_key,
        "POST",
        "/auth/v1/admin/users",
        {
            "id": DEMO_USER_ID,
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": "Mika Santos"},
        },
        ok_statuses=(200, 201),
    )

    if status < 400:
        payload = json.loads(text) if text else {}
        user_id = payload.get("id", DEMO_USER_ID)
        print(f"Created demo auth user: {DEMO_EMAIL}")
        return user_id

    list_status, list_text = http_request(
        base_url,
        service_key,
        "GET",
        "/auth/v1/admin/users?page=1&per_page=100",
        ok_statuses=(200,),
    )

    if list_status >= 400:
        raise RuntimeError(
            "Could not create or list auth users. "
            f"Create response HTTP {status}: {text}. "
            f"List response HTTP {list_status}: {list_text}"
        )

    payload = json.loads(list_text)
    users = payload.get("users", payload if isinstance(payload, list) else [])
    match = next(
        (
            user
            for user in users
            if user.get("id") == DEMO_USER_ID
            or user.get("email") in {DEMO_EMAIL, LEGACY_DEMO_EMAIL}
        ),
        None,
    )

    if not match:
        raise RuntimeError(
            "Demo auth user was not created and was not found in the first "
            f"100 users. Create response HTTP {status}: {text}"
        )

    user_id = str(match["id"])
    update_status, update_text = http_request(
        base_url,
        service_key,
        "PUT",
        f"/auth/v1/admin/users/{user_id}",
        {
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": "Mika Santos"},
        },
        ok_statuses=(200,),
    )

    if update_status >= 400:
        raise RuntimeError(
            "Found the demo user but could not update it. "
            f"HTTP {update_status}: {update_text}"
        )

    print(f"Demo auth user already exists; updated login to {DEMO_EMAIL}")
    return user_id


def upsert(
    base_url: str,
    service_key: str,
    table: str,
    rows: list[dict[str, Any]],
    conflict: str = "id",
) -> None:
    status, text = http_request(
        base_url,
        service_key,
        "POST",
        f"/rest/v1/{table}?on_conflict={conflict}",
        rows,
        {"Prefer": "resolution=merge-duplicates,return=minimal"},
        ok_statuses=(200, 201, 204),
    )

    if status >= 400:
        raise RuntimeError(f"Failed to seed {table}. HTTP {status}: {text}")

    print(f"Seeded {table}.")


def seed(base_url: str, service_key: str) -> None:
    user_id = create_or_find_demo_user(base_url, service_key)

    upsert(
        base_url,
        service_key,
        "profiles",
        [{"id": user_id, "email": DEMO_EMAIL, "full_name": "Mika Santos"}],
    )

    upsert(
        base_url,
        service_key,
        "taxpayer_profiles",
        [
            {
                "id": "21111111-1111-4111-8111-111111111111",
                "user_id": user_id,
                "taxpayer_type": "Self-employed professional / freelancer",
                "work_type": "Self-employed professional",
                "registration_status": "Already registered",
                "tin_status": "123-456-789-000",
                "rdo": "RDO 043A - East Pasig",
                "filing_frequency": "Quarterly and monthly checks",
            }
        ],
    )

    upsert(
        base_url,
        service_key,
        "document_checklist_items",
        [
            {
                "id": "41111111-1111-4111-8111-111111111111",
                "user_id": user_id,
                "title": "Certificate of Registration details",
                "description": "Keep registration details nearby to confirm tax types and RDO before filing.",
                "required": True,
                "status": "complete",
            },
            {
                "id": "41111111-1111-4111-8111-111111111112",
                "user_id": user_id,
                "title": "TIN and registered address",
                "description": "Confirm your TIN and registered address before updating filing status.",
                "required": True,
                "status": "complete",
            },
            {
                "id": "41111111-1111-4111-8111-111111111113",
                "user_id": user_id,
                "title": "Income records for the filing period",
                "description": "Prepare invoices, platform payouts, client remittances, or other income summaries.",
                "required": True,
                "status": "missing",
            },
            {
                "id": "41111111-1111-4111-8111-111111111114",
                "user_id": user_id,
                "title": "Deductible expense notes",
                "description": "Gather receipts or notes you plan to reference while preparing your return.",
                "required": False,
                "status": "missing",
            },
            {
                "id": "41111111-1111-4111-8111-111111111115",
                "user_id": user_id,
                "title": "Prior filing or payment references",
                "description": "Save reference numbers from any previous filing or payment record you want to track.",
                "required": False,
                "status": "complete",
            },
        ],
    )

    upsert(
        base_url,
        service_key,
        "deadlines",
        [
            {
                "id": "51111111-1111-4111-8111-111111111111",
                "user_id": user_id,
                "title": "Quarterly income tax preparation",
                "description": "Review income records and missing checklist items before filing.",
                "due_date": "2026-08-15",
                "status": "due_soon",
                "channel": "Filing tracker",
            },
            {
                "id": "51111111-1111-4111-8111-111111111112",
                "user_id": user_id,
                "title": "Monthly percentage tax review",
                "description": "Confirm whether this obligation applies to your registered tax type before proceeding.",
                "due_date": "2026-08-20",
                "status": "upcoming",
                "channel": "Filing tracker",
            },
            {
                "id": "51111111-1111-4111-8111-111111111113",
                "user_id": user_id,
                "title": "Registration record check",
                "description": "Review whether any profile details should be updated before filing.",
                "due_date": "2026-09-05",
                "status": "upcoming",
                "channel": "Profile review",
            },
        ],
    )

    upsert(
        base_url,
        service_key,
        "filing_obligations",
        [
            {
                "id": "61111111-1111-4111-8111-111111111111",
                "user_id": user_id,
                "form_name": "Quarterly income tax return",
                "period": "Q1 2026",
                "due_date": "2026-05-15",
                "status": "draft",
                "payment_status": "unpaid",
            },
            {
                "id": "61111111-1111-4111-8111-111111111112",
                "user_id": user_id,
                "form_name": "Quarterly income tax return",
                "period": "Q2 2026",
                "due_date": "2026-08-15",
                "status": "ready",
                "payment_status": "unpaid",
            },
            {
                "id": "61111111-1111-4111-8111-111111111113",
                "user_id": user_id,
                "form_name": "Quarterly income tax return",
                "period": "Q3 2026",
                "due_date": "2026-11-15",
                "status": "draft",
                "payment_status": "unpaid",
            },
            {
                "id": "61111111-1111-4111-8111-111111111114",
                "user_id": user_id,
                "form_name": "Annual income tax return",
                "period": "Annual 2026",
                "due_date": "2027-04-15",
                "status": "draft",
                "payment_status": "unpaid",
            },
        ],
    )

    print(f"Seed complete for {DEMO_EMAIL}.")


def main() -> int:
    env_path = Path(".env")
    if not env_path.exists():
        print("Missing .env file.", file=sys.stderr)
        return 1

    env = load_env(env_path)
    base_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not base_url or not service_key:
        print(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.",
            file=sys.stderr,
        )
        return 1

    try:
        seed(base_url, service_key)
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
