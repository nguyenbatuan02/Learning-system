from supabase import create_client, Client
from app.core.settings import settings

# Supabase client
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)

# Admin client với service role key (bypass RLS)
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)

def get_supabase() -> Client:
    return supabase

def get_supabase_admin() -> Client:
    return supabase_admin