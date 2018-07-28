import dotenv from 'dotenv';

dotenv.config({ silent: true });

export const {
  JWT_SECRET,
  FIREBASE_SERVER_KEY,
  AWS_BUCKET,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
} = process.env;

const defaults = {
  JWT_SECRET: 'your_secret',
  FIREBASE_SERVER_KEY: 'your_key',
  AWS_BUCKET: 'your_bucket_name',
  AWS_ACCESS_KEY_ID: 'your_access_key_id',
  AWS_SECRET_ACCESS_KEY: 'your_secret_access_key',
  AWS_REGION: 'your_region',
};

Object.keys(defaults).forEach((key) => {
  if (!process.env[key] || process.env[key] === defaults[key]) {
    throw new Error(`Please enter a custom ${key} in .env on the root directory`);
  }
});
