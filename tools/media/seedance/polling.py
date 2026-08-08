import time
from .client import SeedanceClient

TERMINAL_STATES = {'succeeded', 'failed', 'cancelled'}

def wait_for_seedance_task(client: SeedanceClient, task_id: str, interval_seconds: float = 3.0, timeout_seconds: float = 600.0):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        task = client.get_task_status(task_id)
        if task.status in TERMINAL_STATES:
            return task
        time.sleep(interval_seconds)
    raise TimeoutError(f'Seedance task {task_id} did not finish before timeout.')
