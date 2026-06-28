from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

# Participant
class ParticipantBase(BaseModel):
    name: str
    email: Optional[str] = None

class ParticipantCreate(ParticipantBase):
    pass

class Participant(ParticipantBase):
    id: int
    meeting_id: int
    model_config = ConfigDict(from_attributes=True)

# Transcript Segment
class TranscriptSegmentBase(BaseModel):
    speaker: str
    timestamp: int  # Seconds
    content: str

class TranscriptSegmentCreate(TranscriptSegmentBase):
    pass

class TranscriptSegment(TranscriptSegmentBase):
    id: int
    meeting_id: int
    model_config = ConfigDict(from_attributes=True)

# Action Item
class ActionItemBase(BaseModel):
    task: str

class ActionItemCreate(ActionItemBase):
    meeting_id: int

class ActionItemUpdate(BaseModel):
    task: Optional[str] = None
    completed: Optional[bool] = None

class ActionItem(ActionItemBase):
    id: int
    meeting_id: int
    completed: bool
    model_config = ConfigDict(from_attributes=True)

# Topic
class TopicBase(BaseModel):
    topic: str

class TopicCreate(TopicBase):
    pass

class Topic(TopicBase):
    id: int
    meeting_id: int
    model_config = ConfigDict(from_attributes=True)

# Transcript Comment
class TranscriptCommentBase(BaseModel):
    text: str
    author: Optional[str] = "User"

class TranscriptCommentCreate(TranscriptCommentBase):
    segment_id: int

class TranscriptComment(TranscriptCommentBase):
    id: int
    meeting_id: int
    segment_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Transcript Highlight
class TranscriptHighlightBase(BaseModel):
    color: str = "yellow"

class TranscriptHighlightCreate(TranscriptHighlightBase):
    segment_id: int

class TranscriptHighlight(TranscriptHighlightBase):
    id: int
    meeting_id: int
    segment_id: int
    model_config = ConfigDict(from_attributes=True)

# Meeting
class MeetingBase(BaseModel):
    title: str
    date: str
    duration: int
    summary: Optional[str] = None

class MeetingCreate(BaseModel):
    title: str
    date: str
    duration: int
    participants: List[str]  # Just names as list of strings for simplicity
    transcript_raw: Optional[str] = None
    transcript_segments: Optional[List[TranscriptSegmentCreate]] = None
    summary: Optional[str] = None
    topics: Optional[List[str]] = None
    action_items: Optional[List[str]] = None

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    duration: Optional[int] = None
    participants: Optional[List[str]] = None  # Replaces existing participants

class MeetingListItem(BaseModel):
    id: int
    title: str
    date: str
    duration: int
    summary: Optional[str] = None
    created_at: datetime
    participants: List[Participant]
    model_config = ConfigDict(from_attributes=True)

class MeetingDetail(MeetingListItem):
    transcript_segments: List[TranscriptSegment]
    action_items: List[ActionItem]
    topics: List[Topic]
    comments: List[TranscriptComment]
    highlights: List[TranscriptHighlight]
    model_config = ConfigDict(from_attributes=True)

# Global Search Responses
class GlobalSearchResult(BaseModel):
    meetings: List[MeetingListItem]
    segments: List[TranscriptSegment]  # Matches in transcripts
    action_items: List[ActionItem]      # Matches in action items
