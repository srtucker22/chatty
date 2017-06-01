import { $$asyncIterator } from 'iterall';
import { PubSub } from 'apollo-server';

export const pubsub = new PubSub();

pubsub.asyncAuthIterator = (messages, authPromise) => {
  const asyncIterator = pubsub.asyncIterator(messages);
  return {
    next() {
      return authPromise.then(() => asyncIterator.next());
    },
    return() {
      return authPromise.then(() => asyncIterator.return());
    },
    throw(error) {
      return asyncIterator.throw(error);
    },
    [$$asyncIterator]() {
      return asyncIterator;
    },
  };
};

export default pubsub;
