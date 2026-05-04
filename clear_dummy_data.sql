-- ============================================================
-- SQL SCRIPT: Clear Dummy Data (Kerusakan & Aset)
-- ============================================================
-- INSTRUKSI: Copy-paste SELURUH script ini ke SQL Editor di Supabase
-- Buka: https://supabase.com → Project Anda → SQL Editor → New Query → Paste → Run
-- 
-- PERHATIAN: Script ini akan MENGHAPUS SEMUA data kerusakan, aset, dan hasil scan/inspeksi.
-- Data jalan tol (toll_roads) dan segmen (road_segments) TIDAK AKAN DIHAPUS.
-- Script ini menggunakan blok DO agar tidak error jika ada tabel yang belum dibuat.
-- ============================================================

DO $$ 
BEGIN
    -- 1. Hapus data laporan kerusakan (Dummy & AI Detections)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'damage_reports') THEN
        DELETE FROM damage_reports;
    END IF;

    -- 2. Hapus data aset tol (Dummy)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'toll_assets') THEN
        DELETE FROM toll_assets;
    END IF;

    -- 3. Hapus data event deteksi (Pipeline AI)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'detection_events') THEN
        DELETE FROM detection_events;
    END IF;

    -- 4. Hapus data bounding box/mask deteksi (Pipeline AI)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'detections') THEN
        DELETE FROM detections;
    END IF;

    -- 5. Hapus data gambar inspeksi (Pipeline AI)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inspection_images') THEN
        DELETE FROM inspection_images;
    END IF;

    -- 6. Hapus data sesi inspeksi video/kamera (Pipeline AI)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inspection_sessions') THEN
        DELETE FROM inspection_sessions;
    END IF;

    -- 7. (Opsional) Hapus sesi scan lama jika menggunakan tabel scan_sessions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scan_sessions') THEN
        DELETE FROM scan_sessions;
    END IF;
END $$;

-- ============================================================
-- SELESAI. Semua data kerusakan dan aset dummy telah dihapus.
-- ============================================================
