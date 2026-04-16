from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    anthropic_api_key: str = ""
    environment: str = "development"

settings = Settings()
