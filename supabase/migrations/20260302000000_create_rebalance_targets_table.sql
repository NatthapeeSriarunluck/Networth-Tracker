-- Create rebalance_targets table
CREATE TABLE IF NOT EXISTS public.rebalance_targets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    category_name TEXT UNIQUE NOT NULL,
    target_percentage NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default categories
INSERT INTO public.rebalance_targets (category_name, target_percentage)
VALUES ('Cash Reserves', 33.33), ('Bitcoin', 33.33), ('U.S Portfolio', 33.34)
ON CONFLICT (category_name) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.rebalance_targets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for now
CREATE POLICY "Allow public access to rebalance_targets" 
ON public.rebalance_targets 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
