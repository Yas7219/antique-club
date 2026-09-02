-- 1. Add nationality column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality TEXT;

-- 2. KYC submissions table
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('cin','passport')),
  document_url TEXT NOT NULL,
  extracted_name TEXT,
  extracted_nationality TEXT,
  extracted_doc_number TEXT,
  extracted_expiry DATE,
  ai_confidence NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own kyc"
  ON public.kyc_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own kyc"
  ON public.kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER kyc_touch_updated
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Trigger: block Israeli nationality / sync profile.kyc_status when KYC approved
CREATE OR REPLACE FUNCTION public.kyc_validate_and_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block Israeli nationality at DB level (defense in depth)
  IF NEW.extracted_nationality IS NOT NULL
     AND lower(NEW.extracted_nationality) IN ('israel','israeli','il','isr','ישראל') THEN
    NEW.status := 'rejected';
    NEW.rejection_reason := 'Service not available in your region.';
  END IF;

  -- When approved, sync profile
  IF NEW.status = 'approved' THEN
    UPDATE public.profiles
      SET kyc_status = 'verified',
          verified = true,
          nationality = NEW.extracted_nationality
      WHERE id = NEW.user_id;
  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.profiles
      SET kyc_status = 'rejected'
      WHERE id = NEW.user_id;
  ELSE
    UPDATE public.profiles
      SET kyc_status = 'pending'
      WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER kyc_validate_before_write
  BEFORE INSERT OR UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.kyc_validate_and_sync();

-- 4. Private storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own kyc docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own kyc docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own kyc docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );