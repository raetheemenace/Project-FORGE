# Bugfix Requirements Document

## Introduction

On mobile devices accessing the app via the deployed link, the QR scanner camera fails to appear when the user taps the QR toggle button in BorrowStep3. The `html5-qrcode` library is used to render a camera UI inside a container div, but the camera stream never shows up on mobile browsers (particularly iOS Safari and Android Chrome). This blocks users from scanning equipment QR codes to add items to their borrow cart.

The root causes span a race condition between releasing the existing `getUserMedia` stream and requesting a new one, the `facingMode: 'environment'` constraint being applied too strictly, the 100ms DOM-readiness delay being insufficient on mobile, and the scanner container potentially having no height before the library injects its UI.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a mobile user taps the QR toggle button THEN the system stops the existing camera stream and attempts to start `html5-qrcode`, but the camera UI never renders inside the container div

1.2 WHEN `toggleQrMode` is called on iOS Safari THEN the system releases the `getUserMedia` stream and immediately requests a new camera stream via `html5-qrcode`, causing the browser to deny or silently drop the second camera request due to the stream not being fully released

1.3 WHEN `html5-qrcode` initializes with `facingMode: 'environment'` as a hard constraint THEN the system fails to open the camera on devices where the back camera is unavailable or the constraint cannot be satisfied, showing no camera UI and no error message to the user

1.4 WHEN the QR scanner container div is rendered and `startScanner` is called after a 100ms delay THEN the system may call `Html5QrcodeScanner.render()` before the container div has a non-zero layout height on mobile, causing the library to silently fail to display the camera feed

1.5 WHEN `html5-qrcode` renders its permission/camera-selection UI inside the container div THEN the system displays a UI that some mobile browsers block or do not render correctly within a constrained div with no explicit minimum height

### Expected Behavior (Correct)

2.1 WHEN a mobile user taps the QR toggle button THEN the system SHALL display a functional camera viewfinder inside the QR scanner container within a reasonable time, allowing the user to scan QR codes

2.2 WHEN `toggleQrMode` is called on iOS Safari THEN the system SHALL ensure the previous camera stream is fully released before `html5-qrcode` requests a new one, preventing the browser from denying the second camera request

2.3 WHEN `html5-qrcode` initializes on a device where `facingMode: 'environment'` cannot be satisfied THEN the system SHALL fall back to any available camera rather than failing silently, so the user still gets a working scanner

2.4 WHEN `startScanner` is called THEN the system SHALL wait until the container div is confirmed to be present in the DOM and has a non-zero layout before calling `Html5QrcodeScanner.render()`, preventing silent initialization failures on mobile

2.5 WHEN the QR scanner container is rendered THEN the system SHALL ensure the container div has a sufficient minimum height so that `html5-qrcode` can inject and display its camera UI correctly on mobile browsers

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a desktop user taps the QR toggle button THEN the system SHALL CONTINUE TO display the QR scanner camera UI and successfully scan FORGE_EQUIPMENT QR codes

3.2 WHEN a valid FORGE_EQUIPMENT JSON QR code is scanned THEN the system SHALL CONTINUE TO call `onScanSuccess` with the `equipmentId` and auto-add the item to the cart

3.3 WHEN a plain-text QR code is scanned THEN the system SHALL CONTINUE TO call `onScanSuccess` with the trimmed text value

3.4 WHEN an invalid or unrecognized QR code is scanned THEN the system SHALL CONTINUE TO call `onScanError` with the appropriate error message

3.5 WHEN the user closes the QR scanner THEN the system SHALL CONTINUE TO stop the QR scanner and restart the AI camera stream for the equipment identifier feature

3.6 WHEN the user is not in QR mode THEN the system SHALL CONTINUE TO use the AI scanner (getUserMedia stream) for equipment identification without any regression
