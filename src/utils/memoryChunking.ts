/**
 * MEMORY CHUNKING UTILITIES
 * 
 * Handles splitting long memories into manageable chunks while preserving
 * logical content boundaries and maintaining relationships between chunks.
 */

import { v4 as uuidv4 } from 'uuid';

// Maximum recommended size per memory chunk (characters)
// PostgreSQL TEXT field can handle much more, but we chunk for better performance
const MAX_CHUNK_SIZE = 8000; // ~8KB per chunk for optimal performance

// Minimum chunk size to avoid too many small fragments  
const MIN_CHUNK_SIZE = 2000; // ~2KB minimum

export interface MemoryChunk {
  content: string;
  chunkSequence: number;
  totalChunks: number;
  memoryGroupId: string;
}

/**
 * Splits long memory content into logical chunks while preserving structure
 */
export function chunkMemoryContent(content: string, memoryGroupId?: string): MemoryChunk[] {
  // If content is within size limit, return single chunk
  if (content.length <= MAX_CHUNK_SIZE) {
    const groupId = memoryGroupId || uuidv4();
    return [{
      content,
      chunkSequence: 1,
      totalChunks: 1,
      memoryGroupId: groupId
    }];
  }

  const groupId = memoryGroupId || uuidv4();
  const chunks: MemoryChunk[] = [];
  
  // First, try to split by paragraphs (double newlines)
  const paragraphs = content.split(/\n\s*\n/);
  let currentChunk = '';
  let chunkNumber = 1;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
    
    // If adding this paragraph would exceed limit and we have content
    if (potentialChunk.length > MAX_CHUNK_SIZE && currentChunk.length > MIN_CHUNK_SIZE) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        chunkSequence: chunkNumber,
        totalChunks: 0, // Will be set later
        memoryGroupId: groupId
      });
      
      // Start new chunk with current paragraph
      currentChunk = paragraph;
      chunkNumber++;
    }
    // If single paragraph is too long, split it by sentences
    else if (paragraph.length > MAX_CHUNK_SIZE) {
      // Save current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          chunkSequence: chunkNumber,
          totalChunks: 0,
          memoryGroupId: groupId
        });
        chunkNumber++;
      }
      
      // Split long paragraph by sentences
      const sentenceChunks = splitBySentences(paragraph, groupId, chunkNumber);
      chunks.push(...sentenceChunks);
      chunkNumber += sentenceChunks.length;
      currentChunk = '';
    }
    else {
      // Add paragraph to current chunk
      currentChunk = potentialChunk;
    }
  }
  
  // Add any remaining content as final chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      chunkSequence: chunkNumber,
      totalChunks: 0,
      memoryGroupId: groupId
    });
  }
  
  // Update total chunks count for all chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.totalChunks = totalChunks;
  });
  
  return chunks;
}

/**
 * Splits long paragraph by sentences when paragraph splitting isn't sufficient
 */
function splitBySentences(paragraph: string, groupId: string, startingChunkNumber: number): MemoryChunk[] {
  const chunks: MemoryChunk[] = [];
  
  // Split by sentence endings (. ! ?) followed by space or end of string
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  let chunkNumber = startingChunkNumber;
  
  for (const sentence of sentences) {
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
    
    if (potentialChunk.length > MAX_CHUNK_SIZE && currentChunk.length > MIN_CHUNK_SIZE) {
      // Save current chunk
      chunks.push({
        content: currentChunk.trim(),
        chunkSequence: chunkNumber,
        totalChunks: 0, // Will be set later
        memoryGroupId: groupId
      });
      
      // Start new chunk
      currentChunk = sentence;
      chunkNumber++;
    }
    // If single sentence is still too long, force split by words
    else if (sentence.length > MAX_CHUNK_SIZE) {
      // Save current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push({
          content: currentChunk.trim(),
          chunkSequence: chunkNumber,
          totalChunks: 0,
          memoryGroupId: groupId
        });
        chunkNumber++;
      }
      
      // Force split very long sentence by words
      const wordChunks = splitByWords(sentence, groupId, chunkNumber);
      chunks.push(...wordChunks);
      chunkNumber += wordChunks.length;
      currentChunk = '';
    }
    else {
      currentChunk = potentialChunk;
    }
  }
  
  // Add any remaining content
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      chunkSequence: chunkNumber,
      totalChunks: 0,
      memoryGroupId: groupId
    });
  }
  
  return chunks;
}

/**
 * Last resort: split by words when sentences are too long
 */
function splitByWords(text: string, groupId: string, startingChunkNumber: number): MemoryChunk[] {
  const chunks: MemoryChunk[] = [];
  const words = text.split(/\s+/);
  let currentChunk = '';
  let chunkNumber = startingChunkNumber;
  
  for (const word of words) {
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + word;
    
    if (potentialChunk.length > MAX_CHUNK_SIZE && currentChunk.length > MIN_CHUNK_SIZE) {
      chunks.push({
        content: currentChunk.trim(),
        chunkSequence: chunkNumber,
        totalChunks: 0,
        memoryGroupId: groupId
      });
      
      currentChunk = word;
      chunkNumber++;
    }
    else {
      currentChunk = potentialChunk;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      chunkSequence: chunkNumber,
      totalChunks: 0,
      memoryGroupId: groupId
    });
  }
  
  return chunks;
}

/**
 * Reconstructs full memory content from chunks
 */
export function reconstructMemoryFromChunks(chunks: MemoryChunk[]): string {
  if (!chunks || chunks.length === 0) return '';
  
  // Sort chunks by sequence number
  const sortedChunks = [...chunks].sort((a, b) => a.chunkSequence - b.chunkSequence);
  
  // Join chunks with double newlines to preserve paragraph structure
  return sortedChunks.map(chunk => chunk.content).join('\n\n');
}

/**
 * Validates that chunks form a complete memory
 */
export function validateChunkIntegrity(chunks: MemoryChunk[]): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!chunks || chunks.length === 0) {
    issues.push('No chunks provided');
    return { isValid: false, issues };
  }
  
  // Check all chunks have same group ID
  const firstGroupId = chunks[0].memoryGroupId;
  if (!chunks.every(chunk => chunk.memoryGroupId === firstGroupId)) {
    issues.push('Inconsistent memory group IDs across chunks');
  }
  
  // Check all chunks have same total count
  const expectedTotal = chunks[0].totalChunks;
  if (!chunks.every(chunk => chunk.totalChunks === expectedTotal)) {
    issues.push('Inconsistent total chunk counts');
  }
  
  // Check we have the right number of chunks
  if (chunks.length !== expectedTotal) {
    issues.push(`Expected ${expectedTotal} chunks, but got ${chunks.length}`);
  }
  
  // Check sequence numbers are continuous (1, 2, 3, ...)
  const sequences = chunks.map(c => c.chunkSequence).sort((a, b) => a - b);
  for (let i = 0; i < sequences.length; i++) {
    if (sequences[i] !== i + 1) {
      issues.push(`Missing chunk sequence ${i + 1}`);
    }
  }
  
  return { isValid: issues.length === 0, issues };
}