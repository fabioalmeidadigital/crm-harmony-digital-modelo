DELETE FROM chat_messages WHERE conversation_id = '444e3235-3a05-499d-acfa-92769a1d0b23';
DELETE FROM chat_conversations WHERE id = '444e3235-3a05-499d-acfa-92769a1d0b23';
DELETE FROM lead_notes WHERE lead_id = 'bf427e29-1802-4c3d-972b-e0a2ce1018d3';
DELETE FROM lead_attachments WHERE lead_id = 'bf427e29-1802-4c3d-972b-e0a2ce1018d3';
DELETE FROM appointments WHERE lead_id = 'bf427e29-1802-4c3d-972b-e0a2ce1018d3';
DELETE FROM leads WHERE id = 'bf427e29-1802-4c3d-972b-e0a2ce1018d3';