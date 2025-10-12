import { supabase } from "@/integrations/supabase/client";

export class OrchestratorService {
  async ask(params: { userId: string; message: string; limit?: number }) {
    const { data, error } = await supabase.functions.invoke("orchestrator", {
      body: params,
    });
    if (error) throw error;
    return data as { content: string };
  }
}

export const orchestratorService = new OrchestratorService();
