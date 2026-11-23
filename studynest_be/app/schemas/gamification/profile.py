from pydantic import BaseModel, Field

from app.schemas.gamification.streak import StreakResponse


class XpState(BaseModel):
    level: int
    current_xp: int
    required_xp: int
    total_xp: int
    peak_balance: int = Field(description="Số dư Coin hiện tại")


class GamificationProfileResponse(BaseModel):
    level: int = Field(..., description="Level hiện tại từ user_gamification_profiles.level")
    current_xp: int = Field(..., description="XP hiện tại trong level")
    total_xp: int = Field(..., description="Tổng XP tích lũy")
    required_xp: int = Field(..., description="XP cần để lên cấp kế tiếp")
    current_peak_balance: int = Field(..., description="Số dư Coin hiện tại")
    streak: StreakResponse = Field(..., description="Thông tin streak hiện tại")

