# You, Remembered 🌟

Your Swiss Memory Vault - where life stories are preserved with military-grade security and Swiss privacy laws.

## 🎯 Overview

**You, Remembered** is a digital memory preservation platform that helps you capture, preserve, and relive your life stories through AI-powered voice conversations with Solin, an empathetic AI companion.

### Core Features
- 🎙️ **Voice Conversations** - Natural interactions with Solin that feel like talking to a friend
- 🔍 **AI-Powered Search** - Find any memory using natural language
- 📖 **Memory Archive** - Organize and access your complete life story
- 🎨 **Identity Training** - Personalized memory reconstruction with face recognition
- 📊 **Timeline View** - Visualize your life journey chronologically

### 🇨🇭 Swiss Privacy & Data Sovereignty

Your memories are precious. We protect them with Swiss-grade security:

- **🏔️ Swiss Data Sovereignty** - All data stored on dedicated servers in Switzerland, protected by Swiss privacy laws
- **🔐 Bank-Level Encryption** - Military-grade encryption at rest and in transit (TLS/HTTPS)
- **🚫 Zero Data Sharing** - Your memories will never be sold or shared with third parties without your express approval
- **🛡️ Private by Design** - Zero data retention policy for voice processing with AI providers
- **🔒 Row-Level Security** - Only you can access your memories through database-level isolation

## 🌟 Key Features

### 🎙️ Natural Voice Conversations
Have authentic conversations with Solin, your AI memory companion. Share your stories naturally through voice, just like talking to a trusted friend.

### 📚 Complete Memory Archive  
All conversations are automatically recorded and stored with searchable transcripts. Never lose a moment or detail from your life story.

### 🔍 Intelligent Search
Find any memory using natural language - "that time I talked about my grandmother's recipes" - powered by AI semantic understanding.

### 🎭 Identity Training
Upload photos to train custom AI models that recognize you and your loved ones for personalized memory reconstruction.

### 📊 Memory Timeline
Visualize your complete life journey with an interactive timeline that organizes memories chronologically.

### 🛡️ Privacy-First Architecture
Swiss data sovereignty, bank-level encryption, and zero data sharing ensure your memories remain private forever.

## 🎨 Identity Training System

Upload 3-40 photos of yourself or loved ones to train custom AI models that recognize faces. These trained identities can be used to generate personalized, photorealistic images in your memory reconstructions.

### Key Benefits
- **Personalized Memories**: Generate images featuring actual faces of people in your life
- **Family Heritage**: Preserve visual representations of family members across generations  
- **Privacy Protected**: All models stored privately and never shared with others
- **Professional Quality**: High-quality, photorealistic results

### How It Works
1. Upload 3-40 clear photos of one person
2. System trains a custom AI model (takes ~10-30 minutes)
3. Use trained identity to generate personalized memory images
4. All models remain private and under your control

## 🏗️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** + **shadcn/ui** for UI components
- **React Router** for navigation

### Backend
- **Supabase** (PostgreSQL + Edge Functions)
- **Row Level Security** for data isolation
- **Swiss-hosted dedicated servers** (planned)

### AI & Voice
- **ElevenLabs** for conversational AI voice interactions
- **OpenAI GPT-4** for intelligent memory operations
- **HuggingFace** for identity training and image generation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- ElevenLabs account
- OpenAI API key

### Quick Start

1. Clone the repository and install dependencies:
```bash
git clone <YOUR_GIT_URL>
cd you-remembered
npm install
```

2. Configure environment variables (auto-configured in Lovable):
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

3. Start development:
```bash
npm run dev
```

4. Visit `http://localhost:8080` and begin your journey

### First-Time User Experience

New users complete a comprehensive onboarding:
1. **Sign Up** - Secure account creation
2. **Profile Setup** - 13-question questionnaire about your life, values, and background
3. **First Conversation** - Meet Solin and start building your Memory Vault

## 🏗️ How It Works

### Voice Conversations with Solin
Natural, real-time conversations powered by ElevenLabs AI technology. Share your stories through voice, and Solin responds with empathy and understanding.

### Automatic Memory Preservation
Every conversation is automatically recorded, transcribed, and archived. Your memories are searchable and accessible whenever you need them.

### Swiss Data Security
All data stored on dedicated servers in Switzerland, encrypted at rest and in transit, protected by Swiss privacy laws.

## 🔐 Security & Privacy

- **Row Level Security (RLS)** - Database-level isolation ensures only you access your data
- **Bank-Level Encryption** - TLS/HTTPS encryption for all data transmission
- **Secure Authentication** - JWT-based authentication with Supabase
- **Zero Data Sharing** - Your memories never sold or shared without express approval
- **Swiss Privacy Laws** - All data protected under Swiss legal framework

## 📦 Deployment

### Via Lovable (Recommended)
1. Open your Lovable project
2. Click **Publish** 
3. App deploys to `your-project.lovable.app`
4. Configure custom domain in Project > Settings > Domains

### Self-Hosting
Build and deploy to your preferred hosting provider:
```bash
npm run build
# Deploy dist/ folder to Vercel, Netlify, Cloudflare Pages, etc.
```

## 🔗 Key Links

- **Supabase Dashboard**: [https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu](https://supabase.com/dashboard/project/gulydhhzwlltkxbfnclu)
- **ElevenLabs Dashboard**: [https://elevenlabs.io/app/conversational-ai](https://elevenlabs.io/app/conversational-ai)

## 📄 License

MIT License - Free to use for personal or commercial projects

---

**Built with ❤️ for preserving life stories with Swiss-grade privacy and security**

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

## 🔄 Recent Updates (October 2025)

### Onboarding System Enhancement
- ✅ Expanded from 5 to **13 comprehensive questions**
- ✅ All questions map to `user_profiles` database columns
- ✅ Profile completeness scoring (0-100%)
- ✅ Multiple exit options (X button, Skip, Sign Out)
- ✅ Integrated into main app flow with authentication checks
- 📄 Documentation: `ONBOARDING_FLOW_SUMMARY.md`, `TESTING_GUIDE.md`

### Admin Dashboard Fixes
- ✅ Fixed metadata column issue in `voice_recordings` table
- ✅ "Test Audio File Save & Retrieval" now works correctly
- ✅ Removed non-existent `metadata` field from database inserts
- ✅ Comprehensive voice recording diagnostics panel
- 📄 Documentation: `ADMIN_AUDIO_FIX.md`

### Diagnostic Tools
- ✅ Created `DIAGNOSTIC_USER_ISSUES.sql` for user account verification
- ✅ Comprehensive troubleshooting guide in `MEMORY_AND_VOICE_RECORDING_ISSUES.md`
- ✅ Identifies foreign key constraint violations
- ✅ Detects missing auth.users entries
- ✅ Helps resolve voice recording visibility issues

### Database Schema Updates
- ✅ Expanded `user_profiles` table to 30+ columns
- ✅ Added profile completeness scoring
- ✅ Enhanced foreign key documentation
- ✅ Clarified auth.users relationships

### Known Issues & Solutions
| Issue | Cause | Solution |
|-------|-------|----------|
| Memory save fails with FK error | User missing from auth.users | Run DIAGNOSTIC_USER_ISSUES.sql, sign up fresh |
| Voice recordings don't appear | User missing from auth.users | Same as above - verify user exists |
| Onboarding doesn't show | User already completed | Check user_profiles.onboarding_completed flag |
| Admin audio test fails | Metadata column removed | Already fixed in latest commit |

## 🙋‍♂️ Support

For questions or issues:
1. **Check the debugging section** above
2. **Run diagnostic SQL**: Use `DIAGNOSTIC_USER_ISSUES.sql` for account issues
3. **Review logs**: Supabase Dashboard → Edge Functions → Logs
4. **Check console**: Browser DevTools → Console
5. **Read documentation**: See diagnostic files in project root
6. **Open an issue** on GitHub with:
   - Steps to reproduce
   - Console logs
   - Edge function logs (if applicable)
   - Results from diagnostic SQL
7. **Contact the team** via GitHub issues

---

**Built with ❤️ using [Lovable](https://lovable.dev)**

_Preserving memories, one conversation at a time._
