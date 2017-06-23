import S3 from 'aws-sdk/clients/s3';
import fs from 'fs';

import {
  AWS_BUCKET,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
} from './config';

const s3 = new S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

export const deleteFile = Key => new Promise((res, rej) => {
  const params = {
    Bucket: AWS_BUCKET,
    Key,
  };

  s3.deleteObject(params, (err, data) => {
    if (err) {
      rej(err);
    }

    if (data) {
      res(data);
    }
  });
});

export const uploadFile = ({ file, options }) => new Promise((res, rej) => {
  const fileStream = fs.createReadStream(file);
  fileStream.on('error', (err) => {
    rej(err);
  });

  const params = {
    Bucket: AWS_BUCKET,
    Body: fileStream,
    Key: options.name,
    ACL: options.acl || 'public-read',
  };

  s3.upload(params, (err, data) => {
    if (err) {
      rej(err);
    }

    if (data) {
      res(data);
    }
  });
});

export const getSignedFileUrl = ({ file, options }) => {
  const params = Object.assign({
    Bucket: AWS_BUCKET,
    Key: file,
  }, options);

  return s3.getSignedUrl('getObject', params);
};

export const getFileUrl = key => `https://${AWS_BUCKET}.s3-${AWS_REGION}.amazonaws.com/${key}`;
