from supabase import create_client, Client
from app.config import settings


def get_supabase():
    """Supabase client dependency. Returns None if not configured (dev mode)."""
    if not settings.supabase_url:
        return None
    return create_client(settings.supabase_url, settings.supabase_anon_key)
