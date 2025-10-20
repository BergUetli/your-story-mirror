import { supabase } from '@/integrations/supabase/client';

interface ExistingMemory {
  id: string;
  title: string;
  text: string;
  memory_date: string | null;
  memory_location: string | null;
  user_id: string;
  created_at: string;
  chunk_sequence: number;
  is_primary_chunk: boolean;
  source_type: string;
}

interface GeneratedRecording {
  memoryId: string;
  audioUrl: string;
  duration: number;
  transcript: string;
  summary: string;
}

class MemoryRecordingGenerator {
  
  /**
   * Get all existing memories from the database
   */
  async getExistingMemories(userId?: string): Promise<ExistingMemory[]> {
    try {
      let query = supabase
        .from('memories')
        .select('*')
        .eq('chunk_sequence', 1) // Only get primary chunks
        .order('created_at', { ascending: false });

      // If userId provided, filter by user
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log(`📚 Found ${data?.length || 0} existing memories in database`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching existing memories:', error);
      throw error;
    }
  }

  /**
   * Generate conversation-style recordings for existing memories
   */
  async generateRecordingsForMemories(
    memories: ExistingMemory[], 
    options: {
      voiceModel?: string;
      conversationStyle?: 'interview' | 'reflection' | 'storytelling' | 'discussion';
      includeMetadata?: boolean;
    } = {}
  ): Promise<GeneratedRecording[]> {
    const {
      voiceModel = 'google/gemini-2.5-pro-preview-tts',
      conversationStyle = 'reflection',
      includeMetadata = true
    } = options;

    const results: GeneratedRecording[] = [];

    console.log(`🎙️ Starting voice recording generation for ${memories.length} memories...`);

    for (const memory of memories) {
      try {
        console.log(`🎯 Processing memory: "${memory.title}"`);

        // Generate conversation script based on memory content
        const script = this.generateConversationScript(memory, conversationStyle, includeMetadata);

        // Create TTS audio for the conversation
        const audioUrl = await this.generateTTSAudio(script, voiceModel);

        // Calculate estimated duration (roughly 3 words per second for TTS)
        const wordCount = script.split(' ').length;
        const estimatedDuration = Math.ceil(wordCount / 3);

        // Create recording record
        const recordingData = {
          user_id: memory.user_id,
          storage_path: audioUrl, // Use the generated audio URL as storage path
          file_url: audioUrl, // Also set file_url for compatibility
          duration_seconds: estimatedDuration,
          transcript_text: script,
          conversation_summary: this.generateSummary(memory, conversationStyle),
          session_mode: 'memory_recreation',
          topics: this.extractTopics(memory.text),
          memory_titles: [memory.title],
          created_at: new Date().toISOString()
        };

        // Save to voice_recordings table
        const { data: recordingResult, error: recordingError } = await supabase
          .from('voice_recordings')
          .insert([recordingData])
          .select()
          .single();

        if (recordingError) {
          console.error(`❌ Failed to save recording for memory "${memory.title}":`, recordingError);
          continue;
        }

        results.push({
          memoryId: memory.id,
          audioUrl: audioUrl,
          duration: estimatedDuration,
          transcript: script,
          summary: recordingData.conversation_summary
        });

        console.log(`✅ Generated recording for memory: "${memory.title}" (${estimatedDuration}s)`);

      } catch (error) {
        console.error(`❌ Failed to generate recording for memory "${memory.title}":`, error);
        continue;
      }
    }

    console.log(`🎉 Successfully generated ${results.length}/${memories.length} voice recordings`);
    return results;
  }

  /**
   * Generate conversation script based on memory content and style
   */
  private generateConversationScript(
    memory: ExistingMemory, 
    style: string, 
    includeMetadata: boolean
  ): string {
    const { title, text, memory_date, memory_location } = memory;

    let script = '';

    switch (style) {
      case 'interview':
        script = this.generateInterviewScript(title, text, memory_date, memory_location, includeMetadata);
        break;
      case 'reflection':
        script = this.generateReflectionScript(title, text, memory_date, memory_location, includeMetadata);
        break;
      case 'storytelling':
        script = this.generateStorytellingScript(title, text, memory_date, memory_location, includeMetadata);
        break;
      case 'discussion':
        script = this.generateDiscussionScript(title, text, memory_date, memory_location, includeMetadata);
        break;
      default:
        script = this.generateReflectionScript(title, text, memory_date, memory_location, includeMetadata);
    }

    return script;
  }

  /**
   * Generate interview-style script
   */
  private generateInterviewScript(
    title: string, 
    text: string, 
    date: string | null, 
    location: string | null, 
    includeMetadata: boolean
  ): string {
    let script = `Interviewer: Today I'm speaking with someone about their memory titled "${title}". `;
    
    if (includeMetadata && date) {
      script += `This memory is from ${new Date(date).toLocaleDateString()}. `;
    }
    
    if (includeMetadata && location) {
      script += `It took place in ${location}. `;
    }

    script += `Can you tell me about this experience?\n\n`;
    script += `Speaker: ${text}\n\n`;
    script += `Interviewer: That's a fascinating memory. What made this experience particularly meaningful to you?\n\n`;
    script += `Speaker: Looking back, this memory represents an important moment in my life. The details and emotions are still vivid, showing how significant this experience was for me.`;

    return script;
  }

  /**
   * Generate reflection-style script
   */
  private generateReflectionScript(
    title: string, 
    text: string, 
    date: string | null, 
    location: string | null, 
    includeMetadata: boolean
  ): string {
    let script = `I've been reflecting on a memory I call "${title}". `;
    
    if (includeMetadata && date) {
      script += `This happened on ${new Date(date).toLocaleDateString()}. `;
    }
    
    if (includeMetadata && location) {
      script += `I was in ${location} at the time. `;
    }

    script += `Let me share what I remember.\n\n`;
    script += `${text}\n\n`;
    script += `This memory continues to resonate with me. Sometimes the moments that seem ordinary at the time become the ones we treasure most when we look back.`;

    return script;
  }

  /**
   * Generate storytelling-style script
   */
  private generateStorytellingScript(
    title: string, 
    text: string, 
    date: string | null, 
    location: string | null, 
    includeMetadata: boolean
  ): string {
    let script = `Let me tell you a story. It's called "${title}". `;
    
    if (includeMetadata && date) {
      script += `This story begins on ${new Date(date).toLocaleDateString()}. `;
    }
    
    if (includeMetadata && location) {
      script += `The setting was ${location}. `;
    }

    script += `Here's how it unfolded.\n\n`;
    script += `${text}\n\n`;
    script += `And that's the story of "${title}". Every memory is a story worth preserving, carrying with it the emotions and lessons of that moment in time.`;

    return script;
  }

  /**
   * Generate discussion-style script
   */
  private generateDiscussionScript(
    title: string, 
    text: string, 
    date: string | null, 
    location: string | null, 
    includeMetadata: boolean
  ): string {
    let script = `Person A: I wanted to discuss a memory with you. It's about "${title}". `;
    
    if (includeMetadata && date) {
      script += `This happened on ${new Date(date).toLocaleDateString()}. `;
    }
    
    script += `\n\nPerson B: I'd love to hear about it. What do you remember?\n\n`;
    script += `Person A: ${text}\n\n`;
    script += `Person B: That sounds like a meaningful experience. What stands out most to you about this memory?\n\n`;
    script += `Person A: The way I remember it so clearly shows how important this moment was. These kinds of memories shape who we are.`;

    return script;
  }

  /**
   * Generate TTS audio for the script using the audio generation service
   */
  private async generateTTSAudio(script: string, voiceModel: string): Promise<string> {
    try {
      console.log(`🎵 Generating TTS audio with ${voiceModel} for ${script.length} character script`);
      
      // For now, create a placeholder audio URL that follows the expected pattern
      // In a real implementation, you would integrate with the audio_generation function
      // This requires additional setup and API keys for TTS services
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a unique identifier for this recording
      const timestamp = Date.now();
      const audioId = `memory-recording-${timestamp}`;
      
      // Create a placeholder audio URL that follows your storage pattern
      // This would be replaced by actual TTS generation when APIs are configured
      const audioUrl = `https://generated-audio.example.com/${audioId}.mp3`;
      
      console.log(`✅ Mock TTS audio generated: ${audioUrl}`);
      return audioUrl;
      
      /* 
      // Uncomment and modify when ready to use real TTS:
      
      const audioResponse = await audio_generation({
        model: voiceModel,
        query: script,
        task_summary: "Generate voice recording for memory recreation"
      });
      
      if (audioResponse.generated_audios && audioResponse.generated_audios.length > 0) {
        return audioResponse.generated_audios[0].url;
      }
      
      throw new Error('No audio generated from TTS service');
      */
      
    } catch (error) {
      console.error('❌ Error generating TTS audio:', error);
      // Return a fallback mock URL so the system can continue to work
      const fallbackId = `fallback-${Date.now()}`;
      return `https://generated-audio.example.com/${fallbackId}.mp3`;
    }
  }

  /**
   * Generate summary for the recording
   */
  private generateSummary(memory: ExistingMemory, style: string): string {
    const styleDescription = {
      'interview': 'An interview-style conversation',
      'reflection': 'A personal reflection',
      'storytelling': 'A storytelling narration',
      'discussion': 'A discussion format'
    };

    return `${styleDescription[style as keyof typeof styleDescription] || 'A conversation'} about the memory "${memory.title}". This generated recording recreates the original memory content in a conversational format, preserving the key details and emotional context of the experience.`;
  }

  /**
   * Extract topics from memory text
   */
  private extractTopics(text: string): string[] {
    // Simple topic extraction - in production you might use NLP
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'];
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));

    // Get unique words and take top 5
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 5).map(word => word.charAt(0).toUpperCase() + word.slice(1));
  }

  /**
   * Get memories that don't have associated voice recordings
   */
  async getMemoriesWithoutRecordings(userId?: string): Promise<ExistingMemory[]> {
    try {
      // Get all memories
      const memories = await this.getExistingMemories(userId);

      // Get all recording memory titles to filter out memories that already have recordings
      let recordingsQuery = supabase
        .from('voice_recordings')
        .select('memory_titles');

      if (userId) {
        recordingsQuery = recordingsQuery.eq('user_id', userId);
      }

      const { data: recordings, error: recordingsError } = await recordingsQuery;

      if (recordingsError) {
        console.warn('⚠️ Could not check existing recordings, proceeding with all memories:', recordingsError);
        return memories;
      }

      // Extract all memory titles that already have recordings
      const existingTitles = new Set(
        recordings?.flatMap(r => r.memory_titles || []) || []
      );

      // Filter out memories that already have recordings
      const memoriesWithoutRecordings = memories.filter(memory => 
        !existingTitles.has(memory.title)
      );

      console.log(`📊 Found ${memoriesWithoutRecordings.length} memories without recordings (${memories.length} total, ${existingTitles.size} already have recordings)`);
      
      return memoriesWithoutRecordings;
    } catch (error) {
      console.error('❌ Error checking memories without recordings:', error);
      throw error;
    }
  }
}

export const memoryRecordingGenerator = new MemoryRecordingGenerator();
export type { ExistingMemory, GeneratedRecording };