# Chat Storage Bucket Setup

## Overview

The chat system requires a Supabase Storage bucket for file attachments (images, documents, etc.). This guide walks you through setting up the `chat-attachments` bucket with proper security policies.

## Prerequisites

- Supabase project with migration 022_chat_system applied
- Admin access to Supabase Dashboard
- Chat tables created (chat_channels, chat_channel_members, chat_messages, etc.)

## Setup Steps

### Step 1: Create Storage Bucket

1. Open your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"Create a new bucket"** button
4. Configure the bucket:
   - **Name:** `chat-attachments`
   - **Public bucket:** ❌ No (keep it private)
   - **Allowed MIME types:** Leave empty or All (recommended) for flexibility
   - **File size limit:** `31457280` bytes (30 MB)
5. Click **Create bucket**

### Step 2: Configure Bucket Settings

After creating the bucket, click on it and verify:

- **Max file size:** 30 MB (31457280 bytes)
- **Bucket visibility:** Private
- **Path structure:** Recommended: `{channel_id}/{message_id}/{filename}`

### Step 3: Set Up RLS Policies

Navigate to the **Policies** tab for the `chat-attachments` bucket and create the following policies:

#### Policy 1: Upload Attachments (INSERT)

**Name:** `Users can upload chat attachments`
**Allowed operation:** INSERT
**Policy definition:**

```sql
(
  bucket_id = 'chat-attachments' AND
  auth.uid() IN (
    SELECT ccm.user_id
    FROM chat_channel_members ccm
    JOIN chat_channels cc ON ccm.channel_id = cc.id
    WHERE cc.id = (storage.foldername(name))[1]::uuid
  )
)
```

**Explanation:** Users can only upload files to channels they're members of. The folder name must be the channel ID.

#### Policy 2: View Attachments (SELECT)

**Name:** `Users can view chat attachments`
**Allowed operation:** SELECT
**Policy definition:**

```sql
(
  bucket_id = 'chat-attachments' AND
  auth.uid() IN (
    SELECT ccm.user_id
    FROM chat_channel_members ccm
    JOIN chat_channels cc ON ccm.channel_id = cc.id
    WHERE cc.id = (storage.foldername(name))[1]::uuid
  )
)
```

**Explanation:** Users can only view/download files from channels they're members of.

#### Policy 3: Delete Attachments (DELETE)

**Name:** `Message senders can delete their attachments`
**Allowed operation:** DELETE
**Policy definition:**

```sql
(
  bucket_id = 'chat-attachments' AND
  auth.uid() = (
    SELECT cm.user_id
    FROM chat_messages cm
    WHERE cm.id = (storage.foldername(name))[2]::uuid
  )
)
```

**Explanation:** Only the user who sent the message can delete attachments from that message.

### Step 4: Test Upload

Test that the bucket is working correctly:

1. Go to the chat interface
2. Try uploading a test file (image or PDF)
3. Verify the file appears in the bucket with path: `{channel_id}/{message_id}/{filename}`
4. Verify other channel members can view/download it
5. Verify non-members cannot access it

## File Storage Structure

Files are stored with the following path pattern:

```
chat-attachments/
  ├── {channel_id}/
  │   ├── {message_id}/
  │   │   ├── file1.jpg
  │   │   ├── document.pdf
  │   │   └── screenshot.png
  │   └── {another_message_id}/
  │       └── attachment.docx
  └── {another_channel_id}/
      └── ...
```

### Benefits of this structure:

- ✅ Easy RLS policy enforcement (check channel membership)
- ✅ Organized by channel and message
- ✅ Simple cleanup when messages/channels are deleted
- ✅ Prevents naming conflicts

## Supported File Types

The chat system supports:

- **Images:** .jpg, .jpeg, .png, .gif, .webp, .svg
- **Documents:** .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx
- **Archives:** .zip, .rar, .7z
- **Text:** .txt, .csv, .json, .md
- **Other:** Any file type up to 30 MB

## File Size Limits

- **Maximum file size:** 30 MB (31,457,280 bytes)
- **Per message:** Unlimited attachments (but consider UX)
- **Recommended:** 2-5 attachments per message for optimal loading

## Security Considerations

### RLS Policies

- ✅ Only channel members can upload files
- ✅ Only channel members can view files
- ✅ Only message sender can delete files
- ✅ Files are private by default (not publicly accessible)

### File Validation

The frontend should validate:

1. File size before upload (max 30 MB)
2. File type (if restrictions needed)
3. Virus scanning (recommended for production)
4. Malicious filename prevention

### CORS Configuration

If accessing from different domains, configure CORS in Supabase:

```json
{
  "allowedOrigins": ["https://yourdomain.com"],
  "allowedMethods": ["GET", "POST", "DELETE"],
  "allowedHeaders": ["*"],
  "maxAge": 3600
}
```

## Troubleshooting

### Upload Fails with "Permission Denied"

**Cause:** User is not a member of the channel
**Solution:** Verify user is in `chat_channel_members` table for that channel

### Upload Fails with "File Too Large"

**Cause:** File exceeds 30 MB limit
**Solution:** Compress file or split into smaller chunks

### Cannot View Uploaded Files

**Cause:** RLS policy preventing access
**Solution:** Verify SELECT policy is correctly configured and user is channel member

### Files Not Appearing in Chat

**Cause:** Attachment metadata not saved to chat_messages table
**Solution:** Ensure `attachments` JSONB field is properly updated after upload

## Cleanup & Maintenance

### Automatic Cleanup

Consider implementing automatic cleanup for:

- Deleted messages (remove associated files)
- Deleted channels (remove all files)
- Archived channels (optional: move to cold storage)

### Example cleanup function:

```sql
CREATE OR REPLACE FUNCTION cleanup_deleted_message_attachments()
RETURNS void AS $$
BEGIN
  -- Delete storage files for messages deleted > 30 days ago
  -- (Implement based on your retention policy)
END;
$$ LANGUAGE plpgsql;
```

### Manual Cleanup

To manually remove orphaned files:

1. Go to Storage → chat-attachments
2. Find folders without corresponding channels
3. Manually delete orphaned folders

## Monitoring

Monitor storage usage:

- **Dashboard:** Supabase Dashboard → Storage → Usage
- **Alerts:** Set up alerts for storage quota
- **Logs:** Review upload/download logs for suspicious activity

## Next Steps

After setting up storage:

1. ✅ Test file uploads in chat
2. ✅ Verify RLS policies work correctly
3. ✅ Set up monitoring and alerts
4. ✅ Implement cleanup procedures
5. ✅ Consider CDN for performance (optional)

## Support

If you encounter issues:

- Check Supabase Storage documentation: https://supabase.com/docs/guides/storage
- Review RLS policy logs
- Test policies using Supabase SQL Editor
- Contact support with bucket/policy details

---

**Setup Status:** ⚠️ Manual setup required
**Estimated Time:** 10 minutes
**Required After:** Migration 022_chat_system applied
