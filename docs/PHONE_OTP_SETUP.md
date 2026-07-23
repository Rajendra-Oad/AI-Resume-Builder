# Phone OTP setup

The application supports two delivery modes behind the same verification service.

## Local development (no SMS cost)

Set these values in `backend/.env`:

```properties
OTP_PROVIDER=fake
OTP_TTL=PT5M
OTP_RESEND_COOLDOWN=PT1M
```

Restart the backend, sign in, open **Profile**, enter an Indian mobile number, save the profile, and select **Send verification code**. The development code is displayed in the UI. Enter it to verify the number. After verification, the number can be used in the login form with the account password.

Fake mode never sends an SMS and is rejected automatically when the `prod` Spring profile is active.

## Development with an Android phone and Jio SIM

If the phone gateway accepts `POST {"phone":"1234567890","message":"Hello"}`, configure:

```properties
OTP_PROVIDER=android-gateway
ANDROID_SMS_GATEWAY_URL=http://192.168.1.46:8080/send-sms
ANDROID_SMS_GATEWAY_API_KEY=
OTP_TTL=PT5M
OTP_RESEND_COOLDOWN=PT1M
```

The backend sends the recipient as a 10-digit Indian mobile number and puts the generated OTP inside `message`. The phone and backend computer must be on the same network, the gateway app must be running, and Android/Jio must permit outgoing SMS. If the gateway supports authentication, set `ANDROID_SMS_GATEWAY_API_KEY`; it is sent as a Bearer token. This provider is rejected in the production profile.

## Development with TextBee and a Jio SIM

Register the Android device in the TextBee dashboard, confirm it appears as **Active**, and copy its Device ID and a dedicated API key. Configure `backend/.env`:

```properties
OTP_PROVIDER=textbee
TEXTBEE_BASE_URL=https://api.textbee.dev
TEXTBEE_API_KEY=your-textbee-api-key
TEXTBEE_DEVICE_ID=your-textbee-device-id
TEXTBEE_SIM_SUBSCRIPTION_ID=
OTP_TTL=PT5M
OTP_RESEND_COOLDOWN=PT1M
```

For a dual-SIM phone, set `TEXTBEE_SIM_SUBSCRIPTION_ID` to the subscription ID shown by TextBee. Leave it blank to use the default SIM. The backend calls `POST /api/v1/gateway/devices/{DEVICE_ID}/send-sms`, authenticates with `x-api-key`, and sends `recipients` in E.164 format. TextBee acceptance means the SMS is queued for the Android device; keep the phone online with SMS permission enabled.

## Production with MSG91

1. Create an MSG91 account and complete the required Indian DLT Principal Entity, sender ID, and OTP template registration.
2. Create an OTP template containing the `##OTP##` placeholder.
3. Create a restricted MSG91 authentication key.
4. Keep all credentials in the backend deployment environment. Never add them to Vite variables or frontend code.
5. Configure:

```properties
SPRING_PROFILES_ACTIVE=prod
OTP_PROVIDER=msg91
MSG91_AUTH_KEY=your-backend-auth-key
MSG91_TEMPLATE_ID=your-approved-template-id
MSG91_BASE_URL=https://control.msg91.com
OTP_TTL=PT5M
OTP_RESEND_COOLDOWN=PT1M
```

The production profile refuses to start with fake OTP or missing MSG91 credentials.

## API flow

```text
POST /api/v1/users/me/phone/send-otp
{ "phone": "+919876543210" }

POST /api/v1/users/me/phone/verify-otp
{ "code": "123456" }
```

Codes are six digits, BCrypt-hashed at rest, expire after five minutes, cannot be reused, have a one-minute resend cooldown, and lock after five incorrect attempts. Only verified phone numbers are accepted by password login.
