-- =============================================================
-- EUNPPO OFFICIAL — Supabase 셋업 SQL (표 생성 + 접근 권한)
-- 사용법: Supabase → SQL Editor → 아래 전체 복붙 → Run.
-- 여러 번 다시 실행해도 안전 (CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- 실행 순서
--   1) Supabase → Authentication → Users → Add user 로 관리자 계정 먼저 생성
--      (Auto Confirm User 켜기). 순서를 반대로 하면 본인도 관리자 페이지에 못 들어갑니다.
--   2) 이 파일 실행
--
-- 권한
--   읽기            : 누구나 (사이트 표시용)
--   등록/수정/삭제  : 로그인한 관리자만
--   comments        : 팬이 남겨야 하므로 익명 등록 허용
--   inquiries       : 익명 전송만 허용, 열람은 관리자만 (개인정보)
--
-- 이 사이트가 쓰는 표: profile / notice / schedule / songs / original_songs / viewers / upbo_types / upbo_counts / dress_items / inquiries / overlay_state
-- 이미지는 링크 방식이라 Storage(버킷) 없이 동작합니다.
-- =============================================================


-- ── 프로필 (메인: id=1 한 칸에 JSON 저장) ──
CREATE TABLE IF NOT EXISTS profile (
  id         BIGINT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_all" ON profile;
DROP POLICY IF EXISTS "profile_read" ON profile;
DROP POLICY IF EXISTS "profile_anon_insert" ON profile;
DROP POLICY IF EXISTS "profile_insert" ON profile;
DROP POLICY IF EXISTS "profile_update" ON profile;
DROP POLICY IF EXISTS "profile_delete" ON profile;
CREATE POLICY "profile_read"   ON profile FOR SELECT USING (true);
CREATE POLICY "profile_insert" ON profile FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profile_update" ON profile FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "profile_delete" ON profile FOR DELETE TO authenticated USING (true);


-- ── 공지 ──
CREATE TABLE IF NOT EXISTS notice (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT,
  pinned     BOOLEAN DEFAULT FALSE,
  image_url  TEXT,
  images     JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notice ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE notice ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE notice ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notice_all" ON notice;
DROP POLICY IF EXISTS "notice_read" ON notice;
DROP POLICY IF EXISTS "notice_anon_insert" ON notice;
DROP POLICY IF EXISTS "notice_insert" ON notice;
DROP POLICY IF EXISTS "notice_update" ON notice;
DROP POLICY IF EXISTS "notice_delete" ON notice;
CREATE POLICY "notice_read"   ON notice FOR SELECT USING (true);
CREATE POLICY "notice_insert" ON notice FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notice_update" ON notice FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notice_delete" ON notice FOR DELETE TO authenticated USING (true);


-- ── 일정 (달력) — 색/하이라이트/2부/설명 포함 ──
CREATE TABLE IF NOT EXISTS schedule (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  time        TEXT,
  type        TEXT DEFAULT '일반',          -- 일반 / 특별 / 콜라보 / 휴방
  note        TEXT,
  color       TEXT DEFAULT 'green',
  highlight   BOOLEAN DEFAULT FALSE,
  time2       TEXT,
  title2      TEXT,
  type2       TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- 기간 일정: 비우면 하루, 채우면 그날까지 달력에 띠로 이어짐
-- end_date: empty = single day, set = band across days on the calendar
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE schedule ADD COLUMN IF NOT EXISTS color       TEXT DEFAULT 'green';
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS highlight   BOOLEAN DEFAULT FALSE;
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS time2       TEXT;
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS title2      TEXT;
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS type2       TEXT;
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedule_all" ON schedule;
DROP POLICY IF EXISTS "schedule_read" ON schedule;
DROP POLICY IF EXISTS "schedule_anon_insert" ON schedule;
DROP POLICY IF EXISTS "schedule_insert" ON schedule;
DROP POLICY IF EXISTS "schedule_update" ON schedule;
DROP POLICY IF EXISTS "schedule_delete" ON schedule;
CREATE POLICY "schedule_read"   ON schedule FOR SELECT USING (true);
CREATE POLICY "schedule_insert" ON schedule FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "schedule_update" ON schedule FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "schedule_delete" ON schedule FOR DELETE TO authenticated USING (true);


-- ── 노래책: 커버곡 ──
CREATE TABLE IF NOT EXISTS songs (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  artist     TEXT,
  genre      TEXT DEFAULT '기타',
  difficulty INT  DEFAULT 3,
  memo       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "songs_all" ON songs;
DROP POLICY IF EXISTS "songs_read" ON songs;
DROP POLICY IF EXISTS "songs_anon_insert" ON songs;
DROP POLICY IF EXISTS "songs_insert" ON songs;
DROP POLICY IF EXISTS "songs_update" ON songs;
DROP POLICY IF EXISTS "songs_delete" ON songs;
CREATE POLICY "songs_read"   ON songs FOR SELECT USING (true);
CREATE POLICY "songs_insert" ON songs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "songs_update" ON songs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "songs_delete" ON songs FOR DELETE TO authenticated USING (true);


-- ── 노래책: 오리지널 곡 (SOOP VOD) ──
CREATE TABLE IF NOT EXISTS original_songs (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  vod_id     TEXT,
  thumbnail  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE original_songs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "original_songs_all" ON original_songs;
DROP POLICY IF EXISTS "original_songs_read" ON original_songs;
DROP POLICY IF EXISTS "original_songs_anon_insert" ON original_songs;
DROP POLICY IF EXISTS "original_songs_insert" ON original_songs;
DROP POLICY IF EXISTS "original_songs_update" ON original_songs;
DROP POLICY IF EXISTS "original_songs_delete" ON original_songs;
CREATE POLICY "original_songs_read"   ON original_songs FOR SELECT USING (true);
CREATE POLICY "original_songs_insert" ON original_songs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "original_songs_update" ON original_songs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "original_songs_delete" ON original_songs FOR DELETE TO authenticated USING (true);


-- ── 옷장 (헤어 / 의상 / 렌즈) — 이미지는 image_url(링크) ──
CREATE TABLE IF NOT EXISTS dress_items (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT DEFAULT 'outfit',
  image_url   TEXT,
  badges      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dress_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dress read"   ON dress_items FOR SELECT USING (true);
CREATE POLICY "dress insert" ON dress_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dress update" ON dress_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dress delete" ON dress_items FOR DELETE TO authenticated USING (true);

-- ── 업보: 시청자 ──
CREATE TABLE IF NOT EXISTS viewers (
  id         BIGSERIAL PRIMARY KEY,
  nickname   TEXT NOT NULL,
  soop_id    TEXT,
  memo       TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE viewers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "viewers_all" ON viewers;
DROP POLICY IF EXISTS "viewers_read" ON viewers;
DROP POLICY IF EXISTS "viewers_anon_insert" ON viewers;
DROP POLICY IF EXISTS "viewers_insert" ON viewers;
DROP POLICY IF EXISTS "viewers_update" ON viewers;
DROP POLICY IF EXISTS "viewers_delete" ON viewers;
CREATE POLICY "viewers_read"   ON viewers FOR SELECT USING (true);
CREATE POLICY "viewers_insert" ON viewers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "viewers_update" ON viewers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "viewers_delete" ON viewers FOR DELETE TO authenticated USING (true);


-- ── 업보: 타입(종류) ──
CREATE TABLE IF NOT EXISTS upbo_types (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT DEFAULT '일반',            -- 일반 / 이벤트
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE upbo_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "upbo_types_all" ON upbo_types;
DROP POLICY IF EXISTS "upbo_types_read" ON upbo_types;
DROP POLICY IF EXISTS "upbo_types_anon_insert" ON upbo_types;
DROP POLICY IF EXISTS "upbo_types_insert" ON upbo_types;
DROP POLICY IF EXISTS "upbo_types_update" ON upbo_types;
DROP POLICY IF EXISTS "upbo_types_delete" ON upbo_types;
CREATE POLICY "upbo_types_read"   ON upbo_types FOR SELECT USING (true);
CREATE POLICY "upbo_types_insert" ON upbo_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "upbo_types_update" ON upbo_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "upbo_types_delete" ON upbo_types FOR DELETE TO authenticated USING (true);


-- ── 업보: 카운트 (시청자 × 타입 = 횟수) ──
CREATE TABLE IF NOT EXISTS upbo_counts (
  id         BIGSERIAL PRIMARY KEY,
  viewer_id  BIGINT NOT NULL,
  type_id    BIGINT NOT NULL,
  count      INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (viewer_id, type_id)
);
ALTER TABLE upbo_counts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "upbo_counts_all" ON upbo_counts;
DROP POLICY IF EXISTS "upbo_counts_read" ON upbo_counts;
DROP POLICY IF EXISTS "upbo_counts_anon_insert" ON upbo_counts;
DROP POLICY IF EXISTS "upbo_counts_insert" ON upbo_counts;
DROP POLICY IF EXISTS "upbo_counts_update" ON upbo_counts;
DROP POLICY IF EXISTS "upbo_counts_delete" ON upbo_counts;
CREATE POLICY "upbo_counts_read"   ON upbo_counts FOR SELECT USING (true);
CREATE POLICY "upbo_counts_insert" ON upbo_counts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "upbo_counts_update" ON upbo_counts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "upbo_counts_delete" ON upbo_counts FOR DELETE TO authenticated USING (true);


-- ── 문의함 ──
CREATE TABLE IF NOT EXISTS inquiries (
  id         BIGSERIAL PRIMARY KEY,
  nickname   TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inquiries_all" ON inquiries;
DROP POLICY IF EXISTS "inquiries_read" ON inquiries;
DROP POLICY IF EXISTS "inquiries_anon_insert" ON inquiries;
DROP POLICY IF EXISTS "inquiries_insert" ON inquiries;
DROP POLICY IF EXISTS "inquiries_update" ON inquiries;
DROP POLICY IF EXISTS "inquiries_delete" ON inquiries;
CREATE POLICY "inquiries_read"   ON inquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "inquiries_anon_insert" ON inquiries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "inquiries_insert" ON inquiries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inquiries_update" ON inquiries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inquiries_delete" ON inquiries FOR DELETE TO authenticated USING (true);


-- ── (옷장 OBS 오버레이 쓸 때만) "지금 트는 노래" 상태 1행 ──
CREATE TABLE IF NOT EXISTS public.overlay_state (
  id          INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  song_title  TEXT DEFAULT '',
  song_artist TEXT DEFAULT '',
  is_visible  BOOLEAN DEFAULT FALSE,          -- ⚠️ OBS에 보이려면 true
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO public.overlay_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.overlay_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "overlay_all" ON public.overlay_state;
DROP POLICY IF EXISTS "overlay_state_read" ON public.overlay_state;
DROP POLICY IF EXISTS "overlay_state_anon_insert" ON public.overlay_state;
DROP POLICY IF EXISTS "overlay_state_insert" ON public.overlay_state;
DROP POLICY IF EXISTS "overlay_state_update" ON public.overlay_state;
DROP POLICY IF EXISTS "overlay_state_delete" ON public.overlay_state;
CREATE POLICY "overlay_state_read"   ON public.overlay_state FOR SELECT USING (true);
CREATE POLICY "overlay_state_insert" ON public.overlay_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "overlay_state_update" ON public.overlay_state FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "overlay_state_delete" ON public.overlay_state FOR DELETE TO authenticated USING (true);


-- ── 프로필 기본 행(id=1) 보장 ──
-- ⚠️ 한 Supabase 프로젝트는 "한 사람"에게만 쓰세요.
--    이미 다른 사람 데이터가 들어있는 프로젝트를 재사용하면, 아래 INSERT는
--    DO NOTHING 때문에 옛 데이터를 덮어쓰지 않습니다(= 프사·이름이 옛 사람으로 보임).
--    새 사람으로 갈아끼울 땐, 아래 줄의 맨 앞 '--' 를 지워서 한 번 실행하면 프로필이 비워집니다.
-- DELETE FROM profile WHERE id = 1;
INSERT INTO profile (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING;

-- 확인용
-- SELECT tablename, policyname, cmd, roles FROM pg_policies
--   WHERE schemaname='public' ORDER BY tablename, cmd;
