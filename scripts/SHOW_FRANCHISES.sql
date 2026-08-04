-- Simple franchise and user check

-- Step 1: Show all existing franchises
SELECT 
    id,
    code,
    name,
    city
FROM franchises
ORDER BY code;
