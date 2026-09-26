from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class AccessRequest(BaseModel):
    dni: str = Field(..., max_length=20, description="Número de identificación leído del QR")
    message: Optional[str] = Field("Acceso a biblioteca", max_length=255)