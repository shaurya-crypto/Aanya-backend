# TODO: Fix aanya-api Codebase

## 1. Fix Configuration Files
- [ ] Fix .env: Remove extra space in GROQ_API_KEY
- [ ] Fix db.js: Correct typo in console.log ("Momgodb" -> "MongoDB")

## 2. Update Schemas
- [ ] Update user.js: Add unique constraint and email validation for email field
- [ ] Update Apikey.js: Add unique constraint for key field

## 3. Remove Unused Files
- [ ] Remove api.js (leftover script)
- [ ] Remove intentParser.js (unused)

## 4. Improve Controllers
- [ ] Update authController.js: Add basic email validation in register function

## 5. Verify and Test
- [ ] Run server to ensure no breaking changes
- [ ] Check for any import errors or missing dependencies
