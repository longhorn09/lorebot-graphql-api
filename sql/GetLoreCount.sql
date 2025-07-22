DELIMITER $$
CREATE DEFINER=`ntang`@`%` PROCEDURE `GetLoreCount`()
BEGIN
	select count(*) as LoreCount from Lore;
END$$
DELIMITER ;
