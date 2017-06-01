import GraphQLDate from 'graphql-date';
import { withFilter } from 'graphql-subscriptions';
import { map } from 'lodash';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { Group, Message, User } from './connectors';
import { pubsub } from '../subscriptions';
import { JWT_SECRET } from '../config';
import { messageLogic } from './logic';

const MESSAGE_ADDED_TOPIC = 'messageAdded';
const GROUP_ADDED_TOPIC = 'groupAdded';

export const Resolvers = {
  Date: GraphQLDate,
  PageInfo: {
    // we will have each connection supply its own hasNextPage/hasPreviousPage functions!
    hasNextPage(connection, args) {
      return connection.hasNextPage();
    },
    hasPreviousPage(connection, args) {
      return connection.hasPreviousPage();
    },
  },
  Query: {
    group(_, args) {
      return Group.find({ where: args });
    },
    messages(_, args) {
      return Message.findAll({
        where: args,
        order: [['createdAt', 'DESC']],
      });
    },
    user(_, args) {
      return User.findOne({ where: args });
    },
  },
  Mutation: {
    createMessage(_, args, ctx) {
      return messageLogic.createMessage(_, args, ctx)
        .then((message) => {
          // Publish subscription notification with message
          pubsub.publish(MESSAGE_ADDED_TOPIC, { [MESSAGE_ADDED_TOPIC]: message });
          return message;
        });
    },
    createGroup(_, { name, userIds, userId }) {
      return User.findOne({ where: { id: userId } })
        .then(user => user.getFriends({ where: { id: { $in: userIds } } })
          .then(friends => Group.create({
            name,
            users: [user, ...friends],
          })
            .then(group => group.addUsers([user, ...friends])
              .then((res) => {
                // append the user list to the group object
                // to pass to pubsub so we can check members
                group.users = [user, ...friends];
                pubsub.publish(GROUP_ADDED_TOPIC, { [GROUP_ADDED_TOPIC]: group });
                return group;
              })),
          ),
        );
    },
    deleteGroup(_, { id }) {
      return Group.find({ where: id })
        .then(group => group.getUsers()
          .then(users => group.removeUsers(users))
          .then(() => Message.destroy({ where: { groupId: group.id } }))
          .then(() => group.destroy()),
        );
    },
    leaveGroup(_, { id, userId }) {
      return Group.findOne({ where: { id } })
        .then(group => group.removeUser(userId)
          .then(() => group.getUsers())
          .then((users) => {
            // if the last user is leaving, remove the group
            if (!users.length) {
              group.destroy();
            }
            return { id };
          }),
        );
    },
    updateGroup(_, { id, name }) {
      return Group.findOne({ where: { id } })
        .then(group => group.update({ name }));
    },
    login(_, { email, password }, ctx) {
      // find user by email
      return User.findOne({ where: { email } }).then((user) => {
        if (user) {
          // validate password
          return bcrypt.compare(password, user.password).then((res) => {
            if (res) {
              // create jwt
              const token = jwt.sign({
                id: user.id,
                email: user.email,
              }, JWT_SECRET);
              user.jwt = token;
              ctx.user = Promise.resolve(user);
              return user;
            }

            return Promise.reject('password incorrect');
          });
        }

        return Promise.reject('email not found');
      });
    },
    signup(_, { email, password, username }, ctx) {
      // find user by email
      return User.findOne({ where: { email } }).then((existing) => {
        if (!existing) {
          // hash password and create user
          return bcrypt.hash(password, 10).then(hash => User.create({
            email,
            password: hash,
            username: username || email,
          })).then((user) => {
            const { id } = user;
            const token = jwt.sign({ id, email }, JWT_SECRET);
            user.jwt = token;
            ctx.user = Promise.resolve(user);
            return user;
          });
        }

        return Promise.reject('email already exists'); // email already exists
      });
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(MESSAGE_ADDED_TOPIC),
        (payload, args) => {
          return Boolean(
            args.groupIds &&
            ~args.groupIds.indexOf(payload.messageAdded.groupId) &&
            args.userId !== payload.messageAdded.userId, // don't send to user creating message
          );
        },
      ),
    },
    groupAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(GROUP_ADDED_TOPIC),
        (payload, args) => {
          return Boolean(
            args.userId &&
            ~map(payload.groupAdded.users, 'id').indexOf(args.userId) &&
            args.userId !== payload.groupAdded.users[0].id, // don't send to user creating group
          );
        },
      ),
    },
  },
  Group: {
    users(group) {
      return group.getUsers();
    },
    messages(group, { first, last, before, after }) {
      // base query -- get messages from the right group
      const where = { groupId: group.id };

      // because we return messages from newest -> oldest
      // before actually means newer (id > cursor)
      // after actually means older (id < cursor)

      if (before) {
        // convert base-64 to utf8 id
        where.id = { $gt: Buffer.from(before, 'base64').toString() };
      }

      if (after) {
        where.id = { $lt: Buffer.from(after, 'base64').toString() };
      }

      return Message.findAll({
        where,
        order: [['id', 'DESC']],
        limit: first || last,
      }).then((messages) => {
        const edges = messages.map(message => ({
          cursor: Buffer.from(message.id.toString()).toString('base64'), // convert id to cursor
          node: message, // the node is the message itself
        }));

        return {
          edges,
          pageInfo: {
            hasNextPage() {
              if (messages.length < (last || first)) {
                return Promise.resolve(false);
              }

              return Message.findOne({
                where: {
                  groupId: group.id,
                  id: {
                    [before ? '$gt' : '$lt']: messages[messages.length - 1].id,
                  },
                },
                order: [['id', 'DESC']],
              }).then(message => !!message);
            },
            hasPreviousPage() {
              return Message.findOne({
                where: {
                  groupId: group.id,
                  id: where.id,
                },
                order: [['id']],
              }).then(message => !!message);
            },
          },
        };
      });
    },
  },
  Message: {
    to(message) {
      return message.getGroup();
    },
    from(message) {
      return message.getUser();
    },
  },
  User: {
    messages(user) {
      return Message.findAll({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
      });
    },
    groups(user) {
      return user.getGroups();
    },
    friends(user) {
      return user.getFriends();
    },
  },
};

export default Resolvers;
