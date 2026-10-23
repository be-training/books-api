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

-- 3. Seed sample data (Idempotent seed)
INSERT INTO books (
  id, title, author, isbn, published_year, publisher, edition, description, total_copies, tags, status, added_on
) VALUES
(
  1,
  'The Pragmatic Programmer',
  'David Thomas, Andrew Hunt',
  '978-0-13-595705-9',
  2019,
  'Addison-Wesley',
  '20th Anniversary Edition',
  '[Short description of the book]',
  5,
  JSON_ARRAY('Programming', 'Career'),
  'AVAILABLE',
  '2026-09-12'
),
(
  2,
  'Clean Code',
  'Robert C. Martin',
  '978-0-13-235088-4',
  2008,
  'Prentice Hall',
  '1st Edition',
  'A Handbook of Agile Software Craftsmanship',
  3,
  JSON_ARRAY('Programming', 'Architecture'),
  'AVAILABLE',
  '2026-08-10'
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  author = VALUES(author),
  publisher = VALUES(publisher),
  edition = VALUES(edition),
  description = VALUES(description),
  total_copies = VALUES(total_copies),
  tags = VALUES(tags),
  status = VALUES(status),
  added_on = VALUES(added_on);

-- 4. Seed loan history for book 1 (Matching UI screenshot)
INSERT INTO book_loans (
  id, book_id, member_id, member_name, borrowed_date, due_date, returned_date, status
) VALUES
(1, 1, 101, 'Minh Tran', '2026-10-15', '2026-10-29', NULL, 'ACTIVE'),
(2, 1, 102, 'Lan Pham', '2026-10-02', '2026-10-16', NULL, 'OVERDUE'),
(3, 1, 103, 'Huy Nguyen', '2026-10-10', '2026-10-24', NULL, 'ACTIVE'),
(4, 1, 104, 'Thao Le', '2026-09-20', '2026-10-04', '2026-10-03', 'RETURNED'),
(5, 1, 105, 'Khoa Vo', '2026-09-01', '2026-09-15', '2026-09-14', 'RETURNED')
ON DUPLICATE KEY UPDATE
  member_name = VALUES(member_name),
  borrowed_date = VALUES(borrowed_date),
  due_date = VALUES(due_date),
  returned_date = VALUES(returned_date),
  status = VALUES(status);
