import dotenv from 'dotenv';

dotenv.config({ silent: true });

export const {
  JWT_SECRET,
  FIREBASE_SERVER_KEY,
} = process.env;

const defaults = {
  JWT_SECRET: 'your_secret',
  FIREBASE_SERVER_KEY: 'your_key',
};

Object.keys(defaults).forEach((key) => {
  if (!process.env[key] || process.env[key] === defaults[key]) {
    throw new Error(`Please enter a custom ${key} in .env on the root directory`);
  }
});
