from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str
    DEBUG: bool = True
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # OpenAI
    OPENAI_API_KEY: str
    
    # CORS
    ALLOWED_ORIGINS: str
    
    # File Upload
    MAX_FILE_SIZE: int = 10485760
    UPLOAD_DIR: str = "../uploads"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

settings = Settings()