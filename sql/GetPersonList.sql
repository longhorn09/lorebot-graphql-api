DELIMITER $$
CREATE DEFINER=`ntang`@`%` PROCEDURE `GetPersonList`()
BEGIN
	SELECT CHARNAME, submitter, Create_DATE
	from Person
	ORDER by CHARNAME ASC;




END$$
DELIMITER ;
