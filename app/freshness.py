"""Read-time expiry: imports and server restarts never renew evidence."""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

MAX_AGE = timedelta(days=30)

def timestamp(value):
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    except (ValueError, TypeError, AttributeError):
        return None

def state(status, deadline, evidence, now=None):
    now = now or datetime.now(timezone.utc)
    end = timestamp(deadline)
    if end and len(deadline) == 10:
        end = end.replace(hour=23, minute=59, second=59, tzinfo=ZoneInfo('Europe/Madrid'))
    if status == 'closed' or (end and now > end):
        return 'closed'
    activity = timestamp(evidence.get('last_activity_at'))
    if not activity or activity > now or now - activity > MAX_AGE:
        return 'stale'
    return 'verified' if evidence.get('verified') and evidence.get('evidence') else 'unverified'
