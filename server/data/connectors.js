import { _ } from 'lodash';
import faker from 'faker';
import Sequelize from 'sequelize';
import bcrypt from 'bcrypt';

// initialize our database
const db = new Sequelize('chatty', null, null, {
  dialect: 'sqlite',
  storage: './chatty.sqlite',
  logging: true, // mark this true if you want to see logs
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

// define tweets
const TweetModel = db.define('tweet', {
  text: { type: Sequelize.STRING },
  favoriteCount: { type: Sequelize.INTEGER },
});

// define users
const UserModel = db.define('user', {
  badgeCount: { type: Sequelize.INTEGER },
  followedsCount: { type: Sequelize.INTEGER },
  followersCount: { type: Sequelize.INTEGER },
  email: { type: Sequelize.STRING },
  firstName: { type: Sequelize.STRING },
  lastName: { type: Sequelize.STRING },
  username: { type: Sequelize.STRING },
  password: { type: Sequelize.STRING },
  registrationId: { type: Sequelize.STRING }, // device registration for push notifications
  version: { type: Sequelize.INTEGER }, // version the password
  avatar: { type: Sequelize.STRING }, // url for avatar image
});

// users belong to multiple groups
UserModel.belongsToMany(GroupModel, { through: 'GroupUser' });

// users belong to multiple users as followers
UserModel.belongsToMany(UserModel, { through: 'Followers', as: 'followers' });

// users belong to multiple users as followeds
UserModel.belongsToMany(UserModel, { through: 'Followeds', as: 'followeds' });

// users belong to multiple users as friends
UserModel.belongsToMany(UserModel, { through: 'Friends', as: 'friends' });

// users belong to multiple tweets as author
UserModel.belongsToMany(TweetModel, { through: 'TweetAuthor' });

// tweets are sent from users
TweetModel.belongsTo(UserModel);

// users belong to multiple favoriteTweets as the user marking a tweet as favorite
UserModel.belongsToMany(TweetModel, { through: 'FavoritedTweet', as: 'favoritedTweets' });
TweetModel.belongsToMany(UserModel, { through: 'FavoritedTweet', as: 'favoritedTweets' });


// messages are sent from users
MessageModel.belongsTo(UserModel);

// track last read message in a group for a given user
MessageModel.belongsToMany(UserModel, { through: 'MessageUser', as: 'lastRead' });
UserModel.belongsToMany(MessageModel, { through: 'MessageUser', as: 'lastRead' });

// messages are sent to groups
MessageModel.belongsTo(GroupModel);

// tweets are sent to a user's followers
// TweetModel.belongsTo(GroupModel);

// groups have multiple users
GroupModel.belongsToMany(UserModel, { through: 'GroupUser' });

// create fake starter data
const GROUPS = 4;
const USERS_PER_GROUP = 5;
const MESSAGES_PER_USER = 5;
const TWEETS_PER_USER = 5;
faker.seed(123); // get consistent data every time we reload app

// you don't need to stare at this code too hard
// just trust that it fakes a bunch of groups, users, and messages
db.sync({ force: true }).then(() => _.times(GROUPS, () => GroupModel.create({
  name: faker.lorem.words(3),
}).then(group => _.times(USERS_PER_GROUP, (i) => {
  // const password = faker.internet.password();
  const password = 'w'; // test commit
  return bcrypt.hash(password, 10).then(hash => group.createUser({
    badgeCount: 0,
    followedsCount: 0,
    followersCount: 0,
    email: faker.internet.email(),
    username: faker.internet.userName(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    avatar: `${i}.jpg`,
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
    // also make some public tweets for each user created
    // _.times(TWEETS_PER_USER, () => TweetModel.create({
    //   userId: user.id,
    //   text: faker.lorem.sentences(3),
    // }));
    return user;
  }));
})).then((userPromises) => {
  // make users friends with all users in the group
  Promise.all(userPromises).then((usersOfGroup) => {
    _.each(usersOfGroup, (current, i) => {
      // create N tweets for each user
      _.times(TWEETS_PER_USER, () => {
        current.createTweet({
          userId: current.id,
          text: faker.lorem.sentences(3),
          favoriteCount: 0,
        });
      });
      // current user addFriend for each other user
      _.each(usersOfGroup, (user, j) => {
        if (i !== j) {
          current.addFriend(user);
        }
      });
      _.each(usersOfGroup, (user, j) => {
        // current user gains a follower from group with 50% chance
        if (i !== j && Math.random() < 0.8) {
          current.addFollower(user);
          current.increment('followersCount');
        }
        // current user follows others in group with 50% chance
        if (i !== j && Math.random() < 0.8) {
          current.addFollowed(user);
          current.increment('followedsCount');
        }
      });
    });
  });
})));

const Group = db.models.group;
const Message = db.models.message;
const User = db.models.user;
const Tweet = db.models.tweet;

export { Group, Message, User, Tweet };
