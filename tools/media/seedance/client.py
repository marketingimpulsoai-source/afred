import os
from .schemas import SeedanceVideoRequest, SeedanceTask

class SeedanceClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key or os.getenv('SEEDANCE_API_KEY')
        self.base_url = base_url or os.getenv('SEEDANCE_BASE_URL')
        self.model = os.getenv('SEEDANCE_MODEL', 'seedance-2.5')

    def is_configured(self) -> bool:
        return bool(self.api_key and self.base_url)

    def create_task(self, request: SeedanceVideoRequest) -> SeedanceTask:
        if not self.is_configured():
            raise RuntimeError('Seedance is not configured. Set SEEDANCE_API_KEY and SEEDANCE_BASE_URL in local .env.')
        raise NotImplementedError('Wire this method to the official Seedance 2.5 API contract.')

    def get_task_status(self, task_id: str) -> SeedanceTask:
        if not self.is_configured():
            raise RuntimeError('Seedance is not configured.')
        raise NotImplementedError('Wire this method to the official Seedance 2.5 API contract.')
