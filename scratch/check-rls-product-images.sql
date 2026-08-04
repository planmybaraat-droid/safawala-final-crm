SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'product_images';
SELECT * FROM pg_policies WHERE tablename = 'product_images';
