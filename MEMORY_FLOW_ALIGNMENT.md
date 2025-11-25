# Memory Flow Comparison & Alignment

## Current Flows

### Web App Flow (Index.tsx / Solin Voice Page)
1. User talks to Solin via ElevenLabs voice agent
2. Conversation happens naturally - no interruptions
3. Full conversation audio is recorded (`conversationRecording.ts`)
4. **Memory creation happens through Solin's tools during conversation**:
   - Solin can call `create_memory` tool function
   - Creates memory directly in database
   - No explicit "Do you want to save?" question
   - Memory is created automatically when Solin determines something is worth saving
5. After conversation ends, no save dialog (SaveMemoryDialog appears to be unused)
6. Voice recording is saved with `memory_ids` linking to created memories

### WhatsApp Flow (whatsapp-webhook)
1. User shares story via WhatsApp text
2. Solin asks 2-3 follow-up questions
3. Solin explicitly asks: **"Want me to save this memory?"**
4. User must respond with confirmation keywords (yes, sure, ok, etc.)
5. Only after confirmation:
   - Memory is created with title "Processing memory..."
   - Background task (`process-memory-insights`) extracts details
   - Memory is updated with proper title, date, location
6. Then asks about photos/videos

## Key Differences

| Aspect | Web App | WhatsApp |
|--------|---------|----------|
| **Save Trigger** | Automatic (Solin's decision) | Manual (user confirmation required) |
| **Conversation** | Continuous, uninterrupted | Interrupted by save question |
| **Audio Recording** | Full conversation recorded | No audio recording |
| **Memory Creation** | During conversation (tool call) | After explicit confirmation |
| **User Experience** | Seamless, natural | Explicit, confirmatory |
| **Incomplete Memories** | Not handled | Not handled |

## Problems with Current WhatsApp Flow

1. **Requires explicit confirmation** - User must say "yes" or memory is lost
2. **Breaks conversation flow** - Asking "want to save?" interrupts natural dialogue
3. **Single point of failure** - If user doesn't confirm, entire discussion is lost
4. **Doesn't match web experience** - Inconsistent UX across platforms

## Proposed Aligned Flow

### Auto-Save with Incomplete Memory Status

**1. During Conversation (Both Web & WhatsApp):**
- As user shares stories, automatically create **incomplete memories**
- Mark with `status: 'incomplete'` or `show_on_timeline: false`
- Store conversation snippets as they happen
- No interruption to conversation flow

**2. Memory States:**
```typescript
interface MemoryStatus {
  incomplete: {
    // Auto-saved during conversation
    // Missing: date, location, or confirmation
    // Visible in "Drafts" section
    show_on_timeline: false
    tags: ['incomplete', 'needs_review']
  }
  
  complete: {
    // User confirmed or provided all details
    // Processed by AI for insights
    show_on_timeline: true
    tags: [extracted tags]
  }
}
```

**3. Web App Changes:**
- Continue current auto-save behavior
- Add "Drafts" section in Archive page
- Show incomplete memories for user to review/complete

**4. WhatsApp Changes:**
- **Remove "Want me to save this memory?" question**
- Auto-save conversations as incomplete memories
- After discussion, say: "Got it! I've noted this memory. You can add more details later on the web app."
- Still ask about photos/videos
- If user provides date/location during conversation, mark as complete

**5. Completion Flow:**
- User can complete memories through:
  - Web app "Drafts" section
  - Continuing WhatsApp conversation later
  - Timeline edit feature
  
## Implementation Changes

### Database Schema Addition
```sql
ALTER TABLE memories 
ADD COLUMN status text DEFAULT 'complete',
ADD COLUMN needs_review boolean DEFAULT false;

-- Index for incomplete memories
CREATE INDEX idx_memories_incomplete 
ON memories(user_id, status) 
WHERE status = 'incomplete';
```

### WhatsApp Webhook Changes
1. Remove explicit save confirmation logic
2. Auto-create incomplete memories after 2-3 exchanges
3. Update prompt to not ask "want to save?"
4. Still gather date/location naturally through conversation
5. Mark as complete if date+location provided

### Web App Changes
1. Add "Drafts" tab in Archive page
2. Show incomplete memories with edit option
3. Allow users to complete/delete drafts
4. Timeline only shows complete memories

## Benefits

1. **Never lose memories** - Everything auto-saved
2. **Consistent UX** - Same flow across web and WhatsApp
3. **Natural conversations** - No interruption for confirmations
4. **User control** - Can review/complete later
5. **Fail-safe** - Even if user forgets to confirm, memory is preserved
