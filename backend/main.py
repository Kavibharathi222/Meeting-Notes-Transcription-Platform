from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import database
import models
import schemas
import crud

app = FastAPI(title="Fireflies Clone API", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Allow all or NextJS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on start (just in case they weren't seeded yet)
models.Base.metadata.create_all(bind=database.engine)

# Dependency to get db session
get_db = database.get_db

@app.get("/")
def read_root():
    return {
        "status": "online",
        "name": "Fireflies Clone API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

# ----------------- Meetings Endpoints -----------------

@app.get("/api/meetings", response_model=List[schemas.MeetingListItem])
def read_meetings(
    q: Optional[str] = Query(None, description="Search by title"),
    participant: Optional[str] = Query(None, description="Filter by participant name"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    sort: Optional[str] = Query("newest", description="Sort order: newest or oldest"),
    db: Session = Depends(get_db)
):
    sort_by_newest = (sort != "oldest")
    meetings = crud.get_meetings(
        db, q=q, participant=participant, date=date, sort_by_newest=sort_by_newest
    )
    return meetings

@app.get("/api/meetings/{meeting_id}", response_model=schemas.MeetingDetail)
def read_meeting(meeting_id: int, db: Session = Depends(get_db)):
    db_meeting = crud.get_meeting(db, meeting_id=meeting_id)
    if db_meeting is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with ID {meeting_id} not found"
        )
    return db_meeting

@app.post("/api/meetings", response_model=schemas.MeetingDetail, status_code=status.HTTP_201_CREATED)
def create_meeting(meeting: schemas.MeetingCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_meeting(db=db, meeting=meeting)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create meeting: {str(e)}"
        )

@app.put("/api/meetings/{meeting_id}", response_model=schemas.MeetingDetail)
def update_meeting(meeting_id: int, meeting_update: schemas.MeetingUpdate, db: Session = Depends(get_db)):
    db_meeting = crud.update_meeting(db=db, meeting_id=meeting_id, meeting_update=meeting_update)
    if db_meeting is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with ID {meeting_id} not found"
        )
    return db_meeting

@app.delete("/api/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    success = crud.delete_meeting(db=db, meeting_id=meeting_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with ID {meeting_id} not found"
        )
    return None

# ----------------- Transcript Endpoints -----------------

@app.get("/api/meetings/{meeting_id}/transcript", response_model=List[schemas.TranscriptSegment])
def read_meeting_transcript(meeting_id: int, db: Session = Depends(get_db)):
    db_meeting = crud.get_meeting(db, meeting_id=meeting_id)
    if db_meeting is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with ID {meeting_id} not found"
        )
    return db_meeting.transcript_segments

@app.post("/api/meetings/{meeting_id}/comments", response_model=schemas.TranscriptComment)
def add_comment(meeting_id: int, comment: schemas.TranscriptCommentCreate, db: Session = Depends(get_db)):
    # Verify meeting and segment exist
    db_meeting = crud.get_meeting(db, meeting_id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    db_segment = db.query(models.TranscriptSegment).filter(
        models.TranscriptSegment.id == comment.segment_id,
        models.TranscriptSegment.meeting_id == meeting_id
    ).first()
    if not db_segment:
        raise HTTPException(status_code=404, detail="Transcript segment not found for this meeting")
        
    return crud.add_transcript_comment(db=db, meeting_id=meeting_id, comment=comment)

@app.post("/api/meetings/{meeting_id}/highlights", response_model=Optional[schemas.TranscriptHighlight])
def toggle_highlight(meeting_id: int, highlight: schemas.TranscriptHighlightCreate, db: Session = Depends(get_db)):
    # Verify meeting and segment exist
    db_meeting = crud.get_meeting(db, meeting_id=meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    db_segment = db.query(models.TranscriptSegment).filter(
        models.TranscriptSegment.id == highlight.segment_id,
        models.TranscriptSegment.meeting_id == meeting_id
    ).first()
    if not db_segment:
        raise HTTPException(status_code=404, detail="Transcript segment not found for this meeting")
        
    return crud.add_transcript_highlight(db=db, meeting_id=meeting_id, highlight=highlight)

# ----------------- Action Items Endpoints -----------------

@app.post("/api/action-items", response_model=schemas.ActionItem, status_code=status.HTTP_201_CREATED)
def create_action_item(item: schemas.ActionItemCreate, db: Session = Depends(get_db)):
    # Check meeting exists
    db_meeting = crud.get_meeting(db, meeting_id=item.meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail=f"Meeting with ID {item.meeting_id} not found")
    return crud.create_action_item(db=db, item=item)

@app.put("/api/action-items/{item_id}", response_model=schemas.ActionItem)
def update_action_item(item_id: int, item_update: schemas.ActionItemUpdate, db: Session = Depends(get_db)):
    db_item = crud.update_action_item(db=db, item_id=item_id, item_update=item_update)
    if not db_item:
        raise HTTPException(status_code=404, detail=f"Action item with ID {item_id} not found")
    return db_item

@app.delete("/api/action-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action_item(item_id: int, db: Session = Depends(get_db)):
    success = crud.delete_action_item(db=db, item_id=item_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Action item with ID {item_id} not found")
    return None

# ----------------- Search Endpoints -----------------

@app.get("/api/search", response_model=schemas.GlobalSearchResult)
def search(q: str = Query("", description="Global search query"), db: Session = Depends(get_db)):
    results = crud.global_search(db=db, query_str=q)
    return results
