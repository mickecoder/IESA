-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 11, 2026 at 10:31 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `evaluation_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `campuses`
--

CREATE TABLE `campuses` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `campuses`
--

INSERT INTO `campuses` (`id`, `name`) VALUES
(1, 'Mekanisa '),
(2, 'Olympia'),
(3, 'Megenagna'),
(4, 'Kality');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int(11) NOT NULL,
  `course_code` varchar(20) NOT NULL,
  `course_name` varchar(255) NOT NULL,
  `instructor_id` int(11) DEFAULT NULL,
  `section_id` int(11) DEFAULT NULL,
  `dept_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `course_code`, `course_name`, `instructor_id`, `section_id`, `dept_id`) VALUES
(1, 'COSC311', 'Data Structures & Algorithms', 1, 1, NULL),
(2, 'COSC412', 'Software Engineering', 2, 1, NULL),
(3, 'COSC221', 'Database Systems', 2, 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `criteria`
--

CREATE TABLE `criteria` (
  `id` int(11) NOT NULL,
  `question` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `criteria`
--

INSERT INTO `criteria` (`id`, `question`) VALUES
(1, 'The instructor starts and ends classes on time.'),
(2, 'The instructor explains complex topics in an easy-to-understand way.'),
(3, 'The instructor is well-prepared for every lecture.'),
(4, 'The instructor encourages students to ask questions and participate.'),
(5, 'The instructor uses relevant teaching aids (PPT, whiteboard, etc.) effectively.'),
(6, 'The instructor is available for consultation outside of class hours.'),
(7, 'The instructor provides clear and timely feedback on assignments.'),
(8, 'The instructor demonstrates deep knowledge of the subject matter.'),
(9, 'The instructor treats all students with respect and fairness.'),
(10, 'The course materials (handouts/notes) provided are helpful for learning.');

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `dept_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `dean_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`dept_id`, `name`, `location`, `dean_id`) VALUES
(1, 'Computer Science', 'Off-201', NULL),
(2, 'Accounting & Finance', 'Off-105', NULL),
(3, 'Marketing Management', 'Off-203', NULL),
(4, 'Business Management', 'Off-210', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `evaluations`
--

CREATE TABLE `evaluations` (
  `id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `instructor_id` int(11) DEFAULT NULL,
  `course_id` int(11) DEFAULT NULL,
  `criteria_id` int(11) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `comments` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `evaluations`
--

INSERT INTO `evaluations` (`id`, `student_id`, `instructor_id`, `course_id`, `criteria_id`, `rating`, `comments`) VALUES
(1, 1, 2, 2, 1, 2, 'great! at all'),
(2, 1, 2, 2, 2, 3, 'great! at all'),
(3, 1, 2, 2, 3, 2, 'great! at all'),
(4, 1, 2, 2, 4, 1, 'great! at all'),
(5, 1, 2, 2, 5, 4, 'great! at all'),
(6, 1, 2, 2, 6, 4, 'great! at all'),
(7, 1, 2, 2, 7, 3, 'great! at all'),
(8, 1, 2, 2, 8, 4, 'great! at all'),
(9, 1, 2, 2, 9, 1, 'great! at all'),
(10, 1, 2, 2, 10, 4, 'great! at all'),
(11, 1, 1, 1, NULL, NULL, 'great at all !'),
(12, 1, 1, 1, NULL, NULL, 'great at all !'),
(13, 1, 1, 1, NULL, NULL, ''),
(14, 1, 1, 1, NULL, NULL, 'Great! at all'),
(15, 1, 1, 1, NULL, NULL, 'Great! at all'),
(16, 1, 1, 1, 1, 1, 'Best teacher'),
(17, 1, 1, 1, 2, 3, 'Best teacher'),
(18, 1, 1, 1, 3, 3, 'Best teacher'),
(19, 1, 1, 1, 4, 2, 'Best teacher'),
(20, 1, 1, 1, 5, 1, 'Best teacher'),
(21, 1, 1, 1, 6, 3, 'Best teacher'),
(22, 1, 1, 1, 7, 2, 'Best teacher'),
(23, 1, 1, 1, 8, 4, 'Best teacher'),
(24, 1, 1, 1, 9, 2, 'Best teacher'),
(25, 1, 1, 1, 10, 3, 'Best teacher');

-- --------------------------------------------------------

--
-- Table structure for table `instructor`
--

CREATE TABLE `instructor` (
  `instructor_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `rank` varchar(100) DEFAULT NULL,
  `dept_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `instructor`
--

INSERT INTO `instructor` (`instructor_id`, `user_id`, `name`, `department`, `rank`, `dept_id`) VALUES
(1, NULL, 'Girmay', 'Computer Science', 'Professor', NULL),
(2, NULL, 'Fedlu', 'Accounting and Finance', 'Assistant Professor', NULL);

-- --------------------------------------------------------

--
-- Stand-in structure for view `instructor_performance`
-- (See below for the actual view)
--
CREATE TABLE `instructor_performance` (
`instructor_id` int(11)
,`course_id` int(11)
,`overall_score` decimal(14,4)
,`grade` varchar(9)
);

-- --------------------------------------------------------

--
-- Table structure for table `sections`
--

CREATE TABLE `sections` (
  `id` int(11) NOT NULL,
  `campus_id` int(11) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sections`
--

INSERT INTO `sections` (`id`, `campus_id`, `name`) VALUES
(1, NULL, 'CoSc_2018_A'),
(2, NULL, 'CoSc_2018_B');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email_or_id` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','department','instructor','student') NOT NULL,
  `campus_id` int(11) DEFAULT NULL,
  `section_id` int(11) DEFAULT NULL,
  `dept_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email_or_id`, `password`, `role`, `campus_id`, `section_id`, `dept_id`) VALUES
(1, 'AD/0204/16', '12345', 'student', 1, 1, NULL),
(2, 'DptHeadAcct', 'password123', 'department', NULL, NULL, 2),
(3, 'SuperAdmin', 'admin123', 'admin', NULL, NULL, NULL),
(4, 'INST/001', 'password123', 'instructor', 1, 1, NULL);

-- --------------------------------------------------------

--
-- Structure for view `instructor_performance`
--
DROP TABLE IF EXISTS `instructor_performance`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `instructor_performance`  AS SELECT `evaluations`.`instructor_id` AS `instructor_id`, `evaluations`.`course_id` AS `course_id`, avg(`evaluations`.`rating`) AS `overall_score`, CASE WHEN avg(`evaluations`.`rating`) >= 4.5 THEN 'Excellent' WHEN avg(`evaluations`.`rating`) >= 3.5 THEN 'Very Good' ELSE 'Good' END AS `grade` FROM `evaluations` GROUP BY `evaluations`.`instructor_id`, `evaluations`.`course_id` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `campuses`
--
ALTER TABLE `campuses`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `course_code` (`course_code`),
  ADD KEY `instructor_id` (`instructor_id`),
  ADD KEY `section_id` (`section_id`),
  ADD KEY `dept_id` (`dept_id`);

--
-- Indexes for table `criteria`
--
ALTER TABLE `criteria`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`dept_id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `dean_id` (`dean_id`);

--
-- Indexes for table `evaluations`
--
ALTER TABLE `evaluations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_student_course_criteria` (`student_id`,`course_id`,`criteria_id`),
  ADD KEY `instructor_id` (`instructor_id`),
  ADD KEY `course_id` (`course_id`),
  ADD KEY `criteria_id` (`criteria_id`);

--
-- Indexes for table `instructor`
--
ALTER TABLE `instructor`
  ADD PRIMARY KEY (`instructor_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `dept_id` (`dept_id`);

--
-- Indexes for table `sections`
--
ALTER TABLE `sections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `campus_id` (`campus_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email_or_id` (`email_or_id`),
  ADD KEY `campus_id` (`campus_id`),
  ADD KEY `section_id` (`section_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `campuses`
--
ALTER TABLE `campuses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `criteria`
--
ALTER TABLE `criteria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `dept_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `evaluations`
--
ALTER TABLE `evaluations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `instructor`
--
ALTER TABLE `instructor`
  MODIFY `instructor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sections`
--
ALTER TABLE `sections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `courses`
--
ALTER TABLE `courses`
  ADD CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `courses_ibfk_2` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `courses_ibfk_3` FOREIGN KEY (`dept_id`) REFERENCES `departments` (`dept_id`);

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`dean_id`) REFERENCES `instructor` (`instructor_id`) ON DELETE SET NULL;

--
-- Constraints for table `evaluations`
--
ALTER TABLE `evaluations`
  ADD CONSTRAINT `evaluations_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `evaluations_ibfk_2` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `evaluations_ibfk_3` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`),
  ADD CONSTRAINT `evaluations_ibfk_4` FOREIGN KEY (`criteria_id`) REFERENCES `criteria` (`id`);

--
-- Constraints for table `instructor`
--
ALTER TABLE `instructor`
  ADD CONSTRAINT `instructor_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `instructor_ibfk_2` FOREIGN KEY (`dept_id`) REFERENCES `departments` (`dept_id`);

--
-- Constraints for table `sections`
--
ALTER TABLE `sections`
  ADD CONSTRAINT `sections_ibfk_1` FOREIGN KEY (`campus_id`) REFERENCES `campuses` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`campus_id`) REFERENCES `campuses` (`id`),
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
