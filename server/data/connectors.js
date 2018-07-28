import { _ } from 'lodash';
import faker from 'faker';
import Sequelize from 'sequelize';
import bcrypt from 'bcrypt';

// initialize our database
const db = new Sequelize('chatty', null, null, {
  dialect: 'sqlite',
  storage: './chatty.sqlite',
  logging: false, // mark this true if you want to see logs
});

// define groups
const GroupModel = db.define('group', {
  name: { type: Sequelize.STRING },
  icon: { type: Sequelize.STRING }, // url for group icon
});

// define messages
const MessageModel = db.define('message', {
  text: { type: Sequelize.STRING },
});

// define users
const UserModel = db.define('user', {
  badgeCount: { type: Sequelize.INTEGER },
  email: { type: Sequelize.STRING },
  username: { type: Sequelize.STRING },
  password: { type: Sequelize.STRING },
  registrationId: { type: Sequelize.STRING }, // device registration for push notifications
  version: { type: Sequelize.INTEGER }, // version the password
  avatar: { type: Sequelize.STRING }, // url for avatar image
});

// users belong to multiple groups
UserModel.belongsToMany(GroupModel, { through: 'GroupUser' });

// users belong to multiple users as friends
UserModel.belongsToMany(UserModel, { through: 'Friends', as: 'friends' });

// messages are sent from users
MessageModel.belongsTo(UserModel);

// track last read message in a group for a given user
MessageModel.belongsToMany(UserModel, { through: 'MessageUser', as: 'lastRead' });
UserModel.belongsToMany(MessageModel, { through: 'MessageUser', as: 'lastRead' });

// messages are sent to groups
MessageModel.belongsTo(GroupModel);

// groups have multiple users
GroupModel.belongsToMany(UserModel, { through: 'GroupUser' });

// create fake starter data
const GROUPS = 4;
const USERS_PER_GROUP = 5;
const MESSAGES_PER_USER = 5;
faker.seed(123); // get consistent data every time we reload app

// you don't need to stare at this code too hard
// just trust that it fakes a bunch of groups, users, and messages
db.sync({ force: true }).then(() => _.times(GROUPS, () => GroupModel.create({
  name: faker.lorem.words(3),
}).then(group => _.times(USERS_PER_GROUP, () => {
  const password = faker.internet.password();
  return bcrypt.hash(password, 10).then(hash => group.createUser({
    badgeCount: 0,
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: hash,
    version: 1,
  }).then((user) => {
    console.log(
      '{email, username, password}',
      `{${user.email}, ${user.username}, ${password}}`
    );
    _.times(MESSAGES_PER_USER, () => MessageModel.create({
      userId: user.id,
      groupId: group.id,
      text: faker.lorem.sentences(3),
    }));
    return user;
  }));
})).then((userPromises) => {
  // make users friends with all users in the group
  Promise.all(userPromises).then((users) => {
    _.each(users, (current, i) => {
      _.each(users, (user, j) => {
        if (i !== j) {
          current.addFriend(user);
        }
      });
    });
  });
})));

const Group = db.models.group;
const Message = db.models.message;
const User = db.models.user;

export { Group, Message, User };
