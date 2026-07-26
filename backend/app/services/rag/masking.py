import re
from typing import Tuple, Dict

class PIIMasker:
    """
    Regex-based PII Detection and Masking module.
    Detects sensitive patterns and replaces them with standard placeholders
    before chunking and vector embedding.
    """

    PATTERNS = {
        "EMAIL": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
        "PASSWORD": r'(?i)\b(password|passwd|pwd|passcode)\s*[:=]\s*(\S+)',
        "PHONE": r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
        "PAN": r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b',
        "AADHAAR": r'\b[2-9]{1}\d{3}[\s-]?\d{4}[\s-]?\d{4}\b',
        "CARD": r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11}|(?:\d[ -]*?){13,19})\b',
        "CLIENT_ID": r'(?i)\b(?:client[-_\s]?id|cid|client[-_\s]?no)\s*[:=]\s*([a-z0-9-_]+)\b',
    }

    @classmethod
    def mask_text(cls, text: str) -> Tuple[str, Dict[str, int]]:
        """
        Masks all PII occurrences in text.
        Returns:
            masked_text (str): Text with sensitive details replaced by tokens.
            detection_counts (dict): Frequency of each detected PII type.
        """
        masked_text = text
        counts = {}
        
        # 1. Passwords
        def replace_password(match):
            keyword = match.group(1)
            return f"{keyword}: [PASSWORD]"
            
        masked_text, pass_count = re.subn(cls.PATTERNS["PASSWORD"], replace_password, masked_text)
        if pass_count > 0:
            counts["PASSWORD"] = pass_count

        # 2. Client IDs
        masked_text, cid_count = re.subn(cls.PATTERNS["CLIENT_ID"], "[CLIENT_ID]", masked_text)
        if cid_count > 0:
            counts["CLIENT_ID"] = cid_count

        # 3. Emails
        masked_text, email_count = re.subn(cls.PATTERNS["EMAIL"], "[EMAIL]", masked_text)
        if email_count > 0:
            counts["EMAIL"] = email_count

        # 4. PAN Card
        masked_text, pan_count = re.subn(cls.PATTERNS["PAN"], "[PAN]", masked_text)
        if pan_count > 0:
            counts["PAN"] = pan_count

        # 5. Credit Cards (13-19 digits, run before Aadhaar to capture 16-digit Visa/Mastercard)
        def replace_card(match):
            raw_val = match.group(0)
            digits = re.sub(r'\D', '', raw_val)
            if 13 <= len(digits) <= 19:
                return "[CARD]"
            return raw_val

        masked_text, card_count = re.subn(cls.PATTERNS["CARD"], replace_card, masked_text)
        if card_count > 0:
            counts["CARD"] = card_count

        # 6. Aadhaar Card (12 digits starting 2-9)
        masked_text, aadhaar_count = re.subn(cls.PATTERNS["AADHAAR"], "[AADHAAR]", masked_text)
        if aadhaar_count > 0:
            counts["AADHAAR"] = aadhaar_count

        # 7. Phone Numbers
        masked_text, phone_count = re.subn(cls.PATTERNS["PHONE"], "[PHONE]", masked_text)
        if phone_count > 0:
            counts["PHONE"] = phone_count

        return masked_text, counts
