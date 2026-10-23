-- Seed sample books matching UI
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

-- Seed loan history for book 1 matching UI table
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
