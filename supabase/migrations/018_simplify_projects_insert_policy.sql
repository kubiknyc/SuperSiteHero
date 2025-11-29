-- Drop the problematic policies
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;

-- Create a simpler policy that avoids RLS recursion
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
