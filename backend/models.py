import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    date = Column(String, nullable=False)  # ISO Date string: YYYY-MM-DD
    duration = Column(Integer, default=0)   # In seconds
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")
    transcript_segments = relationship("TranscriptSegment", back_populates="meeting", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    topics = relationship("Topic", back_populates="meeting", cascade="all, delete-orphan")
    comments = relationship("TranscriptComment", back_populates="meeting", cascade="all, delete-orphan")
    highlights = relationship("TranscriptHighlight", back_populates="meeting", cascade="all, delete-orphan")

class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)

    meeting = relationship("Meeting", back_populates="participants")

class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    speaker = Column(String, nullable=False)
    timestamp = Column(Integer, nullable=False)  # Seconds from start of audio
    content = Column(Text, nullable=False)

    meeting = relationship("Meeting", back_populates="transcript_segments")
    comments = relationship("TranscriptComment", back_populates="segment", cascade="all, delete-orphan")
    highlights = relationship("TranscriptHighlight", back_populates="segment", cascade="all, delete-orphan")

class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    task = Column(Text, nullable=False)
    completed = Column(Boolean, default=False)

    meeting = relationship("Meeting", back_populates="action_items")

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String, nullable=False)

    meeting = relationship("Meeting", back_populates="topics")

class TranscriptComment(Base):
    __tablename__ = "transcript_comments"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    segment_id = Column(Integer, ForeignKey("transcript_segments.id", ondelete="CASCADE"), nullable=False)
    author = Column(String, default="User")
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    meeting = relationship("Meeting", back_populates="comments")
    segment = relationship("TranscriptSegment", back_populates="comments")

class TranscriptHighlight(Base):
    __tablename__ = "transcript_highlights"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    segment_id = Column(Integer, ForeignKey("transcript_segments.id", ondelete="CASCADE"), nullable=False)
    color = Column(String, default="yellow")  # e.g., yellow, blue, green, pink

    meeting = relationship("Meeting", back_populates="highlights")
    segment = relationship("TranscriptSegment", back_populates="highlights")
