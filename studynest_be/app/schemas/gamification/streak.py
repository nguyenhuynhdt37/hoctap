import datetime
import uuid
from typing import List, Optional
from pydantic import BaseModel, Field


class StreakResponse(BaseModel):
    current_streak: int = Field(..., description="Chuỗi ngày học tập hiện tại")
    best_streak: int = Field(..., description="Kỷ lục chuỗi ngày học tập dài nhất")
    streak_freezes: int = Field(..., description="Số lượng lượt đóng băng Streak còn lại")
    last_active_date: Optional[datetime.date] = Field(None, description="Ngày cuối cùng hoàn thành hoạt động đạt chuẩn")


class StreakRestoreResponse(BaseModel):
    success: bool = Field(..., description="Trạng thái khôi phục thành công")
    message: str = Field(..., description="Thông báo phản hồi")
    current_streak: int = Field(..., description="Chuỗi ngày học tập sau khi khôi phục")
    streak_freezes_left: int = Field(..., description="Số lượng đóng băng Streak còn lại")


class ActivityLogDTO(BaseModel):
    id: str = Field(..., description="ID nhật ký hoạt động")
    action_type: str = Field(..., description="Loại hoạt động (ví dụ: 'lesson.completed')")
    source_event_id: Optional[str] = Field(None, description="ID nguồn phát sinh sự kiện")
    created_at: Optional[str] = Field(None, description="Thời gian ghi nhận")
    metadata: dict = Field(default_factory=dict, description="Thông tin chi tiết bổ sung")


class StreakHistoryResponse(BaseModel):
    activities: List[ActivityLogDTO] = Field(default_factory=list, description="Danh sách lịch sử hoạt động học tập đạt chuẩn")


class StreakCalendarResponse(BaseModel):
    active_dates: List[str] = Field(default_factory=list, description="Danh sách các ngày đã hoàn thành hoạt động (dạng YYYY-MM-DD)")
