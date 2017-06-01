import { Message } from './connectors';

// reusable function to check for a user with context
function getAuthenticatedUser(ctx) {
  return ctx.user.then((user) => {
    if (!user) {
      return Promise.reject('Unauthorized');
    }
    return user;
  });
}

export const messageLogic = {
  createMessage(_, { text, groupId }, ctx) {
    return getAuthenticatedUser(ctx)
      .then(user => user.getGroups({ where: { id: groupId }, attributes: ['id'] })
      .then((group) => {
        if (group.length) {
          return Message.create({
            userId: user.id,
            text,
            groupId,
          });
        }
        return Promise.reject('Unauthorized');
      }));
  },
};
