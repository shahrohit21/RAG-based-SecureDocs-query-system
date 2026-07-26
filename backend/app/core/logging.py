import logging
import sys
import json
from datetime import datetime, timezone

class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.module,
            "function": record.funcName,
            "message": record.getMessage(),
        }
        if hasattr(record, "user_id"):
            log_obj["user_id"] = getattr(record, "user_id")
        if hasattr(record, "event_type"):
            log_obj["event_type"] = getattr(record, "event_type")
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)

def get_logger(name: str = "securedoc") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
    return logger

logger = get_logger("securedoc")
