-- Widen device push token to hold FCM registration tokens (longer than Expo tokens).
ALTER TABLE "device_tokens" ALTER COLUMN "token" SET DATA TYPE varchar(512);
