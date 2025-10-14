import { supabase } from "@/integrations/supabase/client";

export class OrchestratorService {
  async ask(params: { message: string; limit?: number }) {
    // userId is now derived from JWT token on server-side
    const { data, error } = await supabase.functions.invoke("orchestrator", {
      body: { message: params.message, limit: params.limit },
    });
    if (error) throw error;
    return data as { content: string };
  }
}

export const orchestratorService = new OrchestratorService();
