-- ============================================
-- Migration 013: ICR History Table
-- ============================================
-- Description: Create table for storing Internet Credit Rate (ICR) historical data
-- Date: 2026-02-11
-- ============================================

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS public.icr_history CASCADE;

-- Create ICR History table
CREATE TABLE public.icr_history (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    icr_value NUMERIC(10, 4) NOT NULL,
    confidence_interval NUMERIC(10, 4),
    source_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for timestamp queries
CREATE INDEX idx_icr_history_timestamp ON public.icr_history(timestamp DESC);

-- Add comment
COMMENT ON TABLE public.icr_history IS 'Historical Internet Credit Rate (ICR) data with confidence intervals and source information';
COMMENT ON COLUMN public.icr_history.icr_value IS 'Internet Credit Rate value in basis points';
COMMENT ON COLUMN public.icr_history.confidence_interval IS 'Confidence interval for the ICR value';
COMMENT ON COLUMN public.icr_history.source_data IS 'JSON data containing source protocols, rates, TVL, and weights';

-- Grant permissions
GRANT SELECT, INSERT ON public.icr_history TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.icr_history_id_seq TO anon, authenticated;
