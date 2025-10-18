/**
 * MEMORY GROUPING UTILITIES
 * 
 * Handles retrieval and reconstruction of chunked memories from the database.
 */

import { supabase } from '@/integrations/supabase/client';
import { reconstructMemoryFromChunks, validateChunkIntegrity, type MemoryChunk } from './memoryChunking';

export interface GroupedMemory {
  id: string; // memory_group_id
  title: string; // Original title without chunk numbering
  text: string; // Reconstructed full content
  tags: string[] | null;
  memory_date: string | null;
  memory_location: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  recipient: string;
  image_urls: string[] | null;
  chunks: MemoryChunk[];
  totalChunks: number;
}

/**
 * Retrieves all memories for a user, grouping chunked memories together
 */
export async function getGroupedMemories(userId: string): Promise<GroupedMemory[]> {
  try {
    console.log('🔄 Fetching memories for user:', userId);

    // Fetch all memories for the user, ordered by memory_group_id and chunk_sequence
    const { data: memories, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('memory_group_id')
      .order('chunk_sequence');

    if (error) {
      console.error('Error fetching memories:', error);
      throw error;
    }

    if (!memories || memories.length === 0) {
      return [];
    }

    // Group memories by memory_group_id
    const memoryGroups = new Map<string, any[]>();
    
    for (const memory of memories) {
      const groupId = memory.memory_group_id;
      if (!memoryGroups.has(groupId)) {
        memoryGroups.set(groupId, []);
      }
      memoryGroups.get(groupId)!.push(memory);
    }

    console.log(`📊 Found ${memoryGroups.size} memory groups from ${memories.length} memory chunks`);

    // Process each group to reconstruct the full memory
    const groupedMemories: GroupedMemory[] = [];

    for (const [groupId, chunks] of memoryGroups.entries()) {
      try {
        // Sort chunks by sequence
        chunks.sort((a, b) => a.chunk_sequence - b.chunk_sequence);

        // Prepare chunk data for reconstruction
        const memoryChunks: MemoryChunk[] = chunks.map(chunk => ({
          content: chunk.text,
          chunkSequence: chunk.chunk_sequence,
          totalChunks: chunk.total_chunks,
          memoryGroupId: chunk.memory_group_id
        }));

        // Validate chunk integrity
        const validation = validateChunkIntegrity(memoryChunks);
        if (!validation.isValid) {
          console.warn(`⚠️ Chunk integrity issues for group ${groupId}:`, validation.issues);
          // Continue anyway, but log the issues
        }

        // Reconstruct full content from chunks
        const fullContent = reconstructMemoryFromChunks(memoryChunks);

        // Use the first chunk's metadata (they should all be the same except for title and text)
        const firstChunk = chunks[0];
        
        // Extract original title (remove chunk numbering if present)
        const originalTitle = extractOriginalTitle(firstChunk.title, chunks.length);

        const groupedMemory: GroupedMemory = {
          id: groupId,
          title: originalTitle,
          text: fullContent,
          tags: firstChunk.tags,
          memory_date: firstChunk.memory_date,
          memory_location: firstChunk.memory_location,
          created_at: firstChunk.created_at,
          updated_at: Math.max(...chunks.map(c => new Date(c.updated_at).getTime())).toString(),
          user_id: firstChunk.user_id,
          recipient: firstChunk.recipient || 'public',
          image_urls: firstChunk.image_urls,
          chunks: memoryChunks,
          totalChunks: chunks.length
        };

        groupedMemories.push(groupedMemory);

      } catch (error) {
        console.error(`Error processing memory group ${groupId}:`, error);
        // Continue with other groups
      }
    }

    // Sort by created_at (most recent first)
    groupedMemories.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log(`✅ Successfully grouped ${groupedMemories.length} memories`);
    return groupedMemories;

  } catch (error) {
    console.error('Error in getGroupedMemories:', error);
    throw error;
  }
}

/**
 * Extracts original title from potentially chunk-numbered title
 */
function extractOriginalTitle(title: string, totalChunks: number): string {
  if (totalChunks === 1) {
    return title; // Single chunk, title unchanged
  }

  // Remove pattern like " (Part 1/3)" from the end
  const chunkPattern = /\s*\(Part \d+\/\d+\)$/;
  return title.replace(chunkPattern, '');
}

/**
 * Retrieves a specific memory group by ID
 */
export async function getMemoryGroup(userId: string, memoryGroupId: string): Promise<GroupedMemory | null> {
  try {
    const { data: chunks, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .eq('memory_group_id', memoryGroupId)
      .order('chunk_sequence');

    if (error) throw error;
    if (!chunks || chunks.length === 0) return null;

    // Process the chunks into a grouped memory
    const memoryChunks: MemoryChunk[] = chunks.map(chunk => ({
      content: chunk.text,
      chunkSequence: chunk.chunk_sequence,
      totalChunks: chunk.total_chunks,
      memoryGroupId: chunk.memory_group_id
    }));

    const fullContent = reconstructMemoryFromChunks(memoryChunks);
    const firstChunk = chunks[0];
    const originalTitle = extractOriginalTitle(firstChunk.title, chunks.length);

    return {
      id: memoryGroupId,
      title: originalTitle,
      text: fullContent,
      tags: firstChunk.tags,
      memory_date: firstChunk.memory_date,
      memory_location: firstChunk.memory_location,
      created_at: firstChunk.created_at,
      updated_at: Math.max(...chunks.map(c => new Date(c.updated_at).getTime())).toString(),
      user_id: firstChunk.user_id,
      recipient: firstChunk.recipient || 'public',
      image_urls: firstChunk.image_urls,
      chunks: memoryChunks,
      totalChunks: chunks.length
    };

  } catch (error) {
    console.error('Error getting memory group:', error);
    return null;
  }
}

/**
 * Deletes an entire memory group (all chunks)
 */
export async function deleteMemoryGroup(userId: string, memoryGroupId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('user_id', userId)
      .eq('memory_group_id', memoryGroupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting memory group:', error);
    return false;
  }
}