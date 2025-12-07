-- Fix document_processing_queue - add unique constraint on document_id for upsert support

-- Add unique constraint on document_id to support ON CONFLICT upserts
ALTER TABLE document_processing_queue
ADD CONSTRAINT document_processing_queue_document_id_key UNIQUE (document_id);
