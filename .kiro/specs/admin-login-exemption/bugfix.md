# Bugfix Requirements Document

## Introduction

The Lab Administrator cannot sign in because the frontend `validate()` function in `SignIn.jsx` enforces a TIP email format (`/^m[a-zA-Z.]+@tip\.edu\.ph$/`) for all users without exception. The admin account uses a plain username (`admin`) as its `tip_email` field and `ADMIN01` as its student ID — neither of which passes the current validation. Since the backend does not enforce email format and simply queries by `tip_email` + `student_id`, the fix is frontend-only: exempt the admin from email format validation when `studentId` is `ADMIN01` (case-insensitive).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN studentId is `ADMIN01` (case-insensitive) AND tipEmail is `admin` THEN the system rejects the form with "Must be a valid TIP email" before the request reaches the backend

1.2 WHEN studentId is `ADMIN01` AND any non-TIP-format string is entered as tipEmail THEN the system blocks submission due to the regex validation applying to all users uniformly

### Expected Behavior (Correct)

2.1 WHEN studentId is `ADMIN01` (case-insensitive) THEN the system SHALL skip the TIP email format regex check and allow any non-empty tipEmail value to pass validation

2.2 WHEN studentId is `ADMIN01` AND tipEmail is `admin` THEN the system SHALL submit the sign-in request to the backend and authenticate successfully

### Unchanged Behavior (Regression Prevention)

3.1 WHEN studentId is a 7-8 digit numeric value (regular student) THEN the system SHALL CONTINUE TO enforce the TIP email format (`/^m[a-zA-Z.]+@tip\.edu\.ph$/`) on the tipEmail field

3.2 WHEN tipEmail is empty for any user THEN the system SHALL CONTINUE TO show the "TIP Email is required" validation error

3.3 WHEN studentId is empty for any user THEN the system SHALL CONTINUE TO show the "Student ID is required" validation error

3.4 WHEN a regular student provides a valid TIP email and valid 7-8 digit studentId THEN the system SHALL CONTINUE TO submit the sign-in request and authenticate successfully
