-- Migration script to move ON_CHEST column from Lore table to Person table
-- MySQL 8.4 compatible

-- Step 1: Drop ON_CHEST column from Lore table
ALTER TABLE `Lore` DROP COLUMN `ON_CHEST`;

-- Step 2: Add ON_CHEST column to Person table
ALTER TABLE `Person` ADD COLUMN `ON_CHEST` varchar(60) NULL;

-- Verify the changes
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'Lore' AND COLUMN_NAME = 'ON_CHEST';

-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'Person' AND COLUMN_NAME = 'ON_CHEST'; 