from pydantic import BaseModel, Field

from app.schemas.gamification.streak import StreakResponse


class GamificationProfileResponse(BaseModel):
    level: int = Field(..., description="Level hiện tại từ user_gamification_profiles.level")
    current_xp: int = Field(..., description="XP hiện tại trong level")
    total_xp: int = Field(..., description="Tổng XP tích lũy")
    required_xp: int = Field(..., description="XP cần cho level kế tiếp từ levels_config.xp_required")
    current_peak_balance: int = Field(..., description="Số dư Peak hiện tại")
    streak: StreakResponse = Field(..., description="Thông tin streak hiện tại")

