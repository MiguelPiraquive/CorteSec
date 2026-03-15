"""
Encryption utilities for sensitive 2FA data.
Uses Django's Fernet-based encryption via the cryptography library.
"""
import base64
import json
import logging
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
import hashlib

logger = logging.getLogger('security')


def _get_fernet_key():
    """Derive a Fernet key from Django's SECRET_KEY."""
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_value(plaintext):
    """Encrypt a string value."""
    if not plaintext:
        return ''
    try:
        f = Fernet(_get_fernet_key())
        return f.encrypt(plaintext.encode()).decode()
    except Exception as e:
        logger.error(f"Encryption error: {e}")
        return plaintext


def decrypt_value(ciphertext):
    """Decrypt a string value."""
    if not ciphertext:
        return ''
    try:
        f = Fernet(_get_fernet_key())
        return f.decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        # If decryption fails, the value may be stored in plaintext (pre-migration)
        return ciphertext
    except Exception as e:
        logger.error(f"Decryption error: {e}")
        return ciphertext


def encrypt_json(data):
    """Encrypt a JSON-serializable value."""
    if not data:
        return ''
    try:
        f = Fernet(_get_fernet_key())
        json_str = json.dumps(data)
        return f.encrypt(json_str.encode()).decode()
    except Exception as e:
        logger.error(f"JSON encryption error: {e}")
        return json.dumps(data)


def decrypt_json(ciphertext):
    """Decrypt a JSON value."""
    if not ciphertext:
        return []
    try:
        f = Fernet(_get_fernet_key())
        json_str = f.decrypt(ciphertext.encode()).decode()
        return json.loads(json_str)
    except InvalidToken:
        # Pre-migration plaintext data
        if isinstance(ciphertext, (list, dict)):
            return ciphertext
        try:
            return json.loads(ciphertext)
        except (json.JSONDecodeError, TypeError):
            return ciphertext
    except Exception as e:
        logger.error(f"JSON decryption error: {e}")
        return ciphertext if isinstance(ciphertext, list) else []
