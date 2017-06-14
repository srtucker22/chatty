import fetch from 'node-fetch';

import { FIREBASE_SERVER_KEY } from './config';

const FIREBASE_ROOT_URL = 'https://fcm.googleapis.com/fcm';

export const sendNotification = (notification) => {
  fetch(`${FIREBASE_ROOT_URL}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${FIREBASE_SERVER_KEY}`,
    },
    body: JSON.stringify(notification),
  })
    .then(res => res.json()).then((json) => {
      console.log(json);
    })
    .catch((e) => {
      console.log(e);
    });
};

export default sendNotification;
