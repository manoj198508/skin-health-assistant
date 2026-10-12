from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_provider: str = "ollama"  # one of: ollama, openai, gemini

    ollama_base_url: str = "http://localhost:11434"
    ollama_text_model: str = "llama3.2:latest"
    ollama_vision_model: str = "qwen2.5vl:7b"

    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_text_model: str = "gpt-4o-mini"
    openai_vision_model: str = "gpt-4o-mini"

    gemini_api_key: str = ""
    gemini_text_model: str = "gemini-2.0-flash"
    gemini_vision_model: str = "gemini-2.0-flash"

    ai_timeout_seconds: int = 90

    database_url: str = "sqlite:///./skin_health.db"
    cors_origins: str = "http://localhost:5173"
    image_ttl_hours: int = 24
    max_image_mb: int = 8

    # If set, every API request must include this exact value in an X-Access-Code header.
    # Left empty (the default) for frictionless local development - set it before exposing
    # the backend publicly (e.g. via a tunnel) so only people you've shared it with can use it.
    access_code: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def normalized_ai_provider(self) -> str:
        return self.ai_provider.strip().lower()

    @property
    def active_text_model(self) -> str:
        provider = self.normalized_ai_provider
        if provider == "openai":
            return self.openai_text_model
        if provider == "gemini":
            return self.gemini_text_model
        return self.ollama_text_model

    @property
    def active_vision_model(self) -> str:
        provider = self.normalized_ai_provider
        if provider == "openai":
            return self.openai_vision_model
        if provider == "gemini":
            return self.gemini_vision_model
        return self.ollama_vision_model


settings = Settings()
