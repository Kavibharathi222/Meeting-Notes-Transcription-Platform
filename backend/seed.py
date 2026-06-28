import os
import wave
import struct
import datetime
import math
import urllib.request
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models

def generate_fallback_wav(filepath):
    # Generates a soft 440Hz sine wave tone if download fails
    sample_rate = 8000
    duration_seconds = 120
    num_samples = sample_rate * duration_seconds
    with wave.open(filepath, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(1)
        wav_file.setframerate(sample_rate)
        samples = []
        for i in range(num_samples):
            val = int(128 + 45 * math.sin(2 * math.pi * 440 * i / sample_rate))
            samples.append(val)
        data = struct.pack("<" + "B" * num_samples, *samples)
        wav_file.writeframes(data)

def generate_sample_wav():
    public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public"))
    if not os.path.exists(public_dir):
        os.makedirs(public_dir, exist_ok=True)
        
    mp3_path = os.path.join(public_dir, "sample.mp3")
    wav_path = os.path.join(public_dir, "sample.wav")
    
    # Try downloading a real speech/podcast MP3 file
    url = "https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.mp3"
    print(f"Attempting to download realistic voice audio sample from: {url}")
    try:
        # Download file
        urllib.request.urlretrieve(url, mp3_path)
        print("Realistic speech audio sample (sample.mp3) downloaded successfully!")
    except Exception as e:
        print(f"Failed to download voice sample: {e}. Generating fallback tone...")
        generate_fallback_wav(wav_path)
        # Copy to mp3 extension in case frontend requests it
        if os.path.exists(wav_path):
            import shutil
            shutil.copy(wav_path, mp3_path)

def seed_db():
    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Meeting 1: Product Launch Sync
        m1 = models.Meeting(
            title="Product Launch Sync",
            date="2026-06-27",
            duration=120,
            summary="The team aligned on the final launch plan. John reviewed marketing collateral and press releases. Sarah shared the QA sign-off status and highlighted a minor UI issue in the billing modal. Dave confirmed that the production infrastructure and monitoring tools are fully deployed. The launch is officially scheduled for next Thursday at 9:00 AM EST.",
            created_at=datetime.datetime(2026, 6, 27, 10, 0, 0)
        )
        db.add(m1)
        db.flush()
        
        # Participants
        for p in [("John Doe", "john@company.com"), ("Sarah Smith", "sarah@company.com"), ("Dave Jones", "dave@company.com")]:
            db.add(models.Participant(meeting_id=m1.id, name=p[0], email=p[1]))
            
        # Topics
        for t in ["Marketing Collateral", "QA Status", "Production Environment", "Launch Schedule"]:
            db.add(models.Topic(meeting_id=m1.id, topic=t))
            
        # Action Items
        db.add(models.ActionItem(meeting_id=m1.id, task="Complete marketing materials review", completed=True))
        db.add(models.ActionItem(meeting_id=m1.id, task="Fix billing modal UI bugs", completed=False))
        db.add(models.ActionItem(meeting_id=m1.id, task="Verify database failover configs in production", completed=False))
        db.add(models.ActionItem(meeting_id=m1.id, task="Publish launch announcement blog post", completed=False))
        
        # Transcripts (22 segments)
        m1_dialogue = [
            ("John Doe", 0, "Welcome everyone to our final Product Launch Sync. Let's make sure we are ready."),
            ("Sarah Smith", 5, "Hi John, from the QA side, we are finishing up our regression suite."),
            ("Dave Jones", 10, "Production servers are up. I spent the morning configuring replication and monitoring."),
            ("John Doe", 15, "Excellent. Sarah, are there any major blocking issues found in regression?"),
            ("Sarah Smith", 20, "Not major, but we did find a minor formatting error in the billing modal."),
            ("John Doe", 25, "Okay, is that going to block us? Can we resolve it by Monday?"),
            ("Sarah Smith", 30, "Yes, it's just a styling issue. I've logged it in Jira and assigned it to the UI team."),
            ("Dave Jones", 35, "I can help review the UI fix if the frontend team needs assistance."),
            ("John Doe", 40, "Perfect. What about load testing, Dave? How are we looking there?"),
            ("Dave Jones", 45, "We simulated up to ten thousand concurrent users. The CPU load hovered around forty percent."),
            ("Sarah Smith", 50, "That is really reassuring. The optimization work last week paid off."),
            ("John Doe", 55, "Great job on the performance tuning. Let's move on to the marketing updates."),
            ("John Doe", 60, "I drafted the press release and set up the campaign targets for next Thursday."),
            ("Sarah Smith", 65, "Did we finalize the pricing page layout?"),
            ("John Doe", 70, "Yes, the pricing copy was signed off by finance yesterday. We are good to go."),
            ("Dave Jones", 75, "What time are we planning to deploy the final build next Thursday?"),
            ("John Doe", 80, "We'll do a soft launch at 8:00 AM EST and announce it publicly at 9:00 AM EST."),
            ("Dave Jones", 85, "Understood. I will arrange a rotation so that our core engineers are online."),
            ("Sarah Smith", 90, "I will have QA team members online as well to run quick sanity checks on live."),
            ("John Doe", 95, "Awesome, that covers it. Let's do a quick final check on Monday morning."),
            ("Dave Jones", 100, "Sounds like a solid plan. See you guys then."),
            ("Sarah Smith", 105, "Thanks everyone, have a great weekend!")
        ]
        for name, ts, text in m1_dialogue:
            db.add(models.TranscriptSegment(meeting_id=m1.id, speaker=name, timestamp=ts, content=text))

        # Meeting 2: Sprint Planning
        m2 = models.Meeting(
            title="Sprint Planning",
            date="2026-06-26",
            duration=120,
            summary="The engineering team discussed sprint goals for the upcoming two-week cycle. The primary objective is to complete the core user analytics charts and integrate the payment gateway. Dave will handle database schema upgrades, Sarah will build the dashboard charts, and John will work on the Stripe webhook integrations.",
            created_at=datetime.datetime(2026, 6, 26, 11, 0, 0)
        )
        db.add(m2)
        db.flush()
        
        for p in [("John Doe", "john@company.com"), ("Sarah Smith", "sarah@company.com"), ("Dave Jones", "dave@company.com")]:
            db.add(models.Participant(meeting_id=m2.id, name=p[0], email=p[1]))
            
        for t in ["Sprint Goals", "Analytics Dashboard", "Payment Integration", "Database Migration"]:
            db.add(models.Topic(meeting_id=m2.id, topic=t))
            
        db.add(models.ActionItem(meeting_id=m2.id, task="Create db migration script for Stripe subscriptions", completed=True))
        db.add(models.ActionItem(meeting_id=m2.id, task="Implement chart layout and responsive styles", completed=False))
        db.add(models.ActionItem(meeting_id=m2.id, task="Write test cases for subscription webhooks", completed=False))
        db.add(models.ActionItem(meeting_id=m2.id, task="Organize sprint backlog and estimate remaining tickets", completed=False))
        
        m2_dialogue = [
            ("Dave Jones", 0, "Alright, let's start the Sprint Planning session for Sprint 14."),
            ("Sarah Smith", 5, "I look forward to this. We have some exciting features lined up."),
            ("John Doe", 10, "Yes, our priority is the payment integration and analytics dashboard."),
            ("Dave Jones", 15, "Let's review the tickets in the backlog first. We have twelve story points of technical debt."),
            ("Sarah Smith", 20, "We should definitely address the slow query on the user dashboard. It takes almost three seconds."),
            ("Dave Jones", 25, "Agreed. I will add an index and optimize the raw query. I'll estimate that as a two-pointer."),
            ("John Doe", 30, "What about the Stripe integration? I need the subscription schemas finalized."),
            ("Dave Jones", 35, "I will define the subscription table columns and write the migration script by Monday."),
            ("Sarah Smith", 40, "Great. That will let me build the mock billing dashboard without waiting."),
            ("John Doe", 45, "I'll start building the webhook endpoint in FastAPI to receive Stripe events."),
            ("Sarah Smith", 50, "Regarding the analytics dashboard, we need custom graphs for monthly recurring revenue."),
            ("Dave Jones", 55, "Which library are we using? Chart.js or Recharts?"),
            ("Sarah Smith", 60, "Let's go with Recharts. It fits nicely with our Tailwind CSS styling."),
            ("John Doe", 65, "Agreed, Recharts is easier to make responsive and style."),
            ("Dave Jones", 70, "Okay, Sarah, I'll assign the charts ticket to you. It's a five-pointer."),
            ("Sarah Smith", 75, "Perfect, I'll take it. I should be able to finish it by middle of next week."),
            ("John Doe", 80, "I will take the Stripe endpoint. I'll also add comprehensive tests for it."),
            ("Dave Jones", 85, "Don't forget to handle edge cases like failed payments and customer churn."),
            ("John Doe", 90, "Of course. I'll create custom email notification triggers for failed payments."),
            ("Sarah Smith", 95, "Should we schedule the demo for the last Friday of the sprint?"),
            ("Dave Jones", 100, "Yes, standard demo time. 3:00 PM in the general channel."),
            ("John Doe", 105, "Sounds like a solid sprint backlog. Let's get to work.")
        ]
        for name, ts, text in m2_dialogue:
            db.add(models.TranscriptSegment(meeting_id=m2.id, speaker=name, timestamp=ts, content=text))

        # Meeting 3: Client Sales Call
        m3 = models.Meeting(
            title="Client Sales Call - TechCorp",
            date="2026-06-25",
            duration=120,
            summary="A discovery meeting with TechCorp's VP of Engineering. The client showed interest in enterprise subscription tier. Key requirements include Single Sign-On (SSO), data residency in Europe, and custom API usage limits. Next step is to send a tailored pricing proposal and arrange a technical deep-dive.",
            created_at=datetime.datetime(2026, 6, 25, 14, 30, 0)
        )
        db.add(m3)
        db.flush()
        
        for p in [("John Doe (Sales)", "john@company.com"), ("Alice Green (TechCorp)", "alice@techcorp.com")]:
            db.add(models.Participant(meeting_id=m3.id, name=p[0], email=p[1]))
            
        for t in ["Discovery", "SSO & Security", "Data Residency", "Pricing Quote"]:
            db.add(models.Topic(meeting_id=m3.id, topic=t))
            
        db.add(models.ActionItem(meeting_id=m3.id, task="Send technical whitepaper on security compliance", completed=True))
        db.add(models.ActionItem(meeting_id=m3.id, task="Draft custom enterprise pricing proposal for 200 seats", completed=False))
        db.add(models.ActionItem(meeting_id=m3.id, task="Schedule developer deep-dive meeting with TechCorp engineers", completed=False))
        
        m3_dialogue = [
            ("John Doe (Sales)", 0, "Hi Alice, thanks for hopping on the call today. How are things at TechCorp?"),
            ("Alice Green (TechCorp)", 5, "Hi John, doing well! We are growing fast and looking to streamline our meetings data."),
            ("John Doe (Sales)", 10, "That's great to hear. I'd love to learn more about your current workflow."),
            ("Alice Green (TechCorp)", 15, "Currently we use generic recording tools, but parsing summaries and extracting action items is painful."),
            ("John Doe (Sales)", 20, "I see. Our platform solves exactly that. It generates summaries and tracks action items automatically."),
            ("Alice Green (TechCorp)", 25, "That sounds like exactly what we need. However, security is a major concern for us."),
            ("John Doe (Sales)", 30, "Absolutely. We are SOC2 Type II certified and encrypt all data at rest and in transit."),
            ("Alice Green (TechCorp)", 35, "What about Single Sign-On? We use Okta for identity management."),
            ("John Doe (Sales)", 40, "Yes, we support SAML-based SSO, including Okta, Azure AD, and Google Workspace."),
            ("Alice Green (TechCorp)", 45, "Excellent. And what about data residency? Our European team requires data to stay in the EU."),
            ("John Doe (Sales)", 50, "We offer EU-specific hosting options for our enterprise tier. All transcripts and audio will remain in Frankfurt."),
            ("Alice Green (TechCorp)", 55, "That is a hard requirement for our compliance team, so I am glad you support that."),
            ("John Doe (Sales)", 60, "Regarding seat count, how many licenses are you looking to start with?"),
            ("Alice Green (TechCorp)", 65, "We want to roll it out to our engineering and product teams first, which is about two hundred users."),
            ("John Doe (Sales)", 70, "Okay, that fits perfectly into our Enterprise tier. I can put together a custom volume discount."),
            ("Alice Green (TechCorp)", 75, "That would be very helpful. Can you send a draft proposal by tomorrow?"),
            ("John Doe (Sales)", 80, "Yes, I will send the pricing proposal and our security whitepaper in the morning."),
            ("Alice Green (TechCorp)", 85, "Also, our lead architect would like to review your API. Can we schedule a short sync?"),
            ("John Doe (Sales)", 90, "Of course. I'll coordinate with our sales engineer and send over a calendar invite."),
            ("Alice Green (TechCorp)", 95, "Great. We are looking to make a decision by the end of this month."),
            ("John Doe (Sales)", 100, "Excellent. We will make sure you have everything you need to make an informed choice."),
            ("Alice Green (TechCorp)", 105, "Perfect. Thank you, John. Talk to you soon.")
        ]
        for name, ts, text in m3_dialogue:
            db.add(models.TranscriptSegment(meeting_id=m3.id, speaker=name, timestamp=ts, content=text))

        # Meeting 4: AI Team Standup
        m4 = models.Meeting(
            title="AI Team Weekly Standup",
            date="2026-06-24",
            duration=120,
            summary="Weekly alignment on LLM fine-tuning and retrieval performance. The team reviewed baseline benchmarks. Latency has decreased by fifteen percent following prompt optimizations. The next priority is evaluating RAG retrieval precision and fine-tuning the embedding cache.",
            created_at=datetime.datetime(2026, 6, 24, 9, 30, 0)
        )
        db.add(m4)
        db.flush()
        
        for p in [("Dave Jones", "dave@company.com"), ("Sarah Smith", "sarah@company.com"), ("AI Subagent", "subagent@company.com")]:
            db.add(models.Participant(meeting_id=m4.id, name=p[0], email=p[1]))
            
        for t in ["LLM Benchmarks", "Latency Optimization", "RAG Performance", "GPU Clusters"]:
            db.add(models.Topic(meeting_id=m4.id, topic=t))
            
        db.add(models.ActionItem(meeting_id=m4.id, task="Deploy prompt v2.4 to production staging", completed=True))
        db.add(models.ActionItem(meeting_id=m4.id, task="Run retrieval test on 1000 golden datasets", completed=False))
        db.add(models.ActionItem(meeting_id=m4.id, task="Optimize embedding database cache layers", completed=False))
        
        m4_dialogue = [
            ("Dave Jones", 0, "Welcome to the weekly AI standup. Let's hear updates from everyone."),
            ("Sarah Smith", 5, "I completed the fine-tuning run on the custom prompt set. The results look promising."),
            ("AI Subagent", 10, "I analyzed the latency logs. Average response time dropped to two hundred milliseconds."),
            ("Dave Jones", 15, "That's a nice improvement. Sarah, what was the accuracy score on the test set?"),
            ("Sarah Smith", 20, "F1-score increased from eighty-four to eighty-eight percent on summarizing tasks."),
            ("Dave Jones", 25, "Awesome, that's exactly what we wanted. Did we encounter any hallucinations?"),
            ("Sarah Smith", 30, "Very few, mostly on numerical figures. I will adjust the system prompt instructions to handle numbers better."),
            ("AI Subagent", 35, "I recommend increasing the weight of the context section to bind figures to source text."),
            ("Dave Jones", 40, "Good suggestion. Let's try that next. What's the status of RAG retrieval, Dave?"),
            ("Dave Jones", 45, "We integrated the hybrid sparse-dense retriever. Precision is up, but latency is slightly higher."),
            ("Sarah Smith", 50, "Is the latency bottle-necked by vector search or the keyword matching?"),
            ("Dave Jones", 55, "It's the reranking model. Reranking takes about one hundred milliseconds of the budget."),
            ("AI Subagent", 60, "We could cache the top twenty results or use a lighter cross-encoder model."),
            ("Dave Jones", 65, "I will test a lighter model this afternoon and benchmark it against our validation suite."),
            ("Sarah Smith", 70, "Keep me updated on the performance. We need to deploy the finalized stack by Friday."),
            ("Dave Jones", 75, "Will do. What about GPU allocation? Are we hitting any limits?"),
            ("Sarah Smith", 80, "No, the new cluster nodes are handling the fine-tuning jobs comfortably."),
            ("AI Subagent", 85, "Cluster utilization is currently at sixty-two percent. Plenty of headroom left."),
            ("Dave Jones", 90, "Fantastic. Sounds like we are in a great position. Let's sync on Slack once the reranker tests are ready."),
            ("Sarah Smith", 95, "Will do, let's keep pushing!"),
            ("AI Subagent", 100, "Proceeding with monitoring configuration. Over and out."),
            ("Dave Jones", 105, "Thanks team. Talk to you later.")
        ]
        for name, ts, text in m4_dialogue:
            db.add(models.TranscriptSegment(meeting_id=m4.id, speaker=name, timestamp=ts, content=text))

        # Meeting 5: Design Review
        m5 = models.Meeting(
            title="Design Review - Dashboard & Aesthetics",
            date="2026-06-23",
            duration=120,
            summary="A comprehensive UI design review session. The team gave feedback on the sidebar navigation patterns, glassmorphism card styling, typography, and dark mode theme. John requested micro-animations on interactive hover states. The design team will update the Figma mockups and hand off to frontend developers by Tuesday.",
            created_at=datetime.datetime(2026, 6, 23, 15, 0, 0)
        )
        db.add(m5)
        db.flush()
        
        for p in [("John Doe", "john@company.com"), ("Sarah Smith", "sarah@company.com"), ("Dave Jones", "dave@company.com")]:
            db.add(models.Participant(meeting_id=m5.id, name=p[0], email=p[1]))
            
        for t in ["UI/UX Review", "Color Palette", "Dark Mode", "Figma Handoff"]:
            db.add(models.Topic(meeting_id=m5.id, topic=t))
            
        db.add(models.ActionItem(meeting_id=m5.id, task="Export revised UI components to assets folder", completed=True))
        db.add(models.ActionItem(meeting_id=m5.id, task="Update Figma styles with exact HSL Tailwind colors", completed=False))
        db.add(models.ActionItem(meeting_id=m5.id, task="Create interactive micro-animations spec sheet", completed=False))
        
        m5_dialogue = [
            ("Sarah Smith", 0, "Welcome to the Design Review! Today we are looking at the new Fireflies Clone dashboard layout."),
            ("John Doe", 5, "I had a chance to view the mockup. The sidebar feels much cleaner now."),
            ("Dave Jones", 10, "Yes, collapsing it by default on tablet screens was a great design decision."),
            ("Sarah Smith", 15, "Thanks Dave. We also adjusted the spacing on the main dashboard cards to increase information density."),
            ("John Doe", 20, "The card layout is good, but is the background contrast high enough in dark mode?"),
            ("Sarah Smith", 25, "We are using a custom slate gray background. The cards have a subtle glassmorphic outline to pop out."),
            ("Dave Jones", 30, "I really like the border outline. It gives it a premium, modern SaaS look."),
            ("John Doe", 35, "What font are we using? It looks very sharp."),
            ("Sarah Smith", 40, "We switched the default body font to Inter, and headings are using Outfit."),
            ("Dave Jones", 45, "Inter is highly readable for transcripts. Good choice."),
            ("John Doe", 50, "Can we add subtle micro-animations when hovering over the transcript timestamps?"),
            ("Sarah Smith", 55, "Definitely. A slight background shift and color change would make it feel responsive and alive."),
            ("Dave Jones", 60, "For the audio player, should it be fixed at the bottom or inline?"),
            ("Sarah Smith", 65, "We think keeping it floating at the bottom gives a better persistent playback experience."),
            ("John Doe", 70, "I agree. If the user scrolls down the transcript, they should still be able to pause/play."),
            ("Dave Jones", 75, "How do we represent highlights? Can the user choose different colors?"),
            ("Sarah Smith", 80, "Yes, we have four custom highlighter colors: yellow, blue, green, and pink."),
            ("John Doe", 85, "That's fantastic. Let's make sure comments display inline or in a side drawer."),
            ("Sarah Smith", 90, "They'll toggle inline beneath the transcript text segment to keep them contextual."),
            ("Dave Jones", 95, "Perfect. That is much more intuitive than a separate tab."),
            ("John Doe", 100, "Excellent work, Sarah. Let's get these mockups updated for dev handoff."),
            ("Sarah Smith", 105, "Thanks everyone. I will upload the Figma links to Slack today.")
        ]
        for name, ts, text in m5_dialogue:
            db.add(models.TranscriptSegment(meeting_id=m5.id, speaker=name, timestamp=ts, content=text))
            
        db.commit()
        print("Database seeded with 5 meetings successfully!")
        
    finally:
        db.close()

if __name__ == "__main__":
    generate_sample_wav()
    seed_db()
