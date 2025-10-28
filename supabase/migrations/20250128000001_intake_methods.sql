-- Create storage bucket for intake files
INSERT INTO
  storage.buckets (id, name, public)
VALUES
  ('intake-files', 'intake-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own project folders
CREATE POLICY "Users can upload intake files" ON storage.objects FOR INSERT TO authenticated
WITH
  CHECK (
    bucket_id = 'intake-files'
    AND (storage.foldername (name)) [1] IN (
      SELECT
        id::text
      FROM
        funnel_projects
      WHERE
        user_id = auth.uid ()
    )
  );

-- Allow users to read their own intake files
CREATE POLICY "Users can read their intake files" ON storage.objects FOR
SELECT
  TO authenticated USING (
    bucket_id = 'intake-files'
    AND (storage.foldername (name)) [1] IN (
      SELECT
        id::text
      FROM
        funnel_projects
      WHERE
        user_id = auth.uid ()
    )
  );

-- Allow users to delete their own intake files
CREATE POLICY "Users can delete their intake files" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'intake-files'
  AND (storage.foldername (name)) [1] IN (
    SELECT
      id::text
    FROM
      funnel_projects
    WHERE
      user_id = auth.uid ()
  )
);
