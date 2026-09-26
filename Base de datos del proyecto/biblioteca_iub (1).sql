-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 24-07-2025 a las 19:54:59
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `biblioteca_iub`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `contratistas`
--

CREATE TABLE `contratistas` (
  `ID` int(11) NOT NULL,
  `Editorial` varchar(100) NOT NULL,
  `NIT` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `dispositivos`
--

CREATE TABLE `dispositivos` (
  `id` int(11) NOT NULL,
  `tipo` enum('Tablet','Computador') NOT NULL,
  `marca` varchar(100) NOT NULL,
  `modelo` varchar(100) NOT NULL,
  `sede` enum('Soledad','Barranquilla','Colsamiro') NOT NULL,
  `estado` enum('Disponible','Prestado','Dañado','En Mantenimiento') NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `dispositivos`
--

INSERT INTO `dispositivos` (`id`, `tipo`, `marca`, `modelo`, `sede`, `estado`, `observaciones`, `created_at`, `updated_at`) VALUES
(1, 'Computador', 'Dell', 'OptiPlex 7001', 'Soledad', 'Disponible', NULL, '2025-07-24 02:14:51', '2025-07-23 19:23:20'),
(2, 'Computador', 'Dell', 'OptiPlex 7002', 'Soledad', 'Disponible', NULL, '2025-07-24 04:43:44', '2025-07-24 04:43:44'),
(3, 'Computador', 'Dell', 'OptiPlex 7003', 'Soledad', 'Disponible', NULL, '2025-07-24 04:45:19', '2025-07-24 04:45:19'),
(4, 'Computador', 'Dell', 'OptiPlex 7004', 'Soledad', 'Disponible', NULL, '2025-07-24 04:45:19', '2025-07-24 04:45:19'),
(5, 'Computador', 'Dell', 'OptiPlex 7005', 'Soledad', 'Disponible', NULL, '2025-07-24 04:47:07', '2025-07-24 04:47:07'),
(6, 'Computador', 'HP', 'EliteDesk 801', 'Barranquilla', 'Disponible', NULL, '2025-07-24 04:47:25', '2025-07-24 04:47:25'),
(7, 'Computador', 'HP', 'EliteDesk 802', 'Barranquilla', 'Disponible', NULL, '2025-07-24 04:47:25', '2025-07-24 04:47:25'),
(8, 'Computador', 'HP', 'EliteDesk 803', 'Barranquilla', 'Disponible', NULL, '2025-07-24 04:48:14', '2025-07-24 04:48:14'),
(9, 'Computador', 'HP', 'EliteDesk 804', 'Barranquilla', 'Disponible', NULL, '2025-07-24 04:48:14', '2025-07-23 22:13:49'),
(10, 'Computador', 'HP', 'EliteDesk 805', 'Barranquilla', 'Disponible', NULL, '2025-07-24 04:48:56', '2025-07-24 04:48:56'),
(11, 'Tablet', 'Samsung', 'Galaxy Tab S6', 'Colsamiro', 'Disponible', NULL, '2025-07-24 04:49:14', '2025-07-24 04:49:14'),
(12, 'Tablet', 'Samsung', 'Galaxy Tab S7', 'Colsamiro', 'Disponible', NULL, '2025-07-24 04:49:14', '2025-07-23 22:55:04'),
(13, 'Tablet', 'Samsung', 'Galaxy Tab S8', 'Colsamiro', 'Disponible', NULL, '2025-07-24 04:50:33', '2025-07-24 04:50:33'),
(14, 'Tablet', 'Samsung', 'Galaxy Tab S9', 'Colsamiro', 'Disponible', NULL, '2025-07-24 04:50:33', '2025-07-23 22:53:55'),
(15, 'Tablet', 'Samsung', 'Galaxy Tab S6', 'Colsamiro', 'Disponible', NULL, '2025-07-24 04:55:58', '2025-07-23 22:17:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `library_access`
--

CREATE TABLE `library_access` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` varchar(255) NOT NULL,
  `status` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `library_access`
--

INSERT INTO `library_access` (`id`, `user_id`, `message`, `status`, `created_at`, `updated_at`) VALUES
(1, 6, 'Acceso a biblioteca', 1, '2025-04-22 21:49:04', '2025-04-22 21:49:04'),
(2, 8, 'Acceso a biblioteca', 1, '2025-04-22 22:03:06', '2025-04-22 22:03:06'),
(3, 7, 'Acceso a biblioteca', 1, '2025-04-22 22:34:52', '2025-04-22 22:34:52');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `libros`
--

CREATE TABLE `libros` (
  `ID` int(11) NOT NULL,
  `Autor` varchar(255) NOT NULL,
  `Titulo` varchar(255) NOT NULL,
  `Programa` varchar(100) DEFAULT NULL,
  `Item` int(11) DEFAULT NULL,
  `Signatura` varchar(50) NOT NULL,
  `Areas` int(11) DEFAULT NULL,
  `Ejemplar` int(11) DEFAULT NULL,
  `Editorial` varchar(100) DEFAULT NULL,
  `Año` year(4) NOT NULL,
  `Idioma` varchar(50) DEFAULT NULL,
  `Observaciones` varchar(50) DEFAULT NULL,
  `Precio` varchar(50) DEFAULT NULL,
  `Proveedor` varchar(100) DEFAULT NULL,
  `Registro_en_linea` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `libros`
--

INSERT INTO `libros` (`ID`, `Autor`, `Titulo`, `Programa`, `Item`, `Signatura`, `Areas`, `Ejemplar`, `Editorial`, `Año`, `Idioma`, `Observaciones`, `Precio`, `Proveedor`, `Registro_en_linea`) VALUES
(627, 'Viqueira García, Vanessa.', 'Coordinación y dinamización del equipo de monitores de tiempo libre MF1870_3', 'Licenciatura En Educación Básica Primaria', 1, '	371.36/V812', 300, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17043'),
(431, 'Arroyo, Ruth', 'Felicidad y equilibrio de vida. Una aproximación al bienestar personal', 'Básicas y transversales', 1, '\n158.1/AR779', 100, 1, 'Ecoe', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                70.600,00', 'Ecoe', ' '),
(540, 'Sacanell, Enrique', 'Cómo se lo digo?', 'Básicas y transversales', 1, '\n302.2/S119/2018', 300, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                60.000,00', 'Ecoe', ' '),
(348, 'Carretero Peña, Antonio', 'Aspectos ambientales. Identificacion y evaluacion  2ed.', 'Básicas y transversales', 1, '\n333.72/C315', 300, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                   7.200,00', 'Alpha Editorial', ''),
(343, 'Martin, Danielle', 'Empieza a crear una guia para acercar los jovenes al mundo maker 1ed.', 'Básicas y transversales', 1, '\n370.118/M379', 300, 1, 'Alpha Editorial', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                90.000,00', 'Alpha Editorial', ''),
(709, 'Zapata Sanchez, Pedro', 'Contabilidad General', 'Técnica Profesional En Operaciones Del Comercio Exterior', 1, '\n657/Z35', 600, 1, 'Alfa Editorial', '2024', 'Español', 'Libros Comprados - 2024-3', ' $150.000,00 ', 'Alfa Editorial', '16829'),
(346, 'Jijena Sanchez, Rosario', 'Como organizar eventos con exito  2ed.', 'Administración de Negocios Internacionales', 1, '\n658.456/J61', 600, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                80.000,00', 'Alpha Editorial', ''),
(344, ' Di Génova, Antonio Ezequiel', 'Ceremonial empresarial el ceremonial de relaciones publicas 1ed.', 'Gestión Empresarial', 1, '\n659.2/D536', 600, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                65.000,00', 'Alpha Editorial', ''),
(130, 'BEAUREGARD,Fraleigh', 'Algebra Lineal', 'Básicas y transversales', 1, '  512.5/F812', 500, 1, 'Assison-Wesley', '1989', 'Español', 'Donación 2023-3', '$- ', 'Assison-Wesley', ''),
(239, 'BERTOLINE, Gary', 'Dibujo en Ingeniería y Comunicación Gráfica', 'Básicas y transversales', 1, '  604.2/B546', 600, 1, 'McGraw-Hill', '1999', 'Español', 'Donación 2023-3', ' $  ', 'McGraw-Hill', ' '),
(237, 'Aguilera, Jorge', 'El factor Proactivo', 'Básicas y transversales', 1, ' 158.1/AG283', 100, 1, 'Ediciones Díaz de Santos ', '2015', 'Español', 'Donación 2023-3', '', 'Ediciones Díaz de Santos ', ''),
(188, 'Santorlosa, Maria V.', 'Tradicion filosofica española y modernidad incipiente en el ambito academico de cordoba (1813-1823)', 'Básicas y transversales', 1, ' 190.946/SA237', 100, 1, 'Ediciones FEPAI', '2016', 'Español', 'Donación 2023-3', '$- ', 'Ediciones FEPAI', ''),
(226, 'GUSTAVO ENCISO', 'Tejiendo la paz recuperacion de los derechos humanos ', 'Básicas y transversales', 1, ' 303.660986/G982', 300, 1, 'Personeria juridica', '2017', 'Español', 'Donación 2023-3', '$- ', 'Personeria juridica', ' '),
(233, 'Ana Graue', 'Fundamentos de Economía', 'Básicas y transversales', 1, ' 330/AN532', 300, 1, 'Pearson', '2009', 'Español', 'Donación 2023-3', '$- ', 'Pearson', ' '),
(227, 'Ripoll, María', 'Moliendo caña: El desarrollo de la industria azucarera en el Valle del Cauca. El caso de la Manuelita S.A., 1901-2018', 'Básicas y transversales', 1, ' 338.17361/R592', 300, 1, 'Universidad Tecnológica de Bolivar ', '2022', 'Español', 'Donación 2023-3', '$- ', 'Universidad Tecnológica de Bolivar ', ''),
(235, 'Paola Amar Sepulveda', 'Relación Estado-Mercado. Un modelo para el fenomeno a la innovación de la Región Caribe Colombiana', 'Básicas y transversales', 1, ' 338.4562 R25e', 300, 1, 'Centro de Innovacíon del Caribe', '2007', 'Español', 'Donación 2023-3', ' $  ', 'Centro de Innovacíon del Caribe', ' '),
(228, 'Ministerio de Comercio, Industria y Turismo', 'Patente de Invención y Patente de modelo de Utilidad', 'Básicas y transversales', 1, ' 346.042/M665', 300, 1, 'Industria y Comercio Superintendencia', '2008', 'Español', 'Donación 2023-3', '$- ', 'Industria y Comercio Superintendencia', ' '),
(219, 'Luis Alberto Cadavid ', 'Fundamentos de derecho comercial, tributario y contable', 'Operciones del Comercio Exterior y Logistica Internacional', 1, ' 346.07 C121', 300, 1, 'MC Graw Hill', '2005', 'Español', 'Donación 2023-3', '$- ', 'MC Graw Hill', ''),
(218, 'Ernesto R. Fontainme ', 'Evaluacion social de proyectos ', 'Gestión Empresarial', 1, ' 361.63/ER71', 300, 1, 'Alfaomega', '1999', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ' '),
(231, 'Luis Fernando Molineros Gallón', 'Orígenes y Dinámica de los Semilleros de Investigación en Colombia ', 'Básicas y transversales', 1, ' 370.784/	L953', 300, 1, 'Sello Editorial Universidad del Cauca', '2010', 'Español', 'Donación 2023-3', '$- ', 'Sello Editorial Universidad del Cauca', ' '),
(758, 'De Alba Galván, Cristina.', 'Desarrollo de habilidades personales y sociales de las personas con discapacidad UF0799', 'Licenciatura En Educación Básica Primaria', 1, ' 371.9/D279', 300, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17065'),
(242, 'CHANKO, Pamela', 'Grammar Tales. Teaching Guide', 'Básicas y transversales', 1, ' 428.007/C456', 400, 1, 'Scholastic', '2004', 'Ingles', 'Donación 2023-3', ' $  ', 'Scholastic', ' '),
(307, 'Larousse', 'Difficultés Grammaticales ', 'Básicas y transversales', 1, ' 445/L334d', 400, 1, 'LAROUSSE', '2001', 'Ingles', 'Donación 2023-3', '$                     -  ', 'LAROUSSE', ''),
(220, 'Peter j. Hammond', 'Matematicas para el analisis economico', 'Operciones del Comercio Exterior y Logistica Internacional', 1, ' 515.9/P479', 500, 1, 'Prentice Hall', '1998', 'Español', 'Donación 2023-3', '$- ', 'Prentice Hall', ' '),
(225, ' Rio Cortina', 'Acuicultura a tu alcance ', 'Básicas y transversales', 1, ' 639.8 U588', 600, 1, 'Univerisidad tecnica de bolivar', '2015', 'Español', 'Donación 2023-3', '$- ', 'Univerisidad tecnica de bolivar', ''),
(106, 'NYHEIM,Peter', 'Technology Strategies for the hospitality Industry', 'Básicas y transversales', 1, ' 647.94/N994', 600, 1, 'Prentice Hall', '2004', 'Ingles', 'Donación 2023-3', '$- ', 'Prentice Hall', ''),
(305, 'Romero, María', 'Organizaciones, Responsabilidad social y Sostenibilidad Y Sostenibilidad', 'Básicas y transversales', 1, ' 658.4/R763', 600, 1, 'Universidad Externado de Colombia ', '2016', 'Español', 'Donación 2023-3', '$                     -  ', 'Universidad Externado de Colombia ', ''),
(170, 'Prieto, Lena', 'Diseño de planta', 'Básicas y transversales', 1, ' 658.5/P949', 600, 1, 'Universidad de la Salle', '2013', 'Español', 'Donación 2023-3', '$- ', 'Universidad de la Salle', ''),
(232, 'Jhon Tschohl ', 'Sentimientos. La Excelencia en el servicio a clientes.', 'Básicas y transversales', 1, ' 658.812/J59', 600, 1, 'Nodo Antioquía', '2004', 'Español', 'Donación 2023-3', '$- ', 'Nodo Antioquía', ' '),
(140, 'López, Antonio', 'El éxito sostenible a través del error ', 'Básicas y transversales', 1, ' 658/L663e', 600, 1, 'Ediciones Díaz de Santos ', '2010', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Díaz de Santos ', ''),
(222, 'Mauricio Cardenas', 'Introduccion a la economia colombiana ', 'Tecnico Profecional en Operaciones Logisticas', 1, ' 709.01/M455', 700, 1, 'Alfaomega', '2009', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ' '),
(221, 'Omar Gonzales ', 'GG+ de 100 años de cultura visual', 'Básicas y transversales', 1, ' 709.01/OM54', 700, 1, 'Editorial gustabo gil', '2017', 'Español', 'Donación 2023-3', '$- ', 'Editorial gustabo gil', ' '),
(125, 'OLIVAR,Marcial', 'Cien obras maestras de la pintura', 'Básicas y transversales', 1, ' 709.04/OL48', 700, 1, 'Salvat editores ', '1969', 'Español', 'Donación 2023-3', '$- ', 'Salvat editores ', ' '),
(311, 'Staccio Eva Steele', 'String ART. Transform string and pins into works of art', 'Básicas y transversales', 1, ' 745.5/ST775', 700, 1, 'Klutz', '2008', 'Ingles', 'Donación 2023-3', ' $  ', 'Klutz', ''),
(304, 'Díaz Oñoro,,Juan Manuel ', 'Musicas del caribe colombiano ', 'Básicas y transversales', 1, ' 781.625/D534m', 700, 1, 'Corporacion Universitaria Reformada', '2019', 'Español', 'Donación 2023-3', '$                     -  ', 'Corporacion Universitaria Reformada', ''),
(224, 'James Eade ', 'Ajedrez para dummies ', 'Básicas y transversales', 1, ' 794.1/J29', 700, 1, 'Editorial Norma ', '2005', 'Español', 'Donación 2023-3', '$- ', 'Editorial Norma ', ' '),
(240, 'Cline, Emma', 'Las chicas', 'Básicas y transversales', 1, ' 813.6/C641', 800, 1, 'Anagrama', '2016', 'Español', 'Donación 2023-3', ' $                     -  ', 'Anagrama', ''),
(236, 'Quiroga, Horacio', 'Abya Yala: Cuentos latinoamericanos', 'Básicas y transversales', 1, ' 863.00/Q8', 800, 1, 'Universidad Tecnologica de Bolivar ', '2020', 'Español', 'Donación 2023-3', ' $                     -  ', 'Universidad Tecnologica de Bolivar ', ''),
(306, 'Pérez, Fabio', 'El amor, un embeleco del alma y doce epitafios ', 'Básicas y transversales', 1, ' 863.7/P438', 800, 1, 'Editorial Bonaventuriana', '2022', 'Español', 'Donación 2023-3', '$                     -  ', 'Editorial Bonaventuriana', ''),
(169, 'Mambo', 'Quiero estar contigo', 'Básicas y transversales', 1, ' 863/M263', 800, 1, 'Mambo', '2021', 'Español', 'Donación 2023-3', '$- ', 'Mambo', ''),
(522, 'Cisneros, Mireya', 'Redacción y publicación de artículos científicos', 'Básicas y transversales', 1, '001.42/C579r', 0, 2, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                74.900,00', 'Ecoe', ' '),
(883, 'Bolding, Molly', 'The Online Tutor’s Toolkit', 'Licenciatura en Educación Básica Primaria', 1, '004.67/B687', 0, 1, 'Routledge', '2023', 'Inglés', 'Libros Comprados - 2024-3', ' $270.000,00 ', 'Inglobatec', ''),
(238, 'ZECHNER, Mario', 'Beginning Android Games', 'Básicas y transversales', 1, '005.36/Z42', 0, 1, 'Apress', '2012', 'Ingles', 'Donación 2023-3', ' $  ', 'Apress', ' '),
(934, 'Londoño Hoyos, Fernando', 'Con Licencia para Hablar', 'Básicas y transversales', 1, '070/L847', 0, 1, 'Debate', '2004', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(935, 'Gomez Davila Nicolas', 'Notas', 'Básicas y transversales', 1, '080/G633', 0, 1, 'Villegas', '2003', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(68, 'HUXLEY,Aldous', 'Los demonios de loudun', 'Básicas y transversales', 1, '133.426/H986', 100, 1, 'Biblioteca Universal Planeta', '1972', 'Español', 'Donación 2023-3', '$- ', 'Biblioteca Universal Planeta', ''),
(131, 'VIRTUE,Doreen', 'lo que nos dicen los angeles ', 'Básicas y transversales', 1, '133.53/V819', 100, 1, 'Editorial Bidéame', '2002', 'Español', 'Donación 2023-3', '$- ', 'Editorial Bidéame', ' '),
(61, 'FREUD,Sigmund ', 'El malestar en la cultura', 'Básicas y transversales', 1, '150.195/F738m', 100, 1, 'Alianza editorial', '1973', 'Español', 'Donación 2023-3', '$- ', 'Alianza editorial', ''),
(171, 'Lopez, Maria Elena', 'Inteligencia Emocinal Aprendiendo y creciendo juntos', 'Licenciatura en educación básica primaria', 1, '152.4/L864', 100, 1, 'Editorial Gamma', '2008', 'Español', 'Donación 2023-3', '$- ', 'Editorial Gamma', ' '),
(812, 'Beaudry Bellefeuille, Isabelle.', 'Problemas de aprendizaje en la infancia', 'Licenciatura en Educación Básica Primaria', 1, '153.15/B373', 100, 1, 'Ediciones Nobel', '2011', 'Español', 'Libros Comprados - 2024-3', ' $29.000,00 ', 'Alfa Editorial', '16988'),
(894, 'Hijas, Jesus', 'El camino de la creatividad: Lo esencial para desarrollar una mente creativa', 'Diseño Gráfico', 1, '153.35/H639', 100, 1, 'Independently published', '2021', 'Español', 'Libros Comprados - 2024-3', ' $185.000,00 ', 'Inglobatec', ''),
(664, 'De Montes, Zoraida G', 'Cerebro, Inteligencias y Mapa Mentales', 'Básicas y transversales', 1, '153.4/D384', 100, 1, 'Alfaomega', '2017', 'Español', 'Libros Comprados - 2024-3', ' $95.000,00 ', 'Alfa Editorial', '16850'),
(126, 'LLINAS,Rodolfo', 'El cerebro y el mito del yo', 'Básicas y transversales', 1, '153.4/L791', 100, 1, 'Grupo Editorial norma', '2002', 'Español', 'Donación 2023-3', '$- ', 'Grupo Editorial norma', ' '),
(876, 'Collins-Donnelly, Kate ', 'Destierra al ladrón de la imagen corporal', 'Ingeniería en Seguridad y Salud en el trabajo', 1, '155.2 /C713', 100, 1, 'Editorial Akadia', '2020', 'Español', 'Libros Comprados - 2024-3', ' $315.500,00 ', 'Inglobatec', ''),
(711, 'Hernández López, Luis Pablo.', 'Autonomía personal y salud infantil', 'Licenciatura En Educación Básica Primaria', 1, '155.4/H557', 100, 1, 'Paraninfo', '2012', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17040'),
(657, 'Serrabona Mas, Joaquim.', 'Abordaje psicomotriz de las dificultades de desarrollo', 'Licenciatura En Educación Básica Primaria', 1, '155.4/SE487', 100, 1, 'Horsori Editorial', '2016', 'Español', 'Libros Comprados - 2024-3', ' $90.000,00 ', 'Alfa Editorial', '17032'),
(194, 'Maria Teresa Arango de Narvaez', 'Estimulacion Temprana ', 'Licenciatura en educación básica primaria', 1, '155.422/M333', 100, 1, 'editorial Gamma', '2008', 'Español', 'Donación 2023-3', '$- ', 'editorial Gamma', ' '),
(857, 'Nicolson, Doula.', 'Problemas de la adolescencia', 'Licenciatura en Educación Básica Primaria', 1, '155.53/N653', 100, 1, 'Alfaomega', '2018', 'Español', 'Libros Comprados - 2024-3', ' $62.000,00 ', 'Alfa Editorial', '17004'),
(713, 'Rodríguez Ruiz, Celia.', 'Apoyo psicológico en situaciones de emergencia', 'Licenciatura En Educación Básica Primaria', 1, '155.935/R696', 100, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17041'),
(659, 'Beaudry Bellefeuille, Isabelle', 'Hago lo que Veo, Soy lo que Hago', 'Básicas y transversales', 1, '158.1/B373', 100, 1, 'Nobel', '2012', 'Español', 'Libros Comprados - 2024-3', ' $29.000,00 ', 'Alfa Editorial', '16846'),
(142, 'BUCKINGHAM,Marcus', 'Ahora descubra sus fortalezas', 'Básicas y transversales', 1, '158.1/B923', 100, 1, 'Grupo Editorial norma', '2006', 'Español', 'Donación 2023-3', '$- ', 'Universidad de la Salle', ' '),
(90, 'CELEDON,Lolita', 'El secreto de los triunfadores', 'Básicas y transversales', 1, '158.1/C392', 100, 1, 'Editorial sueños', '2001', 'Español', 'Donación 2023-3', '$- ', 'Editorial sueños', ''),
(143, 'PEIFFER,Vera', 'Pensamiento Positivo', 'Básicas y transversales', 1, '158.1/P377', 100, 1, 'Circulo de lectores', '1992', 'Español', 'Donación 2023-3', '$- ', 'Ediciones FEPAI', ' '),
(722, 'Pintanel Bassets, Mónica.', 'Técnicas de relajación creativa y emocional.', 'Básicas y transversales', 1, '158.12/P659', 100, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '17042'),
(730, 'Arroyo, Itiel.', 'Incendiario: 40 días para consumir tu apatía y vivir intensamente', 'Básicas y transversales', 1, '158.2/AR779', 100, 1, 'Vida', '2022', 'Español', 'Libros Comprados - 2024-3', ' $98.000,00 ', 'Alfa Editorial', '17047'),
(955, 'Beckwith Harry', 'El Arte de Venderse', 'Técnica profesional en Operaciones del Comercio Exterior', 1, '158.2/B397', 100, 1, 'Norma ', '2007', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(874, 'Berzbach, Frank', 'Psicologia para creativos: Primeros auxilios para conservar el ingenio y sobrevivir en el trabajo', 'Ingeniería en Seguridad y Salud en el trabajo', 1, '158.2/B553', 100, 1, 'Editorial Gustavo Gili', '2020', 'Español', 'Libros Comprados - 2024-3', ' $195.000,00 ', 'Inglobatec', ''),
(417, 'Puchol, Luis', 'El Libro de la Negociación, 5ta. Ed.', 'Gestión Empresarial', 1, '158.5/P977', 100, 1, 'Diaz de santos', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              110.000,00', 'Diaz de santos', ''),
(680, 'Froufe, Manuel.', 'Psicología del aprendizaje. Principios y aplicaciones conductuales', 'Licenciatura En Educación Básica Primaria', 1, '159.953/F942', 100, 1, 'Paraninfo', '2011', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '17036'),
(358, 'Cifuentes, Luis María', 'La etica en 100 preguntas  1ed.', 'Básicas y transversales', 1, '170/C569', 100, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                78.000,00', 'Alpha Editorial', ''),
(457, 'Martinez, Horacio', 'Integridad moral en las empresas', 'Básicas y transversales', 1, '174.4/M385', 100, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                42.600,00', 'Ecoe', ' '),
(477, 'Martínez, Horacio', 'Bioética. Una apuesta por la vida', 'Salud Ocupacional', 1, '174.957 M385B', 100, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                72.000,00', 'Ecoe', ' '),
(497, 'Martínez, Horacio', 'Formación de líderes éticos. Globalmente responsables ', 'Administración de Negocios Internacionales', 1, '174/M385', 100, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                50.400,00', 'Ecoe', ' '),
(70, 'ORTEGA,José', 'La rebelion de las masas', 'Básicas y transversales', 1, '196.1/O77/2010', 100, 1, 'Revista de occidente madrid', '1961', 'Español', 'Donación 2023-3', '$- ', 'Revista de occidente madrid', ''),
(931, 'Agustin San', 'Las Confesiones de San Agustin', 'Básicas y transversales', 1, '230.2/AG284', 200, 1, 'Paulinas', '2016', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(147, 'TEILHARD, Pierre', 'Energia espiritual del sufrimiento', 'Básicas y transversales', 1, '230.2/T264', 200, 1, 'Editorial Fontanella', '1963', 'Español', 'Donación 2023-3', '$- ', 'Editorial Fontanella', ' '),
(568, 'Martínez, Horacio', 'Proyecto cristiano de vida feliz', 'Básicas y transversales', 1, '230/M385', 200, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                32.900,00', 'Ecoe', ''),
(439, 'Martínez, Horacio', 'Caminando con jesús hacia emaús', 'Básicas y transversales', 1, '232.9/M385', 200, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                49.200,00', 'Ecoe', ' '),
(72, 'GALLO,Gonzalo', 'Tu espíritu en frecuencua modulada', 'Básicas y transversales', 1, '248.8/G172e', 200, 1, 'Librería nacional LTDA', '2001', 'Español', 'Donación 2023-3', '$- ', 'Librería nacional LTDA', ' '),
(450, 'Martínez, Horacio', 'Forja de líderes cristianos', 'Básicas y transversales', 1, '253.7/M385', 200, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                44.800,00', 'Ecoe', ' '),
(502, 'Martínez, Horacio', 'Humanización cristiana del mundo', 'Básicas y transversales', 1, '261.8 M387h', 200, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                64.400,00', 'Ecoe', ' '),
(916, 'SCOGNAMIGLIO, Joao', 'El Don de la Sabiduria en la Mente, Vida y Obra de Plinio  Correa de Oliveira', 'Básicas y transversales', 1, '262.152092/C81D', 200, 1, 'Heraldos del Evangelio', '2016', 'Español', 'Donación 2025-1', ' $-   ', 'Heraldos del Evangelio', 'NO, REGISTRADO'),
(936, 'Nazaret, de Jesus', 'Joseph Ratzinger Benedicto XVI', 'Básicas y transversales', 1, '280.09/N335', 200, 1, 'Planeta', '2007', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(146, 'YOGANANDA,Paramahansa', 'Autobiografia de un Yogui', 'Básicas y transversales', 1, '294.3/Y54', 200, 1, 'Ediciones Siglo Veinte ', '1950', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Siglo Veinte ', ' '),
(581, 'Rodriguez, Nohemy ', 'Estrategias en Ciencias Sociales', 'Básicas y transversales', 1, '300.072 G153e', 300, 1, 'Libros & Libros S.A.', '2010', 'Español', 'Donación 2023-3', ' $  ', 'Libros & Libros S.A.', ''),
(410, 'Garcia, Roberto', 'El poder de los simple en la Comunicación Efectiva', 'Licenciatura en educación básica primaria', 1, '302.2/G216', 300, 1, 'Diaz de santos', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                94.000,00', 'Diaz de santos', ''),
(408, 'Hofstadt, Roman', 'El libro de las habilidades de comunicación: cómo mejorar la comunicación personal. 3ra.. Ed.', 'Licenciatura en educación básica primaria', 1, '302.22/H713', 300, 1, 'Diaz de santos', '2021', 'Español', 'Libros Comprados - 2023-3', ' $              120.000,00', 'Diaz de santos', ''),
(501, 'Suberviola, Iratxe', 'Hablar en público y convencer', 'Básicas y transversales', 1, '302.2242/S941', 300, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              114.000,00', 'Ecoe', ' '),
(591, 'Bonaga, Cristina', '¡Mama, Quiero Ser Youtuber!', 'Básicas y transversales', 1, '302.23/B697', 300, 1, 'Editorial Planeta', '2016', 'Español', 'Libros Comprados - 2024-3', ' $49.500,00 ', 'Alfa Editorial', '17010'),
(782, 'Gavilán, diana.', 'Mala conducta\nel lado oscuro del usuario digital', 'Básicas y transversales', 1, '302.231/G283', 300, 1, 'Esic Editorial', '2022', 'Español', 'Libros Comprados - 2024-3', ' $74.000,00 ', 'Alfa Editorial', '16886'),
(783, 'Gordo López, Ángel.', 'Jóvenes en la encrucijada digital\nItinerarios de socialización y desigualdad en los entornos digitales', 'Básicas y transversales', 1, '302.231/G661', 300, 1, 'Ediciones Morata', '2018', 'Español', 'Libros Comprados - 2024-3', ' $70.000,00 ', 'Alfa Editorial', '16885'),
(685, 'López González, Francisco.', 'Tu Yo Digital. ¿Quién eres en Internet?', 'Básicas y transversales', 1, '302.3/L864', 300, 1, 'Esic Editorial', '2020', 'Español', 'Libros Comprados - 2024-3', ' $85.000,00 ', 'Alfa Editorial', '16656'),
(569, 'Zubieta, Elena', 'Psicología social y política', 'Salud Ocupacional', 1, '302/Z93', 300, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                65.100,00', 'Ecoe', ''),
(863, 'De Sousa Santos, Boaventura.', 'Justicia entre saberes:\nEpistemologías del sur contra el epistemicidio', 'Licenciatura en Educación Básica Primaria', 1, '303.4/D467', 300, 1, 'Ediciones Morata', '2017', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '17062'),
(727, 'Sanlés Olivares, Manuel.', 'El transhumanismo en 100 preguntas ', 'Básicas y transversales', 1, '303.4/SA196', 300, 1, 'Nowtilus', '2019', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '16905'),
(588, 'Menéndez Velázquez, Amador.', 'Historia del futuro Tecnologías que cambiarán nuestras vidas', 'Básicas y transversales', 1, '303.483/M542', 300, 1, 'Ediciones Nobel', '2017', 'Español', 'Libros Comprados - 2024-3', ' $29.000,00 ', 'Alfa Editorial', '16727'),
(705, 'Pastor, Andrea.', 'Nivel II: Ciencia y tecnología', 'Básicas y transversales', 1, '303.483/P293 2011', 300, 1, 'Paraninfo', '2011', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '16935'),
(703, 'Pastor, Andrea.', 'Ciencias aplicadas II', 'Básicas y transversales', 1, '303.483/P293a 2015', 300, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '16798'),
(531, ' Llorca, Jacinto', 'La sociedad hiperdigital', 'Licenciatura en educación básica primaria', 1, '303.4833/D352', 300, 2, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                52.500,00', 'Ecoe', ' '),
(63, 'REVEL,Jean-francois', 'Ni marx Ni Jesus', 'Básicas y transversales', 1, '303.64/R449', 300, 1, 'emecé', '1972', 'Ingles', 'Donación 2023-3', '$- ', 'emecé', ''),
(781, 'Quesada, Fernando.', 'Paz para la Paz', 'Básicas y transversales', 1, '303.66/Q5', 300, 1, 'Horsori Editorial', '2016', 'Español', 'Libros Comprados - 2024-3', ' $52.000,00 ', 'Alfa Editorial', '16791'),
(861, 'Santos barrigón, Javier.', 'Contextualización del tiempo libre infantil y juvenil en el entorno social UF1947', 'Licenciatura en Educación Básica Primaria', 1, '304.23/SA237', 300, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17061'),
(673, 'Abellan Lozano Lorena', 'Procesos de Comunicacion con Perspetiva de Genero en el Entorno de Investigacion UF2684', 'Básicas y transversales', 1, '305.3/AB141', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16855'),
(869, 'Iglesias Crespo, Rosa M.', 'Impulso A La Igualdad De Oportunidades Entre Hombres Y Mujeres MF1026_3', 'Básicas y transversales', 1, '305.3/IG24', 300, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $43,00 ', 'Alfa Editorial', '16668'),
(753, 'Viqueira García, Vanessa.', 'Aplicación de conceptos básicos de la teoría de género y del lenguaje no sexista UF2683', 'Licenciatura En Educación Básica Primaria', 1, '305.3/V812', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17060'),
(938, 'Fals Borda, Orlando ', 'Resistencia en el San Jorge', 'Básicas y transversales', 1, '305.8/F197', 300, 1, 'Universidad Nacional ', '2002', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(384, 'Kornblum, Pablo', 'La sociedad anestesiada el sistema economico global bajo la optica ciudadana 1ed.', 'Gestión Empresarial', 1, '306.0973/K84', 300, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                56.000,00', 'Alpha Editorial', ''),
(589, 'Rubio, Victoria', 'Loreto Poco Hetero', 'Licenciatura en Educación Básica Primaria', 1, '306.76/R896', 300, 1, 'Ril Editores', '2018', 'Español', 'Libros Comprados - 2024-3', ' $49.500,00 ', 'Alfa Editorial', '17009'),
(7, 'ENGELS,Federico', 'El origen de la familia, La propiedad privada y el estado', 'Básicas y transversales', 1, '306.8523 / E575o', 300, 1, 'Editorial Nuevo Horizonte ltda', '1979', 'Español', 'Donación 2023-3', '$- ', 'Editorial prensa moderna', ''),
(912, 'Centro Nacional de Memoria Historica', 'De los Grupos Precursores al Bloque Tolima (AUC)', 'Básicas y transversales', 1, '306/C397cd21 ed', 300, 1, 'Centro Nacional de Memoria Historica', '2017', 'Español', 'Donación 2025-1', ' $-   ', 'Centro Nacional de Memoria Historica', 'NO, REGISTRADO'),
(735, 'Velasco Villa, Margarita.', 'Desarrollo comunitario', 'Licenciatura En Educación Básica Primaria', 1, '306/V433', 300, 1, 'Paraninfo', '2018', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '17058'),
(416, 'Garcia, Santiago', 'Economía y Sociedad: En búsqueda de un ordenamiento Económico-Social eficiente', 'Gestión Empresarial', 1, '316.334/G216', 300, 1, 'Diaz de santos', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              100.000,00', 'Diaz de santos', ''),
(341, 'Arboleda, Germán', 'Planeacion y desarrollo  1ed.', 'Gestión Empresarial', 1, '320.609861/AR666', 300, 1, 'Alpha Editorial', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                95.000,00', 'Alpha Editorial', ''),
(118, 'ALESINA,Alberto', 'Reformas Institucionales En Colombia', 'Básicas y transversales', 1, '320.9861/A53r', 300, 1, 'Alfaomega', '2001', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ' '),
(728, 'Armesilla, Santiago.', 'La política en 100 preguntas ', 'Básicas y transversales', 1, '320/AR728', 300, 1, 'nowtilus', '2020', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '16758'),
(29, 'ROUSSEAU, Juan', 'Contrato social', 'Básicas y transversales', 1, '320/R864', 300, 1, 'Espasa-calpe, S.A', '1981', 'Español', 'Donación 2023-3', '$- ', 'Espasa-calpe, S.A', ''),
(122, 'ROUSSEAU,J', 'Discurso sobre el origen de la desigualdad entre los hombres', 'Básicas y transversales', 1, '323.4/R864', 300, 1, 'Libreria Alba', '1945', 'Español', 'Donación 2023-3', '$- ', 'Libreria Alba', ' '),
(907, 'FIUMARA, Franco Marco', 'El Voto del Ciudadano Italianoen el Exterior', 'Básicas y transversales', 1, '324.6/F565', 300, 1, 'Unlam', '2013', 'Español', 'Donación 2025-1', ' $-   ', 'Unlam', 'NO, REGISTRADO'),
(195, 'Bob woodward', 'Negar La Evidencia ', 'Básicas y transversales', 1, '324.973/B663', 300, 1, 'Belacqva', '2006', 'Español', 'Donación 2023-3', '$- ', 'Belacqva', ' '),
(382, 'Fernández Pardo, Carlos A.', 'El roble y la estepa : alemania y rusia desde el siglo XIX hasta hoy  1ed.', 'Administración de Negocios Internacionales', 1, '327.1/F363', 300, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                46.000,00', 'Alpha Editorial', ''),
(383, 'Hutschenreuter, Alberto', 'Horizonte incierto reflexiones sobre el presente de la politica mundial 1ed.', 'Básicas y transversales', 1, '327.1/H981', 300, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                58.000,00', 'Alpha Editorial', ''),
(933, 'Estulin, Daniel', 'La Verdadera Historia del Club Bilderberg', 'Técnica profesional en Operaciones del Comercio Exterior', 1, '327.2/ES82', 300, 1, 'Bronce ', '2005', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(385, 'Cruz Tisera, Juan', 'Latinoamerica, ¿ en los estados unidos? El dilema de la seguridad societal y el reto hispano 1ed.', 'Gestión Empresarial', 1, '327.73/C957', 300, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                62.000,00', 'Alpha Editorial', ''),
(580, 'Barros de Castro, Antonio ', 'Introduccion a la Economia. Un Unfoque Estructuralista ', 'Administración de Negocios Internacionales', 1, '330.1 B277I 1976 ', 300, 1, 'Siglo Veintiuno Editores SA', '1969', 'Español', 'Donación 2023-3', ' $  ', 'Siglo Veintiuno Editores SA', ''),
(120, 'BABY,Jean', 'Principios fundamentales de economia politica', 'Básicas y transversales', 1, '330.1/B115', 300, 1, 'Libros de bolsillo ', '1990', 'Español', 'Donación 2023-3', '$- ', 'Libros de bolsillo ', ' '),
(14, 'DE SOTO,Hernando', 'El misterio del capital ', 'Administración de Negocios Internacionales', 1, '330.122/S676', 300, 1, 'Planeta', '2000', 'Español', 'Donación 2023-3', '$- ', 'Planeta', ''),
(339, 'Fentanes, Óscar', 'Modelos de crecimiento economico en R  1ed.', 'Gestión Empresarial', 1, '330.15/F342', 300, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                65.000,00', 'Alpha Editorial', ''),
(15, 'SCHUMPETER,Joseph', '10 Grandes economistas de marx a keynes', 'Administración de Negocios Internacionales', 1, '330.15/S392d', 300, 1, 'Alianza editorial', '1967', 'Español', 'Donación 2023-3', '$- ', 'Alianza editorial', ''),
(407, 'Delgado, Josu Imanol', 'Economía desde el Corazón. Incluyendo la economía post Covid-19', 'Gestión Empresarial', 1, '330.46/D352', 300, 1, 'Diaz de santos', '2021', 'Español', 'Libros Comprados - 2023-3', ' $              130.000,00', 'Diaz de santos', ''),
(132, 'JACQUES,Jean', 'El desafio mundial', 'Básicas y transversales', 1, '330.9/J19', 300, 1, 'Editorial Plaza & Janes', '1980', 'Español', 'Donación 2023-3', '$- ', 'Editorial Plaza & Janes', ' '),
(6, 'TIRADO, Alvaro', 'Introducción a la historia economica de colombia', 'Administración de Negocios Internacionales', 1, '330.9/T47i', 300, 1, 'El Áncora Editores', '1971', 'Español', 'Donación 2023-3', '$- ', 'El Áncora Editores', ''),
(331, 'Cristancho Giraldo, Laura Andrea', 'Herramientas para la medicion economica y su aplicacion en latinoamerica  1ed.', 'Administración de Negocios Internacionales', 1, '330.98/C933', 300, 1, 'Alpha Editorial', '2023', 'Español', 'Libros Comprados - 2023-3', ' $                50.000,00', 'Alpha Editorial', ''),
(356, 'Armesilla, Santiago', 'La economia en 100 preguntas  2ed.', 'Gestión Empresarial', 1, '330/AR728', 300, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                78.000,00', 'Alpha Editorial', ''),
(4, 'BARROS DE CASTRO, Antonio', 'Introducción a la economía', 'Administración de Negocios Internacionales', 1, '330/B982I ', 300, 1, 'Siglo Veintiuno editores sa', '1970', 'Español', 'Donación 2023-3', '$- ', 'Siglo Veintiuno editores sa', ''),
(333, 'Equipo de Core', 'La economia. Economia para un mundo en transformacion 1ed.', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '330/EQ64', 300, 1, 'Alpha Editorial', '2021', 'Español', 'Libros Comprados - 2023-3', ' $              399.000,00', 'Alpha Editorial', ''),
(162, 'MANKIW, N. Gregory', 'Principios de Economía. Con casos y aplicaciones para America Latina', 'Tecnología En Gestión Empresarial ', 1, '330/M278/2020', 300, 1, 'Cengage Learning Editores S.A.', '2020', 'Español', 'Donación 2023-3', '$- ', 'Distridactika', ''),
(28, 'PAGÉS, Carmen', 'Se buscan buenos empleos', 'Básicas y transversales', 1, '331.1208/P134b', 300, 1, 'Alfaomega', '2005', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ''),
(914, 'JARAMILLO, Olga ', 'Calidad de Vida Laboral en el Caribe Colombiano', 'Básicas y transversales', 1, '331.256/J37 ed.23', 300, 1, 'Universidad del Norte ', '2020', 'Español', 'Donación 2025-1', ' $-   ', 'Universidad del Norte ', 'NO, REGISTRADO'),
(856, 'Puerta Pérez, Laura María.', 'Análisis del entorno laboral y gestión de relaciones laborales desde la perspectiva de género UF2686', 'Básicas y transversales', 1, '331.4/P977', 300, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16967'),
(321, 'Eyzaguirre Vásquez, Walter', '¿y si hacemos dinero? Aprende a ahorrar sin dejar de gastar 1ed.', 'Gestión Empresarial', 1, '332.024/EY98', 300, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                32.000,00', 'Alpha Editorial', ''),
(396, 'Rodríguez Raga, Santiago', 'Finanzas personales. Su mejor plan 2ed.', 'Gestión Empresarial', 1, '332.024/R696', 300, 1, 'Alpha Editorial', '2023', 'Español', 'Libros Comprados - 2023-3', ' $                79.000,00', 'Alpha Editorial', ''),
(329, 'López, Francisco', 'Finanzas para no financieros, estados e indicadores economico-financieros 1ed.', 'Administración de Negocios Internacionales', 1, '332.042/L864', 300, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                47.000,00', 'Alpha Editorial', ''),
(674, 'Matin Marin Jose L.', 'Finanzas Internacionales', 'Administración de Negocios Internacionales', 1, '332.042/M379', 300, 1, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '13598'),
(335, 'Serrano Rodríguez, Javier', 'Mercados financieros de estados unidos y otros mercados financieros  1ed.', 'Administración de Negocios Internacionales', 1, '332.0973/SE487', 300, 1, 'Alpha Editorial', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                95.000,00', 'Alpha Editorial', ''),
(323, 'Jiménee, Jorge', 'Bancos, todo lo que siempre quiso saber 1ed.', 'Gestión Empresarial', 1, '332.1/J61/2022', 300, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                56.000,00', 'Alpha Editorial', ''),
(327, 'Serrano, Javier', 'Estructura y evolucion del sistema financiero colombiano y sus principales mercados  1ed.', 'Administración de Negocios Internacionales', 1, '332.109861/SE487', 300, 1, 'Alpha Editorial', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              110.000,00', 'Alpha Editorial', ''),
(324, 'Ocariz, Emiliano B.', 'Blockchain y smart contracts la revolucion de la confianza 1ed.', 'Básicas y transversales', 1, '332.178/OC15', 300, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                70.000,00', 'Alpha Editorial', ''),
(352, 'Santiago Moreno, Ismael', 'Introduccion al blockchain y criptomonedas en 100 preguntas  2ed.', 'Gestión Empresarial', 1, '332.178/SA235', 300, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                78.000,00', 'Alpha Editorial', ''),
(24, 'KENNETH,John', 'El dinero', 'Administración de Negocios Internacionales', 1, '332.4/K33d', 300, 1, 'Ediciones Orbis, S.A', '1983', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Orbis, S.A', ''),
(817, 'Santiago Moreno, Ismael', 'La nueva Economia Blockchain y Criptomonedas En 100 Preguntas', 'Tegnologia en Gestión\nAdministrativa', 1, '332.4/SA235', 300, 1, 'Alfa Editorial', '2022', 'Español', 'Libros Comprados - 2024-3', ' $83.000,00 ', 'Alfa Editorial', '16745'),
(12, 'VALENCIA, Gloria', 'Interbolsa ', 'Administración de Negocios Internacionales', 1, '332.609861/V152', 300, 1, 'Libros', '2014', 'Español', 'Donación 2023-3', '$- ', 'Libros', ''),
(9, 'CESARINO,Camila', 'Un mejor clima de inversión para todos', 'Administración de Negocios Internacionales', 1, '332.673/C421', 300, 1, 'Alfaomega', '2005', 'Ingles', 'Donación 2023-3', '$- ', 'Alfaomega', ''),
(688, 'Díaz Pérez, Fernando.', 'Análisis de productos y servicios de financiación UF0337', 'Administración de negocios internacionales', 1, '332.7/D542', 300, 1, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16787'),
(1, 'DEININGER,Klaus', 'Acceso a la tierra, desarrollo y reducción de la pobreza', 'Básicas y transversales', 1, '333.335/D345', 300, 1, 'Alfaomega', '2005', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ''),
(691, 'Gómez Orea, Domingo.', 'Evaluación ambiental estratégica', 'Administración de negocios internacionales', 1, '333.714/G633', 300, 1, 'Ediciones Mundi-Presa', '2014', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '16932'),
(436, 'Trejos, luis', 'Evaluación de impacto ambiental', 'Básicas y transversales', 1, '333.714/T787', 300, 1, 'Ecoe', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                54.000,00', 'Ecoe', ' '),
(796, 'Rodríguez Becerra, Manuel', 'Colombia país de bosques', 'Básicas y Transversales', 1, '333.75/R696', 300, 2, 'Alfa Editorial', '2022', 'Español', 'Libros Comprados - 2024-3', ' $150.000,00 ', 'Alfa Editorial', '16946'),
(82, 'MARX,C', 'Obras escogidas', 'Básicas y transversales', 1, '335.4/M392', 300, 1, 'Editorial Progreso', '1969', 'Español', 'Donación 2023-3', '$- ', 'Editorial Progreso', ''),
(921, 'GÓMEZ, Jorge', 'Economia Publica', 'Administración de Negocios Internacionales', 1, '336 /G633 2017 CDD 23 ed', 300, 1, 'Cecar', '2017', 'Español', 'Donación 2025-1', ' $-   ', 'Cecar', 'NO, REGISTRADO'),
(11, 'DOLLAS,David', '¿Puede la globalización beneficiar a todo el mundo?', 'Básicas y transversales', 1, '337.1/D655', 300, 1, 'Alfaomega', '2005', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ''),
(426, 'Goñi,  Juan Jose', '100 Propuestas para la posglobalización', 'Gestión Empresarial', 1, '337/G643', 300, 1, 'Diaz de santos', '2018', 'Español', 'Libros Comprados - 2023-3', ' $              135.000,00', 'Diaz de santos', ''),
(649, 'Vergara Gómez, Luis.', 'Emprendimiento social', 'Básicas y transversales', 1, '338.04/V494', 300, 1, 'Alfaeditorial', '2023', 'Español', 'Libros Comprados - 2024-3', ' $60.000,00 ', 'Alfa Editorial', '16928'),
(117, 'MESA,Darío', 'Colombia: Estructura politica y agraria', 'Básicas y transversales', 1, '338.1/M572', 300, 1, 'Editorial estrategia', '2000', 'Español', 'Donación 2023-3', '$- ', 'Editorial estrategia', ' '),
(524, 'Ponce, Álvaro', 'Riqueza enterrada : Balance histórico de las apuestas mineras de Colombia', 'Tecnología En Gestión Empresarial ', 1, '338.209861/P792', 300, 2, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                33.600,00', 'Ecoe', ' '),
(470, 'Jiménez, Luis', 'Agroturismo', 'Salud Ocupacional', 1, '338.4791/J35a', 300, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                77.000,00', 'Ecoe', ' '),
(30, 'KOTLER, Philip', 'Marketing for hospitality and tourism', 'Administración de Negocios Internacionales', 1, '338.4791/K848m', 300, 1, 'Prentice Hall', '2003', 'Ingles', 'Donación 2023-3', '$- ', 'Prentice Hall', ''),
(743, 'Ojeda García, Delia ', 'Marketing turístico ', 'Tecnología en Gestión Logística Internacional', 1, '338.4791/OJ39', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $29.000,00 ', 'Alfa Editorial', '16900'),
(559, 'Wallingre, Noemí', 'Gestión de municipios turísticos', 'Básicas y transversales', 1, '338.4791/W212', 300, 2, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                43.400,00', 'Ecoe', ' '),
(161, 'MANKIW, N. Gregory', 'Microeconomía versión para América Latina', 'Tecnología En Gestión Logística Internacional', 1, '338.5/M278', 300, 1, 'Cengage Learning Editores S.A.', '2022', 'Español', 'Donación 2023-3', '$- ', 'Distridactika', ''),
(855, 'Shufu, Li.', 'Del coche de juguete a dueño de Volvo', 'Administración de Negocios Internacionales', 1, '338.76/SH562', 300, 1, 'Alfaomega', '2017', 'Español', 'Libros Comprados - 2024-3', ' $30.000,00 ', 'Alfa Editorial', '15412'),
(326, 'Correa Quezada, Ronny', 'Economia urbana y regional teorias y evidencias sobre el desarrollo territorial 1ed.', 'Gestión Empresarial', 1, '338.9/C824', 300, 1, 'Alpha Editorial', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                92.000,00', 'Alpha Editorial', ''),
(16, 'BARRE,Raymond', 'El desarrollo económico ', 'Administración de Negocios Internacionales', 1, '338.98/B885', 300, 1, 'Colección Popular', '1962', 'Español', 'Donación 2023-3', '$- ', 'Colección Popular', ''),
(10, 'PERRY,Guillermo', 'Crecimiento en América Latina en busca del tiempo perdido', 'Básicas y transversales', 1, '338.98/P462', 300, 1, 'Alfaomega', '2005', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ''),
(445, 'Banguero, Harold', 'Desarrollo humano sostenible', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '338.9861/B216', 300, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                79.000,00', 'Ecoe', ' '),
(36, 'REALPE, Leonardo', 'El bicentenario a través de aquellos emprendedores que dejaron su marca', 'Básicas y transversales', 1, '338.9861/B583', 300, 1, 'Punto Aparte', '2010', 'Español', 'Donación 2023-3', '$- ', 'Punto Aparte', ''),
(5, 'MONTENEGRO, Armando', 'Las piezas del rompecabezas. Desigualdas, pobreza y crecimiento', 'Básicas y transversales', 1, '338.9861/M777', 300, 1, 'Taurus', '2005', 'Español', 'Donación 2023-3', '$- ', 'Taurus', ''),
(13, 'GOLDIN,Ian', 'Globalización y la pobreza ', 'Básicas y transversales', 1, '339.46/G65g', 300, 1, 'Alfaomega', '2005', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ''),
(320, 'Acosta Pardo, Fayber', 'Politica Fiscal, una vision de futuro 1ed.', 'Básicas y transversales', 1, '339.52/AC185', 300, 1, 'Alpha Editorial', '2021', 'Español', 'Libros Comprados - 2023-3', ' $              103.000,00', 'Alpha Editorial', ''),
(32, 'Banco de Occidente', 'Análisis de coyuntura económica y perspectivas', 'Administración de Negocios Internacionales', 1, '339/B213', 300, 1, 'Banco de Occidente Credencial ', '2005', 'Español', 'Donación 2023-3', '$- ', 'Banco de Occidente Credencial ', ''),
(544, 'Blanco, Jacqueline', 'Elaboración de proyectos de investigación en derecho', 'Administración de Negocios Internacionales', 1, '340.072/B641/2018', 300, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                32.900,00', 'Ecoe', ' '),
(514, 'Pérez, David', 'Marketing para abogados escépticos', 'Administración de Negocios Internacionales', 1, '340.092/P944', 300, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                39.200,00', 'Ecoe', ' '),
(141, 'WALLAGE,Irving', 'El Documento R', 'Básicas y transversales', 1, '342.08/W195', 300, 1, 'Circulo de lectores', '1976', 'Español', 'Donación 2023-3', '$- ', 'Mambo', ' '),
(105, 'ROBALLO,Julio', 'Constitucion Politica de Colombia', 'Básicas y transversales', 1, '342.861/R628', 300, 1, 'Universidad del estado', '1991', 'Español', 'Donación 2023-3', '$- ', 'Universidad del estado', ''),
(775, 'Tuero Fernandez, Arturo', 'Gestion Fiscal UF0315', 'Gestión Empresarial', 1, '343/T913', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16865'),
(112, 'IRAGORRI,Adolfo', 'Código sustantivo del trabajo y código procesal del trabajo y de la seguridad social', 'Salud Ocupacional', 1, '344.01026/IR65', 300, 1, 'Legis Editores S.A', '2017', 'Español', 'Donación 2023-3', '$- ', 'Legis Editores S.A', ''),
(927, 'Correat Valencia, Alfonso ', 'Practica Forense', 'Básicas y transversales', 1, '345/C824', 300, 1, 'Temis', '1974', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(930, 'Carriso Pardo, Hernando ', 'Sucesiones y Donaciones ', 'Básicas y transversales', 1, '346.05/C318', 300, 1, 'Lener', '1966', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(523, 'Ruiz, Wilson', 'Responsabilidad del estado y sus regímenes ', 'Básicas y transversales', 1, '346.5/R934re', 300, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                30.100,00', 'Ecoe', ' '),
(430, 'Martinez, Juan Fernando', 'Derecho laboral individual. Parte general y pensiones', 'Gestión Empresarial', 1, '348.9861/M385', 300, 1, 'Ecoe', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                73.900,00', 'Ecoe', ' '),
(418, 'Alcover, De La\nHera, Carlos María', 'Empleo sostenible:Edad, trabajo y alternativas al retiro en la sociedad 4.0', 'Básicas y transversales', 1, '351.8386/AL355', 300, 1, 'Diaz de santos', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              110.000,00', 'Diaz de santos', ''),
(771, 'Iborra, Maria', 'Fundamentos de Dirección de Empresas', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '358/	IB13', 300, 1, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16840'),
(847, 'Patrocinio Las Heras, Maria', 'Introducción al Bienestar social. El libro de las casitas', 'Básicas y Transversales', 1, '361.65/P314', 300, 1, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '17001'),
(844, 'García, Ruth', 'Intervencion en la atención sociosanitaria en instituciones ', 'Básicas y Transversales', 1, '362.1/G216', 300, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '17000'),
(871, 'Millan López, Daniel ', 'Es Autista, ¿y ahora qué?', 'Licenciatura en Educación Básica Primaria', 1, '362.196/M645', 300, 1, 'Imago mundi', '2024', 'Español', 'Libros Comprados - 2024-3', ' $145.600,00 ', 'Inglobatec', ''),
(149, 'GONZÁLEZ, José', 'Salud familiar y drogadicción', 'Básicas y transversales', 1, '362.2/G643', 300, 1, 'Editoral Antillas', '2002', 'Español', 'Donación 2023-3', '$- ', 'Editoral Antillas', ' '),
(849, 'García, Ruth', 'Interrelación, comunicación y observación con la persona dependiente y su entorno ', 'Básicas y Transversales', 1, '362.6/G216', 300, 1, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '17002'),
(842, 'Delgado Linares, Inmaculada', 'Intervencion con familias y atención a menores en riesgo social ', 'Licenciatura en Educación Básica Primaria', 1, '362.7/D352', 300, 1, 'Paraninfo', '2012', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16999'),
(635, 'Canales, Joseluis.', 'El cristal Roto: Sobreviviendo al abuso sexual en la infancia', 'Básicas y transversales', 1, '362.76/C212', 300, 1, 'Paidós', '2015', 'Español', 'Libros Comprados - 2024-3', ' $90.000,00 ', 'Alfa Editorial', '17027'),
(302, 'Ramirez Cardeño, Wendy', 'Sistema de gestion para la seguridad y salud en el trabajo', 'Salud Ocupacional', 1, '363.11/B987', 300, 1, 'Universidad de la Guajira', '2019', 'Español', 'Donación 2023-3', '$- ', 'Universidad de la Guajira', ''),
(420, 'Fernandez, Inmaculada', 'Seguridad funcional en instalaciones de proceso: sistemas instrumentados de seguridad y análisis SIL', 'Ingeniería Industrial', 1, '363.11/F363', 300, 1, 'Diaz de santos', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              250.000,00', 'Diaz de santos', ''),
(313, 'RUEDA ORTÍZ, Maury Javier', 'Manual de ergonomía y seguridad', 'Salud Ocupacional', 1, '363.11/R918', 300, 1, 'Alfaomega', '2013', 'Español', 'Donación 2023-3', '$ - ', 'Alfaomega', ''),
(499, 'Pedraza, Gustavo', 'Gestión de riesgos ambientales para conservar la salud', 'Salud Ocupacional', 1, '363.12/P371', 300, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              124.000,00', 'Ecoe', ' '),
(780, 'Campiña Dominguez, Gema', 'Gestion de Quejas y Reclamaciones en Materia de Consumo MF0245_3', 'Gestión Empresarial', 1, '363.7/C196', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16864'),
(317, 'ALVAREZ, Francisco', 'Riesgos biologicos y bioseguridad', 'Salud Ocupacional', 1, '363.72/A473', 300, 1, 'Ecoe', '2010', 'Español', 'Donación 2023-3', '$- ', 'Ecoe', ''),
(736, 'Ocaña Villuendas, Laura.', 'Desarrollo socioafectivo', 'Licenciatura En Educación Básica Primaria', 1, '364.6/OC15', 300, 1, 'Paraninfo', '2011', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17059'),
(550, 'Bedoya, José', 'Epistemología  y  pedagogía ', 'Salud Ocupacional', 1, '370.1/B412', 300, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                73.900,00', 'Ecoe', ' '),
(888, 'Roberts, Matthew', 'Primary Education Voices', 'Licenciatura en Educación Básica Primaria', 1, '370.113/R646', 300, 1, 'Routledge', '2023', 'Inglés', 'Libros Comprados - 2024-3', ' $238.400,00 ', 'Inglobatec', ''),
(628, 'Bisquerra, Rafael.', 'Entre todos compartir la educación para la ciudadanía', 'Licenciatura En Educación Básica Primaria', 1, '370.115/B622', 300, 1, 'Horsori Editorial', '2010', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '17024'),
(884, 'Mogra, Imran', 'Religious Education 5-11', 'Licenciatura en Educación Básica Primaria', 1, '370.117/M696', 300, 1, 'Routledge', '2023', 'Inglés', 'Libros Comprados - 2024-3', ' $262.000,00 ', 'Inglobatec', ''),
(624, 'Del Rio, María José.', 'Actividades comunicativas para enseñar competencia oral', 'Licenciatura En Educación Básica Primaria', 1, '370.15/D364', 300, 1, 'Horsori Editorial', '2016', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '17022'),
(598, 'Izaguirre Sotomayor, Manuel Hernán.', 'Neuroproceso de la enseñanza y del aprendizaje\nMetodología de la aplicación de la neurociencia en la educación', 'Licenciatura En Educación Básica Primaria', 1, '370.15/IZ98', 300, 1, 'Alfaomega', '2017', 'Español', 'Libros Comprados - 2024-3', ' $72.000,00 ', 'Alfa Editorial', '17015');
INSERT INTO `libros` (`ID`, `Autor`, `Titulo`, `Programa`, `Item`, `Signatura`, `Areas`, `Ejemplar`, `Editorial`, `Año`, `Idioma`, `Observaciones`, `Precio`, `Proveedor`, `Registro_en_linea`) VALUES
(887, 'Moore, Sam', 'Amplifying activities for great experiential learning', 'Licenciatura en Educación Básica Primaria', 1, '370.15/M824', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $222.700,00 ', 'Inglobatec', ''),
(651, 'Smith, Marc.', 'Las emociones de los estudiantes y su impacto en el aprendizaje\nAulas emocionalmente positivas', 'Licenciatura En Educación Básica Primaria', 1, '370.15/SM655', 300, 1, 'Narcea', '2019', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '17031'),
(600, 'Tejada, José.', 'Formación de formadores', 'Licenciatura En Educación Básica Primaria', 1, '370.15/T266', 300, 1, 'Paraninfo', '2007', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16934'),
(784, 'Martínez Ten, Amparo.', 'Jugando en paz\nPropuestas para jugar en paz y sin violencia', 'Licenciatura en Educación Básica Primaria', 1, '370.153/M385', 300, 1, 'Alfaomega', '2013', 'Español', 'Libros Comprados - 2024-3', ' $48.000,00 ', 'Alfa Editorial', '17067'),
(731, 'Chalela R, María del Socorro.', 'Vivencia corporal.\nLenguajes expresivos en la infancia', 'Licenciatura En Educación Básica Primaria', 1, '370.155/C436', 300, 1, 'Alfa Editorial', '2017', 'Español', 'Libros Comprados - 2024-3', ' $62.000,00 ', 'Alfa Editorial', '17048'),
(653, 'Marín, Jordi.', 'Enseñar en la sociedad del conocimiento\nReflexiones desde el pupitre', 'Licenciatura En Educación Básica Primaria', 1, '370.19/M337', 300, 2, 'Horsori Editorial', '2011', 'Español', 'Libros Comprados - 2024-3', ' $50.000,00 ', 'Alfa Editorial', '13962'),
(689, 'De Alba Galván, Cristina.', 'Evaluación del proceso de enseñanza-aprendizaje en formación profesional para el empleo MF1445_3', 'Licenciatura En Educación Básica Primaria', 1, '370.7/D279', 300, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17038'),
(394, 'Colén Riaum, Teresa', 'Tendencias en la formacion permanente del profesorado  1ed.', 'Licenciatura en educación básica primaria', 1, '370.71/C692', 300, 1, 'Alpha Editorial', '2010', 'Español', 'Libros Comprados - 2023-3', ' $                53.000,00', 'Alpha Editorial', ''),
(904, 'Contreras Fernández, José ', 'Modelo de evaluación de aprendizajes por competencias profesionales para el programa de Ingeniería Mecatrónica de una institución de educación superior colombiana', 'Licenciatura en Educación Básica Primaria', 1, '370.71/C764', 300, 1, 'Palibrio', '2019', 'Español', 'LIBROS COMPRADOS 2024-3', ' $238.000,00 ', 'Inglobatec', ''),
(487, 'Blanchard, Mercedes', 'Equipos docentes innovadores', 'Básicas y transversales', 1, '370.711/B639', 300, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                70.000,00', 'Ecoe', ' '),
(199, 'Routledge And Kegan Paul ', 'Educacion y desarrollo en america latina ', 'Básicas y transversales', 1, '370.98/R869', 300, 1, 'Editorial Paidos ', '1973', 'Español', 'Donación 2023-3', '$- ', 'Editorial Paidos ', ' '),
(918, 'BOLIVAR, Maria', 'Avances  en Investigacion', 'Electromecánica', 1, '370/ B689', 300, 1, '', '2010', 'Español', 'Donación 2025-1', ' $-   ', '', 'NO, REGISTRADO'),
(672, 'Carrasco, Jose Bernardo', 'Educar Sin Manipular', 'Licenciatura en Educación Básica Primaria', 1, '370/C313', 300, 1, 'Narcea', '2019', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '17034'),
(665, 'Lara Muñoz Erica', 'Fundamentos de Investigación, un Enfoque por Competencias', 'Básicas y transversales', 1, '370/L318', 300, 1, 'Alfaomega', '2013', 'Español', 'Libros Comprados - 2024-3', ' $70.000,00 ', 'Alfa Editorial', '13364'),
(662, 'Darte, Antonia', 'Freire y Educacion', 'Licenciatura en Educación Básica Primaria', 1, '371.1/D226', 300, 1, 'Morata', '2017', 'Español', 'Libros Comprados - 2024-3', ' $70.000,00 ', 'Alfa Editorial', '17033'),
(889, 'Barrs Deceased, Myra', 'Vygotsky the Teacher', 'Licenciatura en Educación Básica Primaria', 1, '371.102/B278', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $278.000,00 ', 'Inglobatec', ''),
(582, 'Carette, Vicent.', 'Didáctica general en la educación secundaria', 'Licenciatura En Educación Básica Primaria', 1, '371.102/C271', 300, 1, 'Editorial Popular', '2016', 'Español', 'Libros Comprados - 2024-3', ' $62.000,00 ', 'Alfa Editorial', '17006'),
(891, 'Woods, Peter', 'Teachable moments', 'Licenciatura en Educación Básica Primaria', 1, '371.102/W896', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $318.000,00 ', 'Inglobatec', ''),
(584, 'Blanchard, Mercedes.', 'Equipos docentes innovadores\nFormas de formarse colaborativamente', 'Licenciatura En Educación Básica Primaria', 1, '371.12/B639', 300, 1, 'Narcea', '2018', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '17007'),
(882, 'Malderez, Angi', 'Mentoring Teachers', 'Licenciatura en Educación Básica Primaria', 1, '371.12/M244', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $225.000,00 ', 'Inglobatec', ''),
(895, 'Aguilar, Elena ', 'Coaching for equity: conversations that change practice', 'Licenciatura en Educación Básica Primaria', 1, '371.2/AG283', 300, 1, 'Jossey-Bass', '2020', 'Inglés', 'Libros Comprados - 2024-3', ' $278.000,00 ', 'Inglobatec', ''),
(877, 'Roberts, Luke', 'Leading Schools and Sustaining Innovation', 'Licenciatura en Educación Básica Primaria', 1, '371.2/R645', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $385.400,00 ', 'Inglobatec', ''),
(626, 'Giráldez Hayes, Andrea', 'Coaching Educativo ', 'Licenciatura en Educación Básica Primaria', 1, '371.3/G516', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '17023'),
(890, 'Woods, Peter', 'Restructuring Schools, Reconstructing Teachers', 'Licenciatura en Educación Básica Primaria', 1, '371.3/W896', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $308.000,00 ', 'Inglobatec', ''),
(621, 'Stainback, Susan.', 'Aulas inclusivas \nUn nuevo modo de enforcar y vivir el currículo', 'Licenciatura En Educación Básica Primaria', 1, '371.30281/	ST782', 300, 1, 'Alfaomega', '2018', 'Español', 'Libros Comprados - 2024-3', ' $65.000,00 ', 'Alfa Editorial', '17021'),
(786, 'Guerra, Marcela Susana.', 'La tecnología y la educación personalizada. Teoría y Práctica', 'Licenciatura En Educación Básica Primaria', 1, '371.334/G934', 300, 2, 'Alfa Editorial', '2013', 'Español', 'Libros Comprados - 2024-3', ' $52.000,00 ', 'Alfa Editorial', '13960'),
(560, 'Jiménez, Isabel', 'Informática educativa', 'Básicas y transversales', 1, '371.334/J61', 300, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                35.000,00', 'Ecoe', ' '),
(899, 'Martínez, Lorea', 'Pedagogía con corazón: Guía para educación emocional con el modelo Heart  in Mind', 'Licenciatura en Educación Básica Primaria', 1, '371.4/M385', 300, 1, 'Brisca Publishing', '2021', 'Español', 'Libros Comprados - 2024-3', ' $155.000,00 ', 'Inglobatec', ''),
(905, 'Gross, Jean', 'Improving behaviour and wellbeing in Primary Schools', 'Licenciatura en Educación Básica Primaria', 1, '371.5/G878', 300, 1, 'Routledge', '2024', 'Inglés', 'LIBROS COMPRADOS 2024-3', ' $244.000,00 ', 'Inglobatec', ''),
(733, 'Cerezo Ramírez, Fuensanta.', 'La violencia en las relaciones entre escolares.\nClaves para entender, evaluar e intervenir en bullying', 'Licenciatura En Educación Básica Primaria', 1, '371.58/C414', 300, 1, 'Horsori Editorial', '2016', 'Español', 'Libros Comprados - 2024-3', ' $45.000,00 ', 'Alfa Editorial', '17049'),
(898, 'Quintanal Díaz, José', 'Enseñanza, fomento e investigación en el proceso de Aprendizaje de la lectoescritura', 'Licenciatura en Educación Básica Primaria', 1, '371.6/Q7', 300, 1, 'Editorial Sanzytorres', '2023', 'Español', 'Libros Comprados - 2024-3', ' $189.000,00 ', 'Inglobatec', ''),
(700, 'Lara Iglesias, Amaranta.', 'Técnicas y recursos de animación en actividades de tiempo libre MF1868_2', 'Licenciatura En Educación Básica Primaria', 1, '371.7/L318', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '17039'),
(879, 'Black-Hawkins, Kristine', 'Expanding Possibilities for Inclusive Learning', 'Licenciatura en Educación Básica Primaria', 1, '371.9/B627', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $235.000,00 ', 'Inglobatec', ''),
(109, 'GILL,Indermit', 'Cerrar la brecha en educacion y tecnología', 'Básicas y transversales', 1, '371.9/G475', 300, 1, 'Banco mundial', '2005', 'Español', 'Donación 2023-3', '$- ', 'Banco mundial', ' '),
(872, 'López Murria, Luiz', 'Educar en llamas un manual de supervivencia y Pedagogía para familias y docentes', 'Licenciatura en Educación Básica Primaria', 1, '371.9/L864', 300, 1, 'Editorial Planeta', '2024', 'Español', 'Libros Comprados - 2024-3', ' $145.000,00 ', 'Inglobatec', ''),
(902, 'Pastor, Carmen Alba', 'Enseñar pensando en todos los estudiantes', 'Licenciatura en Educación Básica Primaria', 1, '371.9/P293', 300, 1, 'Ediciones Sm', '2022', 'Español', 'Libros Comprados - 2024-3', ' $145.000,00 ', 'Inglobatec', ''),
(900, 'Torrego, Juan Carlos', 'Inclusio?n y convivencia en los centros educativos', 'Licenciatura en Educación Básica Primaria', 1, '371.9/T689', 300, 1, 'Editorial Sintesis', '2021', 'Español', 'Libros Comprados - 2024-3', ' $282.000,00 ', 'Inglobatec', ''),
(754, 'Colmenero Ruiz, María Jesus.', 'Atención educativa en centros específicos de educación especial', 'Licenciatura En Educación Básica Primaria', 1, '371.97/C716', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '17068'),
(191, 'Jose Gay ', 'Prescolar Activa ', 'Licenciatura en educación básica primaria', 1, '372.21/J83', 300, 1, 'Oceano', '1977', 'Español', 'Donación 2023-3', '$- ', 'Oceano', ' '),
(878, 'Paatsch, Louise', 'Learning Through Play in the Primary School', 'Licenciatura en Educación Básica Primaria', 1, '372.21/P113', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $265.700,00 ', 'Inglobatec', ''),
(755, 'Fernández Batanero, José María.', 'Atención a la diversidad en el aula de educación infantil', 'Licenciatura En Educación Básica Primaria', 1, '372.212/F363', 300, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '17064'),
(885, 'Dolan, Anne', 'Teaching climate change in primary schools', 'Licenciatura en Educación Básica Primaria', 1, '372.35/D659', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $248.700,00 ', 'Inglobatec', ''),
(772, 'Harlen, Wynne.', 'Principios y grandes ideas para la Educación en ciencias', 'Licenciatura En Educación Básica Primaria', 1, '372.35/H284', 300, 1, 'Editorial Popular', '2018', 'Español', 'Libros Comprados - 2024-3', ' $45.000,00 ', 'Alfa Editorial', '16936'),
(804, 'Equipo Pinto', 'Grafomotricidad. Pinto y Rayo V1', 'Licenciatura en Educación Básica Primaria', 1, '372.5/EQ64/V.1', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $29.000,00 ', 'Alfa Editorial', '16983'),
(806, 'Equipo Pinto', 'Grafomotricidad. Pinto y Rayo V2', 'Licenciatura en Educación Básica Primaria', 1, '372.5/EQ64/V.2', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $29.000,00 ', 'Alfa Editorial', '16984'),
(808, 'Equipo Pinto', 'Grafomotricidad. Pinto y Rayo V3', 'Licenciatura en Educación Básica Primaria', 1, '372.5/EQ64/V.3', 300, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $29.000,00 ', 'Alfa Editorial', '16985'),
(790, 'Fontal Merillas, Olaia.', 'Educación de las artes visuales y plásticas en educación primaria ', 'Licenciatura En Educación Básica Primaria', 1, '372.5/F678', 300, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '16982'),
(481, 'Aguirre, Mauricio', 'Cómo leer y escribir en la universidad', 'Básicas y transversales', 1, '372.6/AG284', 300, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              135.800,00', 'Ecoe', ' '),
(880, 'Arizpe, Evelyn', 'Children Reading Pictures', 'Licenciatura en Educación Básica Primaria', 1, '372.6/AR719', 300, 1, 'Routledge', '2023', 'Inglés', 'Libros Comprados - 2024-3', ' $275.000,00 ', 'Inglobatec', ''),
(826, 'Pastor, Andrea.', '\nLengua, Comunicación y literatura. Nivel II', 'Licenciatura en Educación Básica Primaria', 1, '372.6/P293', 300, 1, 'Paraninfo', '2011', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16993'),
(881, 'Stevenson, Alison', 'Descriptosaurus Personal Writing', 'Ingeniería en Seguridad y Salud en el trabajo', 1, '372.64/ST847', 300, 1, 'Routledge', '2022', 'Inglés', 'Libros Comprados - 2024-3', ' $240.000,00 ', 'Inglobatec', ''),
(567, 'Jiménez, María', 'Programación integrada para primaria', 'Licenciatura en educación básica primaria', 1, '372.86/J61', 300, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                34.300,00', 'Ecoe', ''),
(397, 'Rivas, Pablo ', 'Lifelong learning. El aprendizaje como  forma de vida', 'Básicas y transversales', 1, '374/R618', 300, 1, 'Alpha Editorial', '2023', 'Español', 'Libros Comprados - 2023-3', ' $                55.000,00', 'Alpha Editorial', ''),
(648, 'Birkenbihl, Michael.', 'Manual práctico para educadores y profesores, con 21 juegos de rol y estudio de casos', 'Licenciatura En Educación Básica Primaria', 1, '378.1/B619', 300, 1, 'Paraninfo', '2008', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '17030'),
(865, 'Pastor, Andrea.', 'Comunicación y Sociedad II', 'Licenciatura en Educación Básica Primaria', 1, '378.1/P293', 300, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '17063'),
(488, 'Corte, Maria', 'Escritura académica en la formación universitaria', 'Básicas y transversales', 1, '378.17/C827', 300, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              115.800,00', 'Ecoe', ' '),
(444, 'Navas, Maria Eugenia', 'Currículo: teorías, conceptualización y tendencias', 'Básicas y transversales', 1, '378.199/N322', 300, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                68.300,00', 'Ecoe', ' '),
(922, 'RIPOLL, María ', 'Universidad Tecnológica de Bolívar 50 años ', 'Básicas y transversales', 1, '378.86114/ R592 CDD 23', 300, 1, 'Universidad Tecnológica de Bolívar ', '2022', 'Español', 'Donación 2025-1', ' $-   ', 'Universidad Tecnológica de Bolívar ', 'NO, REGISTRADO'),
(402, 'Campos, Alejandro', 'Formación Emprendedora en la Educación Superior', 'Básicas y transversales', 1, '378/C198', 300, 1, 'Diaz de santos', '2022', 'Español', 'Libros Comprados - 2023-3', ' $              160.000,00', 'Diaz de santos', ''),
(483, 'Restrepo, Jannet', 'Costeo de operaciones internacionales ', 'Tecnica profecional en Logistica', 1, '382.6/R436', 300, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              106.000,00', 'Ecoe', ' '),
(75, 'FUENMAYOR,Jose', 'Cuentos Colombianos', 'Básicas y transversales', 1, '395/F954', 300, 1, 'Alfaguara', '1967', 'Español', 'Donación 2023-3', '$- ', 'Alfaguara', ''),
(605, 'Mandela, Nelson ', 'Mis Cuentos Africanos', 'Licenciatura en Educación Básica Primaria', 1, '398.2/M271', 300, 1, 'Siruela', '2017', 'Español', 'Libros Comprados - 2024-3', ' $118.000,00 ', 'Alfa Editorial', '17017'),
(309, 'PILKEY, Dav', 'Un amigo para dragón', 'Básicas y transversales', 1, '398.2/P639', 300, 1, 'Scholastic', '2017', 'Español', 'Donación 2023-3', '$- ', 'Scholastic', ''),
(58, 'gibran,Khalil', 'El profeta', 'Básicas y transversales', 1, '398.9861/G447', 300, 1, 'Edimat Libros', '2000', 'Español', 'Donación 2023-3', '$- ', 'Edimat Libros', ''),
(892, 'López, Garcia ', 'Psicolinguistica (19) (Literatura y Lingüística,Lingüística) ', 'Licenciatura en Educación Básica Primaria', 1, '401/L864', 400, 1, 'Editorial Sintesis', '2020', 'Español', 'Libros Comprados - 2024-3', ' $148.500,00 ', 'Inglobatec', ''),
(127, 'RODRIGUEZ,Alvaro', 'Aproximación al texto escrito', 'Básicas y transversales', 1, '401/R696', 400, 1, 'Editorial Ealon', '1980', 'Español', 'Donación 2023-3', '$- ', 'Editorial Ealon', ' '),
(870, 'Jimenez C, Francisco ', 'Manual de formación para profesores de ELE', 'Licenciatura en Educación Básica Primaria', 1, '407/J61', 400, 1, 'SGEL', '2019', 'Español', 'Libros Comprados - 2024-3', ' $315.000,00 ', 'Inglobatec', ''),
(873, 'Padilla, Lillie', 'Representation, Inclusion and Social Justice in World Language Teaching', 'Licenciatura en Educación Básica Primaria', 1, '407/P123', 400, 1, 'Routledge', '2024', 'Inglés', 'Libros Comprados - 2024-3', ' $175.000,00 ', 'Inglobatec', ''),
(526, 'Niño, Víctor', 'Semiótica y linguistica.  Fundamentos', 'Licenciatura en educación básica primaria', 1, '410.1/N717', 400, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                27.300,00', 'Ecoe', ' '),
(506, 'Rojas, Sandra', 'La linguistica.  Una reflexión en torno al proceso de aprendizaje para docentes ', 'Licenciatura en educación básica primaria', 1, '410.71/R741', 400, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                41.300,00', 'Ecoe', ' '),
(749, 'Pastor, Andrea.', 'Competencia: Comunicación en lengua castellana', 'Básicas y transversales', 1, '410/P293', 400, 1, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '17054'),
(99, 'CORRIPIO,Fernando', 'Diccionario practico Sinonimos antonimos', 'Básicas y transversales', 1, '413.02/C821', 400, 1, 'Intermedio editores', '2000', 'Español', 'Donación 2023-3', '$- ', 'Intermedio editores', ''),
(947, 'Pierre, Larousse', 'El Pequeño Larousse Ilustrado', 'Básicas y transversales', 1, '413/P622', 400, 1, 'Larousse', '1997', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(763, 'Carrera Sabaté, Josefina ', 'Comunicar Linguistica para la práctica logopédica', 'Licenciatura en Educación Básica Primaria', 1, '414/C314', 400, 1, 'Horsori', '2017', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '17066'),
(875, 'Sánchez,  Julián ', 'Claves para el comentario de texto Lingüístico y Pragmático', 'Licenciatura en Educación Básica Primaria', 1, '415/SA194', 400, 1, 'Independently published', '2022', 'Español', 'Libros Comprados - 2024-3', ' $112.500,00 ', 'Inglobatec', ''),
(532, 'Areiza, Rafael', 'Sociolinguistica enfoques pragmático y variacionista', 'Licenciatura en educación básica primaria', 1, '418.006/AR679', 400, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                63.000,00', 'Ecoe', ' '),
(896, 'García Pérez, Manuel', 'Comentario literario y Lingüístico para opositores a Lengua y Literatura', 'Licenciatura en Educación Básica Primaria', 1, '420.7/G216', 400, 1, 'Mundiediciones', '2022', 'Español', 'Libros Comprados - 2024-3', ' $115.000,00 ', 'Inglobatec', ''),
(101, 'SECO,Manuel', 'Diccionario de dudas y dificultades de la lengua española', 'Básicas y transversales', 1, '465/SE445', 400, 1, 'Ediciones Espasa Calpe', '1992', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Espasa Calpe', ''),
(949, 'Pierre, Larousse', 'Diccionario Practico para Colombia y America Latina', 'Básicas y transversales', 1, '468.42/P622', 400, 1, 'Larousse ', '2008', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(939, 'Real Academia Española', 'Nueva Gramatica de la Lengua Española ', 'Básicas y transversales', 1, '468/R288', 400, 1, 'Asociacion de Academias de la Lengua Española', '2010', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(135, 'SWENSON,Hugo', 'Physical Science for liberal arts students', 'Básicas y transversales', 1, '500/SW974', 500, 1, 'Publishers John Wiley', '2000', 'Ingles', 'Donación 2023-3', '$- ', 'Publishers John Wiley', ' '),
(702, 'García Pineda, Pilar', 'Iniciación a la Matemática Universitaria', 'Básicas y transversales', 1, '510.71/G216', 500, 1, 'Thomson ', '2007', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16835'),
(867, 'San Martín Moreno, Jesús', 'Métodos matemáticos. Ampliación de matemáticas para ciencias e ingeniería', 'Básicas y transversales', 1, '510/A196', 500, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $29.000,00 ', 'Alfa Editorial', ' 16954'),
(554, 'Buenaventura, Guillermo', 'Fundamentos de matemáticas financieras', 'Básicas y transversales', 1, '510/B928', 500, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                59.000,00', 'Ecoe', ' '),
(828, 'Calvo Rojo, Carmen', 'La aventura de los números 1', 'Básicas y Transversales', 1, '510/C169', 500, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $29.000,00 ', 'Alfa Editorial', '16996'),
(824, 'García Fueyo, Montserrat', 'La fantástica historia de los números ', 'Básicas y Transversales', 1, '510/G216', 500, 1, 'Paraninfo', '2012', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16992'),
(741, 'Mónica Argueso', 'Matemáticas II', 'Básicas y Transversales', 1, '510/M744', 500, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16938'),
(747, 'Pastor, Andrea.', 'Competencia: Matemática Nivel 2', 'Básicas y transversales', 1, '510/P293', 500, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '17051'),
(362, 'Sánchez González, Álvaro', 'Las matematicas en 100 preguntas  1ed.', 'Básicas y transversales', 1, '510/SA194', 500, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                78.000,00', 'Alpha Editorial', ''),
(913, 'Sociedad Colombiana de matematicas ', 'Lecturas Matematicas', 'Básicas y transversales', 1, '510/SO678', 500, 1, 'Sociedad Colombiana de matematicas ', '1998', 'Español', 'Donación 2025-1', ' $-   ', 'Sociedad Colombiana de matematicas ', 'NO, REGISTRADO'),
(160, 'VIDAURRI AGUIRRE, Héctor Manuel', 'Matemáticas financieras', 'Básicas y transversales', 1, '510/V651', 500, 1, 'Cengage Learning Editores S.A.', '2020', 'Español', 'Donación 2023-3', '$- ', 'Distridactika', ''),
(751, 'Benavent, Roberto', 'Cuestiones Sobre Algebra Lineal', 'Básicas y transversales', 1, '512/B456', 500, 1, 'Paraninfo', '2010', 'Español', 'Libros Comprados - 2024-3', ' $30.000,00 ', 'Alfa Editorial', '17055'),
(25, 'HANSON,Robert', 'Student Problem Manual', 'Administración de Negocios Internacionales', 1, '515.135/H251', 500, 1, 'Mcgrawhill Higher Education', '2002', 'Ingles', 'Donación 2023-3', '$- ', 'Mcgrawhill Higher Education', ''),
(794, 'Bellido Guerrero, José Carlos.', 'Ecuaciones en derivadas parciales', 'Básicas y transversales', 1, '515.35/	B443', 500, 1, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $30.000,00 ', 'Alfa Editorial', '16815'),
(704, 'Galindo Soto, Félix.', 'Guía práctica de cálculo infinitesimal en varias variables', 'Básicas y transversales', 1, '515.8/G158', 500, 1, 'Thompson', '2005', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16800'),
(769, 'Galindo Soto, Felix', 'Guia Practica de Calculo Infinitesimal en una Variable Real', 'Básicas y transversales', 1, '515/G158', 500, 1, 'Thomson', '2003', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16739'),
(108, 'BRUÑO,G.M', 'Curso elemental de trigonometria rectilinea', 'Básicas y transversales', 1, '516.22/B914', 500, 1, 'Editorial Enseñanza', '1962', 'Español', 'Donación 2023-3', '$- ', 'Editorial Enseñanza', ''),
(695, 'Aragón Salgado, Luz Gricel.', 'Estadística en el área de las ciencias sociales y administrativas', 'Básicas y transversales', 1, '519.5/AR659', 500, 1, 'Alfaomega', '2016', 'Español', 'Libros Comprados - 2024-3', ' $70.000,00 ', 'Alfa Editorial', '16764'),
(129, 'CANAVOS,George', 'Probabilidad y Estadística aplicaciones y metodos', 'Básicas y transversales', 1, '519.5/C213', 500, 1, 'Mcgrawhill ', '1988', 'Español', 'Donación 2023-3', '$- ', 'Mcgrawhill ', ' '),
(111, 'FREEDMAN,David', 'Statistics', 'Básicas y transversales', 1, '519.5/F853', 500, 1, 'Prentice Hall', '1979', 'Español', 'Donación 2023-3', '$- ', 'Prentice Hall', ''),
(491, 'Grisales, Andrés', 'Estadística descriptiva y probabilidad Con aplicaciónes en Excel y spss', 'Básicas y transversales', 1, '519.5/G869', 500, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              179.800,00', 'Ecoe', ' '),
(489, 'Martínez, Ciro', 'Estadística básica aplicada', 'Básicas y transversales', 1, '519.5/M385/2019', 500, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              218.000,00', 'Ecoe', ' '),
(516, 'Trejos, Omar', 'Probabilidad y estadística para ingenieros', 'Administración de Negocios Internacionales', 1, '519.5/T787', 500, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                75.000,00', 'Ecoe', ' '),
(128, 'LARSOM,Harold', 'Introducción a la teoría de probabilidades e Indiferencia estadistica', 'Básicas y transversales', 1, '519.54/L334', 500, 1, 'Editorial Limusa', '1978', 'Español', 'Donación 2023-3', '$- ', 'Editorial Limusa', ' '),
(401, 'Díaz, Cabrera, Moises', 'Contrastes de Hipótesis Paramétricos: Problemas Resueltos', 'Básicas y transversales', 1, '519.544/D542', 500, 1, 'Diaz de santos', '2022', 'Español', 'Libros Comprados - 2023-3', ' $              165.000,00', 'Diaz de santos', ''),
(667, 'Caseres, Diego A.', 'Problemas Resueltos De Matematicas para Ingenieria', 'Básicas y transversales', 1, '519/C338', 500, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16763'),
(742, 'Mónica Argueso', 'Matemáticas aplicadas a las ciencias sociales II', 'Básicas y Transversales', 1, '519/M744', 500, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '17052'),
(277, 'ANDERSON, Annmarie', 'The Magic School Bus Rides Again Satellite Space Mission', 'Básicas y transversales', 1, '520.7/AN545', 500, 1, 'Scholastic', '2018', 'Ingles', 'Donación 2023-3', ' $  ', 'Scholastic', ' '),
(620, 'Martínez Badenas, Vicent.', 'La astronomía en 100 preguntas', 'Básicas y transversales', 1, '520/M385', 500, 1, 'Nowtilus', '2021', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '16926'),
(682, 'Cuartas Restrepo, Pablo.', 'Un salto gigantesco. \nEl hombre en la Luna: La aventura del Apolo', 'Básicas y transversales', 1, '523.2/C961', 500, 1, 'Cielo Abierto Colección', '2011', 'Español', 'Libros Comprados - 2024-3', ' $21.000,00 ', 'Alfa Editorial', '17037'),
(821, 'Lléo, A.', 'Problemas y cuestiones de Física', 'Ingeniería mecatrónica', 1, '530.076/L791', 500, 1, 'Grupo Mundi-Prensa', '2002', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16664'),
(279, 'KATSCHKE, Judy', 'The Magic School Bus Rides Again. Monster Power', 'Básicas y transversales', 1, '530.4/K19', 500, 1, 'Scholastic', '2018', 'Ingles', 'Donación 2023-3', ' $  ', 'Scholastic', ' '),
(707, 'Serway Raymond A.', 'Fisica Electricidad y Magnetismo, Luz, Física Moderna', 'Básicas y transversales', 1, '530/SE492/V.1', 500, 1, 'Thomson', '2004', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16712'),
(708, 'Serway Raymond A.', 'Fisica Electricidad y Magnetismo, Luz, Física Moderna', 'Básicas y transversales', 1, '530/SE492/V.2', 500, 2, 'Thomson', '2004', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16712'),
(666, 'Melendez Martinez, Juan J.', 'Problemas Resueltos De Física De Los Solidos', 'Básicas y transversales', 1, '531/M519', 500, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16762'),
(917, 'HOYUELOS, Miguel', 'Introduccion al no Equilibrio', 'Electromecánica', 1, '536/H869', 500, 1, 'Reverté', '2017', 'Español', 'Donación 2025-1', ' $-   ', 'Reverté', 'NO, REGISTRADO'),
(710, 'Fidalgo Sánchez, José Antonio.', 'Física y Química', 'Básicas y transversales', 1, '539/F449', 500, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16738'),
(619, 'Vinagre Arias, Francisco.', 'Cuestiones curiosas de química', 'Básicas y transversales', 1, '540.2/V766', 500, 1, 'Alianza Editorial', '2006', 'Español', 'Libros Comprados - 2024-3', ' $60.000,00 ', 'Alfa Editorial', '16923'),
(360, 'Estañ Cerezo, Gabriel', 'La quimica en 100 preguntas  1ed.', 'Básicas y transversales', 1, '540/ES79', 500, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                78.000,00', 'Alpha Editorial', ''),
(795, 'Orozco Barrenetxea, Carmen.', 'Problemas resueltos de química aplicada', 'Básicas y transversales', 1, '540/OR74', 500, 1, 'Paraninfo', '2011', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16818'),
(770, 'Requena, Alberto', 'Quimica Fisica. problemas de Termodinamica, Cinetica y Electronica', 'Básicas y transversales', 1, '541/AD239', 500, 1, 'Alfaomega', '2013', 'Español', 'Libros Comprados - 2024-3', ' $77.000,00 ', 'Alfa Editorial', '16709'),
(27, 'METTERS,Richard', 'Service Operations Management', 'Administración de Negocios Internacionales', 1, '5415.5/M48/2006', 500, 1, 'Thomson South-Western', '2003', 'Ingles', 'Donación 2023-3', '$- ', 'Thomson South-Western', ''),
(354, 'Pozuelo Echegaray, Jaione', 'La biologia en 100 preguntas  1ed.', 'Básicas y transversales', 1, '574/P893', 500, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                78.000,00', 'Alpha Editorial', ''),
(738, 'Yélamos López, María Belén.', 'Biología', 'Ingeniería Industrial', 1, '574/Y83', 500, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16663'),
(453, 'Palacios, Luis', 'Fundamentos de ecología y medio ambiente ', 'Salud Ocupacional', 1, '577/P153', 500, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                55.000,00', 'Ecoe', ' '),
(729, 'González Bueno,  Antonio', 'Linneo : el príncipe de los botánicos ', 'Básicas y transversales', 1, '580.9092/AN635', 500, 1, 'Nivola Libros Ediciones', '2001', 'Español', 'Libros Comprados - 2024-3', ' $51.500,00 ', 'Alfa Editorial', '17057'),
(119, 'DE CHARDIN,Teilhard', 'El grupo zoológico humano', 'Básicas y transversales', 1, '599.9/D293', 500, 1, 'Ediciones Tauros', '1960', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Tauros', ' '),
(139, 'MANCO,Dino', 'Nomenclatura condensada de barranquilla', 'Básicas y transversales', 1, '610.28/M269', 600, 1, 'Regiones Calabria', '1960', 'Español', 'Donación 2023-3', '$- ', 'Regiones Calabria', ' '),
(632, 'Terán Pérez, Moisés David.', 'Bioingeniería', 'Ingeniería mecatrónica', 1, '610.284/T315', 600, 1, 'Alfaomega', '2017', 'Español', 'Libros Comprados - 2024-3', ' $99.000,00 ', 'Alfa Editorial', '16719'),
(530, 'Puyosa, Audy', 'Sistema de inspección brilab', 'Básicas y transversales', 1, '613.62/P99', 600, 2, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                42.000,00', 'Ecoe', ' '),
(467, 'Ceballos, Oswaldo', 'Actividad física y deporte', 'Salud Ocupacional', 1, '613.71 A188', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                84.000,00', 'Ecoe', ' '),
(851, 'García, Ruth', 'Intervención en la atención higiénico-alimentaria en instituciones ', 'Básicas y Transversales', 1, '614.3/G216', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '17003'),
(387, 'Gutiérrez Falcón, Pablo César', 'Prevencion y control de incendios  1ed.', 'Salud Ocupacional', 1, '614.842/G984', 600, 1, 'Alpha Editorial', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                55.000,00', 'Alpha Editorial', ''),
(706, 'Martinez Atienza,Juan F.', 'Promocion de la Salud ', 'Salud Ocupacional', 1, '614/M385', 600, 1, 'Paraninfo', '2012', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16757'),
(548, 'Molina,Francisco J.', 'Enfoque del paciente en medicina intensiva', 'Salud Ocupacional', 1, '616.028/UR76', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                85.000,00', 'Ecoe', ' '),
(518, 'Ocu', 'Pruebas médicas', 'Salud Ocupacional', 1, '616.075/OC251', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              100.100,00', 'Ecoe', ' '),
(520, 'Restrepo, Rodrigo', 'Radiología e imágenes diagnósticas', 'Salud Ocupacional', 1, '616.075/R44', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                58.000,00', 'Ecoe', ' '),
(432, 'Wilches, Esther', 'Medición en fisioterapia cardiopulmonar', 'Tecnologia en Gestion de Seguridad y Salud en el Trabajo', 1, '616.106/W667', 600, 1, 'Ecoe', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                89.500,00', 'Ecoe', ' '),
(511, 'Amézquita, Clara', 'Manual de electrocardiografía básica', 'Salud Ocupacional', 1, '616.12075/AM514', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                41.300,00', 'Ecoe', ' '),
(556, 'Franco, Felipe', 'Gastroenterología y hepatología', 'Salud Ocupacional', 1, '616.362/F825', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                98.700,00', 'Ecoe', ' '),
(429, 'Organización de Consumidores y Usuarios', 'Alzhéimer y otras demencias', 'Tecnologia en Gestion de Seguridad y Salud en el Trabajo', 1, '616.8311/OC21', 600, 1, 'Ecoe', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                59.400,00', 'Ecoe', ' '),
(802, 'Carballo Fariñas,María ', 'Coaching para quienes viven con TDAH trastorno por déficid de atención con 0 sin hiperactividad ', 'Licenciatura en Educación Básica Primaria', 1, '616.8589/C263', 600, 1, 'Alfaomega', '2016', 'Español', 'Libros Comprados - 2024-3', ' $65.000,00 ', 'Alfa Editorial', '16989'),
(465, 'Cabanzo, Rocio', 'Psicoanálisis vincular online', 'Básicas y transversales', 1, '616.89/C112', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              147.800,00', 'Ecoe', ' '),
(570, 'Palacio, Carlos', 'Psiquiatría', 'Salud Ocupacional', 1, '616.89/P153', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $              110.000,00', 'Ecoe', ''),
(471, 'Org de Consumidores y Usuarios', 'Alergias ¿qué son y cómo vivir con ellas?', 'Salud Ocupacional', 1, '616.97/OR68', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                75.600,00', 'Ecoe', ' '),
(442, 'Org de Consumidores y Usuarios', 'Convivir con el cáncer', 'Tecnologia en Gestion de Seguridad y Salud en el Trabajo', 1, '616.994/OR68', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                51.500,00', 'Ecoe', ' '),
(575, 'Uribe, Alejandro', 'Enfoque de trauma ortopédico', 'Salud Ocupacional', 1, '617.47/UR33', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                91.000,00', 'Ecoe', ''),
(534, 'Radi, José', 'Urgencias odontológicas', 'Salud Ocupacional', 1, '617.601/R129', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                73.900,00', 'Ecoe', ' '),
(577, 'Hurtado, Camilo', 'Ortopedia Maxilar integral', 'Tecnologia en Gestion de Seguridad y Salud en el Trabajo', 1, '617.643/H947', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                58.000,00', 'Ecoe', ''),
(525, 'Jiménez, Ingrid', 'Salud ocupacional en optometría', 'Salud Ocupacional', 1, '617.75/J61', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                99.000,00', 'Ecoe', ' '),
(479, 'Villegas, Francisco', 'Cirugía plástica', 'Salud Ocupacional', 1, '617.95/V732', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              292.000,00', 'Ecoe', ' '),
(448, 'Montero, Ricardo', 'Ergonomía: productividad, calidad y seguridad', 'Salud Ocupacional', 1, '620.82/M778', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              108.000,00', 'Ecoe', ' '),
(715, 'Alcalde San Miguel, Pablo.', 'Curso de electricidad general 1', 'Ingeniería Eléctrica', 1, '621.3/A346', 600, 1, 'Paraninfo', '2009', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16933'),
(716, 'Alcalde San Miguel, Pablo.', 'Curso de electricidad general 2', 'Ingeniería Eléctrica', 1, '621.3/A346a', 600, 1, 'Paraninfo', '2009', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17044'),
(793, 'Roldán Viloria, José.', 'Fórmulas y datos prácticos para electricistas', 'Ingeniería Eléctrica', 1, '621.3/R744', 600, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16817'),
(461, 'Tenedor, Ángel', 'Montaje y mantenimiento de redes eléctrica', 'Mecatronica', 1, '621.31923/T292', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              103.000,00', 'Ecoe', ' '),
(757, 'Gago, Alfonso.', 'Iluminación con tecnología Led', 'Ingeniería Eléctrica', 1, '621.32/G136', 600, 1, 'Paraninfo', '2012', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16665'),
(696, 'Grabowski, Bogdan.', 'Prontuario de electrónica', 'Ingeniería Eléctrica', 1, '621.381/G728', 600, 0, 'Paraninfo', '2000', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16782'),
(543, 'Rincón, Mario', 'Diseño geométrico de vías con civil 3d ', 'Salud Ocupacional', 1, '625.725/R579', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                35.000,00', 'Ecoe', ' '),
(422, 'Marín Galvín, Rafael', 'Fisicoquímica y microbiología de los medios acuáticos. Tratamiento y control de calidad de aguas 2da. Ed.', 'Básicas y transversales', 1, '628.16/M338', 600, 1, 'Diaz de santos', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              200.000,00', 'Diaz de santos', ''),
(650, 'Perales, Tomás.', 'El hombre del futuro\nMitad humano, mitad máquina', 'Ingeniería mecatrónica', 1, '629.892/P426', 600, 1, 'RC Libros', '2023', 'Español', 'Libros Comprados - 2024-3', ' $46.000,00 ', 'Alfa Editorial', '16929'),
(19, 'ANUPINDI,Ravi', 'Managing Business Process Flows', 'Administración de Negocios Internacionales', 1, '629.895/AN636', 600, 1, 'Prentice Hall', '1999', 'Ingles', 'Donación 2023-3', '$- ', 'Prentice Hall', ''),
(536, 'Aguirre, José', 'Administración y control de empresas agropecuarias ', 'Tecnica Profecional en Operaciones de Procesos Empresariales', 1, '630.68/AG284', 600, 2, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                28.000,00', 'Ecoe', ' '),
(765, 'Moreno Vega, José María.', 'Organización y gestión de la empresa agraria UF0392', 'Tecnología en Gestión Administrativa', 1, '631.115/M843', 600, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16880'),
(932, 'Fedegan', 'Plan Estrategico de la Ganaderia Colombiana 2019', 'Técnica profesional en  Operación de Procesos Industriales', 1, '636.2/F292', 600, 1, 'Fedegan', '2006', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(104, 'PORTER,J', 'Leches y productos lacteos', 'Básicas y transversales', 1, '637.1/P845', 600, 1, 'Editorial acribia', '1975', 'Español', 'Donación 2023-3', '$- ', 'Editorial acribia', ''),
(538, 'Reyes, Lucy', 'Cocine sano con vegetales para lucyrse', 'Salud Ocupacional', 1, '641.5/R457', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                62.000,00', 'Ecoe', ' '),
(571, 'Heredia, Martha', 'Recetas veganas para toda ocasión', 'Básicas y transversales', 1, '641.56/H542', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                55.000,00', 'Ecoe', ''),
(114, 'MORALES,Enrique', 'Fogón Caribe', 'Tecnología En Gestión Logística Internacional', 1, '641.59729/M828', 600, 1, 'Editorial la iguana ciega', '2010', 'Español', 'Donación 2023-3', '$- ', 'Editorial la iguana ciega', ' '),
(107, 'HINKIN,Timothy', 'Cases in Hospitality Management', 'Básicas y transversales', 1, '647.94/H663', 600, 1, 'John Wiley ', '2000', 'Ingles', 'Donación 2023-3', '$- ', 'John Wiley ', ''),
(39, 'SCHMIDGALL,Raymond', 'Hospitality Industry Managerial Accounting', 'Tecnología En Gestión Logística Internacional', 1, '647.94/S348', 600, 1, 'Hospitality Industry', '2002', 'Ingles', 'Donación 2023-3', '$- ', 'LAROUSSE', ''),
(21, 'DURÓN,Carlos', 'El restaurante como empresa', 'Administración de Negocios Internacionales', 1, '647.95/D937', 600, 1, 'Editorial Trillas', '2008', 'Español', 'Donación 2023-3', '$- ', 'Editorial Trillas', ''),
(528, 'Flores, Adrián', 'Servicio básico de restaurante y bar', 'Básicas y transversales', 1, '647.95/F634', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                35.000,00', 'Ecoe', ' '),
(26, 'MORFÍN,María', 'Administración de Comerdor y Bar', 'Administración de Negocios Internacionales', 1, '647.95/M846', 600, 1, 'Editorial Trillas', '2006', 'Español', 'Donación 2023-3', '$- ', 'Editorial Trillas', ''),
(35, 'NINEMEIER,Jack', 'Food and Beverage Management', 'Tecnología En Gestión Logística Internacional', 1, '647.95/N622', 600, 1, 'Educational Institute', '1995', 'Ingles', 'Donación 2023-3', '$- ', 'Educational Institute', ''),
(40, 'BIRCHFIELD,John', 'Design and layout of foodservice facilities', 'Tecnología En Gestión Logística Internacional', 1, '647.95068/B6171', 600, 1, 'Wiley', '2003', 'Ingles', 'Donación 2023-3', '$- ', 'LAROUSSE', ''),
(189, 'Jannet Arismendi J.', 'Nutricion infantil ', 'Licenciatura en educación básica primaria', 1, '649.6/J34', 600, 1, 'Editorial Gamma', '2008', 'Español', 'Donación 2023-3', '$- ', 'Conservatorio del Tolima', ' '),
(378, 'Arnaiz Ecker, Elena', 'Pon tu talento en accion, ordena y construye tu espacio de desarrollo profesional 1ed.', 'Administración de Negocios Internacionales', 1, '650.1/AR742', 600, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                83.000,00', 'Alpha Editorial', ''),
(641, 'Minhong, Yu.', 'New oriental education\nLa enseñanza privada del inglés en China', 'Básicas y transversales', 1, '650.1/M664', 600, 1, 'Editorial Popular', '2017', 'Español', 'Libros Comprados - 2024-3', ' $32.000,00 ', 'Alfa Editorial', '16730'),
(910, 'SALGUEIRO, Amado', 'Cómo ser Eficaz y Administrar su Tiempo', 'Administración de Negocios Internacionales', 1, '650.1/SA164', 600, 1, 'Diaz De Santos S.A', '2003', 'Español', 'Donación 2025-1', ' $-   ', 'Diaz De Santos S.A', 'NO, REGISTRADO'),
(466, 'Véliz, Fernando', '101 caminos para sobrevivir al mundo del trabajo', 'Salud Ocupacional', 1, '650.1/V437', 0, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                92.000,00', 'Ecoe', ' '),
(351, 'Meana Lama, Marco', 'Emprende y gana motivacion + confianza = exito 1ed.', 'Básicas y transversales', 1, '650.13/M483', 600, 1, 'Alpha Editorial', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                44.000,00', 'Alpha Editorial', ''),
(911, 'PUCHOL, Luis', 'EL Libro del Curriculum Vitae', 'Básicas y transversales', 1, '650.14/P977', 600, 1, 'Diaz De Santos S.A', '2008', 'Español', 'Donación 2025-1', ' $-   ', 'Diaz De Santos S.A', 'NO, REGISTRADO'),
(513, 'Remolins, Eduardo', 'Manual de supervivencia para dinosaurios empresariales', 'Administración de Negocios Internacionales', 1, '650.14/R389', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                59.000,00', 'Ecoe', ' '),
(720, 'Gonzale Mendez, Jose A.', 'Implantación Y Control De Un Sistema Contable Informático UF0316', 'Administración de Negocios Internacionales', 1, '657.028/	G643', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16832'),
(452, 'Mesa, Gloria', 'Fundamentos de contabilidad ', 'Tecnología en Gestión Administrativa', 1, '657.04/M578', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              106.000,00', 'Ecoe', ' '),
(552, 'Mantilla, Samuel', 'Estandares/Normas internacionales de informacion financiera (IFRS/NIIF) : Incluye ejercicios y estudio de casos', 'Administración de Negocios Internacionales', 1, '657.320281/M292e/2018', 600, 2, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $              103.600,00', 'Ecoe', ' '),
(670, 'Aparicio, Adolfo', 'Calculo Financiero Teoria y Ejercicios', 'Gestión Administrativa comercial ', 1, '657.42/AP639', 600, 1, 'Paraninfo', '1999', 'Español', 'Libros Comprados - 2024-3', ' $31.000,00 ', 'Alfa Editorial', '16796'),
(495, 'García, Javier', 'Estrategia tributaria', 'Tecnico Profecional en Operaciones Logisticas', 1, '657.46/G216', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              203.800,00', 'Ecoe', ' '),
(3, 'BERRÍO, Deysi', 'Costos para gerenciar organizaciones manufactureras comerciales y de servicios', 'Administración de Negocios Internacionales', 1, '657.48/B533c', 600, 1, 'Ediciones Uninorte', '2003', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Uninorte', ''),
(915, 'SUÁREZ, Jesús', 'Cuentas y Cuentos  ... Cuida de las públicas: Custodia de la probidad', 'Básicas y transversales', 1, '657.61 / SU939 ed.23', 600, 1, 'Anthos Contable', '2020', 'Español', 'Donación 2025-1', ' $-   ', 'Anthos Contable', 'NO, REGISTRADO'),
(474, 'Márquez, René', 'Auditoría forense', 'Salud Ocupacional', 1, '657.83/M357', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              143.800,00', 'Ecoe', ' '),
(482, 'Vásquez, Everth', 'Contabilidad para Pymes. Fundamentos basados en normas internaciónales', 'Tecnologia en Gestion de Sistemas Integrados', 1, '657.9042/V335', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              141.800,00', 'Ecoe', ' '),
(312, 'CHAVARRIA, María Ángeles.', 'Actitud Emprendedora, Pasion y Teson', 'Básicas y transversales', 1, '658.002/Ch512', 600, 1, 'Alfaomega', '2010', 'Español', 'Donación 2023-3', '$ - ', 'Alfaomega', ''),
(316, 'SCHNARCH, Alejandro.', 'Emprendimiento Exitoso. Cómo mejorar su proceso y gestión', 'Básicas y transversales', 1, '658.022/S357', 600, 1, 'Ecoe', '2022', 'Español', 'Donación 2023-3', '$-   ', 'Ecoe', ''),
(392, 'Torres,Alfonso J.', 'Emprende en digital, diseña y valida tu startup 1ed.', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.0222/T693', 600, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                65.000,00', 'Alpha Editorial', ''),
(823, 'Casillas, José Carlos', 'La gestión de la empresa familiar. Conceptos, casos y soluciones ', 'Tecnología en Gestión Administrativa', 1, '658.045/C339', 600, 1, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16871'),
(159, 'PENG, Mike', 'Negocios globales', 'Administración de Negocios Internacionales', 1, '658.049/P398', 600, 1, 'Cengage ', '2018', 'Español', 'Donación 2023-3', '$- ', 'Cengage ', ''),
(166, 'JOYANES AGUILAR, Luis.', 'Inteligencia de negocios y analítica de datos', 'Administración de Negocios Internacionales', 1, '658.1/J88', 600, 1, 'Alfaomega ', '2019', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ''),
(778, 'Martin Castejon Pedro J.', 'Guia Practica de Estadistica Aplicada e la Empresa y al Marketing', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.1/M383', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16860'),
(740, 'Pelayo, Gonzalez Javier', 'Iniciacion a la Actividad Emprendedora y Empresarial. La Importacia de LLamarse Emprendedor ', 'Gestión Administrativa comercial ', 1, '658.1/P381', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16854'),
(774, 'Rodes Bach, Adolf', 'Gestion Economica y Financiera de la Empresa', 'Gestión Empresarial', 1, '658.1/R688', 600, 1, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16866'),
(542, 'Arévalo, Héctor', 'Creación de empresas Guia practica', 'Tecnica Profecional en Operaciones de Procesos Empresariales', 1, '658.11/A683', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                67.000,00', 'Ecoe', ' '),
(464, 'Joan Mir, Juliá', 'Planes de negocio', 'Administración de Negocios Internacionales', 1, '658.11/J94', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              141.200,00', 'Ecoe', ' '),
(553, 'Ortiz, Óscar', 'Fantasías que crean empresa', 'Administración de Negocios Internacionales', 1, '658.11/O78 ', 600, 2, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                33.600,00', 'Ecoe', ' '),
(897, 'Diaz Miranda, Raul', 'Arquetipos: Cómo utilizar Psicologia para crear marcas poderosas', 'Administracíon de negocios internacionales', 1, '658.14/D542', 600, 1, 'Independently published', '2022', 'Español', 'Libros Comprados - 2024-3', ' $265.000,00 ', 'Inglobatec', ''),
(20, 'ESTERFIELD,Ross', 'Corporate Finnance ', 'Administración de Negocios Internacionales', 1, '658.15/ES79 ', 600, 1, 'Mcgrawhill Higher Education', '2002', 'Ingles', 'Donación 2023-3', '$- ', 'Mcgrawhill Higher Education', ''),
(405, 'García, Santiago', 'Teoría Económica de la Empresa: Fundamentos teóricos', 'Gestión Empresarial', 1, '658.15/G216', 600, 1, 'Diaz de santos', '2022', 'Español', 'Libros Comprados - 2023-3', ' $              190.000,00', 'Diaz de santos', ''),
(337, 'González Ruiz, Juan David', 'Modelamiento financiero en excel principios y aplicaciones a proyectos de inversion 1ed.', 'Administración de Negocios Internacionales', 1, '658.151/ G643', 600, 1, 'Alpha Editorial', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                79.000,00', 'Alpha Editorial', ''),
(500, 'Buenaventura, Guillermo', 'Gestión financiera del capital de trabajo en la empresa ', 'Administración de Negocios Internacionales', 1, '658.151/B928', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              124.000,00', 'Ecoe', ' ');
INSERT INTO `libros` (`ID`, `Autor`, `Titulo`, `Programa`, `Item`, `Signatura`, `Areas`, `Ejemplar`, `Editorial`, `Año`, `Idioma`, `Observaciones`, `Precio`, `Proveedor`, `Registro_en_linea`) VALUES
(853, 'Bahíllo Marcos, María Eugenia.', 'Operaciones auxiliares de gestión de tesorería', 'Tecnología en Gestión Administrativa', 1, '658.1511/B151', 600, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '17069'),
(322, 'Merlo, Mariano', 'Analisis financiero integral, teoria y practica 1ed.', 'Gestión Empresarial', 1, '658.1513/M565', 600, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $              125.000,00', 'Alpha Editorial', ''),
(478, 'Rodríguez, José', 'Capital de intangibles Una versión desde los servicios   ', 'Administración de Negocios Internacionales', 1, '658.152/R696', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                72.800,00', 'Ecoe', ' '),
(406, 'Simon, Hermann', 'True Profit!: ninguna empresa quebró jamás por obtener beneficios', 'Administración de Negocios Internacionales', 1, '658.155/SI594', 600, 1, 'Diaz de santos', '2022', 'Español', 'Libros Comprados - 2023-3', ' $              150.000,00', 'Diaz de santos', ''),
(760, 'García Prado, Enrique', 'Marketing y plan de negocio de la microempresa UF1820', 'Administración de Negocios Internacionales', 1, '658.22/G216', 600, 2, 'Paraninfo', '2014', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16916'),
(458, 'Arroyo, Ruth', 'Management 5.0 felicidad organizacional y el auge de la empresa social', 'Administración de Negocios Internacionales', 1, '658.3/A779', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              126.000,00', 'Ecoe', ' '),
(675, 'Belen Ibañez, Marcos', 'Apoyo Administrativo a la Gestion de Recursos Humanos UF0345', 'Gestión Administrativa comercial ', 1, '658.3/B428', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16853'),
(455, 'Castillo, José', 'Gestión humana integral', 'Básicas y transversales', 1, '658.3/C352', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                86.900,00', 'Ecoe', ' '),
(797, 'Díaz Zazo, Pilar ', 'Prevención de riesgos Laborales. Seguridad y salud en el trabajo', 'Técnica profesional en Gestión de Seguridad y Salud en el Trabajo', 1, '658.3/D542', 600, 1, 'Paraninfo', '2012', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16995'),
(762, 'Fernández Balmón, Manuel.', 'Comunicación efectiva y trabajo en equipo UF0346', 'Básicas y transversales', 1, '658.3/F363', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16877'),
(668, 'García Prado, Enrique', 'Gestión de la Prevención de Riesgos Laborales en Pequeños Negocios MF1792_2', 'Gestión Administrativa comercial ', 1, '658.3/G216', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16845'),
(473, 'García, Santiago', 'Arte de dirigir personas hoy', 'Tecnología En Gestión Empresarial ', 1, '658.3/G216A', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              120.000,00', 'Ecoe', ' '),
(446, 'Lahmann, Jörg', 'Empresa motivada', 'Tecnología En Gestión Empresarial ', 1, '658.3/L183', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                71.600,00', 'Ecoe', ' '),
(22, 'MATHIS,Robert', 'Human Resource Management', 'Administración de Negocios Internacionales', 1, '658.3/M426', 600, 1, 'South Western', '2002', 'Ingles', 'Donación 2023-3', '$- ', 'South Western', ''),
(380, 'Valbuena Aguirre, Oscar Augusto', 'Copywriting, metodos para crear conversaciones persuasivas, comprender a tu interlocutor 1ed.', 'Administración de Negocios Internacionales', 1, '658.3/V139', 600, 1, 'Alpha Editorial', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                31.000,00', 'Alpha Editorial', ''),
(476, 'Marr, Bernard', 'Big data en recursos humanos', 'Tecnología En Gestión Empresarial ', 1, '658.31/M358', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              170.000,00', 'Ecoe', ' '),
(415, 'Carril, J.', 'Zen Coaching.  2da. Ed.', 'Gestión Empresarial', 1, '658.3124/C317', 600, 1, 'Diaz de santos', '2021', 'Español', 'Libros Comprados - 2023-3', ' $              105.000,00', 'Diaz de santos', ''),
(421, 'González, Armando', 'El libro del diseño de los centros de control: Los expertos y usuarios desvelan las claves de la sala principal de la empresa', 'Ingeniería Industrial', 1, '658.31256/G643', 600, 1, 'Diaz de santos', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              165.000,00', 'Diaz de santos', ''),
(364, 'Ralero, Fernando', 'Radicalmente estrategias de la mente para los negocios y la vida 1ed.', 'Administración de Negocios Internacionales', 1, '658.314/R163', 600, 1, 'Alpha Editorial', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                48.000,00', 'Alpha Editorial', ''),
(768, 'Arboleda Velez, German', 'Proyectos. Identificacion, Formulacion, Evaluacion y Gerencia', 'Administración de Negocios Internacionales', 1, '658.4/AR666', 600, 1, 'Alfaomega', '2013', 'Español', 'Libros Comprados - 2024-3', ' $145.000,00 ', 'Alfa Editorial', '16976'),
(440, 'Blanco, Fernando', 'Las claves de la cuarta revolución industrial. ', 'Administración de Negocios Internacionales', 1, '658.4/B641', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                59.400,00', 'Ecoe', ' '),
(777, 'Cabero Soto, Cristina', 'Gestion del Tiempo, Recursos e Instalaciones UF0324', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.4/C114', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16859'),
(926, 'Ferriss, Tim ', 'Titanes ', 'Básicas y transversales', 1, '658.4/F394', 600, 1, 'Paidos ', '2017', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(163, 'LANE KELLER, Kevin', 'Administración estratégica de marca', 'Gestión Empresarial', 1, '658.4/L265', 600, 1, 'Pearson', '2008', 'Español', 'Donación 2023-3', '$- ', 'PEARSON PRENTICE HALL', ''),
(230, 'Maerk Miller', 'El Secreto. Lo que los grandes líderes saben y hacen ', 'Básicas y transversales', 1, '658.4/M185', 600, 1, 'Grupo Editorial Norma', '2005', 'Español', 'Donación 2023-3', '$- ', 'Grupo Editorial Norma', ' '),
(91, 'MARKIDES,Constantinos', 'En la estrategia está el éxito', 'Básicas y transversales', 1, '658.4/M345', 600, 1, 'Grupo Editorial norma', '2000', 'Español', 'Donación 2023-3', '$- ', 'Grupo Editorial norma', ''),
(31, 'MORALES, Jorge', 'La gerencia se aprende', 'Administración de Negocios Internacionales', 1, '658.4/M671', 600, 1, 'Cámara de Comercio de Bogotá', '2000', 'Español', 'Donación 2023-3', '$- ', 'Cámara de Comercio de Bogotá', ''),
(496, 'Mir, Joan', 'Foco enfocar para ganar', 'Administración de Negocios Internacionales', 1, '658.4/M675', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                82.600,00', 'Ecoe', ' '),
(699, 'Mochon Morcillo, Francisco', 'Administracion. Un Enfoque por Competencia con Casos Latinoamericanos', 'Administración de Negocios Internacionales', 1, '658.4/M688', 600, 1, 'Alfaomega', '2014', 'Español', 'Libros Comprados - 2024-3', ' $70.000,00 ', 'Alfa Editorial', '16836'),
(144, 'STALK,G', 'Estrategias de crecimiento', 'Tecnología En Gestión Logística Internacional', 1, '658.4/ST782', 600, 1, 'Deusto', '1998', 'Español', 'Donación 2023-3', '$- ', 'Conservatorio del Tolima', ' '),
(366, 'Valbuena Aguirre, Oscar Augusto', 'Siete claves para hacer un webinar exitoso todo lo que querias saber, que no te atrevias a preguntar 1ed.', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.4/V139', 600, 1, 'Alpha Editorial', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                35.000,00', 'Alpha Editorial', ' '),
(655, 'Ventura, Juan', 'Analisis Estrategico de la Empresa', 'Administración de Negocios Internacionales', 1, '658.4/V468', 600, 1, 'Paraninfo', '2008', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16834'),
(425, 'González Millá, Javier', 'Manual Práctico de Planeación Estratégica', 'Gestión Empresarial', 1, '658.4012/G643', 600, 1, 'Diaz de santos', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                80.000,00', 'Diaz de santos', ''),
(558, 'Pérez, Rafael', 'Gerencia estratégica corporativa', 'Administración de Negocios Internacionales', 1, '658.4012/P438', 600, 2, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                71.000,00', 'Ecoe', ' '),
(643, 'Chuanfu, Wang.', 'BYD Baterías La sabiduría creativa', 'Básicas y transversales', 1, '658.402/C559', 600, 1, 'Editorial Popular', '2017', 'Español', 'Libros Comprados - 2024-3', ' $30.000,00 ', 'Alfa Editorial', '16729'),
(504, 'Acosta, Alberto', 'Investigación de operaciones', 'Ingeniería Industrial', 1, '658.4034/A185', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                52.000,00', 'Ecoe', ' '),
(574, 'Buenaventura, Guillermo', 'Teoría de la inversión en evaluación de proyectos ', 'Ingeniería Industrial', 1, '658.404/B928', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                91.000,00', 'Ecoe', ''),
(451, 'Méndez, Rafael', 'Formulación y evaluación de proyectos.enfoque para emprendedores', 'Administración de Negocios Internacionales', 1, '658.404/M538', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              117.900,00', 'Ecoe', ' '),
(423, 'Párraga Granadas, Martín', 'Gestión Eficaz de Proyectos de Telecomunicaciones e Infraestucturas Críticas.', 'Mantenimiento de Redes de Telecomunicaciones', 1, '658.404/P259', 600, 1, 'Diaz de santos', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              120.000,00', 'Diaz de santos', ' '),
(349, 'Serpell B, Alfredo', 'Planificacion y control de proyectos  1ed.', 'Básicas y transversales', 1, '658.404/SE486', 600, 1, 'Alpha Editorial', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                63.000,00', 'Alpha Editorial', ''),
(428, 'Storch, José Ma.', 'Organización, gestión y ejecución de proyectos Industriales', 'Ingeniería Industrial', 1, '658.404/ST884', 600, 1, 'Diaz de santos', '2018', 'Español', 'Libros Comprados - 2023-3', ' $              330.000,00', 'Diaz de santos', ''),
(23, 'PONTI,Franc', 'Los siete movimientos de la Innovación', 'Administración de Negocios Internacionales', 1, '658.406/p816l', 600, 1, 'Grupo Editorial norma', '2009', 'Español', 'Donación 2023-3', '$- ', 'Grupo Editorial norma', ''),
(404, 'Corma, Francisco', 'Personas Innovadoras, Organizaciones Vivas: La importacia del talento humano en la innovación.', 'Gestión Empresarial', 1, '658.4063/C811', 600, 1, 'Diaz de santos', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                90.000,00', 'Diaz de santos', ' '),
(391, 'Serrano, Manuel', 'Design thinking lidera el presente. Crea el futuro 1ed.', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.4063/S487', 600, 1, 'Alpha Editorial', '2014', 'Español', 'Libros Comprados - 2023-3', ' $                72.000,00', 'Alpha Editorial', ''),
(545, 'Cosme, José', 'Emprender el objetivo marca tu rumbo, el camino se hace día a día', 'Básicas y transversales', 1, '658.408/C834', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                23.100,00', 'Ecoe', ' '),
(546, 'Saravia, Federico', 'Emprender para transformar', 'Básicas y transversales', 1, '658.408/S243', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $              176.000,00', 'Ecoe', ' '),
(241, 'Martinez Herrera, Horacio', 'Responsabilidad social y etica empresarial', 'Salud Ocupacional', 1, '658.4092/M385', 600, 1, 'Ecoe', '2014', 'Español', 'Donación 2023-3', ' $ - ', 'ECOE', ''),
(164, 'DÍAZ, Carlos', 'Administración de sistemas de gestión basada en principios', 'Salud Ocupacional', 1, '658.42/D542', 600, 1, 'Icontec', '2013', 'Español', 'Donación 2023-3', '$- ', 'Icontec ', ''),
(644, 'Zhengfei,m Ren.', 'Huawei El imperio de los teléfonos móviles', 'Mantenimiento de Redes de Telecomunicaciones', 1, '658.421/	Z63', 600, 1, 'Editorial Popular', '2017', 'Español', 'Libros Comprados - 2024-3', ' $30.000,00 ', 'Alfa Editorial', '16715'),
(642, 'Huateng, Ma.', 'El imperio Tencent Redes sociales e internet en China', 'Básicas y transversales', 1, '658.421/H874', 600, 1, 'Editorial Popular', '2017', 'Español', 'Libros Comprados - 2024-3', ' $30.000,00 ', 'Alfa Editorial', '16927'),
(460, 'Ramírez, Elbar', 'Modelos de negocios dinámico', 'Administración de Negocios Internacionales', 1, '658.421/R173', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              170.200,00', 'Ecoe', ' '),
(449, 'Palacios, Luis', 'Estrategias de comunicación empresarial', 'Tecnología En Gestión Empresarial ', 1, '658.45/P153', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                73.900,00', 'Ecoe', ' '),
(776, 'Alvarez Gomez, Laura C.', 'Gestion de Sistemas de Distribucion Global (GDS) UF0079', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.5/AL473', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16858'),
(566, 'Mora, Luis', 'Principios y máximas de la cadena de abastecimiento', 'Administración de Negocios Internacionales', 1, '658.5/M828p', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                53.000,00', 'Ecoe', ' '),
(463, 'Palacios, Luis', 'Organización del trabajo', 'Administración de Negocios Internacionales', 1, '658.5/P153', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              170.200,00', 'Ecoe', ' '),
(412, 'Radajee, Manuel', 'Lean Manufacturing: Herramientas para producir mejor. 2da. Ed.', 'Ingeniería Industrial', 1, '658.5/R124', 600, 1, 'Diaz de santos', '2021', 'Español', 'Libros Comprados - 2023-3', ' $              155.000,00', 'Diaz de santos', ''),
(8, 'PINE, Joseph ', 'The Experience Economy', 'Administración de Negocios Internacionales', 1, '658.56/P649E', 600, 1, 'Harvard Business Review', '1999', 'English', 'Donación 2023-3', '$- ', 'Harvard Business Review', ''),
(167, 'CALSO MORALES, Natalia.', 'Guía practica para la integración de sistemas de gestión ISO 9001 ISO 14001 E ISO 45001', 'Tecnologia en Gestion de Sistemas Integrados', 1, '658.562/C165', 600, 1, 'Alfaomega ', '2018', 'Español', 'Donación 2023-3', '$- ', 'Alfaomega', ''),
(801, 'Socconini, Luis ', 'Certificación Lean Six Sigma Yellow Belt para la excelencia en los negocios ', 'Tecnología en Gestión Administrativa', 1, '658.562/S678c', 600, 1, 'Marge Books', '2016', 'Español', 'Libros Comprados - 2024-3', ' $96.000,00 ', 'Alfa Editorial', '15250'),
(779, 'De Diego Morillo, Amelia', 'Gestion de Pedidos y Stock UF0929', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.7/D299', 600, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16862'),
(669, 'Meana Coalla, Pedro Pablo', '	Gestión de Inventarios UF0476', 'Gestión Empresarial', 1, '658.7/M483', 600, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '16843'),
(435, 'Ragàs, Ignasi', 'Centros logísticos. Planificación, promoción y gestión de los centros de actividades logísticas', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.7/R141', 600, 1, 'Ecoe', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                77.300,00', 'Ecoe', ' '),
(509, 'Silvera, Rodolfo', 'Logística Matemática La clave del éxito en la cadena de suministro ', 'Tecnico Profecional en Operaciones Logisticas', 1, '658.7/S587', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                43.000,00', 'Ecoe', ' '),
(456, 'Silvera, Rodolfo', 'Gestión logística internacional', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.7/SI587', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $                83.000,00', 'Ecoe', ' '),
(413, 'Mauleón, Mikel', 'Logistica Inbound - Tomo I', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.78/M449/V.1', 600, 1, 'Diaz de santos', '2021', 'Español', 'Libros Comprados - 2023-3', ' $              460.000,00', 'Diaz de santos', ''),
(414, 'Mauleón, Mikel', 'Logistica Outbound - Tomo II', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.78/M449/V.2', 600, 1, 'Diaz de santos', '2021', 'Español', 'Libros Comprados - 2023-3', ' $              460.000,00', 'Diaz de santos', ''),
(613, 'Hérnandez barrueco, Luis Carlos.', 'Técnicas para ahorrar costos en el transporte', 'Administración de negocios internacionales', 1, '658.7882/H557', 600, 1, 'Marge Book', '2017', 'Español', 'Libros Comprados - 2024-3', ' $56.000,00 ', 'Alfa Editorial', '15643'),
(676, 'Ahumada Luyando, Silvia', 'Inteligencia Artificial para el Marketing', 'Administración De Negocios Internacionales', 1, '658.8/AH287', 600, 1, 'Alfa Editorial', '2004', 'Español', 'Libros Comprados - 2024-3', ' $99.000,00 ', 'Alfa Editorial', '16837'),
(868, 'Carrasco Fernández, Soledad.', 'Servicios de atención comercial', 'Administración de negocios internacionales', 1, '658.8/C313 ', 600, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $43.000,00 ', 'Alfa Editorial', '16931'),
(2, 'KIM, Cham', 'La Estrategía del océano azul', 'Básicas y transversales', 1, '658.8/C454', 600, 1, 'Grupo Editorial norma', '2005', 'Español', 'Donación 2023-3', '$- ', 'Grupo Editorial norma', ''),
(563, 'Di pace, Damián', 'Marketing extraordinario', 'Administración de Negocios Internacionales', 1, '658.8/D536', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                54.600,00', 'Ecoe', ' '),
(376, 'Villanueva, Julián', 'Marketing estrategico  1ed.', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.8/V718', 600, 1, 'Alpha Editorial', '2018', 'Español', 'Libros Comprados - 2023-3', ' $              120.000,00', 'Alpha Editorial', ''),
(379, 'Romero, Juanma', 'Vender en las plataformas digitales  1ed.', 'Mantenimiento de Redes de Telecomunicaciones', 1, '658.802/R763', 600, 1, 'Alpha Editorial', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                42.000,00', 'Alpha Editorial', ''),
(498, 'Martínez, Ignacio', 'Gestión administrativa comercial ', 'Administración de Negocios Internacionales', 1, '658.81/M385', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                78.400,00', 'Ecoe', ' '),
(746, 'Fernández Verde, Dolores.', 'Comunicación empresarial y atención al cliente', 'Tecnología en Gestión Administrativa', 1, '658.812/F363', 600, 1, 'Paraninfo', '2017', 'Español', 'Libros Comprados - 2024-3', ' $30.000,00 ', 'Alfa Editorial', '17053'),
(427, 'Dos santos, Alonso', 'Investigación de Mercados', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.83/D724', 600, 1, 'Diaz de santos', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                95.000,00', 'Diaz de santos', ''),
(503, 'Garzón, Carolina', 'Investigación de mercados. Tendencias y orientaciones estratégicas', 'Tecnica profecional en Logistica', 1, '658.83/G245', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                89.600,00', 'Ecoe', ' '),
(562, 'Sanabria, Fabio', 'Investigación de mercados.  Un enfoque práctico y descriptivo', 'Tecnico Profecional en Operaciones Logisticas', 1, '658.83/S194', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                46.200,00', 'Ecoe', ' '),
(462, 'Soto, Andrés', 'Neuroemprendimiento', 'Administración de Negocios Internacionales', 1, '658.8342/SO718', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              118.000,00', 'Ecoe', ' '),
(388, 'Orrantia, Andoni', '¿como habla tu marca en podcast?, el audio en la estrategia de marketing digital de tu empresa 1ed.', 'Tecnica Profesional en Operación de Procesos Empresariales', 1, '658.84/OR75', 600, 1, 'Alpha Editorial', '2022', 'Español', 'Libros Comprados - 2023-3', ' $                50.000,00', 'Alpha Editorial', ''),
(303, 'Becerra, Aland', 'Una mirada a las diferentes perspectivas de los negocios internacionales: estrategias, principios y casos de internacionalización', 'Administración de Negocios Internacionales', 1, '658.848/H647', 600, 1, 'Corporación Universidad de la Costa', '2020', 'Español', 'Donación 2023-3', '$                     -  ', 'Corporación Universidad de la Costa', ''),
(459, 'Ramírez, Humberto', 'Marketing internacional para principiantes', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658.848/R313', 600, 1, 'Ecoe', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              116.000,00', 'Ecoe', ' '),
(102, 'HOMS,Ricardo', 'El poder de la negociación en la venta ', 'Administración de Negocios Internacionales', 1, '658.85/H768', 600, 1, 'Mcgrawhill ', '2003', 'Español', 'Donación 2023-3', '$- ', 'Mcgrawhill ', ''),
(515, 'Monserrat, Juan', 'Planificación estratégica de la comunicación en redes sociales', 'Básicas y transversales', 1, '658.872/M754', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $                62.000,00', 'Ecoe', ' '),
(389, 'Muñiz Troyano, Javier', 'Community manager. Estrategias de gestion de redes sociales. Curso practico del nuevo marketing 1ed.', 'Tecnica Profesional en Operación de Procesos Empresariales', 1, '658.872/M971', 600, 1, 'Alpha Editorial', '2014', 'Español', 'Libros Comprados - 2023-3', ' $                65.000,00', 'Alpha Editorial', ''),
(537, 'Anzola, Iván', 'Admistración innovación y conectividad', 'Tecnica Profecional en Operaciones de Procesos Empresariales', 1, '658/A532', 600, 1, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                31.500,00', 'Ecoe', ' '),
(400, 'Barrios García, Javier Amos', 'Análisis de funciones en economía y empresa. 2ª', 'Gestión Empresarial', 1, '658/B276', 600, 1, 'Diaz de santos', '2022', 'Español', 'Libros Comprados - 2023-3', ' $              200.000,00', 'Diaz de santos', ''),
(692, 'Gil de Gómez Pérez-Aradros, Carlos.', 'Empresa y administración. Casos prácticos', 'Administración de negocios internacionales', 1, '658/G463', 600, 1, 'Paraninfo', '2013', 'Español', 'Libros Comprados - 2024-3', ' $37.000,00 ', 'Alfa Editorial', '16852'),
(17, 'Mcconnell,Campbell', 'Estrategias de Harvard La mejor inversión de sus activos: la productividad', 'Administración de Negocios Internacionales', 1, '658/M478', 600, 1, 'Educar cultural recreativa ltda', '1987', 'Español', 'Donación 2023-3', '$- ', 'Educar cultural recreativa ltda', ''),
(301, 'Frances, Antonio', 'Estrategia y planes para la empresa con el cuadro de mando integral.', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '658/P153', 600, 1, 'Pearson Prentice Hall', '2006', 'Español', 'Donación 2023-3', '$- ', 'Pearson Prentice Hall', ''),
(18, 'SHAPIRO,Benson', 'Estrategias de Harvard Cómo desarrollar estrategias eficaces de mercadotecnia', 'Administración de Negocios Internacionales', 1, '658/SH529', 600, 1, 'Educar cultural recreativa ltda', '1987', 'Español', 'Donación 2023-3', '$- ', 'Educar cultural recreativa ltda', ''),
(393, 'Gómez Nieto,Begoña', 'Fundamentos de la publicidad  1ed.', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '659.1/G633', 600, 1, 'Alpha Editorial', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                58.000,00', 'Alpha Editorial', ''),
(647, 'Muñoz Boda, María Soledad.', 'Protocolo y relaciones públicas', 'Básicas y transversales', 1, '659.2/M971', 600, 1, 'Paraninfo', '2016', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16839'),
(485, 'González, Hernando', 'Elaboración de presupuestos en arquitectura', 'Básicas y transversales', 1, '692.5/G643', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              125.800,00', 'Ecoe', ' '),
(484, 'Tejada, Jorge', 'Costos de obras civiles', 'Básicas y transversales', 1, '692.5/T2', 600, 1, 'Ecoe', '2019', 'Español', 'Libros Comprados - 2023-3', ' $              120.000,00', 'Ecoe', ' '),
(184, 'Jose Pierre', 'El Futurismo y El Dadaismo ', 'Diseño Gráfico Y Multimedia', 1, '709.01/J83', 700, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(180, 'Michel-Claude Jalard', 'El Posimpresionismo', 'Diseño Gráfico Y Multimedia', 1, '709/C615', 100, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(187, 'Michael Curtois', 'Pintura china ', 'Diseño Gráfico Y Multimedia', 1, '709/C981', 100, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(179, 'Elie-Charles Flamand ', 'El Renacimiento I', 'Diseño Gráfico Y Multimedia', 1, '709/EL42', 600, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(924, 'Florillo, Hiriberto', 'El Libro del Carnaval Internacional de las Artes', 'Básicas y transversales', 1, '709/F636', 700, 1, 'La Cueva ', '2013', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(176, 'Gassiot-Talabot, Gérard', 'Pintura romana y paleocristiana', 'Diseño Gráfico Y Multimedia', 1, '709/G253', 100, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(185, 'Georges charensol', 'Los Grandes Maestros De La Pintura Moderna', 'Diseño Gráfico Y Multimedia', 1, '709/G351', 700, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(186, 'Jean-Clarence lambert ', 'Pintura Abstracta ', 'Diseño Gráfico Y Multimedia', 1, '709/J43', 100, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(183, 'Jose Pierre', 'El Cubismo', 'Diseño Gráfico Y Multimedia', 1, '709/J83', 700, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(181, 'Lassaigne. Jacques', 'El Impresionismo', 'Diseño Gráfico Y Multimedia', 1, '709/L346', 100, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(182, 'Michael Ragon', 'El Expresionismo ', 'Diseño Gráfico Y Multimedia', 1, '709/M621', 700, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(177, 'Michel Herubel', 'Pintura Gótica I', 'Diseño Gráfico Y Multimedia', 1, '709/M623', 100, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(175, 'Papaioannou, Kostas', 'Pintura bizantina y rusa', 'Diseño Gráfico Y Multimedia', 1, '709/P213', 100, 1, 'Aguilar Madrid', '1966', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(174, 'Robert Boulanger', 'Pintura egipcia y del antiguo Oriente', 'Diseño Gráfico Y Multimedia', 1, '709/R642', 700, 1, 'Aguilar Madrid', '1968', 'Español', 'Donación 2023-3', '$- ', 'Aguliar Madrid', ' '),
(943, 'Alvarez, Fidias', 'La Casa del Occidente', 'Básicas y transversales', 1, '720/AL473', 700, 1, '', '1994', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(41, 'GODIN,Seth', 'Small is the new big', 'Tecnología En Gestión Logística Internacional', 1, '721/L596', 700, 1, 'Portfolio', '2006', 'Español', 'Donación 2023-3', '$- ', 'LAROUSSE', ''),
(597, 'Mark Millar, John Romita', 'Hit Girl en Roma', 'Licenciatura en Educación Básica Primaria', 1, '741.5/M346', 700, 1, 'Panini Comics', '2019', 'Español', 'Libros Comprados - 2024-3', ' $55.000,00 ', 'Alfa Editorial', '16824'),
(50, 'BEECHER,Harriet', 'La cabaña del tio tom', 'Básicas y transversales', 1, '741.5/S892', 700, 1, 'Ediciones universales', '2000', 'Español', 'Donación 2023-3', '$- ', 'Ediciones universales', ''),
(903, 'Dufranc, Guillermo ', 'La comunicación del packaging: reflexiones y analisis del diseño del packaging', 'Diseño Gráfico', 1, '745.2/D863', 700, 1, 'Creative Commons', '2021', 'Español', 'Libros Comprados - 2024-3', ' $124.000,00 ', 'Inglobatec', ''),
(928, 'Marie, Rose', 'Los Secretos de las Obras de Arte', 'Básicas y transversales', 1, '750.9/M334', 700, 1, 'Taschen', '2005', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(630, 'Gonzalez Trijillo, Alejandro', 'Apu Rimak', 'Diseño Gráfico', 1, '769.5/G643', 700, 1, 'Asociacion Cultural Peruano Britanica', '2011', 'Español', 'Libros Comprados - 2024-3', ' $120.000,00 ', 'Alfa Editorial', '16826'),
(508, 'Larousse', 'Gran manual de fotografía / Mas de 300 consejos y trucos para la tomar fotografías increíbles', 'Produccion Grafica Multimeduial ', 1, '770.9/L332', 700, 1, 'Larousse ', '2014', 'Español', 'Donación 2023-3', '$ 0', 'Larousse ', ''),
(223, 'Villa, Heitor', 'Música, Cultura y Pensamiento ', 'Básicas y transversales', 1, '780/C755m ', 700, 1, 'Conservatorio del Tolima', '2017', 'Español', 'Donación 2023-3', '$- ', 'Conservatorio del Tolima', ''),
(818, 'Escavias, Jorge.', 'La música en 100 preguntas ', 'Básicas y transversales', 1, '780/ES74', 700, 1, 'Nowtilus', '2019', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '16869'),
(788, 'San juan, Cesar', 'Una Historia De Los Beatles. Las Claves Del Porque Son El Mejor Grupo De La Historia', 'Básicas y transversales', 1, '781.66/SA195', 700, 1, 'Robinbook', '2018', 'Español', 'Libros Comprados - 2024-3', ' $79.000,00 ', 'Alfa Editorial', '16981'),
(79, 'SEYMORE,Bob', 'The end- The death of Jim Morrison', 'Básicas y transversales', 1, '782.42166/SE521', 700, 1, 'Omnibus Press', '1991', 'Ingles', 'Donación 2023-3', '$- ', 'Omnibus Press', ''),
(810, 'González Fernández, Fidel.', 'Actividades de ocio y tiempo libre', 'Licenciatura En Educación Básica Primaria', 1, '790.1/G643', 700, 1, 'Paraninfo', '2018', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16986'),
(819, 'Esteban Guinea, Emilia', 'El cine. En 100 preguntas', 'Básicas y Transversales', 1, '791.43/	ES79', 700, 1, 'Alfaomega', '2022', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '16991'),
(197, 'Roberto G. Grau', 'Tratado General de Ajedrez', 'Básicas y transversales', 1, '794.1/R642', 700, 1, 'Editorial sopena argentina', '1962', 'Español', 'Donación 2023-3', '$- ', 'Editorial sopena argentina', ' '),
(46, 'MÉNDEZ,Rafael', 'Clásicos de la literatura universal', 'Básicas y transversales', 1, '803/C614', 800, 1, 'Casa Editorial el tiempo', '2000', 'Español', 'Donación 2023-3', '$- ', 'Conservatorio del Tolima', ''),
(677, 'Ampuero, Ada', 'Guia para la Elaboracion de Textos Academicos Segun la Norma APA', 'Básicas y transversales', 1, '808.02/AM527', 800, 1, 'Alfa Editorial', '2024', 'Español', 'Libros Comprados - 2024-3', ' $38.000,00 ', 'Alfa Editorial', '17035'),
(761, 'Prat Ferrer, Juan ', 'Manual de escritura académica', 'Básicas y Transversales', 1, '808.02/P912', 800, 1, 'Paraninfo', '2015', 'Español', 'Libros Comprados - 2024-3', ' $36.000,00 ', 'Alfa Editorial', '16915'),
(214, 'Carlos cuauhtemoc sanchez', 'La fuerza de Sheccid', 'Básicas y transversales', 1, '808.3083/S55', 800, 1, 'Elecciones selectas Diamante ', '1996', 'Español', 'Donación 2023-3', '$- ', 'Elecciones selectas Diamante ', ' '),
(419, 'Puchol, Luis', 'Hablar en público. 6ta. Ed.', 'Básicas y transversales', 1, '808.51/P977', 800, 1, 'Diaz de santos', '2020', 'Español', 'Libros Comprados - 2023-3', ' $              100.000,00', 'Diaz de santos', ''),
(646, 'Corral Cañas, Celia.', 'El mejor poema del mundo, 2016', 'Básicas y transversales', 1, '808.81/C823', 800, 1, 'Ediciones Nobel', '2016', 'Español', 'Libros Comprados - 2024-3', ' $30.000,00 ', 'Alfa Editorial', '16733'),
(215, 'Barbara Parquer ', 'Suspicion of innocence ', 'Básicas y transversales', 1, '808.838/B229', 800, 1, 'A Dutton book', '1994', 'Español', 'Donación 2023-3', '$- ', 'A Dutton book', ' '),
(216, 'Linda  sue park', 'El aprendiz ', 'Básicas y transversales', 1, '808.838/L742', 800, 1, 'Editorial Norma ', '2003', 'Español', 'Donación 2023-3', '$- ', 'Editorial Norma ', ' '),
(203, 'R.L Stine ', 'Jenny, La niñera II', 'Básicas y transversales', 1, '808.838/R9', 800, 1, 'Ediciones Grupo Zeta ', '1997', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Grupo Zeta ', ' '),
(212, 'Sherwood Anderson', 'Pobre blanco ', 'Básicas y transversales', 1, '808.838/SH554', 800, 1, 'Barataria', '2013', 'Español', 'Donación 2023-3', '$- ', 'Barataria', ' '),
(579, 'Vivian, Mansour', 'La Excepcion de la Regla ', 'Básicas y transversales', 1, '808.868/m328E', 800, 1, 'Fondo de Cultura Economica', '2012', 'Español', 'Donación 2023-3', ' $  ', 'Fondo de Cultura Economica', ''),
(608, 'Arévalo Acha , Jorgue.', 'Volver a ser niño', 'Licenciatura En Educación Básica Primaria', 1, '808.899 282/AR683', 800, 1, 'San Marcos', '2014', 'Español', 'Libros Comprados - 2024-3', ' $35.000,00 ', 'Alfa Editorial', '17019'),
(638, 'Rossetti, Ana', 'Un Baúl Lleno De Dinosaurios', 'Licenciatura en Educación Básica Primaria', 1, '808.899 282/R829', 800, 1, 'Santillana', '2017', 'Español', 'Libros Comprados - 2024-3', ' $44.000,00 ', 'Alfa Editorial', '17029'),
(636, 'Vallejo, Miguel Ángel', 'La Elefanta Flor Buscar Su Hogar', 'Licenciatura en Educación Básica Primaria', 1, '808.899 282/V182', 800, 1, 'Ediciones Altazor', '2012', 'Español', 'Libros Comprados - 2024-3', ' $30.000,00 ', 'Alfa Editorial', '17028'),
(893, 'Schneider, Stephen', 'Social Movement Literature', 'Licenciatura en Educación Básica Primaria', 1, '809.1/SCH359', 800, 1, 'Routledge', '2024', 'Inglés', 'Libros Comprados - 2024-3', ' $358.000,00 ', 'Inglobatec', ''),
(816, 'Díaz Pardo, Felipe.', 'La literatura universal en 100 preguntas', 'Básicas y transversales', 1, '809/D542', 800, 1, 'Nowtilus', '2019', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '16867'),
(93, 'MELVILLE,Herman', 'Moby Dick', 'Básicas y transversales', 1, '813.3/M531', 800, 1, 'Carvajal S.A', '1985', 'Español', 'Donación 2023-3', '$- ', 'Carvajal S.A', ''),
(80, 'HUDSON,Jeffery', 'Un caso de urgencia', 'Básicas y transversales', 1, '813.54/H885', 800, 1, 'Ediciones Grijalbo S.A', '1976', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Grijalbo S.A', ''),
(901, 'Bedore, Pamela', 'The routledge introduction to Canadian crime fiction', 'Diseño Gráfico', 1, '813.6/B412', 800, 1, 'Routledge', '2024', 'Inglés', 'Libros Comprados - 2024-3', ' $360.000,00 ', 'Inglobatec', ''),
(717, 'Marcús, Joana.', 'Antes de diciembre', 'Básicas y transversales', 1, '813.6/M322', 800, 1, 'Penguin Random House', '2021', 'Español', 'Libros Comprados - 2024-3', ' $65.000,00 ', 'Alfa Editorial', '16636'),
(611, 'Stircescu, Cosmin F.', 'Fuego Eterno', 'Básicas y transversales', 1, '813.6/ST861', 800, 1, 'Ediciones Arcanas', '2019', 'Español', 'Libros Comprados - 2024-3', ' $90.000,00 ', 'Alfa Editorial', '16920'),
(946, 'Vito i Godina Albert', 'Kate Mosse La Ciudad de las Lagrimas', 'Básicas y transversales', 1, '813.6/V845', 800, 1, 'Planeta Internacional', '2020', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(55, 'Grisham,John', 'La trampa', 'Básicas y transversales', 1, '813/G747t ', 800, 1, 'DeBolsillo', '2012', 'Español', 'Donación 2023-3', '$- ', 'DeBolsillo', ''),
(33, 'National Restaurant Association Educational Foundation', 'Professional Cooking', 'Tecnología En Gestión Logística Internacional', 1, '820/G58', 800, 1, 'Promgmt', '2003', 'Ingles', 'Donación 2023-3', '$- ', 'Promgmt', ''),
(319, 'Calderon, Pedro', 'La vida es sueños', 'Básicas y transversales', 1, '821.134/C15v', 800, 1, 'Editorial epoca S.A', '1981', 'Español', 'Donación 2023-3', '$- ', 'Editorial epoca S.A', ''),
(100, 'SCOTT,Walter', 'Ivanhoe', 'Básicas y transversales', 1, '823.7/SCO431', 800, 1, 'Editorial Andres bello', '2000', 'Español', 'Donación 2023-3', '$- ', 'Editorial Andres bello', ''),
(596, 'Herbert George, Wells', 'La Maquina del Tiempo', 'Básicas y transversales', 1, '823.91/H537', 800, 1, 'Adapta', '2021', 'Español', 'Libros Comprados - 2024-3', ' $118.000,00 ', 'Alfa Editorial', '17014'),
(612, 'Orwell, George', '1984', 'Básicas y transversales', 1, '823.91/OR79', 800, 1, 'Sarganome Editores', '2024', 'Español', 'Libros Comprados - 2024-3', ' $49.500,00 ', 'Alfa Editorial', '17020'),
(724, 'Joyce James', 'Los Muertos. Un relato de Dublineses', 'Básicas y transversales', 1, '823.912/J89', 800, 1, 'La Mar de Facil Editorial', '2021', 'Español', 'Libros Comprados - 2024-3', ' $35.000,00 ', 'Alfa Editorial', '17046'),
(96, 'JOYCE,James', 'Ulises ', 'Básicas y transversales', 1, '823.912/J89 V1', 800, 1, 'Editorial Lumen', '1979', 'Español', 'Donación 2023-3', '$- ', 'Editorial Lumen', ''),
(97, 'JOYCE,James', 'Ulises ', 'Básicas y transversales', 1, '823.912/J89 V2', 800, 1, 'Editorial Lumen', '1979', 'Español', 'Donación 2023-3', '$- ', 'Editorial Lumen', ''),
(81, 'WILDE,Oscar', 'El fantasma de canterville el ruiseñor y la rosa', 'Básicas y transversales', 1, '823/W671', 800, 1, 'Panamericana Editorial', '1990', 'Español', 'Donación 2023-3', '$- ', 'Panamericana Editorial', ''),
(89, 'WILDE,Oscar', 'El ruiseñor y la rosa', 'Básicas y transversales', 1, '828.8/W671c', 800, 1, 'Clasicos universales Edilux', '1992', 'Español', 'Donación 2023-3', '$- ', 'Clasicos universales Edilux', ''),
(593, 'Iglesias Gracia', 'El Hilo', 'Licenciatura en Educación Básica Primaria', 1, '830.8/IG24', 800, 1, 'Klandraka Editorial', '2016', 'Español', 'Libros Comprados - 2024-3', ' $98.000,00 ', 'Alfa Editorial', '17012'),
(607, 'Lincoln Peirce', 'NATE, El Grande ¡ A por Todas!', 'Licenciatura en Educación Básica Primaria', 1, '830.9/L741', 800, 1, 'RBA Molino', '2013', 'Español', 'Libros Comprados - 2024-3', ' $49.500,00 ', 'Alfa Editorial', '17018'),
(595, 'Da Coll, Ivar', 'Tengo Miedo', 'Licenciatura en Educación Básica Primaria', 1, '836.8/D118', 800, 1, 'Babel Libros', '2022', 'Español', 'Libros Comprados - 2024-3', ' $60.000,00 ', 'Alfa Editorial', '17013'),
(196, 'Antoine de saint ', 'El principito ', 'Básicas y transversales', 1, '840.4/S12', 800, 1, 'Comcosur', '2016', 'Bilingue', 'Donación 2023-3', '$- ', 'Comcosur', ' '),
(906, 'VERNE,Jules', 'Around the World in Eighty Days', 'Básicas y transversales', 1, '843/V531', 800, 1, 'Dover Trrift ditions', '2000', 'Ingles', 'Donación 2025-1', ' $-   ', 'Dover Trrift ditions', 'NO, REGISTRADO'),
(95, 'ALIGHIERI,Dante', 'La divina comedia', 'Básicas y transversales', 1, '851.15/AL411', 800, 1, 'Edilux Ediciones', '1989', 'Español', 'Donación 2023-3', '$- ', 'Edilux Ediciones', ''),
(62, 'BASSANI,Giorgio', 'El gato pardo / Lampedusa', 'Básicas y transversales', 1, '853.914/B317', 800, 1, 'Ediciones nacionales', '2000', 'Español', 'Donación 2023-3', '$- ', 'Ediciones nacionales', ''),
(94, 'LLERAS,Carlos', 'De ciertas damas', 'Básicas y transversales', 1, '860.698/L791', 800, 1, 'El Áncora Editores', '1986', 'Español', 'Donación 2023-3', '$- ', 'El Áncora Editores', ''),
(116, ' Larousse', 'Polvos en la arenosa cultura y burdeles en Barranquilla', 'Básicas y transversales', 1, '860.81/ST847', 800, 2, 'Editorial la iguana ciega', '2005', 'Español', 'Donación 2023-3', '$- ', 'Editorial la iguana ciega', ' '),
(815, 'Ortiz Aguirre, Enrique.', 'La literatura hispanoamericana en 100 preguntas', 'Básicas y transversales', 1, '860.98/OR77', 800, 1, 'Nowtilus', '2017', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '16868'),
(586, 'Leguizamon, Amara', 'Historias No Tan Raras De Amara', 'Licenciatura en Educación Básica Primaria', 1, '860/L521', 800, 1, 'Penguin Random House Grupo Editorial', '2019', 'Español', 'Libros Comprados - 2024-3', ' $50.000,00 ', 'Alfa Editorial', '17008'),
(592, 'Vallejo, Irene', 'Alguien Hablo de Nosotros', 'Básicas y transversales', 1, '860/V182', 800, 1, 'Penguin Random House Grupo Editorial', '2024', 'Español', 'Libros Comprados - 2024-3', ' $79.000,00 ', 'Alfa Editorial', '17011'),
(953, 'Maria Espinosa, Jose ', 'Memorias de un Abanderado', 'Básicas y transversales', 1, '861.4/M332', 800, 1, 'Colseguros', '1997', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(615, 'Ramón Jiménez, Juan.', 'Antología poética', 'Básicas y transversales', 1, '861.5/R175', 800, 1, 'Alianza Editorial', '2002', 'Español', 'Libros Comprados - 2024-3', ' $88.000,00 ', 'Alfa Editorial', '16748'),
(213, 'Miguel Veyrat', 'Pasaje de la noche ', 'Básicas y transversales', 1, '861.64/M636', 800, 1, 'Barataria', '2014', 'Español', 'Donación 2023-3', '$- ', 'Barataria', ' '),
(234, 'Bustos, Rómulo', 'En el traspatio del cielo ', 'Básicas y transversales', 1, '861.865/B982', 800, 1, 'Universidad Tecnológica de Bolivar ', '2022', 'Español', 'Donación 2023-3', '', 'Universidad Tecnológica de Bolivar ', ''),
(602, 'De Maria, Cesar', 'La Calle Canta Singing Street', 'Licenciatura en Educación Básica Primaria', 1, '861/D372', 800, 1, 'ICPNA', '2014', 'Español/Ingles', 'Libros Comprados - 2024-3', ' $45.000,00 ', 'Alfa Editorial', '17016'),
(85, 'DE VEGA,Lope', 'El caballero de Olmedo', 'Básicas y transversales', 1, '862.31/D489', 800, 1, 'Editorial planeta', '1990', 'Español', 'Donación 2023-3', '$- ', 'Editorial planeta', ''),
(601, 'Bryce Echenique, Alfredo', 'A vuelo de buen cubero y otras crónicas', 'Básicas y transversales', 1, '863.44/B916', 800, 1, 'Peisa Bolsillo', '2010', 'Español', 'Libros Comprados - 2024-3', ' $49.500,00 ', 'Alfa Editorial', '16749'),
(88, 'LLOSA,Mario', 'La ciudad y los perros', 'Básicas y transversales', 1, '863.44/V297', 800, 1, 'Dunia grass', '2001', 'Español', 'Donación 2023-3', '$- ', 'Dunia grass', ''),
(78, 'ESQUIVEL,Laura', 'Como agua para chocolate ', 'Básicas y transversales', 1, '863.6/ES77', 800, 1, 'Narrativa Mondadori', '1985', 'Español', 'Donación 2023-3', '$- ', 'Narrativa Mondadori', ''),
(59, 'GARCIA,Gabriel', 'Por todos los dioses', 'Básicas y transversales', 1, '863.6/G216p', 800, 1, 'Editorial norma', '1991', 'Español', 'Donación 2023-3', '$- ', 'Editorial norma', ''),
(83, 'LLOSA,Mario', 'La orgía perpetua', 'Básicas y transversales', 1, '863.6/L792', 800, 1, 'Taurus', '1978', 'Español', 'Donación 2023-3', '$- ', 'Biblioteca seix barral editorial', ''),
(633, 'Satizabal, Amalia', 'Ríos de Colores', 'Licenciatura en Educación Básica Primaria', 1, '863.6/SA253', 800, 1, 'Editorial Monigote', '2020', 'Español', 'Libros Comprados - 2024-3', ' $60.000,00 ', 'Alfa Editorial', '17026'),
(53, 'CABRERA,Ever', 'María y yo ', 'Básicas y transversales', 1, '863.64/C117', 800, 1, 'Escaribe', '2006', 'Español', 'Donación 2023-3', '$- ', 'Escaribe', ''),
(138, 'DUARTE,Jaime', 'Las Ibañez', 'Básicas y transversales', 1, '863.64/D812', 800, 1, 'Editorial Arco', '1981', 'Español', 'Donación 2023-3', '$- ', 'Editoral Arco', ' '),
(202, 'R.L Stine ', 'La Novia Muerta ', 'Básicas y transversales', 1, '863.64/R9', 800, 1, 'Ediciones Grupo Zeta ', '1997', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Grupo Zeta ', ' '),
(822, 'Vega, Sergio.', 'Las piedras de Chihaya', 'Básicas y transversales', 1, '863.64/V422', 800, 1, 'Quaterni', '2013', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '16870'),
(217, 'Karen McCombie', 'Por amor ', 'Básicas y transversales', 1, '863/K18', 800, 1, 'Editorial Norma ', '2003', 'Español', 'Donación 2023-3', '$- ', 'Editorial Norma ', ' '),
(617, 'Palma, Ricardo', 'Tradiciones Peruanas', 'Básicas y transversales', 1, '863/P171', 800, 1, 'Peisa', '2014', 'Español', 'Libros Comprados - 2024-3', ' $92.000,00 ', 'Alfa Editorial', '16822'),
(952, 'Vargas Llosa, Mario', 'El Heroe Discreto', 'Básicas y transversales', 1, '863/V297', 800, 1, 'Alfaguara', '2013', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(721, 'Lopez Velarde, Ramon', 'Obra Poética', 'Básicas y transversales', 1, '868/	L864', 800, 1, 'Coleccion Archivos', '1998', 'Español', 'Libros Comprados - 2024-3', ' $35.000,00 ', 'Alfa Editorial', '17045'),
(799, 'Pancorvo, José.', 'Demonios del pacífico sur', 'Básicas y transversales', 1, '868/P188', 800, 1, 'Grupo Editorial Mesa Redonda ', '2013', 'Español', 'Libros Comprados - 2024-3', ' $81.000,00 ', 'Alfa Editorial', '16753'),
(44, 'SARAMAGO,José', 'Las intermitencias de la muerte', 'Básicas y transversales', 1, '869.342/S171i', 800, 1, 'Alfaguara', '2005', 'Español', 'Donación 2023-3', '$- ', 'Universidad de la Salle', ''),
(51, 'SARAMAGO,José', 'La caverna', 'Básicas y transversales', 1, '869.342/S243c', 800, 1, 'Prisa ediciones', '2001', 'Español', 'Donación 2023-3', '$- ', 'Prisa ediciones', ''),
(71, 'ESQUILO', 'Prometeo Encadenado', 'Básicas y transversales', 1, '882/E74', 800, 1, 'La montaña magica', '1986', 'Español', 'Donación 2023-3', '$- ', 'La montaña magica', ''),
(60, 'HOMERO', 'La Odisea', 'Básicas y transversales', 1, '883.1/H766o', 800, 1, 'Ediciones Universales', '1999', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Universales', ''),
(86, 'SHAFAK,Elif', 'La bastarda de estambul', 'Básicas y transversales', 1, '894.373/SH525', 800, 1, 'Editorial Lumen', '2009', 'Español', 'Donación 2023-3', '$- ', 'Editorial Lumen', ''),
(45, 'POLJAK,Ana', 'Sorgo rojo', 'Básicas y transversales', 1, '895.152/Y21s', 800, 1, 'El Aleph Editores', '2009', 'Español', 'Donación 2023-3', '$- ', 'Ediciones FEPAI', ''),
(661, 'Akutagawa, Ryunosuke', 'Antología de Relato Japones', 'Básicas y transversales', 1, '895.6/AK315', 800, 1, 'Quaterni', '2014', 'Español', 'Libros Comprados - 2024-3', ' $62.000,00 ', 'Alfa Editorial', '16698'),
(614, 'Miyabe, Miyuki.', 'Brave Story Un nuevo viajero', 'Básicas y transversales', 1, '895.65/M685', 800, 1, 'Quaterni', '2003', 'Español', 'Libros Comprados - 2024-3', ' $82.000,00 ', 'Alfa Editorial', '16724'),
(656, 'Eiji,  Yoshikawa', 'TAYKO, Hideyoshi en el Poder. Una novela epica de guerra y gloria en el Japon feudal.', 'Básicas y transversales', 1, '899.3/EI34', 800, 1, 'Quaterni', '2011', 'Español', 'Libros Comprados - 2024-3', ' $81.000,00 ', 'Alfa Editorial', '16722'),
(645, 'Íñigo Fernández, Luis E.', 'La historia universal en 100 preguntas', 'Básicas y transversales', 1, '909/IN63', 900, 1, 'Nowtilus', '2016', 'Español', 'Libros Comprados - 2024-3', ' $80.000,00 ', 'Alfa Editorial', '16930'),
(121, 'RIESENBERG,Felix', 'Cabo de hornos ', 'Básicas y transversales', 1, '910.45/R561', 900, 1, 'Libreria Hachette S.A', '1950', 'Español', 'Donación 2023-3', '$- ', 'Libreria Hachette S.A', ' '),
(434, 'Gelves, Tatiana', 'Asia un continente por descubrir', 'Operciones del Comercio Exterior y Logistica Internacional', 1, '910.5/G321', 900, 1, 'Ecoe', '2021', 'Español', 'Libros Comprados - 2023-3', ' $                82.900,00', 'Ecoe', ' '),
(923, 'Fidalco Francisco, Joaquin', 'Derrotero y Cartografia de la Expedicion Fidalco por el Caribe Neogranadino', 'Básicas y transversales', 1, '910.922/F449', 900, 1, 'El Ancora', '2002', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(610, 'Casado De Otaola, Santos.', 'La ciencia en el campo. Naturaleza y regeneracionismo. Quiroga, Calderón y Bolívar.', 'Básicas y transversales', 1, '911/C334', 900, 1, 'Nivola Libros Ediciones', '2001', 'Español', 'Libros Comprados - 2024-3', ' $51.500,00 ', 'Alfa Editorial', '16921'),
(944, 'Cardona Garcia, German', 'Faenas', 'Básicas y transversales', 1, '912/C268', 900, 1, 'Editions Verdier', '2019', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(47, 'PICKETT,Rex', 'Sideways: The ultimate road trip', 'Básicas y transversales', 1, '917.304/P597', 900, 1, 'Martin´s Griffin', '2004', 'Ingles', 'Donación 2023-3', '$- ', 'Universidad Tecnológica de Bolivar ', ''),
(123, 'DE LA ESPRIELLA,Alfredo', 'Centenario de la batalla de flores ', 'Básicas y transversales', 1, '918.613/E77c', 900, 1, 'Editorial Mejoras', '2003', 'Español', 'Donación 2023-3', '$- ', 'Editorial Mejoras', ' '),
(941, 'Lybryx', 'Atlas Ilustrado de los Grandes Generales de la Historia ', 'Básicas y transversales', 1, '920.02/L981', 900, 1, 'Susaeta', '2012', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(909, 'ESPINOSA, Alexander', 'VIda, Obra y Pensamiento del Libertador', 'Básicas y transversales', 1, '920.1/ES77', 900, 1, 'ESPINOSA, Alexander', '2011', 'Español', 'Donación 2025-1', ' $-   ', 'ESPINOSA, Alexander', 'NO, REGISTRADO'),
(631, 'Desconocido', 'Las Invisibles, Obra Colectiva De La Red Lectura Fácil', 'Básicas y transversales', 1, '920.72/D448', 900, 1, 'La Mar de Facil Editorial', '2021', 'Español', 'Libros Comprados - 2024-3', ' $125.000,00 ', 'Alfa Editorial', '17025'),
(948, 'Gullan, Sandra ', 'Josefina Bonaparte', 'Básicas y transversales', 1, '920.72/G973', 900, 1, 'Grijalbo', '2002', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(937, 'Borda Fals, Orlando', 'El Presidente Nieto', 'Básicas y transversales', 1, '920/B727', 900, 1, 'Universidad nacional de la costa ', '2002', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(718, 'Fonfria Jose', 'El Explorador de la Evolucion Wallace. Cientificos para la Historia 17', 'Básicas y transversales', 1, '921.1/F674', 900, 1, 'Nivola ', '2003', 'Español', 'Libros Comprados - 2024-3', ' $82.500,00 ', 'Alfa Editorial', '16650'),
(919, 'SIERRA,  Jorge', 'A la Sombra del Maestro ', 'Básicas y transversales', 1, '923 /C758s cd 21 ed', 900, 1, 'Universidad Simon Bolivar', '2014', 'Español', 'Donación 2025-1', ' $-   ', 'Universidad Simon Bolivar', 'NO, REGISTRADO'),
(133, 'MARISCAL,Alexander', 'Memorias', 'Básicas y transversales', 1, '923.174/M342', 900, 1, 'Editorial la vida vivida', '2000', 'Español', 'Donación 2023-3', '$- ', 'Editorial la vida vivida', ' '),
(956, 'Uribe Velez, Alvaro', 'No Hay Causa Perdida ', 'Básicas y transversales', 1, '923.2/UR76', 900, 1, 'Celebra Book', '2012', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(623, 'Carbonell Blanco, José Antonio.', 'Ciencia para la humanidad Albert Einstein\nEl hombre, el científico, el ciudadano', 'Básicas y transversales', 1, '925.3/C264', 900, 1, 'Cielo Abierto Colección', '2008', 'Español', 'Libros Comprados - 2024-3', ' $21.000,00 ', 'Alfa Editorial', '16627'),
(65, 'KLADSTRUP,Don', 'Wine War', 'Básicas y transversales', 1, '940.53/W767', 900, 1, 'Broad way books', '2001', 'Español', 'Donación 2023-3', '$- ', 'Broad way books', '');
INSERT INTO `libros` (`ID`, `Autor`, `Titulo`, `Programa`, `Item`, `Signatura`, `Areas`, `Ejemplar`, `Editorial`, `Año`, `Idioma`, `Observaciones`, `Precio`, `Proveedor`, `Registro_en_linea`) VALUES
(920, 'FIUMARA, Franco ', 'Educacion y Justicia como Métodos Pacíficos de Prevención', 'Básicas y transversales', 1, '940.5318/F565', 900, 1, 'Unlam', '2016', 'Español', 'Donación 2025-1', ' $-   ', 'Unlam', 'NO, REGISTRADO'),
(201, 'willian stevenson ', '90 Minutos En Entebbe', 'Básicas y transversales', 1, '967.614/Ste95', 900, 1, 'Editorial Cosmos ', '1976', 'Español', 'Donación 2023-3', '$- ', 'Editorial Cosmos ', ' '),
(616, 'Pérez Brignoli, Héctor.', 'Breve historia de centroamérica', 'Básicas y transversales', 1, '972.8/P438', 900, 1, 'Alianza Editorial', '2000', 'Español', 'Libros Comprados - 2024-3', ' $88.000,00 ', 'Alfa Editorial', '16746'),
(148, 'FRIEDEMANN, Nina', 'Mangombe. Guerreros y Ganaderos en Palenque', 'Básicas y transversales', 1, '972.9/F899', 900, 1, 'Carlos Valencia Editorial', '1987', 'Español', 'Donación 2023-3', '$- ', 'Carlos Valencia Editorial', ' '),
(150, 'MEISEL, Adolfo', 'Liderazgo y el futuro del caribe Colombiano', 'Administración de Negocios Internacionales', 1, '972.95/M515', 900, 1, 'Universidad del Norte', '2014', 'Español', 'Donación 2023-3', '$- ', 'Universidad del Norte', ' '),
(950, 'Gabriel Hunt, John', 'The Inaugural Addresses of the Presidents', 'Básicas y transversales', 1, '973.09/G118', 900, 1, 'Gramercy Books', '2003', 'Ingles', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(954, 'Gullan, Harold ', 'First Fathers the Men Who Inspired Our Presidents', 'Básicas y transversales', 1, '973.0992/ G973', 900, 1, 'Wiley', '2004', 'Ingles', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(792, 'Summers Gámez, Joaquín.', 'FRANKLIN: Electricidad, periodismo y política', 'Básicas y transversales', 1, '973.3/SU955', 900, 1, 'Nivola Libros Ediciones', '2002', 'Español', 'Libros Comprados - 2024-3', ' $58.500,00 ', 'Alfa Editorial', '16754'),
(945, 'Yidi Daccarett, Enrique', 'La Barranquilla Desaparecida Imagenes y Memorias ', 'Básicas y transversales', 1, '974.72/Y51', 900, 1, 'Enrique Yidi Daccarett', '2018', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(951, 'Vergara Ramon, Jose', 'Barranquilla su Pasado y su Presente ', 'Básicas y transversales', 1, '986,114', 900, 1, 'Banco Dugand', '1922', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(925, 'Cepedes Uribe, Gabriel', 'Historia Extensa de Colombia', 'Básicas y transversales', 1, '986.1/C399', 900, 1, 'Lener', '1986', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(145, 'SALCEDO,J.L', 'El Diario De Bucaramanga', 'Básicas y transversales', 1, '986.11/SA161', 900, 1, 'Corporación Marca S.A', '1950', 'Español', 'Donación 2023-3', '$- ', 'Universidad Tecnológica de Bolivar ', ' '),
(134, 'MISKI,Samuel', 'Itinerario Historico de Barranquilla', 'Básicas y transversales', 1, '986.113/M678', 900, 1, 'Editorial la iguana ciega', '2009', 'Español', 'Donación 2023-3', '$- ', 'Editorial la iguana ciega', ' '),
(942, 'Colpas Gutierrez, Jaime', 'La Formacion del Departamento del Atlantico 1905-1915', 'Básicas y transversales', 1, '989.2/C721', 900, 1, 'Barranquilla', '2005', 'Español', 'Donación 2025-1', '', '', 'NO, REGISTRADO'),
(64, 'ECHAVARRÍA,Rogelio', 'Lira de amor ', 'Básicas y transversales', 1, 'C861.64/E18', 800, 1, 'Ediciones Planeta', '1991', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Planeta', ''),
(69, 'SOTO,Fernando', 'La rebelion de las ratas', 'Básicas y transversales', 1, 'C863.44/S718r', 800, 1, 'Bolsilibros bedout', '2000', 'Español', 'Donación 2023-3', '$- ', 'Bolsilibros bedout', ''),
(66, 'NERUDA,Pablo', 'Confieso que he vivido', 'Básicas y transversales', 1, 'Ch861.42/N378c', 800, 1, 'Circulo de lectores', '1974', 'Español', 'Donación 2023-3', '$- ', 'Circulo de lectores', ''),
(76, 'GARCIA,Gabriel', 'Diatriba de amor contra un hombre sentado', 'Básicas y transversales', 1, 'CO 863.2/G2016', 800, 1, 'Arango editores', '1994', 'Español', 'Donación 2023-3', '$- ', 'Arango editores', ''),
(77, 'CABALLERO,Calderon', 'Siervo sin tierra ', 'Básicas y transversales', 1, 'CO 863.42/C111', 800, 1, 'Bolsilibros bedout', '1990', 'Español', 'Donación 2023-3', '$- ', 'Bolsilibros bedout', ''),
(84, 'GONZÁLEZ,Tomás', 'Primero estaba el mar', 'Básicas y transversales', 1, 'CO 863.44/G659', 800, 1, 'Editorial Punto de lectura', '2002', 'Español', 'Donación 2023-3', '$- ', 'Editorial Punto de lectura', ''),
(54, 'SANCHEZ,David', 'Un hombre a través de la anécdota', 'Básicas y transversales', 1, 'CO345/Sa447h', 300, 1, 'Ediciones Unisimon', '2013', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Unisimon', ''),
(48, 'GONTOXNIX,Monica', 'Obra Incompleta', 'Básicas y transversales', 1, 'CO861.44/G641', 800, 1, 'Ediciones Kore', '2007', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Kore', ''),
(318, ' Rivera, José Eustasio', 'La Vorágine', 'Básicas y transversales', 1, 'CO863.42 R621', 800, 1, 'Casa editorial El Tiempo', '2001', 'Español', 'Donación 2023-3', '$- ', 'Casa editorial El Tiempo', ''),
(56, 'GARCIA,Gabriel', 'El olor de la guayaba', 'Básicas y transversales', 1, 'CO863.44/G216', 800, 1, 'Editorial la oveja negra', '1982', 'Español', 'Donación 2023-3', '$- ', 'Editorial la oveja negra', ''),
(198, 'gabriel garcia marquez', 'El amor en tiempos de colera ', 'Básicas y transversales', 1, 'CO863.44/G216a', 800, 1, 'Editorial Norma ', '1997', 'Español', 'Donación 2023-3', '$- ', 'Editorial Norma ', ' '),
(49, 'GARCIA,Gabriel', 'Los funerales de la mama grande', 'Básicas y transversales', 1, 'CO863.44/G216f', 800, 1, 'Editorial Oveja Negra', '1987', 'Español', 'Donación 2023-3', '$- ', 'Editorial Oveja Negra', ''),
(87, 'GARCIA,Gabriel', 'Ojos de perro azul ', 'Básicas y transversales', 1, 'CO863.44/G216o', 800, 1, 'Editorial Sudamericana', '2000', 'Español', 'Donación 2023-3', '$- ', 'Editorial Sudamericana', ''),
(42, 'GARCIA,Gabriel', 'De viaje por los paises socialistas', 'Básicas y transversales', 1, 'CO863.44/G216v', 800, 1, 'Ediciones macondo', '1978', 'Español', 'Donación 2023-3', '$- ', 'Ediciones Díaz de Santos ', ''),
(43, 'SILVA,Ricardo', 'Historia oficial del amor', 'Básicas y transversales', 1, 'Co863.44/S459hi', 800, 1, 'Alfaguara', '2016', 'Español', 'Donación 2023-3', '$- ', 'Mambo', ''),
(92, 'GARCIA,Gabriel', 'Del amor y otros demonios', 'Básicas y transversales', 1, 'CO863/G216d', 800, 1, 'Grupo Editorial norma', '1994', 'Español', 'Donación 2023-3', '$- ', 'Grupo Editorial norma', ''),
(57, 'GARCIA,Gabriel', 'El general en su laberinto', 'Básicas y transversales', 1, 'CO863/G216g', 800, 1, 'Editorial la oveja negra', '1989', 'Español', 'Donación 2023-3', '$- ', 'Editorial la oveja negra', ''),
(52, 'GARCIA,Gabriel', 'Vivir para contarla ', 'Básicas y transversales', 1, 'CO920/G216', 900, 1, 'Grupo Editorial norma', '2002', 'Español', 'Donación 2023-3', '$- ', 'Grupo Editorial norma', ''),
(67, 'LLORCA,Carmen', 'Llamadme Evita', 'Básicas y transversales', 1, 'F2849/L55', 800, 1, 'Librería nacional', '1980', 'Español', 'Donación 2023-3', '$- ', 'Librería nacional', ''),
(157, 'FEUTI, Norm', 'Te gusta mi bicicleta', 'Básicas y transversales', 1, 'LCC PZ7.1.F52/DO 2019', 800, 1, 'Scholastic', '2019', 'Español', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(155, 'FEUTI, Norm', 'Hagamos una pijamada', 'Básicas y transversales', 1, 'LCC PZ7.1.F52/LE 2019', 800, 1, 'Scholastic', '2019', 'Español', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(283, 'FLINTHAN, Thomas', 'Press Start ! Game over Super Rabbit Boy!', 'Básicas y transversales', 1, 'LCC PZ7.1.F585/GAM 2017', 800, 1, 'Scholastic', '2017', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(271, 'ELLOTT, Rebecca', 'OWL DIARIES. Baxter is Missing', 'Básicas y transversales', 1, 'LCC PZ7.E45812/BAX 2017', 800, 1, 'Scholastic', '2017', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(273, 'ELLOTT, Rebecca', 'OWL DIARIES. Eva and the Lost Pony', 'Básicas y transversales', 1, 'LCC PZ7.E45812/EN 2018', 800, 1, 'Scholastic', '2018', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(275, 'ELLOTT, Rebecca', 'OWL DIARIES. Eva´s Big Sleepover', 'Básicas y transversales', 1, 'LCC PZ7.E45812/EU 2018', 800, 1, 'Scholastic', '2018', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(267, 'ELLOTT, Rebecca', 'OWL DIARIES Warm Hearts Day', 'Básicas y transversales', 1, 'LCC PZ7.E45812/WAR 2016', 800, 1, 'Scholastic', '2019', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(269, 'ELLOTT, Rebecca', 'OWL DIARIES The Wildwood Bakery', 'Básicas y transversales', 1, 'LCC PZ7.E45812/WI 2017', 800, 1, 'Scholastic', '2019', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(253, 'FENSKE, Jonathan', 'A Crabby Book Hello Crabby', 'Básicas y transversales', 1, 'LCC PZ7.F34843/HE 2019', 800, 1, 'Scholastic', '2019', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(281, 'FENSKE, Jonathan', 'A Crabby Book Wake Up CRABBY!', 'Básicas y transversales', 1, 'LCC PZ7.F34843/WAK 2019', 800, 1, 'Scholastic', '2019', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ''),
(251, 'PILKEY, Dav', 'A friend for DRAGON', 'Básicas y transversales', 1, 'LCC PZ7.P63123/FR 2019', 800, 1, 'Scholastic', '2019', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(153, 'FENSKE, Jonathan', 'Un libro de Cangrejito. Despierta Cangrejito', 'Básicas y transversales', 1, 'PZ 7.F34843/WAK 2019', 800, 1, 'Scholastic', '2019', 'Español', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(151, 'FENSKE, Jonathan', 'Un libro de Cangrejito. Hola Cangrejito', 'Básicas y transversales', 1, 'PZ 7.F348443/HE 2019', 800, 1, 'Scholastic', '2019', 'Español', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(265, 'ELLOTT, Rebecca', 'OWL DIARIES Eva and the New Owl', 'Básicas y transversales', 1, 'PZ7.E45812/EP 2016', 800, 1, 'Scholastic', '2019', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(259, 'ELLOTT, Rebecca', 'OWL DIARIES Eva´s Treetop Festival', 'Básicas y transversales', 1, 'PZ7.E45812/EV 2015', 800, 1, 'Scholastic', '2019', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(263, 'ELLOTT, Rebecca', 'OWL DIARIES A Woodland Wedding', 'Básicas y transversales', 1, 'PZ7.E45812/WO 2016', 800, 1, 'Scholastic', '2019', 'Ingles', 'Donación 2023-3', '$- ', 'Scholastic', ' '),
(564, 'De la puente, mario', 'Movilidad sanitaria internacional', 'Salud Ocupacional', 1, 'RA793.5/P9775', 700, 2, 'Ecoe', '2018', 'Español', 'Libros Comprados - 2023-3', ' $                36.400,00', 'Ecoe', ' '),
(34, 'LILLICRAP,Dennis', 'Food and Beverage Service', 'Tecnología En Gestión Logística Internacional', 1, 'TX 911.3.M27 C68 ', 900, 1, 'Hodder & Stoughton', '2003', 'Ingles', 'Donación 2023-3', '$- ', 'Hodder & Stoughton', ''),
(37, 'PLOTKIN,Robert', 'Successful Beverage Management', 'Administración de Negocios Internacionales', 1, 'TX 950.7/P5823', 900, 1, 'Barmedia Tucson,AZ', '2005', 'Español', 'Donación 2023-3', '$- ', 'Barmedia Tucson,AZ', '');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `prestamos`
--

CREATE TABLE `prestamos` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `book_id` varchar(50) NOT NULL,
  `loan_date` varchar(50) NOT NULL,
  `delivery_date` varchar(50) NOT NULL,
  `entry_date` varchar(50) DEFAULT NULL,
  `state` enum('Activo','Vencido','Devuelto') NOT NULL,
  `prestamo_state` enum('No Aprobado','Aprobado','Rechazado') NOT NULL,
  `observations` varchar(250) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `prestamos`
--

INSERT INTO `prestamos` (`id`, `user_id`, `book_id`, `loan_date`, `delivery_date`, `entry_date`, `state`, `prestamo_state`, `observations`, `created_at`, `updated_at`) VALUES
(1, 8, '431', '2025-04-23 03:08:03.279000', '2025-04-30 03:08:03.279000', '2025-04-23 03:10:01.162000', 'Devuelto', 'Aprobado', NULL, '2025-04-22 22:08:03', '2025-04-22 22:10:01'),
(2, 8, '431', '2025-04-23 03:37:46.523000', '2025-04-30 03:37:46.523000', '2025-04-23 03:38:12.012000', 'Devuelto', 'Aprobado', NULL, '2025-04-22 22:37:46', '2025-04-22 22:38:12'),
(3, 13, '696', '2025-07-17 21:24:23.272000', '2025-07-24 21:24:23.272000', NULL, '', 'Rechazado', NULL, '2025-07-17 16:24:23', '2025-07-17 16:24:46');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `prestamos_dispositivos`
--

CREATE TABLE `prestamos_dispositivos` (
  `id` int(11) NOT NULL,
  `dispositivo_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `fecha_prestamo` datetime NOT NULL,
  `fecha_devolucion` datetime DEFAULT NULL,
  `estado` enum('Activo','Completado','Dañado') NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `prestamos_dispositivos`
--

INSERT INTO `prestamos_dispositivos` (`id`, `dispositivo_id`, `user_id`, `fecha_prestamo`, `fecha_devolucion`, `estado`, `observaciones`, `created_at`, `updated_at`) VALUES
(1, 1, 8, '2025-07-24 00:17:57', '2025-07-24 00:19:15', 'Completado', NULL, '2025-07-23 19:17:57', '2025-07-23 19:19:15'),
(2, 1, 8, '2025-07-24 00:22:00', '2025-07-24 00:23:20', 'Dañado', 'Lo daño nicolas', '2025-07-23 19:22:01', '2025-07-23 19:23:20'),
(3, 12, 13, '2025-07-24 03:00:30', '2025-07-24 03:13:12', 'Completado', NULL, '2025-07-23 22:00:30', '2025-07-23 22:13:12'),
(4, 14, 8, '2025-07-24 03:01:21', '2025-07-24 03:13:19', 'Completado', NULL, '2025-07-23 22:01:21', '2025-07-23 22:13:19'),
(5, 9, 13, '2025-07-24 03:13:37', '2025-07-24 03:13:49', 'Completado', NULL, '2025-07-23 22:13:37', '2025-07-23 22:13:49'),
(6, 14, 8, '2025-07-24 03:15:23', '2025-07-24 03:17:12', 'Completado', NULL, '2025-07-23 22:15:23', '2025-07-23 22:17:12'),
(7, 15, 8, '2025-07-24 03:17:19', '2025-07-24 03:17:31', 'Completado', NULL, '2025-07-23 22:17:19', '2025-07-23 22:17:31'),
(8, 14, 8, '2025-07-24 03:52:53', '2025-07-24 03:53:55', 'Completado', NULL, '2025-07-23 22:52:53', '2025-07-23 22:53:55'),
(9, 12, 8, '2025-07-24 03:54:35', '2025-07-24 03:55:04', 'Completado', NULL, '2025-07-23 22:54:35', '2025-07-23 22:55:04');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveer`
--

CREATE TABLE `proveer` (
  `Libro_ID` int(11) NOT NULL,
  `Contratista_ID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  `address` varchar(255) NOT NULL,
  `rol` enum('Administrador','Funcionario','Docente','Estudiante') NOT NULL,
  `password` varchar(255) NOT NULL,
  `identificacion` varchar(50) DEFAULT NULL,
  `nivel_academico` varchar(50) DEFAULT NULL,
  `carrera` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `username`, `email`, `phone`, `address`, `rol`, `password`, `identificacion`, `nivel_academico`, `carrera`) VALUES
(7, 'Sebastián Andrés Ballestas Zarache', 'Sebas', 'sebastianaballestas@unibarranquilla.edu.co', '3005201105', 'Cra 19 #20-47', 'Administrador', 'TheSABZ27', '1043131875', 'Técnico profesional', 'Mantenimiento de sistemas informáticos'),
(8, 'Nicolas David Castro Quintero', 'ndavidcastro', 'Ncastro@gmail.com', '3148270117', 'Cra 22e #57-89\r\n', 'Estudiante', '123456', '1043671636', 'Técnico profesional ', 'Mantenimiento de sistemas informáticos'),
(13, 'Yoissy Marcela Altamar Jiménez', 'ymaltamar', 'ymaltamar@unibarranquilla.edu.co', '300748544', 'Cra 22B #27B - 28', 'Estudiante', '987654', '1048207919', 'Tecnico profesional', 'Mantenimiento de sistemas informaticos');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `contratistas`
--
ALTER TABLE `contratistas`
  ADD PRIMARY KEY (`ID`);

--
-- Indices de la tabla `dispositivos`
--
ALTER TABLE `dispositivos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_dispositivos_id` (`id`);

--
-- Indices de la tabla `library_access`
--
ALTER TABLE `library_access`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_library_access_id` (`id`);

--
-- Indices de la tabla `libros`
--
ALTER TABLE `libros`
  ADD PRIMARY KEY (`Signatura`),
  ADD UNIQUE KEY `ID` (`ID`);

--
-- Indices de la tabla `prestamos`
--
ALTER TABLE `prestamos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_prestamos_id` (`id`);

--
-- Indices de la tabla `prestamos_dispositivos`
--
ALTER TABLE `prestamos_dispositivos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_prestamos_dispositivos_id` (`id`);

--
-- Indices de la tabla `proveer`
--
ALTER TABLE `proveer`
  ADD PRIMARY KEY (`Libro_ID`,`Contratista_ID`),
  ADD KEY `ix_proveer_Libro_ID` (`Libro_ID`),
  ADD KEY `ix_proveer_Contratista_ID` (`Contratista_ID`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_usuarios_username` (`username`),
  ADD UNIQUE KEY `ix_usuarios_identificacion` (`identificacion`),
  ADD UNIQUE KEY `ix_usuarios_email` (`email`),
  ADD KEY `ix_usuarios_id` (`id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `contratistas`
--
ALTER TABLE `contratistas`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `dispositivos`
--
ALTER TABLE `dispositivos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `library_access`
--
ALTER TABLE `library_access`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `libros`
--
ALTER TABLE `libros`
  MODIFY `ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=959;

--
-- AUTO_INCREMENT de la tabla `prestamos`
--
ALTER TABLE `prestamos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `prestamos_dispositivos`
--
ALTER TABLE `prestamos_dispositivos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
