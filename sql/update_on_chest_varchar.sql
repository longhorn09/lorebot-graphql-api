-- Migration script to update ON_CHEST column from varchar(40) to varchar(60)
-- MySQL 8.4 compatible

-- Update ON_CHEST column in Person table to varchar(60)
ALTER TABLE `Person` MODIFY COLUMN `ON_CHEST` varchar(60) NULL;

-- Verify the change
-- SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'Person' AND COLUMN_NAME = 'ON_CHEST'; 