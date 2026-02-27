-- Create networth_entries table
CREATE TABLE IF NOT EXISTS public.networth_entries (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "Year" INTEGER NOT NULL,
    "Month" INTEGER NOT NULL,
    "Cash Reserves" NUMERIC DEFAULT 0,
    "Bitcoin" NUMERIC DEFAULT 0,
    "U.S Portfolio" NUMERIC DEFAULT 0,
    "Liabilities" NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint for Year and Month
    UNIQUE ("Year", "Month")
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.networth_entries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for now (you should refine this later)
CREATE POLICY "Allow public access to networth_entries" 
ON public.networth_entries 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
