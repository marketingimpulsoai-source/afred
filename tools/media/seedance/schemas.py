from dataclasses import dataclass
from typing import Literal, Optional

AspectRatio = Literal['16:9', '9:16', '1:1', '4:3', '3:4', '21:9']

@dataclass
class SeedanceVideoRequest:
    prompt: str
    mode: Literal['text_to_video', 'image_to_video', 'reference_to_video', 'video_edit', 'video_extend']
    aspect_ratio: AspectRatio = '16:9'
    duration_seconds: int = 8
    source_url: Optional[str] = None
    reference_url: Optional[str] = None
    seed: Optional[int] = None

@dataclass
class SeedanceTask:
    task_id: str
    status: Literal['queued', 'running', 'succeeded', 'failed', 'cancelled']
    result_url: Optional[str] = None
    cost_estimate_usd: Optional[float] = None
