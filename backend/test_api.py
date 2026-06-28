from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

def test_read_meetings():
    response = client.get("/api/meetings")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    print("[OK] Successfully retrieved meetings lists.")

def test_read_single_meeting():
    response = client.get("/api/meetings/1")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Product Launch Sync"
    assert len(data["transcript_segments"]) > 0
    assert len(data["action_items"]) > 0
    print("[OK] Successfully read single meeting detail details.")

def test_search():
    response = client.get("/api/search?q=sprint")
    assert response.status_code == 200
    data = response.json()
    assert len(data["meetings"]) > 0 or len(data["segments"]) > 0
    print("[OK] Successfully queried global search.")

def test_action_item_crud():
    # 1. Create task
    response = client.post("/api/action-items", json={"meeting_id": 1, "task": "Write test cases"})
    assert response.status_code == 201
    item = response.json()
    item_id = item["id"]
    assert item["task"] == "Write test cases"
    assert item["completed"] is False
    print("[OK] Action item create works.")

    # 2. Toggle task complete
    response = client.put(f"/api/action-items/{item_id}", json={"completed": True})
    assert response.status_code == 200
    item = response.json()
    assert item["completed"] is True
    print("[OK] Action item update complete works.")

    # 3. Delete task
    response = client.delete(f"/api/action-items/{item_id}")
    assert response.status_code == 204
    print("[OK] Action item delete works.")

if __name__ == "__main__":
    print("Running automated API validation tests...")
    test_read_meetings()
    test_read_single_meeting()
    test_search()
    test_action_item_crud()
    print("All tests completed successfully!")
