# Bugfix Requirements Document

## Introduction

The Sign Up page (`frontend/src/pages/SignUp.jsx`) contains four form fields (Full Name, Student ID, TIP Email, Program) whose `<label>` elements are not programmatically associated with their corresponding inputs. No `htmlFor` attribute is present on any label, and no matching `id` attribute is present on any input or select element. This violates WCAG 1.3.1 (Info and Relationships) and WCAG 4.1.2 (Name, Role, Value), breaks screen reader announcements, and prevents label-click-to-focus behavior.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user visits the Sign Up page THEN the system renders the Full Name label without a `htmlFor` attribute and the Full Name input without an `id` attribute, leaving them unassociated.

1.2 WHEN a user visits the Sign Up page THEN the system renders the Student ID label without a `htmlFor` attribute and the Student ID input without an `id` attribute, leaving them unassociated.

1.3 WHEN a user visits the Sign Up page THEN the system renders the TIP Email label without a `htmlFor` attribute and the TIP Email input without an `id` attribute, leaving them unassociated.

1.4 WHEN a user visits the Sign Up page THEN the system renders the Program label without a `htmlFor` attribute and the Program select without an `id` attribute, leaving them unassociated.

### Expected Behavior (Correct)

2.1 WHEN a user visits the Sign Up page THEN the system SHALL render the Full Name label with `htmlFor="fullName"` and the Full Name input with `id="fullName"`, creating a valid programmatic association.

2.2 WHEN a user visits the Sign Up page THEN the system SHALL render the Student ID label with `htmlFor="studentId"` and the Student ID input with `id="studentId"`, creating a valid programmatic association.

2.3 WHEN a user visits the Sign Up page THEN the system SHALL render the TIP Email label with `htmlFor="tipEmail"` and the TIP Email input with `id="tipEmail"`, creating a valid programmatic association.

2.4 WHEN a user visits the Sign Up page THEN the system SHALL render the Program label with `htmlFor="program"` and the Program select with `id="program"`, creating a valid programmatic association.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user fills in the Full Name field THEN the system SHALL CONTINUE TO validate and accept the entered value through the existing `name="fullName"` change handler.

3.2 WHEN a user fills in the Student ID field THEN the system SHALL CONTINUE TO strip non-digit characters and validate 7–8 digit format through the existing `name="studentId"` change handler.

3.3 WHEN a user fills in the TIP Email field THEN the system SHALL CONTINUE TO validate the TIP email format through the existing `name="tipEmail"` change handler.

3.4 WHEN a user selects a Program THEN the system SHALL CONTINUE TO capture the selected value through the existing `name="program"` change handler.

3.5 WHEN a user submits the Sign Up form with valid data THEN the system SHALL CONTINUE TO call the `signUp` service and navigate to `/signin` on success.

3.6 WHEN a user submits the Sign Up form with invalid data THEN the system SHALL CONTINUE TO display inline validation error messages for each invalid field.
