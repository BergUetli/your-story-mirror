import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, context, type, config } = await req.json()
    
    console.log('🤖 Narrative Generator Edge Function called:', { type, contextMemoriesCount: context.memories?.length })

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Build the OpenAI request based on our proprietary style
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4',
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 4000,
        messages: [
          {
            role: 'system',
            content: `You are a master biographical storyteller with a proprietary narrative style. Create deeply personal, flowing narratives that capture the essence of individuals through their memories and experiences.

PROPRIETARY STYLE CHARACTERISTICS:
- Warm, literary prose with emotional depth
- Third-person perspective using the person's name
- Thematic connections rather than pure chronology  
- Emphasis on growth, resilience, and meaning-making
- Unique voice that reflects the individual's personality
- Forward-looking optimism while honoring all experiences
- Rich, evocative language that brings memories to life

Your responses must be in valid JSON format as specified in the prompt.`
          },
          {
            role: 'user', 
            content: prompt
          }
        ]
      })
    })

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const openAIResult = await openAIResponse.json()
    const generatedContent = openAIResult.choices[0].message.content

    console.log('✅ AI narrative generated successfully')

    // Parse the JSON response from OpenAI
    let parsedResponse
    try {
      parsedResponse = JSON.parse(generatedContent)
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError)
      // Fallback response
      parsedResponse = {
        introduction: generatedContent.substring(0, 500) + "...",
        chapters: [{
          title: "Life Story",
          content: generatedContent,
          life_period: "comprehensive",
          memory_group_ids: context.memories?.map(m => m.memory_group_id || m.id) || []
        }],
        conclusion: "This story continues to unfold with each passing day."
      }
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Narrative generation failed:', error)
    
    // Return fallback narrative
    const fallbackResponse = {
      introduction: "Every life tells a unique story, and this one is filled with meaningful experiences and personal growth.",
      chapters: [{
        title: "A Life Well Lived",
        content: "The memories preserved here represent the threads of a rich tapestry - moments of joy, challenge, discovery, and connection that have shaped this individual's journey through life.",
        life_period: "comprehensive", 
        memory_group_ids: []
      }],
      conclusion: "This story continues to evolve, with each new day offering fresh opportunities for growth, connection, and meaning."
    }

    return new Response(
      JSON.stringify(fallbackResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200 // Return 200 with fallback content rather than error
      }
    )
  }
})