# Memory Save Handoff Diagnostics

This document describes the diagnostic logging system for tracking memory save operations through the entire pipeline.

## Overview

Every memory save operation is tracked with a unique `handoff-{timestamp}` ID that flows through all stages. Each stage logs to the console with clear markers.

## Handoff Stages

### Connection Handoffs

#### ✅ CONNECTED
- **Where**: `src/pages/Index.tsx` - `onConnectCb`
- **When**: ElevenLabs voice agent establishes WebSocket connection
- **Log Format**: `🔌 CONNECTION HANDOFF: ✅ CONNECTED @ {timestamp}`
- **Data Logged**: 
  - Connection status
  - Retry count
- **Success Indicator**: Toast notification "Connected - Start speaking naturally"
- **Failure Point**: If this doesn't appear, check:
  - ElevenLabs API key configuration
  - WebSocket connection issues
  - Browser microphone permissions

#### 👋 DISCONNECTED
- **Where**: `src/pages/Index.tsx` - `onDisconnectCb`
- **When**: Voice agent session ends
- **Log Format**: `🔌 CONNECTION HANDOFF: 👋 DISCONNECTED @ {timestamp}`
- **Data Logged**:
  - Session duration
  - Retry count
- **Normal Behavior**: Session should last until user explicitly ends it

### Memory Save Handoffs

#### 1️⃣ RECEIVED
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: ElevenLabs voice agent calls the `save_memory` client tool
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: 1️⃣ RECEIVED @ {timestamp}`
- **Data Logged**: 
  - Source: ElevenLabs voice agent
  - Raw parameters from tool call
- **Success Indicator**: Parameters object logged
- **Failure Point**: If this doesn't appear, check:
  - Agent configuration has `save_memory` tool enabled
  - Tool definition matches client tool signature
  - Agent is triggering the tool correctly

#### 2️⃣ VALIDATED
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: After validating required fields (title, content)
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: 2️⃣ VALIDATED`
- **Data Logged**:
  - Title
  - Content length
- **Success Indicator**: Both title and content are present
- **Failure Point**: If this fails:
  - Returns error message to agent
  - Agent should ask user for missing fields

#### 3️⃣ DATE PARSED
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: After parsing memory_date parameter (if provided)
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: 3️⃣ DATE PARSED`
- **Data Logged**:
  - Input date string
  - Formatted date (YYYY-MM-DD)
- **Success Indicator**: Date successfully formatted or null
- **Supported Formats**:
  - YYYY-MM-DD (e.g., "2024-12-01")
  - YYYY-MM (e.g., "2024-12")
  - YYYY (e.g., "2024")
  - Natural language (parsed via Date constructor)
  - Year extraction (e.g., "born in 1983")
- **Failure Point**: If date parsing fails, memory is saved without date (won't appear on timeline)

#### 4️⃣ SUBMITTING TO DATABASE
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: Before Supabase insert operation
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: 4️⃣ SUBMITTING TO DATABASE`
- **Data Logged**:
  - User ID
  - Title
  - Has date flag
- **Success Indicator**: Data prepared for insert
- **Failure Point**: Check user authentication status

#### 5️⃣ DATABASE COMMITTED
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: After successful Supabase insert
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: 5️⃣ DATABASE COMMITTED`
- **Data Logged**:
  - Memory ID (UUID)
  - Title
- **Success Indicator**: Memory ID returned from database
- **Failure Point**: If this fails, check:
  - Database connection
  - RLS policies
  - Database schema matches insert data
  - Check Postgres logs for constraint violations

#### 6️⃣ SHOWING USER FEEDBACK
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: Before displaying toast notification
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: 6️⃣ SHOWING USER FEEDBACK`
- **Data Logged**:
  - Memory ID
  - Memory title
- **Success Indicator**: Toast appears with "Memory saved" message
- **Failure Point**: Check toast system configuration

#### 7️⃣ SCHEDULING NAVIGATION
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: Before setTimeout for navigation
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: 7️⃣ SCHEDULING NAVIGATION`
- **Data Logged**:
  - Target: /timeline
  - Memory ID
  - Delay: 2000ms
- **Success Indicator**: Navigation scheduled
- **Failure Point**: Verify setTimeout is not blocked

#### 8️⃣ EXECUTING NAVIGATION
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool` (inside setTimeout)
- **When**: After 2-second delay
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: 8️⃣ EXECUTING NAVIGATION`
- **Data Logged**:
  - Full URL with query parameters
- **Success Indicator**: window.location.href changes
- **Failure Point**: Check browser navigation permissions

#### ✅ HANDOFF COMPLETE (Client Side)
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: Before returning response to agent
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: ✅ HANDOFF COMPLETE`
- **Data Logged**:
  - Status: success
  - Agent response message
- **Success Indicator**: Agent receives confirmation message
- **Failure Point**: Agent should confirm receipt in conversation

### Timeline Handoffs

#### 9️⃣ TIMELINE RECEIVED
- **Where**: `src/pages/Timeline.tsx` - URL params useEffect
- **When**: Timeline component mounts and reads URL parameters
- **Log Format**: `🔄 [timeline-{timestamp}] HANDOFF: 9️⃣ TIMELINE RECEIVED @ {timestamp}`
- **Data Logged**:
  - Memory ID from URL
  - Animate flag
  - Summary text
- **Success Indicator**: URL parameters detected
- **Failure Point**: If this doesn't appear:
  - Check navigation completed successfully
  - Verify URL parameters are present
  - Check Timeline component mounted

#### 🔟 EXPANDING YEAR
- **Where**: `src/pages/Timeline.tsx` - URL params useEffect
- **When**: Current year section is expanded to show new memory
- **Log Format**: `🔄 [timeline-{timestamp}] HANDOFF: 🔟 EXPANDING YEAR`
- **Data Logged**:
  - Year being expanded
- **Success Indicator**: Current year's memories become visible
- **Failure Point**: Check expandedYears state management

#### 1️⃣1️⃣ STARTING ANIMATION
- **Where**: `src/pages/Timeline.tsx` - URL params useEffect (inside setTimeout)
- **When**: After 100ms delay, animation begins
- **Log Format**: `🔄 [timeline-{timestamp}] HANDOFF: 1️⃣1️⃣ STARTING ANIMATION`
- **Data Logged**:
  - Memory ID being animated
- **Success Indicator**: Memory card starts glowing/scaling
- **Failure Point**: Check CSS animation classes

#### 1️⃣2️⃣ BANNER DISPLAYED
- **Where**: `src/pages/Timeline.tsx` - URL params useEffect
- **When**: Floating banner with memory summary appears
- **Log Format**: `🔄 [timeline-{timestamp}] HANDOFF: 1️⃣2️⃣ BANNER DISPLAYED`
- **Data Logged**:
  - Banner text content
- **Success Indicator**: "✨ {memory title}" appears on screen
- **Failure Point**: Check DOM manipulation and z-index

#### 1️⃣3️⃣ ANIMATION COMPLETE
- **Where**: `src/pages/Timeline.tsx` - URL params useEffect (inside nested setTimeout)
- **When**: After 3-second animation completes
- **Log Format**: `🔄 [timeline-{timestamp}] HANDOFF: 1️⃣3️⃣ ANIMATION COMPLETE`
- **Data Logged**:
  - Memory ID
  - Duration: 3000ms
- **Success Indicator**: Banner removed from DOM
- **Failure Point**: Check timeout executed

#### ✅ TIMELINE HANDOFF COMPLETE
- **Where**: `src/pages/Timeline.tsx` - URL params useEffect
- **When**: After cleaning up animation state
- **Log Format**: `🔄 [timeline-{timestamp}] HANDOFF: ✅ TIMELINE HANDOFF COMPLETE`
- **Data Logged**:
  - Status: Memory successfully materialized on timeline
- **Success Indicator**: Memory visible on timeline, animation ended
- **Failure Point**: This is the final stage - if reached, full pipeline succeeded

## Error Handoffs

### ❌ VALIDATION FAILED
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: Required fields missing
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: ❌ VALIDATION FAILED`
- **Data Logged**:
  - Title presence
  - Content presence
- **Recovery**: Agent should ask user for missing information

### ❌ DATABASE ERROR
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool`
- **When**: Supabase insert fails
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: ❌ DATABASE ERROR`
- **Data Logged**:
  - Error message
  - Error code
- **Recovery**: Check database logs, RLS policies, schema

### ❌ HANDOFF FAILED
- **Where**: `src/pages/Index.tsx` - `saveMemoryTool` (catch block)
- **When**: Any unexpected error occurs
- **Log Format**: `🔄 [{handoff-id}] HANDOFF: ❌ HANDOFF FAILED`
- **Data Logged**:
  - Error message
  - Stack trace
- **Recovery**: User sees error toast, agent receives error message

## How to Use These Diagnostics

### During Development
1. Open browser console (F12)
2. Filter by "HANDOFF" to see only handoff logs
3. Follow the numbered stages to track progress
4. Note which stage is the last one to appear before failure

### Production Debugging
1. Instruct user to open console
2. Ask them to trigger the save memory flow
3. Request screenshot of console logs
4. Identify which handoff stage failed
5. Refer to corresponding failure point section

### Example Full Flow (Success)
```
🔌 CONNECTION HANDOFF: ✅ CONNECTED @ 2025-10-13T20:45:00.123Z
🔄 [handoff-1234567890] HANDOFF: 1️⃣ RECEIVED @ 2025-10-13T20:45:10.123Z
🔄 [handoff-1234567890] HANDOFF: 2️⃣ VALIDATED
🔄 [handoff-1234567890] HANDOFF: 3️⃣ DATE PARSED
🔄 [handoff-1234567890] HANDOFF: 4️⃣ SUBMITTING TO DATABASE
🔄 [handoff-1234567890] HANDOFF: 5️⃣ DATABASE COMMITTED
🔄 [handoff-1234567890] HANDOFF: 6️⃣ SHOWING USER FEEDBACK
🔄 [handoff-1234567890] HANDOFF: 7️⃣ SCHEDULING NAVIGATION
🔄 [handoff-1234567890] HANDOFF: ✅ HANDOFF COMPLETE
🔄 [handoff-1234567890] HANDOFF: 8️⃣ EXECUTING NAVIGATION
🔄 [timeline-1234567899] HANDOFF: 9️⃣ TIMELINE RECEIVED @ 2025-10-13T20:45:12.234Z
🔄 [timeline-1234567899] HANDOFF: 🔟 EXPANDING YEAR
🔄 [timeline-1234567899] HANDOFF: 1️⃣1️⃣ STARTING ANIMATION
🔄 [timeline-1234567899] HANDOFF: 1️⃣2️⃣ BANNER DISPLAYED
🔄 [timeline-1234567899] HANDOFF: 1️⃣3️⃣ ANIMATION COMPLETE
🔄 [timeline-1234567899] HANDOFF: ✅ TIMELINE HANDOFF COMPLETE
```

### Example Partial Flow (Database Error)
```
🔌 CONNECTION HANDOFF: ✅ CONNECTED @ 2025-10-13T20:45:00.123Z
🔄 [handoff-1234567890] HANDOFF: 1️⃣ RECEIVED @ 2025-10-13T20:45:10.123Z
🔄 [handoff-1234567890] HANDOFF: 2️⃣ VALIDATED
🔄 [handoff-1234567890] HANDOFF: 3️⃣ DATE PARSED
🔄 [handoff-1234567890] HANDOFF: 4️⃣ SUBMITTING TO DATABASE
🔄 [handoff-1234567890] HANDOFF: ❌ DATABASE ERROR { error: "invalid input syntax for type date", code: "22007" }
🔄 [handoff-1234567890] HANDOFF: ❌ HANDOFF FAILED
```

In this case, the failure happened at stage 5 (database commit), indicating a date format issue.

## Testing Checklist

To verify all handoff points are working:

- [ ] Connection establishes (✅ CONNECTED)
- [ ] Voice agent triggers save_memory tool (1️⃣ RECEIVED)
- [ ] Required fields validated (2️⃣ VALIDATED)
- [ ] Date parsed if provided (3️⃣ DATE PARSED)
- [ ] Database insert prepared (4️⃣ SUBMITTING)
- [ ] Database confirms save (5️⃣ DATABASE COMMITTED)
- [ ] Toast notification shown (6️⃣ SHOWING USER FEEDBACK)
- [ ] Navigation scheduled (7️⃣ SCHEDULING NAVIGATION)
- [ ] Navigation executes (8️⃣ EXECUTING NAVIGATION)
- [ ] Tool returns confirmation (✅ HANDOFF COMPLETE)
- [ ] Timeline receives parameters (9️⃣ TIMELINE RECEIVED)
- [ ] Current year expands (🔟 EXPANDING YEAR)
- [ ] Animation starts (1️⃣1️⃣ STARTING ANIMATION)
- [ ] Banner displays (1️⃣2️⃣ BANNER DISPLAYED)
- [ ] Animation completes (1️⃣3️⃣ ANIMATION COMPLETE)
- [ ] Memory visible on timeline (✅ TIMELINE HANDOFF COMPLETE)
- [ ] Connection ends gracefully (👋 DISCONNECTED)

## Related Files

- `src/pages/Index.tsx` - Voice agent connection and save_memory tool
- `src/pages/Timeline.tsx` - Timeline materialization and animation
- `HANDOFF_DIAGNOSTICS.md` - This documentation
