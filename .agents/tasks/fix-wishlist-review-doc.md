# Wishlist ObjectId cast errors and duplicate-check fixes

This change fixes three interconnected bugs that prevented the HookahDrop add-to-favorites feature from working: ObjectId type enforcement causing cast errors, a broken duplicate-check that allowed multiple copies of the same product, and an incorrect database lookup in the update endpoint. The fix changes the Wishlist schema from ObjectId to String types, corrects the duplicate-check logic, fixes the update endpoint's query pattern, and adds a new atomic single-product removal endpoint with proper error logging throughout.

**Verdict**: APPROVED

## High-level view

The schema change from ObjectId to String solves the cast error by accepting both MongoDB ObjectId strings and static fallback IDs. The duplicate-check was corrected to use `.some()` with `.toString()` instead of `.includes()`, handling both ObjectId objects and strings during the transition. The `updateWishlist` endpoint now uses `findOneAndUpdate({ userId })` instead of `findByIdAndUpdate`, aligning with other endpoints. A new atomic single-product removal endpoint was added using MongoDB's $pull operator, with error logging on both backend and Android client.

<details>
<summary>Issues (0)</summary>

No blocking issues found.

</details>

<details>
<summary>Details</summary>

## Schema type change from ObjectId to String

The Wishlist model previously declared `userId` and `productId` fields as `mongoose.Schema.Types.ObjectId` with refs to User and Product models. The Android client sends plain string IDs—either MongoDB ObjectId strings from backend products or static identifiers like "p1" from DataProvider fallback data. Mongoose's strict type checking threw "Cast to ObjectId failed" errors whenever a string that didn't match ObjectId format was used, causing 400 responses that the client handled silently by returning false.

Changing both fields to `type: String` allows the schema to accept any string value. The ref comments remain as documentation but don't affect runtime behavior. This approach supports the app's mixed-ID pattern: real product ObjectId strings when online, static fallback IDs when offline or testing. Old documents with ObjectId values will be read and stringified automatically by Mongoose when accessed; new documents store plain strings from the start.

## Duplicate-check logic correction

The original `addToWishlist` checked duplicates with `wishlist.productId.includes(productId)`, comparing a string against an array of ObjectId objects. Strict equality meant it always returned false, allowing duplicate insertions. The fix uses `wishlist.productId.some(id => id.toString() === productId)`, which handles both ObjectId objects from old documents and strings from new ones.

## Android client changes

`RemoteDataProvider.addToWishlist` now logs failures with HTTP status and raw response body, surfacing cast errors and validation failures in Logcat.

`RemoteDataProvider.removeFromWishlist` was rewritten to call the new DELETE endpoint first, falling back to GET-PUT if it fails. The fallback logs warnings and errors for both GET and PUT failures, preserving backward compatibility while preferring the atomic approach.

</details>

<details>
<summary>File map</summary>

- `models/Wishlist.js` — userId and productId changed from ObjectId to String types
- `controller/wishlist.js` — duplicate check uses .some() with .toString(); updateWishlist uses findOneAndUpdate({ userId }); new removeProductFromWishlist with $pull (malformed); error logging added
- `routes/wishlist.js` — new DELETE /:userId/product/:productId route added before DELETE /:id
- `hookaDrop App/HookahDrop/app/src/main/java/com/hookahdrop/app/data/RemoteDataProvider.kt` — addToWishlist logs failures; removeFromWishlist uses new endpoint with GET-PUT fallback and error logging

Full diff: `git show 34d8871d`

</details>
