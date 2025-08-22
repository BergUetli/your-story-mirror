-- Create missing tables for the your-story-mirror project

-- Create reflections table
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time_capsules table
CREATE TABLE IF NOT EXISTS public.time_capsules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visitors table (different from visitor_logs)
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL UNIQUE,
  first_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  visit_count INTEGER NOT NULL DEFAULT 1
);

-- Create memory_access table
CREATE TABLE IF NOT EXISTS public.memory_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  access_type TEXT NOT NULL DEFAULT 'view',
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_access ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reflections
CREATE POLICY "Users can view their own reflections" 
ON public.reflections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reflections" 
ON public.reflections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections" 
ON public.reflections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections" 
ON public.reflections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for time_capsules
CREATE POLICY "Users can view their own time capsules" 
ON public.time_capsules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time capsules" 
ON public.time_capsules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time capsules" 
ON public.time_capsules 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time capsules" 
ON public.time_capsules 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for visitors (public read access)
CREATE POLICY "Anyone can view visitor stats" 
ON public.visitors 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert visitor records" 
ON public.visitors 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update visitor records" 
ON public.visitors 
FOR UPDATE 
USING (true);

-- Create RLS policies for memory_access
CREATE POLICY "Users can view access logs for their memories" 
ON public.memory_access 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.memories 
  WHERE memories.id = memory_access.memory_id 
  AND memories.user_id = auth.uid()
));

CREATE POLICY "System can log memory access" 
ON public.memory_access 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.memories 
  WHERE memories.id = memory_access.memory_id 
  AND memories.recipient = 'public'
));

-- Create update triggers for timestamp updates
CREATE TRIGGER update_reflections_updated_at
BEFORE UPDATE ON public.reflections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_capsules_updated_at
BEFORE UPDATE ON public.time_capsules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();