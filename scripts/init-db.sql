-- Database initialization script for Library Admin Books API

-- 1. Create table books
CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(50) NOT NULL UNIQUE,
  published_year INT NOT NULL,
  publisher VARCHAR(255) NULL,
  edition VARCHAR(255) NULL,
  description TEXT NULL,
  total_copies INT NOT NULL DEFAULT 1,
  tags JSON NULL,
  status ENUM('AVAILABLE', 'OUT_OF_STOCK', 'ARCHIVED') NOT NULL DEFAULT 'AVAILABLE',
  added_on DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_books_title (title),
  INDEX idx_books_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create table book_loans
CREATE TABLE IF NOT EXISTS book_loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  member_id INT NOT NULL,
  member_name VARCHAR(255) NOT NULL,
  borrowed_date DATE NOT NULL,
  due_date DATE NOT NULL,
  returned_date DATE NULL,
  status ENUM('ACTIVE', 'OVERDUE', 'RETURNED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_book_loans_book_id (book_id),
  INDEX idx_book_loans_status (status),
  CONSTRAINT fk_book_loans_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;