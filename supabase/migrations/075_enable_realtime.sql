-- Migration: 075_enable_realtime.sql
-- Description: Enable Supabase Realtime on key tables for real-time collaboration
-- Created: December 2025

-- =============================================
-- Enable Realtime on High-Priority Tables
-- =============================================

-- Daily reports - collaborative reporting
ALTER PUBLICATION supabase_realtime ADD TABLE daily_reports;

-- Workflow items (RFIs, Submittals) - status updates
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_items;

-- Documents - concurrent viewing, version updates
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Approval requests - action notifications
ALTER PUBLICATION supabase_realtime ADD TABLE approval_requests;

-- Approval actions - when someone approves/rejects
ALTER PUBLICATION supabase_realtime ADD TABLE approval_actions;

-- =============================================
-- Enable Realtime on Medium-Priority Tables
-- =============================================

-- Projects - metadata updates
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- Tasks - status changes
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Messages - real-time chat
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- =============================================
-- Enable Realtime on Additional Collaborative Tables
-- =============================================

-- RFIs dedicated table
ALTER PUBLICATION supabase_realtime ADD TABLE rfis;

-- Submittals dedicated table
ALTER PUBLICATION supabase_realtime ADD TABLE submittals;

-- Change orders
ALTER PUBLICATION supabase_realtime ADD TABLE change_orders;

-- Punch list items
ALTER PUBLICATION supabase_realtime ADD TABLE punch_list_items;

-- Safety incidents
ALTER PUBLICATION supabase_realtime ADD TABLE safety_incidents;

-- =============================================
-- Notifications for real-time alerts
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =============================================
-- Note: Realtime is now enabled on the following tables:
-- - daily_reports
-- - workflow_items
-- - documents
-- - approval_requests
-- - approval_actions
-- - projects
-- - tasks
-- - messages
-- - rfis
-- - submittals
-- - change_orders
-- - punch_list_items
-- - safety_incidents
-- - notifications
--
-- Clients can now subscribe to changes on these tables
-- using Supabase Realtime channels.
-- =============================================
