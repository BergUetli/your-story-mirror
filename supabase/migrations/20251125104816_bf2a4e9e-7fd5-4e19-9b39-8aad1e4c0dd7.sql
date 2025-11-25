-- Fix existing memories with null show_on_timeline values
UPDATE memories
SET show_on_timeline = COALESCE(show_on_timeline, 
  CASE 
    WHEN status = 'complete' AND memory_date IS NOT NULL THEN true
    ELSE false
  END
)
WHERE show_on_timeline IS NULL;

-- Ensure all complete memories with dates show on timeline
UPDATE memories
SET show_on_timeline = true
WHERE status = 'complete' 
  AND memory_date IS NOT NULL 
  AND show_on_timeline = false;