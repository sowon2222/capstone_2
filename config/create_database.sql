DROP DATABASE IF EXISTS study_platform;
CREATE DATABASE IF NOT EXISTS study_platform;
USE study_platform;

-- Create users table
CREATE TABLE `users` (
  `user_id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create lecture_materials table
CREATE TABLE `lecture_materials` (
  `material_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `material_name` varchar(255) NOT NULL,
  `progress` float NOT NULL DEFAULT 0,
  `page` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `summary` text DEFAULT NULL,
  PRIMARY KEY (`material_id`),
  KEY `idx_materials_user` (`user_id`),
  CONSTRAINT `lecture_materials_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create slides table
CREATE TABLE `slides` (
  `slide_id` BIGINT NOT NULL AUTO_INCREMENT,
  `material_id` BIGINT NOT NULL,
  `slide_number` int(11) NOT NULL,
  `summary` text DEFAULT NULL,
  `original_text` text DEFAULT NULL,
  `slide_title` varchar(255) DEFAULT NULL,
  `concept_explanation` text DEFAULT NULL,
  `main_keywords` varchar(255) DEFAULT NULL,
  `important_sentences` text DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `image_description` TEXT DEFAULT NULL,
  PRIMARY KEY (`slide_id`),
  KEY `idx_slides_material` (`material_id`),
  CONSTRAINT `slides_ibfk_1` FOREIGN KEY (`material_id`) REFERENCES `lecture_materials` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create keywords table
CREATE TABLE `keywords` (
  `keyword_id` BIGINT NOT NULL AUTO_INCREMENT,
  `keyword_name` varchar(255) NOT NULL,
  PRIMARY KEY (`keyword_id`),
  UNIQUE KEY `keyword_name` (`keyword_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create slide_keywords table
CREATE TABLE `slide_keywords` (
  `slide_id` BIGINT NOT NULL,
  `keyword_id` BIGINT NOT NULL,
  PRIMARY KEY (`slide_id`, `keyword_id`),
  FOREIGN KEY (`slide_id`) REFERENCES `slides` (`slide_id`),
  FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`keyword_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create questions table
CREATE TABLE `questions` (
  `question_id` BIGINT NOT NULL AUTO_INCREMENT,
  `slide_id` BIGINT NOT NULL,
  `question_type` VARCHAR(50) NOT NULL,
  `content` text NOT NULL,
  `answer` text NOT NULL,
  `explanation` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `difficulty` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`question_id`),
  KEY `idx_questions_slide` (`slide_id`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`slide_id`) REFERENCES `slides` (`slide_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create question_keywords table
CREATE TABLE `question_keywords` (
  `question_id` BIGINT NOT NULL,
  `keyword_id` BIGINT NOT NULL,
  PRIMARY KEY (`question_id`,`keyword_id`),
  KEY `keyword_id` (`keyword_id`),
  CONSTRAINT `question_keywords_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`),
  CONSTRAINT `question_keywords_ibfk_2` FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`keyword_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create question_attempts table
CREATE TABLE `question_attempts` (
  `attempt_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `question_id` BIGINT NOT NULL,
  `is_correct` tinyint(1) NOT NULL,
  `answer` text DEFAULT NULL,
  `attempt_date` date NOT NULL DEFAULT curdate(),
  PRIMARY KEY (`attempt_id`),
  KEY `question_id` (`question_id`),
  KEY `idx_qa_user_question` (`user_id`,`question_id`),
  CONSTRAINT `question_attempts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `question_attempts_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create daily_study_time table
CREATE TABLE `daily_study_time` (
  `study_date` date NOT NULL,
  `user_id` BIGINT NOT NULL,
  `total_time` int(11) NOT NULL,
  PRIMARY KEY (`study_date`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `daily_study_time_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create study_progress_log table
CREATE TABLE `study_progress_log` (
  `log_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `material_id` BIGINT NOT NULL,
  `study_date` date NOT NULL,
  `progress_delta` float DEFAULT 0,
  `total_progress` float DEFAULT 0,
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `study_progress_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `study_progress_log_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `lecture_materials` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create study_intensity_log table
CREATE TABLE `study_intensity_log` (
  `log_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `study_date` date NOT NULL,
  `intensity_score` float DEFAULT 0,
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `study_intensity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create weak_keyword_logs table
CREATE TABLE `weak_keyword_logs` (
  `log_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `question_id` BIGINT NOT NULL,
  `keyword_id` BIGINT NOT NULL,
  `is_incorrect` tinyint(1) NOT NULL,
  `occurred_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `keyword_id` (`keyword_id`),
  KEY `question_id` (`question_id`),
  KEY `idx_wkl_user_keyword` (`user_id`,`keyword_id`),
  CONSTRAINT `weak_keyword_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `weak_keyword_logs_ibfk_2` FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`keyword_id`),
  CONSTRAINT `weak_keyword_logs_ibfk_3` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create weak_keyword_stats view
CREATE VIEW `weak_keyword_stats` AS 
SELECT 
  `weak_keyword_logs`.`user_id` AS `user_id`,
  `weak_keyword_logs`.`keyword_id` AS `keyword_id`,
  count(0) AS `incorrect_count` 
FROM `weak_keyword_logs` 
WHERE `weak_keyword_logs`.`is_incorrect` = 1 
GROUP BY `weak_keyword_logs`.`user_id`,`weak_keyword_logs`.`keyword_id`;

-- Create focus_sessions table
CREATE TABLE `focus_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `start_time` timestamp NOT NULL,
  `end_time` timestamp NULL DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_interrupted` boolean DEFAULT FALSE,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_focus_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create study_sessions table
CREATE TABLE `study_sessions` (
  `session_id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `material_id` BIGINT NOT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_time` timestamp NULL DEFAULT NULL,
  `total_duration` int(11) DEFAULT 0,
  `status` enum('active','completed') NOT NULL DEFAULT 'active',
  PRIMARY KEY (`session_id`),
  KEY `idx_sessions_user_material` (`user_id`, `material_id`),
  CONSTRAINT `study_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `study_sessions_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `lecture_materials` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

ALTER TABLE lecture_materials ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;