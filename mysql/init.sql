CREATE DATABASE IF NOT EXISTS travel_diary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

DROP USER IF EXISTS 'travel_user'@'%';
DROP USER IF EXISTS 'travel_user'@'localhost';

CREATE USER 'travel_user'@'%' IDENTIFIED WITH mysql_native_password BY 'travel_pass';
CREATE USER 'travel_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'travel_pass';

GRANT ALL PRIVILEGES ON travel_diary.* TO 'travel_user'@'%';
GRANT ALL PRIVILEGES ON travel_diary.* TO 'travel_user'@'localhost';

FLUSH PRIVILEGES;
