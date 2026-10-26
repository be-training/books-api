-- Generate 100 sample books
INSERT INTO books (
  id, title, author, isbn, published_year,
  publisher, edition, description,
  total_copies, tags, status, added_on
)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 100
)
SELECT
  n,
  CONCAT(
    ELT(1 + MOD(n - 1, 10),
      'Clean Code',
      'The Pragmatic Programmer',
      'Clean Architecture',
      'Design Patterns',
      'Refactoring',
      'Effective TypeScript',
      'Domain-Driven Design',
      'Building Microservices',
      'Code Complete',
      'System Design Interview'
    ),
    ' - Volume ',
    n
  ),
  CONCAT('Sample Author ', n),
  CONCAT('DEMO-ISBN-', LPAD(n, 6, '0')),
  2000 + MOD(n, 25),
  ELT(1 + MOD(n - 1, 5),
    'O''Reilly Media',
    'Addison-Wesley',
    'Prentice Hall',
    'Manning Publications',
    'MIT Press'
  ),
  '1st Edition',
  CONCAT('Sample description for book ', n),
  2 + MOD(n, 5),
  JSON_ARRAY(
    ELT(1 + MOD(n - 1, 5),
      'Programming',
      'Architecture',
      'Database',
      'Testing',
      'System Design'
    )
  ),
  'AVAILABLE',
  DATE_ADD('2026-08-01', INTERVAL MOD(n, 60) DAY)
FROM seq
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  author = VALUES(author),
  isbn = VALUES(isbn),
  published_year = VALUES(published_year),
  publisher = VALUES(publisher),
  edition = VALUES(edition),
  description = VALUES(description),
  total_copies = VALUES(total_copies),
  tags = VALUES(tags),
  status = VALUES(status),
  added_on = VALUES(added_on);

  INSERT INTO book_loans (
  id, book_id, member_id, member_name,
  borrowed_date, due_date, returned_date, status
)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 30
)
SELECT
  n,
  1 + MOD(n - 1, 20),
  100 + n,
  CONCAT('Sample Member ', n),
  DATE_ADD('2026-09-01', INTERVAL n DAY),
  DATE_ADD('2026-09-15', INTERVAL n DAY),
  CASE
    WHEN MOD(n, 3) = 0
      THEN DATE_ADD('2026-09-14', INTERVAL n DAY)
    ELSE NULL
  END,
  CASE
    WHEN MOD(n, 3) = 0 THEN 'RETURNED'
    WHEN MOD(n, 3) = 1 THEN 'ACTIVE'
    ELSE 'OVERDUE'
  END
FROM seq
ON DUPLICATE KEY UPDATE
  book_id = VALUES(book_id),
  member_id = VALUES(member_id),
  member_name = VALUES(member_name),
  borrowed_date = VALUES(borrowed_date),
  due_date = VALUES(due_date),
  returned_date = VALUES(returned_date),
  status = VALUES(status);

SELECT COUNT(*) AS total_books FROM books;

SELECT COUNT(*) AS total_loans FROM book_loans;

SELECT id, title, author, status
FROM books
ORDER BY id;

SELECT id, book_id, member_name, due_date, status
FROM book_loans
ORDER BY id;