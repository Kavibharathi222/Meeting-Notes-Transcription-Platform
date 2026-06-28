import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
import models
import schemas

# Parse raw transcript text into segments
def parse_raw_transcript(raw_text: str, total_duration_seconds: int) -> list:
    """
    Parses transcripts in formats:
    - Speaker Name 00:15
      Text content here
    - John: We should release next week.
    - [00:15] Sarah: Needs QA approval.
    """
    segments = []
    lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
    if not lines:
        return segments

    # Try parsing common formats
    # Format 1: [00:15] Speaker: Content OR Speaker [00:15]: Content
    # Format 2: Speaker: Content
    parsed_lines = []
    
    # Simple regex for timestamp extraction
    time_rx = re.compile(r"\[?(\d{1,2}):(\d{2})\]?") # matches 00:15 or [00:15]

    for line in lines:
        timestamp = None
        # Try to find timestamp
        time_match = time_rx.search(line)
        if time_match:
            mins, secs = int(time_match.group(1)), int(time_match.group(2))
            timestamp = mins * 60 + secs
            # Remove timestamp from line
            line_cleaned = time_rx.sub("", line).strip()
        else:
            line_cleaned = line

        # Split speaker and text
        if ":" in line_cleaned:
            parts = line_cleaned.split(":", 1)
            speaker = parts[0].strip()
            content = parts[1].strip()
            parsed_lines.append({
                "speaker": speaker,
                "content": content,
                "timestamp": timestamp
            })
        else:
            # Check if there is a speaker name on a separate line or we just treat whole line as content
            # If no colon, treat as generic speaker with content
            parsed_lines.append({
                "speaker": "Speaker",
                "content": line_cleaned,
                "timestamp": timestamp
            })

    # Fill in missing timestamps by distributing duration evenly
    segment_count = len(parsed_lines)
    for idx, segment in enumerate(parsed_lines):
        if segment["timestamp"] is None:
            # Distribute time evenly across segments
            time_per_segment = max(5, total_duration_seconds // segment_count if segment_count > 0 else 5)
            segment["timestamp"] = min(idx * time_per_segment, total_duration_seconds)
        
        segments.append(models.TranscriptSegment(
            speaker=segment["speaker"],
            timestamp=segment["timestamp"],
            content=segment["content"]
        ))
    
    # Sort segments by timestamp
    segments.sort(key=lambda s: s.timestamp)
    return segments

# Meetings
def get_meeting(db: Session, meeting_id: int):
    return db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()

def get_meetings(
    db: Session,
    q: str = None,
    participant: str = None,
    date: str = None,
    sort_by_newest: bool = True
):
    query = db.query(models.Meeting)

    if q:
        query = query.filter(models.Meeting.title.like(f"%{q}%"))

    if participant:
        query = query.join(models.Participant).filter(
            models.Participant.name.like(f"%{participant}%")
        )

    if date:
        query = query.filter(models.Meeting.date == date)

    if sort_by_newest:
        query = query.order_by(desc(models.Meeting.date), desc(models.Meeting.id))
    else:
        query = query.order_by(models.Meeting.date, models.Meeting.id)

    return query.all()

def create_meeting(db: Session, meeting: schemas.MeetingCreate):
    db_meeting = models.Meeting(
        title=meeting.title,
        date=meeting.date,
        duration=meeting.duration,
        summary=meeting.summary
    )
    db.add(db_meeting)
    db.flush() # Get meeting.id

    # Create participants
    for name in meeting.participants:
        db_participant = models.Participant(
            meeting_id=db_meeting.id,
            name=name
        )
        db.add(db_participant)

    # Add transcript segments
    if meeting.transcript_raw:
        segments = parse_raw_transcript(meeting.transcript_raw, meeting.duration)
        for seg in segments:
            seg.meeting_id = db_meeting.id
            db.add(seg)
    elif meeting.transcript_segments:
        for seg in meeting.transcript_segments:
            db_seg = models.TranscriptSegment(
                meeting_id=db_meeting.id,
                speaker=seg.speaker,
                timestamp=seg.timestamp,
                content=seg.content
            )
            db.add(db_seg)
    else:
        # Generate default initial greeting segment so it is never completely blank
        db_seg = models.TranscriptSegment(
            meeting_id=db_meeting.id,
            speaker="System Bot",
            timestamp=0,
            content="Welcome! No transcript dialogue was uploaded for this call. You can write dialogue segments (e.g. 'John: Hello') when creating a meeting."
        )
        db.add(db_seg)

    # Add key topics
    if meeting.topics:
        for topic_name in meeting.topics:
            db_topic = models.Topic(
                meeting_id=db_meeting.id,
                topic=topic_name
            )
            db.add(db_topic)

    # Add action items
    if meeting.action_items:
        for task in meeting.action_items:
            db_item = models.ActionItem(
                meeting_id=db_meeting.id,
                task=task,
                completed=False
            )
            db.add(db_item)

    db.commit()
    db.refresh(db_meeting)
    return db_meeting

def update_meeting(db: Session, meeting_id: int, meeting_update: schemas.MeetingUpdate):
    db_meeting = get_meeting(db, meeting_id)
    if not db_meeting:
        return None

    update_data = meeting_update.model_dump(exclude_unset=True)
    
    # Handle participants update separately
    if "participants" in update_data:
        new_participants = update_data.pop("participants")
        # Delete old participants
        db.query(models.Participant).filter(models.Participant.meeting_id == meeting_id).delete()
        # Add new participants
        for name in new_participants:
            db_participant = models.Participant(
                meeting_id=meeting_id,
                name=name
            )
            db.add(db_participant)

    for key, value in update_data.items():
        setattr(db_meeting, key, value)

    db.commit()
    db.refresh(db_meeting)
    return db_meeting

def delete_meeting(db: Session, meeting_id: int):
    db_meeting = get_meeting(db, meeting_id)
    if not db_meeting:
        return False
    db.delete(db_meeting)
    db.commit()
    return True

# Action Items
def create_action_item(db: Session, item: schemas.ActionItemCreate):
    db_item = models.ActionItem(
        meeting_id=item.meeting_id,
        task=item.task,
        completed=False
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_action_item(db: Session, item_id: int, item_update: schemas.ActionItemUpdate):
    db_item = db.query(models.ActionItem).filter(models.ActionItem.id == item_id).first()
    if not db_item:
        return None

    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item

def delete_action_item(db: Session, item_id: int):
    db_item = db.query(models.ActionItem).filter(models.ActionItem.id == item_id).first()
    if not db_item:
        return False
    db.delete(db_item)
    db.commit()
    return True

# Comments & Highlights
def add_transcript_comment(db: Session, meeting_id: int, comment: schemas.TranscriptCommentCreate):
    db_comment = models.TranscriptComment(
        meeting_id=meeting_id,
        segment_id=comment.segment_id,
        author=comment.author,
        text=comment.text
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

def add_transcript_highlight(db: Session, meeting_id: int, highlight: schemas.TranscriptHighlightCreate):
    # Check if highlight already exists for this segment
    db_hl = db.query(models.TranscriptHighlight).filter(
        models.TranscriptHighlight.meeting_id == meeting_id,
        models.TranscriptHighlight.segment_id == highlight.segment_id
    ).first()
    
    if db_hl:
        # Toggle highlight off if same color or update color
        if db_hl.color == highlight.color:
            db.delete(db_hl)
            db.commit()
            return None
        else:
            db_hl.color = highlight.color
            db.commit()
            db.refresh(db_hl)
            return db_hl
    
    db_hl = models.TranscriptHighlight(
        meeting_id=meeting_id,
        segment_id=highlight.segment_id,
        color=highlight.color
    )
    db.add(db_hl)
    db.commit()
    db.refresh(db_hl)
    return db_hl

# Global Search
def global_search(db: Session, query_str: str) -> dict:
    if not query_str:
        return {"meetings": [], "segments": [], "action_items": []}

    pattern = f"%{query_str}%"

    # Search in meetings (titles)
    meetings = db.query(models.Meeting).filter(models.Meeting.title.like(pattern)).all()

    # Search in transcripts
    segments = db.query(models.TranscriptSegment).filter(models.TranscriptSegment.content.like(pattern)).all()

    # Search in action items
    action_items = db.query(models.ActionItem).filter(models.ActionItem.task.like(pattern)).all()

    return {
        "meetings": meetings,
        "segments": segments,
        "action_items": action_items
    }
