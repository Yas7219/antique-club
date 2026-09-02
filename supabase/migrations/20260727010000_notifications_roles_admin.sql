-- 1. Roles (separate table + security definer function, avoids privilege-escalation
--    issues you get from storing a role column directly on profiles)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
-- Deliberately no INSERT/UPDATE policy for regular authenticated users: roles are
-- granted from the Supabase SQL editor / by an existing admin via service role,
-- never by the client, so a user can never grant themselves 'admin'.

-- 2. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3. Category follows (lets a buyer flag "I'm interested in this category")
CREATE TABLE public.category_follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES public.categories(slug) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_slug)
);
ALTER TABLE public.category_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own follows" ON public.category_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add follows" ON public.category_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove follows" ON public.category_follows FOR DELETE USING (auth.uid() = user_id);

-- 4. Notify the seller when their KYC submission is approved/rejected
CREATE OR REPLACE FUNCTION public.notify_kyc_decision()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.user_id, 'kyc_approved', 'You are verified',
            'Your identity has been verified. You can now sell, buy and chat.', '/verify');
  ELSIF NEW.status = 'rejected' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (NEW.user_id, 'kyc_rejected', 'Verification rejected',
            COALESCE(NEW.rejection_reason, 'Please try again with a clearer document.'), '/verify');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_kyc_decision
  AFTER INSERT OR UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_kyc_decision();

-- 5. Notify buyers who follow a category when a new active listing appears in it
CREATE OR REPLACE FUNCTION public.notify_category_followers()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT cf.user_id, 'new_listing', 'New piece in a category you follow', NEW.title,
           '/product/' || NEW.id
    FROM public.category_follows cf
    WHERE cf.category_slug = NEW.category_slug
      AND cf.user_id <> NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_category_followers
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.notify_category_followers();

-- 6. Admin moderation access (read/update everything; deletion still restricted)
CREATE POLICY "Admins view all kyc" ON public.kyc_submissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all kyc" ON public.kyc_submissions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all products" ON public.products FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete any product" ON public.products FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
