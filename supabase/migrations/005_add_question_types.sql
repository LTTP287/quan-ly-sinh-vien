-- Migration to add new question types and image support
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'short_answer';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'long_answer';

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url TEXT;
