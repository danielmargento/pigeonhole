ALTER TABLE assignments ADD COLUMN anchor_material_id uuid DEFAULT NULL;
ALTER TABLE bot_configs ADD COLUMN general_chat_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE bot_configs ADD COLUMN general_chat_material_ids uuid[] NOT NULL DEFAULT '{}';
