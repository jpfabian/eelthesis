# Database migrations

Run migrations once against your database when instructed.

## add-class-id-to-attempts.sql

Adds `class_id` to quiz attempt tables so that student quiz data is scoped per classroom. **Run this before using the “per-class” quiz data fix**, or the backend will error when creating/filtering attempts.

From your project root (with MySQL/MariaDB client):

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < js-back-end/migrations/add-class-id-to-attempts.sql
```

Or run the SQL in your DB tool. If a column already exists, the statement for that table will fail; you can skip that line or run the file once.

After migration, existing attempts have `class_id = NULL` and will not appear when viewing a specific class; new attempts will be stored with the selected class and shown only in that class.
