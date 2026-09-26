from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class AccessResponse(BaseModel):
    id: int
    user_id: int
    user_name: str          # campo agregado: nombre del usuario que ingresó
    message: str
    status: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)