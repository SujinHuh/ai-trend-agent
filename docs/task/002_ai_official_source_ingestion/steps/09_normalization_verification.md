# Step 9 - Normalization and Verification

## Purpose

Convert raw source entries into verified, deduplicated ingestion candidates.

## Implementation Notes

Required behavior:

- require title and URL.
- canonicalize URL using Task 001 logic.
- generate stable ID using Task 001 logic.
- compute `effectivePublishedAt`.
- apply Asia/Seoul report-window filtering.
- mark missing-date entries for review.
- record exclusion and duplicate reasons.

## Review Checklist

- tracking query params are removed.
- duplicate canonical URLs collapse.
- missing dates are not silently lost.
- KST window boundaries are tested.

## Done Criteria

- normalization tests pass.
- verification output includes reasons.
- validation report records included, needs-review, and excluded counts.
