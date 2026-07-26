import pytest
from backend.app.services.rag.masking import PIIMasker

def test_email_masking():
    raw = "Contact john.doe@company.com for inquiries."
    masked, counts = PIIMasker.mask_text(raw)
    assert "[EMAIL]" in masked
    assert "john.doe@company.com" not in masked
    assert counts.get("EMAIL") == 1

def test_password_masking():
    raw = "Login credentials - Username: admin, Password: SecretPass123!"
    masked, counts = PIIMasker.mask_text(raw)
    assert "[PASSWORD]" in masked
    assert "SecretPass123!" not in masked

def test_phone_masking():
    raw = "Call me at +1 555-123-4567 or 9876543210."
    masked, counts = PIIMasker.mask_text(raw)
    assert "[PHONE]" in masked
    assert "555-123-4567" not in masked

def test_pan_masking():
    raw = "My tax PAN card is ABCDE1234F."
    masked, counts = PIIMasker.mask_text(raw)
    assert "[PAN]" in masked
    assert "ABCDE1234F" not in masked

def test_aadhaar_masking():
    raw = "Aadhaar number is 2345 6789 0123."
    masked, counts = PIIMasker.mask_text(raw)
    assert "[AADHAAR]" in masked
    assert "2345 6789 0123" not in masked

def test_credit_card_masking():
    raw = "Payment card: 4532 1123 9988 7766."
    masked, counts = PIIMasker.mask_text(raw)
    assert "[CARD]" in masked
    assert "4532 1123 9988 7766" not in masked

def test_client_id_masking():
    raw = "Account Client ID: CID-998812."
    masked, counts = PIIMasker.mask_text(raw)
    assert "[CLIENT_ID]" in masked
    assert "CID-998812" not in masked
