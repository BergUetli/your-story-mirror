# You, Remembered 🌟

A comprehensive digital memory preservation platform that helps users capture, preserve, and relive their life stories through AI-powered voice conversations with Solin, an empathetic AI companion.

## 🎯 Overview

**You, Remembered** enables users to:
- 🎙️ **Record conversations** with Solin through natural voice interactions (ElevenLabs AI agent)
- 📚 **Archive & playback** complete voice recordings with searchable transcripts
- 🔍 **Search memories** intelligently with AI-powered semantic understanding
- 📖 **Generate voice recordings** from existing text memories using conversation styles
- 📊 **Diagnostic tools** for comprehensive system monitoring and troubleshooting
- 🗂️ **Organize timeline** with complete vs incomplete memory filtering
- 🎭 **Multiple conversation styles** (reflection, interview, storytelling, discussion)
- 🔐 **Control access** to different memories (private, family, friends)

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast dev server and builds
- **Tailwind CSS** + **shadcn/ui** for beautiful, accessible components
- **React Router** for navigation
- **React Hook Form + Zod** for form validation

### Backend (Supabase)
- **PostgreSQL** database with Row Level Security (RLS)
- **Edge Functions** (Deno) for serverless logic
- **Supabase Auth** for user authentication

### AI & Voice
- **ElevenLabs Conversational AI** for real-time voice interaction with Solon
- **OpenAI GPT-4.1** (via Orchestrator agent) for intelligent memory operations
- **Client-side tools** for instant memory retrieval during conversation

### Key Components

```
src/
├── components/
│   ├── AnimatedOrb.tsx              # Visual feedback for Solin's state
│   ├── ModernVoiceAgent.tsx         # Primary conversation interface
│   ├── AudioPlayer.tsx              # Voice recording playback with transcript sync
│   ├── MicrophoneTest.tsx           # Advanced microphone diagnostics
│   ├── MemoryArchive.tsx            # Archive display for text memories
│   └── admin/
│       ├── VoiceArchiveDiagnosticsPanel.tsx    # Comprehensive diagnostics
│       ├── MemoryRecordingManager.tsx          # Bulk voice generation
│       └── VoiceRecordingTester.tsx            # Recording system tests
├── pages/
│   ├── Index.tsx                    # Main conversation interface (/sanctuary)
│   ├── Timeline.tsx                 # Complete/incomplete memory timeline
│   ├── Archive.tsx                  # Voice recordings + memory archive
│   ├── Admin.tsx                    # System diagnostics and management
│   └── TestMemoryRecordings.tsx     # Memory recording generator testing
├── services/
│   ├── conversationRecording.ts     # Standard voice recording
│   ├── enhancedConversationRecording.ts  # Enhanced recording with system audio
│   ├── memoryRecordingGenerator.ts  # Generate recordings from text memories
│   ├── aiVoiceSearch.ts            # AI-powered voice search & archive
│   ├── diagnosticLogger.ts         # System monitoring and validation
│   ├── voiceService.ts             # Text-to-speech service
│   └── memoryService.ts            # Memory operations
├── hooks/
│   ├── useMemories.ts              # Memory data fetching
│   └── useSpeechRecognition.ts     # Speech-to-text
└── contexts/
    └── AuthContext.tsx             # Authentication state

supabase/
├── functions/
│   ├── elevenlabs-agent-token/   # Generate ElevenLabs signed URLs
│   └── orchestrator/             # Backend AI orchestration
└── config.toml                   # Supabase configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Supabase account
- ElevenLabs account (for voice agent)
- OpenAI API key (for orchestrator)

### Installation

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd you-remembered
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Environment Setup**

Create a `.env` file (Lovable handles this automatically when connected):
```env
# Supabase (auto-configured in Lovable)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# These are set in Supabase Edge Function secrets:
# ELEVENLABS_API_KEY
# OPENAI_API_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

4. **Database Setup**

The database schema includes:
- `memories` table - stores user memories with RLS policies
- `users` table - extended user profiles
- Indexes on `user_id`, `created_at`, `tags`, and full-text search

Run migrations through Lovable's migration tool or Supabase dashboard.

5. **Configure Secrets in Supabase**

Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Edge Functions → Secrets:
- `ELEVENLABS_API_KEY` - Your ElevenLabs API key
- `OPENAI_API_KEY` - Your OpenAI API key

6. **Start Development**
```bash
npm run dev
# or
bun dev
```

Visit `http://localhost:8080`

## 🎙️ Voice Recording & Archive System

### Archive Features
- **Complete Voice Archive** at `/archive` with dual-tab interface:
  - 🎵 **Voice Recordings**: Playback with synchronized transcript highlighting
  - 📚 **Memory Archive**: Text memories with filtering (complete vs incomplete)
- **Intelligent Search**: AI-powered semantic search across recordings and transcripts
- **Audio Player**: Advanced playback controls with transcript synchronization
- **Memory Linking**: Voice recordings automatically linked to related memories
- **Demo Mode**: Graceful fallback to demo recordings for unauthenticated users

### Voice Recording Modes
#### Standard Recording (`conversationRecording.ts`)
- **Microphone-only capture** with high-quality audio (48kHz, Opus compression)
- **Conversation transcripts** with timestamp synchronization
- **Automatic saving** to Supabase storage with metadata
- **Compatible** with all browsers and devices

#### Enhanced Recording (`enhancedConversationRecording.ts`) 
- **Dual audio capture**: User microphone + system audio (ElevenLabs responses)
- **Complete conversations** captured when screen sharing enabled
- **Separate gain controls** for microphone and system audio
- **Quality monitoring** with real-time signal analysis
- **Fallback support** to standard mode when system audio unavailable

### Memory Recording Generator
**Generate voice recordings from existing text memories** - addresses user request for recorded conversations of stored memories.

**Core Features:**
- 🔍 **Memory Detection**: Scans database for text memories without recordings
- 🎭 **Conversation Styles**: 
  - **Reflection**: Personal introspective format ("I've been reflecting on...")
  - **Interview**: Q&A style conversation between interviewer and speaker
  - **Storytelling**: Narrative presentation format ("Let me tell you a story...")
  - **Discussion**: Two-person dialogue about the memory
- 🔗 **Auto-Linking**: Generated recordings linked to original memories
- 📊 **Bulk Generation**: Process multiple memories with progress tracking
- 🎛️ **Customization**: Voice model selection, metadata inclusion options

**Access Points:**
- `/test-memory-recordings` - Full interface and testing
- `/admin` → 'Recording Generator' tab - Integrated with diagnostics
- Built into existing admin panel for system management

### Microphone Testing & Diagnostics
#### Advanced Microphone Test (`/mic-test`)
- **Real-time volume visualization** with 30-second quality assessment
- **Quality scoring system** with automatic recommendations
- **Troubleshooting guides** for common microphone issues
- **Browser compatibility testing** across Chrome, Firefox, Safari
- **Audio context validation** with proper user gesture handling

#### Comprehensive Diagnostics (`/admin`)
- **System Health Monitoring**: Database, recording services, archive display
- **Real-time Event Logging**: Categorized diagnostic events with business-friendly messages
- **Validation Testing**: Complete voice archiving system validation
- **Performance Metrics**: Recording counts, memory statistics, error tracking
- **Export Capabilities**: Diagnostic data export for troubleshooting

## 🎤 Voice Agent Architecture

### ElevenLabs Integration (Primary Conversation Handler)
- **Real-time bidirectional audio** via WebSocket
- **Signed URLs** generated securely via backend edge function (`elevenlabs-agent-token`)
- **Client-side tools** for instant memory operations during conversation:
  - `save_memory` - Save new memories as user shares stories (instant, no latency)
  - `retrieve_memory` - Search and retrieve memories in real-time (instant, no latency)
  
**Why client-side tools?** They execute locally without backend round-trips, ensuring natural conversation flow with zero added latency.

### Memory Context
- Recent memories (top 5) are injected into Solon's prompt at session start
- Context is kept compact (~1000 chars) to prevent timeout issues
- Database indexes ensure fast retrieval (<50ms)
- **Instant retrieval**: As soon as a specific memory is referenced, the client tool triggers immediately (no need to wait for user to finish speaking)

### Orchestrator Agent (Backend) - Async Operations Only
For complex operations that don't require instant response:
- **Tool calling** via OpenAI GPT-4.1
- **When to use**: Background tasks, complex summarization, batch operations
- **When NOT to use**: Real-time conversation (adds 500-1500ms latency)
- Operations:
  - `retrieve_memories` - Advanced memory search with filters
  - `save_memory` - Structured memory storage with validation
  - `summarize_memories` - Generate memory summaries and insights

**Decision**: Keep ElevenLabs handling all conversation directly via client tools. Only use Orchestrator for non-conversational tasks like dashboard summaries or batch operations.

## 📊 Database Schema

### memories
```sql
- id (uuid, primary key)
- user_id (uuid, indexed)
- title (text)
- text (text)
- memory_date (date, nullable) - User-provided date (YYYY-MM-DD, YYYY-MM, or YYYY)
- memory_location (text, nullable) - Where the memory took place
- tags (text[], GIN indexed)
- recipient (text, nullable)
- image_urls (text[], nullable) - Array of storage paths for memory images
- chunk_sequence (integer, default 1) - For memory chunking system
- is_primary_chunk (boolean, default true) - Primary chunk identifier
- source_type (text, default 'manual') - Origin: manual, conversation_auto_save, etc.
- created_at (timestamp, indexed)
- updated_at (timestamp)
```

### voice_recordings
```sql
- id (uuid, primary key)
- user_id (uuid, indexed) - References auth.users(id)
- session_id (text) - Recording session identifier
- recording_type (text) - Type: conversation, memory_recreation, etc.
- storage_path (text) - Supabase storage path to audio file
- file_url (text, nullable) - Alternative URL storage (compatibility)
- duration_seconds (numeric) - Audio duration
- file_size_bytes (bigint) - File size
- transcript_text (text) - Complete conversation transcript
- conversation_summary (text) - AI-generated summary
- memory_ids (text[], nullable) - Linked memory IDs
- memory_titles (text[], nullable) - Linked memory titles (for display)
- topics (text[], nullable) - Extracted conversation topics
- session_mode (text) - Mode: elevenlabs_conversation, memory_recreation, etc.
- mime_type (text, default 'audio/webm')
- compression_type (text, default 'opus')
- sample_rate (integer, default 48000)
- bit_rate (integer, default 64000)
- created_at (timestamp, indexed)
- updated_at (timestamp)
```

### diagnostic_logs
```sql
- id (uuid, primary key)
- user_id (uuid, nullable) - Optional user context
- category (text) - Event category: voice_recording, memory_saving, etc.
- level (text) - Severity: info, warn, error
- event (text) - Event name/identifier  
- details (jsonb) - Event-specific data
- timestamp (timestamp, indexed)
```

**Date Handling:**
- Users can provide dates in multiple formats:
  - Specific date: `YYYY-MM-DD` (e.g., "2024-06-15")
  - Month only: `YYYY-MM` (e.g., "2024-06")
  - Year only: `YYYY` (e.g., "2024")
- If no date is provided, the memory is stored in the database but won't appear on the timeline
- Memories without valid dates can still be searched and retrieved via other methods

**Indexes for performance:**
- `idx_memories_user_id` - Fast user-specific queries
- `idx_memories_created_at` - Timeline ordering
- `idx_memories_user_created` - Composite index for common queries
- `idx_memories_tags` - GIN index for tag search
- `idx_memories_text_search` - Full-text search index

### users
```sql
- id (uuid, primary key)
- user_id (uuid, indexed)
- name (text)
- email (text)
- age (integer)
- birth_date (text) - Required for timeline (YYYY-MM-DD format)
- birth_place (text) - Required, shown on timeline with birth event
- current_location (text)
- onboarding_completed (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

**Timeline Display:**
- Birth date and birth place are always shown as the first event on the timeline
- Current date is always shown as the last marker with a "Today" badge
- Each memory on the timeline displays its date and location (if provided)
- Demo user has pre-populated data (born December 1, 1980 in San Francisco, CA)

All tables have RLS policies ensuring users can only access their own data.

## 🔐 Security

- **Row Level Security (RLS)** enabled on all tables
- **JWT verification** on protected edge functions (disabled for public functions)
- **Signed URLs** for ElevenLabs agent access (time-limited, secure)
- **Service role key** never exposed to client
- **API keys** stored as Supabase secrets, never in code

## 🧪 Testing

### Test Individual Components
```bash
# Start dev server
npm run dev
# Navigate to specific routes to test functionality:
# /sanctuary - Main conversation interface with Solin
# /timeline - Memory timeline with complete/incomplete filtering
# /archive - Voice recordings + memory archive with search
# /admin - Comprehensive diagnostics and system management
# /mic-test - Advanced microphone testing and diagnostics
# /test-memory-recordings - Memory recording generator interface
```

### Test Voice Recording System
#### Standard Voice Recording
1. **Start Conversation**: Visit `/sanctuary` → Click "Start Conversation"
2. **Permission Check**: Allow microphone access when prompted
3. **Recording Test**: Speak naturally → Verify Solin responds  
4. **Archive Check**: Visit `/archive` → Verify recording appears with transcript
5. **Playback Test**: Click recording → Verify audio plays with transcript sync

#### Enhanced Recording (Advanced)
1. **Enable Enhanced Mode**: In conversation settings, select "Enhanced Recording"
2. **Screen Share**: Accept screen sharing prompt for system audio capture
3. **Complete Conversation**: Recording captures both user voice AND Solin's responses
4. **Quality Check**: Verify both audio streams in final recording

#### Memory Recording Generator
1. **Access Interface**: Visit `/test-memory-recordings` or `/admin` → Recording Generator
2. **View Existing Memories**: Check database scan results and memory counts
3. **Configure Options**: Select conversation style (Reflection/Interview/etc.)
4. **Generate Test**: Click "Generate" for single memory or bulk generation
5. **Verify Results**: Check `/archive` for newly generated conversation recordings

### Test Diagnostic System
1. **System Validation**: Visit `/admin` → Run full system validation
2. **Monitor Events**: Check real-time diagnostic event logging
3. **Performance Metrics**: Review recording counts, memory statistics
4. **Export Data**: Test diagnostic data export functionality

### Test Edge Functions
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu/functions)
2. Select function (elevenlabs-agent-token or orchestrator)
3. View Logs tab for real-time debugging

### Test Memory Operations
1. Start a conversation with Solon
2. Share a story - verify `save_memory` is called (check console)
3. Ask about a memory - verify `retrieve_memory` is called
4. Navigate to Dashboard → Memories to verify storage
5. Check database directly in Supabase Dashboard → Table Editor

### Test Voice Agent
1. Click "Start" on landing page
2. Allow microphone access
3. Speak naturally - verify Solon responds
4. Check console logs for connection status
5. Verify session stays active (should not disconnect)

## 🤝 Contributing

### Workflow
1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make changes** in Lovable editor or locally
3. **Test thoroughly** - functionality must work exactly as before
4. **Commit and push**
```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

5. **Create Pull Request** on GitHub

### Code Guidelines
- **TypeScript** for type safety (no `any` unless absolutely necessary)
- **Component patterns**: Keep components focused and reusable
- **Design system**: Use Tailwind semantic tokens from `index.css` (never hardcode colors like `text-white`, `bg-black`)
- **Logging**: Add console logs for debugging complex flows
- **Function size**: Keep functions small (< 50 lines ideally)
- **Error handling**: Always handle errors gracefully with user-friendly messages

### Modular Architecture Principles
- **Services** handle API calls and business logic (thin layer over Supabase/APIs)
- **Hooks** manage state and side effects (React-specific logic)
- **Components** focus on presentation (minimal logic, props-driven)
- **Edge Functions** handle backend operations (secure, server-side only)
- **Separation of concerns**: Each file has one clear responsibility

**Example**: To add a new memory feature:
1. Add database migration (if schema changes)
2. Create service method in `memoryService.ts`
3. Create hook in `hooks/` if state management needed
4. Create/update component for UI
5. Test independently before integrating

## 🐛 Debugging

### Handoff Diagnostics

Every memory save operation is tracked with unique handoff IDs. See [HANDOFF_DIAGNOSTICS.md](./HANDOFF_DIAGNOSTICS.md) for:
- Complete handoff stage documentation
- Console log format and filtering
- Failure point identification
- Testing checklist

**Quick Debug**: Open browser console and filter by "HANDOFF" to track memory save operations through all 13+ stages.

### Voice Agent & Recording Issues

**Session disconnects quickly:**
1. Check browser console for WebSocket errors
2. View [ElevenLabs token logs](https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu/functions/elevenlabs-agent-token/logs)
3. Verify microphone permissions granted
4. Check that signed URL generation succeeds
5. Verify memory context size is < 1500 chars
6. Check if timeout is being triggered (look for "Connection timed out")

**AudioContext warnings ('AudioContext was not allowed to start'):**
1. ✅ **Fixed**: AudioContext creation now properly deferred until user gesture
2. If issues persist: Check console for any remaining premature AudioContext creation
3. Verify soundEffects service waits for user interaction before initialization

**Microphone not working:**
1. **Use diagnostic tools**: Visit `/mic-test` for comprehensive testing
2. Check browser permissions (Settings → Privacy → Microphone)
3. Test different browsers (Chrome recommended for best compatibility)
4. Check console for getUserMedia errors
5. Verify AudioContext state and initialization

**Voice recordings not appearing in Archive:**
1. **Check authentication**: User must be logged in to see personal recordings
2. **Verify database**: Check `voice_recordings` table in Supabase dashboard
3. **Test recording system**: Use `/admin` diagnostics to validate recording pipeline
4. **Check RLS policies**: Ensure user can access their own recordings
5. **Demo mode**: Unauthenticated users see demo recordings only

**Archive loading issues:**
1. **Database table missing**: Archive requires `voice_recordings` table - run migrations
2. **Permission errors**: Check RLS policies on voice_recordings table
3. **Storage access**: Verify Supabase storage bucket permissions
4. **Network issues**: Check console for storage download failures

**Memory recording generator not working:**
1. **Check existing memories**: Generator needs text memories in database to work
2. **Authentication required**: Feature requires logged-in user with stored memories
3. **TTS integration**: Currently uses mock generation (ready for real TTS integration)
4. **Database schema**: Verify memories table has required columns (is_primary_chunk, source_type)

### Memory Operations

**Memories not saving:**
1. Check [Orchestrator logs](https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu/functions/orchestrator/logs)
2. Verify user is authenticated (`user_id` present in session)
3. Check RLS policies in Supabase Dashboard
4. View PostgreSQL logs for SQL errors
5. Verify `save_memory` tool is being called (console logs)

**Memories not retrieving:**
1. Check if query is being passed correctly
2. Verify RLS policies allow SELECT
3. Check indexes are working (query should be fast)
4. View database directly in Table Editor

**Search not working:**
1. Verify full-text search index exists
2. Check query syntax (should use `ilike` for simple search)
3. Test query directly in SQL editor

### Common Issues

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Session disconnects after 2-3s | Memory context too large | Reduce to top 5, max 1000 chars |
| Slow memory retrieval | Missing indexes | Run database migration to add indexes |
| Voice not working | Microphone permissions | Check browser settings |
| Memories not saving | RLS policy blocking | Verify user_id matches auth.uid() |
| Timeout on connection | Large prompt payload | Reduce memory context size |

## 📦 Deployment

### Via Lovable (Recommended)
1. Open [Lovable Project](https://lovable.dev/projects/56c95d06-14f4-48fa-8ee1-49ba89c5b2d8)
2. Click **Share → Publish**
3. App deploys to `your-project.lovable.app`
4. Configure custom domain: Project > Settings > Domains

### Self-Hosting
1. **Build the project:**
```bash
npm run build
```

2. **Deploy `dist/` folder** to hosting provider:
   - Vercel
   - Netlify
   - Cloudflare Pages
   - AWS S3 + CloudFront

3. **Set environment variables** in hosting dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

4. **Deploy Supabase Edge Functions** separately:
   - Functions auto-deploy from Lovable
   - Or use Supabase CLI for manual deployment

## 🔗 Key Links

- **Lovable Project**: [https://lovable.dev/projects/56c95d06-14f4-48fa-8ee1-49ba89c5b2d8](https://lovable.dev/projects/56c95d06-14f4-48fa-8ee1-49ba89c5b2d8)
- **Supabase Dashboard**: [https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu](https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu)
- **Edge Functions**: [https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu/functions](https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu/functions)
- **ElevenLabs Dashboard**: [https://elevenlabs.io/app/conversational-ai](https://elevenlabs.io/app/conversational-ai)

## 📝 Environment Variables

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://gulydhhzwlltkxbfnclu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Edge Functions (Supabase Dashboard → Secrets)
```env
ELEVENLABS_API_KEY=sk_...        # ElevenLabs API key
OPENAI_API_KEY=sk-...             # OpenAI API key
SUPABASE_URL=...                  # Auto-provided by Supabase
SUPABASE_SERVICE_ROLE_KEY=...     # Auto-provided by Supabase
SUPABASE_ANON_KEY=...             # Auto-provided by Supabase
```

## 🎨 Design System

Uses semantic color tokens defined in `src/index.css`:
- `--primary` - Main brand color (blue)
- `--secondary` - Secondary actions
- `--accent` - Highlights and CTAs
- `--background` - Page backgrounds
- `--foreground` - Text colors
- `--muted` - Subtle elements
- `--muted-foreground` - Secondary text

**Critical Design Rules:**
1. **Never hardcode colors**: ❌ `text-white`, `bg-black`, `border-blue-500`
2. **Always use semantic tokens**: ✅ `text-foreground`, `bg-primary`, `border-primary/20`
3. **Support dark mode**: All colors must work in both light and dark themes
4. **Use HSL format**: All colors in `index.css` are HSL for easy manipulation

### Example Usage
```tsx
// ❌ WRONG - Hardcoded colors
<button className="bg-blue-500 text-white">Click me</button>

// ✅ CORRECT - Semantic tokens
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Click me
</button>
```

## 🏛️ Architecture Decisions

### Why ElevenLabs for conversation?
- **Real-time audio processing** with minimal latency
- **Built-in voice activity detection** (knows when user stops speaking)
- **Client-side tool calling** for instant memory operations
- **Natural conversation flow** without backend round-trips

### Why separate Orchestrator?
- **Complex operations** that don't fit in conversation flow
- **Background processing** (summarization, analytics)
- **Tool orchestration** when multiple steps needed
- **Not used for real-time conversation** to avoid latency

### Why client-side tools over backend?
- **Zero latency**: No network round-trip needed
- **Natural flow**: User doesn't wait for backend
- **Instant feedback**: Memory operations happen immediately
- **Backend only for complex ops**: Orchestrator handles batch/async tasks

## 🎨 Assets & Copyright

### AI-Generated Images
- **Cosmic Background** (`/public/cosmic-background.jpg`): AI-generated cosmic scene used on the About page. This image was generated specifically for this project and has no copyright restrictions. Free to use in accordance with the project license.

## 📄 License

MIT License - feel free to use for personal or commercial projects

## 📚 Advanced Features

### Voice Recording & Archive System
#### Comprehensive Archive Interface
- **Dual-mode archive** at `/archive` with separate tabs for voice recordings and text memories
- **Intelligent search** across transcripts, summaries, topics, and memory titles
- **Audio synchronization** between playback and transcript highlighting
- **Memory linking** shows which memories are connected to each recording
- **Advanced filtering** by conversation mode, duration, topics, and date ranges

#### Smart Recording Detection
- **Automatic categorization** by session mode (elevenlabs_conversation, memory_recreation, etc.)
- **Topic extraction** from conversation content using natural language processing
- **Summary generation** for each recording with key conversation points
- **Metadata enrichment** including duration, file size, quality metrics

### Memory Recording Generator
#### Conversation Style Engine
The generator creates natural conversation formats from existing text memories:

**Reflection Style** (Default):
```
"I've been reflecting on a memory I call 'First Day at College'. 
This happened on September 3rd, 2019. I was in Boston at the time. 
Let me share what I remember.

[Original memory content]

This memory continues to resonate with me..."
```

**Interview Style**:
```
"Interviewer: Today I'm speaking with someone about their memory titled 'First Day at College'. Can you tell me about this experience?

Speaker: [Original memory content]

Interviewer: What made this experience particularly meaningful to you?"
```

**Storytelling Style**:
```
"Let me tell you a story. It's called 'First Day at College'. 
This story begins on September 3rd, 2019...

[Original memory content as narrative]

And that's the story of 'First Day at College'..."
```

**Discussion Style**:
```
"Person A: I wanted to discuss a memory with you about 'First Day at College'...
Person B: I'd love to hear about it. What do you remember?
Person A: [Original memory content]..."
```

#### Smart Processing Features
- **Duplicate prevention**: Only generates recordings for memories without existing voice recordings
- **Metadata integration**: Includes dates, locations, and context when available
- **Batch processing**: Generate recordings for multiple memories with progress tracking
- **Quality assurance**: Validates memory content and handles edge cases gracefully

### Diagnostic & Monitoring System
#### Real-time System Health
- **Multi-category logging**: voice_recording, memory_saving, archive_display, database
- **Event severity levels**: info, warn, error with appropriate handling
- **Business-friendly messages**: Technical events translated to user-understandable descriptions
- **Performance tracking**: Response times, success rates, resource usage

#### Comprehensive Validation
- **Database connectivity**: Tests all required tables and permissions
- **Recording pipeline**: Validates microphone access, audio processing, storage uploads
- **Archive functionality**: Ensures proper display and search capabilities
- **Memory system**: Verifies save/retrieve operations and schema compliance

### Enhanced Memory Management
#### Timeline Intelligence
- **Complete vs Incomplete filtering**: Memories with full date/location vs partial information
- **Source tracking**: Differentiates manual entries from conversation auto-saves
- **Chunk management**: Handles long memories split across multiple database records
- **Voice integration**: Shows which memories have associated voice recordings

#### Auto-save System
- **Conversation preservation**: Automatically saves memory fragments during conversations
- **Completion tracking**: Distinguishes between complete memories and conversation snippets  
- **Recovery capabilities**: Prevents data loss during conversation interruptions
- **Quality validation**: Ensures saved content meets minimum quality thresholds

### Memory Chunking System
The application automatically handles long memories by intelligently splitting them into manageable chunks:
- **Automatic Detection**: Memories over 8KB are automatically chunked
- **Intelligent Boundaries**: Preserves paragraph and sentence structure
- **Grouped Retrieval**: Related chunks are automatically reconstructed
- **Database Schema**: Uses `memory_group_id`, `chunk_sequence`, and `total_chunks` fields

### Biography Enhancement
Two complementary systems for comprehensive life storytelling:

#### 1. Flowing Narrative Generation
- **Story Page**: Transforms discrete memories into flowing biographical prose
- **Chapter Organization**: Groups memories by life periods (Early Years, Discovery, Building, etc.)
- **Rich Context**: Extracts themes and creates narrative connections between events
- **Collapsible Chapters**: Maintains readability while providing detail access

#### 2. Proprietary Biography Analysis
Advanced editorial analysis system that evaluates biographical narratives for quality and coherence.

**Configuration** (Optional - service works with fallback if not configured):
```env
# Biography Checker Service Configuration
REACT_APP_BIOGRAPHY_CHECKER_ENDPOINT=https://your-analysis-service.com/api/analyze
REACT_APP_BIOGRAPHY_CHECKER_API_KEY=your-api-key-here
REACT_APP_BIOGRAPHY_CHECKER_VERSION=v1
REACT_APP_BIOGRAPHY_ANALYSIS_DEPTH=standard
REACT_APP_BIOGRAPHY_ENABLE_ENHANCEMENT=true
REACT_APP_BIOGRAPHY_TONE_PREFERENCE=optimistic
```

**Analysis Features**:
- **Flow Analysis** (0-100): Evaluates narrative coherence and sentence structure
- **Tone Consistency** (0-100): Assesses emotional balance and language quality  
- **Positivity Scoring** (0-100): Measures overall optimism and growth themes
- **Enhancement Suggestions**: Provides specific improvement recommendations
- **Fallback Analysis**: Local heuristics when proprietary service unavailable

#### 3. Biographical Topics Collection
- **Separate Database**: `biography_entries` table for general personality/values information
- **Solin Integration**: Voice agent collects biographical topics beyond specific memories
- **Topic Categories**: personality, values, preferences, background, philosophy, relationships
- **Enhanced Narratives**: Biographical context enriches story generation

### Database Extensions

#### Memory Chunking Schema
```sql
-- Enhanced fields in memories table
memory_group_id UUID         -- Groups related chunks
chunk_sequence INTEGER       -- Order within group (1, 2, 3...)  
total_chunks INTEGER         -- Total chunks in group
is_primary_chunk BOOLEAN     -- TRUE for main/first chunk (required for filtering)
source_type TEXT            -- 'manual', 'conversation_auto_save', 'memory_recreation'
```

#### Voice Recording Schema
```sql
-- Complete voice_recordings table
CREATE TABLE voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  session_id TEXT NOT NULL,
  recording_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_url TEXT,
  duration_seconds NUMERIC NOT NULL,
  file_size_bytes BIGINT,
  transcript_text TEXT,
  conversation_summary TEXT,
  memory_ids TEXT[],
  memory_titles TEXT[],
  topics TEXT[],
  session_mode TEXT,
  mime_type TEXT DEFAULT 'audio/webm',
  compression_type TEXT DEFAULT 'opus',
  sample_rate INTEGER DEFAULT 48000,
  bit_rate INTEGER DEFAULT 64000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS policies for voice_recordings
ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own recordings" ON voice_recordings FOR ALL USING (auth.uid() = user_id);
```

#### Diagnostic Logging Schema
```sql
-- diagnostic_logs table for system monitoring
CREATE TABLE diagnostic_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  category TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  event TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_diagnostic_logs_category ON diagnostic_logs(category);
CREATE INDEX idx_diagnostic_logs_level ON diagnostic_logs(level);
CREATE INDEX idx_diagnostic_logs_timestamp ON diagnostic_logs(timestamp);
```

#### Biography Topics Table
```sql
-- biography_entries table
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
topic_category TEXT       -- 'personality', 'values', etc.
topic_title TEXT          -- Specific topic name
content TEXT              -- User's input about this topic
context_notes TEXT        -- Additional context
source TEXT               -- How collected ('solin_conversation')
created_at TIMESTAMP
```

## 🙋‍♂️ Support

For questions or issues:
1. **Check the debugging section** above
2. **Review logs**: Supabase Dashboard → Edge Functions → Logs
3. **Check console**: Browser DevTools → Console
4. **Open an issue** on GitHub with:
   - Steps to reproduce
   - Console logs
   - Edge function logs (if applicable)
5. **Contact the team** via GitHub issues

---

**Built with ❤️ using [Lovable](https://lovable.dev)**

_Preserving memories, one conversation at a time._
