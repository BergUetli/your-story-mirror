# You, Remembered 🌟

A digital memory preservation application that helps users capture and preserve their life stories through AI-powered voice conversations with Solon, an empathetic AI companion.

## 🎯 Overview

**You, Remembered** enables users to:
- Record memories through natural voice conversations with Solon (ElevenLabs AI agent)
- Organize and search through their life stories
- Create a lasting digital legacy for future generations
- Control access to different memories (private, family, friends)

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
│   ├── AnimatedOrb.tsx           # Visual feedback for Solon's state
│   ├── ElevenLabsVoiceAgent.tsx  # Standalone voice agent component
│   └── auth/                     # Authentication components
├── pages/
│   ├── Index.tsx                 # Main landing/conversation page
│   ├── Dashboard.tsx             # User dashboard
│   ├── Timeline.tsx              # Memory timeline view
│   └── Journal.tsx               # Memory journal view
├── services/
│   ├── orchestratorService.ts    # Backend orchestration layer
│   ├── voiceService.ts           # Text-to-speech service
│   └── memoryService.ts          # Memory operations
├── hooks/
│   ├── useMemories.ts            # Memory data fetching
│   └── useSpeechRecognition.ts   # Speech-to-text
└── contexts/
    └── AuthContext.tsx           # Authentication state

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
- tags (text[], GIN indexed)
- recipient (text, nullable)
- created_at (timestamp, indexed)
- updated_at (timestamp)
```

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
- birth_date (text)
- birth_place (text)
- current_location (text)
- onboarding_completed (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

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
# Navigate to specific routes to test pages:
# / - Landing/conversation page
# /dashboard - User dashboard
# /timeline - Memory timeline
# /journal - Memory journal
```

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

### Voice Agent Issues

**Session disconnects quickly:**
1. Check browser console for WebSocket errors
2. View [ElevenLabs token logs](https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu/functions/elevenlabs-agent-token/logs)
3. Verify microphone permissions granted
4. Check that signed URL generation succeeds
5. Verify memory context size is < 1500 chars
6. Check if timeout is being triggered (look for "Connection timed out")

**No audio output:**
1. Check browser audio permissions
2. Verify ElevenLabs agent is configured correctly
3. Check console for WebSocket connection status
4. Test with different browser (Chrome/Firefox)

**Microphone not working:**
1. Check browser permissions (Settings → Privacy → Microphone)
2. Try different browser
3. Check console for getUserMedia errors

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

## 📄 License

MIT License - feel free to use for personal or commercial projects

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
